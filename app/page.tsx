'use client'

import { useWordOfTheDay } from '@/app/hooks/useWordOfTheDay'
import LanguageToggle from '@/app/components/LanguageToggle'
import WordCard from '@/app/components/WordCard'

export default function Home() {
  const {
    lang,
    currentEntry,
    isExhausted,
    isFading,
    labels,
    switchLanguage,
    resetProgress
  } = useWordOfTheDay()

  return (
    <>
      <header>
        <div className="header">
          <h1>Linguora</h1>
        </div>
      </header>

      <main className="page">
        <div className="content">
          <div className="card-header">
            <span className="card-title">{labels.title}</span>
            <LanguageToggle currentLang={lang} onSwitch={switchLanguage} />
          </div>

          <WordCard
            entry={currentEntry}
            lang={lang}
            isExhausted={isExhausted}
            isFading={isFading}
            emptyText={labels.empty}
            resetText={labels.reset}
            onReset={resetProgress}
          />

          <div className="card-footer">
            <span className="footer-text">{labels.footer}</span>
          </div>
        </div>
      </main>
    </>
  )
}