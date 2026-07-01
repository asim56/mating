'use client';

import { useEffect, useState } from 'react';

import { DataState } from '@mating/ui';

type Result = { id: string; title: string; species: string; city: string | null };

export function SearchListings() {
  const [q, setQ] = useState('');
  const [species, setSpecies] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    setStatus('loading');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (species) params.set('species', species);
    const res = await fetch(`${apiUrl}/api/v1/listings?${params}`);
    if (!res.ok) {
      setStatus('error');
      return;
    }
    const body = await res.json();
    setResults(body.data ?? []);
    setStatus('success');
  }

  useEffect(() => {
    void search();
  }, []);

  return (
    <div>
      <form onSubmit={search} className="mb-4 flex flex-wrap gap-2">
        <input className="rounded border px-3 py-2" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded border px-3 py-2" value={species} onChange={(e) => setSpecies(e.target.value)}>
          <option value="">All species</option>
          <option value="goat">Goat</option>
          <option value="cattle">Cattle</option>
        </select>
        <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">Search</button>
      </form>
      <DataState status={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}>
        <ul className="divide-y rounded border">
          {results.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <a href={`/en/listings/${r.id}`} className="font-medium text-emerald-800">{r.title}</a>
              <span className="ml-2 text-sm text-gray-500">{r.species} · {r.city ?? '—'}</span>
            </li>
          ))}
        </ul>
      </DataState>
    </div>
  );
}
