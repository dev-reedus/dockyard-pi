'use client'
// ServicesGrid — Client Component.
// Card-based layout for the services list. Each card shows status, health,
// snapshot metrics, and a quick restart action without navigating to the detail page.
// Kept live via SWR polling — "initial data from server"

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Cpu, ExternalLink, Loader2, MemoryStick, RotateCcw } from 'lucide-react'
import { useServices } from '@/hooks/use-services'
import { restartService } from '@/lib/actions'
import { UptimeBadge } from '@/components/ui/uptime-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Service, ServiceStatus } from '@/types/service'

interface ServicesGridProps {
  initialData: Service[]
}

export function ServicesGrid({ initialData }: ServicesGridProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date())

  const { data: services = initialData, isValidating } = useServices({
    fallbackData: initialData,
    onSuccess: () => setLastUpdated(new Date()),
  })

  const updatedAt = lastUpdated.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="space-y-4">
      {/* Fetch status indicator */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-zinc-600">
        {isValidating ? (
          <>
            <Loader2 size={11} className="animate-spin text-zinc-500" />
            <span>Updating…</span>
          </>
        ) : (
          <span>Updated at {updatedAt}</span>
        )}
      </div>

      {!services.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-sm font-medium text-zinc-400">No services found</p>
          <p className="mt-1 text-xs text-zinc-600">
            Make sure the agent is running and Docker has containers.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual service card
// ---------------------------------------------------------------------------
const statusAccent: Record<ServiceStatus, string> = {
  running: 'border-l-sky-500',
  stopped: 'border-l-rose-500',
  restarting: 'border-l-amber-500',
  unknown: 'border-l-zinc-700',
}

function ServiceCard({ service }: { service: Service }) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  // Use values from the service snapshot — refreshed every 10s by the parent poll
  //TODO: update with SSE or use parent service just on first SSR, then polling stats more frequently
  const { cpuPercent: cpu, memoryMb: memMb, memoryLimitMb: memLimitMb } = service

  function handleRestart() {
    setFeedback(null)
    startTransition(async () => {
      const result = await restartService(service.id)
      setFeedback(
        result.success
          ? { ok: true, message: 'Restarted' }
          : { ok: false, message: result.error ?? 'Failed' },
      )
    })
  }

  const isRunning = service.status === 'running' || service.status === 'restarting'
  const memPercent = memLimitMb > 0 ? Math.min((memMb / memLimitMb) * 100, 100) : 0

  return (
    <div
      className={`flex flex-col rounded-xl border border-l-5 border-zinc-800 bg-zinc-900 ${statusAccent[service.status]}`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <Link
            href={`/services/${service.id}`}
            className="block truncate font-medium text-zinc-100 hover:text-white"
          >
            {service.displayName}
          </Link>
          <p className="mt-0.5 truncate font-mono text-xs text-zinc-600">{service.containerName}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={service.status} size="sm" />
          <UptimeBadge uptime={service.uptime} size="sm" />
        </div>
      </div>

      {/* Metrics — hidden when stopped since stats are unavailable */}
      <div className="mt-4 space-y-2.5 px-4">
        {isRunning ? (
          <>
            <MetricRow
              icon={<Cpu size={11} />}
              label="CPU"
              value={`${cpu.toFixed(1)}%`}
              percent={Math.min(cpu, 100)}
              barColor="bg-sky-500"
            />
            <MetricRow
              icon={<MemoryStick size={11} />}
              label="RAM"
              value={`${memMb.toFixed(0)} / ${memLimitMb.toFixed(0)} MB`}
              percent={memPercent}
              barColor={memPercent > 85 ? 'bg-rose-500' : 'bg-indigo-500'}
            />
          </>
        ) : (
          <p className="text-xs text-zinc-700">No metrics — container is {service.status}</p>
        )}
      </div>

      {/*
      Footer — URL + actions
      TODO: implement public url fetch via npm apis
      */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800 px-4 py-3">
        {service.publicUrl ? (
          <a
            href={service.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <span className="truncate">{service.publicUrl.replace(/^https?:\/\//, '')}</span>
            <ExternalLink size={10} className="shrink-0" />
          </a>
        ) : (
          <span className="text-xs text-zinc-700">no public URL</span>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {/* Inline feedback */}
          {feedback && (
            <span className={`text-xs ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {feedback.message}
            </span>
          )}

          {/* Quick restart button */}
          <button
            onClick={handleRestart}
            disabled={isPending || !isRunning}
            title="Restart"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <RotateCcw size={13} className={isPending ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metric row with mini progress bar
// TODO: implement metric history with charts, to analyze if could over-provision resources
// ---------------------------------------------------------------------------
function MetricRow({
  icon,
  label,
  value,
  percent,
  barColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  percent: number
  barColor: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-zinc-600">
          {icon}
          <span className="text-xs">{label}</span>
        </span>
        <span className="font-mono text-xs text-zinc-400 tabular-nums">{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
