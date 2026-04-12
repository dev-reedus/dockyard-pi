// /services — full service list, server-rendered then kept live by SWR.
// Server Component: fetches the initial data so the first paint is instant.
// ServicesTable (Client Component) takes over polling after hydration.

import { getServices } from '@/lib/docker'
import { ServicesGrid } from '@/components/services/services-grid'

export default async function ServicesPage() {
  const services = await getServices()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Services</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Auto-refreshes every 10 s</p>
        </div>
      </div>

      {/* Pass server data as initialData — SWR picks up polling from there */}
      <ServicesGrid initialData={services} />
    </div>
  )
}
