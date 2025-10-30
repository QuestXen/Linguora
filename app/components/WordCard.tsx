'use client'

interface WordCardProps {
  entry: {
    en: { word: string; ipa: string; def: string; ex: string }
    de: { word: string; ipa: string; def: string; ex: string }
  } | null
  lang: 'en' | 'de'
  isExhausted: boolean
  isFading: boolean
  emptyText: string
  resetText: string
  onReset: () => void
}

export default function WordCard({ entry, lang, isExhausted, isFading, emptyText, resetText, onReset }: WordCardProps) {
  if (!entry && !isExhausted) return null

  if (isExhausted) {
    return (
      <div className="card">
        <div className={`card-content ${isFading ? 'fade-out' : ''}`}>
          <p className="word"></p>
          <p className="pronunciation is-hidden"></p>
          <p className="definition">{emptyText}</p>
          <p className="example">
            <button className="btn-reset" onClick={onReset}>
              {resetText}
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (!entry) return null

  const d = entry[lang]
  const hasIPA = !!(d.ipa && String(d.ipa).trim())

  return (
    <div className="card">
      <div className={`card-content ${isFading ? 'fade-out' : 'fade-in'} ${!hasIPA ? 'no-ipa' : ''}`}>
        <p className="word">{d.word}</p>
        <p className={`pronunciation ${!hasIPA ? 'is-hidden' : ''}`}>{d.ipa}</p>
        <p className="definition">{d.def}</p>
        <p className="example">{d.ex}</p>
      </div>
    </div>
  )
}