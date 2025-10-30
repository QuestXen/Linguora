'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'

import { useInitialSession } from '@/app/components/SessionProvider'
import type { SessionEnvelope } from '@/app/lib/auth-types'

const FALLBACK_AVATAR = '/avatar-placeholder.svg'

type Provider = 'github' | 'google'

const providerLabels: Record<Provider, string> = {
  github: 'Sign in with GitHub',
  google: 'Sign in with Google',
}

type Status = 'initializing' | 'loading' | 'ready' | 'error'

const normalizeSession = (payload: unknown): SessionEnvelope | null => {
  if (!payload || typeof payload !== 'object') return null
  const data =
    'data' in payload && typeof (payload as Record<string, unknown>).data === 'object'
      ? (payload as { data: unknown }).data
      : payload

  if (!data || typeof data !== 'object') return null
  if (!('session' in data) || !('user' in data)) return null
  return data as SessionEnvelope
}

interface AuthControlsProps {
  mode?: 'default' | 'dashboard'
  initialSession?: SessionEnvelope | null
}

export default function AuthControls({ mode = 'default', initialSession }: AuthControlsProps = {}) {
  const { initialSession: contextSession, hasInitialValue } = useInitialSession()
  const bootstrapProvided = initialSession !== undefined || hasInitialValue
  const bootstrapSession = (initialSession ?? contextSession) ?? null

  const [session, setSession] = useState<SessionEnvelope | null>(bootstrapSession)
  const [status, setStatus] = useState<Status>(bootstrapProvided ? 'ready' : 'initializing')
  const [authMenuOpen, setAuthMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bootstrapRef = useRef<SessionEnvelope | null>(bootstrapSession)

  useEffect(() => {
    if (!bootstrapProvided) return
    if (bootstrapRef.current === bootstrapSession) return
    bootstrapRef.current = bootstrapSession
    setSession(bootstrapSession)
    setStatus('ready')
  }, [bootstrapProvided, bootstrapSession])

  const loadSession = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setStatus('loading')
      }
      try {
        const response = await fetch('/api/auth/get-session', {
          method: 'GET',
          credentials: 'include',
        })
        if (!response.ok) {
          setSession(null)
          setStatus('ready')
          return
        }
        const body = await response.json().catch(() => null)
        const normalized = normalizeSession(body)
        setSession(normalized)
        setStatus('ready')
      } catch (err) {
        console.error('Failed to load session:', err)
        setStatus('error')
      }
    },
    [],
  )

  useEffect(() => {
    void loadSession({ silent: bootstrapProvided })
  }, [bootstrapProvided, loadSession])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (!containerRef.current || containerRef.current.contains(target)) return
      setAuthMenuOpen(false)
      setUserMenuOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAuthMenuOpen(false)
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setUserMenuOpen(false)
    }
  }, [session])

  const isBusy = status === 'loading'
  const showSkeleton = (status === 'initializing' || status === 'loading') && !session

  const startSignIn = useCallback(
    async (provider: Provider) => {
      setAuthMenuOpen(false)
      try {
        const response = await fetch('/api/auth/sign-in/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            provider,
            callbackURL: window.location.href,
            errorCallbackURL: window.location.href,
          }),
        })

        const body = await response.json().catch(() => null)
        const redirectUrl =
          (body && typeof body === 'object' && 'url' in body && typeof body.url === 'string'
            ? (body.url as string)
            : null) ?? null
        const shouldRedirect =
          !!(body && typeof body === 'object' && 'redirect' in body && body.redirect)

        if (shouldRedirect && redirectUrl) {
          window.location.href = redirectUrl
          return
        }

        if (redirectUrl) {
          window.location.href = redirectUrl
          return
        }

        window.location.reload()
      } catch (err) {
        console.error('Failed to start social sign-in:', err)
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    setUserMenuOpen(false)
    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (err) {
      console.error('Failed to sign out:', err)
    } finally {
      await loadSession()
    }
  }, [loadSession])

  const toggleAuthMenu = useCallback(() => {
    if (showSkeleton) return
    setUserMenuOpen(false)
    setAuthMenuOpen(open => !open)
  }, [showSkeleton])

  const toggleUserMenu = useCallback(() => {
    if (showSkeleton) return
    setAuthMenuOpen(false)
    setUserMenuOpen(open => !open)
  }, [showSkeleton])

  const avatarContent = useMemo(() => {
    if (session) {
      const avatarSrc = session.user.image || FALLBACK_AVATAR
      const shouldShowDashboard = mode === 'default' && !!session.permissions?.dashboard
      const primaryActionLabel = mode === 'dashboard' ? 'Home' : 'Dashboard'
      const handlePrimaryAction = () => {
        if (mode === 'dashboard') {
          window.location.href = '/'
        } else {
          window.location.href = '/dashboard'
        }
      }

      return (
        <div className="auth-dropdown">
          <button
            type="button"
            className="auth-avatar-button"
            onClick={toggleUserMenu}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            aria-label="Open account menu"
          >
            <Image
              src={avatarSrc}
              alt={session.user.name ?? 'User Avatar'}
              width={40}
              height={40}
            />
          </button>
          {userMenuOpen ? (
            <div role="menu" className="auth-dropdown-menu">
              {shouldShowDashboard || mode === 'dashboard' ? (
                <button
                  type="button"
                  className="auth-dropdown-item"
                  onClick={handlePrimaryAction}
                >
                  {primaryActionLabel}
                </button>
              ) : null}
              <button type="button" className="auth-dropdown-item" onClick={signOut}>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      )
    }

    if (showSkeleton) {
      return <div className="auth-avatar-skeleton" aria-hidden="true" />
    }

    return (
      <div className="auth-dropdown">
        <button
          type="button"
          className="auth-trigger"
          onClick={toggleAuthMenu}
          aria-haspopup="menu"
          aria-expanded={authMenuOpen}
          disabled={isBusy}
        >
          Sign In
        </button>
        {authMenuOpen ? (
          <div role="menu" className="auth-dropdown-menu">
            {(Object.keys(providerLabels) as Provider[]).map(provider => (
              <button
                key={provider}
                type="button"
                className="auth-dropdown-item"
                onClick={() => startSignIn(provider)}
                disabled={isBusy}
              >
                {providerLabels[provider]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }, [
    authMenuOpen,
    isBusy,
    mode,
    session,
    showSkeleton,
    signOut,
    startSignIn,
    toggleAuthMenu,
    toggleUserMenu,
    userMenuOpen,
  ])

  return (
    <div className="auth-controls" ref={containerRef}>
      <div className="auth-avatar-shell">{avatarContent}</div>
    </div>
  )
}
