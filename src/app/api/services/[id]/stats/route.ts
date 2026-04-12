// GET /api/services/[id]/stats
// Route Handler consumed by the useServiceStats SWR hook.
// Returns the latest CPU/memory/network snapshot for one service.

import { NextResponse } from 'next/server'
import { getServiceStats } from '@/lib/docker'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params
  const stats = await getServiceStats(id)
  return NextResponse.json(stats)
}
