import { loadOverviewSnapshot } from '@/app/dashboard/data'
import { OverviewView } from '@/app/dashboard/components/OverviewView'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const snapshot = await loadOverviewSnapshot()
  return <OverviewView initialMetrics={snapshot} />
}
