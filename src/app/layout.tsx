import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'İş Takip Sistemi',
  description: '6-7 kişilik ekipler için görev yönetim uygulaması',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
