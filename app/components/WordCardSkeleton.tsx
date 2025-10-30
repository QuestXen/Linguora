import type { CSSProperties } from 'react'

const placeholderStyle: CSSProperties = {
  '--skeleton-sheen': 'rgba(0, 0, 0, 0.06)',
  '--skeleton-base': 'rgba(0, 0, 0, 0.04)',
} as CSSProperties

export default function WordCardSkeleton() {
  return (
    <div className="card card--skeleton" style={placeholderStyle}>
      <div className="card-content card-content--skeleton">
        <span className="skeleton-block skeleton-block--word" />
        <span className="skeleton-block skeleton-block--ipa" />
        <span className="skeleton-block skeleton-block--definition" />
        <span className="skeleton-block skeleton-block--definition skeleton-block--definition-alt" />
        <span className="skeleton-block skeleton-block--example" />
      </div>
    </div>
  )
}
