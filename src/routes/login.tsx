import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { login, useAuth } from '@/lib/auth'
import { inputClass, FormField } from '@/components/admin/FormField'

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [{ title: 'Sign in | DealCanvas Admin' }],
  }),
  component: LoginPage,
})

function LoginPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/admin' })
    }
  }, [isAuthenticated, navigate])

  if (isAuthenticated) {
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await login(email, password)
      if (result.ok) {
        navigate({ to: '/admin' })
      } else {
        setError(result.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-card">
        <p className="editorial-eyebrow">DealCanvas</p>
        <h1 className="mt-2 text-3xl">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Internal access only. Use your admin credentials to manage the
          catalogue.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <FormField label="Email">
            <input
              type="email"
              autoComplete="username"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Password">
            <input
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormField>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
