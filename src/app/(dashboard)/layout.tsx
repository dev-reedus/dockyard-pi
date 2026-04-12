// Shared layout for all internal dashboard routes.
// Stays a Server Component — interactive state (sidebar open/collapsed)
// lives in SidebarShell which is the minimal Client boundary.

import type { ReactNode } from 'react'
import { SidebarShell } from '@/components/layout/sidebar-shell'
import { Providers } from '@/components/providers'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <SidebarShell>{children}</SidebarShell>
    </Providers>
  )
}
