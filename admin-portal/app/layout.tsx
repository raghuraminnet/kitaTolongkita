import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KitaTolongKita — Admin Portal',
  description: 'Admin portal for KitaTolongKita',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
