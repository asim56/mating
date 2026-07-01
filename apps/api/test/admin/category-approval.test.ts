import assert from 'node:assert/strict';
import test from 'node:test';

import { getRegionConfig } from '@mating/shared';

import { InMemoryMarketplaceRepository } from '../../src/modules/marketplace/marketplace.repository';
import { ModerationService } from '../../src/modules/admin/services/moderation.service';
import { AdminRoleGuardService } from '../../src/modules/admin/guards/admin-role.guard';
import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { ADMIN } from '../payments/fixtures';

test('PK exotic category approval stored on listing metadata', async () => {
  const listings = new InMemoryMarketplaceRepository();
  const animals = new InMemoryAnimalsRepository();
  const audit = { emit: async () => undefined };
  const moderation = new ModerationService(
    listings,
    animals,
    new AdminRoleGuardService(),
    audit,
  );

  const compliance = getRegionConfig('PK').compliance;
  assert.equal(compliance.exoticRequiresApproval, true);

  const listing = await listings.create({
    animalId: 'animal-exotic',
    ownerId: 'owner-1',
    regionId: 'region-pk',
    regionCode: 'PK',
    listingType: 'stud_service',
    title: 'Exotic species',
    breedingMethod: 'natural',
    currencyCode: 'PKR',
    species: 'dog',
    breedId: null,
    breedName: null,
    sex: 'male',
    city: 'Lahore',
    provinceOrState: null,
    latitude: null,
    longitude: null,
    healthStatus: 'healthy',
    verificationDimensions: {
      owner_identity: 'verified',
      media: 'verified',
      health: 'verified',
      vaccination: 'verified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
    ownerDisplayName: null,
  });

  const result = await moderation.approveCategory(listing.id, ADMIN, { approved: true });
  assert.equal(result.metadata.category_approved, true);
});
