export type Offer = {
  id: string // uuid
  product_slug: string // Product["slug"]
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
  updated_at: string
}

// `slug` is the primary key — the main site's own import script (which now
// owns this table's schema) has no separate synthetic id column.
export type Product = {
  slug: string
  source_id: string
  name: string
  brand: string // Brand["slug"]
  category: string
  subcategory: string
  gender: string
  description: string
  image: string
  images: string[]
  colors: string[]
  sizes: string[]
  tags: string[]
  rating: number
  reviews: number
  views: number
  new_in: boolean
  updated_at: string
}

export type ProductWithOffers = Product & { offers: Offer[] }

export type Brand = {
  slug: string
  name: string
  description: string | null
  category: string | null
  network: string
  featured: boolean
  updated_at: string
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
  updated_at: string
}

export type DealStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'UPCOMING'

export type Deal = {
  id: string
  slug: string
  title: string
  product: string // display name shown in the table
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
  updated_at: string
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
  window: SaleTimeWindow | string
  detail: string
  code: string | null
  updated_at: string
}

// Networks are never stored directly — always derived from Deal.network.
export type Network = {
  name: string
  merchants: number
  deals: number
  clicks: number
}

// The public site's header nav, editable from the admin panel's Navigation
// section instead of hardcoded in the site's Header.tsx.
export type NavItem = {
  slug: string
  label: string
  href: string
  sort_order: number
  visible: boolean
  updated_at: string
}

export type PageStatus = 'DRAFT' | 'PUBLISHED'

// A minimal CMS page. `content` is plain text with paragraphs separated by
// a blank line — same convention the site's guides already use — not HTML,
// so there's no stored-XSS surface from rendering it directly.
export type Page = {
  slug: string
  title: string
  content: string
  meta_description: string | null
  status: PageStatus
  updated_at: string
}

// Grouped by `section` (e.g. "Orders", "Shipping") for the public FAQ page.
export type Faq = {
  id: string
  section: string
  question: string
  answer: string
  sort_order: number
  updated_at: string
}

export type ContactMessageStatus = 'NEW' | 'READ' | 'RESOLVED'

// Written by the public site's /contact form (anon insert-only); the admin
// panel only ever reads/updates-status/deletes, never creates one.
export type ContactMessage = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: ContactMessageStatus
  created_at: string
  updated_at: string
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

// Enforced by a CHECK constraint on brands/stores/deals.network in the
// database — these are the only values Postgres will accept, so the UI
// offers exactly this closed set rather than free text.
export const NETWORKS = [
  'Rakuten Advertising',
  'Impact',
  'Awin',
  'CJ Affiliate',
  'Admitad',
  'Amazon Associates',
] as const
