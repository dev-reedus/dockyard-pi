import { formatUptime } from '@/lib/format'

/**
 * Displays a container's uptime as a compact badge.
 * Accepts an ISO 8601 duration string (e.g. "PT2H30M15S") from the agent.
 */
export function UptimeBadge({ uptime, size = 'md' }: { uptime: string; size?: 'sm' | 'md' }) {
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center rounded-full bg-zinc-800 ${padding} text-xs font-medium text-zinc-400`}
    >
      up {formatUptime(uptime)}
    </span>
  )
}
