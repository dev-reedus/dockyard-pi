import type { ServiceStatus } from '@/types/service'

const statusStyles: Record<ServiceStatus, { dot: string; text: string; bg: string }> = {
  running: { dot: 'bg-sky-400', text: 'text-sky-400', bg: 'bg-sky-500/10' },
  stopped: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-500/10' },
  restarting: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  unknown: { dot: 'bg-zinc-500', text: 'text-zinc-500', bg: 'bg-zinc-800' },
}

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: ServiceStatus
  size?: 'sm' | 'md'
}) {
  const s = statusStyles[status]
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${padding} text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  )
}
