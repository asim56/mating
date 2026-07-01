'use client';

import { useState } from 'react';

import { DataState } from '@mating/ui';

export function ListingForm() {
  const [animalId, setAnimalId] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${apiUrl}/api/v1/listings`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        animalId,
        listingType: 'animal',
        title,
        breedingMethod: 'natural',
        priceAmount: 10000,
        locationRadiusKm: 50,
      }),
    });
    setStatus(res.ok ? 'success' : 'error');
  }

  return (
    <DataState status={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}>
      {status === 'success' ? (
        <p className="text-green-700">Listing draft created</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            Animal ID
            <input className="mt-1 w-full rounded border px-3 py-2" value={animalId} onChange={(e) => setAnimalId(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Title
            <input className="mt-1 w-full rounded border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">Create draft</button>
        </form>
      )}
    </DataState>
  );
}
