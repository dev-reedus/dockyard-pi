// GET /host/metrics/stream — live SSE stream of host-level metrics.
// Emits one HostMetrics JSON object every 2 seconds.
// Also emits immediately on connection so the client doesn't wait.

import type { Request, Response } from 'express'
import { Router } from 'express'
import { getHostMetrics } from '../lib/host.js'

export const hostRouter = Router()

hostRouter.get('/metrics/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Send first sample immediately so the UI populates without waiting 2s
  try {
    const initial = await getHostMetrics()
    res.write(`data: ${JSON.stringify(initial)}\n\n`)
  } catch (err) {
    console.error('[host/metrics] initial sample error:', err)
  }

  const interval = setInterval(async () => {
    try {
      const metrics = await getHostMetrics()
      res.write(`data: ${JSON.stringify(metrics)}\n\n`)
    } catch (err) {
      console.error('[host/metrics] sample error:', err)
    }
  }, 2000)

  // Heartbeat to keep the connection alive through proxies
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000)

  req.on('close', () => {
    clearInterval(interval)
    clearInterval(heartbeat)
    res.end()
  })
})
