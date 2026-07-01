import { AdminNav } from '../../../../features/admin/AdminNav';

export default function AuditAdminPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Audit explorer</h1>
      <p className="mb-6 text-sm text-gray-600">Search immutable audit logs with filters.</p>
      <AdminNav />
    </main>
  );
}
