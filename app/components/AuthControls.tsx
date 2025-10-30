'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
      }
    }
  | null

const providerLabels: Record<Provider, string> = {
  github: 'GitHub',
  google: 'Google',
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

export default function AuthControls() {
  const [session, setSession] = useState<SessionEnvelope>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

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

  const startSignIn = useCallback(async (provider: Provider) => {
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
  }, [])

  const signOut = useCallback(async () => {
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

  const statusLabel = useMemo(() => {
    if (status === 'loading') return 'Checking session...'
    if (status === 'error') return 'Session error'
    if (!session) return 'Not signed in'
    return session.user.email || session.user.name || 'Signed in'
  }, [status, session])

  if (session) {
    const avatarSrc = session.user.image || FALLBACK_AVATAR
    return (
      <div className="auth-controls">
        <div className="auth-user">
          <span className="auth-label">{statusLabel}</span>
          <div className="auth-avatar">
            <Image
              src={avatarSrc}
              alt={session.user.name ?? 'User Avatar'}
              width={40}
              height={40}
            />
          </div>
        </div>
        <button type="button" className="auth-button" onClick={signOut}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="auth-controls">
      <span className="auth-label">{statusLabel}</span>
      <div className="auth-buttons">
        {(Object.keys(providerLabels) as Provider[]).map(provider => (
          <button
            key={provider}
            type="button"
            className="auth-button"
            onClick={() => startSignIn(provider)}
            disabled={status === 'loading'}
          >
            Sign in with {providerLabels[provider]}
          </button>
        ))}
      </div>
    </div>
  )
}
