import React from 'react'
import Script from 'next/script'
import './globals.css'
import AuthSessionProvider from '../components/SessionProvider'
import { ThemeProvider } from '../components/ThemeProvider'
import Footer from '../components/Footer'
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
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-KTNX34HS');
            `,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>
        
        <ThemeProvider>
          <AuthSessionProvider>
            <div className="flex-1">
              {children}
            </div>
            <Footer />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 