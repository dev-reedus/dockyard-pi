// /deployments — action history and redeploy results.

import { getDeployments } from '@/lib/docker'
import type { Deployment } from '@/types/service'

export default async function DeploymentsPage() {
  const deployments = await getDeployments()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Deployments</h1>

      {deployments.length === 0 ? (
        <p className="text-sm text-zinc-500">No deployment history yet.</p>
      ) : (
        <ul className="space-y-3">
          {deployments.map((d) => (
            <DeploymentItem key={d.id} deployment={d} />
          ))}
        </ul>
      )}
    </div>
  )
}

function DeploymentItem({ deployment: d }: { deployment: Deployment }) {
  const resultColor =
    d.result === 'success'
      ? 'text-green-600'
      : d.result === 'failure'
        ? 'text-red-600'
        : 'text-yellow-600'

  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{d.serviceId}</span>
          <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            {d.action}
          </span>
        </div>
        <span className={`text-sm font-medium ${resultColor}`}>{d.result}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        {d.startedAt} · by {d.actor}
      </p>
      {d.logsSnippet && (
        <pre className="mt-2 overflow-auto rounded bg-zinc-950 p-2 font-mono text-xs text-zinc-300">
          {d.logsSnippet}
        </pre>
      )}
    </li>
  )
}
