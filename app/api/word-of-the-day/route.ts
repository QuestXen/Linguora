import { NextResponse } from 'next/server'
import path from 'node:path'
import { promises as fs } from 'node:fs'

interface WordEntry {
  slug: string
  en: { word: string; ipa: string; def: string; ex: string }
  de: { word: string; ipa: string; def: string; ex: string }
}

interface WordData {
  fonts?: Array<{ family: string; url?: string }>
  entries: WordEntry[]
}

interface RotationState {
  history: Array<{ date: string; slug: string }>
}

const WORDS_PATH = path.join(process.cwd(), 'public', 'words.json')
const STATE_DIR = path.join(process.cwd(), 'var')
const STATE_PATH = path.join(STATE_DIR, 'word-rotation.json')
const TIMEZONE = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'

export const dynamic = 'force-dynamic'

function formatDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  const day = parts.find(part => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error(`Unable to derive date key for timezone ${timeZone}`)
  }

  return `${year}-${month}-${day}`
}

async function readJSON<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return JSON.parse(content) as T
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'ENOENT'
    ) {
      return fallback
    }
    throw error
  }
}

async function loadWords(): Promise<WordData> {
  const data = await readJSON<WordData>(WORDS_PATH, { entries: [] })
  if (!data.entries?.length) {
    throw new Error('No word entries configured in public/words.json')
  }
  return data
}

async function loadState(): Promise<RotationState> {
  return readJSON<RotationState>(STATE_PATH, { history: [] })
}

async function saveState(state: RotationState) {
  await fs.mkdir(STATE_DIR, { recursive: true })
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
}

export async function GET() {
  try {
    const [words, state] = await Promise.all([loadWords(), loadState()])
    const todayKey = formatDateKey(new Date(), TIMEZONE)

    const today = state.history.find(record => record.date === todayKey)
    if (today) {
      const entry = words.entries.find(item => item.slug === today.slug)
      if (entry) {
        return NextResponse.json({
          entry,
          fonts: words.fonts ?? [],
          exhausted: false,
          date: todayKey,
        })
      }
      // Fall back to repairing state when slug removed from dataset
      state.history = state.history.filter(record => record.date !== todayKey)
    }

    const usedSlugs = new Set(state.history.map(record => record.slug))
    const available = words.entries.filter(entry => !usedSlugs.has(entry.slug))

    if (!available.length) {
      return NextResponse.json({
        entry: null,
        fonts: words.fonts ?? [],
        exhausted: true,
        date: todayKey,
        message:
          'All configured words have been delivered. Add more entries to public/words.json.',
      })
    }

    const nextEntry = available[0]
    state.history.push({ date: todayKey, slug: nextEntry.slug })
    await saveState(state)

    return NextResponse.json({
      entry: nextEntry,
      fonts: words.fonts ?? [],
      exhausted: false,
      date: todayKey,
    })
  } catch (error) {
    console.error('Failed to serve word of the day:', error)
    return NextResponse.json(
      {
        entry: null,
        fonts: [],
        exhausted: true,
        date: formatDateKey(new Date(), TIMEZONE),
        message:
          'We were unable to load the word of the day. Please try again later.',
      },
      { status: 500 },
    )
  }
}
