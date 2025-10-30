import { asc, eq, isNull } from 'drizzle-orm'

import {
  db,
  wordSchedules,
  words,
  type QueryableDb,
  type Word,
} from '@/app/db/client'
import type { WordEntry, WordOfTheDayPayload } from '@/app/lib/word-types'

const WORD_OF_DAY_TIMEZONE = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'
const MAX_ALLOCATION_ATTEMPTS = 5

export const formatDateKey = (date: Date, timeZone: string) => {
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

const mapWord = (word: Word): WordEntry => ({
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
})

const findScheduleWithWord = async (
  client: QueryableDb,
  dayKey: string,
) => {
  const schedule = await client.query.wordSchedules.findFirst({
    where: eq(wordSchedules.scheduledFor, dayKey),
    with: { word: true },
  })

  if (schedule && !schedule.word) {
    await client.delete(wordSchedules).where(eq(wordSchedules.id, schedule.id))
    return null
  }

  return schedule
}

const selectNextAvailableWord = async (client: QueryableDb) => {
  const [candidate] = await client
    .select({ word: words })
    .from(words)
    .leftJoin(wordSchedules, eq(words.slug, wordSchedules.slug))
    .where(isNull(wordSchedules.slug))
    .orderBy(asc(words.createdAt), asc(words.slug))
    .limit(1)

  return candidate?.word ?? null
}

const scheduleWordForToday = async (
  client: QueryableDb,
  dayKey: string,
) => {
  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const existing = await findScheduleWithWord(client, dayKey)
    if (existing?.word) {
      return { word: existing.word, exhausted: false }
    }

    const nextWord = await selectNextAvailableWord(client)
    if (!nextWord) {
      return { word: null, exhausted: true }
    }

    const inserted = await client
      .insert(wordSchedules)
      .values({ scheduledFor: dayKey, slug: nextWord.slug })
      .onConflictDoNothing()
      .returning({ id: wordSchedules.id })

    if (inserted.length > 0) {
      return { word: nextWord, exhausted: false }
    }
  }

  const fallback = await findScheduleWithWord(client, dayKey)
  if (fallback?.word) {
    return { word: fallback.word, exhausted: false }
  }

  return { word: null, exhausted: true }
}

export const getWordOfTheDay = async (
  client: QueryableDb = db,
  timeZone: string = WORD_OF_DAY_TIMEZONE,
): Promise<WordOfTheDayPayload> => {
  const todayKey = formatDateKey(new Date(), timeZone)
  const result = await scheduleWordForToday(client, todayKey)

  if (!result.word) {
    const hasWords = await client.select({ slug: words.slug }).from(words).limit(1)

    return {
      entry: null,
      exhausted: true,
      date: todayKey,
      message:
        hasWords.length > 0
          ? 'All configured words have been delivered. Insert additional rows into the words table to continue the rotation.'
          : 'No words are configured yet. Seed the words table to start the daily rotation.',
    }
  }

  return {
    entry: mapWord(result.word),
    exhausted: false,
    message: null,
    date: todayKey,
  }
}

export const WORD_OF_THE_DAY_TIMEZONE = WORD_OF_DAY_TIMEZONE
