'use client'

import { useCallback, useTransition, useState } from 'react'

import type { OverviewSnapshot } from '@/app/dashboard/types'

import { Section, SimpleButton, StatCard } from '@/app/dashboard/components/ui'

interface OverviewViewProps {
  initialMetrics: OverviewSnapshot
}

export function OverviewView({ initialMetrics }: OverviewViewProps) {
  const [metrics, setMetrics] = useState(initialMetrics)
  const [isRefreshing, startRefresh] = useTransition()

  const handleRefresh = useCallback(() => {
    startRefresh(async () => {
      try {
        const response = await fetch('/api/dashboard/overview', {
          method: 'GET',
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('Request failed')
        }
        const payload = (await response.json()) as OverviewSnapshot
        setMetrics(payload)
      } catch (error) {
        console.error('Failed to refresh overview snapshot', error)
      }
    })
  }, [])

  return (
    <div className="dashboard-stack">
      <Section
        title="Overview"
        description="Daily health snapshot for Linguora."
        actions={
          <SimpleButton onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </SimpleButton>
        }
      >
        <div className="dashboard-grid">
          <StatCard label="Words in Pool" value={metrics.wordsInPool} />
          <StatCard label="Used Words" value={metrics.usedWords} hint="Unique words served so far." />
          <StatCard label="Registered Users" value={metrics.registeredUsers} />
          <StatCard
            label="Active Users"
            value={metrics.activeUsers}
            hint="Logins in the last 7 days."
          />
        </div>
      </Section>
    </div>
  )
}
