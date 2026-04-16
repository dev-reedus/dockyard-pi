// GET /api/services/[id]/logs/stream?tail=50
// Proxies the agent's SSE log stream to the browser.

import { agentProxyStream } from '@/lib/agent'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams): Promise<Response> {
  const { id } = await params
  const tail = new URL(req.url).searchParams.get('tail') ?? '50'
  return agentProxyStream(`/services/${id}/logs/stream?tail=${tail}`, req.signal)
}
