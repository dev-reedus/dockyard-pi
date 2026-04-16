// Host-level metrics for the Raspberry Pi (or any Linux host).
// Uses Node's built-in `os` module for memory/uptime, reads CPU deltas by
// comparing two consecutive os.cpus() samples, and falls back gracefully
// on non-Pi systems (no thermal zone, no statfs).

import fs from 'node:fs/promises'
import os from 'node:os'
import type { HostMetrics } from '../types.js'

// ---------------------------------------------------------------------------
// CPU — computed as a delta between the previous and current os.cpus() sample.
// Module-level state is fine here: this is a single-process agent with one
// caller (the SSE interval), so there's no concurrency issue.
// ---------------------------------------------------------------------------
let prevCpuTimes = os.cpus().map((c) => ({ ...c.times }))

function computeCpuPercent(): number {
  const curr = os.cpus()
  let idleDelta = 0
  let totalDelta = 0

  curr.forEach((cpu, i) => {
    const prev = prevCpuTimes[i]
    if (!prev) return

    const idle = cpu.times.idle - prev.idle
    const total =
      cpu.times.user +
      cpu.times.nice +
      cpu.times.sys +
      cpu.times.idle +
      cpu.times.irq -
      (prev.user + prev.nice + prev.sys + prev.idle + prev.irq)

    idleDelta += idle
    totalDelta += total
  })

  prevCpuTimes = curr.map((c) => ({ ...c.times }))

  return totalDelta > 0 ? parseFloat(((1 - idleDelta / totalDelta) * 100).toFixed(1)) : 0
}

// ---------------------------------------------------------------------------
// Temperature — Raspberry Pi exposes this in the thermal_zone sysfs path.
// Returns null on any other host.
// ---------------------------------------------------------------------------
async function readTempC(): Promise<number | null> {
  try {
    const raw = await fs.readFile('/sys/class/thermal/thermal_zone0/temp', 'utf8')
    return parseFloat((parseInt(raw.trim(), 10) / 1000).toFixed(1))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Disk — fs.statfs('/') available in Node ≥ 19.6. Falls back to 0/0.
// ---------------------------------------------------------------------------
async function getDiskUsage(): Promise<{ usedGb: number; totalGb: number }> {
  try {
    const stats = await fs.statfs('/')
    const totalGb = (stats.blocks * stats.bsize) / 1024 ** 3
    const freeGb = (stats.bavail * stats.bsize) / 1024 ** 3
    return {
      usedGb: parseFloat((totalGb - freeGb).toFixed(2)),
      totalGb: parseFloat(totalGb.toFixed(2)),
    }
  } catch {
    return { usedGb: 0, totalGb: 0 }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function getHostMetrics(): Promise<HostMetrics> {
  const [tempC, disk] = await Promise.all([readTempC(), getDiskUsage()])

  const totalMem = os.totalmem()
  const freeMem = os.freemem()

  return {
    cpuPercent: computeCpuPercent(),
    memUsedMb: Math.round((totalMem - freeMem) / 1024 / 1024),
    memTotalMb: Math.round(totalMem / 1024 / 1024),
    diskUsedGb: disk.usedGb,
    diskTotalGb: disk.totalGb,
    tempC,
    uptimeSeconds: Math.floor(os.uptime()),
    sampledAt: new Date().toISOString(),
  }
}
