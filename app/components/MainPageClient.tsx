'use client'
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { CSSProperties } from 'react'

import AuthControls from '@/app/components/AuthControls'
import LanguageToggle from '@/app/components/LanguageToggle'
import WordCard from '@/app/components/WordCard'
import { useWordOfTheDay } from '@/app/hooks/useWordOfTheDay'
import {
  STORAGE_KEYS,
  UILABEL,
  themeToCssVariables,
} from '@/app/lib/word-theme'
import type { Language, WordOfTheDayPayload } from '@/app/lib/word-types'

type TransitionPhase = 'idle' | 'fadeOut' | 'fadeIn'

const CROSSFADE_DURATION_MS = 95

interface MainPageClientProps {
  initialData: WordOfTheDayPayload
}

export default function MainPageClient({ initialData }: MainPageClientProps) {
  const { entry, isExhausted, message, theme } = useWordOfTheDay({
    initialData,
  })

  const [activeLang, setActiveLang] = useState<Language>('en')
  const [displayLang, setDisplayLang] = useState<Language>('en')
  const [phase, setPhase] = useState<TransitionPhase>('idle')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const fadeTimers = useRef<number[]>([])

  const transitionDuration = prefersReducedMotion ? 0 : CROSSFADE_DURATION_MS

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const stored = (() => {
      try {
        return window.localStorage.getItem(STORAGE_KEYS.lang)
      } catch {
        return null
      }
    })()

    if (stored === 'en' || stored === 'de') {
      startTransition(() => {
        setActiveLang(stored)
        setDisplayLang(stored)
      })
      document.documentElement.lang = stored
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = activeLang
  }, [activeLang])

  useEffect(() => {
    return () => {
      fadeTimers.current.forEach(timer => window.clearTimeout(timer))
      fadeTimers.current = []
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const variables = themeToCssVariables(theme)
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [theme])

  const handleLanguageSwitch = useCallback(
    (nextLang: Language) => {
      if (nextLang === activeLang) return

      setActiveLang(nextLang)
      try {
        window.localStorage.setItem(STORAGE_KEYS.lang, nextLang)
      } catch {
        // ignore storage failures
      }

      if (prefersReducedMotion) {
        setDisplayLang(nextLang)
        setPhase('idle')
        return
      }

      fadeTimers.current.forEach(timer => window.clearTimeout(timer))
      fadeTimers.current = []

      setPhase('fadeOut')
      const outTimer = window.setTimeout(() => {
        setDisplayLang(nextLang)
        setPhase('fadeIn')
        const inTimer = window.setTimeout(() => {
          setPhase('idle')
        }, transitionDuration)
        fadeTimers.current.push(inTimer)
      }, transitionDuration)
      fadeTimers.current.push(outTimer)
    },
    [activeLang, prefersReducedMotion, transitionDuration],
  )

  const fadeClassName = useMemo(() => {
    if (prefersReducedMotion) {
      return 'language-fade language-fade--static'
    }
    if (phase === 'fadeOut') {
      return 'language-fade language-fade--animating language-fade--out'
    }
    if (phase === 'fadeIn') {
      return 'language-fade language-fade--animating language-fade--in'
    }
    return 'language-fade'
  }, [phase, prefersReducedMotion])

  const labels = UILABEL[displayLang]

  const mainStyle = useMemo(() => {
    const vars = themeToCssVariables(theme)
    return {
      ...vars,
      '--language-transition-duration': `${transitionDuration}ms`,
    } as CSSProperties
  }, [theme, transitionDuration])

  return (
    <>
      <header className="top-header">
        <div className="header-left">
          <h1>Linguora</h1>
        </div>
        <div className="header-right">
          <AuthControls />
        </div>
      </header>

      <main className="page" style={mainStyle}>
        <div className="content">
          <div className="card-header">
            <span className={`card-title ${fadeClassName}`}>{labels.title}</span>
            <LanguageToggle currentLang={activeLang} onSwitch={handleLanguageSwitch} />
          </div>

          <WordCard
            entry={entry}
            lang={displayLang}
            isExhausted={isExhausted}
            emptyText={labels.empty}
            fallbackMessage={message}
            className="word-card-shell"
            contentClassName={fadeClassName}
          />

          <div className={`card-footer ${fadeClassName}`}>
            <span className="footer-text">{labels.footer}</span>
          </div>
        </div>
      </main>
    </>
  )
}
