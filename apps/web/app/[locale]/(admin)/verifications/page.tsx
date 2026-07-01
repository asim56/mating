import { AdminNav } from '../../../../features/admin/AdminNav';

export default function VerificationsAdminPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Verification queue</h1>
      <p className="mb-6 text-sm text-gray-600">
        Approve or reject dimension-specific verification requests.
      </p>
      <AdminNav />
      <p className="text-sm text-gray-500">Pending verifications load from the admin API.</p>
    </main>
  );
}
