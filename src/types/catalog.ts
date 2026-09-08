export type Offer = {
  id: string // uuid
  product_id: string
  store: string // Store["slug"]
  price: number
  original_price: number
  currency: string
  availability: string
  product_url: string
  coupon_code: string | null
  shipping: string
  updated_hours_ago: number
  sponsored: boolean
}

export type Product = {
  id: string
  slug: string
  name: string
  brand: string // Brand["slug"]
  category: string
  subcategory: string
  gender: string
  description: string
  image: string
  images: string[] | null
  colors: string[]
  sizes: string[]
  tags: string[]
  rating: number
  reviews: number
  views: number
  new_in: boolean
}

export type ProductWithOffers = Product & { offers: Offer[] }

export type Brand = {
  slug: string
  name: string
  description: string | null
  category: string | null
  network: string
  featured: boolean
}

export type Store = {
  slug: string
  name: string
  description: string | null
  network: string
  domain: string
  campaign: string
  store_id: string
  sub_id: string
  ships_to: string
  store_wide_offer: string | null
  featured: boolean
  sponsored: boolean
}

export type DealStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'UPCOMING'

export type Deal = {
  id: string
  slug: string
  title: string
  product: string // display name shown in the table
  product_id: string | null // Product["id"], optional link
  brand: string // Brand["slug"]
  category: string
  subcategory: string | null
  original_price: number
  price: number
  code: string | null
  deal_type: string
  badges: string[]
  description: string
  terms: string[]
  expires_in_hours: number
  status: DealStatus
  image: string
  tags: string[]
  merchant_url: string
  network: string
  campaign: string
  sub_id: string
  tracking_id: string
  clicks: number
  featured: boolean
  flash: boolean
  sponsored: boolean
}

export type Coupon = {
  id: string
  brand: string // Brand["slug"]
  title: string
  description: string
  code: string
  discount: string
  expires_in_hours: number
  used_today: number
  success_rate: number
}

export type SaleTimeWindow =
  'today' | 'tomorrow' | 'this-week' | 'next-week' | 'this-month'

export type SaleEvent = {
  id: string
  store: string // Store["slug"]
  title: string
  discount: string
  time_window: SaleTimeWindow | string
  detail: string
  code: string | null
}

// Networks are never stored directly — always derived from Deal.network.
export type Network = {
  name: string
  merchants: number
  deals: number
  clicks: number
}

export const CATEGORIES: Record<string, string> = {
  shoes: 'Shoes',
  fashion: 'Fashion',
  beauty: 'Beauty',
  accessories: 'Accessories',
  luxury: 'Luxury',
  lifestyle: 'Lifestyle',
  travel: 'Travel',
  shopping: 'Shopping',
}

export function categoryName(slug: string): string {
  return CATEGORIES[slug] ?? slug
}
