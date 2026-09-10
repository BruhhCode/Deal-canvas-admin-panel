const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function useCurrency() {
  return { format: (value: number) => formatter.format(value) }
}

// The main DealsCanvas site stores every offers.price/original_price and
// deals.price/original_price value in this legacy base unit rather than raw
// USD (see the site's own src/lib/currency.tsx) — real USD = base / 83.
// Every price this admin panel writes to or reads from those two columns
// must go through these so amounts don't end up 83x off on the live site.
const BASE_TO_USD = 1 / 83

export function toUsd(base: number): number {
  return Math.round(base * BASE_TO_USD * 100) / 100
}

export function fromUsd(usd: number): number {
  return Math.round(usd / BASE_TO_USD)
}
