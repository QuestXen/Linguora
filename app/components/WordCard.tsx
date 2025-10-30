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
  const word = d.word?.trim() ?? ''
  const ipa = d.ipa?.trim() ?? ''
  const definition = d.def?.trim() ?? ''
  const example = d.ex?.trim() ?? ''
  const hasIPA = ipa.length > 0
  const hasDefinition = definition.length > 0
  const hasExample = example.length > 0

  return (
    <div className="card">
      <div className={`card-content ${!hasIPA ? 'no-ipa' : ''}`}>
        <p className="word">{word}</p>
        <p className={`pronunciation ${!hasIPA ? 'is-hidden' : ''}`}>{ipa}</p>
        {hasDefinition ? <p className="definition">{definition}</p> : null}
        {hasExample ? <p className="example">{example}</p> : null}
      </div>
    </div>
  )
}
