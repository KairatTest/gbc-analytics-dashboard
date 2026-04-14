'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

type CityData   = { city: string; orders: number; revenue: number }
type SourceData = { source: string; orders: number }

const CITY_COLORS   = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e']
const SOURCE_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6']

function fmt(n: number) {
  return n.toLocaleString('ru-RU') + ' ₸'
}

// Custom tooltip for city chart
function CityTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      <p className="text-slate-600">Заказов: <span className="font-medium text-slate-900">{payload[0].value}</span></p>
      <p className="text-slate-600">Выручка: <span className="font-medium text-indigo-700">{fmt(payload[0].payload.revenue)}</span></p>
    </div>
  )
}

// Custom tooltip for source chart
function SourceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      <p className="text-slate-600">Заказов: <span className="font-medium text-slate-900">{payload[0].value}</span></p>
    </div>
  )
}

export default function Charts({
  byCity, bySource,
}: {
  byCity: CityData[]
  bySource: SourceData[]
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Orders by City */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-1">Заказы по городам</h2>
        <p className="text-slate-400 text-sm mb-6">Количество заказов и выручка</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byCity} barSize={36} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="city" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<CityTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
              {byCity.map((_, i) => (
                <Cell key={i} fill={CITY_COLORS[i % CITY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Orders by UTM Source */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-1">Источники трафика</h2>
        <p className="text-slate-400 text-sm mb-6">Откуда пришли покупатели</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={bySource} barSize={36} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="source" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<SourceTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
              {bySource.map((_, i) => (
                <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </section>
  )
}
