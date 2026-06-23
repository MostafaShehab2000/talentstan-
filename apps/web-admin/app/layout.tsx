import type { Metadata } from 'next';
import { Noto_Kufi_Arabic } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/shared/QueryProvider';

const font = Noto_Kufi_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Talentstan — HR Management',
  description: 'Employee Self-Service SaaS Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={font.className}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
