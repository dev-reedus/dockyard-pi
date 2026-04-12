'use client'
// Login page — shown when the session cookie is missing or invalid.
// Uses useActionState (React 19) to display server-side errors without
// a client-side fetch. The form submits directly to the login Server Action.

import { useActionState } from 'react'
import Image from 'next/image'
import { login } from '@/lib/login-action'

export default function LoginPage() {
  // useActionState wires the Server Action to the form:
  // - state holds the last return value from the action ({ error } or null)
  // - action is the form's action handler
  // - isPending is true while the action is in-flight
  const [state, action, isPending] = useActionState(login, { error: '' })

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        {/* Logo + title */}
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="DockYard logo"
            width={64}
            height={64}
            className="mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-white">DockYard</h1>
          <p className="mt-1 text-sm text-zinc-400">Pi control panel</p>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              placeholder="Enter password"
            />
          </div>

          {/* Server-side error message */}
          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
