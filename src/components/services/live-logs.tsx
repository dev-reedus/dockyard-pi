'use client'

// LiveLogs — displays container logs with a snapshot/live toggle.
// Snapshot mode (default): shows the server-rendered initial logs passed as a prop.
// Live mode: opens an EventSource SSE connection to stream new lines in real time.
// Switching back to snapshot restores the original lines so the user can still
// read historical output without losing their place.

import { useEffect, useRef, useState } from 'react'
import { Radio, RefreshCw, Square } from 'lucide-react'

export interface LogLine {
  timestamp: string
  stream: 'stdout' | 'stderr'
  message: string
}

interface Props {
  serviceId: string
  /** Server-fetched snapshot lines, shown before the user switches to live mode. */
  initialLogs: LogLine[]
}

// Cap live log buffer to avoid unbounded memory growth in long-running sessions
const MAX_LIVE_LINES = 1000

export function LiveLogs({ serviceId, initialLogs }: Props) {
  const [mode, setMode] = useState<'snapshot' | 'live'>('snapshot')
  const [logs, setLogs] = useState<LogLine[]>(initialLogs)
  const [connected, setConnected] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function refreshSnapshot() {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await fetch(`/api/services/${serviceId}/logs?tail=50`)
      if (res.ok) {
        const fresh = (await res.json()) as LogLine[]
        setLogs(fresh)
      }
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (mode !== 'live') {
      // Restore snapshot when the user switches back
      // since logs are not in the dependency array of the hook, this is safe
      // also the parent is a server component, is rendered only one on the server, so initialLogs prop is "stable"

      setLogs(initialLogs)
      setConnected(false)
      return
    }

    // Clear snapshot and start streaming
    setLogs([])
    const es = new EventSource(`/api/services/${serviceId}/logs/stream?tail=50`)

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.onmessage = (e: MessageEvent<string>) => {
      const line = JSON.parse(e.data) as LogLine
      setLogs((prev) => {
        const next = [...prev, line]
        // Keep only the last MAX_LIVE_LINES to avoid unbounded growth
        return next.length > MAX_LIVE_LINES ? next.slice(next.length - MAX_LIVE_LINES) : next
      })
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [mode, serviceId, initialLogs])

  // Auto-scroll to the latest line only in live mode
  useEffect(() => {
    if (mode === 'live') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, mode])

  const isEmpty = logs.length === 0

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="font-mono text-xs text-zinc-600">
          {mode === 'snapshot'
            ? `stdout / stderr — last ${initialLogs.length} lines`
            : 'live stream'}
        </span>

        <div className="flex items-center gap-2">
          {/* Refresh snapshot button — only shown in snapshot mode */}
          {mode === 'snapshot' && (
            <button
              onClick={refreshSnapshot}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-40"
              title="Refresh snapshot"
            >
              <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
              refresh
            </button>
          )}

          {/* Connection indicator dot */}
          {mode === 'live' && (
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                connected ? 'bg-emerald-400' : 'animate-pulse bg-amber-400'
              }`}
              title={connected ? 'Connected' : 'Connecting…'}
            />
          )}

          <button
            onClick={() => setMode((m) => (m === 'snapshot' ? 'live' : 'snapshot'))}
            className={`flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-xs transition-colors ${
              mode === 'live'
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {mode === 'live' ? (
              <>
                <Square size={10} />
                snapshot
              </>
            ) : (
              <>
                <Radio size={10} />
                go live
              </>
            )}
          </button>
        </div>
      </div>

      {/* Log output */}
      <div className="max-h-96 overflow-auto p-4">
        {isEmpty ? (
          <span className="text-sm text-zinc-600">
            {mode === 'live' && !connected ? 'Connecting…' : 'No logs available.'}
          </span>
        ) : (
          logs.map((line, i) => <LogLineRow key={i} line={line} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function LogLineRow({ line }: { line: LogLine }) {
  const streamColor = line.stream === 'stderr' ? 'text-red-400' : 'text-zinc-400'

  return (
    <div className="flex gap-3 font-mono text-xs leading-5">
      <span className="shrink-0 text-zinc-700 select-none">{line.timestamp}</span>
      <span className={`shrink-0 select-none ${streamColor}`}>[{line.stream}]</span>
      <span className="break-all text-zinc-300">{line.message}</span>
    </div>
  )
}
