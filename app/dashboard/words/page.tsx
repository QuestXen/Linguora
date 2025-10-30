import { loadWordsBootstrap } from '@/app/dashboard/data'
import { WordsView } from '@/app/dashboard/components/WordsView'

export const dynamic = 'force-dynamic'

export default async function WordsPage() {
  const bootstrap = await loadWordsBootstrap()
  return <WordsView initialData={bootstrap} />
}
