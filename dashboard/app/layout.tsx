import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GBC Analytics Dashboard',
  description: 'Order analytics for Nova shapewear',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  )
}
