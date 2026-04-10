// GET /deployments?serviceId=optional — deployments history (with a cap)

import { Router } from 'express'
import { getDeployments } from '../lib/store.js'

export const deploymentsRouter = Router()

deploymentsRouter.get('/', (req, res) => {
  const serviceId = typeof req.query['serviceId'] === 'string' ? req.query['serviceId'] : undefined
  res.json(getDeployments(serviceId))
})
