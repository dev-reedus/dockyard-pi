'use client'
// SidebarShell — owns all sidebar states so the dashboard layout stays a Server Component.
// isOpen → mobile drawer (show/hide)
// isCollapsed → desktop sidebar (full vs icon-only)

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop — closes drawer on tap */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <Sidebar
        isOpen={isOpen}
        isCollapsed={isCollapsed}
        onClose={() => setIsOpen(false)}
        onToggleCollapse={() => setIsCollapsed((c) => !c)}
      />

      {/* Right side: mobile header + page content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — hidden on md+ where sidebar is always visible */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 backdrop-blur md:hidden">
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <span className="font-semibold text-zinc-100">DockYard</span>
          <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 font-mono text-xs text-indigo-400">
            pi
          </span>
        </header>

        <main className="flex flex-1 flex-col overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
