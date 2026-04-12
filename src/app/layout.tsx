import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

// Inter — main UI font
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

// IBM Plex Mono — used for metrics, numbers, and code snippets
const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'DockYard Pi',
  description: 'Private control panel for Raspberry Pi Docker services',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}>
      <body className="bg-background text-foreground flex min-h-full flex-col">{children}</body>
    </html>
  )
}
