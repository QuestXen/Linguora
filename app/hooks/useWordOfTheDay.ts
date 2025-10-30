'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEYS = {
  lang: 'linguora_lang',
} as const

const UILABEL = {
  en: {
    title: 'Word of the Day',
    footer: 'Learn a new word every day!',
    empty:
      'All available words have been delivered. Check back once new words are added.',
  },
  de: {
    title: 'Wort des Tages',
    footer: 'Lerne jeden Tag ein neues Wort!',
    empty:
      'Alle verfügbaren Wörter wurden bereits angezeigt. Schau vorbei, sobald neue Wörter hinzugefügt wurden.',
  },
}

const gradients = [
  ['#1B9D89', '#5DE5A5'],
  ['#4e54c8', '#8f94fb'],
  ['#ff7e5f', '#feb47b'],
  ['#00c6ff', '#0072ff'],
  ['#F5515F', '#A1051D'],
  ['#7F00FF', '#E100FF'],
  ['#11998e', '#38ef7d'],
  ['#f7971e', '#ffd200'],
  ['#06beb6', '#48b1bf'],
  ['#00F5A0', '#00D9F5'],
  ['#F53844', '#42378F'],
  ['#FAD961', '#F76B1C'],
  ['#30cfd0', '#330867'],
  ['#834d9b', '#d04ed6'],
  ['#B24592', '#F15F79'],
  ['#3EECAC', '#EE74E1'],
] as const

const patterns = [
  { css: 'none', size: 'auto' },
  {
    css: 'radial-gradient(rgba(255,255,255,.10) 1px, transparent 1px)',
    size: '12px 12px',
  },
  {
    css: 'repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 2px, transparent 2px 10px)',
    size: 'auto',
  },
  {
    css: 'repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px),repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px)',
    size: 'auto,auto',
  },
  {
    css: 'repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,.08) 0 2px, transparent 2px 10px)',
    size: 'auto',
  },
  {
    css: 'linear-gradient(135deg, rgba(255,255,255,.06) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.06) 50%, rgba(255,255,255,.06) 75%, transparent 75%, transparent)',
    size: '16px 16px',
  },
] as const

const shapes = [
  { css: 'none', rot: '0deg' },
  {
    css: 'radial-gradient(100% 80% at 10% 0%, rgba(255,255,255,.20), transparent 60%)',
    rot: '0deg',
  },
  {
    css: 'radial-gradient(80% 100% at 100% 20%, rgba(255,255,255,.18), transparent 60%)',
    rot: '0deg',
  },
  {
    css: 'conic-gradient(from 0deg at 80% 10%, rgba(255,255,255,.20), transparent 120deg)',
    rot: '0deg',
  },
  {
    css: 'radial-gradient(60% 60% at 20% 80%, rgba(255,255,255,.16), transparent 60%)',
    rot: '0deg',
  },
] as const

type Language = 'en' | 'de'

interface WordEntry {
  slug: string
  en: { word: string; ipa: string; def: string; ex: string }
  de: { word: string; ipa: string; def: string; ex: string }
}

interface Theme {
  g: number
  p: number
  s: number
}

interface WordResponse {
  entry: WordEntry | null
  fonts: Array<{ family: string; url?: string }>
  exhausted: boolean
  date: string
  message?: string
}

const msUntilNextMidnight = () => {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - now.getTime()
}

const hashSlug = (slug: string) => {
  let hash = 0
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash << 5) - hash + slug.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function useWordOfTheDay() {
  const [lang, setLang] = useState<Language>('en')
  const [currentEntry, setCurrentEntry] = useState<WordEntry | null>(null)
  const [isExhausted, setIsExhausted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>({ g: 0, p: 0, s: 0 })

  const applyTheme = useCallback((t: Theme) => {
    const [c1, c2] = gradients[t.g]
    const pat = patterns[t.p]
    const shp = shapes[t.s]

    document.documentElement.style.setProperty('--c1', c1)
    document.documentElement.style.setProperty('--c2', c2)
    document.documentElement.style.setProperty('--pattern', pat.css)
    document.documentElement.style.setProperty('--pattern-size', pat.size)
    document.documentElement.style.setProperty('--shape', shp.css)
    document.documentElement.style.setProperty('--shape-rot', shp.rot)
  }, [])

  const themeFromSlug = useCallback(
    (slug: string): Theme => {
      const hash = hashSlug(slug)
      return {
        g: hash % gradients.length,
        p: Math.floor(hash / gradients.length) % patterns.length,
        s:
          Math.floor(hash / (gradients.length * patterns.length)) %
          shapes.length,
      }
    },
    [],
  )

  const fetchWord = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/word-of-the-day', {
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`)
      }

      const payload = (await response.json()) as WordResponse
      setCurrentEntry(payload.entry)
      setIsExhausted(Boolean(payload.exhausted || !payload.entry))
      setMessage(payload.message ?? null)

      if (payload.entry) {
        const derivedTheme = themeFromSlug(payload.entry.slug)
        setTheme(derivedTheme)
        applyTheme(derivedTheme)
      }
    } catch (error) {
      console.error('Failed to fetch word of the day:', error)
      setCurrentEntry(null)
      setIsExhausted(true)
      setMessage('We could not load the word of the day. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }, [applyTheme, themeFromSlug])

  useEffect(() => {
    const stored = (() => {
      try {
        return window.localStorage.getItem(STORAGE_KEYS.lang)
      } catch {
        return null
      }
    })()
    if (stored === 'en' || stored === 'de') {
      setLang(stored)
      document.documentElement.lang = stored
    }
  }, [])

  useEffect(() => {
    let midnightTimeout: ReturnType<typeof setTimeout> | undefined
    let dailyInterval: ReturnType<typeof setInterval> | undefined

    fetchWord().then(() => {
      midnightTimeout = setTimeout(() => {
        fetchWord()
        dailyInterval = setInterval(fetchWord, 24 * 60 * 60 * 1000)
      }, msUntilNextMidnight())
    })

    return () => {
      if (midnightTimeout) clearTimeout(midnightTimeout)
      if (dailyInterval) clearInterval(dailyInterval)
    }
  }, [fetchWord])

  const switchLanguage = useCallback((newLang: Language) => {
    setLang(newLang)
    document.documentElement.lang = newLang
    try {
      window.localStorage.setItem(STORAGE_KEYS.lang, newLang)
    } catch {
      // ignore storage errors
    }
  }, [])

  const labels = useMemo(() => UILABEL[lang], [lang])

  return {
    lang,
    currentEntry,
    theme,
    isExhausted,
    isLoading,
    message,
    labels,
    switchLanguage,
  }
}
