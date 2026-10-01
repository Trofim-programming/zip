'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export const ADMIN_EMAIL = 'trofimzivilik14@gmail.com'

export type Role = 'student' | 'teacher' | 'admin'

export type User = {
  id?: string
  firstName: string
  lastName: string
  email: string
  username: string
  role: Role
  telegramId?: string | null
  telegramUsername?: string | null
}

type Store = {
  user: User
  isAuthed: boolean
  xp: number
  completedLessons: string[]
  login: (user: Partial<User>) => void
  logout: () => Promise<void>
  setRole: (role: Role) => void
  addXp: (amount: number) => void
  completeLesson: (id: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const defaultUser: User = {
  firstName: 'Гость',
  lastName: '',
  email: '',
  username: '',
  role: 'student',
}

const STORAGE_KEY = 'codelab-session'

const AppStoreContext = createContext<Store | null>(null)

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(defaultUser)
  const [isAuthed, setIsAuthed] = useState(false)
  const [xp, setXp] = useState(0)
  const [completedLessons, setCompleted] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.authed && data.user) {
          const u = data.user
          // Strict check: only trofimzivilik14@gmail.com can be admin
          const enforcedRole: Role = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : (u.role === 'admin' ? 'student' : u.role)
          setUser({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            username: u.username,
            role: enforcedRole,
            telegramId: u.telegramId,
            telegramUsername: u.telegramUsername,
          })
          setIsAuthed(true)
          if (typeof u.xp === 'number') setXp(u.xp)
          if (Array.isArray(data.completedLessons)) setCompleted(data.completedLessons)
          return
        }
      }
    } catch (e) {
      console.error('Failed to sync user with server:', e)
    }

    // Fallback to local storage if offline
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (data.user) {
          const enforcedRole: Role = data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : (data.user.role === 'admin' ? 'student' : data.user.role)
          setUser({ ...data.user, role: enforcedRole })
          setIsAuthed(Boolean(data.isAuthed))
          setXp(data.xp || 0)
          setCompleted(data.completedLessons || [])
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setHydrated(true))
  }, [refreshUser])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, isAuthed, xp, completedLessons }))
    } catch {}
  }, [user, isAuthed, xp, completedLessons, hydrated])

  const login = useCallback((u: Partial<User>) => {
    setUser((prev) => {
      const updated = { ...prev, ...u }
      if (updated.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        updated.role = 'admin'
      } else if (updated.role === 'admin') {
        updated.role = 'student'
      }
      return updated
    })
    setIsAuthed(true)
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    setIsAuthed(false)
    setUser(defaultUser)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  const setRole = useCallback((role: Role) => {
    setUser((p) => {
      // ONLY trofimzivilik14@gmail.com can become admin!
      if (role === 'admin' && p.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        return p
      }
      return { ...p, role }
    })
  }, [])

  const addXp = useCallback((n: number) => setXp((x) => x + n), [])

  const completeLesson = useCallback(async (id: string) => {
    setCompleted((c) => (c.includes(id) ? c : [...c, id]))
    setXp((x) => x + 25)
    try {
      await fetch('/api/courses/complete-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: id }),
      })
    } catch {}
  }, [])

  const value = useMemo(
    () => ({ user, isAuthed, xp, completedLessons, login, logout, setRole, addXp, completeLesson, refreshUser }),
    [user, isAuthed, xp, completedLessons, login, logout, setRole, addXp, completeLesson, refreshUser],
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}

export const useSchool = useAppStore

export const levels = [
  { level: 1, name: 'Beginner', min: 0 },
  { level: 2, name: 'Junior', min: 1000 },
  { level: 3, name: 'Developer', min: 3000 },
  { level: 4, name: 'Advanced', min: 7000 },
  { level: 5, name: 'Master', min: 15000 },
]

export function levelFromXp(xp: number) {
  const current = [...levels].reverse().find((l) => xp >= l.min)!
  const next = levels.find((l) => l.min > xp)
  const progress = next ? ((xp - current.min) / (next.min - current.min)) * 100 : 100
  return { ...current, next, progress }
}
