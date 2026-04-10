// GET /events — recent system events

import { Router } from 'express'
import { getEvents } from '../lib/store.js'

export const eventsRouter = Router()

eventsRouter.get('/', (_req, res) => {
  res.json(getEvents())
})
