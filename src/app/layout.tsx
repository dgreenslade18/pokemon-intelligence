import React from 'react'
import './globals.css'
import AuthSessionProvider from '../components/SessionProvider'
import { ThemeProvider } from '../components/ThemeProvider'
import { layGrotesk, layGroteskHeading } from './fonts'

export const metadata = {
  title: 'Card Intelligence | UK Pokémon Card Prices, Trends & eBay Sold Listings',
  description: 'Card Intelligence helps UK collectors and sellers track Pokémon card values. Explore real-time price trends, eBay sold data, and in-depth card analysis to buy and sell smarter.',
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