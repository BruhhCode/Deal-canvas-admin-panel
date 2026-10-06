import { useState } from 'react'
import { FormField, errorMessage, inputClass, selectClass } from './FormField'
import { useToast } from './Toast'
import {
  FILTER_KEYS_BY_SECTION,
  type FilterDisplayStyle,
  type FilterSection,
  type SiteFilter,
} from '@/types/catalog'
import { createSiteFilter, updateSiteFilter } from '@/lib/data'

const DISPLAY_STYLES: { value: FilterDisplayStyle; label: string }[] = [
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'chips', label: 'Chip buttons' },
  { value: 'checkbox-list', label: 'Checkbox list' },
]

// Serializes options as one "value|Label" per line so a non-technical admin
// never has to hand-edit JSON — parsed back into {value,label}[] on submit.
function optionsToText(options: SiteFilter['options']): string {
  return (options ?? []).map((o) => `${o.value}|${o.label}`).join('\n')
}

function textToOptions(text: string): SiteFilter['options'] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return null
  return lines.map((line) => {
    const [value, ...rest] = line.split('|')
    const label = rest.join('|').trim()
    return { value: (value ?? '').trim(), label: label || (value ?? '').trim() }
  })
}

export function SiteFilterForm({
  filter,
  section,
  existingKeys,
  onDone,
  onCancel,
}: {
  filter?: SiteFilter
  /** Fixed when adding a new filter from a given section's "Add filter" button. */
  section: FilterSection
  /** Keys already in use for this section, so the key picker only offers what's left. */
  existingKeys: string[]
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const availableKeys = FILTER_KEYS_BY_SECTION[section].filter(
    (k) => filter?.key === k.key || !existingKeys.includes(k.key),
  )
  const [key, setKey] = useState(filter?.key ?? availableKeys[0]?.key ?? '')
  const keyDef = FILTER_KEYS_BY_SECTION[section].find((k) => k.key === key)
  const controlType = keyDef?.control_type ?? 'select'

  const [label, setLabel] = useState(filter?.label ?? keyDef?.label ?? '')
  const [displayStyle, setDisplayStyle] = useState<FilterDisplayStyle>(filter?.display_style ?? 'dropdown')
  const [enabled, setEnabled] = useState(filter?.enabled ?? true)
  const [sortOrder, setSortOrder] = useState(filter?.sort_order ?? 0)
  const [optionsText, setOptionsText] = useState(optionsToText(filter?.options ?? null))
  const [minValue, setMinValue] = useState(filter?.min_value ?? 0)
  const [maxValue, setMaxValue] = useState(filter?.max_value ?? 100)
  const [stepValue, setStepValue] = useState(filter?.step_value ?? 1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!key) {
      setError('Pick which filter this row configures.')
      return
    }
    if (!label.trim()) {
      setError('Label is required.')
      return
    }

    const input = {
      section,
      key,
      label: label.trim(),
      control_type: controlType,
      display_style: controlType === 'select' || controlType === 'sort' ? displayStyle : null,
      enabled,
      sort_order: sortOrder,
      options: controlType === 'select' || controlType === 'sort' ? textToOptions(optionsText) : null,
      min_value: controlType === 'range' ? minValue : null,
      max_value: controlType === 'range' ? maxValue : null,
      step_value: controlType === 'range' ? stepValue : null,
    }

    setSaving(true)
    try {
      if (filter) {
        await updateSiteFilter(filter.id, input)
      } else {
        await createSiteFilter(input)
      }
      toast.show(filter ? 'Filter updated' : 'Filter added')
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save filter.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <FormField label="Which filter">
        <select
          className={selectClass}
          value={key}
          disabled={!!filter}
          onChange={(e) => {
            const k = e.target.value
            setKey(k)
            const def = FILTER_KEYS_BY_SECTION[section].find((x) => x.key === k)
            if (def) setLabel(def.label)
          }}
        >
          {availableKeys.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Label shown on the site">
        <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} required />
      </FormField>

      {controlType === 'select' || controlType === 'sort' ? (
        <>
          <FormField label="Display style">
            <select
              className={selectClass}
              value={displayStyle}
              onChange={(e) => setDisplayStyle(e.target.value as FilterDisplayStyle)}
            >
              {DISPLAY_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={
              key === 'category' || key === 'brand' || key === 'dealType'
                ? 'Options override — one "value|Label" per line (leave blank to use the site’s own full list)'
                : 'Options — one "value|Label" per line'
            }
          >
            <textarea
              className={inputClass}
              rows={5}
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder={'women|Women\nmen|Men'}
            />
          </FormField>
        </>
      ) : null}

      {controlType === 'range' ? (
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Min">
            <input
              type="number"
              className={inputClass}
              value={minValue}
              onChange={(e) => setMinValue(Number(e.target.value))}
            />
          </FormField>
          <FormField label="Max">
            <input
              type="number"
              className={inputClass}
              value={maxValue}
              onChange={(e) => setMaxValue(Number(e.target.value))}
            />
          </FormField>
          <FormField label="Step">
            <input
              type="number"
              className={inputClass}
              value={stepValue}
              onChange={(e) => setStepValue(Number(e.target.value))}
            />
          </FormField>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Order (lower shows first)">
          <input
            type="number"
            className={inputClass}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </FormField>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Shown on the site
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:border-clay"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !key}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-60"
        >
          {saving ? 'Saving...' : filter ? 'Save changes' : 'Add filter'}
        </button>
      </div>
    </form>
  )
}
