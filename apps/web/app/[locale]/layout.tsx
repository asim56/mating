import { notFound } from 'next/navigation';

import { LocaleProvider } from '../../lib/i18n/provider';
import { dirForLocale, isLocale, locales, type Locale } from '../../lib/i18n/config';

export function generateStaticParams(): { locale: Locale }[] {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <LocaleProvider locale={locale}>
      <div dir={dirForLocale(locale)} lang={locale} className="min-h-screen">
        {children}
      </div>
    </LocaleProvider>
  );
}
