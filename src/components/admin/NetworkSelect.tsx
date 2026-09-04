import { useState } from 'react'
import { inputClass, selectClass } from './FormField'

const NEW_NETWORK = '__new__'

export function NetworkSelect({
  value,
  networks,
  onChange,
}: {
  value: string
  networks: string[]
  onChange: (value: string) => void
}) {
  const [addingNew, setAddingNew] = useState(
    !networks.includes(value) && value !== '',
  )

  if (addingNew) {
    return (
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="New network name"
          autoFocus
          required
        />
        {networks.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setAddingNew(false)
              onChange(networks[0])
            }}
            className="shrink-0 rounded-sm border px-3 text-xs uppercase tracking-[0.1em] hover:border-clay"
          >
            Cancel
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <select
      className={selectClass}
      value={value}
      onChange={(e) => {
        if (e.target.value === NEW_NETWORK) {
          setAddingNew(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
    >
      {networks.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
      <option value={NEW_NETWORK}>+ Add new network...</option>
    </select>
  )
}
