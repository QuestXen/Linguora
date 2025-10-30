import WordCardSkeleton from '@/app/components/WordCardSkeleton'

export default function Loading() {
  return (
    <>
      <header className="top-header">
        <div className="header-left">
          <h1>Linguora</h1>
        </div>
        <div className="header-right">
          <div className="auth-controls">
            <div className="auth-avatar-shell">
              <div className="auth-avatar-skeleton" aria-hidden="true" />
            </div>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="content">
          <div className="card-header">
            <span className="card-title skeleton-block skeleton-block--heading" />
            <div className="lang-toggle lang-toggle--skeleton">
              <span className="skeleton-pill" />
              <span className="skeleton-pill" />
            </div>
          </div>

          <WordCardSkeleton />

          <div className="card-footer">
            <span className="skeleton-block skeleton-block--footer" />
          </div>
        </div>
      </main>
    </>
  )
}
