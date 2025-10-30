'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from 'react'

import type { AuthUser } from '@/app/db/client'
import type { DashboardNavItem } from '@/app/dashboard/types'

import AuthControls from '@/app/components/AuthControls'
import { classNames } from '@/app/dashboard/components/ui'

const NAV_ITEMS: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/words', label: 'Words' },
  { href: '/dashboard/users', label: 'Users' },
]

export interface DashboardContextValue {
  user: AuthUser
  isContributor: boolean
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export const useDashboardContext = () => {
  const value = useContext(DashboardContext)
  if (!value) {
    throw new Error('DashboardContext must be used within DashboardShell')
  }
  return value
}

interface DashboardShellProps extends PropsWithChildren {
  user: AuthUser
  isContributor: boolean
}

export function DashboardShell({ user, isContributor, children }: DashboardShellProps) {
  const pathname = usePathname()
  const navItems = useMemo(() => NAV_ITEMS, [])
  const displayName = user.name || user.email || 'Account'

  return (
    <DashboardContext.Provider value={{ user, isContributor }}>
      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <div className="dashboard-brand">
            <span>Linguora Dashboard</span>
          </div>
          <nav className="dashboard-nav">
            {navItems.map(item => {
              const isActive =
                pathname === item.href ||
                (pathname?.startsWith(item.href) && item.href !== '/dashboard')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={classNames(
                    'dashboard-nav-link',
                    isActive && 'dashboard-nav-link--active',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="dashboard-account">
            <div className="dashboard-account-info">
              <span className="dashboard-account-name">{displayName}</span>
              {isContributor ? (
                <span className="dashboard-chip dashboard-chip--accent">Contributor</span>
              ) : null}
            </div>
            <AuthControls mode="dashboard" />
          </div>
        </header>
        <main className="dashboard-main">
          <div className="dashboard-content">{children}</div>
        </main>
      </div>
    </DashboardContext.Provider>
  )
}
