'use client'
// Sidebar — Client Component.
// Desktop: always visible, toggles between full and icon-only.
// Mobile: fixed overlay, slides in from the left when isOpen is true.

import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Rocket,
  Server,
  Settings,
} from 'lucide-react'
import { NavLink } from './nav-link'
import { logout } from '@/lib/login-action'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/services', label: 'Services', icon: Server },
  { href: '/deployments', label: 'Deployments', icon: Rocket },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onClose: () => void
  onToggleCollapse: () => void
}

export function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={[
        'flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 text-zinc-100 transition-all duration-200',
        'md:relative md:translate-x-0',
        isCollapsed ? 'md:w-14' : 'md:w-56',
        'fixed inset-y-0 left-0 z-30 w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      {/* Logo + collapse toggle */}
      <div className="flex h-16 shrink-0 items-center border-b border-zinc-800 px-3">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <Image
            src="/logo.png"
            alt="DockYard logo"
            width={36}
            height={36}
            className="shrink-0 rounded-md"
          />
          {!isCollapsed && (
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-base font-semibold tracking-tight text-zinc-100">
                DockYard
              </span>
              <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 font-mono text-xs text-indigo-400">
                pi
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="ml-1 hidden shrink-0 rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-400 md:flex"
        >
          {isCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            icon={<Icon size={16} />}
            isCollapsed={isCollapsed}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Footer: logout + desktop collapse toggle */}
      <div className="shrink-0 space-y-0.5 border-t border-zinc-800 p-2">
        {/* Logout */}
        <form action={logout}>
          <button
            type="submit"
            title="Log out"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={16} className="shrink-0" />
            {!isCollapsed && <span>Log out</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
