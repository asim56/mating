'use client';

import { useState } from 'react';

export function DeleteAnimalDialog({
  animalId,
  onDeleted,
}: {
  animalId: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirmDelete() {
    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${apiUrl}/api/v1/animals/${animalId}`, {
      method: 'DELETE',
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      onDeleted?.();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-sm text-red-600 underline"
        onClick={() => setOpen(true)}
      >
        Delete animal
      </button>
    );
  }

  return (
    <div className="rounded border border-red-200 bg-red-50 p-4">
      <p className="text-sm">This will soft-delete the animal. It will no longer appear in your list.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
          disabled={loading}
          onClick={confirmDelete}
        >
          {loading ? 'Deleting…' : 'Confirm delete'}
        </button>
        <button type="button" className="text-sm underline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
