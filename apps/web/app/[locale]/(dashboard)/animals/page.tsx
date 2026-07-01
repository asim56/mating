import Link from 'next/link';

import { LocaleSwitcher } from '../../../../components/locale-switcher';
import { AnimalForm } from '../../../../features/animals/animal-form';
import { AnimalsList } from '../../../../features/animals/animals-list';
import { isLocale, translate, type Locale } from '../../../../lib/i18n/config';

export default async function AnimalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const t = (key: string) => translate(locale, key);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My animals</h1>
        <LocaleSwitcher label={t('locale.switch')} />
      </div>
      <section className="mb-8">
        <AnimalsList />
      </section>
      <section className="mb-4">
        <AnimalForm
          labels={{
            title: 'Register new animal',
            species: 'Species',
            sex: 'Sex',
            name: 'Name (optional)',
            submit: 'Save draft',
            success: 'Animal saved as draft',
          }}
        />
      </section>
      <p className="text-sm text-gray-500">
        <Link href={`/${locale}/animals/new`} className="underline">
          Full registration form
        </Link>
      </p>
    </main>
  );
}
