import { RequestsList } from '../../../../features/breeding-workflow';

export default async function RequestsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Breeding requests</h1>
      <RequestsList />
    </main>
  );
}
