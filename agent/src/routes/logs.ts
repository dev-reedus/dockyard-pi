// Logs routes for a single service.
// GET /services/:id/logs?tail=100       — snapshot: recent lines as JSON array
// GET /services/:id/logs/stream?tail=50 — live SSE stream of new log lines

import type { Request, Response } from 'express'
import { Router } from 'express'
import { getLogs, startLogStream } from '../lib/docker.js'
import type { LogLine } from '../types.js'

export const logsRouter = Router({ mergeParams: true })

// ---------------------------------------------------------------------------
// Snapshot endpoint
// ---------------------------------------------------------------------------
logsRouter.get('/', async (req: Request<{ id: string }>, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing service id' })
    return
  }

  // Parse the ?tail= query param, default to 100, cap at 1000 to avoid huge responses
  const tailRaw = req.query['tail']
  const requestedTail = typeof tailRaw === 'string' ? parseInt(tailRaw, 10) || 100 : 100
  const tail = Math.max(1, Math.min(requestedTail, 1000))

  const logs = await getLogs(id, tail)
  res.json(logs)
})

// ---------------------------------------------------------------------------
// Streaming endpoint — SSE
// ---------------------------------------------------------------------------
logsRouter.get('/stream', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing service id' })
    return
  }

  const tailRaw = req.query['tail']
  const tail =
    typeof tailRaw === 'string' ? Math.max(1, Math.min(parseInt(tailRaw, 10) || 50, 500)) : 50

  // SSE headers — must be set before flushing
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const { stdout, stderr, destroy } = await startLogStream(id, tail)

  // Send SSE heartbeat comment every 15s so proxies / load-balancers don't
  // close the idle connection between bursts of container output.
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000)

  // Cleanup: called on client disconnect or stream end
  let cleaned = false
  function cleanup() {
    if (cleaned) return
    cleaned = true
    clearInterval(heartbeat)
    destroy()
    res.end()
  }

  req.on('close', cleanup)

  // Parse a PassThrough stream line-by-line and send each line as SSE.
  // We buffer incomplete lines across chunk boundaries.
  function pipeToSSE(stream: typeof stdout, streamName: LogLine['stream']) {
    let buffer = ''

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split('\n')
      // The last element may be an incomplete line — keep it in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line) continue

        // Docker timestamp format: "2024-01-01T12:00:00.000000000Z message"
        const spaceIdx = line.indexOf(' ')
        if (spaceIdx === -1) continue

        const logLine: LogLine = {
          timestamp: line.slice(0, spaceIdx),
          stream: streamName,
          message: line.slice(spaceIdx + 1),
        }

        res.write(`data: ${JSON.stringify(logLine)}\n\n`)
      }
    })

    stream.on('end', () => {
      // Both streams must finish before we end the response
      if (stdout.readableEnded && stderr.readableEnded) cleanup()
    })

    stream.on('error', (err) => {
      console.error(`[logs/stream] ${streamName} error:`, err.message)
      cleanup()
    })
  }

  pipeToSSE(stdout, 'stdout')
  pipeToSSE(stderr, 'stderr')
})
