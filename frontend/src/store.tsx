import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { Profile, StackEntry } from './types'

interface AppState {
  profile: Profile | null
  stack: StackEntry[]
  cursor: number
  booted: boolean
  setProfile: (p: Profile) => void
  setStack: (s: StackEntry[]) => void
  advance: () => void
  restart: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stack, setStackRaw] = useState<StackEntry[]>([])
  const [cursor, setCursor] = useState(0)
  const [booted, setBooted] = useState(false)

  // Survive a page refresh mid-demo: if the backend still knows "me", pick up
  // where we left off instead of bouncing back to the landing screen.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [me, { stack: rows }] = await Promise.all([api.profile('me'), api.stack()])
        if (!cancelled) {
          setProfile(me)
          setStackRaw(rows)
        }
      } catch {
        /* no profile yet - that is the normal first run */
      } finally {
        if (!cancelled) setBooted(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setStack = useCallback((rows: StackEntry[]) => {
    setStackRaw(rows)
    setCursor(0)
  }, [])

  const advance = useCallback(() => setCursor((c) => c + 1), [])

  const restart = useCallback(async () => {
    await api.reset()
    setProfile(null)
    setStackRaw([])
    setCursor(0)
  }, [])

  const value = useMemo(
    () => ({ profile, stack, cursor, booted, setProfile, setStack, advance, restart }),
    [profile, stack, cursor, booted, setStack, advance, restart],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp outside AppProvider')
  return ctx
}
