'use client';

import { useState } from 'react';

import { DataState } from '@mating/ui';

export function MediaUpload({ animalId }: { animalId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('loading');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    try {
      const urlRes = await fetch(`${apiUrl}/api/v1/animals/${animalId}/media/upload-url`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          contentType: file.type,
          mediaType: 'image',
          filename: file.name,
        }),
      });
      if (!urlRes.ok) throw new Error('upload-url failed');
      const { url } = await urlRes.json();
      const putRes = await fetch(url, { method: 'PUT', body: file });
      setStatus(putRes.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <DataState status={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}>
      <label className="block text-sm font-medium">
        Upload image
        <input type="file" accept="image/*" className="mt-1" onChange={onUpload} />
      </label>
      {status === 'success' && <p className="text-green-700">Upload complete</p>}
    </DataState>
  );
}
