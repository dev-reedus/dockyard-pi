// Central type definitions for Docker services as surfaced by the Pi agent.
// These mirror the agent's response shape, not raw Docker API types.
// The agent is responsible for transforming Docker data into this shape.
//TODO: automatize syncing with the agent's types, to keep only one source of truth

export type ServiceStatus = 'running' | 'stopped' | 'restarting' | 'unknown'
export type ServiceHealth = 'healthy' | 'unhealthy' | 'starting' | 'none'
export type ExposureType = 'public' | 'tunnel-only' | 'tailscale-only' | 'internal'

export type ActionType = 'restart' | 'stop' | 'start' | 'pull' | 'recreate' | 'compose-update'
export type DeploymentResult = 'success' | 'failure' | 'in-progress'
export type EventType = 'container' | 'alert' | 'deploy' | 'system'
export type EventSeverity = 'info' | 'warn' | 'error'

export interface Service {
  id: string
  displayName: string
  containerName: string
  image: string
  tag: string
  status: ServiceStatus
  health: ServiceHealth
  cpuPercent: number
  memoryMb: number
  memoryLimitMb: number
  uptime: string
  internalPort: number | null
  publicUrl: string | null
  lastDeployedAt: string | null
}

export interface ServiceStats {
  serviceId: string
  cpuPercent: number
  memoryMb: number
  memoryLimitMb: number
  networkRxMb: number
  networkTxMb: number
  sampledAt: string
}

export interface Route {
  serviceId: string
  cloudflareHostname: string | null
  localTarget: string
  tunnelName: string | null
  exposureType: ExposureType
}

export interface Deployment {
  id: string
  serviceId: string
  action: ActionType
  actor: string
  startedAt: string
  finishedAt: string | null
  result: DeploymentResult
  logsSnippet: string | null
}

export interface AppEvent {
  id: string
  type: EventType
  severity: EventSeverity
  message: string
  source: string
  createdAt: string
}
