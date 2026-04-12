// Log retrieval adapter.
// fetches a recent snapshot (tail N lines) from the agent.
// TODO: replace with SSE or WebSocket streaming for live tailing.

import { agentFetch } from '@/lib/agent'

export interface LogLine {
  timestamp: string
  stream: 'stdout' | 'stderr'
  message: string
}

/**
 * Fetch the most recent log lines for a service.
 * @param serviceId - container ID or name
 * @param lines     - number of lines to tail (default 100)
 */
export async function getRecentLogs(serviceId: string, lines = 100): Promise<LogLine[]> {
  return agentFetch<LogLine[]>(`/services/${serviceId}/logs?tail=${lines}`)
}
