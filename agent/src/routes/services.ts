// GET /services        — list all containers
// GET /services/:id   — single container detail

import { Router } from 'express'
import { getServiceById, listServices } from '../lib/docker.js'

export const servicesRouter = Router()

servicesRouter.get('/', async (_req, res) => {
  const services = await listServices()
  res.json(services)
})

servicesRouter.get('/:id', async (req, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing service id' })
    return
  }

  const service = await getServiceById(id)
  res.json(service)
})
