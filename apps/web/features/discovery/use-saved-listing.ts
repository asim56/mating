'use client';

import { useCallback, useState } from 'react';

export function useSavedListing(listingId: string) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    const method = saved ? 'DELETE' : 'POST';
    const url = saved
      ? `${apiUrl}/api/v1/saved-listings/${listingId}`
      : `${apiUrl}/api/v1/saved-listings`;
    const res = await fetch(url, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      ...(method === 'POST' ? { body: JSON.stringify({ listingId }) } : {}),
    });
    if (res.ok) setSaved(!saved);
    setLoading(false);
  }, [listingId, saved]);

  return { saved, loading, toggle };
}
