'use client'

import { useWordOfTheDay } from '@/app/hooks/useWordOfTheDay'
import LanguageToggle from '@/app/components/LanguageToggle'
import WordCard from '@/app/components/WordCard'
import AuthControls from '@/app/components/AuthControls'

export default function Home() {
  const {
    lang,
    currentEntry,
    isExhausted,
    isLoading,
    message,
    labels,
    switchLanguage,
  } = useWordOfTheDay()

  return (
    <>
      <header className="top-header">
        <div className="header-left">
          <h1>Linguora</h1>
        </div>

        <div className="header-right">
          {/* später kannst du hier auch Notifications reinmachen */}
          <AuthControls />
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
            emptyText={labels.empty}
            fallbackMessage={isLoading ? 'Loading…' : message}
          />

          <div className="card-footer">
            <span className="footer-text">{labels.footer}</span>
          </div>
        </div>
      </main>
    </>
  )
}
