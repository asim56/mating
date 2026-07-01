'use client';

import { VerificationBadges } from '../../animals/verification-badges';

type ListingDetailProps = {
  listing: {
    id: string;
    title: string;
    description: string | null;
    species: string;
    city: string | null;
    ownerDisplayName: string | null;
  };
};

export function ListingDetail({ listing }: ListingDetailProps) {
  return (
    <article>
      <h1 className="text-2xl font-semibold">{listing.title}</h1>
      <p className="text-sm text-gray-600">{listing.species} · {listing.city}</p>
      {listing.ownerDisplayName && <p className="mt-2 text-sm">Listed by {listing.ownerDisplayName}</p>}
      {listing.description && <p className="mt-4">{listing.description}</p>}
      <div className="mt-4">
        <VerificationBadges animalId={listing.id} />
      </div>
    </article>
  );
}
