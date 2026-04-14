// scripts/sync-to-supabase.js
// Step 3: Pull orders from RetailCRM → upsert into Supabase
// Run: node --env-file=.env scripts/sync-to-supabase.js

const RETAILCRM_URL = process.env.RETAILCRM_URL
const RETAILCRM_API_KEY = process.env.RETAILCRM_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

for (const [key, val] of Object.entries({ RETAILCRM_URL, RETAILCRM_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY })) {
  if (!val) { console.error(`Missing ${key} in .env`); process.exit(1) }
}

// ── Fetch all orders from RetailCRM (handles pagination) ──────────────────────
async function fetchAllOrders() {
  const orders = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url = `${RETAILCRM_URL}/api/v5/orders?apiKey=${RETAILCRM_API_KEY}&limit=100&page=${page}`
    const res = await fetch(url)
    const data = await res.json()

    if (!data.success) throw new Error(`RetailCRM error: ${data.errorMsg}`)

    orders.push(...data.orders)
    totalPages = data.pagination.totalPageCount
    console.log(`  Fetched page ${page}/${totalPages} (${data.orders.length} orders)`)
    page++
  }

  return orders
}

// ── Map RetailCRM order format → our Supabase table columns ──────────────────
function mapOrder(o) {
  // Calculate total: sum of (price × quantity) for each item
  const total = (o.items || []).reduce((sum, item) => {
    return sum + (item.initialPrice || 0) * (item.quantity || 1)
  }, 0)

  return {
    id:           o.id,
    number:       o.number,
    first_name:   o.firstName || null,
    last_name:    o.lastName  || null,
    phone:        o.phone     || null,
    email:        o.email     || null,
    status:       o.status    || null,
    order_type:   o.orderType || null,
    order_method: o.orderMethod || null,
    city:         o.delivery?.address?.city || null,
    utm_source:   o.customFields?.utm_source || null,
    total:        total,
    created_at:   o.createdAt || new Date().toISOString(),
    synced_at:    new Date().toISOString(),
  }
}

// ── Upsert rows into Supabase (on conflict update) ────────────────────────────
async function upsertOrders(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer':        'resolution=merge-duplicates', // upsert on PK conflict
    },
    body: JSON.stringify(rows),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase error ${res.status}: ${err}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Syncing RetailCRM → Supabase...\n')

  // 1. Fetch from RetailCRM
  console.log('Fetching orders from RetailCRM...')
  const raw = await fetchAllOrders()
  console.log(`Total fetched: ${raw.length} orders\n`)

  // 2. Map to our schema
  const rows = raw.map(mapOrder)

  // 3. Upsert into Supabase in batches of 50
  console.log('Upserting into Supabase...')
  const BATCH = 50
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await upsertOrders(batch)
    console.log(`  Upserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
  }

  console.log('\nSync complete.')
  console.log(`${rows.length} orders now in Supabase.`)

  // 4. Quick summary
  const byCity = rows.reduce((acc, r) => {
    const c = r.city || 'Unknown'
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {})
  console.log('\nOrders by city:')
  for (const [city, count] of Object.entries(byCity).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${city}: ${count}`)
  }
}

main()
