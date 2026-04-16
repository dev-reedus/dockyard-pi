// GET /api/services/[id]/logs?tail=50
// Returns a snapshot of recent log lines as JSON.
// Used by the LiveLogs client component to refresh the snapshot on demand.

import { NextResponse } from 'next/server'
import { getRecentLogs } from '@/lib/logs'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params
  const tail = parseInt(new URL(req.url).searchParams.get('tail') ?? '50', 10) || 50
  const logs = await getRecentLogs(id, Math.min(tail, 1000))
  return NextResponse.json(logs)
}
