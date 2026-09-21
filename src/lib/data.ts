/**
 * Single data-access module for the admin app. Every read and write in the
 * UI goes through the functions and hooks exported here — they call
 * Supabase directly, so this is the only file that knows about the
 * database.
 */
import { useMemo, useSyncExternalStore } from 'react'
import { supabase } from './supabaseClient'
import type {
  Brand,
  ContactMessage,
  Coupon,
  Deal,
  DealStatus,
  Faq,
  NavItem,
  Network,
  Offer,
  Page,
  Product,
  ProductWithOffers,
  SaleEvent,
  Store,
} from '@/types/catalog'

type DB = {
  products: ProductWithOffers[]
  brands: Brand[]
  stores: Store[]
  deals: Deal[]
  coupons: Coupon[]
  saleEvents: SaleEvent[]
  navItems: NavItem[]
  pages: Page[]
  faqs: Faq[]
  contactMessages: ContactMessage[]
  loaded: boolean
  error: string | null
}

let db: DB = {
  products: [],
  brands: [],
  stores: [],
  deals: [],
  coupons: [],
  saleEvents: [],
  navItems: [],
  pages: [],
  faqs: [],
  contactMessages: [],
  loaded: false,
  error: null,
}

const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return db
}

function getServerSnapshot() {
  return db
}

function set(patch: Partial<DB>) {
  db = { ...db, ...patch }
  notify()
}

// Postgres RLS silently matches zero rows on a blocked UPDATE (no error,
// unlike INSERT's explicit violation) — so a permission problem (e.g. an
// expired session, or an RLS policy change) would otherwise look exactly
// like a successful save that quietly changed nothing. Every update*
// function below asks Supabase to return the updated row(s) and checks it
// actually got at least one, rather than trusting a null `error` alone.
function assertRowsUpdated(rows: unknown[] | null, label: string): void {
  if (!rows || rows.length === 0) {
    throw new Error(
      `${label} update didn't apply — you may need to sign in again.`,
    )
  }
}

// ---------------------------------------------------------------------------
// Fetchers — one per table
// ---------------------------------------------------------------------------

// PostgREST caps an unbounded select at its configured max-rows (1000 on
// this project) instead of erroring — with 1300+ products, a plain select
// silently dropped everything past the cap, so the dashboard couldn't see
// or edit roughly the last third of the catalog. Must be paged.
const PRODUCTS_PAGE_SIZE = 1000

async function fetchProducts(): Promise<ProductWithOffers[]> {
  const rows: ProductWithOffers[] = []
  for (let from = 0; ; from += PRODUCTS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('products')
      .select('*, offers(*)')
      .order('name')
      .range(from, from + PRODUCTS_PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data as ProductWithOffers[]))
    if (!data || data.length < PRODUCTS_PAGE_SIZE) break
  }
  return rows
}

async function fetchBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Brand[]
}

async function fetchStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Store[]
}

async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('title')
  if (error) throw error
  return data as Deal[]
}

async function fetchCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('code')
  if (error) throw error
  return data as Coupon[]
}

async function fetchSaleEvents(): Promise<SaleEvent[]> {
  const { data, error } = await supabase
    .from('sale_events')
    .select('*')
    .order('title')
  if (error) throw error
  return data as SaleEvent[]
}

async function fetchNavItems(): Promise<NavItem[]> {
  const { data, error } = await supabase
    .from('nav_items')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data as NavItem[]
}

async function fetchPages(): Promise<Page[]> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .order('title')
  if (error) throw error
  return data as Page[]
}

async function fetchFaqs(): Promise<Faq[]> {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data as Faq[]
}

async function fetchContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as ContactMessage[]
}

type TableKey =
  | 'products'
  | 'brands'
  | 'stores'
  | 'deals'
  | 'coupons'
  | 'saleEvents'
  | 'navItems'
  | 'pages'
  | 'faqs'
  | 'contactMessages'

