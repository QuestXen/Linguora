import type { Language } from '@/app/lib/word-types'

export const UILABEL: Record<
  Language,
  {
    title: string
    footer: string
    empty: string
  }
> = {
  en: {
    title: 'Word of the Day',
    footer: 'Learn a new word every day!',
    empty:
      'All available words have been delivered. Check back once new words are added.',
  },
  de: {
    title: 'Wort des Tages',
    footer: 'Lerne jeden Tag ein neues Wort!',
    empty:
      'Alle verfügbaren Wörter wurden bereits angezeigt. Schau vorbei, sobald neue Wörter hinzugefügt wurden.',
  },
}

export const gradients = [
  ['#1B9D89', '#5DE5A5'],
  ['#4e54c8', '#8f94fb'],
  ['#ff7e5f', '#feb47b'],
  ['#00c6ff', '#0072ff'],
  ['#F5515F', '#A1051D'],
  ['#7F00FF', '#E100FF'],
  ['#11998e', '#38ef7d'],
  ['#f7971e', '#ffd200'],
  ['#06beb6', '#48b1bf'],
  ['#00F5A0', '#00D9F5'],
  ['#F53844', '#42378F'],
  ['#FAD961', '#F76B1C'],
  ['#30cfd0', '#330867'],
  ['#834d9b', '#d04ed6'],
  ['#B24592', '#F15F79'],
  ['#3EECAC', '#EE74E1'],
] as const

export const patterns = [
  { css: 'none', size: 'auto' },
  {
    css: 'radial-gradient(rgba(255,255,255,.10) 1px, transparent 1px)',
    size: '12px 12px',
  },
  {
    css: 'repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 2px, transparent 2px 10px)',
    size: 'auto',
  },
  {
    css: 'repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px),repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px)',
    size: 'auto,auto',
  },
  {
    css: 'repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,.08) 0 2px, transparent 2px 10px)',
    size: 'auto',
  },
  {
    css: 'linear-gradient(135deg, rgba(255,255,255,.06) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.06) 50%, rgba(255,255,255,.06) 75%, transparent 75%, transparent)',
    size: '16px 16px',
  },
] as const

export const shapes = [
  { css: 'none', rot: '0deg' },
  {
    css: 'radial-gradient(100% 80% at 10% 0%, rgba(255,255,255,.20), transparent 60%)',
    rot: '0deg',
  },
  {
    css: 'radial-gradient(80% 100% at 100% 20%, rgba(255,255,255,.18), transparent 60%)',
    rot: '0deg',
  },
  {
    css: 'conic-gradient(from 0deg at 80% 10%, rgba(255,255,255,.20), transparent 120deg)',
    rot: '0deg',
  },
  {
    css: 'radial-gradient(60% 60% at 20% 80%, rgba(255,255,255,.16), transparent 60%)',
    rot: '0deg',
  },
] as const

export interface ThemeIndices {
  gradient: number
  pattern: number
  shape: number
}

export interface ThemeDefinition {
  primary: string
  secondary: string
  pattern: string
  patternSize: string
  overlay: string
  overlayRotation: string
}

export const DEFAULT_THEME: ThemeIndices = {
  gradient: 0,
  pattern: 0,
  shape: 0,
}

export const STORAGE_KEYS = {
  lang: 'linguora_lang',
} as const

export const msUntilNextMidnight = () => {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - now.getTime()
}

export const hashSlug = (slug: string) => {
  let hash = 0
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash << 5) - hash + slug.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export const deriveThemeIndices = (slug: string): ThemeIndices => {
  const hash = hashSlug(slug)
  return {
    gradient: hash % gradients.length,
    pattern: Math.floor(hash / gradients.length) % patterns.length,
    shape:
      Math.floor(hash / (gradients.length * patterns.length)) %
      shapes.length,
  }
}

export const resolveTheme = (indices: ThemeIndices): ThemeDefinition => {
  const [primary, secondary] = gradients[indices.gradient]
  const pattern = patterns[indices.pattern]
  const shape = shapes[indices.shape]

  return {
    primary,
    secondary,
    pattern: pattern.css,
    patternSize: pattern.size,
    overlay: shape.css,
    overlayRotation: shape.rot,
  }
}

export const themeToCssVariables = (theme: ThemeDefinition) => ({
  '--c1': theme.primary,
  '--c2': theme.secondary,
  '--pattern': theme.pattern,
  '--pattern-size': theme.patternSize,
  '--shape': theme.overlay,
  '--shape-rot': theme.overlayRotation,
})
