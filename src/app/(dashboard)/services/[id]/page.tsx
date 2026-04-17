// /services/[id] — deep inspection page for a single service.
// Server Component: fetches service details and an initial log snapshot.
// LiveLogs (Client island) handles the snapshot/live toggle from there.

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Box, Globe, Network } from 'lucide-react'
import { getService, getServiceStats } from '@/lib/docker'
import { getRecentLogs } from '@/lib/logs'
import { ServiceActions } from '@/components/services/service-actions'
import { ServiceStatsCards } from '@/components/services/service-stats-cards'
import { LiveLogs } from '@/components/services/live-logs'
import { UptimeBadge } from '@/components/ui/uptime-badge'
import { StatusBadge } from '@/components/ui/status-badge'

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">{service.displayName}</h1>
          <p className="mt-0.5 font-mono text-xs text-zinc-600">{service.containerName}</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={service.status} />
            <UptimeBadge uptime={service.uptime} />
          </div>
        </div>
      </div>

      {/* Action buttons — Client island for interactivity */}
      <ServiceActions serviceId={service.id} status={service.status} />

      {/* Static service details */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailCard
          label="Image"
          value={`${service.image}:${service.tag}`}
          icon={<Box size={14} />}
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
      </div>

      {/* Live stats — Client island that polls every 5s via SWR */}
      {isRunning && <ServiceStatsCards serviceId={service.id} initialStats={stats} />}

      {/* Logs — server fetches a snapshot; the LiveLogs Client component adds a live toggle */}
      <section>
        <h2 className="mb-3 text-sm font-medium tracking-wider text-zinc-500 uppercase">Logs</h2>
        <Suspense
          fallback={
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
              Loading logs…
            </div>
          }
        >
          <LogsSection serviceId={id} />
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
// Logs section — async Server Component that fetches the initial snapshot,
// then renders the LiveLogs Client Component which handles the live toggle.
// ---------------------------------------------------------------------------
async function LogsSection({ serviceId }: { serviceId: string }) {
  const logs = await getRecentLogs(serviceId, 50)
  return <LiveLogs serviceId={serviceId} initialLogs={logs} />
}
