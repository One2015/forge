import type { Metadata } from 'next';
import './globals.css';

const siteUrl = new URL('https://forge-production-review-focus.chatgpt.site');

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: 'Forge 生产与审核 · IA 优化版',
  description: '更聚焦的 Forge 生产、运行、人工审核与交付工作台。',
  openGraph: {
    title: 'Forge 生产与审核 · IA 优化版',
    description: '更聚焦的 Forge 生产、运行、人工审核与交付工作台。',
    type: 'website',
    images: [{ url: new URL('/og.png', siteUrl), width: 1731, height: 909 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forge 生产与审核 · IA 优化版',
    description: '更聚焦的 Forge 生产、运行、人工审核与交付工作台。',
    images: [new URL('/og.png', siteUrl)],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
