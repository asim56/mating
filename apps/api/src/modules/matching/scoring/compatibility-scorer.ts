import { computeCompatibilityScore, type CompatibilityInput } from '@mating/shared';

import type { Animal } from '../../animals/entities/animal.entity';
import type { Listing } from '../../marketplace/entities/listing.entity';
import { haversineKm } from './distance';

export type ScorerContext = {
  requesterAnimal?: Animal | null;
  maxDistanceKm?: number;
  hasPedigree?: boolean;
};

export class CompatibilityScorer {
  score(listing: Listing, context: ScorerContext): { score: number; distanceKm: number | null } {
    const distanceKm =
      context.requesterAnimal?.latitude != null &&
      context.requesterAnimal.longitude != null &&
      listing.latitude != null &&
      listing.longitude != null
        ? haversineKm(
            context.requesterAnimal.latitude,
            context.requesterAnimal.longitude,
            listing.latitude,
            listing.longitude,
          )
        : null;

    const approvedDimensionCount = Object.values(listing.verificationDimensions).filter(
      (v) => v === 'approved',
    ).length;

    const input: CompatibilityInput = {
      sameSpecies: context.requesterAnimal
        ? context.requesterAnimal.species === listing.species
        : true,
      sameBreed: Boolean(
        context.requesterAnimal?.breedId &&
          listing.breedId &&
          context.requesterAnimal.breedId === listing.breedId,
      ),
      healthStatus: listing.healthStatus,
      hasPedigree: context.hasPedigree ?? false,
      approvedDimensionCount,
      distanceKm,
      maxDistanceKm: context.maxDistanceKm ?? listing.locationRadiusKm ?? 100,
    };

    return { score: computeCompatibilityScore(input), distanceKm };
  }
}
