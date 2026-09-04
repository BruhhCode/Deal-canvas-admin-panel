import { createFileRoute } from '@tanstack/react-router'
import { DealBadge } from '@/components/DealBadge'
import { useNetworks } from '@/lib/data'

export const Route = createFileRoute('/admin/networks')({
  component: NetworksTab,
})

function NetworksTab() {
  const networks = useNetworks()

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-cream text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Affiliate network</th>
            <th className="px-4 py-3">Merchants</th>
            <th className="px-4 py-3">Deals</th>
            <th className="px-4 py-3">Clicks</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {networks.map((n) => (
            <tr key={n.name} className="border-t">
              <td className="px-4 py-3">{n.name}</td>
              <td className="px-4 py-3">{n.merchants}</td>
              <td className="px-4 py-3">{n.deals}</td>
              <td className="px-4 py-3">{n.clicks.toLocaleString('en-US')}</td>
              <td className="px-4 py-3">
                <DealBadge badge="ACTIVE" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Tracking links are generated per deal from merchant URL + network +
        campaign + sub-ID, so new networks can be added without changing the
        storefront.
      </p>
    </div>
  )
}
