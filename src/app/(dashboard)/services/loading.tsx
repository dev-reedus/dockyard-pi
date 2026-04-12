export default function ServicesLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-1.5">
        <div className="h-5 w-24 animate-pulse rounded-md bg-zinc-800" />
        <div className="h-3.5 w-40 animate-pulse rounded-md bg-zinc-800/60" />
      </div>

      {/* Card grid skeleton — 6 cards matching the xl:grid-cols-3 layout */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-l-5 border-zinc-800 border-l-zinc-700 bg-zinc-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="space-y-1.5">
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-800/60" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-800/60" />
        </div>
      </div>

      {/* Metric bars */}
      <div className="mt-4 space-y-2.5 px-4">
        <MetricSkeleton />
        <MetricSkeleton />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 px-4 py-3">
        <div className="h-3 w-28 animate-pulse rounded bg-zinc-800/60" />
        <div className="h-6 w-6 animate-pulse rounded-md bg-zinc-800" />
      </div>
    </div>
  )
}

function MetricSkeleton() {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="h-3 w-10 animate-pulse rounded bg-zinc-800/60" />
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-800/60" />
      </div>
      <div className="h-1 w-full animate-pulse rounded-full bg-zinc-800" />
    </div>
  )
}
