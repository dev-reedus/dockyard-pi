// /dashboard — overall health summary, alerts, recent events, top resource consumers.
// This is a Server Component. It fetches the initial service data on the server
// and renders the shell. Client islands (charts, auto-refresh) are imported below.

import { Suspense } from 'react'
import { Activity, AlertTriangle, Server, Zap } from 'lucide-react'
import { getEvents, getServices } from '@/lib/docker'
import { HostMetrics } from '@/components/dashboard/host-metrics'
import type { AppEvent } from '@/types/service'

export default async function DashboardPage() {
  const [services, events] = await Promise.all([getServices(), getEvents()])

  const unhealthyCount = services.filter(
    (s) => s.health === 'unhealthy' || s.status === 'stopped',
  ).length

  const runningCount = services.filter((s) => s.status === 'running').length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Raspberry Pi service overview</p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total services" value={services.length} icon={<Server size={16} />} />
        <StatCard
          label="Running"
          value={runningCount}
          icon={<Activity size={16} />}
          variant="sky"
        />
        <StatCard
          label="Unhealthy / stopped"
          value={unhealthyCount}
          icon={<AlertTriangle size={16} />}
          variant={unhealthyCount > 0 ? 'rose' : 'default'}
        />
        <StatCard
          label="Recent events"
          value={events.length}
          icon={<Zap size={16} />}
          variant="indigo"
        />
      </div>

      {/* Host metrics — live-streamed Client island, no server data needed */}
      <section>
        <h2 className="mb-3 text-sm font-medium tracking-wider text-zinc-500 uppercase">Host</h2>
        <HostMetrics />
      </section>

      {/* Recent events list — wrapped in Suspense for future streaming */}
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading events…</p>}>
        <EventsList events={events} />
      </Suspense>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
type CardVariant = 'default' | 'sky' | 'rose' | 'indigo'

const variantStyles: Record<
  CardVariant,
  { value: string; icon: string; ring: string; bg: string }
> = {
  default: {
    value: 'text-zinc-100',
    icon: 'text-zinc-500 bg-zinc-800',
    ring: 'ring-transparent',
    bg: 'bg-zinc-900',
  },
  sky: {
    value: 'text-sky-300',
    icon: 'text-sky-400 bg-sky-500/10',
    ring: 'ring-transparent',
    bg: 'bg-sky-500/5',
  },
  rose: {
    value: 'text-rose-300',
    icon: 'text-rose-400 bg-rose-500/10',
    ring: 'ring-rose-500/20',
    bg: 'bg-rose-500/5',
  },
  indigo: {
    value: 'text-indigo-300',
    icon: 'text-indigo-400 bg-indigo-500/10',
    ring: 'ring-transparent',
    bg: 'bg-indigo-500/5',
  },
}

function StatCard({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string
  value: number
  icon: React.ReactNode
  variant?: CardVariant
}) {
  const styles = variantStyles[variant]

  return (
    <div className={`rounded-xl border border-zinc-800 p-4 ring-1 ${styles.bg} ${styles.ring}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <span className={`rounded-md p-1.5 ${styles.icon}`}>{icon}</span>
      </div>
      <p className={`mt-3 font-mono text-3xl font-semibold tabular-nums ${styles.value}`}>
        {value}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Events list
// ---------------------------------------------------------------------------
const severityDot: Record<AppEvent['severity'], string> = {
  error: 'bg-rose-500',
  warn: 'bg-amber-500',
  info: 'bg-sky-500',
}

const severityLabel: Record<AppEvent['severity'], string> = {
  error: 'text-rose-400',
  warn: 'text-amber-400',
  info: 'text-zinc-500',
}

function EventsList({ events }: { events: AppEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
        No recent events.
      </div>
    )
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium tracking-wider text-zinc-500 uppercase">
        Recent events
      </h2>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <ul className="divide-y divide-zinc-800">
          {events.slice(0, 10).map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot[e.severity]}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-200">{e.message}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={`text-xs ${severityLabel[e.severity]}`}>{e.severity}</span>
                  <span className="text-xs text-zinc-600">·</span>
                  <span className="text-xs text-zinc-600">{e.source}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
