import { useSyncExternalStore } from 'react'

export type AuthUser = { email: string }

const STORAGE_KEY = 'dc_admin_auth'
const listeners = new Set<() => void>()

function readStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

let cachedUser: AuthUser | null = readStoredUser()

function notify() {
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return cachedUser
}

function getServerSnapshot() {
  return null
}

/**
 * Fake auth check. Replace the body of this function with a real
 * Supabase/Firebase sign-in call later — every consumer goes through
 * useAuth(), so nothing outside this file needs to change.
 */
export async function login(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await new Promise((resolve) => setTimeout(resolve, 350))

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' }
  }

  cachedUser = { email }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedUser))
  notify()
  return { ok: true }
}

export function logout() {
  cachedUser = null
  window.localStorage.removeItem(STORAGE_KEY)
  notify()
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { user, isAuthenticated: !!user, login, logout }
}
