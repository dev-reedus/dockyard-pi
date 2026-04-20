/**
 * Shared type definitions for the DockYard Pi app and agent.
 * This is the single source of truth — do not duplicate these in either package.
 *
 * The app imports via `@/types/service` (which re-exports from here).
 * The agent imports via `../types.js` (which re-exports from here).
 */

// --- Primitive union types ---

export type ServiceStatus = 'running' | 'stopped' | 'restarting' | 'unknown'
export type ServiceHealth = 'healthy' | 'unhealthy' | 'starting' | 'none'
export type ExposureType = 'public' | 'tunnel-only' | 'tailscale-only' | 'internal'

export type ActionType = 'restart' | 'stop' | 'start' | 'pull' | 'recreate' | 'compose-update'
export type DeploymentResult = 'success' | 'failure' | 'in-progress'
export type EventType = 'container' | 'alert' | 'deploy' | 'system'
export type EventSeverity = 'info' | 'warn' | 'error'

// --- Core domain models ---

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

// --- Agent-specific shapes (also used by the app when consuming agent responses) ---

export interface LogLine {
  timestamp: string
  stream: 'stdout' | 'stderr'
  message: string
}

export interface HostMetrics {
  cpuPercent: number
  memUsedMb: number
  memTotalMb: number
  diskUsedGb: number
  diskTotalGb: number
  /** null on non-Linux hosts or when the thermal zone is unavailable */
  tempC: number | null
  uptimeSeconds: number
  sampledAt: string
}
