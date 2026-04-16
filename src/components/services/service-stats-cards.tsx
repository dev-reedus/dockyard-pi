'use client'

// ServiceStatsCards — live-polling resource stats for a single service.
// Uses SWR to re-fetch CPU/memory/network every 5 seconds.
// Accepts server-fetched initialStats as fallbackData so the page
// renders with real numbers immediately, before the first poll fires.

import { ArrowDown, ArrowUp, Cpu, MemoryStick } from 'lucide-react'
import { useServiceStats } from '@/hooks/use-service-stats'
import type { ServiceStats } from '@/types/service'

interface Props {
  serviceId: string
  initialStats: ServiceStats | null
}

export function ServiceStatsCards({ serviceId, initialStats }: Props) {
  const { data: stats } = useServiceStats(serviceId, {
    ...(initialStats !== null ? { fallbackData: initialStats } : {}),
  })

  // No data yet and no fallback — nothing to show
  if (!stats) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="CPU"
        value={`${stats.cpuPercent.toFixed(1)}%`}
        icon={<Cpu size={14} />}
        variant="sky"
      />
      <StatCard
        label="Memory"
        value={`${stats.memoryMb.toFixed(0)} / ${stats.memoryLimitMb.toFixed(0)} MB`}
        icon={<MemoryStick size={14} />}
        variant="indigo"
      />
      <StatCard
        label="Network RX"
        value={`${stats.networkRxMb.toFixed(2)} MB`}
        icon={<ArrowDown size={14} />}
        variant="emerald"
      />
      <StatCard
        label="Network TX"
        value={`${stats.networkTxMb.toFixed(2)} MB`}
        icon={<ArrowUp size={14} />}
        variant="emerald"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal card — mirrors the DetailCard style in the parent page
// ---------------------------------------------------------------------------
type Variant = 'sky' | 'indigo' | 'emerald'

const variantStyles: Record<Variant, { bg: string; border: string; icon: string; value: string }> =
  {
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
    emerald: {
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/20',
      icon: 'text-emerald-400',
      value: 'text-emerald-200',
    },
  }

function StatCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string
  value: string
  icon: React.ReactNode
  variant: Variant
}) {
  const s = variantStyles[variant]
  return (
    <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
      <div className={`flex items-center gap-1.5 ${s.icon}`}>
        {icon}
        <p className="text-xs font-medium tracking-wider uppercase opacity-80">{label}</p>
      </div>
      <p className={`mt-2 truncate font-mono text-xl font-semibold ${s.value}`}>{value}</p>
    </div>
  )
}
