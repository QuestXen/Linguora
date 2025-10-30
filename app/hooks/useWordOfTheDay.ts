'use client'

import { useState, useEffect, useCallback } from 'react'

const K = {
  lang: "linguora_lang",
  seen: "linguora_seen",
  todayDate: "linguora_today_date",
  todaySlug: "linguora_today_slug",
  lastSlug: "linguora_last_slug",
  todayTheme: "linguora_today_theme",
  lastTheme: "linguora_last_theme"
}

const UILABEL = {
  en: { title: "Word of the Day", footer: "Learn a new word every day!", empty: "You've seen all words. New words are coming soon.", reset: "Reset words" },
  de: { title: "Wort des Tages", footer: "Lerne jeden Tag ein neues Wort!", empty: "Du hast alle Wörter gesehen. Bald kommen neue Wörter.", reset: "Zurücksetzen" }
}

const gradients = [
  ["#1B9D89","#5DE5A5"],["#4e54c8","#8f94fb"],["#ff7e5f","#feb47b"],["#00c6ff","#0072ff"],
  ["#F5515F","#A1051D"],["#7F00FF","#E100FF"],["#11998e","#38ef7d"],["#f7971e","#ffd200"],
  ["#06beb6","#48b1bf"],["#00F5A0","#00D9F5"],["#F53844","#42378F"],["#FAD961","#F76B1C"],
  ["#30cfd0","#330867"],["#834d9b","#d04ed6"],["#B24592","#F15F79"],["#3EECAC","#EE74E1"]
]

const patterns = [
  { css:"none", size:"auto" },
  { css:"radial-gradient(rgba(255,255,255,.10) 1px, transparent 1px)", size:"12px 12px" },
  { css:"repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 2px, transparent 2px 10px)", size:"auto" },
  { css:"repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px),repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px)", size:"auto,auto" },
  { css:"repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,.08) 0 2px, transparent 2px 10px)", size:"auto" },
  { css:"linear-gradient(135deg, rgba(255,255,255,.06) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.06) 50%, rgba(255,255,255,.06) 75%, transparent 75%, transparent)", size:"16px 16px" }
]

const shapes = [
  { css:"none", rot:"0deg" },
  { css:"radial-gradient(100% 80% at 10% 0%, rgba(255,255,255,.20), transparent 60%)", rot:"0deg" },
  { css:"radial-gradient(80% 100% at 100% 20%, rgba(255,255,255,.18), transparent 60%)", rot:"0deg" },
  { css:"conic-gradient(from 0deg at 80% 10%, rgba(255,255,255,.20), transparent 120deg)", rot:"0deg" },
  { css:"radial-gradient(60% 60% at 20% 80%, rgba(255,255,255,.16), transparent 60%)", rot:"0deg" }
]

type Language = 'en' | 'de'

interface WordEntry {
  slug: string
  en: { word: string; ipa: string; def: string; ex: string }
  de: { word: string; ipa: string; def: string; ex: string }
}

interface WordData {
  fonts: Array<{ family: string; url?: string }>
  entries: WordEntry[]
}

interface Theme {
  g: number
  p: number
  s: number
}

const dayKey = () => new Intl.DateTimeFormat("en-CA", { 
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
}).format(new Date())

const msUntilNextMidnight = () => {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - now.getTime()
}

const rIdx = (max: number) => Math.floor(Math.random() * max)
const rIdxNot = (max: number, not: number) => 
  max <= 1 ? 0 : ((i: number) => i === not ? (i + 1) % max : i)(rIdx(max))

const Jget = <T,>(k: string, fb: T): T => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : fb
  } catch {
    return fb
  }
}

const Jset = (k: string, v: any) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}

const Sget = (k: string): string | null => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}

const Sset = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {}
}

const Sdel = (k: string) => {
  try {
    localStorage.removeItem(k)
  } catch {}
}

