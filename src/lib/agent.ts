// Base HTTP client for the Node agent running on the Raspberry Pi.
// All infrastructure reads and writes go through this file — nothing else
// should construct fetch requests to the agent directly.
//
// agentFetch  — for JSON request/response (server-side only)
// agentProxyStream — for SSE streams proxied from the agent to the browser

const AGENT_BASE_URL = process.env['AGENT_BASE_URL'] ?? 'http://localhost:3001'
const AGENT_TOKEN = process.env['AGENT_TOKEN'] ?? ''

type AgentRequestInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>
}

/**
 * Thin fetch wrapper that:
 * - Prepends the agent base URL
 * - Attaches the Bearer token from env
 * - Throws a descriptive error on non-2xx responses
 * - Returns the JSON-parsed body typed as T
 */
export async function agentFetch<T>(path: string, init: AgentRequestInit = {}): Promise<T> {
  const url = `${AGENT_BASE_URL}${path}`

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AGENT_TOKEN}`,
      ...init.headers,
    },
    // Disable caching, always fetch fresh data
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Agent request failed: ${res.status} ${res.statusText} — ${path}`)
  }

  return res.json() as Promise<T>
}

/**
 * Proxy an SSE stream from the agent to the browser.
 *
 * Handles the fetch, auth header, error response, and SSE response headers
 * in one place so individual Route Handlers don't repeat the pattern.
 *
 * @param path   - agent path, e.g. `/services/abc/logs/stream`
 * @param signal - forward the incoming request's AbortSignal so the agent
 *                 stream is torn down when the browser disconnects
 */
export async function agentProxyStream(path: string, signal: AbortSignal): Promise<Response> {
  const url = `${AGENT_BASE_URL}${path}`

  const agentRes = await fetch(url, {
    headers: { Authorization: `Bearer ${AGENT_TOKEN}` },
    signal,
  })

  if (!agentRes.ok) {
    return new Response(`Agent error: ${agentRes.statusText}`, { status: agentRes.status })
  }

  return new Response(agentRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
