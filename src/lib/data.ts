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
  Coupon,
  Deal,
  DealStatus,
  Network,
  Offer,
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

// ---------------------------------------------------------------------------
// Fetchers — one per table
// ---------------------------------------------------------------------------

async function fetchProducts(): Promise<ProductWithOffers[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, offers(*)')
    .order('name')
  if (error) throw error
  return data as ProductWithOffers[]
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

type TableKey =
  'products' | 'brands' | 'stores' | 'deals' | 'coupons' | 'saleEvents'

const fetchers: Record<TableKey, () => Promise<unknown>> = {
  products: fetchProducts,
  brands: fetchBrands,
  stores: fetchStores,
  deals: fetchDeals,
  coupons: fetchCoupons,
  saleEvents: fetchSaleEvents,
}

async function reload(table: TableKey) {
  const data = await fetchers[table]()
  set({ [table]: data })
}

async function loadAll() {
  try {
    const [products, brands, stores, deals, coupons, saleEvents] =
      await Promise.all([
        fetchProducts(),
        fetchBrands(),
        fetchStores(),
        fetchDeals(),
        fetchCoupons(),
        fetchSaleEvents(),
      ])
    set({
      products,
      brands,
      stores,
      deals,
      coupons,
      saleEvents,
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

export function freshnessLabel(product: ProductWithOffers): string {
  if (!product.offers.length) return '—'
  const hours = Math.min(...product.offers.map((o) => o.updated_hours_ago))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
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

export type BrandInput = Brand

export async function createBrand(input: BrandInput): Promise<void> {
  const { error } = await supabase.from('brands').insert(input)
  if (error) throw error
  await reload('brands')
}

export async function updateBrand(
  slug: string,
  patch: Partial<BrandInput>,
): Promise<void> {
  const { error } = await supabase.from('brands').update(patch).eq('slug', slug)
  if (error) throw error
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
  const { error } = await supabase
    .from('brands')
    .upsert(inputs, { onConflict: 'slug', ignoreDuplicates: true })
  if (error) throw error
  await reload('brands')
}

// ---------------------------------------------------------------------------
// Products (+ nested offers)
// ---------------------------------------------------------------------------

export type OfferInput = Omit<Offer, 'id' | 'product_slug'>
export type ProductInput = Product & { offers: OfferInput[] }

export async function createProduct(input: ProductInput): Promise<void> {
  const { offers, ...fields } = input
  const { error: productError } = await supabase.from('products').insert(fields)
  if (productError) throw productError
  if (offers.length) {
    const { error: offerError } = await supabase
      .from('offers')
      .insert(offers.map((o) => ({ ...o, product_slug: fields.slug })))
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
    const { error } = await supabase
      .from('products')
      .update(fields)
      .eq('slug', slug)
    if (error) throw error
  }

  if (offers && offers.length) {
    const { error: insertError } = await supabase
      .from('offers')
      .insert(offers.map((o) => ({ ...o, product_slug: targetSlug })))
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

// Bulk-creates products (+ their offers) in batches, for the "Import feed"
// flow. Existing products with the same slug are left untouched (use
// updateProduct for those).
export async function bulkImportProducts(
  products: ProductInput[],
  batchSize = 500,
): Promise<{ productCount: number; offerCount: number }> {
  const productRows = products.map(({ offers: _offers, ...fields }) => fields)
  const offerRows = products.flatMap((p) =>
    p.offers.map((o) => ({ ...o, product_slug: p.slug })),
  )

  for (let i = 0; i < productRows.length; i += batchSize) {
    const { error } = await supabase
      .from('products')
      .insert(productRows.slice(i, i + batchSize))
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

export type StoreInput = Store

export async function createStore(input: StoreInput): Promise<void> {
  const { error } = await supabase.from('stores').insert(input)
  if (error) throw error
  await reload('stores')
}

export async function updateStore(
  slug: string,
  patch: Partial<StoreInput>,
): Promise<void> {
  const { error } = await supabase.from('stores').update(patch).eq('slug', slug)
  if (error) throw error
  await reload('stores')
}

export async function deleteStore(slug: string): Promise<void> {
  const { error } = await supabase.from('stores').delete().eq('slug', slug)
  if (error) throw error
  await reload('stores')
}

// See bulkCreateBrands — same "insert if missing" behavior for stores.
export async function bulkCreateStores(inputs: StoreInput[]): Promise<void> {
  if (!inputs.length) return
  const { error } = await supabase
    .from('stores')
    .upsert(inputs, { onConflict: 'slug', ignoreDuplicates: true })
  if (error) throw error
  await reload('stores')
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export type DealInput = Omit<Deal, 'id' | 'clicks' | 'status'> & {
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
  })
  if (error) throw error
  await reload('deals')
}

export async function updateDeal(
  id: string,
  patch: Partial<DealInput>,
): Promise<void> {
  const { error } = await supabase.from('deals').update(patch).eq('id', id)
  if (error) throw error
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

export type SaleEventInput = Omit<SaleEvent, 'id'>

export async function createSaleEvent(input: SaleEventInput): Promise<void> {
  const id = `SE-${Date.now().toString(36)}`
  const { error } = await supabase.from('sale_events').insert({ ...input, id })
  if (error) throw error
  await reload('saleEvents')
}

export async function updateSaleEvent(
  id: string,
  patch: Partial<SaleEventInput>,
): Promise<void> {
  const { error } = await supabase
    .from('sale_events')
    .update(patch)
    .eq('id', id)
  if (error) throw error
  await reload('saleEvents')
}

export async function deleteSaleEvent(id: string): Promise<void> {
  const { error } = await supabase.from('sale_events').delete().eq('id', id)
  if (error) throw error
  await reload('saleEvents')
}