const fetchers: Record<TableKey, () => Promise<unknown>> = {
  products: fetchProducts,
  brands: fetchBrands,
  stores: fetchStores,
  deals: fetchDeals,
  coupons: fetchCoupons,
  saleEvents: fetchSaleEvents,
  navItems: fetchNavItems,
  pages: fetchPages,
  faqs: fetchFaqs,
  contactMessages: fetchContactMessages,
}

async function reload(table: TableKey) {
  const data = await fetchers[table]()
  set({ [table]: data })
}

async function loadAll() {
  try {
    const [
      products,
      brands,
      stores,
      deals,
      coupons,
      saleEvents,
      navItems,
      pages,
      faqs,
      contactMessages,
    ] = await Promise.all([
      fetchProducts(),
      fetchBrands(),
      fetchStores(),
      fetchDeals(),
      fetchCoupons(),
      fetchSaleEvents(),
      fetchNavItems(),
      fetchPages(),
      fetchFaqs(),
      fetchContactMessages(),
    ])
    set({
      products,
      brands,
      stores,
      deals,
      coupons,
      saleEvents,
      navItems,
      pages,
      faqs,
      contactMessages,
      loaded: true,
      error: null,
    })
  } catch (err) {
    set({
      loaded: true,
      error: err instanceof Error ? err.message : 'Failed to load data.',
    })
  }
}

void loadAll()

export function reloadAll() {
  return loadAll()
}

// ---------------------------------------------------------------------------
// Hooks — components read state through these.
// ---------------------------------------------------------------------------

function useDb() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useProducts() {
  return useDb().products
}

export function useBrands() {
  return useDb().brands
}

export function useStores() {
  return useDb().stores
}

export function useDeals() {
  return useDb().deals
}

export function useCoupons() {
  return useDb().coupons
}

export function useSaleEvents() {
  return useDb().saleEvents
}

export function useNavItems() {
  return useDb().navItems
}

export function usePages() {
  return useDb().pages
}

export function useFaqs() {
  return useDb().faqs
}

export function useContactMessages() {
  return useDb().contactMessages
}

export function useDataStatus() {
  const { loaded, error } = useDb()
  return { loaded, error }
}

export function useNetworks(): Network[] {
  const { deals, brands } = useDb()
  return useMemo(() => computeNetworks(deals, brands), [deals, brands])
}

// ---------------------------------------------------------------------------
// Computed / pure helpers
// ---------------------------------------------------------------------------

export function computeNetworks(deals: Deal[], brands: Brand[]): Network[] {
  const names = Array.from(new Set(deals.map((d) => d.network)))
  return names.map((name) => ({
    name,
    merchants: brands.filter((b) => b.network === name).length,
    deals: deals.filter((d) => d.network === name).length,
    clicks: deals
      .filter((d) => d.network === name)
      .reduce((s, d) => s + d.clicks, 0),
  }))
}

export function brandName(brands: Brand[], slug: string): string {
  return brands.find((b) => b.slug === slug)?.name ?? slug
}

export function storeName(stores: Store[], slug: string): string {
  return stores.find((s) => s.slug === slug)?.name ?? slug
}

export function discountPct(
  deal: Pick<Deal, 'price' | 'original_price'>,
): number {
  if (!deal.original_price) return 0
  return Math.round((1 - deal.price / deal.original_price) * 100)
}

export function bestOffer(product: ProductWithOffers): Offer | undefined {
  return product.offers.length
    ? product.offers.reduce(
        (best, o) => (o.price < best.price ? o : best),
        product.offers[0],
      )
    : undefined
}

export function offersSorted(product: ProductWithOffers): Offer[] {
  return [...product.offers].sort((a, b) => a.price - b.price)
}

export function productDiscount(product: ProductWithOffers): number {
  const best = bestOffer(product)
  if (!best?.original_price) return 0
  return Math.round((1 - best.price / best.original_price) * 100)
}

export function productsByStore(
  products: ProductWithOffers[],
  slug: string,
): ProductWithOffers[] {
  return products.filter((p) => p.offers.some((o) => o.store === slug))
}

