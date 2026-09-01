import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SOUQCLOUD — Ecommerce Platform',
  description: 'Production-grade multi-tenant SaaS ecommerce platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
