// scripts/upload-orders.js
// Step 2: Upload mock_orders.json → RetailCRM
// Run: node --env-file=.env scripts/upload-orders.js

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const RETAILCRM_URL = process.env.RETAILCRM_URL
const RETAILCRM_API_KEY = process.env.RETAILCRM_API_KEY

if (!RETAILCRM_URL || !RETAILCRM_API_KEY) {
  console.error('Missing RETAILCRM_URL or RETAILCRM_API_KEY in .env')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getReference(path) {
  const res = await fetch(`${RETAILCRM_URL}/api/v5/reference/${path}?apiKey=${RETAILCRM_API_KEY}`)
  const data = await res.json()
  if (!data.success) throw new Error(`Could not fetch ${path}: ${data.errorMsg}`)
  return data
}

async function getAccountConfig() {
  // Fetch site code
  const sitesData = await getReference('sites')
  const siteCode = Object.keys(sitesData.sites)[0]

  // Fetch first available order type
  const typesData = await getReference('order-types')
  const orderTypes = Object.keys(typesData.orderTypes)

  // Fetch first available order method
  const methodsData = await getReference('order-methods')
  const orderMethods = Object.keys(methodsData.orderMethods)

  console.log(`Site:         "${siteCode}"`)
  console.log(`Order types:  ${orderTypes.join(', ')}`)
  console.log(`Order methods: ${orderMethods.join(', ')}`)

  return {
    siteCode,
    orderType: orderTypes[0] || null,
    orderMethod: orderMethods[0] || null,
  }
}

async function createOrder(order, config) {
  const url = `${RETAILCRM_URL}/api/v5/orders/create?apiKey=${RETAILCRM_API_KEY}`

  // Override mock values with real reference values from this account
  const payload = {
    ...order,
    orderType: config.orderType,
    orderMethod: config.orderMethod,
  }

  // Remove null/undefined fields to avoid validation errors
  if (!payload.orderType) delete payload.orderType
  if (!payload.orderMethod) delete payload.orderMethod

  const body = new URLSearchParams()
  body.append('site', config.siteCode)
  body.append('order', JSON.stringify(payload))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data = await res.json()

  if (!data.success) {
    const detail = data.errors ? JSON.stringify(data.errors) : data.errorMsg
    throw new Error(detail)
  }

  return data.id
}

function calcTotal(order) {
  return order.items.reduce((sum, item) => sum + item.initialPrice * item.quantity, 0)
}

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const ordersPath = join(__dirname, '..', 'mock_orders.json')
  const orders = JSON.parse(readFileSync(ordersPath, 'utf-8'))

  console.log(`Uploading ${orders.length} orders to RetailCRM...`)
  console.log(`Target: ${RETAILCRM_URL}\n`)

  // Auto-detect all required reference values from the account
  const config = await getAccountConfig()
  console.log()

  let success = 0
  let failed = 0

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]
    const total = calcTotal(order)
    const label = `${order.firstName} ${order.lastName} — ${total.toLocaleString('ru-RU')} T`

    try {
      const id = await createOrder(order, config)
      console.log(`OK [${i + 1}/${orders.length}] #${id} ${label}`)
      success++
    } catch (err) {
      console.error(`FAIL [${i + 1}/${orders.length}] ${label}`)
      console.error(`     ${err.message}`)
      failed++
    }

    if (i < orders.length - 1) await sleep(300)
  }

  console.log(`\nDone. ${success} uploaded, ${failed} failed.`)
}

main()
