// GET /api/services/[id]

import { NextResponse } from 'next/server'
import { getService } from '@/lib/docker'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params
  const service = await getService(id)
  return NextResponse.json(service)
}
