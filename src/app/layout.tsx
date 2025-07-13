import React from 'react'
import './globals.css'
import AuthSessionProvider from '../components/SessionProvider'

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
    <html lang="en">
      <body>
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  )
} 