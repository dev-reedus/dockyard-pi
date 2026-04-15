// Docker adapter — how the agent talks to the Docker socket.
// All routes go through the functions here rather than using dockerode directly.
// This keeps Docker API details contained and makes it easy to mock in tests later.

import Dockerode from 'dockerode'
import type { LogLine, Service, ServiceHealth, ServiceStats, ServiceStatus } from '../types.js'

// Socket path: set DOCKER_SOCKET in .env, otherwise falls back to the Linux default.
const socketPath = process.env['DOCKER_SOCKET'] ?? '/var/run/docker.sock'
const docker = new Dockerode({ socketPath })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Parse a Docker container status string into simplified ServiceStatus. */
function parseStatus(state: string): ServiceStatus {
  if (state === 'running') return 'running'
  if (state === 'restarting') return 'restarting'
  if (state === 'exited' || state === 'dead' || state === 'stopped') return 'stopped'
  return 'unknown'
}

/** Map Docker health status to app ServiceHealth type. */
function parseHealth(health: string | undefined): ServiceHealth {
  if (!health) return 'none'
  if (health === 'healthy') return 'healthy'
  if (health === 'unhealthy') return 'unhealthy'
  if (health === 'starting') return 'starting'
  return 'none'
}

function parseContainerSummaryHealth(statusText: string): ServiceHealth {
  if (statusText.includes('(healthy)')) return 'healthy'
  if (statusText.includes('(unhealthy)')) return 'unhealthy'
  if (statusText.includes('(health: starting)')) return 'starting'
  return 'none'
}

function getContainerStartedAt(status: string, startedAt: string, createdAt: string): string {
  if (status !== 'running') {
    return 'PT0S'
  }

  return uptimeDuration(startedAt || createdAt)
}

function getPrimaryPrivatePort(ports: Record<string, unknown> | undefined): number | null {
  if (!ports) return null

  const firstPort = Object.keys(ports)[0]
  if (!firstPort) return null

  return parseInt(firstPort, 10) || null
}

function parseDockerLogBuffer(raw: Buffer): LogLine[] {
  const lines: LogLine[] = []
  let offset = 0

  while (offset + 8 <= raw.length) {
    const streamType = raw[offset]
    const frameSize = raw.readUInt32BE(offset + 4)
    const start = offset + 8
    const end = start + frameSize

    if (end > raw.length) {
      break
    }

    const content = raw.toString('utf8', start, end)
    for (const line of content.split('\n')) {
      if (!line) continue

      const spaceIdx = line.indexOf(' ')
      if (spaceIdx === -1) continue

      lines.push({
        timestamp: line.slice(0, spaceIdx),
        stream: streamType === 2 ? 'stderr' : 'stdout',
        message: line.slice(spaceIdx + 1),
      })
    }

    offset = end
  }

  return lines
}

async function getStatsOrDefault(id: string): Promise<ServiceStats> {
  try {
    return await getStats(id)
  } catch {
    return {
      serviceId: id,
      cpuPercent: 0,
      memoryMb: 0,
      memoryLimitMb: 0,
      networkRxMb: 0,
      networkTxMb: 0,
      sampledAt: new Date().toISOString(),
    }
  }
}

/**
 * Split a full image reference like "ghcr.io/immich-app/immich:v1.100.0"
 * into { image, tag }. Defaults tag to "latest" if absent.
 */
function splitImageTag(fullImage: string): { image: string; tag: string } {
  const slashIdx = fullImage.lastIndexOf('/')
  const searchFrom = slashIdx === -1 ? 0 : slashIdx
  const colonIdx = fullImage.indexOf(':', searchFrom)

  if (colonIdx === -1) return { image: fullImage, tag: 'latest' }
  return {
    image: fullImage.slice(0, colonIdx),
    tag: fullImage.slice(colonIdx + 1),
  }
}

/**
 * Convert a Docker start time (ISO string) to an ISO 8601 duration string.
 * Example output: "PT2H30M15S"
 */
