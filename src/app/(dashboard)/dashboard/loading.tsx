// Shown while the dashboard page is streaming / loading server data.
// handled automatically by Next.js as the Suspense fallback for the route.

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        ))}
      </div>
    </div>
  )
}
