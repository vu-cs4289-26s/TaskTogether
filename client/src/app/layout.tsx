import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import Providers from '@/components/providers/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'TaskTogether - A Web-based Household Management Platform for Modern Shared Living​',
  description: 'Task together. Coordinate chores, share calendars, and bring peace to your household.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
