/**
 * Single data-access module for the admin app.
 *
 * Every read and write in the UI goes through the functions and hooks
 * exported here. Internally this currently operates on an in-memory store
 * seeded with mock data. Swapping to Supabase/Firebase later means
 * rewriting the bodies of the functions below — no component should need
 * to change.
 */
import { useMemo, useSyncExternalStore } from 'react'
import {
  seedBrands,
  seedCoupons,
  seedDeals,
  seedProducts,
  seedSaleEvents,
  seedStores,
} from '@/data/seed'
import type {
  Brand,
  Coupon,
  Deal,
  DealStatus,
  Network,
  Offer,
  Product,
  SaleEvent,
  Store,
} from '@/types/catalog'

type DB = {
  products: Product[]
  brands: Brand[]
  stores: Store[]
  deals: Deal[]
  coupons: Coupon[]
  saleEvents: SaleEvent[]
}

let db: DB = {
  products: seedProducts,
  brands: seedBrands,
  stores: seedStores,
  deals: seedDeals,
  coupons: seedCoupons,
  saleEvents: seedSaleEvents,
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

function nextId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

// Simulates network latency so the UI can show pending/loading states now
// and behaves the same once real requests are wired in.
function tick() {
  return new Promise<void>((resolve) => setTimeout(resolve, 200))
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

export function useNetworks(): Network[] {
  const { deals, brands } = useDb()
  return useMemo(() => computeNetworks(deals, brands), [deals, brands])
}

// ---------------------------------------------------------------------------
// Computed / pure helpers — ported from the reference site's catalog module.
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
  deal: Pick<Deal, 'price' | 'originalPrice'>,
): number {
  if (!deal.originalPrice) return 0
  return Math.round((1 - deal.price / deal.originalPrice) * 100)
}

export function bestOffer(product: Product): Offer {
  return product.offers.reduce(
    (best, o) => (o.price < best.price ? o : best),
    product.offers[0],
  )
}

export function offersSorted(product: Product): Offer[] {
  return [...product.offers].sort((a, b) => a.price - b.price)
}

export function productDiscount(product: Product): number {
  const best = bestOffer(product)
  if (!best.originalPrice) return 0
  return Math.round((1 - best.price / best.originalPrice) * 100)
}

export function productsByStore(products: Product[], slug: string): Product[] {
  return products.filter((p) => p.offers.some((o) => o.store === slug))
}

export function lastUpdatedLabel(product: Product): string {
  const ms = Date.now() - new Date(product.updatedAt).getTime()
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(product.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type ProductInput = Omit<Product, 'id' | 'updatedAt'>

export async function createProduct(input: ProductInput): Promise<Product> {
  await tick()
  const product: Product = {
    ...input,
    id: nextId('p'),
    updatedAt: new Date().toISOString(),
  }
  set({ products: [product, ...db.products] })
  return product
}

export async function updateProduct(
  id: string,
  patch: Partial<ProductInput>,
): Promise<void> {
  await tick()
  set({
    products: db.products.map((p) =>
      p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
    ),
  })
}

export async function deleteProduct(id: string): Promise<void> {
  await tick()
  set({ products: db.products.filter((p) => p.id !== id) })
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export type StoreInput = Store

export async function createStore(input: StoreInput): Promise<Store> {
  await tick()
  set({ stores: [input, ...db.stores] })
  return input
}

export async function updateStore(
  slug: string,
  patch: Partial<StoreInput>,
): Promise<void> {
  await tick()
  set({
    stores: db.stores.map((s) => (s.slug === slug ? { ...s, ...patch } : s)),
  })
}

export async function deleteStore(slug: string): Promise<void> {
  await tick()
  set({ stores: db.stores.filter((s) => s.slug !== slug) })
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export type DealInput = Omit<Deal, 'id' | 'clicks' | 'status'> & {
  clicks?: number
  status?: DealStatus
}

export async function createDeal(input: DealInput): Promise<Deal> {
  await tick()
  const deal: Deal = {
    ...input,
    id: nextId('d'),
    clicks: input.clicks ?? 0,
    status: input.status ?? 'ACTIVE',
  }
  set({ deals: [deal, ...db.deals] })
  return deal
}

export async function updateDeal(
  id: string,
  patch: Partial<DealInput>,
): Promise<void> {
  await tick()
  set({ deals: db.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)) })
}

export async function setDealStatus(
  id: string,
  status: DealStatus,
): Promise<void> {
  return updateDeal(id, { status })
}

export async function deleteDeal(id: string): Promise<void> {
  await tick()
  set({ deals: db.deals.filter((d) => d.id !== id) })
}

// ---------------------------------------------------------------------------
// Sale events
// ---------------------------------------------------------------------------

export type SaleEventInput = Omit<SaleEvent, 'id' | 'featured' | 'expired'> & {
  featured?: boolean
  expired?: boolean
}

export async function createSaleEvent(
  input: SaleEventInput,
): Promise<SaleEvent> {
  await tick()
  const event: SaleEvent = {
    ...input,
    id: nextId('s'),
    featured: input.featured ?? false,
    expired: input.expired ?? false,
  }
  set({ saleEvents: [event, ...db.saleEvents] })
  return event
}

export async function updateSaleEvent(
  id: string,
  patch: Partial<SaleEventInput>,
): Promise<void> {
  await tick()
  set({
    saleEvents: db.saleEvents.map((e) =>
      e.id === id ? { ...e, ...patch } : e,
    ),
  })
}

export async function toggleSaleEventFeatured(id: string): Promise<void> {
  const event = db.saleEvents.find((e) => e.id === id)
  return updateSaleEvent(id, { featured: !event?.featured })
}

export async function expireSaleEvent(id: string): Promise<void> {
  return updateSaleEvent(id, { expired: true, featured: false })
}

export async function deleteSaleEvent(id: string): Promise<void> {
  await tick()
  set({ saleEvents: db.saleEvents.filter((e) => e.id !== id) })
}
