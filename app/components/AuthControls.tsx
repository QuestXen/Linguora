'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const FALLBACK_AVATAR = '/avatar-placeholder.svg'

type Provider = 'github' | 'google'

type SessionEnvelope =
  | {
      session: {
        id: string
        userId: string
        token: string
        expiresAt: string
        createdAt: string
        updatedAt: string
        ipAddress?: string | null
        userAgent?: string | null
      }
      user: {
        id: string
        name: string
        email: string
        image?: string | null
        emailVerified: boolean
        createdAt: string
        updatedAt: string
        role?: string
        hasDashboardAccess?: boolean
        isBanned?: boolean
        contributorState?: string
      }
      permissions?: {
        dashboard?: boolean
        reason?: string | null
        isContributor?: boolean
      }
    }
  | null

const providerLabels: Record<Provider, string> = {
  github: 'Sign in with GitHub',
  google: 'Sign in with Google',
}

const normalizeSession = (payload: unknown): SessionEnvelope => {
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
}

export default function AuthControls({ mode = 'default' }: AuthControlsProps = {}) {
  const [session, setSession] = useState<SessionEnvelope>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [authMenuOpen, setAuthMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadSession = useCallback(async () => {
    setStatus('loading')
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
      setSession(null)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

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

  const isBusy = status === 'loading'

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

        // Fallback: reload to refresh session state
        window.location.reload()
      } catch (err) {
        console.error('Failed to start social sign-in:', err)
      }
    },
    [setAuthMenuOpen]
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

  const toggleAuthMenu = () => {
    setUserMenuOpen(false)
    setAuthMenuOpen(open => !open)
  }

  const toggleUserMenu = () => {
    setAuthMenuOpen(false)
    setUserMenuOpen(open => !open)
  }

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
      <div className="auth-controls" ref={containerRef}>
        <div className="auth-dropdown">
          <button
            type="button"
            className="auth-avatar-button"
            onClick={toggleUserMenu}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
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
      </div>
    )
  }

  return (
    <div className="auth-controls" ref={containerRef}>
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
    </div>
  )
}
