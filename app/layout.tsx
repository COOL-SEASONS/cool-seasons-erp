import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'COOL SEASONS ERP',
  description: 'نظام إدارة متكامل',
  manifest: '/manifest.json',
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1E9CD7' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
