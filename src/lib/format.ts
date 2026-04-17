/**
 * Format an ISO 8601 duration string (e.g. "PT2H30M15S") into a human-readable
 * uptime string. Shows the two most significant units for readability.
 *
 * Examples:
 *   "PT0S"      → "just started"
 *   "PT45S"     → "45s"
 *   "PT5M30S"   → "5m 30s"
 *   "PT2H30M5S" → "2h 30m"
 */
export function formatUptime(duration: string): string {
  if (!duration || duration === 'PT0S') return 'just started'

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return duration

  const h = parseInt(match[1] ?? '0', 10)
  const m = parseInt(match[2] ?? '0', 10)
  const s = parseInt(match[3] ?? '0', 10)

  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
