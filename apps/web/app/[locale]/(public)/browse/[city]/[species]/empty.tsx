export default function BrowseEmpty({
  city,
  species,
  locale,
}: {
  city: string;
  species: string;
  locale: string;
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center" dir={locale === 'ur' ? 'rtl' : 'ltr'}>
      <h1 className="text-xl font-semibold capitalize">{species} in {city}</h1>
      <p className="mt-2 text-gray-600">No active listings yet. Check back soon.</p>
    </main>
  );
}
