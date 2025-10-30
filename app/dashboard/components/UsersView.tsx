'use client'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import type { DashboardUserListItem } from '@/app/dashboard/types'

import {
  Section,
  SimpleButton,
  classNames,
} from '@/app/dashboard/components/ui'
import { useDashboardContext } from '@/app/dashboard/components/DashboardShell'

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const toIsoString = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return null
}

interface UserListResponse {
  items: DashboardUserListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface UserModalProps {
  record: DashboardUserListItem
  onClose: () => void
  onToggleBan: (record: DashboardUserListItem, desired: boolean) => Promise<void>
  onToggleDashboard: (record: DashboardUserListItem, desired: boolean) => Promise<void>
  onRoleChange: (record: DashboardUserListItem, role: 'user' | 'admin') => Promise<void>
  onDelete: (record: DashboardUserListItem) => Promise<void>
  submitting: boolean
  currentUserId: string
}

const UserModal = ({
  record,
  onClose,
  onToggleBan,
  onToggleDashboard,
  onRoleChange,
  onDelete,
  submitting,
  currentUserId,
}: UserModalProps) => {
  const isSelf = record.user.id === currentUserId
  const providers =
    record.providers.length > 0 ? record.providers.join(', ') : 'Email / Password'

  return (
    <div className="dashboard-modal">
      <div className="dashboard-modal-panel">
        <div className="dashboard-modal-header">
          <h3>Manage User</h3>
          <button type="button" className="dashboard-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="dashboard-modal-body">
          <div className="dashboard-user-summary">
            <h4>{record.user.name}</h4>
            <p>{record.user.email}</p>
            <p className="dashboard-table-meta">Providers: {providers}</p>
            <p className="dashboard-table-meta">
              Last seen: {formatDateTime(toIsoString(record.user.lastSeenAt))}
            </p>
            <p className="dashboard-table-meta">
              Status:{' '}
              <span className={classNames('dashboard-chip', record.user.isBanned && 'dashboard-chip--danger')}>
                {record.user.isBanned ? 'Banned' : 'Active'}
              </span>
            </p>
            <p className="dashboard-table-meta">
              Dashboard access:{' '}
              <span className={classNames('dashboard-chip', record.user.hasDashboardAccess && 'dashboard-chip--accent')}>
                {record.user.hasDashboardAccess ? 'Granted' : 'Restricted'}
              </span>
            </p>
          </div>

          <div className="dashboard-modal-section">
            <label className="dashboard-field">
              <span>Role</span>
              <select
                value={record.user.role}
                onChange={event =>
                  onRoleChange(record, event.target.value as 'user' | 'admin')
                }
                disabled={submitting || isSelf}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>

          <div className="dashboard-modal-actions">
            <SimpleButton
              variant="ghost"
              onClick={() => onToggleDashboard(record, !record.user.hasDashboardAccess)}
              disabled={submitting}
            >
              {record.user.hasDashboardAccess ? 'Revoke Dashboard Access' : 'Grant Dashboard Access'}
            </SimpleButton>
            <SimpleButton
              variant="danger"
              onClick={() => onToggleBan(record, !record.user.isBanned)}
              disabled={submitting || (isSelf && !record.user.isBanned)}
            >
              {record.user.isBanned ? 'Unban User' : 'Ban User'}
            </SimpleButton>
            <SimpleButton
              variant="danger"
              onClick={() => onDelete(record)}
              disabled={submitting || isSelf}
            >
              Delete User
            </SimpleButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UsersView() {
  const { user: currentUser } = useDashboardContext()

  const [response, setResponse] = useState<UserListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<DashboardUserListItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim())
      setPage(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadUsers = useCallback(
    async (nextPage: number, search: string): Promise<UserListResponse | null> => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: '20',
        })
        if (search) params.set('q', search)
        const response = await fetch(`/api/dashboard/users?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('Request failed')
        }
        const payload = (await response.json()) as UserListResponse
        setResponse(payload)
        return payload
      } catch (error) {
        console.error('Failed to load users', error)
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void loadUsers(page, query)
  }, [loadUsers, page, query])

  const refreshUsers = useCallback(async () => {
    const payload = await loadUsers(page, query)
    if (payload) {
      setSelectedRecord(prev => {
        if (!prev) return null
        const updated = payload.items.find(item => item.user.id === prev.user.id)
        return updated ?? null
      })
    }
  }, [loadUsers, page, query])

  const runUserMutation = useCallback(
    async (
      record: DashboardUserListItem,
      payload: Record<string, unknown>,
      method: 'PATCH' | 'DELETE' = 'PATCH',
    ) => {
      setSubmitting(true)
      try {
        const endpoint = `/api/dashboard/users/${record.user.id}`
        const response =
          method === 'DELETE'
            ? await fetch(endpoint, { method })
            : await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })

        if (!response.ok) {
          throw new Error('Request failed')
        }

        if (method === 'PATCH') {
          const body = (await response.json()) as { user: DashboardUserListItem['user'] }
          setSelectedRecord(prev =>
            prev && prev.user.id === record.user.id
              ? { ...prev, user: body.user }
              : prev,
          )
        } else {
          setSelectedRecord(null)
        }

        await refreshUsers()
      } catch (error) {
        console.error('Failed to update user', error)
      } finally {
        setSubmitting(false)
      }
    },
    [refreshUsers],
  )

  const handleToggleBan = useCallback(
    async (record: DashboardUserListItem, desired: boolean) => {
      if (desired) {
        const reason = typeof window !== 'undefined' ? window.prompt('Ban reason (optional)') ?? null : null
        await runUserMutation(record, { isBanned: true, banReason: reason })
      } else {
        await runUserMutation(record, { isBanned: false })
      }
    },
    [runUserMutation],
  )

  const handleToggleDashboard = useCallback(
    async (record: DashboardUserListItem, desired: boolean) => {
      await runUserMutation(record, { hasDashboardAccess: desired })
    },
    [runUserMutation],
  )

  const handleRoleChange = useCallback(
    async (record: DashboardUserListItem, role: 'user' | 'admin') => {
      if (record.user.role === role) return
      await runUserMutation(record, { role })
    },
    [runUserMutation],
  )

  const handleDelete = useCallback(
    async (record: DashboardUserListItem) => {
      if (typeof window !== 'undefined') {
        if (!window.confirm(`Delete ${record.user.email}? This cannot be undone.`)) {
          return
        }
      }
      await runUserMutation(record, {}, 'DELETE')
    },
    [runUserMutation],
  )

  const renderTable = () => {
    if (loading && !response) {
      return <div className="dashboard-card">Loading users…</div>
    }

    if (!response || response.items.length === 0) {
      return <div className="dashboard-card">No users found for the current filters.</div>
    }

    return (
      <div className="dashboard-card dashboard-card--table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Providers</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {response.items.map(record => (
              <tr key={record.user.id}>
                <td>{record.user.name}</td>
                <td>{record.user.email}</td>
                <td>{record.providers.length ? record.providers.join(', ') : 'Email'}</td>
                <td>{record.user.role}</td>
                <td>
                  <span
                    className={classNames(
                      'dashboard-chip',
                      record.user.isBanned ? 'dashboard-chip--danger' : 'dashboard-chip--accent',
                    )}
                  >
                    {record.user.isBanned ? 'Banned' : 'Active'}
                  </span>
                </td>
                <td>
                  <div className="dashboard-table-actions">
                    <SimpleButton variant="ghost" onClick={() => setSelectedRecord(record)}>
                      Manage
                    </SimpleButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="dashboard-table-footer">
          <span>
            Page {response.page} of {response.totalPages}
          </span>
          <div className="dashboard-table-pagination">
            <SimpleButton
              variant="ghost"
              onClick={() => setPage(Math.max(1, response.page - 1))}
              disabled={response.page === 1 || loading}
            >
              Previous
            </SimpleButton>
            <SimpleButton
              variant="ghost"
              onClick={() => setPage(Math.min(response.totalPages, response.page + 1))}
              disabled={response.page === response.totalPages || loading}
            >
              Next
            </SimpleButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-stack">
      <Section
        title="Users"
        description="Audit accounts, manage dashboard access and review roles."
      >
        <div className="dashboard-toolbar">
          <input
            type="search"
            placeholder="Search users…"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
          />
        </div>
        {renderTable()}
      </Section>

      {selectedRecord ? (
        <UserModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onToggleBan={handleToggleBan}
          onToggleDashboard={handleToggleDashboard}
          onRoleChange={handleRoleChange}
          onDelete={handleDelete}
          submitting={submitting}
          currentUserId={currentUser.id}
        />
      ) : null}
    </div>
  )
}
