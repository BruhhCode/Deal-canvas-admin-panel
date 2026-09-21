import { useMemo } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BarChart3, Mail, Package, Percent, Store, Tags } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { DealBadge } from '@/components/DealBadge'
import { timeAgo, useLiveNow } from '@/lib/time'
import {
  useBrands,
  useContactMessages,
  useCoupons,
  useDataStatus,
  useDeals,
  useProducts,
  useSaleEvents,
  useStores,
} from '@/lib/data'
import { CATEGORIES } from '@/types/catalog'
import type { DealStatus } from '@/types/catalog'

export const Route = createFileRoute('/admin/')({
  component: Dashboard,
})

const DEAL_STATUSES: DealStatus[] = ['ACTIVE', 'PAUSED', 'UPCOMING', 'EXPIRED']

function Dashboard() {
  const products = useProducts()
  const brands = useBrands()
  const stores = useStores()
  const deals = useDeals()
  const coupons = useCoupons()
  const saleEvents = useSaleEvents()
  const messages = useContactMessages()
  const { loaded } = useDataStatus()
  useLiveNow() // re-render periodically so "time ago" cells stay current

  const totalOffers = useMemo(
    () => products.reduce((sum, p) => sum + p.offers.length, 0),
    [products],
  )
  const usedCategories = useMemo(
    () => new Set(products.map((p) => p.category)).size,
    [products],
  )
  const newEnquiries = messages.filter((m) => m.status === 'NEW').length
  const dealStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of DEAL_STATUSES) counts[s] = 0
    for (const d of deals) counts[d.status] = (counts[d.status] ?? 0) + 1
    return counts
  }, [deals])
  const maxDealStatusCount = Math.max(1, ...Object.values(dealStatusCounts))

  const recentMessages = useMemo(
    () =>
      [...messages]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    [messages],
  )

  const recentlyUpdatedProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 5),
    [products],
  )

  const cards = [
    {
      label: 'Categories',
      value: usedCategories,
      sublabel: `of ${Object.keys(CATEGORIES).length} available`,
      icon: Tags,
      to: '/admin/products',
      highlight: false,
    },
    {
      label: 'Brands',
      value: brands.length,
      sublabel: `${stores.length} stores`,
      icon: Store,
      to: '/admin/brands',
      highlight: false,
    },
    {
      label: 'Products',
      value: products.length,
      sublabel: `${totalOffers} offers`,
      icon: Package,
      to: '/admin/products',
      highlight: false,
    },
    {
      label: 'Deals & coupons',
      value: deals.length,
      sublabel: `${coupons.length} coupons · ${saleEvents.length} sale events`,
      icon: Percent,
      to: '/admin/deals',
      highlight: false,
    },
    {
      label: 'Enquiries',
      value: messages.length,
      sublabel: newEnquiries > 0 ? `${newEnquiries} new` : 'All caught up',
      icon: Mail,
      to: '/admin/contact',
      highlight: newEnquiries > 0,
    },
  ]

  if (!loaded) {
    return <p className="text-muted-foreground">Loading dashboard...</p>
  }

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.label}
              to={c.to}
              className={`rounded-lg border bg-card p-5 transition-colors hover:border-clay ${
                c.highlight ? 'border-clay/40' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="editorial-eyebrow">{c.label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 font-serif text-3xl">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.sublabel}</p>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl">Deals by status</h2>
          <ul className="space-y-3">
            {DEAL_STATUSES.map((s) => (
              <li key={s}>
                <div className="flex items-center justify-between text-sm">
                  <DealBadge badge={s} />
                  <span className="text-muted-foreground">
                    {dealStatusCounts[s] ?? 0}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-cream">
                  <div
                    className="h-1.5 rounded-full bg-clay"
                    style={{
                      width: `${((dealStatusCounts[s] ?? 0) / maxDealStatusCount) * 100}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl">Recent enquiries</h2>
            <Link
              to="/admin/contact"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-clay hover:underline"
            >
              View all
            </Link>
          </div>
          {recentMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contact queries yet.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {recentMessages.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.name} · {timeAgo(m.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">Recently updated products</h2>
          <Link
            to="/admin/products"
            className="text-xs font-semibold uppercase tracking-[0.12em] text-clay hover:underline"
          >
            View all
          </Link>
        </div>
        {recentlyUpdatedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <ul className="divide-y">
            {recentlyUpdatedProducts.map((p) => (
              <li
                key={p.slug}
                className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(p.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" />
        Looking for click/revenue performance?{' '}
        <Link to="/admin/analytics" className="text-clay hover:underline">
          Open Analytics
        </Link>
      </p>
    </div>
  )
}
