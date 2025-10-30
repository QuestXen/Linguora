export type Language = 'en' | 'de'

export interface LocalizedWord {
  word: string
  ipa: string
  def: string
  ex: string
}

export interface WordEntry {
  slug: string
  en: LocalizedWord
  de: LocalizedWord
}

export interface WordOfTheDayPayload {
  entry: WordEntry | null
  exhausted: boolean
  message: string | null
  date: string
}
