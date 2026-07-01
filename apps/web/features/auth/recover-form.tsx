'use client';

import { useState } from 'react';

import { DataState } from '@mating/ui';

export function RecoverForm({ labels }: { labels: { identifierLabel: string; submit: string; success: string } }) {
  const [identifier, setIdentifier] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/api/v1/auth/recover`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });
    setStatus(res.ok ? 'success' : 'error');
  }

  return (
    <DataState status={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}>
      {status === 'success' ? (
        <p className="text-green-700">{labels.success}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium">
            {labels.identifierLabel}
            <input className="mt-1 w-full rounded border px-3 py-2" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </label>
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">{labels.submit}</button>
        </form>
      )}
    </DataState>
  );
}
