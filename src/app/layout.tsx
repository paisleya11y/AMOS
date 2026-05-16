import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AMOS Agent',
  description: 'TikTok Shop ACE 多 Agent 运营决策副驾驶',
  icons: {
    icon: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
