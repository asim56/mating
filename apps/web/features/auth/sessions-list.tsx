'use client';

import { useEffect, useState } from 'react';

import { LoadingState } from '@mating/ui';

type Session = { id: string; deviceDescriptor: string | null; lastSeenAt: string; current: boolean };

export function SessionsList({ labels }: { labels: { title: string; revoke: string; current: string } }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    fetch(`${apiUrl}/api/v1/me/sessions`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((body) => setSessions(body.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function revoke(sessionId: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    await fetch(`${apiUrl}/api/v1/me/sessions/revoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ sessionId }),
    });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }

  if (loading) return <LoadingState />;

  return (
    <ul className="space-y-2">
      {sessions.map((session) => (
        <li key={session.id} className="flex items-center justify-between rounded border p-3">
          <span>
            {session.deviceDescriptor ?? session.id}
            {session.current ? ` (${labels.current})` : ''}
          </span>
          {!session.current && (
            <button type="button" className="text-sm text-red-700" onClick={() => revoke(session.id)}>
              {labels.revoke}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
