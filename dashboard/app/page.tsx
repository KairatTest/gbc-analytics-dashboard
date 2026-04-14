import { createClient } from '@supabase/supabase-js'
import Charts from '@/components/Charts'

// Types
type Order = {
  id: number
  number: string
  first_name: string
  last_name: string
  phone: string
  status: string
  city: string
  utm_source: string
  total: number
  created_at: string
}

// Server-side data fetch — runs at request time, never exposed to browser
async function getOrders(): Promise<Order[]> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Order[]
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU') + ' ₸'
}

function groupBy<T>(arr: T[], key: keyof T) {
  return arr.reduce((acc: Record<string, T[]>, item) => {
    const k = String(item[key] || 'Неизвестно')
    acc[k] = [...(acc[k] || []), item]
    return acc
  }, {})
}

export default async function DashboardPage() {
  const orders = await getOrders()

  // ── KPI calculations ────────────────────────────────────────────────────────
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const avgOrder = orders.length ? Math.round(totalRevenue / orders.length) : 0
  const highValue = orders.filter(o => o.total > 50000).length

  // ── Chart data ──────────────────────────────────────────────────────────────
  const byCity = Object.entries(groupBy(orders, 'city'))
    .map(([city, items]) => ({
      city,
      orders: items.length,
      revenue: items.reduce((s, o) => s + o.total, 0),
    }))
    .sort((a, b) => b.orders - a.orders)

  const bySource = Object.entries(groupBy(orders, 'utm_source'))
    .map(([source, items]) => ({ source, orders: items.length }))
    .sort((a, b) => b.orders - a.orders)

  // ── Recent orders table ─────────────────────────────────────────────────────
  const recent = orders.slice(0, 10)

  const syncedAt = new Date().toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen">

      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">GBC Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Nova — аналитика заказов</p>
        </div>
        <span className="text-slate-400 text-sm">Обновлено: {syncedAt}</span>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* KPI Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Всего заказов"    value={String(orders.length)} />
          <KpiCard label="Выручка"          value={fmt(totalRevenue)}     accent />
          <KpiCard label="Средний чек"      value={fmt(avgOrder)}         />
          <KpiCard label="Заказы > 50 000 ₸" value={String(highValue)}   highlight />
        </section>

        {/* Charts */}
        <Charts byCity={byCity} bySource={bySource} />

        {/* Recent Orders Table */}
        <section>
          <h2 className="text-base font-semibold text-slate-700 mb-3">Последние заказы</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['#', 'Клиент', 'Город', 'Источник', 'Сумма', 'Статус'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400">{o.number}</td>
                    <td className="px-4 py-3 font-medium">{o.first_name} {o.last_name}</td>
                    <td className="px-4 py-3 text-slate-600">{o.city || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        {o.utm_source || 'direct'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold tabular-nums ${o.total > 50000 ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {fmt(o.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  )
}

// Inline KPI card component (no chart interactivity needed, stays server-side)
function KpiCard({
  label, value, accent, highlight,
}: {
  label: string; value: string; accent?: boolean; highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-5 ${
      highlight ? 'bg-emerald-50 border-emerald-200' :
      accent    ? 'bg-indigo-50 border-indigo-200' :
                  'bg-white border-slate-200'
    }`}>
      <p className={`text-sm font-medium mb-1 ${
        highlight ? 'text-emerald-600' : accent ? 'text-indigo-600' : 'text-slate-500'
      }`}>{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${
        highlight ? 'text-emerald-700' : accent ? 'text-indigo-700' : 'text-slate-900'
      }`}>{value}</p>
    </div>
  )
}
