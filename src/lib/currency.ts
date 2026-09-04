const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function useCurrency() {
  return { format: (value: number) => formatter.format(value) }
}
