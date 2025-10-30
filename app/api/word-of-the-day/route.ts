import { NextResponse } from 'next/server'
import {
  formatDateKey,
  getWordOfTheDay,
  WORD_OF_THE_DAY_TIMEZONE,
} from '@/app/lib/word-of-the-day-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getWordOfTheDay()
    return NextResponse.json({
      entry: payload.entry,
      fonts: [],
      exhausted: payload.exhausted,
      date: payload.date,
      message: payload.message ?? undefined,
    })
  } catch (error) {
    console.error('Failed to serve word of the day:', error)
    return NextResponse.json(
      {
        entry: null,
        fonts: [],
        exhausted: true,
        date: formatDateKey(new Date(), WORD_OF_THE_DAY_TIMEZONE),
        message:
          'We were unable to load the word of the day. Please try again later.',
      },
      { status: 500 },
    )
  }
}
