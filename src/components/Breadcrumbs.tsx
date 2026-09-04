import { Link } from '@tanstack/react-router'

type Crumb = { label: string; to?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex items-center gap-2 text-xs text-muted-foreground"
    >
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2">
          {item.to ? (
            <Link
              to={item.to}
              className="uppercase tracking-[0.12em] hover:text-clay"
            >
              {item.label}
            </Link>
          ) : (
            <span className="uppercase tracking-[0.12em]">{item.label}</span>
          )}
          {i < items.length - 1 ? <span aria-hidden="true">/</span> : null}
        </span>
      ))}
    </nav>
  )
}