export function useWordOfTheDay() {
  const [lang, setLang] = useState<Language>('en')
  const [data, setData] = useState<WordData | null>(null)
  const [currentEntry, setCurrentEntry] = useState<WordEntry | null>(null)
  const [theme, setTheme] = useState<Theme>({ g: 0, p: 0, s: 0 })
  const [isExhausted, setIsExhausted] = useState(false)
  const [isFading, setIsFading] = useState(false)

  // Load words
  useEffect(() => {
    async function loadWords() {
      try {
        const r = await fetch("/words.json", { cache: "no-store" })
        const json = await r.json()
        setData(json)
      } catch {
        // Fallback
        setData({
          fonts: [{ family: "Poppins" }, { family: "Domine" }],
          entries: [{
            slug: "fallback",
            en: { word: "Serendipity", ipa: "/ˌsɛrənˈdɪpɪti/", def: "The occurrence and development of events by chance in a happy or beneficial way.", ex: "A fortunate stroke of serendipity." },
            de: { word: "Serendipität", ipa: "/zeʁɛndiˌpiːtiˈtɛːt/", def: "Das zufällige Finden von etwas Wertvollem oder Nützlichem, nach dem man nicht gezielt gesucht hat.", ex: "Ein Moment der Serendipität führte zur entscheidenden Entdeckung." }
          }]
        })
      }
    }
    loadWords()
  }, [])

  // Initialize language
  useEffect(() => {
    const stored = Sget(K.lang)
    if (stored === 'en' || stored === 'de') {
      setLang(stored)
    }
  }, [])

  const sanitizeSeen = useCallback((seen: string[], validSlugs: string[]) => {
    const valid = new Set(validSlugs)
    return Array.isArray(seen) ? [...new Set(seen.filter(s => valid.has(s)))] : []
  }, [])

  const applyTheme = useCallback((t: Theme) => {
    const [c1, c2] = gradients[t.g]
    const pat = patterns[t.p]
    const shp = shapes[t.s]
    
    document.documentElement.style.setProperty("--c1", c1)
    document.documentElement.style.setProperty("--c2", c2)
    document.documentElement.style.setProperty("--pattern", pat.css)
    document.documentElement.style.setProperty("--pattern-size", pat.size)
    document.documentElement.style.setProperty("--shape", shp.css)
    document.documentElement.style.setProperty("--shape-rot", shp.rot)
  }, [])

  const pickThemeNotSameAsLast = useCallback(() => {
    const last = Jget<Theme>(K.lastTheme, { g: -1, p: -1, s: -1 })
    const t = {
      g: rIdxNot(gradients.length, last.g),
      p: rIdxNot(patterns.length, last.p),
      s: rIdxNot(shapes.length, last.s)
    }
    Jset(K.todayTheme, t)
    Jset(K.lastTheme, t)
    return t
  }, [])

  const unseenPool = useCallback((entries: WordEntry[], seen: string[], excludeSlug: string | null = null) => {
    const seenSet = new Set(seen)
    const pool = entries.filter(e => !seenSet.has(e.slug))
    return excludeSlug ? pool.filter(e => e.slug !== excludeSlug) : pool
  }, [])

  const pickRandomUnseenPersist = useCallback((entries: WordEntry[]) => {
    const allSlugs = entries.map(e => e.slug)
    const seen = sanitizeSeen(Jget<string[]>(K.seen, []), allSlugs)
    const current = Sget(K.todaySlug)
    let pool = unseenPool(entries, seen, current)
    if (pool.length === 0) pool = unseenPool(entries, seen, null)
    if (pool.length === 0) return null
    
    const pick = pool[rIdx(pool.length)]
    const newSeen = [...new Set([...seen, pick.slug])]
    Jset(K.seen, newSeen)
    Sset(K.todaySlug, pick.slug)
    Sset(K.lastSlug, pick.slug)
    return pick
  }, [sanitizeSeen, unseenPool])

  const pickWordForToday = useCallback((entries: WordEntry[]) => {
    const today = dayKey()
    const storedDate = Sget(K.todayDate)
    const storedSlug = Sget(K.todaySlug)
    const allSlugs = entries.map(e => e.slug)
    const seen = sanitizeSeen(Jget<string[]>(K.seen, []), allSlugs)

    if (storedDate === today && storedSlug) {
      const found = entries.find(e => e.slug === storedSlug)
      if (found) return found
    }

    const pick = pickRandomUnseenPersist(entries)
    if (!pick) return null
    Sset(K.todayDate, today)
    return pick
  }, [sanitizeSeen, pickRandomUnseenPersist])

  const applyAll = useCallback(() => {
    if (!data) return

    const tKey = dayKey()
    let t = Jget<Theme | null>(K.todayTheme, null)
    if (Sget(K.todayDate) !== tKey || !t) {
      t = pickThemeNotSameAsLast()
      Sset(K.todayDate, tKey)
    }
    setTheme(t)
    applyTheme(t)

    const entry = pickWordForToday(data.entries || [])
    if (!entry) {
      setIsExhausted(true)
      setCurrentEntry(null)
    } else {
      setIsExhausted(false)
      setCurrentEntry(entry)
    }
  }, [data, applyTheme, pickThemeNotSameAsLast, pickWordForToday])

  const advanceProgress = useCallback(() => {
    if (!data || !data.entries.length) return

    const entries = data.entries
    const allSlugs = entries.map(e => e.slug)
    const seen = sanitizeSeen(Jget<string[]>(K.seen, []), allSlugs)
    const current = Sget(K.todaySlug)
    let pool = unseenPool(entries, seen, current)
    if (pool.length === 0) pool = unseenPool(entries, seen, null)

    if (pool.length === 0) {
      setIsExhausted(true)
      setCurrentEntry(null)
      return
    }

    const pick = pickRandomUnseenPersist(entries)
    if (!pick) {
      setIsExhausted(true)
      setCurrentEntry(null)
      return
    }

    const t = pickThemeNotSameAsLast()
    setTheme(t)
    
    setIsFading(true)
    setTimeout(() => {
      applyTheme(t)
      setCurrentEntry(pick)
      setIsExhausted(false)
      setIsFading(false)
    }, 200)
  }, [data, sanitizeSeen, unseenPool, pickRandomUnseenPersist, pickThemeNotSameAsLast, applyTheme])

  const resetProgress = useCallback(() => {
    Sdel(K.todayDate)
    Sdel(K.todaySlug)
    Sdel(K.todayTheme)
    Jset(K.seen, [])
    applyAll()
  }, [applyAll])

  const switchLanguage = useCallback((newLang: Language) => {
    setLang(newLang)
    Sset(K.lang, newLang)
    document.documentElement.lang = newLang
  }, [])

  // Initial load
  useEffect(() => {
    if (data) {
      applyAll()
      const timeout = setTimeout(() => {
        applyAll()
        setInterval(applyAll, 24 * 60 * 60 * 1000)
      }, msUntilNextMidnight())
      
      return () => clearTimeout(timeout)
    }
  }, [data, applyAll])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault()
        advanceProgress()
      }
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault()
        resetProgress()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [advanceProgress, resetProgress])

  return {
    lang,
    data,
    currentEntry,
    theme,
    isExhausted,
    isFading,
    labels: UILABEL[lang],
    switchLanguage,
    resetProgress,
    advanceProgress
  }
}