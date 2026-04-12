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

/**
 * @param serviceId      - container ID or name
 * @param refreshInterval - how often to re-fetch in ms (default 5s)
 */
export function useServiceStats(serviceId: string, refreshInterval = 5_000) {
  return useSWR<ServiceStats>(`/api/services/${serviceId}/stats`, fetcher, {
    refreshInterval,
  })
}