// Real "last touched" time for a product: the most recent of the product
// row's own updated_at and every one of its offers' updated_at (editing an
// offer's price without touching the product row should still count as an
// update to "the product" from an admin's point of view). Superseded the old
// `updated_hours_ago`-based freshnessLabel, which read a plain number typed
// by hand into a form (always 0 on a new/imported row) rather than a real
// timestamp — it never changed on its own, which is why it always looked
// like "1h ago" or "Just now" regardless of when anything actually happened.
export function productLastUpdated(product: ProductWithOffers): string | null {
  const stamps = [product.updated_at, ...product.offers.map((o) => o.updated_at)].filter(
    Boolean,
  )
  if (!stamps.length) return null
  return stamps.reduce((latest, s) => (s > latest ? s : latest))
}

export type ProductStatus = 'ACTIVE' | 'LOW STOCK' | 'OUT OF STOCK'

// Derived, not stored: a product has no status column of its own, but a
// shopper-facing notion of "active" falls straight out of whether any store
// still has it in stock.
export function productStatus(product: ProductWithOffers): ProductStatus {
  if (!product.offers.length) return 'OUT OF STOCK'
  if (product.offers.some((o) => o.availability === 'IN STOCK')) return 'ACTIVE'
  if (product.offers.some((o) => o.availability === 'LOW STOCK')) return 'LOW STOCK'
  return 'OUT OF STOCK'
}

// Stores don't carry a stock/availability concept of their own — "active"
// falls out of whether the store still has any product actually in stock
// anywhere, same idea as productStatus above.
export function storeStatus(
  store: Store,
  products: ProductWithOffers[],
): ProductStatus {
  const own = productsByStore(products, store.slug)
  if (!own.length) return 'OUT OF STOCK'
  if (own.some((p) => p.offers.some((o) => o.availability === 'IN STOCK')))
    return 'ACTIVE'
  if (own.some((p) => p.offers.some((o) => o.availability === 'LOW STOCK')))
    return 'LOW STOCK'
  return 'OUT OF STOCK'
}

// Sale events have no stored expiry timestamp, only a relative category
// (`window`) set by whoever last saved it — so "expired" is approximated as
// that window having elapsed since the row was last touched (e.g. a "today"
// sale not edited since yesterday or earlier no longer means today). This is
// a heuristic, not authoritative data — there's no absolute end-date column
// to check it against.
const WINDOW_SPAN_HOURS: Record<string, number> = {
  today: 24,
  tomorrow: 48,
  'this-week': 24 * 7,
  'next-week': 24 * 14,
  'this-month': 24 * 30,
}

