// POST /services/:id/actions — container lifecycle mutations
// Body: { action: 'restart' | 'stop' | 'start' | 'recreate' | 'compose-update' }
//
// Every action is recorded in the audit store before and after execution.
// The actor field uses the token identity for now; swap for real user info when auth grows.

import type { Request } from 'express'
import { Router } from 'express'
import { execFile } from 'child_process'
import { promisify } from 'util'
import {
  recreateContainer,
  restartContainer,
  startContainer,
  stopContainer,
} from '../lib/docker.js'
import { addEvent, finishDeployment, getDeploymentById, startDeployment } from '../lib/store.js'
import type { ActionType } from '../types.js'

const execFileAsync = promisify(execFile)

export const actionsRouter = Router({ mergeParams: true })

// The set of valid actions — used for input validation
const VALID_ACTIONS = new Set<ActionType>([
  'restart',
  'stop',
  'start',
  'recreate',
  'compose-update',
])

actionsRouter.post('/', async (req: Request<{ id: string }>, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing service id' })
    return
  }

  const action = req.body?.action as string | undefined
  if (!action || !VALID_ACTIONS.has(action as ActionType)) {
    res
      .status(400)
      .json({ error: `Invalid action. Must be one of: ${[...VALID_ACTIONS].join(', ')}` })
    return
  }

  const typedAction = action as ActionType
  const deploymentId = startDeployment(id, typedAction, 'api')

  addEvent('deploy', 'info', `Action '${typedAction}' started on ${id}`, id)

  // Run the action, then record the result
  let logsSnippet: string | null = null

  try {
    if (typedAction === 'restart') {
      await restartContainer(id)
    } else if (typedAction === 'stop') {
      await stopContainer(id)
    } else if (typedAction === 'start') {
      await startContainer(id)
    } else if (typedAction === 'recreate') {
      await recreateContainer(id)
    } else if (typedAction === 'compose-update') {
      logsSnippet = await runComposeUpdate(id)
    }

    finishDeployment(deploymentId, 'success', logsSnippet)
    addEvent('deploy', 'info', `Action '${typedAction}' succeeded on ${id}`, id)

    const deployment = getDeploymentById(deploymentId)
    if (!deployment) {
      throw new Error('Deployment record was not found after completion')
    }

    res.json(deployment)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    finishDeployment(deploymentId, 'failure', message)
    addEvent('deploy', 'error', `Action '${typedAction}' failed on ${id}: ${message}`, id)

    res.status(500).json({ error: message })
  }
})

// ---------------------------------------------------------------------------
// Compose update helper
// ---------------------------------------------------------------------------

/**
 * Run `docker compose pull && docker compose up -d` for the compose project
 * that owns the given container. The project name is resolved from the container label.
 *
 * Returns the combined stdout+stderr(1+2) as a log snippet.
 *
 * NOTE: The compose project directory is read from the container label,
 * not from user input. The label is set by Docker Compose itself and is not
 * controllable by this API.
 * //TODO: implement a safer way
 */
async function runComposeUpdate(containerId: string): Promise<string> {
  const { execSync } = await import('child_process')

  // Read the compose working directory from the container's labels
  const labelJson = execSync(
    `docker inspect --format '{{json .Config.Labels}}' ${containerId}`,
  ).toString()

  const labels: Record<string, string> = JSON.parse(labelJson) as Record<string, string>
  const workdir = labels['com.docker.compose.project.working_dir']
  const project = labels['com.docker.compose.project']

  if (!workdir || !project) {
    throw new Error('Container is not managed by Docker Compose — use recreate instead')
  }

  // Run pull then up -d, capturing output for the audit log
  const pullResult = await execFileAsync(
    'docker',
    ['compose', '--project-directory', workdir, 'pull'],
    {
      cwd: workdir,
    },
  )
  const upResult = await execFileAsync(
    'docker',
    ['compose', '--project-directory', workdir, 'up', '-d'],
    {
      cwd: workdir,
    },
  )

  return [pullResult.stdout, pullResult.stderr, upResult.stdout, upResult.stderr]
    .filter(Boolean)
    .join('\n')
    .slice(0, 2000)
  // cap snippet length stored in memory
  //TODO: replace with live log streaming
}
