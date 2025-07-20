import React from 'react'
import './globals.css'
import AuthSessionProvider from '../components/SessionProvider'
import { ThemeProvider } from '../components/ThemeProvider'
import { layGrotesk, layGroteskHeading } from './fonts'

export const metadata = {
  title: 'Card Intelligence | UK Pokémon Card Prices, Trends & eBay Sold Listings',
  description: 'Card Intelligence helps UK collectors and sellers track Pokémon card values. Explore real-time price trends, eBay sold data, and in-depth card analysis to buy and sell smarter.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${layGrotesk.variable} ${layGroteskHeading.variable}`}>
      <body>
        <ThemeProvider>
          <AuthSessionProvider>
            {children}
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 