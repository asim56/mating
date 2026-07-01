'use client';

import { useEffect, useState } from 'react';

import { DataState } from '@mating/ui';

type AnimalSummary = {
  id: string;
  name: string | null;
  species: string;
  breedingStatus: string;
};

export function AnimalsList() {
  const [animals, setAnimals] = useState<AnimalSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    fetch(`${apiUrl}/api/v1/animals`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((body) => {
        setAnimals(body.data ?? []);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <DataState status={status}>
      <ul className="divide-y rounded border">
        {animals.map((animal) => (
          <li key={animal.id} className="flex justify-between px-4 py-3">
            <span>{animal.name ?? animal.species}</span>
            <span className="text-sm text-gray-500">{animal.breedingStatus}</span>
          </li>
        ))}
        {animals.length === 0 && status === 'success' && (
          <li className="px-4 py-6 text-center text-gray-500">No animals yet</li>
        )}
      </ul>
    </DataState>
  );
}
