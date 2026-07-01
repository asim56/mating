'use client';

import Link from 'next/link';

import { Button } from '@mating/ui';

import { useLocale, useTranslations } from '../../lib/i18n/provider';
import { locales } from '../../lib/i18n/config';

export default function LocaleHomePage() {
  const t = useTranslations();
  const locale = useLocale();
  const otherLocale = locales.find((value) => value !== locale) ?? locale;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6">
      <div className="flex w-full items-center justify-between">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          {t('app.foundationReady')}
        </p>
        <Link
          href={`/${otherLocale}`}
          className="rounded-md border border-stone-300 px-3 py-1 text-sm text-stone-700 hover:bg-stone-100"
        >
          {t('locale.switch')}
        </Link>
      </div>
      <h1 className="text-4xl font-semibold tracking-tight">{t('app.heading')}</h1>
      <p className="max-w-xl text-lg text-stone-600">{t('app.description')}</p>
      <Button>{t('actions.getStarted')}</Button>
    </main>
  );
}
