import type { Metadata } from 'next'
import './globals.css'

// Fonts are loaded via <link> in the <head> instead of next/font, because
// next/font requires SWC which is unavailable on linux/arm (32-bit Pi).
// CSS variables are defined in globals.css.

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
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col">{children}</body>
    </html>
  )
}
