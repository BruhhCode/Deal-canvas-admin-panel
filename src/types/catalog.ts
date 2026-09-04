export type Offer = {
  store: string // Store["slug"]
  price: number
  originalPrice?: number
}

export type Product = {
  id: string
  slug: string
  name: string
  brand: string // Brand["slug"]
  category: string // Category slug, resolved via categoryName()
  offers: Offer[]
  updatedAt: string // ISO date string
}

export type Brand = {
  slug: string
  name: string
  network: string
}

export type Store = {
  slug: string
  name: string
  network: string
  campaign: string
  storeId: string
}

export type DealStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED'

export type Deal = {
  id: string
  title: string // internal/search title
  product: string // product display name shown in the table
  brand: string // Brand["slug"]
  price: number
  originalPrice: number
  code?: string
  network: string
  clicks: number
  status: DealStatus
}

export type Coupon = {
  id: string
  code: string
  usedToday: number
  successRate: number
}

export type SaleWindow = 'today' | 'tomorrow' | 'this-week' | 'next-week'

export type SaleEvent = {
  id: string
  window: SaleWindow
  title: string
  discount: string
  code?: string
  store: string // Store["slug"]
  detail: string
  featured: boolean
  expired: boolean
}

// Networks are never stored directly — always derived from Deal.network.
export type Network = {
  name: string
  merchants: number
  deals: number
  clicks: number
}

export const CATEGORIES: Record<string, string> = {
  sneakers: 'Sneakers',
  apparel: 'Apparel',
  outerwear: 'Outerwear',
  accessories: 'Accessories',
  bags: 'Bags',
  beauty: 'Beauty',
}

export function categoryName(slug: string): string {
  return CATEGORIES[slug] ?? slug
}
