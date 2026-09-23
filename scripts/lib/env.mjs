// Shared setup for every local Node script in this directory: loads .env
// (never committed — see .gitignore) and builds a service-role Supabase
// client. The service-role key bypasses RLS, which these scripts need (bulk
// writes to products/brands/stores, managing storage buckets) — it must
// never reach a browser bundle, so it's read here with plain, non-VITE_-
// prefixed env vars that Vite never inlines into client code, unlike the
// admin app's own VITE_SUPABASE_* pair in src/lib/supabaseClient.ts.
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export function requireServiceRoleClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env — see .env.example.',
    )
    process.exit(1)
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}
