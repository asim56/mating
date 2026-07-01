import { ListingDetail } from '../../../../features/discovery/listing-detail';

async function fetchListing(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const res = await fetch(`${apiUrl}/api/v1/listings/${id}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) {
    return { title: 'Listing unavailable' };
  }
  return {
    title: `${listing.title} | Mating`,
    description: listing.description ?? `Breeding listing for ${listing.species}`,
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const listing = await fetchListing(id);
  if (!listing) {
    const { default: NotFound } = await import('./not-found');
    return <NotFound />;
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-12" dir={locale === 'ur' ? 'rtl' : 'ltr'}>
      <ListingDetail listing={listing} />
    </main>
  );
}
