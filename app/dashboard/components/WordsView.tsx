'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import type { ChangeEvent } from 'react'

import type {
  WordHistoryItem,
  WordListResponse,
  WordsBootstrap,
} from '@/app/dashboard/types'

import {
  EmptyState,
  Section,
  SimpleButton,
  classNames,
} from '@/app/dashboard/components/ui'

const formatDisplayDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const formatDateOnly = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

type WordListItem = WordListResponse['items'][number]

const MIN_SUGGESTION_QUERY = 2

const useWordSuggestions = (term: string) => {
  const [suggestions, setSuggestions] = useState<WordListItem[]>([])
  const [loading, setLoading] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect -- update local loading state while fetching suggestions */
  useEffect(() => {
    const query = term.trim()
    if (query.length < MIN_SUGGESTION_QUERY) {
      controllerRef.current?.abort()
      return
    }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)

    fetch(
      `/api/dashboard/words?page=1&pageSize=8&sort=alphabetical&q=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    )
      .then(response => {
        if (!response.ok) throw new Error('Request failed')
        return response.json() as Promise<WordListResponse>
      })
      .then(data => {
        setSuggestions(data.items)
      })
      .catch(error => {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to load word suggestions', error)
        }
      })
      .finally(() => {
        if (controllerRef.current === controller) {
          setLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [term])
  /* eslint-enable react-hooks/set-state-in-effect */

  return { suggestions, loading }
}

const WordSuggestionList = ({
  visible,
  suggestions,
  onSelect,
}: {
  visible: boolean
  suggestions: WordListItem[]
  onSelect: (slug: string) => void
}) => {
  if (!visible) {
    return null
  }

  if (suggestions.length === 0) {
    return (
      <ul className="dashboard-suggestions">
        <li className="dashboard-suggestion-empty">No matches found.</li>
      </ul>
    )
  }

  return (
    <ul className="dashboard-suggestions">
      {suggestions.map(item => (
        <li key={item.slug}>
          <button
            type="button"
            className="dashboard-suggestion-item"
            onClick={() => onSelect(item.slug)}
          >
            <span className="dashboard-suggestion-slug">{item.slug}</span>
            <span className="dashboard-suggestion-label">
              {item.enWord}
              {item.deWord ? ` · ${item.deWord}` : ''}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

const toOptionalText = (value: string) => value.trim()
const toOptionalNullable = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
const fallbackText = (value?: string | null) => (value && value.trim().length > 0 ? value : '—')

interface WordFormState {
  slug: string
  enWord: string
  enIpa: string
  enDefinition: string
  enExample: string
  deWord: string
  deIpa: string
  deDefinition: string
  deExample: string
}

const emptyWordForm = (): WordFormState => ({
  slug: '',
  enWord: '',
  enIpa: '',
  enDefinition: '',
  enExample: '',
  deWord: '',
  deIpa: '',
  deDefinition: '',
  deExample: '',
})

type UpcomingEntry = WordsBootstrap['upcoming'][number]
type HistoryEntry = WordHistoryItem

interface WordFormProps {
  state: WordFormState
  onChange: (next: WordFormState) => void
  onSubmit: () => Promise<void>
  submitLabel: string
  onCancel?: () => void
  pending: boolean
  allowSlug: boolean
}

const WordForm = ({
  state,
  onChange,
  onSubmit,
  submitLabel,
  onCancel,
  pending,
  allowSlug,
}: WordFormProps) => {
  const update = (key: keyof WordFormState, value: string) => {
    onChange({ ...state, [key]: value })
  }

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      await onSubmit()
    },
    [onSubmit],
  )

  return (
    <form className="dashboard-card dashboard-card--form" onSubmit={handleSubmit}>
      <div className="dashboard-form-grid">
        {allowSlug ? (
          <label className="dashboard-field">
            <span>Slug</span>
            <input
              value={state.slug}
              onChange={event => update('slug', event.target.value)}
              required
              disabled={pending}
            />
          </label>
        ) : null}
        <label className="dashboard-field">
          <span>English Word</span>
          <input
            value={state.enWord}
            onChange={event => update('enWord', event.target.value)}
            required
            disabled={pending}
          />
        </label>
        <label className="dashboard-field">
          <span>English IPA</span>
          <input
            value={state.enIpa}
            onChange={event => update('enIpa', event.target.value)}
            disabled={pending}
          />
        </label>
        <label className="dashboard-field">
          <span>German Word</span>
          <input
            value={state.deWord}
            onChange={event => update('deWord', event.target.value)}
            disabled={pending}
          />
        </label>
        <label className="dashboard-field">
          <span>German IPA</span>
          <input
            value={state.deIpa}
            onChange={event => update('deIpa', event.target.value)}
            disabled={pending}
          />
        </label>
      </div>
      <label className="dashboard-field">
        <span>English Definition</span>
        <textarea
          value={state.enDefinition}
          onChange={event => update('enDefinition', event.target.value)}
          required
          disabled={pending}
        />
      </label>
      <label className="dashboard-field">
        <span>English Example</span>
        <textarea
          value={state.enExample}
          onChange={event => update('enExample', event.target.value)}
          disabled={pending}
        />
      </label>
      <label className="dashboard-field">
        <span>German Definition</span>
        <textarea
          value={state.deDefinition}
          onChange={event => update('deDefinition', event.target.value)}
          disabled={pending}
        />
      </label>
      <label className="dashboard-field">
        <span>German Example</span>
        <textarea
          value={state.deExample}
          onChange={event => update('deExample', event.target.value)}
          disabled={pending}
        />
      </label>
      <div className="dashboard-form-actions">
        {onCancel ? (
          <SimpleButton type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </SimpleButton>
        ) : null}
        <SimpleButton type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </SimpleButton>
      </div>
    </form>
  )
}

interface WordListProps {
  data: WordListResponse | null
  loading: boolean
  onEdit: (item: WordListItem) => void
  onDelete: (slug: string) => void
  deletingSlug: string | null
  onPageChange: (page: number) => void
}

const WordList = ({
  data,
  loading,
  onEdit,
  onDelete,
  deletingSlug,
  onPageChange,
}: WordListProps) => {
  if (loading) {
    return <div className="dashboard-card">Loading words…</div>
  }

  if (!data || data.items.length === 0) {
    return <div className="dashboard-card">No words found. Try adjusting the filters.</div>
  }

  return (
    <div className="dashboard-card dashboard-card--table">
      <table>
        <thead>
          <tr>
            <th>Slug</th>
            <th>English</th>
            <th>German</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.items.map(item => (
            <tr key={item.slug}>
              <td>
                <code>{item.slug}</code>
              </td>
              <td>
                <div className="dashboard-table-cell">
                  <span>{fallbackText(item.enWord)}</span>
                  <span className="dashboard-table-meta">{fallbackText(item.enDefinition)}</span>
                </div>
              </td>
              <td>
                <div className="dashboard-table-cell">
                  <span>{fallbackText(item.deWord)}</span>
                  <span className="dashboard-table-meta">{fallbackText(item.deDefinition)}</span>
                </div>
              </td>
              <td>{formatDateOnly(item.updatedAt)}</td>
              <td>
                <div className="dashboard-table-actions">
                  <SimpleButton variant="ghost" onClick={() => onEdit(item)}>
                    Edit
                  </SimpleButton>
                  <SimpleButton
                    variant="danger"
                    onClick={() => onDelete(item.slug)}
                    disabled={deletingSlug === item.slug}
                  >
                    {deletingSlug === item.slug ? 'Deleting…' : 'Delete'}
                  </SimpleButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dashboard-table-footer">
        <span>
          Page {data.page} of {data.totalPages}
        </span>
        <div className="dashboard-table-pagination">
          <SimpleButton
            variant="ghost"
            onClick={() => onPageChange(Math.max(1, data.page - 1))}
            disabled={data.page === 1}
          >
            Previous
          </SimpleButton>
          <SimpleButton
            variant="ghost"
            onClick={() => onPageChange(Math.min(data.totalPages, data.page + 1))}
            disabled={data.page === data.totalPages}
          >
            Next
          </SimpleButton>
        </div>
      </div>
    </div>
  )
}

interface ScheduleOverrideModalProps {
  dayKey: string
  displayDate: string
  onClose: () => void
  onSubmit: (slug: string) => Promise<void>
  pending: boolean
}

const ScheduleOverrideModal = ({
  dayKey,
  displayDate,
  onClose,
  onSubmit,
  pending,
}: ScheduleOverrideModalProps) => {
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { suggestions, loading } = useWordSuggestions(slug)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const selectSuggestion = useCallback((value: string) => {
    setSlug(value)
    setError(null)
    setShowSuggestions(false)
  }, [])

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSlug(value)
    setError(null)
    setShowSuggestions(value.trim().length >= MIN_SUGGESTION_QUERY)
  }, [])

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!slug.trim()) {
        setError('Please provide a slug to schedule.')
        return
      }
      setError(null)
      try {
        setShowSuggestions(false)
        await onSubmit(slug.trim())
        setShowSuggestions(false)
      } catch (err) {
        console.error(err)
        setError('Failed to update scheduled word. Please try again.')
      }
    },
    [onSubmit, slug],
  )

  return (
    <div className="dashboard-modal">
      <div className="dashboard-modal-panel">
        <div className="dashboard-modal-header">
          <h3>Override Scheduled Word</h3>
          <button type="button" className="dashboard-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="dashboard-modal-subtitle">
          Select a word to serve on <strong>{displayDate}</strong> ({dayKey})
        </p>
        <form className="dashboard-modal-body" onSubmit={handleSubmit}>
          <label className="dashboard-field dashboard-suggestion-wrap">
            <span>Word slug</span>
            <input
              value={slug}
              onChange={handleInputChange}
              placeholder="Start typing to search…"
              disabled={pending}
              autoFocus
            />
            <WordSuggestionList
              visible={
                !pending &&
                showSuggestions &&
                slug.trim().length >= MIN_SUGGESTION_QUERY &&
                !loading
              }
              suggestions={suggestions}
              onSelect={selectSuggestion}
            />
            {loading ? <p className="dashboard-suggestion-hint">Searching…</p> : null}
          </label>
          {error ? <p className="dashboard-error">{error}</p> : null}
          <div className="dashboard-form-actions">
            <SimpleButton type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </SimpleButton>
            <SimpleButton type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Apply'}
            </SimpleButton>
          </div>
        </form>
      </div>
    </div>
  )
}

interface UpcomingScheduleListProps {
  items: UpcomingEntry[]
  onOverrideRequest: (entry: UpcomingEntry) => void
  onRandomize: (dayKey: string) => void
  onResetRequest: (dayKey: string) => void
  pendingDay: string | null
}

const UpcomingScheduleList = ({
  items,
  onOverrideRequest,
  onRandomize,
  onResetRequest,
  pendingDay,
}: UpcomingScheduleListProps) => {
  if (items.length === 0) {
    return <EmptyState message="No upcoming schedule available." />
  }

  return (
    <div className="dashboard-upcoming">
      {items.map(entry => (
        <div key={entry.dayKey} className="dashboard-card dashboard-card--schedule">
          <div className="dashboard-card-row">
            <div>
              <p className="dashboard-card-label">{formatDisplayDate(entry.dateISO)}</p>
              <h3 className="dashboard-card-value">
                {entry.word ? entry.word.enWord : 'Not assigned'}
              </h3>
              <p className="dashboard-card-meta">
                {entry.word ? fallbackText(entry.word.deWord) : 'Assign a word to fill this slot.'}
              </p>
            </div>
            <div className="dashboard-card-actions">
              {entry.word ? (
                <span className={classNames('dashboard-chip', entry.isManual && 'dashboard-chip--manual')}>
                  {entry.isManual ? 'Manual' : 'Auto'}
                </span>
              ) : null}
              <SimpleButton
                variant="ghost"
                onClick={() => onOverrideRequest(entry)}
                disabled={pendingDay === entry.dayKey}
              >
                Override
              </SimpleButton>
              <SimpleButton
                variant="ghost"
                onClick={() => onRandomize(entry.dayKey)}
                disabled={pendingDay === entry.dayKey}
              >
                Randomize
              </SimpleButton>
              {entry.isManual ? (
                <SimpleButton
                  variant="ghost"
                  onClick={() => onResetRequest(entry.dayKey)}
                  disabled={pendingDay === entry.dayKey}
                >
                  Reset
                </SimpleButton>
              ) : null}
            </div>
          </div>
          {entry.word ? (
            <p className="dashboard-card-hint">
              slug: <code>{entry.word.slug}</code>
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

interface HistoryTableProps {
  entries: HistoryEntry[]
  onReturn: (slug: string) => void
  busySlug: string | null
}

const HistoryTable = ({ entries, onReturn, busySlug }: HistoryTableProps) => {
  if (entries.length === 0) {
    return <EmptyState message="No words have been served yet." />
  }

  return (
    <div className="dashboard-card dashboard-card--table">
      <table>
        <thead>
          <tr>
            <th>Slug</th>
            <th>Word</th>
            <th>Times Shown</th>
            <th>Last Shown</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id}>
              <td>
                <code>{entry.slug}</code>
              </td>
              <td>
                <div className="dashboard-table-cell">
                  <span>{fallbackText(entry.enWord)}</span>
                  <span className="dashboard-table-meta">{fallbackText(entry.deWord)}</span>
                </div>
              </td>
              <td>{entry.timesShown}</td>
              <td>{formatDateOnly(entry.lastShownOn)}</td>
              <td>
                <div className="dashboard-table-actions">
                  <SimpleButton
                    variant="ghost"
                    onClick={() => onReturn(entry.slug)}
                    disabled={busySlug === entry.slug}
                  >
                    {busySlug === entry.slug ? 'Returning…' : 'Return to Pool'}
                  </SimpleButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WordsView({ initialData }: { initialData: WordsBootstrap }) {
  const [bootstrap, setBootstrap] = useState(initialData)
  const [isRefreshing, startRefreshing] = useTransition()

  const [wordResponse, setWordResponse] = useState<WordListResponse | null>(null)
  const [wordLoading, setWordLoading] = useState(false)
  const [wordPage, setWordPage] = useState(1)
  const [wordQuery, setWordQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [wordForm, setWordForm] = useState<WordFormState>(emptyWordForm())
  const [showWordForm, setShowWordForm] = useState(false)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [savingWord, setSavingWord] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)

  const [historyBusySlug, setHistoryBusySlug] = useState<string | null>(null)
  const [scheduleModal, setScheduleModal] = useState<UpcomingEntry | null>(null)
  const [schedulePendingDay, setSchedulePendingDay] = useState<string | null>(null)
  const [todaySlug, setTodaySlug] = useState('')
  const [todayFeedback, setTodayFeedback] = useState<{ message: string; error: boolean } | null>(null)
  const [todayPending, setTodayPending] = useState(false)
  const [todaySuggestionsOpen, setTodaySuggestionsOpen] = useState(false)
  const { suggestions: todaySuggestions, loading: todayLoading } = useWordSuggestions(todaySlug)
  const [importBusy, setImportBusy] = useState(false)
  const [importFeedback, setImportFeedback] = useState<{ message: string; error: boolean } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setWordQuery(searchInput.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setWordPage(1)
  }, [wordQuery])

  const loadWords = useCallback(async (page: number, query: string) => {
    setWordLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      })
      if (query) params.set('q', query)
      const response = await fetch(`/api/dashboard/words?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error('Request failed')
      }
      const payload = (await response.json()) as WordListResponse
      setWordResponse(payload)
    } catch (error) {
      console.error('Failed to load word library', error)
    } finally {
      setWordLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWords(wordPage, wordQuery)
  }, [loadWords, wordPage, wordQuery])

  const refreshBootstrap = useCallback(async () => {
    startRefreshing(async () => {
      try {
        const response = await fetch('/api/dashboard/words/bootstrap', {
          method: 'GET',
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('Request failed')
        const payload = (await response.json()) as WordsBootstrap
        setBootstrap(payload)
      } catch (error) {
        console.error('Failed to refresh word data', error)
      }
    })
  }, [])

  const handleCreate = useCallback(() => {
    setEditingSlug(null)
    setWordForm(emptyWordForm())
    setShowWordForm(true)
  }, [])

  const handleEdit = useCallback((item: WordListItem) => {
    setEditingSlug(item.slug)
    setWordForm({
      slug: item.slug,
      enWord: item.enWord,
      enIpa: item.enIpa ?? '',
      enDefinition: item.enDefinition,
      enExample: item.enExample ?? '',
      deWord: item.deWord ?? '',
      deIpa: item.deIpa ?? '',
      deDefinition: item.deDefinition ?? '',
      deExample: item.deExample ?? '',
    })
    setShowWordForm(true)
  }, [])

  const wordFormValid = useMemo(() => {
    const requiredFields: Array<keyof WordFormState> = ['enWord', 'enDefinition']
    const baseValid = requiredFields.every(field => wordForm[field].trim().length > 0)
    if (!showWordForm) return true
    if (!baseValid) return false
    return editingSlug ? true : wordForm.slug.trim().length > 0
  }, [editingSlug, showWordForm, wordForm])

  const handleSubmitWord = useCallback(async () => {
    if (!wordFormValid) return
    setSavingWord(true)
    try {
      const normalized = {
        slug: wordForm.slug.trim(),
        enWord: wordForm.enWord.trim(),
        enIpa: toOptionalNullable(wordForm.enIpa),
        enDefinition: wordForm.enDefinition.trim(),
        enExample: toOptionalText(wordForm.enExample),
        deWord: toOptionalText(wordForm.deWord),
        deIpa: toOptionalNullable(wordForm.deIpa),
        deDefinition: toOptionalText(wordForm.deDefinition),
        deExample: toOptionalText(wordForm.deExample),
      }
      if (editingSlug) {
        const { slug: _omitted, ...payload } = normalized
        void _omitted
        const response = await fetch(`/api/dashboard/words/${encodeURIComponent(editingSlug)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error('Request failed')
      } else {
        const response = await fetch('/api/dashboard/words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalized),
        })
        if (!response.ok) throw new Error('Request failed')
      }
      setShowWordForm(false)
      setWordForm(emptyWordForm())
      await Promise.all([loadWords(1, wordQuery), refreshBootstrap()])
      setWordPage(1)
    } catch (error) {
      console.error('Failed to save word', error)
    } finally {
      setSavingWord(false)
    }
  }, [editingSlug, loadWords, refreshBootstrap, wordForm, wordFormValid, wordQuery])

  const handleDeleteWord = useCallback(
    async (slug: string) => {
      setDeletingSlug(slug)
      try {
        const response = await fetch(`/api/dashboard/words/${encodeURIComponent(slug)}`, {
          method: 'DELETE',
        })
        if (!response.ok) throw new Error('Request failed')
        await Promise.all([loadWords(Math.max(1, wordPage), wordQuery), refreshBootstrap()])
      } catch (error) {
        console.error('Failed to delete word', error)
      } finally {
        setDeletingSlug(null)
      }
    },
    [loadWords, refreshBootstrap, wordPage, wordQuery],
  )

  const handleReturnToPool = useCallback(
    async (slug: string) => {
      setHistoryBusySlug(slug)
      try {
        const response = await fetch(
          `/api/dashboard/word-rotation/history?slug=${encodeURIComponent(slug)}`,
          { method: 'DELETE' },
        )
        if (!response.ok) throw new Error('Request failed')
        await refreshBootstrap()
      } catch (error) {
        console.error('Failed to return word to pool', error)
      } finally {
        setHistoryBusySlug(null)
      }
    },
    [refreshBootstrap],
  )

  const handleOverrideSubmit = useCallback(
    async (slug: string) => {
      if (!scheduleModal) return
      setSchedulePendingDay(scheduleModal.dayKey)
      try {
        const response = await fetch(
          `/api/dashboard/word-rotation/schedule/${encodeURIComponent(scheduleModal.dayKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug }),
          },
        )
        if (!response.ok) {
          throw new Error('Request failed')
        }
        const payload = (await response.json()) as WordsBootstrap
        setBootstrap(payload)
        setScheduleModal(null)
      } catch (error) {
        console.error('Failed to update scheduled word', error)
        throw error
      } finally {
        setSchedulePendingDay(null)
      }
    },
    [scheduleModal],
  )

  const handleRandomizeSchedule = useCallback(
    async (dayKey: string) => {
      setSchedulePendingDay(dayKey)
      try {
        const response = await fetch(
          `/api/dashboard/word-rotation/schedule/${encodeURIComponent(dayKey)}`,
          { method: 'PATCH' },
        )
        if (response.status === 409) {
          console.warn('No available words to assign for', dayKey)
          return
        }
        if (!response.ok) {
          throw new Error('Request failed')
        }
        const payload = (await response.json()) as WordsBootstrap
        setBootstrap(payload)
        if (scheduleModal?.dayKey === dayKey) {
          setScheduleModal(null)
        }
      } catch (error) {
        console.error('Failed to randomize scheduled word', error)
      } finally {
        setSchedulePendingDay(null)
      }
    },
    [scheduleModal],
  )

  const handleResetSchedule = useCallback(
    async (dayKey: string) => {
      setSchedulePendingDay(dayKey)
      try {
        const response = await fetch(
          `/api/dashboard/word-rotation/schedule/${encodeURIComponent(dayKey)}`,
          { method: 'DELETE' },
        )
        if (!response.ok) {
          throw new Error('Request failed')
        }
        const payload = (await response.json()) as WordsBootstrap
        setBootstrap(payload)
        if (scheduleModal?.dayKey === dayKey) {
          setScheduleModal(null)
        }
      } catch (error) {
        console.error('Failed to reset scheduled word', error)
      } finally {
        setSchedulePendingDay(null)
      }
    },
    [scheduleModal],
  )

  const handleTodaySelection = useCallback((value: string) => {
    setTodaySlug(value)
    setTodayFeedback(null)
    setTodaySuggestionsOpen(false)
  }, [])

  const handleTodayInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setTodaySlug(value)
    setTodayFeedback(null)
    setTodaySuggestionsOpen(value.trim().length >= MIN_SUGGESTION_QUERY)
  }, [])

  const applyTodayWord = useCallback(async () => {
    const trimmed = todaySlug.trim()
    if (trimmed.length === 0) {
      setTodayFeedback({ message: 'Please choose a word first.', error: true })
      return
    }

    setTodayPending(true)
    setTodayFeedback(null)
    try {
      setTodaySuggestionsOpen(false)
      const response = await fetch('/api/dashboard/word-rotation/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: trimmed }),
      })
      if (!response.ok) throw new Error('Request failed')
      const payload = (await response.json()) as WordsBootstrap
      setBootstrap(payload)
      setTodaySlug('')
      setTodayFeedback({ message: "Today's word updated.", error: false })
      setTodaySuggestionsOpen(false)
    } catch (error) {
      console.error('Failed to update today word', error)
      setTodayFeedback({ message: "Failed to update today's word.", error: true })
    } finally {
      setTodayPending(false)
    }
  }, [todaySlug])

  const clearTodaySelection = useCallback(() => {
    setTodaySlug('')
    setTodayFeedback(null)
    setTodaySuggestionsOpen(false)
  }, [])

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setImportBusy(true)
      setImportFeedback(null)
      try {
        const text = await file.text()
        const payload = JSON.parse(text)
        const response = await fetch('/api/dashboard/words/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error('Request failed')
        const result = (await response.json()) as {
          imported: number
          created: number
          updated: number
        }
        setImportFeedback({
          message: `Imported ${result.imported} entries (${result.created} new, ${result.updated} updated).`,
          error: false,
        })
        await Promise.all([loadWords(1, wordQuery), refreshBootstrap()])
        setWordPage(1)
      } catch (error) {
        console.error('Failed to import words', error)
        setImportFeedback({
          message: 'Failed to import words. Please verify the JSON structure and try again.',
          error: true,
        })
      } finally {
        setImportBusy(false)
        event.target.value = ''
      }
    },
    [loadWords, refreshBootstrap, wordQuery],
  )

  const todayWord = bootstrap.today.word
  const todayDisplayDeWord = todayWord ? fallbackText(todayWord.deWord) : ''
  const todayHasEnDefinition = !!(todayWord && todayWord.enDefinition.trim().length > 0)
  const todayHasEnExample = !!(todayWord && todayWord.enExample.trim().length > 0)
  const todayHasDeDefinition = !!(todayWord && todayWord.deDefinition.trim().length > 0)
  const todayHasDeExample = !!(todayWord && todayWord.deExample.trim().length > 0)

  return (
    <div className="dashboard-stack">
      <Section
        title="Today's Word"
        description="The word currently presented to Linguora visitors."
        actions={
          <SimpleButton onClick={refreshBootstrap} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </SimpleButton>
        }
      >
        <div className="dashboard-card dashboard-card--hero">
          <div>
            <p className="dashboard-card-label">{formatDisplayDate(bootstrap.today.dateISO)}</p>
            <h2 className="dashboard-hero-title">
              {todayWord ? todayWord.enWord : 'No word scheduled for today'}
            </h2>
            {todayWord ? (
              <p className="dashboard-card-meta">
                {todayDisplayDeWord}
                {todayWord.slug ? (
                  <>
                    {' '}
                    · <code>{todayWord.slug}</code>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          {todayWord ? (
            <div className="dashboard-hero-body">
              {todayHasEnDefinition || todayHasEnExample ? (
                <div>
                  {todayHasEnDefinition ? (
                    <>
                      <h3>English Definition</h3>
                      <p>{todayWord.enDefinition}</p>
                    </>
                  ) : null}
                  {todayHasEnExample ? (
                    <>
                      <h3>Example</h3>
                      <p>{todayWord.enExample}</p>
                    </>
                  ) : null}
                </div>
              ) : null}
              {todayHasDeDefinition || todayHasDeExample ? (
                <div>
                  {todayHasDeDefinition ? (
                    <>
                      <h3>German Definition</h3>
                      <p>{todayWord.deDefinition}</p>
                    </>
                  ) : null}
                  {todayHasDeExample ? (
                    <>
                      <h3>Beispiel</h3>
                      <p>{todayWord.deExample}</p>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="dashboard-card-hint">
              Assign a word using the upcoming schedule to ensure the rotation continues.
            </p>
          )}
        </div>
        <div className="dashboard-card dashboard-card--form">
          <label className="dashboard-field dashboard-suggestion-wrap">
            <span>Switch today’s word</span>
            <input
              value={todaySlug}
              onChange={handleTodayInputChange}
              placeholder="Start typing to search…"
              disabled={todayPending}
            />
            <WordSuggestionList
              visible={
                !todayPending &&
                todaySuggestionsOpen &&
                todaySlug.trim().length >= MIN_SUGGESTION_QUERY &&
                !todayLoading
              }
              suggestions={todaySuggestions}
              onSelect={handleTodaySelection}
            />
            {todayLoading ? <p className="dashboard-suggestion-hint">Searching…</p> : null}
          </label>
          {todayFeedback ? (
            <p
              className={classNames(
                'dashboard-feedback',
                todayFeedback.error && 'dashboard-feedback--error',
              )}
            >
              {todayFeedback.message}
            </p>
          ) : null}
          <div className="dashboard-form-actions">
            <SimpleButton
              type="button"
              variant="ghost"
              onClick={clearTodaySelection}
              disabled={todayPending || todaySlug.trim().length === 0}
            >
              Clear
            </SimpleButton>
            <SimpleButton type="button" onClick={applyTodayWord} disabled={todayPending}>
              {todayPending ? 'Updating…' : 'Apply'}
            </SimpleButton>
          </div>
        </div>
      </Section>

      <Section
        title="Upcoming Schedule"
        description="Seven-day outlook generated from the word pool."
        actions={<span className="dashboard-chip">Pool Remaining: {bootstrap.poolSize}</span>}
      >
        {bootstrap.exhausted ? (
          <div className="dashboard-card dashboard-card--notice">
            <p>The pool is empty. Add new words or return served words to keep the rotation alive.</p>
          </div>
        ) : null}
        <UpcomingScheduleList
          items={bootstrap.upcoming}
          onOverrideRequest={entry => setScheduleModal(entry)}
          onRandomize={handleRandomizeSchedule}
          onResetRequest={handleResetSchedule}
          pendingDay={schedulePendingDay}
        />
      </Section>

      <Section
        title="Word Library"
        description="Browse, create, and update available words."
        actions={<SimpleButton onClick={handleCreate}>Add Word</SimpleButton>}
      >
        {showWordForm ? (
          <WordForm
            state={wordForm}
            onChange={setWordForm}
            onSubmit={handleSubmitWord}
            submitLabel={editingSlug ? 'Update word' : 'Create word'}
            onCancel={() => {
              setShowWordForm(false)
              setWordForm(emptyWordForm())
              setEditingSlug(null)
            }}
            pending={savingWord}
            allowSlug={!editingSlug}
          />
        ) : null}

        <div className="dashboard-import">
          <label className="dashboard-field">
            <span>Import words (JSON)</span>
            <input
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              disabled={importBusy}
            />
          </label>
          {importFeedback ? (
            <p
              className={classNames(
                'dashboard-feedback',
                importFeedback.error && 'dashboard-feedback--error',
              )}
            >
              {importFeedback.message}
            </p>
          ) : importBusy ? (
            <p className="dashboard-import-hint">Importing…</p>
          ) : (
            <p className="dashboard-import-hint">
              Upload a JSON file containing an array of word entries in the documented format.
            </p>
          )}
        </div>

        <div className="dashboard-toolbar">
          <input
            type="search"
            placeholder="Search words…"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
          />
        </div>

        <WordList
          data={wordResponse}
          loading={wordLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteWord}
          deletingSlug={deletingSlug}
          onPageChange={setWordPage}
        />
      </Section>

      <Section
        title="Served Words History"
        description="Words that have already been shown to users."
      >
        <HistoryTable
          entries={bootstrap.history}
          onReturn={handleReturnToPool}
          busySlug={historyBusySlug}
        />
      </Section>

      {scheduleModal ? (
        <ScheduleOverrideModal
          dayKey={scheduleModal.dayKey}
          displayDate={formatDisplayDate(scheduleModal.dateISO)}
          onClose={() => setScheduleModal(null)}
          onSubmit={handleOverrideSubmit}
          pending={schedulePendingDay === scheduleModal.dayKey}
        />
      ) : null}
    </div>
  )
}
