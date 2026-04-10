// GET /services/:id/stats — live CPU, memory, network snapshot

import type { Request } from 'express'
import { Router } from 'express'
import { getStats } from '../lib/docker.js'

export const statsRouter = Router({ mergeParams: true })

statsRouter.get('/', async (req: Request<{ id: string }>, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing service id' })
    return
  }

  const stats = await getStats(id)
  res.json(stats)
})
