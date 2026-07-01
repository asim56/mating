'use client';

import { useState } from 'react';

import { DataState } from '@mating/ui';

const REQUIREMENTS = [
  'At least one image',
  'Owner declaration accepted',
  'Minimum age met for species/region',
  'Health status not blocked',
  'Sex and country provided',
];

export function PublishReadyForm({ animalId }: { animalId: string }) {
  const [declaration, setDeclaration] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errors, setErrors] = useState<string[]>([]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    setErrors([]);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    if (declaration) {
      await fetch(`${apiUrl}/api/v1/animals/${animalId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ownerDeclaration: true }),
      });
    }
    const res = await fetch(`${apiUrl}/api/v1/animals/${animalId}/publish-ready`, {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setStatus('success');
    } else {
      const body = await res.json().catch(() => ({}));
      setErrors(body.message ? [body.message] : ['Validation failed']);
      setStatus('error');
    }
  }

  return (
    <DataState status={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <h3 className="font-medium">Publish-ready checklist</h3>
        <ul className="list-inside list-disc text-sm text-gray-600">
          {REQUIREMENTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={declaration}
            onChange={(e) => setDeclaration(e.target.checked)}
          />
          I declare this animal information is accurate
        </label>
        {errors.length > 0 && (
          <ul className="text-sm text-red-600">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {status === 'success' ? (
          <p className="text-green-700">Animal is publish-ready</p>
        ) : (
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">
            Mark publish-ready
          </button>
        )}
      </form>
    </DataState>
  );
}
