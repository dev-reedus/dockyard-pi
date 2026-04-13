// Docker adapter — how the agent talks to the Docker socket.
//
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

  return containers.map((c, i) => {
    const { image, tag } = splitImageTag(c.Image)
    // Container names come with a leading slash from Docker
    const containerName = (c.Names[0] ?? c.Id).replace(/^\//, '')

    // Use the resolved stats snapshot; fall back to zeros if the container is stopped/unavailable
    const statsResult = statsResults[i]
    const stats = statsResult?.status === 'fulfilled' ? statsResult.value : null

    return {
      id: c.Id,
      // Use the compose service label as display name if available, fall back to container name
      displayName: c.Labels['com.docker.compose.service'] ?? containerName,
      containerName,
      image,
      tag,
      status: parseStatus(c.State),
      health: c.Status,
      cpuPercent: stats?.cpuPercent ?? 0,
      memoryMb: stats?.memoryMb ?? 0,
      memoryLimitMb: stats?.memoryLimitMb ?? 0,
      uptime:
        c.State === 'running' ? uptimeDuration(new Date(c.Created * 1000).toISOString()) : 'PT0S',
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
  const stats = await getStats(id)

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
    uptime: info.State.Running ? uptimeDuration(info.State.StartedAt) : 'PT0S',
    internalPort: info.NetworkSettings.Ports
      ? parseInt(Object.keys(info.NetworkSettings.Ports)[0] ?? '0', 10) || null
      : null,
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

  // stream is a Buffer when follow: false (default)
  const raw = stream.toString('utf8')
  const lines: LogLine[] = []

  for (const line of raw.split('\n')) {
    if (line.length < 8) continue

    // Byte 0 is stream type: 1 = stdout, 2 = stderr
    const streamType = line.charCodeAt(0)
    // Strip the 8-byte header and parse "timestamp message"
    const content = line.slice(8)
    const spaceIdx = content.indexOf(' ')
    if (spaceIdx === -1) continue

    lines.push({
      timestamp: content.slice(0, spaceIdx),
      stream: streamType === 2 ? 'stderr' : 'stdout',
      message: content.slice(spaceIdx + 1),
    })
  }

  return lines
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

  // Try to pull the latest image — fall back to the local image ID if pull fails
  const { image } = splitImageTag(info.Config.Image)
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
    // Fall back to the exact image ID — avoids remote resolution if the tag is unavailable locally
    imageToUse = image
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
    ExposedPorts: info.Config.ExposedPorts,
    Labels: info.Config.Labels,
    HostConfig: info.HostConfig,
    NetworkingConfig: { EndpointsConfig: info.NetworkSettings.Networks },
  })
  await newContainer.start()
}
