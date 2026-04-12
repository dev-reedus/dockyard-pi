// /settings — configuration for auth, polling intervals, and tunnel settings.
// TODO: Mostly static for now; will grow as the app needs more configuration surface.

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-medium">Agent connection</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-4">
            <dt className="w-32 shrink-0 text-zinc-500">Base URL</dt>
            <dd className="font-mono">{process.env['AGENT_BASE_URL'] ?? 'Not configured'}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-32 shrink-0 text-zinc-500">Token</dt>
            <dd className="font-mono text-zinc-400">{'*'.repeat(12)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-red-200 p-6">
        <h2 className="mb-2 text-lg font-medium text-red-700">Danger zone</h2>
        <p className="text-sm text-zinc-500">
          Destructive actions will appear here. None configured yet.
        </p>
      </div>
    </div>
  )
}
