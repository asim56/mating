import Link from 'next/link';

import { AnimalForm } from '../../../../features/animals/animal-form';
import { isLocale, type Locale } from '../../../../lib/i18n/config';

export default async function NewAnimalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Link href={`/${locale}/animals`} className="text-sm text-emerald-700 underline">
        ← Back to animals
      </Link>
      <div className="mt-6">
        <AnimalForm
          labels={{
            title: 'New animal draft',
            species: 'Species',
            sex: 'Sex',
            name: 'Name',
            submit: 'Create draft',
            success: 'Draft created',
          }}
        />
      </div>
    </main>
  );
}
