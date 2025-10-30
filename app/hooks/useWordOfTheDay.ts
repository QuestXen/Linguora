'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  DEFAULT_THEME,
  deriveThemeIndices,
  msUntilNextMidnight,
  resolveTheme,
} from '@/app/lib/word-theme'
import type {
  WordEntry,
  WordOfTheDayPayload,
} from '@/app/lib/word-types'

interface ApiResponse {
  entry: WordEntry | null
  exhausted: boolean
  date: string
  message?: string | null
}

export interface UseWordOfTheDayOptions {
  initialData: WordOfTheDayPayload
}

export const useWordOfTheDay = ({ initialData }: UseWordOfTheDayOptions) => {
  const [entry, setEntry] = useState<WordEntry | null>(initialData.entry)
  const [isExhausted, setIsExhausted] = useState<boolean>(initialData.exhausted)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string | null>(initialData.message)
  const [date, setDate] = useState<string>(initialData.date)
  const [themeIndices, setThemeIndices] = useState(() =>
    initialData.entry ? deriveThemeIndices(initialData.entry.slug) : DEFAULT_THEME,
  )

  const syncInitialRef = useRef(initialData.date)

  useEffect(() => {
    if (initialData.date !== syncInitialRef.current) {
      syncInitialRef.current = initialData.date
      setEntry(initialData.entry)
      setIsExhausted(initialData.exhausted)
      setMessage(initialData.message)
      setDate(initialData.date)
      setThemeIndices(
        initialData.entry
          ? deriveThemeIndices(initialData.entry.slug)
          : DEFAULT_THEME,
      )
    }
  }, [initialData])

  const fetchWord = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/word-of-the-day', {
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`)
      }

      const payload = (await response.json()) as ApiResponse
      setEntry(payload.entry)
      setIsExhausted(Boolean(payload.exhausted || !payload.entry))
      setDate(payload.date)
      setMessage(payload.message ?? null)

      if (payload.entry) {
        setThemeIndices(deriveThemeIndices(payload.entry.slug))
      }
    } catch (error) {
      console.error('Failed to fetch word of the day:', error)
      setEntry(null)
      setIsExhausted(true)
      setMessage('We could not load the word of the day. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let dailyInterval: ReturnType<typeof setInterval> | undefined

    const midnightTimeout = setTimeout(() => {
      void fetchWord()
      dailyInterval = setInterval(fetchWord, 24 * 60 * 60 * 1000)
    }, msUntilNextMidnight())

    return () => {
      clearTimeout(midnightTimeout)
      if (dailyInterval) clearInterval(dailyInterval)
    }
  }, [fetchWord])

  const theme = useMemo(() => resolveTheme(themeIndices), [themeIndices])

  return {
    entry,
    isExhausted,
    isLoading,
    message,
    date,
    theme,
    refresh: fetchWord,
  }
}
