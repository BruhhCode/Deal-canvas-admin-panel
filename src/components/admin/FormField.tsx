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
