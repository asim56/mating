import { ListingForm } from '../../../../features/discovery/listing-form';

export default async function ListingsDashboardPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">My listings</h1>
      <ListingForm />
    </main>
  );
}
