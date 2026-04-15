// GET /services/:id/logs?tail=100 — recent log lines (max tail of 1000)

import type { Request } from 'express'
import { Router } from 'express'
import { getLogs } from '../lib/docker.js'

export const logsRouter = Router({ mergeParams: true })

logsRouter.get('/', async (req: Request<{ id: string }>, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing service id' })
    return
  }

  // Parse the ?tail= query param, default to 100, cap at 1000 to avoid huge responses
  const tailRaw = req.query['tail']
  const requestedTail = typeof tailRaw === 'string' ? parseInt(tailRaw, 10) || 100 : 100
  const tail = Math.max(1, Math.min(requestedTail, 1000))

  const logs = await getLogs(id, tail)
  res.json(logs)
})
