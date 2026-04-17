'use client'
// ServiceActions — Client Component.
// Renders action buttons (restart, stop, start) and calls Server Actions directly.
// useTransition keeps the UI responsive during the async action without a loading spinner
// blocking the whole page — only the buttons are disabled while the action is in-flight.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { Play, RefreshCw, RotateCcw, Square } from 'lucide-react'
import { pullAndRecreateService, restartService, startService, stopService } from '@/lib/actions'
import type { ServiceStatus } from '@/types/service'

interface ServiceActionsProps {
  serviceId: string
  status: ServiceStatus
}

type ActionKey = 'restart' | 'stop' | 'start' | 'recreate'

export function ServiceActions({ serviceId, status }: ServiceActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null)
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null)
  const router = useRouter()
  const { mutate } = useSWRConfig()

  function run(
    key: ActionKey,
    fn: (id: string) => Promise<{ success: boolean; error?: string; deployment: unknown }>,
  ) {
    setActiveAction(key)
    setLastResult(null)

    startTransition(async () => {
      const result = await fn(serviceId)

      if (result.success) {
        // Always revalidate the services list so the grid reflects the new state immediately
        await mutate('/api/services')

        if (key === 'recreate') {
          // Recreate produces a new container with a new ID — navigate away from the stale page
          router.push('/services')
          return
        }

        // revalidatePath in the Server Action already purges the cache — refresh picks it up
        router.refresh()
      }

      setLastResult(
        result.success
          ? { ok: true, message: 'Done' }
          : { ok: false, message: result.error ?? 'Action failed' },
      )
      setActiveAction(null)
    })
  }

  const isRunning = status === 'running' || status === 'restarting'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* Restart — available when running */}
        <ActionButton
          label="Restart"
          icon={<RotateCcw size={14} />}
          onClick={() => run('restart', restartService)}
          disabled={isPending || !isRunning}
          loading={activeAction === 'restart'}
        />

        {/* Stop — available when running */}
        <ActionButton
          label="Stop"
          icon={<Square size={14} />}
          onClick={() => run('stop', stopService)}
          disabled={isPending || !isRunning}
          loading={activeAction === 'stop'}
          variant="danger"
        />

        {/* Start — available when stopped */}
        <ActionButton
          label="Start"
          icon={<Play size={14} />}
          onClick={() => run('start', startService)}
          disabled={isPending || isRunning}
          loading={activeAction === 'start'}
          variant="success"
        />

        {/* Pull & recreate — available anytime */}
        <ActionButton
          label="Pull & recreate"
          icon={<RefreshCw size={14} />}
          onClick={() => run('recreate', pullAndRecreateService)}
          disabled={isPending}
          loading={activeAction === 'recreate'}
        />
      </div>

      {/* Inline feedback — clears on the next action */}
      {lastResult && (
        <p className={`text-sm ${lastResult.ok ? 'text-green-500' : 'text-red-500'}`}>
          {lastResult.message}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ActionButton — small reusable button with loading state
// ---------------------------------------------------------------------------
type ButtonVariant = 'default' | 'danger' | 'success'

const variantClasses: Record<ButtonVariant, string> = {
  default: 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700',
  danger: 'border-rose-900 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',
  success: 'border-emerald-900 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  loading,
  variant = 'default',
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled: boolean
  loading: boolean
  variant?: ButtonVariant
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variantClasses[variant]}`}
    >
      {loading ? (
        // Spinning icon while this specific action is in-flight
        <span className="animate-spin">{icon}</span>
      ) : (
        icon
      )}
      {label}
    </button>
  )
}