function uptimeDuration(startedAt: string): string {
  const startMs = new Date(startedAt).getTime()
  const totalSeconds = Math.floor((Date.now() - startMs) / 1000)

  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60

  return `PT${h > 0 ? `${h}H` : ''}${m > 0 ? `${m}M` : ''}${s}S`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/** Return all containers (running + stopped) shaped as Service objects, with stats snapshots. */
export async function listServices(): Promise<Service[]> {
  const containers = await docker.listContainers({ all: true })

  // Fetch stats for all containers in parallel. Stopped containers will reject — that's fine.
  const statsResults = await Promise.allSettled(containers.map((c) => getStats(c.Id)))
  const inspectResults = await Promise.allSettled(
    containers.map((c) => docker.getContainer(c.Id).inspect()),
  )

  return containers.map((c, i) => {
    const { image, tag } = splitImageTag(c.Image)
    // Container names come with a leading slash from Docker
    const containerName = (c.Names[0] ?? c.Id).replace(/^\//, '')

    // Use the resolved stats snapshot; fall back to zeros if the container is stopped/unavailable
    const statsResult = statsResults[i]
    const stats = statsResult?.status === 'fulfilled' ? statsResult.value : null
    const inspectResult = inspectResults[i]
    const inspectInfo = inspectResult?.status === 'fulfilled' ? inspectResult.value : null

    return {
      id: c.Id,
      // Use the compose service label as display name if available, fall back to container name
      displayName: c.Labels['com.docker.compose.service'] ?? containerName,
      containerName,
      image,
      tag,
      status: parseStatus(c.State),
      health: parseContainerSummaryHealth(c.Status),
      cpuPercent: stats?.cpuPercent ?? 0,
      memoryMb: stats?.memoryMb ?? 0,
      memoryLimitMb: stats?.memoryLimitMb ?? 0,
      uptime: getContainerStartedAt(
        c.State,
        inspectInfo?.State.StartedAt ?? '',
        new Date(c.Created * 1000).toISOString(),
      ),
      internalPort: c.Ports[0]?.PrivatePort ?? null,
      publicUrl: null,
      lastDeployedAt: null,
    }
  })
}

/** Return a single container by ID or name. Throws if not found. */
export async function getServiceById(id: string): Promise<Service> {
  const container = docker.getContainer(id)
  const info = await container.inspect()
  const stats = await getStatsOrDefault(id)

  const { image, tag } = splitImageTag(info.Config.Image)
  const containerName = info.Name.replace(/^\//, '')
  const health = info.State.Health?.Status

  return {
    id: info.Id,
    displayName: info.Config.Labels['com.docker.compose.service'] ?? containerName,
    containerName,
    image,
    tag,
    status: parseStatus(info.State.Status),
    health: parseHealth(health),
    cpuPercent: stats.cpuPercent,
    memoryMb: stats.memoryMb,
    memoryLimitMb: stats.memoryLimitMb,
    uptime: getContainerStartedAt(info.State.Status, info.State.StartedAt, info.Created),
    internalPort: getPrimaryPrivatePort(info.NetworkSettings.Ports),
    publicUrl: null,
    lastDeployedAt: null,
  }
}

/**
 * Fetch live CPU and memory stats for one container.
 *
 * Docker stats use a streaming endpoint — we request a single sample
 * by passing { stream: false }, which returns one JSON object and closes.
 * TODO: implement the streaming endpoint
 */
export async function getStats(id: string): Promise<ServiceStats> {
  const container = docker.getContainer(id)

  // TODO: find a better approach
  // The dockerode types for stats are complex; we cast to any and pick what we need
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await container.stats({ stream: false })

  // CPU % calculation — Docker returns delta values, compute the percentage
  const cpuDelta: number =
    raw.cpu_stats.cpu_usage.total_usage - raw.precpu_stats.cpu_usage.total_usage
  const systemDelta: number = raw.cpu_stats.system_cpu_usage - raw.precpu_stats.system_cpu_usage
  const numCpus: number =
    raw.cpu_stats.online_cpus ?? raw.cpu_stats.cpu_usage.percpu_usage?.length ?? 1
  const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0

  // memory_stats may be empty if cgroup memory accounting is disabled on the host.
  // Enable it on Pi by adding `cgroup_enable=memory cgroup_memory=1` to /boot/cmdline.txt
  const memoryMb: number = (raw.memory_stats.usage ?? 0) / 1024 / 1024
  const memoryLimitMb: number = (raw.memory_stats.limit ?? 0) / 1024 / 1024

  const networks = raw.networks as
    | Record<string, { rx_bytes: number; tx_bytes: number }>
    | undefined
  let rxBytes = 0
  let txBytes = 0
  if (networks) {
    for (const iface of Object.values(networks)) {
      rxBytes += iface.rx_bytes
      txBytes += iface.tx_bytes
    }
  }

  return {
    serviceId: id,
    cpuPercent: parseFloat(cpuPercent.toFixed(2)),
    memoryMb: parseFloat(memoryMb.toFixed(1)),
    memoryLimitMb: parseFloat(memoryLimitMb.toFixed(1)),
    networkRxMb: parseFloat((rxBytes / 1024 / 1024).toFixed(2)),
    networkTxMb: parseFloat((txBytes / 1024 / 1024).toFixed(2)),
    sampledAt: new Date().toISOString(),
  }
}

/**
 * Fetch recent log lines for a container.
 *
 * Returns stdout and stderr interleaved, each parsed into a LogLine.
 * Docker log entries are prefixed with an 8-byte header we strip off.
 */
export async function getLogs(id: string, tail = 100): Promise<LogLine[]> {
  const container = docker.getContainer(id)

  const stream = await container.logs({
    stdout: true,
    stderr: true,
    timestamps: true,
    tail,
  })

  return parseDockerLogBuffer(stream)
}

// ---------------------------------------------------------------------------
// Container actions
// ---------------------------------------------------------------------------
export async function restartContainer(id: string): Promise<void> {
  await docker.getContainer(id).restart()
}

export async function stopContainer(id: string): Promise<void> {
  await docker.getContainer(id).stop()
}

export async function startContainer(id: string): Promise<void> {
  await docker.getContainer(id).start()
}

/**
 * Pull the latest image and recreate the container.
 * If the pull fails (e.g. no network, registry unreachable), recreate using the local image.
 * For Compose services, use the compose-update action instead.
 */
export async function recreateContainer(id: string): Promise<void> {
  const container = docker.getContainer(id)
  const info = await container.inspect()

  if (info.Config.Labels['com.docker.compose.project']) {
    throw new Error('Compose-managed containers must use compose-update instead of recreate')
  }

  // Try to pull the latest image — fall back to the exact configured image reference if pull fails.
  let imageToUse = info.Config.Image

  try {
    await new Promise<void>((resolve, reject) => {
      void docker.pull(info.Config.Image, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(err)
          return
        }
        docker.modem.followProgress(stream, (err2: Error | null) => {
          if (err2) reject(err2)
          else resolve()
        })
      })
    })
    console.log(`[recreate] Pulled latest image for ${info.Config.Image}`)
  } catch (err) {
    imageToUse = info.Config.Image
    console.warn(`[recreate] Pull failed, recreating with local image ${imageToUse}:`, err)
  }

  // Stop and remove the old container, then start a new one with the same config
  await container.stop().catch(() => {
    /* already stopped */
  })
  await container.remove()
  const newContainer = await docker.createContainer({
    name: info.Name.replace(/^\//, ''),
    Image: imageToUse,
    Cmd: info.Config.Cmd,
    Env: info.Config.Env,
    Entrypoint: info.Config.Entrypoint,
    ExposedPorts: info.Config.ExposedPorts,
    Labels: info.Config.Labels,
    User: info.Config.User,
    WorkingDir: info.Config.WorkingDir,
    Tty: info.Config.Tty,
    OpenStdin: info.Config.OpenStdin,
    HostConfig: info.HostConfig,
    NetworkingConfig: { EndpointsConfig: info.NetworkSettings.Networks },
  })
  await newContainer.start()
}
