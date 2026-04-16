// GET /api/host/metrics/stream
// Proxies the agent's SSE host-metrics stream to the browser.

import { agentProxyStream } from '@/lib/agent'

export async function GET(req: Request): Promise<Response> {
  return agentProxyStream('/host/metrics/stream', req.signal)
}
