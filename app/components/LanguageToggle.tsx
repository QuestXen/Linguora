'use client'

interface LanguageToggleProps {
  currentLang: 'en' | 'de'
  onSwitch: (lang: 'en' | 'de') => void
}

export default function LanguageToggle({ currentLang, onSwitch }: LanguageToggleProps) {
  return (
    <div className="lang-toggle" role="group" aria-label="Language Toggle">
      <button
        type="button"
        className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
        onClick={() => onSwitch('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-btn ${currentLang === 'de' ? 'active' : ''}`}
        onClick={() => onSwitch('de')}
      >
        DE
      </button>
    </div>
  )
}