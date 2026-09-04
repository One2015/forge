import type { Metadata } from 'next';
import './globals.css';

const siteUrl = new URL('https://forge-production-review-focus.yvonne112.chatgpt.site');

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: 'Forge · Postman UI 优化版',
  description: '采用 Postman 工作台结构与 Genova 配色的 Forge 生产与交付界面。',
  openGraph: {
    title: 'Forge · Postman UI 优化版',
    description: '采用 Postman 工作台结构与 Genova 配色的 Forge 生产与交付界面。',
    type: 'website',
    images: [{ url: new URL('/og.png', siteUrl), width: 1731, height: 909 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forge · Postman UI 优化版',
    description: '采用 Postman 工作台结构与 Genova 配色的 Forge 生产与交付界面。',
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
