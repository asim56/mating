import { AdminNav } from '../../../../features/admin/AdminNav';

export default function DashboardAdminPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Operations dashboard</h1>
      <p className="mb-6 text-sm text-gray-600">Business metrics without PII leakage.</p>
      <AdminNav />
    </main>
  );
}
