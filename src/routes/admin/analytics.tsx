import { createFileRoute } from '@tanstack/react-router'
import { useCurrency } from '@/lib/currency'
import { useBrands, useCoupons, useDeals } from '@/lib/data'

export const Route = createFileRoute('/admin/analytics')({
  component: AnalyticsTab,
})

function AnalyticsTab() {
  const deals = useDeals()
  const brands = useBrands()
  const coupons = useCoupons()
  const { format } = useCurrency()

  const totalClicks = deals.reduce((s, d) => s + d.clicks, 0)
  const affiliateClicks = Math.round(totalClicks * 0.82)
  const conversions = Math.round(affiliateClicks * 0.041)
  const revenue = conversions * 640

  const topBrands = brands
    .map((b) => ({
      ...b,
      clicks: deals
        .filter((d) => d.brand === b.slug)
        .reduce((s, d) => s + d.clicks, 0),
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 6)

  const stats = [
    { label: 'Total clicks', value: totalClicks.toLocaleString('en-US') },
    {
      label: 'Affiliate clicks',
      value: affiliateClicks.toLocaleString('en-US'),
    },
    { label: 'CTR', value: '6.4%' },
    { label: 'Conversion rate', value: '4.1%' },
    { label: 'Revenue (30d)', value: format(revenue) },
    {
      label: 'EPC',
      value: format(
        affiliateClicks ? Math.round(revenue / affiliateClicks) : 0,
      ),
    },
  ]

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-5">
            <p className="editorial-eyebrow">{s.label}</p>
            <p className="mt-2 font-serif text-3xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl">Top brands by clicks</h2>
          <ul className="space-y-3">
            {topBrands.map((b) => (
              <li key={b.slug}>
                <div className="flex justify-between text-sm">
                  <span>{b.name}</span>
                  <span className="text-muted-foreground">
                    {b.clicks.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-cream">
                  <div
                    className="h-1.5 rounded-full bg-clay"
                    style={{
                      width: `${topBrands[0].clicks ? (b.clicks / topBrands[0].clicks) * 100 : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl">Top performing coupons</h2>
          <ul className="space-y-3 text-sm">
            {coupons
              .slice()
              .sort((a, b) => b.usedToday - a.usedToday)
              .slice(0, 6)
              .map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between border-b pb-2 last:border-0"
                >
                  <span className="font-mono text-xs">{c.code}</span>
                  <span className="text-muted-foreground">
                    {c.usedToday} uses · {c.successRate}% success
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
