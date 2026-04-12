'use client'
// SWRConfig provider — wraps the dashboard so all SWR hooks share one cache.
// Kept in its own file because layout.tsx should stay a Server Component;

import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        shouldRetryOnError: true,
        errorRetryCount: 3,
      }}
    >
      {children}
    </SWRConfig>
  )
}
