'use client'
// NavLink — highlights the active route and respects collapsed mode.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface NavLinkProps {
  href: string
  label: string
  icon: ReactNode
  isCollapsed: boolean
  onClick: () => void
}

export function NavLink({ href, label, icon, isCollapsed, onClick }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isCollapsed ? 'justify-center' : ''
      } ${
        isActive
          ? 'bg-indigo-500/10 text-indigo-300'
          : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {!isCollapsed && <span>{label}</span>}
    </Link>
  )
}
