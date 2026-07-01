'use client';

import { useEffect, useState } from 'react';

import { VERIFICATION_DIMENSIONS } from '@mating/shared';

const LABELS: Record<string, string> = {
  owner_identity: 'Owner identity',
  media: 'Media',
  health: 'Health',
  vaccination: 'Vaccination',
  pedigree: 'Pedigree',
  facility: 'Facility',
};

export function VerificationBadges({ animalId }: { animalId: string }) {
  const [dimensions, setDimensions] = useState<Record<string, string>>({});

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    fetch(`${apiUrl}/api/v1/animals/${animalId}/verification`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((body) => setDimensions(body.dimensions ?? {}))
      .catch(() => undefined);
  }, [animalId]);

  return (
    <div className="flex flex-wrap gap-2">
      {VERIFICATION_DIMENSIONS.map((dim) => (
        <span
          key={dim}
          className="rounded-full border px-3 py-1 text-xs"
          title={`${LABELS[dim] ?? dim}: ${dimensions[dim] ?? 'unverified'}`}
        >
          {LABELS[dim] ?? dim}: {dimensions[dim] ?? 'unverified'}
        </span>
      ))}
    </div>
  );
}
