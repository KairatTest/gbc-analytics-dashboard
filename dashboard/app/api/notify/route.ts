// app/api/notify/route.ts
// Vercel cron job: runs every 5 minutes
// Checks RetailCRM for orders > 50,000 ₸ and sends Telegram alerts

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const RETAILCRM_URL    = process.env.RETAILCRM_URL!
const RETAILCRM_API_KEY = process.env.RETAILCRM_API_KEY!
const TELEGRAM_TOKEN   = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!
const SUPABASE_URL     = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

const THRESHOLD = 50_000 // ₸

// Fetch recent orders from RetailCRM (last 24h)
async function fetchRecentOrders() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const url = `${RETAILCRM_URL}/api/v5/orders?apiKey=${RETAILCRM_API_KEY}&filter[createdAtFrom]=${encodeURIComponent(since)}&limit=100`
  const res  = await fetch(url)
  const data = await res.json()
  if (!data.success) throw new Error(`RetailCRM: ${data.errorMsg}`)
  return data.orders || []
}

// Calculate order total
function calcTotal(order: any): number {
  return (order.items || []).reduce((sum: number, item: any) =>
    sum + (item.initialPrice || 0) * (item.quantity || 1), 0)
}

// Send Telegram message
async function sendTelegram(text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`
  const res  = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram error: ${err}`)
  }
}

// Track which orders we've already alerted on using Supabase
async function getAlertedIds(supabase: any): Promise<Set<number>> {
  const { data } = await supabase
    .from('alerted_orders')
    .select('order_id')
  return new Set((data || []).map((r: any) => r.order_id))
}

async function markAlerted(supabase: any, orderId: number) {
  await supabase.from('alerted_orders').insert({ order_id: orderId })
}

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // 1. Get orders from RetailCRM
    const orders = await fetchRecentOrders()

    // 2. Get IDs we've already notified about
    const alreadyAlerted = await getAlertedIds(supabase)

    // 3. Find high-value orders we haven't alerted on yet
    const toAlert = orders.filter((o: any) => {
      const total = calcTotal(o)
      return total > THRESHOLD && !alreadyAlerted.has(o.id)
    })

    // 4. Send a Telegram message for each new high-value order
    for (const order of toAlert) {
      const total = calcTotal(order)
      const name  = `${order.firstName || ''} ${order.lastName || ''}`.trim()
      const city  = order.delivery?.address?.city || 'Город не указан'
      const src   = order.customFields?.utm_source || 'direct'

      const message = [
        `🔔 <b>Крупный заказ — ${total.toLocaleString('ru-RU')} ₸</b>`,
        ``,
        `👤 Клиент: ${name || 'Неизвестно'}`,
        `🏙 Город: ${city}`,
        `📣 Источник: ${src}`,
        `🆔 Заказ №${order.number}`,
      ].join('\n')

      await sendTelegram(message)
      await markAlerted(supabase, order.id)
    }

    return NextResponse.json({
      checked: orders.length,
      alerted: toAlert.length,
      message: toAlert.length
        ? `Sent ${toAlert.length} alert(s)`
        : 'No new high-value orders',
    })

  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
