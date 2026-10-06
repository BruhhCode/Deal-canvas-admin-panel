import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { SiteFilterForm } from '@/components/admin/SiteFilterForm'
import { StatusToggle } from '@/components/admin/StatusToggle'
import { useUndoableDelete } from '@/components/admin/useUndoableDelete'
import { timeAgo, useLiveNow } from '@/lib/time'
import { deleteSiteFilter, updateSiteFilter, useSiteFilters, useDataStatus } from '@/lib/data'
import { FILTER_KEYS_BY_SECTION, type FilterSection, type SiteFilter } from '@/types/catalog'

export const Route = createFileRoute('/admin/filters')({
  component: FiltersTab,
})

const STYLE_LABEL: Record<string, string> = {
  dropdown: 'Dropdown',
  chips: 'Chip buttons',
  'checkbox-list': 'Checkbox list',
}

function describeControl(f: SiteFilter): string {
  if (f.control_type === 'range') return `Range (${f.min_value}–${f.max_value}, step ${f.step_value})`
  if (f.control_type === 'checkbox') return 'Toggle'
  return f.display_style ? STYLE_LABEL[f.display_style] ?? f.display_style : '—'
}

function FilterSectionTable({
  section,
  title,
  description,
  filters,
  loaded,
}: {
  section: FilterSection
  title: string
  description: string
  filters: SiteFilter[]
  loaded: boolean
}) {
  const [editing, setEditing] = useState<SiteFilter | 'new' | null>(null)
  const [deleting, setDeleting] = useState<SiteFilter | null>(null)
  const { isHidden, scheduleDelete } = useUndoableDelete(deleteSiteFilter, 'Failed to delete filter.')

  const rows = useMemo(
    () => filters.filter((f) => !isHidden(f.id)).sort((a, b) => a.sort_order - b.sort_order),
    [filters, isHidden],
  )

  const allKeysUsed = rows.length >= FILTER_KEYS_BY_SECTION[section].length

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          disabled={allKeysUsed}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
          title={allKeysUsed ? 'Every filter for this section already has a row.' : undefined}
        >
          + Add filter
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Filter</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Style</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.key}</td>
                <td className="px-4 py-3">{f.label}</td>
                <td className="px-4 py-3 text-muted-foreground">{describeControl(f)}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.sort_order}</td>
                <td className="px-4 py-3">
                  <StatusToggle
                    active={f.enabled}
                    activeLabel="SHOWN"
                    inactiveLabel="HIDDEN"
                    onToggle={(next) => updateSiteFilter(f.id, { enabled: next })}
                    errorFallback="Failed to update filter visibility."
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{timeAgo(f.updated_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Edit filter ${f.label}`}
                      onClick={() => setEditing(f)}
                      className="flex h-11 w-11 items-center justify-center rounded-sm border hover:border-clay hover:text-clay"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete filter ${f.label}`}
                      onClick={() => setDeleting(f)}
                      className="flex h-11 w-11 items-center justify-center rounded-sm border hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  {loaded ? 'No filters configured — the site is using its built-in defaults.' : 'Loading filters...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal title={editing === 'new' ? 'Add filter' : 'Edit filter'} onClose={() => setEditing(null)} size="xl">
          <SiteFilterForm
            filter={editing === 'new' ? undefined : editing}
            section={section}
            existingKeys={rows.map((r) => r.key)}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete filter"
          description="This removes the override — the site falls back to this filter's built-in default (still visible) rather than hiding it entirely. To hide it instead, use the Status toggle."
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            scheduleDelete(deleting.id, deleting.label)
            setDeleting(null)
          }}
        />
      ) : null}
    </section>
  )
}

function FiltersTab() {
  const filters = useSiteFilters()
  const { loaded, error } = useDataStatus()
  useLiveNow()

  const shopFilters = useMemo(() => filters.filter((f) => f.section === 'shop'), [filters])
  const dealsFilters = useMemo(() => filters.filter((f) => f.section === 'deals'), [filters])

  return (
    <>
      {error ? (
        <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load filters: {error}
        </p>
      ) : null}

      <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
        Controls the filter sidebar on the site's <code>/shop</code> and <code>/deals</code> pages — which filters
        show, their label, display style (dropdown, chip buttons, or a checkbox list), order, option lists and range
        bounds. A filter with no row here still shows on the site using its built-in default.
      </p>

      <FilterSectionTable
        section="shop"
        title="Shop page filters"
        description="The filter sidebar on /shop: Category, Shopping For, Max price, Brand, and the Sort control."
        filters={shopFilters}
        loaded={loaded}
      />

      <FilterSectionTable
        section="deals"
        title="Deals page filters"
        description="The filter sidebar on /deals: Category, Brand, Deal type, Minimum discount, Max price, Include expired, and Sort."
        filters={dealsFilters}
        loaded={loaded}
      />
    </>
  )
}
