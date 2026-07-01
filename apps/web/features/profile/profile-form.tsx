'use client';

import { useState } from 'react';

import { DataState } from '@mating/ui';

type ProfileLabels = {
  displayName: string;
  region: string;
  locale: string;
  role: string;
  submit: string;
  success: string;
};

export function ProfileForm({ labels }: { labels: ProfileLabels }) {
  const [displayName, setDisplayName] = useState('');
  const [regionCode, setRegionCode] = useState('PK');
  const [locale, setLocale] = useState('en');
  const [primaryRole, setPrimaryRole] = useState('buyer');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${apiUrl}/api/v1/auth/profile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ displayName, regionCode, locale, primaryRole }),
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
            {labels.displayName}
            <input className="mt-1 w-full rounded border px-3 py-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium">
            {labels.region}
            <select className="mt-1 w-full rounded border px-3 py-2" value={regionCode} onChange={(e) => setRegionCode(e.target.value)}>
              <option value="PK">Pakistan</option>
              <option value="US">United States</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            {labels.locale}
            <select className="mt-1 w-full rounded border px-3 py-2" value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="en">English</option>
              <option value="ur">اردو</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            {labels.role}
            <select className="mt-1 w-full rounded border px-3 py-2" value={primaryRole} onChange={(e) => setPrimaryRole(e.target.value)}>
              <option value="buyer">Buyer</option>
              <option value="breeder">Breeder</option>
              <option value="animal_owner">Animal owner</option>
            </select>
          </label>
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">{labels.submit}</button>
        </form>
      )}
    </DataState>
  );
}
