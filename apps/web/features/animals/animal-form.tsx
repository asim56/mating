'use client';

import { useState } from 'react';

import { DataState } from '@mating/ui';

type Labels = {
  title: string;
  species: string;
  sex: string;
  name: string;
  submit: string;
  success: string;
};

export function AnimalForm({ labels, animalId }: { labels: Labels; animalId?: string }) {
  const [species, setSpecies] = useState('cattle');
  const [sex, setSex] = useState('female');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    const method = animalId ? 'PATCH' : 'POST';
    const url = animalId ? `${apiUrl}/api/v1/animals/${animalId}` : `${apiUrl}/api/v1/animals`;
    const res = await fetch(url, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ species, sex, name: name || undefined }),
    });
    setStatus(res.ok ? 'success' : 'error');
  }

  return (
    <DataState status={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}>
      {status === 'success' ? (
        <p className="text-green-700">{labels.success}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <h2 className="text-lg font-medium">{labels.title}</h2>
          <label className="block text-sm font-medium">
            {labels.species}
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            >
              <option value="cattle">Cattle</option>
              <option value="buffalo">Buffalo</option>
              <option value="goat">Goat</option>
              <option value="sheep">Sheep</option>
              <option value="dog">Dog</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            {labels.sex}
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            {labels.name}
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">
            {labels.submit}
          </button>
        </form>
      )}
    </DataState>
  );
}
