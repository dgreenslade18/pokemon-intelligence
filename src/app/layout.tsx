import React from 'react'
import './globals.css'
import AuthSessionProvider from '../components/SessionProvider'
import { ThemeProvider } from '../components/ThemeProvider'
import { layGrotesk, layGroteskHeading } from './fonts'

export const metadata = {
  title: 'Pokemon Arbitrage Intelligence',
  description: 'Advanced market analysis tools for profitable Pokemon card trading opportunities',
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