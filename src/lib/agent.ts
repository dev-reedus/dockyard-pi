// Base HTTP client for the Node agent running on the Raspberry Pi.
// All infrastructure reads and writes go through this file — nothing else
// should construct fetch requests to the agent directly.

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
 * Returns the URL and auth headers needed to proxy an SSE stream from the agent.
 * Use this in Route Handlers that need to forward a streaming response to the browser.
 */
export function agentStreamConfig(path: string): { url: string; headers: Record<string, string> } {
  return {
    url: `${AGENT_BASE_URL}${path}`,
    headers: {
      Authorization: `Bearer ${AGENT_TOKEN}`,
    },
  }
}
