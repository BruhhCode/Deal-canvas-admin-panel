import { useEffect, useState } from 'react'
import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import {
  BarChart3,
  CalendarDays,
  LogOut,
  Menu,
  Network,
  Package,
  Percent,
  Store,
  Tags,
  X,
} from 'lucide-react'
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
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Brands', to: '/admin/brands', icon: Tags },
  { label: 'Stores', to: '/admin/stores', icon: Store },
  { label: 'Deals', to: '/admin/deals', icon: Percent },
  { label: 'Sales', to: '/admin/sales', icon: CalendarDays },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  { label: 'Networks', to: '/admin/networks', icon: Network },
] as const

function AdminLayout() {
  const { isAuthenticated, isReady, user, logout } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [isReady, isAuthenticated, navigate])

  // Closing on route change means the drawer never lingers open after
  // tapping a link on mobile.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  if (!isAuthenticated) return null

  const activeTab =
    tabs.find((t) => pathname.startsWith(t.to))?.label ?? 'Products'

  function signOut() {
    logout()
    navigate({ to: '/login' })
  }

  const navLinks = (
    <nav className="flex-1 space-y-1">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.to)
        const Icon = t.icon
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
              active
                ? 'bg-clay text-clay-foreground'
                : 'text-foreground hover:bg-cream'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t.label}
          </Link>
        )
      })}
    </nav>
  )

  const accountFooter = (
    <div className="border-t pt-4">
      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      <button
        type="button"
        onClick={signOut}
        className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-clay"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </button>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — always visible, sticky so it stays put while the
          content area scrolls. */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r bg-card px-4 py-6 md:flex">
        <p className="editorial-eyebrow px-3">DealsCanvas</p>
        <p className="mb-6 px-3 text-lg font-semibold">Admin</p>
        {navLinks}
        {accountFooter}
      </aside>

      {/* Mobile: a top bar with a menu button opens the same nav as a
          slide-in drawer, since a permanent sidebar doesn't fit narrow
          screens. */}
      <div className="flex min-h-screen flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-sm border p-1.5"
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold">DealsCanvas Admin</p>
          <div className="w-7" />
        </div>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card px-4 py-6 shadow-card">
              <div className="mb-6 flex items-center justify-between px-3">
                <div>
                  <p className="editorial-eyebrow">DealsCanvas</p>
                  <p className="text-lg font-semibold">Admin</p>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-sm border p-1.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {navLinks}
              {accountFooter}
            </aside>
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          <Breadcrumbs
            items={[{ label: 'Admin', to: '/admin' }, { label: activeTab }]}
          />
          <header className="mb-8 border-b pb-6">
            <p className="editorial-eyebrow">Internal · admin</p>
            <h1 className="mt-3 text-4xl">Catalogue Management</h1>
          </header>

          <Outlet />
        </div>
      </div>
    </div>
  )
}
