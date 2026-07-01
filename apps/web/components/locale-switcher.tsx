'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { locales, type Locale } from '../lib/i18n/config';

export function LocaleSwitcher({ label }: { label: string }) {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const current = (segments[1] ?? 'en') as Locale;

  const target = current === 'en' ? 'ur' : 'en';
  const nextPath = pathname.replace(`/${current}`, `/${target}`);

  return (
    <Link href={nextPath} className="text-sm text-emerald-800 underline" prefetch={false}>
      {label}
    </Link>
  );
}

export function localeAlternates(): Locale[] {
  return [...locales];
}
