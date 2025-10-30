'use client'

import type { PropsWithChildren, ReactNode } from 'react'

export const classNames = (
  ...tokens: Array<string | false | null | undefined>
) => tokens.filter(Boolean).join(' ')

interface SectionProps extends PropsWithChildren {
  title: string
  description?: string
  actions?: ReactNode
}

export const Section = ({ title, description, actions, children }: SectionProps) => (
  <section className="dashboard-section">
    <div className="dashboard-section-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="dashboard-section-actions">{actions}</div> : null}
    </div>
    <div className="dashboard-section-body">{children}</div>
  </section>
)

interface StatCardProps {
  label: string
  value: number | string
  hint?: string
}

export const StatCard = ({ label, value, hint }: StatCardProps) => (
  <article className="dashboard-card dashboard-card--stat">
    <p className="dashboard-card-label">{label}</p>
    <p className="dashboard-card-value">{value}</p>
    {hint ? <p className="dashboard-card-hint">{hint}</p> : null}
  </article>
)

type ButtonVariant = 'primary' | 'ghost' | 'danger'

export const SimpleButton = ({
  variant = 'primary',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) => (
  <button
    {...props}
    className={classNames(
      'dashboard-button',
      variant === 'ghost' && 'dashboard-button--ghost',
      variant === 'danger' && 'dashboard-button--danger',
      className,
    )}
  >
    {children}
  </button>
)

export const EmptyState = ({ message }: { message: string }) => (
  <div className="dashboard-empty">{message}</div>
)
