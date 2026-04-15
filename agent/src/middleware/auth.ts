// Bearer token authentication middleware
// Every request must include: Authorization: Bearer <AGENT_TOKEN>
// The token is compared using a timing-safe comparison to prevent timing attacks

import { timingSafeEqual } from 'crypto'
import type { NextFunction, Request, Response } from 'express'

const AGENT_TOKEN = process.env['AGENT_TOKEN'] ?? ''

if (!AGENT_TOKEN) {
  console.warn('[auth] WARNING: AGENT_TOKEN is not set — all requests will be rejected')
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' })
    return
  }

  const provided = authHeader.slice(7)

  // timingSafeEqual requires both buffers to be the same length,
  // so we compare lengths first
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(AGENT_TOKEN)

  const valid =
    providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf)

  if (!valid) {
    res.status(401).json({ error: 'Invalid token' })
    return
  }

  next()
}
