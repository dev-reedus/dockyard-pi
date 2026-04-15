// DockYard Pi Agent — entry point.
// A minimal Express server that exposes Docker container data and lifecycle
// actions to the Next.js dashboard. For security reasons it exposes ONLY the
// operations the dashboard needs — no raw Docker API passthrough.

import 'node:process'
import express from 'express'
import { requireAuth } from './middleware/auth.js'
import { servicesRouter } from './routes/services.js'
import { statsRouter } from './routes/stats.js'
import { logsRouter } from './routes/logs.js'
import { actionsRouter } from './routes/actions.js'
import { deploymentsRouter } from './routes/deployments.js'
import { eventsRouter } from './routes/events.js'
import { addEvent } from './lib/store.js'

const PORT = parseInt(process.env['PORT'] ?? '3001', 10)

const app = express()

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(express.json())

// Health check — unauthenticated
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.use(requireAuth)

// Simple request logger
//TODO: to replace with a more robust logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/services', servicesRouter)

// Stats and logs are nested under /services/:id
app.use('/services/:id/stats', statsRouter)
app.use('/services/:id/logs', logsRouter)
app.use('/services/:id/actions', actionsRouter)

app.use('/deployments', deploymentsRouter)
app.use('/events', eventsRouter)

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// Express 5 passes async route errors here automatically
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[error]', message)
    addEvent('system', 'error', message, 'agent')
    res.status(500).json({ error: message })
  },
)

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[agent] Listening on http://localhost:${PORT}`)
  console.log(`[agent] Docker socket: ${process.env['DOCKER_SOCKET'] ?? '/var/run/docker.sock'}`)

  if (!process.env['AGENT_TOKEN']) {
    console.warn('[agent] WARNING: AGENT_TOKEN is not set')
  }
})
