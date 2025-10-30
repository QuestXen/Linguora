'use client'

import { createContext, useContext, useMemo } from 'react'
import type { PropsWithChildren } from 'react'

import type { SessionEnvelope } from '@/app/lib/auth-types'

interface SessionContextValue {
  initialSession: SessionEnvelope | null
  hasInitialValue: boolean
}

const SessionContext = createContext<SessionContextValue>({
  initialSession: null,
  hasInitialValue: false,
})

interface SessionProviderProps extends PropsWithChildren {
  initialSession: SessionEnvelope | null
}

export const SessionProvider = ({
  initialSession,
  children,
}: SessionProviderProps) => {
  const value = useMemo(
    () => ({ initialSession, hasInitialValue: true }),
    [initialSession],
  )
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export const useInitialSession = () => useContext(SessionContext)