export function saleEventStatus(event: SaleEvent): 'ACTIVE' | 'EXPIRED' {
  const span = WINDOW_SPAN_HOURS[event.window] ?? 24 * 7
  const updated = new Date(event.updated_at).getTime()
  if (Number.isNaN(updated)) return 'ACTIVE'
  const expiresAt = updated + span * 60 * 60 * 1000
  return Date.now() > expiresAt ? 'EXPIRED' : 'ACTIVE'
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

export type BrandInput = Omit<Brand, 'updated_at'>

export async function createBrand(input: BrandInput): Promise<void> {
  const { error } = await supabase
    .from('brands')
    .insert({ ...input, updated_at: new Date().toISOString() })
  if (error) throw error
  await reload('brands')
}

export async function updateBrand(
  slug: string,
  patch: Partial<BrandInput>,
): Promise<void> {
  // No DB trigger bumps updated_at on UPDATE (see time.ts) — every write here
  // must set it itself, or "last updated" would stay frozen at creation time.
  const { data, error } = await supabase
    .from('brands')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select('slug')
  if (error) throw error
  assertRowsUpdated(data, 'Brand')
  await reload('brands')
}

export async function deleteBrand(slug: string): Promise<void> {
  const { error } = await supabase.from('brands').delete().eq('slug', slug)
  if (error) throw error
  await reload('brands')
}

// Inserts brands that don't exist yet, for the "Import feed" auto-create
// flow. Ignores brands that already exist rather than erroring, since a
// re-import of an overlapping feed shouldn't fail on duplicates.
export async function bulkCreateBrands(inputs: BrandInput[]): Promise<void> {
  if (!inputs.length) return
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('brands')
    .upsert(
      inputs.map((b) => ({ ...b, updated_at: now })),
      { onConflict: 'slug', ignoreDuplicates: true },
    )
  if (error) throw error
  await reload('brands')
}

// ---------------------------------------------------------------------------
// Products (+ nested offers)
// ---------------------------------------------------------------------------

export type OfferInput = Omit<Offer, 'id' | 'product_slug' | 'updated_at'>
export type ProductInput = Omit<Product, 'updated_at'> & { offers: OfferInput[] }

export async function createProduct(input: ProductInput): Promise<void> {
  const { offers, ...fields } = input
  const now = new Date().toISOString()
  const { error: productError } = await supabase
    .from('products')
    .insert({ ...fields, updated_at: now })
  if (productError) throw productError
  if (offers.length) {
    const { error: offerError } = await supabase
      .from('offers')
      .insert(offers.map((o) => ({ ...o, product_slug: fields.slug, updated_at: now })))
    if (offerError) throw offerError
  }
  await reload('products')
}

export async function updateProduct(
  slug: string,
  patch: Partial<ProductInput>,
): Promise<void> {
  const { offers, ...fields } = patch
  const targetSlug = fields.slug ?? slug
  const now = new Date().toISOString()

  // `slug` is the products PK and offers reference it via product_slug with
  // no ON UPDATE CASCADE, so renaming the product while its offers still
  // point at the old slug violates the FK. Offers must be detached first,
  // the product renamed second, then the offers re-inserted against the new
  // slug — every caller (ProductForm) always sends the full offers array on
  // every save, so this ordering covers both the rename and non-rename case.
  if (offers) {
    const { error: deleteError } = await supabase
      .from('offers')
      .delete()
      .eq('product_slug', slug)
    if (deleteError) throw deleteError
  }

  if (Object.keys(fields).length) {
    // No DB trigger bumps updated_at on UPDATE (see time.ts) — must set it
    // explicitly, or "last updated" would stay frozen at creation time.
    const { data, error } = await supabase
      .from('products')
      .update({ ...fields, updated_at: now })
      .eq('slug', slug)
      .select('slug')
    if (error) throw error
    assertRowsUpdated(data, 'Product')
  }

  if (offers && offers.length) {
    const { error: insertError } = await supabase
      .from('offers')
      .insert(offers.map((o) => ({ ...o, product_slug: targetSlug, updated_at: now })))
    if (insertError) throw insertError
  }
  await reload('products')
}

export async function deleteProduct(slug: string): Promise<void> {
  await supabase.from('offers').delete().eq('product_slug', slug)
  const { error } = await supabase.from('products').delete().eq('slug', slug)
  if (error) throw error
  await reload('products')
}

// Product status has no column of its own — it's derived from every offer's
// `availability` (see productStatus below) — so the click-to-toggle status
// badge writes `availability` across all of a product's offers at once
// rather than a single field. Collapses LOW STOCK into "active" on click,
// same as the badge's own active/inactive grouping.
export async function setProductAvailability(
  slug: string,
  availability: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('offers')
    .update({ availability, updated_at: new Date().toISOString() })
    .eq('product_slug', slug)
    .select('id')
  if (error) throw error
  assertRowsUpdated(data, 'Product availability')
  await reload('products')
}

// Bulk-creates OR updates products (+ their offers) in batches, for the
// "Import feed" flow — doubles as bulk update: re-importing a CSV containing
// a product_url you already imported before (same auto-derived slug) updates
// that product in place rather than erroring. A plain `insert()` would hit a
// duplicate-key violation on `products.slug` and abort the whole batch, so
// this upserts on slug instead — same idea as updateProduct's offer-replace
// pattern (offers have no natural unique key / nothing to upsert on, so
// every offer for a re-imported product is deleted and reinserted fresh
// rather than merged field-by-field).
export async function bulkImportProducts(
  products: ProductInput[],
  batchSize = 500,
): Promise<{ productCount: number; offerCount: number }> {
  const now = new Date().toISOString()
  const productRows = products.map(({ offers: _offers, ...fields }) => ({
    ...fields,
    updated_at: now,
  }))
  const offerRows = products.flatMap((p) =>
    p.offers.map((o) => ({ ...o, product_slug: p.slug, updated_at: now })),
  )
  const slugs = products.map((p) => p.slug)

  for (let i = 0; i < productRows.length; i += batchSize) {
    const { error } = await supabase
      .from('products')
      .upsert(productRows.slice(i, i + batchSize), { onConflict: 'slug' })
    if (error) throw error
  }
  for (let i = 0; i < slugs.length; i += batchSize) {
    const { error } = await supabase
      .from('offers')
      .delete()
      .in('product_slug', slugs.slice(i, i + batchSize))
    if (error) throw error
  }
  for (let i = 0; i < offerRows.length; i += batchSize) {
    const { error } = await supabase
      .from('offers')
      .insert(offerRows.slice(i, i + batchSize))
    if (error) throw error
  }

  await reload('products')
  return { productCount: productRows.length, offerCount: offerRows.length }
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export type StoreInput = Omit<Store, 'updated_at'>

export async function createStore(input: StoreInput): Promise<void> {
  const { error } = await supabase
    .from('stores')
    .insert({ ...input, updated_at: new Date().toISOString() })
  if (error) throw error
  await reload('stores')
}

export async function updateStore(
  slug: string,
  patch: Partial<StoreInput>,
): Promise<void> {
  const { data, error } = await supabase
    .from('stores')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select('slug')
  if (error) throw error
  assertRowsUpdated(data, 'Store')
  await reload('stores')
}

export async function deleteStore(slug: string): Promise<void> {
  const { error } = await supabase.from('stores').delete().eq('slug', slug)
  if (error) throw error
  await reload('stores')
}

// Same idea as setProductAvailability, but store-wide — writes every offer
// at that store, which can span many products, so callers should confirm
// with the affected count first rather than firing this on a bare click.
export async function setStoreAvailability(
  slug: string,
  availability: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('offers')
    .update({ availability, updated_at: new Date().toISOString() })
    .eq('store', slug)
    .select('id')
  if (error) throw error
  assertRowsUpdated(data, 'Store availability')
  await reload('products')
}

// See bulkCreateBrands — same "insert if missing" behavior for stores.
export async function bulkCreateStores(inputs: StoreInput[]): Promise<void> {
  if (!inputs.length) return
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('stores')
    .upsert(
      inputs.map((s) => ({ ...s, updated_at: now })),
      { onConflict: 'slug', ignoreDuplicates: true },
    )
  if (error) throw error
  await reload('stores')
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export type DealInput = Omit<Deal, 'id' | 'clicks' | 'status' | 'updated_at'> & {
  clicks?: number
  status?: DealStatus
}

export async function createDeal(input: DealInput): Promise<void> {
  const id = `DL-${Date.now().toString(36)}`
  const { error } = await supabase.from('deals').insert({
    ...input,
    id,
    clicks: input.clicks ?? 0,
    status: input.status ?? 'ACTIVE',
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
  await reload('deals')
}

export async function updateDeal(
  id: string,
  patch: Partial<DealInput>,
): Promise<void> {
  const { data, error } = await supabase
    .from('deals')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw error
  assertRowsUpdated(data, 'Deal')
  await reload('deals')
}

export async function setDealStatus(
  id: string,
  status: DealStatus,
): Promise<void> {
  return updateDeal(id, { status })
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) throw error
  await reload('deals')
}

// ---------------------------------------------------------------------------
// Sale events
// ---------------------------------------------------------------------------

export type SaleEventInput = Omit<SaleEvent, 'id' | 'updated_at'>

export async function createSaleEvent(input: SaleEventInput): Promise<void> {
  const id = `SE-${Date.now().toString(36)}`
  const { error } = await supabase
    .from('sale_events')
    .insert({ ...input, id, updated_at: new Date().toISOString() })
  if (error) throw error
  await reload('saleEvents')
}

export async function updateSaleEvent(
  id: string,
  patch: Partial<SaleEventInput>,
): Promise<void> {
  const { data, error } = await supabase
    .from('sale_events')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw error
  assertRowsUpdated(data, 'Sale event')
  await reload('saleEvents')
}

export async function deleteSaleEvent(id: string): Promise<void> {
  const { error } = await supabase.from('sale_events').delete().eq('id', id)
  if (error) throw error
  await reload('saleEvents')
}

// ---------------------------------------------------------------------------
// Nav items — the public site's header nav (see src/scripts/create-cms-tables.sql)
// ---------------------------------------------------------------------------

export type NavItemInput = Omit<NavItem, 'updated_at'>

export async function createNavItem(input: NavItemInput): Promise<void> {
  const { error } = await supabase
    .from('nav_items')
    .insert({ ...input, updated_at: new Date().toISOString() })
  if (error) throw error
  await reload('navItems')
}

export async function updateNavItem(
  slug: string,
  patch: Partial<NavItemInput>,
): Promise<void> {
  const { data, error } = await supabase
    .from('nav_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select('slug')
  if (error) throw error
  assertRowsUpdated(data, 'Nav item')
  await reload('navItems')
}

export async function deleteNavItem(slug: string): Promise<void> {
  const { error } = await supabase.from('nav_items').delete().eq('slug', slug)
  if (error) throw error
  await reload('navItems')
}

// ---------------------------------------------------------------------------
// Pages (CMS)
// ---------------------------------------------------------------------------

export type PageInput = Omit<Page, 'updated_at'>

export async function createPage(input: PageInput): Promise<void> {
  const { error } = await supabase
    .from('pages')
    .insert({ ...input, updated_at: new Date().toISOString() })
  if (error) throw error
  await reload('pages')
}

export async function updatePage(
  slug: string,
  patch: Partial<PageInput>,
): Promise<void> {
  const { data, error } = await supabase
    .from('pages')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select('slug')
  if (error) throw error
  assertRowsUpdated(data, 'Page')
  await reload('pages')
}

export async function deletePage(slug: string): Promise<void> {
  const { error } = await supabase.from('pages').delete().eq('slug', slug)
  if (error) throw error
  await reload('pages')
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

export type FaqInput = Omit<Faq, 'id' | 'updated_at'>

export async function createFaq(input: FaqInput): Promise<void> {
  const id = `FAQ-${Date.now().toString(36)}`
  const { error } = await supabase
    .from('faqs')
    .insert({ ...input, id, updated_at: new Date().toISOString() })
  if (error) throw error
  await reload('faqs')
}

export async function updateFaq(
  id: string,
  patch: Partial<FaqInput>,
): Promise<void> {
  const { data, error } = await supabase
    .from('faqs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw error
  assertRowsUpdated(data, 'FAQ')
  await reload('faqs')
}

export async function deleteFaq(id: string): Promise<void> {
  const { error } = await supabase.from('faqs').delete().eq('id', id)
  if (error) throw error
  await reload('faqs')
}

// ---------------------------------------------------------------------------
// Contact messages — written only by the public site's /contact form; this
// app never creates one, only triages (status) and deletes.
// ---------------------------------------------------------------------------

export async function setContactMessageStatus(
  id: string,
  status: ContactMessage['status'],
): Promise<void> {
  const { data, error } = await supabase
    .from('contact_messages')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw error
  assertRowsUpdated(data, 'Contact message')
  await reload('contactMessages')
}

export async function deleteContactMessage(id: string): Promise<void> {
  const { error } = await supabase.from('contact_messages').delete().eq('id', id)
  if (error) throw error
  await reload('contactMessages')
}
