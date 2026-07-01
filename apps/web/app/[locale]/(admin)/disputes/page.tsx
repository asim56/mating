import { AdminNav } from '../../../../features/admin/AdminNav';

export default function DisputesAdminPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Dispute queue</h1>
      <p className="mb-6 text-sm text-gray-600">Assign and resolve breeding disputes.</p>
      <AdminNav />
    </main>
  );
}
