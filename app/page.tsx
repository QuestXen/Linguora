import MainPageClient from '@/app/components/MainPageClient'
import { getWordOfTheDay } from '@/app/lib/word-of-the-day-service'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const initialData = await getWordOfTheDay()
  return <MainPageClient initialData={initialData} />
}
