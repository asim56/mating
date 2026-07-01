'use client';

import { useState } from 'react';

export function MarketingConsent({ labels }: { labels: { optIn: string; optOut: string; success: string } }) {
  const [message, setMessage] = useState<string | null>(null);

  async function record(granted: boolean) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${apiUrl}/api/v1/me/consents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        consentType: 'marketing_email',
        version: '2026-06-01',
        granted,
      }),
    });
    if (res.ok) setMessage(labels.success);
  }

  return (
    <div className="space-y-3">
      <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={() => record(true)}>
        {labels.optIn}
      </button>
      <button type="button" className="rounded border px-4 py-2" onClick={() => record(false)}>
        {labels.optOut}
      </button>
      {message && <p className="text-sm text-green-700">{message}</p>}
    </div>
  );
}
