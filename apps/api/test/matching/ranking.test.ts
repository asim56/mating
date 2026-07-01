import assert from 'node:assert/strict';
import test from 'node:test';

import { MatchingService } from '../../src/modules/matching/matching.service';
import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { InMemoryMarketplaceRepository } from '../../src/modules/marketplace/marketplace.repository';

test('repeated search with requesterAnimalId yields identical order', async () => {
  const listings = new InMemoryMarketplaceRepository();
  const animals = new InMemoryAnimalsRepository();
  const analytics = { capture: async () => undefined } as unknown as AnalyticsService;
  const svc = new MatchingService(listings, animals, analytics);

  const base = {
    ownerId: 'o1',
    regionId: 'r1',
    regionCode: 'PK' as const,
    listingType: 'animal' as const,
    breedingMethod: 'natural' as const,
    currencyCode: 'PKR',
    species: 'goat' as const,
    breedId: null,
    breedName: null,
    sex: 'female',
    city: 'Lahore',
    provinceOrState: null,
    latitude: 31.5,
    longitude: 74.3,
    healthStatus: 'healthy',
    verificationDimensions: {
      owner_identity: 'unverified',
      media: 'unverified',
      health: 'unverified',
      vaccination: 'unverified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
    ownerDisplayName: null,
    priceAmount: 1000,
    locationRadiusKm: 50,
  };

  const a = await listings.create({ ...base, animalId: 'a1', title: 'Alpha' });
  const b = await listings.create({ ...base, animalId: 'a2', title: 'Beta' });
  await listings.setStatus(a.id, 'active');
  await listings.setStatus(b.id, 'active');

  const requester = await animals.create({
    ownerId: 'buyer-1',
    regionCode: 'PK',
    regionId: 'r1',
    species: 'goat',
    sex: 'male',
    latitude: 31.55,
    longitude: 74.35,
    verificationDimensions: base.verificationDimensions,
  });

  const user = { id: 'buyer-1', roles: ['buyer'] as const };
  const first = await svc.search({ requesterAnimalId: requester.id, sort: 'relevance' }, user);
  const second = await svc.search({ requesterAnimalId: requester.id, sort: 'relevance' }, user);
  assert.deepEqual(
    first.data.map((r) => r.id),
    second.data.map((r) => r.id),
  );
});
