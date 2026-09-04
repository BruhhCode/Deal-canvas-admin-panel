const styles: Record<string, string> = {
  ACTIVE: 'border-clay/30 bg-clay/10 text-clay',
  PAUSED: 'border-border bg-muted text-muted-foreground',
  EXPIRED: 'border-destructive/30 bg-destructive/10 text-destructive',
}

export function DealBadge({ badge }: { badge: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        styles[badge] ?? styles.PAUSED
      }`}
    >
      {badge}
    </span>
  )
}
