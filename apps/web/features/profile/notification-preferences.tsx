'use client';

import { useEffect, useState } from 'react';

import { LoadingState } from '@mating/ui';

export function NotificationPreferences({ labels }: { labels: { save: string } }) {
  const [prefs, setPrefs] = useState<{ channel: string; category: string; enabled: boolean; optional: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    fetch(`${apiUrl}/api/v1/me/notification-preferences`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((body) => setPrefs(body.preferences ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    await fetch(`${apiUrl}/api/v1/me/notification-preferences`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ preferences: prefs.filter((p) => p.optional) }),
    });
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-3">
      {prefs.filter((p) => p.optional).map((pref) => (
        <label key={`${pref.channel}-${pref.category}`} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pref.enabled}
            onChange={(e) =>
              setPrefs((prev) =>
                prev.map((p) =>
                  p.channel === pref.channel && p.category === pref.category
                    ? { ...p, enabled: e.target.checked }
                    : p,
                ),
              )
            }
          />
          {pref.channel} / {pref.category}
        </label>
      ))}
      <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={save}>
        {labels.save}
      </button>
    </div>
  );
}
