import { selectClass } from './FormField'
import { NETWORKS } from '@/types/catalog'

// A closed dropdown, not free text — the database rejects any network name
// outside this list via a CHECK constraint.
export function NetworkSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <select
      className={selectClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {NETWORKS.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  )
}
