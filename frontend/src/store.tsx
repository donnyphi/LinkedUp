import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { Profile, StackEntry } from './types'

interface AppState {
  create: { open: boolean; setOpen: (v: boolean) => void; version: number }
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
  const [createOpen, setCreateOpenRaw] = useState(false)
  const [version, setVersion] = useState(0)
  // Closing the sheet after a post bumps the version so Home refetches.
  const setCreateOpen = useCallback((v: boolean) => {
    setCreateOpenRaw(v)
    if (!v) setVersion((n) => n + 1)
  }, [])

  // Survive a page refresh mid-demo: if the backend still knows "me", pick up
  // where we left off instead of bouncing back to the landing screen.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { profile: me, stack: rows } = await api.session()
        if (!cancelled && me) {
          setProfile(me)
          setStackRaw(rows)
        }
      } catch {
        /* backend not up yet - the landing page still renders */
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
    () => ({
      create: { open: createOpen, setOpen: setCreateOpen, version },
      profile, stack, cursor, booted, setProfile, setStack, advance, restart,
    }),
    [createOpen, setCreateOpen, version, profile, stack, cursor, booted, setStack, advance, restart],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp outside AppProvider')
  return ctx
}

export function useCreate() {
  return useApp().create
}
