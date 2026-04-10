// In-memory audit store for deployments and events.
//
// v1: data lives in memory — it's lost on agent restart but that's acceptable
// for a learning setup. v2 upgrade path: swap the arrays for SQLite writes
// (better-sqlite3 is a good lightweight choice on the Pi).

import { randomUUID } from 'crypto'
import type {
  ActionType,
  AppEvent,
  Deployment,
  DeploymentResult,
  EventSeverity,
  EventType,
} from '../types.js'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const deployments: Deployment[] = []
const events: AppEvent[] = []

// Keep the last N entries to avoid unbounded memory growth
const MAX_DEPLOYMENTS = 200
const MAX_EVENTS = 500

// ---------------------------------------------------------------------------
// Deployments
// ---------------------------------------------------------------------------

/** Record the start of an action. Returns the deployment ID. */
export function startDeployment(serviceId: string, action: ActionType, actor: string): string {
  const id = randomUUID()
  deployments.unshift({
    id,
    serviceId,
    action,
    actor,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    result: 'in-progress',
    logsSnippet: null,
  })

  if (deployments.length > MAX_DEPLOYMENTS) deployments.splice(MAX_DEPLOYMENTS)
  return id
}

/** Update an in-progress deployment with its final result. */
export function finishDeployment(
  deploymentId: string,
  result: Exclude<DeploymentResult, 'in-progress'>,
  logsSnippet: string | null = null,
): void {
  const d = deployments.find((d) => d.id === deploymentId)
  if (!d) return
  d.finishedAt = new Date().toISOString()
  d.result = result
  d.logsSnippet = logsSnippet
}

/** Return all deployments, optionally filtered by serviceId. */
export function getDeployments(serviceId?: string): Deployment[] {
  if (!serviceId) return deployments
  return deployments.filter((d) => d.serviceId === serviceId)
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function addEvent(
  type: EventType,
  severity: EventSeverity,
  message: string,
  source: string,
): void {
  events.unshift({
    id: randomUUID(),
    type,
    severity,
    message,
    source,
    createdAt: new Date().toISOString(),
  })

  if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS)
}

export function getEvents(): AppEvent[] {
  return events
}
