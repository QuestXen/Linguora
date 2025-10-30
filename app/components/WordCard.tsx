'use client'

interface WordCardProps {
  entry: {
    en: { word: string; ipa: string; def: string; ex: string }
    de: { word: string; ipa: string; def: string; ex: string }
  } | null
  lang: 'en' | 'de'
  isExhausted: boolean
  emptyText: string
  fallbackMessage?: string | null
}

export default function WordCard({ entry, lang, isExhausted, emptyText, fallbackMessage }: WordCardProps) {
  if (!entry && !isExhausted) return null

  if (isExhausted || !entry) {
    const text = fallbackMessage && fallbackMessage.trim().length > 0 ? fallbackMessage : emptyText
    return (
      <div className="card">
        <div className="card-content">
          <p className="word"></p>
          <p className="pronunciation is-hidden"></p>
          <p className="definition">{text}</p>
          <p className="example"></p>
        </div>
      </div>
    )
  }

  const d = entry[lang]
  const hasIPA = !!(d.ipa && String(d.ipa).trim())

  return (
    <div className="card">
      <div className={`card-content ${!hasIPA ? 'no-ipa' : ''}`}>
        <p className="word">{d.word}</p>
        <p className={`pronunciation ${!hasIPA ? 'is-hidden' : ''}`}>{d.ipa}</p>
        <p className="definition">{d.def}</p>
        <p className="example">{d.ex}</p>
      </div>
    </div>
  )
}
