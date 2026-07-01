import { SeoItemList } from '../../../../features/discovery/seo-item-list';

async function fetchBrowse(city: string, species: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const params = new URLSearchParams({ city, species });
  const res = await fetch(`${apiUrl}/api/v1/listings?${params}`, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  const body = await res.json();
  return body.data ?? [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; species: string; locale: string }>;
}) {
  const { city, species } = await params;
  const title = `${species} in ${city} | Mating`;
  return {
    title,
    description: `Browse ${species} breeding listings in ${city}`,
  };
}

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ city: string; species: string; locale: string }>;
}) {
  const { city, species, locale } = await params;
  const listings = await fetchBrowse(city, species);

  if (listings.length === 0) {
    const { default: Empty } = await import('./empty');
    return <Empty city={city} species={species} locale={locale} />;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12" dir={locale === 'ur' ? 'rtl' : 'ltr'}>
      <h1 className="mb-6 text-2xl font-semibold capitalize">
        {species} in {city}
      </h1>
      <SeoItemList
        items={listings.map((l: { id: string; title: string }) => ({
          id: l.id,
          title: l.title,
          url: `/${locale}/listings/${l.id}`,
        }))}
      />
      <ul className="divide-y rounded border">
        {listings.map((l: { id: string; title: string; city: string | null }) => (
          <li key={l.id} className="px-4 py-3">
            <a href={`/${locale}/listings/${l.id}`} className="font-medium text-emerald-800">
              {l.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
