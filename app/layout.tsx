import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'জ্ঞানের সমুদ্র | Jnaner Shomudro',
  description: 'বাংলায় ফিকশন, নন-ফিকশন এবং গবেষণা পত্র পড়ুন এবং ডাউনলোড করুন। ২০৫৫ সালের মধ্যে ৯০ লক্ষ কন্টেন্ট।',
  icons: { icon: '/favicon.ico' }
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  userScalable: true,
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  )
}
