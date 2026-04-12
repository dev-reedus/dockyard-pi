// /services/[id] — deep inspection page for a single service.
// Server Component: fetches service details and recent logs on the server.
// TODO: Resource charts and live log tail will be Client islands.

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { ArrowDown, ArrowUp, Box, Cpu, Globe, MemoryStick, Network } from 'lucide-react'
import { getService, getServiceStats } from '@/lib/docker'
import type { LogLine } from '@/lib/logs'
import { getRecentLogs } from '@/lib/logs'
import { ServiceActions } from '@/components/services/service-actions'
import type { ServiceHealth, ServiceStatus } from '@/types/service'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params

  // Fetch service + stats in parallel. Stats may fail when the container is stopped,
  // also it is useless to fetch stats if the fetch service fails
  // that's why calls are decoupled.
  let service
  try {
    service = await getService(id)
  } catch {
    notFound()
  }

  const stats = await getServiceStats(id).catch(() => null)

  const isRunning = service.status === 'running' || service.status === 'restarting'

  // Stats are only meaningful when the container is running
  const cpu = stats?.cpuPercent ?? service.cpuPercent
  const memMb = stats?.memoryMb ?? service.memoryMb
  const memLimitMb = stats?.memoryLimitMb ?? service.memoryLimitMb

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">{service.displayName}</h1>
          <p className="mt-0.5 font-mono text-xs text-zinc-600">{service.containerName}</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={service.status} />
            <HealthBadge health={service.health} />
          </div>
        </div>
      </div>

      {/* Action buttons — Client island for interactivity */}
      <ServiceActions serviceId={service.id} status={service.status} />

      {/* Key details grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailCard
          label="Image"
          value={`${service.image}:${service.tag}`}
          icon={<Box size={14} />}
        />
        <DetailCard
          label="CPU"
          value={isRunning ? `${cpu.toFixed(1)}%` : '—'}
          icon={<Cpu size={14} />}
          variant="sky"
        />
        <DetailCard
          label="Memory"
          value={isRunning ? `${memMb.toFixed(0)} / ${memLimitMb.toFixed(0)} MB` : '—'}
          icon={<MemoryStick size={14} />}
          variant="indigo"
        />
        <DetailCard
          label="Internal port"
          value={service.internalPort?.toString() ?? '—'}
          icon={<Network size={14} />}
          variant="violet"
        />
        {service.publicUrl && (
          <DetailCard
            label="Public URL"
            value={service.publicUrl}
            icon={<Globe size={14} />}
            isUrl
          />
        )}
        {isRunning && stats && (
          <>
            <DetailCard
              label="Network RX"
              value={`${stats.networkRxMb.toFixed(2)} MB`}
              icon={<ArrowDown size={14} />}
              variant="emerald"
            />
            <DetailCard
              label="Network TX"
              value={`${stats.networkTxMb.toFixed(2)} MB`}
              icon={<ArrowUp size={14} />}
              variant="emerald"
            />
          </>
        )}
      </div>

      {/* Recent logs — Suspense boundary so slow log fetch doesn't block the page */}
      <section>
        <h2 className="mb-3 text-sm font-medium tracking-wider text-zinc-500 uppercase">
          Recent logs
        </h2>
        <Suspense
          fallback={
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
              Loading logs…
            </div>
          }
        >
          <LogsPanel serviceId={id} />
        </Suspense>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail card
// ---------------------------------------------------------------------------
type CardVariant = 'default' | 'sky' | 'indigo' | 'violet' | 'emerald'

const cardVariantStyles: Record<
  CardVariant,
  { bg: string; border: string; icon: string; value: string }
> = {
  default: {
    bg: 'bg-zinc-900',
    border: 'border-zinc-800',
    icon: 'text-zinc-500',
    value: 'text-zinc-200',
  },
  sky: {
    bg: 'bg-sky-500/5',
    border: 'border-sky-500/20',
    icon: 'text-sky-400',
    value: 'text-sky-200',
  },
  indigo: {
    bg: 'bg-indigo-500/5',
    border: 'border-indigo-500/20',
    icon: 'text-indigo-400',
    value: 'text-indigo-200',
  },
  violet: {
    bg: 'bg-violet-500/5',
    border: 'border-violet-500/20',
    icon: 'text-violet-400',
    value: 'text-violet-200',
  },
  emerald: {
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400',
    value: 'text-emerald-200',
  },
}

function DetailCard({
  label,
  value,
  icon,
  isUrl = false,
  variant = 'default',
}: {
  label: string
  value: string
  icon: React.ReactNode
  isUrl?: boolean
  variant?: CardVariant
}) {
  const s = cardVariantStyles[variant]
  return (
    <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
      <div className={`flex items-center gap-1.5 ${s.icon}`}>
        {icon}
        <p className="text-xs font-medium tracking-wider uppercase opacity-80">{label}</p>
      </div>
      {isUrl ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block truncate font-mono text-xs text-blue-400 hover:text-blue-300"
        >
          {value}
        </a>
      ) : (
        <p className={`mt-2 truncate font-mono text-xl font-semibold ${s.value}`}>{value}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status / health badges — mirrors the grid card badges
// ---------------------------------------------------------------------------
const statusStyles: Record<ServiceStatus, { dot: string; text: string; bg: string }> = {
  running: { dot: 'bg-sky-400', text: 'text-sky-400', bg: 'bg-sky-500/10' },
  stopped: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-500/10' },
  restarting: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  unknown: { dot: 'bg-zinc-500', text: 'text-zinc-500', bg: 'bg-zinc-800' },
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const s = statusStyles[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  )
}

const healthStyles: Record<ServiceHealth, { text: string; bg: string }> = {
  healthy: { text: 'text-sky-400', bg: 'bg-sky-500/10' },
  unhealthy: { text: 'text-rose-400', bg: 'bg-rose-500/10' },
  starting: { text: 'text-amber-400', bg: 'bg-amber-500/10' },
  none: { text: 'text-zinc-600', bg: 'bg-zinc-800' },
}

function HealthBadge({ health }: { health: ServiceHealth }) {
  const s = healthStyles[health]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}
    >
      {health}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Logs panel — separate async component so Suspense can wrap it independently.
// ---------------------------------------------------------------------------
// TODO: make a Client Component that streams via SSE/WebSocket.

async function LogsPanel({ serviceId }: { serviceId: string }) {
  const logs = await getRecentLogs(serviceId, 50)

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
        No logs available.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-2">
        <span className="font-mono text-xs text-zinc-600">stdout / stderr — last 50 lines</span>
      </div>
      <div className="max-h-96 overflow-auto p-4">
        {logs.map((line, i) => (
          <LogLine key={i} line={line} />
        ))}
      </div>
    </div>
  )
}

function LogLine({ line }: { line: LogLine }) {
  const streamColor = line.stream === 'stderr' ? 'text-red-400' : 'text-zinc-400'

  return (
    <div className="flex gap-3 font-mono text-xs leading-5">
      <span className="shrink-0 text-zinc-700 select-none">{line.timestamp}</span>
      <span className={`shrink-0 select-none ${streamColor}`}>[{line.stream}]</span>
      <span className="text-zinc-300">{line.message}</span>
    </div>
  )
}
