import { useEffect } from 'react'
import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'Deal Management Dashboard | DealCanvas Admin' },
      {
        name: 'description',
        content:
          'Internal dashboard for managing deals, coupons, affiliate tracking and performance analytics.',
      },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AdminLayout,
})

const tabs = [
  { label: 'Products', to: '/admin/products' },
  { label: 'Brands', to: '/admin/brands' },
  { label: 'Stores', to: '/admin/stores' },
  { label: 'Deals', to: '/admin/deals' },
  { label: 'Sales', to: '/admin/sales' },
  { label: 'Analytics', to: '/admin/analytics' },
  { label: 'Networks', to: '/admin/networks' },
] as const

function AdminLayout() {
  const { isAuthenticated, isReady, user, logout } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [isReady, isAuthenticated, navigate])

  if (!isAuthenticated) return null

  const activeTab =
    tabs.find((t) => pathname.startsWith(t.to))?.label ?? 'Products'

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Breadcrumbs
        items={[{ label: 'Admin', to: '/admin' }, { label: activeTab }]}
      />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="editorial-eyebrow">Internal · admin</p>
          <h1 className="mt-3 text-4xl">Catalogue Management</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-2">
            {tabs.map((t) => {
              const active = pathname.startsWith(t.to)
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                    active
                      ? 'border-clay bg-clay text-clay-foreground'
                      : 'hover:border-clay'
                  }`}
                >
                  {t.label}
                </Link>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate({ to: '/login' })
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-clay"
          >
            {user?.email} <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
