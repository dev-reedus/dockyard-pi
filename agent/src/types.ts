// Agent-internal types.
//
// These mirror the shapes defined in the Next.js app's src/types/service.ts.
// Both sides must stay in sync — if you add a field here, add it there too.
//TODO: automatize syncing with the app's types, to keep only one source of truth'

export type ServiceStatus = 'running' | 'stopped' | 'restarting' | 'unknown'
export type ServiceHealth = 'healthy' | 'unhealthy' | 'starting' | 'none'
export type ExposureType = 'public' | 'tunnel-only' | 'tailscale-only' | 'internal'
export type ActionType = 'restart' | 'stop' | 'start' | 'recreate' | 'compose-update'
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

export interface LogLine {
  timestamp: string
  stream: 'stdout' | 'stderr'
  message: string
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
