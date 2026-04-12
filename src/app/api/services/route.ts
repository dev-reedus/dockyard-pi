// GET /api/services
// Route Handler consumed by the useServices SWR hook on the client.
// Proxies the request to the Pi agent server-side so the agent token
// never reaches the browser.

import { NextResponse } from 'next/server'
import { getServices } from '@/lib/docker'

export async function GET(): Promise<NextResponse> {
  const services = await getServices()
  return NextResponse.json(services)
}
