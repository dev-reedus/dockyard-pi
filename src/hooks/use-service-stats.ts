'use client'
// SWR polling hook for live resource stats of a single service.
// Polls more frequently than the service list because CPU/memory
// values change quickly and are shown in the detail charts.
//TODO: stream of service stats with history

import useSWR from 'swr'
import type { ServiceStats } from '@/types/service'

const fetcher = (url: string): Promise<ServiceStats> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch stats: ${r.status}`)
    return r.json() as Promise<ServiceStats>
  })

interface UseServiceStatsOptions {
  /** How often to re-fetch in ms (default 5s) */
  refreshInterval?: number
  /**
   * Server-fetched stats to display immediately on first render,
   * before the first SWR poll completes. Prevents a loading flash.
   */
  fallbackData?: ServiceStats
}

export function useServiceStats(serviceId: string, options: UseServiceStatsOptions = {}) {
  const { refreshInterval = 5_000, fallbackData } = options
  return useSWR<ServiceStats>(`/api/services/${serviceId}/stats`, fetcher, {
    refreshInterval,
    // exactOptionalPropertyTypes requires we omit the key entirely when undefined
    ...(fallbackData !== undefined ? { fallbackData } : {}),
  })
}
