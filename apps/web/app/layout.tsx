import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mating Marketplace',
  description: 'Verified animal breeding marketplace — Pakistan-first, USA-ready',
};

// `lang`/`dir` default to the LTR base locale and are updated per-locale at
// runtime by the LocaleProvider; suppress the resulting hydration diff on
// <html>. <body> is suppressed too because browser extensions (e.g. Grammarly)
// inject attributes there before React hydrates, causing false mismatches.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
