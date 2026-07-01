import { AdminNav } from '../../../../features/admin/AdminNav';

export default function ModerationAdminPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Moderation inbox</h1>
      <p className="mb-6 text-sm text-gray-600">Suspend listings and animals for policy violations.</p>
      <AdminNav />
    </main>
  );
}
