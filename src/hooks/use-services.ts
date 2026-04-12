'use client'
// SWR polling hook for the service list.
// Hits the /api/services Route Handler (which calls the Pi agent server-side),
// to never let agent token reaches the browser.

import useSWR from 'swr'
import type { Service } from '@/types/service'

const fetcher = (url: string): Promise<Service[]> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch services: ${r.status}`)
    return r.json() as Promise<Service[]>
  })

interface Options {
  /** Server-fetched data to use on first render — avoids a loading flash */
  fallbackData?: Service[]
  refreshInterval?: number
  onSuccess?: (data: Service[]) => void
}

export function useServices({ fallbackData, refreshInterval = 10_000, onSuccess }: Options = {}) {
  return useSWR<Service[]>('/api/services', fetcher, {
    ...(fallbackData !== undefined ? { fallbackData } : {}),
    refreshInterval,
    revalidateOnFocus: true,
    ...(onSuccess !== undefined ? { onSuccess } : {}),
  })
}
