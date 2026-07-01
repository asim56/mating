import Link from 'next/link';

import { SearchListings } from '../../../../features/discovery/search/search-list';

export default async function SavedListingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Saved listings</h1>
      <p className="mb-4 text-sm text-gray-600">
        <Link href={`/${locale}/search`} className="underline">Browse more listings</Link>
      </p>
      <SearchListings />
    </main>
  );
}
