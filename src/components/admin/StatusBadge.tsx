const styles: Record<string, string> = {
  ACTIVE: 'border-clay/30 bg-clay/10 text-clay',
  'IN STOCK': 'border-clay/30 bg-clay/10 text-clay',
  'LOW STOCK': 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  PAUSED: 'border-border bg-muted text-muted-foreground',
  UPCOMING: 'border-border bg-muted text-muted-foreground',
  EXPIRED: 'border-destructive/30 bg-destructive/10 text-destructive',
  'OUT OF STOCK': 'border-destructive/30 bg-destructive/10 text-destructive',
  'SOLD OUT': 'border-destructive/30 bg-destructive/10 text-destructive',
  NEW: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  READ: 'border-border bg-muted text-muted-foreground',
  RESOLVED: 'border-clay/30 bg-clay/10 text-clay',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        styles[status] ?? styles.PAUSED
      }`}
    >
      {status}
    </span>
  )
}
