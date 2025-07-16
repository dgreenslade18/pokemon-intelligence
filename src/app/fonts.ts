import localFont from 'next/font/local'

export const layGrotesk = localFont({
  src: [
    {
      path: '../fonts/LayGrotesk-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/LayGrotesk-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/LayGrotesk-Semibold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-lay-grotesk',
  display: 'swap',
})

export const layGroteskHeading = localFont({
  src: [
    {
      path: '../fonts/LayGrotesk-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/LayGrotesk-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/LayGrotesk-Semibold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-lay-grotesk-heading',
  display: 'swap',
}) 