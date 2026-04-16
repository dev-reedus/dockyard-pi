'use client'

// HostMetrics — live-streaming panel showing Raspberry Pi host stats.
// Opens an SSE connection on mount; each event replaces the previous reading.
// Renders as a row of metric cards with percentage bars.

import { useEffect, useState } from 'react'
import { Cpu, HardDrive, MemoryStick, Thermometer, Timer } from 'lucide-react'

interface HostMetrics {
  cpuPercent: number
  memUsedMb: number
  memTotalMb: number
  diskUsedGb: number
  diskTotalGb: number
  tempC: number | null
  uptimeSeconds: number
  sampledAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function pct(used: number, total: number): number {
  return total > 0 ? Math.min(100, (used / total) * 100) : 0
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
type CardVariant = 'zinc' | 'sky' | 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose'

// RGB triplets for each variant — used to construct inline gradient styles
const BASE_RGB: Record<CardVariant, string> = {
  zinc: '113, 113, 122',
  sky: '14, 165, 233',
  indigo: '99, 102, 241',
  violet: '139, 92, 246',
  emerald: '16, 185, 129',
  amber: '245, 158, 11',
  rose: '239, 68, 68',
}

// Text color classes — these stay fixed regardless of heat level
const ICON_COLOR: Record<CardVariant, string> = {
  zinc: 'text-zinc-500',
  sky: 'text-sky-400',
  indigo: 'text-indigo-400',
  violet: 'text-violet-400',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
}

const VALUE_COLOR: Record<CardVariant, string> = {
  zinc: 'text-zinc-200',
  sky: 'text-sky-200',
  indigo: 'text-indigo-200',
  violet: 'text-violet-200',
  emerald: 'text-emerald-200',
  amber: 'text-amber-200',
  rose: 'text-rose-200',
}

/**
 * Compute a diagonal gradient + border color that "heats up" as percent rises.
 *
 * 0–60 %  → base color, opacity scales gently with usage
 * 60–80 % → gradient fades from base toward amber
 * 80–100% → gradient shifts from amber toward rose
 *
 * Returns inline styles so Tailwind's purge doesn't strip dynamic values.
 */
function heatStyle(percent: number, variant: CardVariant): React.CSSProperties {
  const base = BASE_RGB[variant]

  if (percent <= 60) {
    const t = percent / 60 // 0→1
    return {
      background: `linear-gradient(135deg, rgba(${base}, 0.04), rgba(${base}, ${0.04 + t * 0.07}))`,
      borderColor: `rgba(${base}, ${0.15 + t * 0.12})`,
    }
  }

  if (percent <= 80) {
    const t = (percent - 60) / 20 // 0→1
    return {
      background: `linear-gradient(135deg, rgba(${base}, 0.06), rgba(245, 158, 11, ${t * 0.2}))`,
      borderColor: `rgba(245, 158, 11, ${0.2 + t * 0.3})`,
    }
  }

  const t = Math.min((percent - 80) / 20, 1) // 0→1
  return {
    background: `linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(239, 68, 68, ${0.1 + t * 0.2}))`,
    borderColor: `rgba(239, 68, 68, ${0.35 + t * 0.3})`,
  }
}

interface MetricCardProps {
  label: string
  value: string
  icon: React.ReactNode
  variant?: CardVariant
  /** When provided, the card background and border gradient from the base color toward amber/rose */
  barPercent?: number
}

function MetricCard({ label, value, icon, variant = 'zinc', barPercent }: MetricCardProps) {
  // Cards with a percentage get a dynamic heat gradient; static cards keep a flat tint
  const cardStyle: React.CSSProperties =
    barPercent !== undefined
      ? heatStyle(barPercent, variant)
      : {
          background: `rgba(${BASE_RGB[variant]}, 0.04)`,
          borderColor: `rgba(${BASE_RGB[variant]}, 0.18)`,
        }

  // Bar color steps through the same thresholds
  const barColor =
    barPercent === undefined
      ? ''
      : barPercent > 80
        ? 'bg-rose-500'
        : barPercent > 60
          ? 'bg-amber-500'
          : `bg-[rgba(${BASE_RGB[variant]},0.9)]`

  return (
    <div className="rounded-xl border p-4 transition-colors duration-700" style={cardStyle}>
      <div className={`flex items-center gap-1.5 ${ICON_COLOR[variant]}`}>
        {icon}
        <p className="text-xs font-medium tracking-wider uppercase opacity-80">{label}</p>
      </div>
      <p className={`mt-2 font-mono text-lg font-semibold ${VALUE_COLOR[variant]}`}>{value}</p>
      {barPercent !== undefined && (
        <div className="mt-3 h-1 w-full rounded-full bg-black/20">
          <div
            className={`h-1 rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${barPercent.toFixed(0)}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function HostMetrics() {
  const [metrics, setMetrics] = useState<HostMetrics | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource('/api/host/metrics/stream')

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.onmessage = (e: MessageEvent<string>) => {
      setMetrics(JSON.parse(e.data) as HostMetrics)
      setConnected(true)
    }

    return () => es.close()
  }, [])

  if (!metrics) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-500">
        {connected ? 'Waiting for host metrics…' : 'Connecting to agent…'}
      </div>
    )
  }

  const cpuPct = metrics.cpuPercent
  const memPct = pct(metrics.memUsedMb, metrics.memTotalMb)
  const diskPct = pct(metrics.diskUsedGb, metrics.diskTotalGb)
  const tempVariant = metrics.tempC !== null && metrics.tempC > 70 ? 'amber' : 'emerald'

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      <MetricCard
        label="CPU"
        value={`${cpuPct}%`}
        icon={<Cpu size={13} />}
        variant="sky"
        barPercent={cpuPct}
      />
      <MetricCard
        label="Memory"
        value={`${metrics.memUsedMb} / ${metrics.memTotalMb} MB`}
        icon={<MemoryStick size={13} />}
        variant="indigo"
        barPercent={memPct}
      />
      <MetricCard
        label="Disk"
        value={`${metrics.diskUsedGb} / ${metrics.diskTotalGb} GB`}
        icon={<HardDrive size={13} />}
        variant="violet"
        barPercent={diskPct}
      />
      {metrics.tempC !== null && (
        <MetricCard
          label="Temp"
          value={`${metrics.tempC}°C`}
          icon={<Thermometer size={13} />}
          variant={tempVariant}
        />
      )}
      <MetricCard
        label="Uptime"
        value={formatUptime(metrics.uptimeSeconds)}
        icon={<Timer size={13} />}
        variant="zinc"
      />
    </div>
  )
}
