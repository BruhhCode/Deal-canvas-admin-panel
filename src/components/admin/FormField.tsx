export function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {label}
      <div className="mt-1.5 normal-case tracking-normal">{children}</div>
    </label>
  )
}

export const inputClass =
  'w-full rounded-sm border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-clay'

export const selectClass = inputClass

// Supabase/PostgREST errors are plain objects with a `message` string, not
// `Error` instances, so `err instanceof Error` misses them.
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof err.message === 'string'
  ) {
    return err.message
  }
  return fallback
}

// Runs a fire-and-forget action (a status toggle, a delete) and surfaces any
// failure instead of letting it fail silently as an unhandled rejection.
export async function runAction(action: () => Promise<void>, fallback: string) {
  try {
    await action()
  } catch (err) {
    window.alert(errorMessage(err, fallback))
  }
}
