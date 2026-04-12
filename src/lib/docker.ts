// Infrastructure adapter: reads Docker service state from the Pi agent.
// this file just shapes the requests and returns typed data.

import { agentFetch } from '@/lib/agent'
import type { AppEvent, Deployment, Service, ServiceStats } from '@/types/service'

/** Fetch all known services and their current state. */
export async function getServices(): Promise<Service[]> {
  return agentFetch<Service[]>('/services')
}

/** Fetch a single service by its container ID or name. */
export async function getService(id: string): Promise<Service> {
  return agentFetch<Service>(`/services/${id}`)
}

/** Fetch the latest resource stats snapshot for a service. */
export async function getServiceStats(id: string): Promise<ServiceStats> {
  return agentFetch<ServiceStats>(`/services/${id}/stats`)
}

/** Fetch recent deployments / action history, newest first. */
export async function getDeployments(serviceId?: string): Promise<Deployment[]> {
  const path = serviceId ? `/deployments?serviceId=${serviceId}` : '/deployments'
  return agentFetch<Deployment[]>(path)
}

/** Fetch recent system events (alerts, restarts, etc.). */
export async function getEvents(): Promise<AppEvent[]> {
  return agentFetch<AppEvent[]>('/events')
}
