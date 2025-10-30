import { NextResponse } from 'next/server'
import { asc, eq, isNull } from 'drizzle-orm'

import {
  db,
  wordSchedules,
  words,
  type QueryableDb,
  type Word,
} from '@/app/db/client'

const TIMEZONE = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'
const MAX_ALLOCATION_ATTEMPTS = 5

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

function mapWord(word: Word) {
  return {
    slug: word.slug,
    en: {
      word: word.enWord,
      ipa: word.enIpa ?? '',
      def: word.enDefinition,
      ex: word.enExample,
    },
    de: {
      word: word.deWord,
      ipa: word.deIpa ?? '',
      def: word.deDefinition,
      ex: word.deExample,
    },
  }
}

async function findScheduleWithWord(client: QueryableDb, dayKey: string) {
  const schedule = await client.query.wordSchedules.findFirst({
    where: eq(wordSchedules.scheduledFor, dayKey),
    with: { word: true },
  })

  if (schedule && !schedule.word) {
    await client
      .delete(wordSchedules)
      .where(eq(wordSchedules.id, schedule.id))
    return null
  }

  return schedule
}

async function selectNextAvailableWord(client: QueryableDb) {
  const [candidate] = await client
    .select({ word: words })
    .from(words)
    .leftJoin(wordSchedules, eq(words.slug, wordSchedules.slug))
    .where(isNull(wordSchedules.slug))
    .orderBy(asc(words.createdAt), asc(words.slug))
    .limit(1)

  return candidate?.word ?? null
}

async function scheduleWordForToday(dayKey: string) {
  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const existing = await findScheduleWithWord(db, dayKey)
    if (existing?.word) {
      return { word: existing.word, exhausted: false }
    }

    const nextWord = await selectNextAvailableWord(db)
    if (!nextWord) {
      return { word: null, exhausted: true }
    }

    const inserted = await db
      .insert(wordSchedules)
      .values({ scheduledFor: dayKey, slug: nextWord.slug })
      .onConflictDoNothing()
      .returning({ id: wordSchedules.id })

    if (inserted.length > 0) {
      return { word: nextWord, exhausted: false }
    }
  }

  const fallback = await findScheduleWithWord(db, dayKey)
  if (fallback?.word) {
    return { word: fallback.word, exhausted: false }
  }

  return { word: null, exhausted: true }
}

export async function GET() {
  try {
    const todayKey = formatDateKey(new Date(), TIMEZONE)
    const result = await scheduleWordForToday(todayKey)

    if (!result.word) {
      const hasWords = await db
        .select({ slug: words.slug })
        .from(words)
        .limit(1)

      return NextResponse.json({
        entry: null,
        fonts: [],
        exhausted: true,
        date: todayKey,
        message:
          hasWords.length > 0
            ? 'All configured words have been delivered. Insert additional rows into the words table to continue the rotation.'
            : 'No words are configured yet. Seed the words table to start the daily rotation.',
      })
    }

    return NextResponse.json({
      entry: mapWord(result.word),
      fonts: [],
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
