import { useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export type AuthUser = { email: string }

type AuthState = { session: Session | null; initialized: boolean }

const listeners = new Set<() => void>()
let state: AuthState = { session: null, initialized: false }

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

supabase.auth.getSession().then(({ data }) => {
  setState({ session: data.session, initialized: true })
})

supabase.auth.onAuthStateChange((_event, newSession) => {
  setState({ session: newSession, initialized: true })
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

const serverSnapshot: AuthState = { session: null, initialized: false }

function getServerSnapshot(): AuthState {
  return serverSnapshot
}

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export function logout() {
  void supabase.auth.signOut()
}

export function useAuth() {
  const { session, initialized } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )
  const user: AuthUser | null = session?.user.email
    ? { email: session.user.email }
    : null
  return { user, isAuthenticated: !!user, isReady: initialized, login, logout }
}
