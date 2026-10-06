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

// Homepage image banners, editable from the admin panel instead of being
// hardcoded in the site (HeroCarousel.tsx's SLIDES array, and index.tsx's
// promoBanners array). 'hero' = the full-bleed rotating slides behind the
// homepage's search box; 'promo' = the 3-across banner row further down the
// page. title/subtitle/href only render for 'promo' — the hero slides are
// purely decorative background images with no text of their own.
export type BannerPlacement = 'hero' | 'promo'

export type Banner = {
  id: string
  placement: BannerPlacement
  image_url: string
  alt: string
  title: string | null
  subtitle: string | null
  href: string | null
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

// Not a DB CHECK constraint (faqs.page is plain text) — just the closed set
// the admin UI offers tabs for. Add a new site page here when it gets its
// own FAQ block.
export const FAQ_PAGES = {
  general: 'General (FAQ page)',
  homepage: 'Homepage',
  deals: 'Deals page',
  stores: 'Store pages',
  brands: 'Brand pages',
} as const
export type FaqPage = keyof typeof FAQ_PAGES

// Grouped by `page` (which site page it appears on) then by `section`
// (e.g. "Orders", "Shipping") within that page.
export type Faq = {
  id: string
  page: FaqPage
  section: string
  question: string
  answer: string
  sort_order: number
  updated_at: string
}

// Not a DB CHECK constraint (blog_posts.category is plain text) — just the
// closed set the admin UI suggests via a datalist, same convention as FAQ's
// section field. Free text is still accepted for a category not listed here.
export const BLOG_CATEGORIES = ['Fashion', 'Beauty', 'Shopping Tips', 'Lifestyle', 'Trends']

// The site's /blog and /blog/$slug editorial content, previously hardcoded
// in src/data/blog.ts on the site. `body` is plain text with paragraphs
// separated by a blank line — same convention as `Page.content`. Only
// `status = 'PUBLISHED'` posts are readable by the site's anon key; `status
// = 'DRAFT'` lets a post be written and previewed here before it goes live.
export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  category: string
  read_time: string
  author: string
  image_url: string
  body: string
  status: PageStatus
  published_at: string
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

// Controls the filters on the site's /shop and /deals listing pages,
// previously hardcoded directly in those route files. `key` identifies
// which hardcoded filter a row overrides — the site only recognizes a fixed
// set per section (see FILTER_KEYS_BY_SECTION below and
// docs/shared-context.md), it isn't a free-form "any filter" system.
export type FilterSection = 'shop' | 'deals'
export type FilterControlType = 'select' | 'range' | 'checkbox' | 'sort'
export type FilterDisplayStyle = 'dropdown' | 'chips' | 'checkbox-list'

export type FilterOption = { value: string; label: string }

// `options`: null means "use the site's own data-derived list" for filters
// backed by live catalog data (category/brand/dealType) — only meaningful
// to set explicitly for gender/sort, whose options aren't derived from data.
// `min_value`/`max_value`/`step_value` only apply to control_type 'range'.
export type SiteFilter = {
  id: string
  section: FilterSection
  key: string
  label: string
  control_type: FilterControlType
  display_style: FilterDisplayStyle | null
  enabled: boolean
  sort_order: number
  options: FilterOption[] | null
  min_value: number | null
  max_value: number | null
  step_value: number | null
  updated_at: string
}

// The only keys the site actually reads per section (src/routes/shop.tsx,
// src/routes/deals.tsx in the site repo) — the admin UI offers these as a
// closed set per section rather than free text, so a row can't be created
// that the site silently ignores.
export const FILTER_KEYS_BY_SECTION: Record<FilterSection, { key: string; label: string; control_type: FilterControlType }[]> = {
  shop: [
    { key: 'category', label: 'Category', control_type: 'select' },
    { key: 'gender', label: 'Shopping For', control_type: 'select' },
    { key: 'price', label: 'Max price', control_type: 'range' },
    { key: 'brand', label: 'Brand', control_type: 'select' },
    { key: 'sort', label: 'Sort', control_type: 'sort' },
  ],
  deals: [
    { key: 'category', label: 'Category', control_type: 'select' },
    { key: 'brand', label: 'Brand', control_type: 'select' },
    { key: 'dealType', label: 'Deal type', control_type: 'select' },
    { key: 'discount', label: 'Minimum discount', control_type: 'range' },
    { key: 'price', label: 'Max price', control_type: 'range' },
    { key: 'includeExpired', label: 'Include expired deals', control_type: 'checkbox' },
    { key: 'sort', label: 'Sort', control_type: 'sort' },
  ],
}
