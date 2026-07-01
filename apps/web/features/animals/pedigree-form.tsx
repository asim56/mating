'use client';

import { useState } from 'react';

import { DataState } from '@mating/ui';

export function PedigreeForm({ animalId }: { animalId: string }) {
  const [registryName, setRegistryName] = useState('');
  const [registryNumber, setRegistryNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${apiUrl}/api/v1/animals/${animalId}/pedigree`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ registryName, registryNumber }),
    });
    setStatus(res.ok ? 'success' : 'error');
  }

  return (
    <DataState status={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}>
      {status === 'success' ? (
        <p className="text-green-700">Pedigree saved (unverified)</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            Registry name
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={registryName}
              onChange={(e) => setRegistryName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Registry number
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={registryNumber}
              onChange={(e) => setRegistryNumber(e.target.value)}
            />
          </label>
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">
            Save pedigree
          </button>
        </form>
      )}
    </DataState>
  );
}
