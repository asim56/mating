'use client';

import { useState } from 'react';

import { DataState } from '@mating/ui';

type Labels = {
  recordType: string;
  title: string;
  recordDate: string;
  submit: string;
};

export function HealthRecordsForm({ animalId, labels }: { animalId: string; labels: Labels }) {
  const [recordType, setRecordType] = useState('vaccination');
  const [title, setTitle] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${apiUrl}/api/v1/animals/${animalId}/health-records`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ recordType, title, recordDate }),
    });
    setStatus(res.ok ? 'success' : 'error');
  }

  return (
    <DataState status={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}>
      {status === 'success' ? (
        <p className="text-green-700">Health record saved</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            {labels.recordType}
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
            >
              <option value="vaccination">Vaccination</option>
              <option value="deworming">Deworming</option>
              <option value="certificate">Certificate</option>
            </select>
          </label>
          <label className="block text-sm">
            {labels.title}
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            {labels.recordDate}
            <input
              type="date"
              className="mt-1 w-full rounded border px-3 py-2"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              required
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
