import type { BREEDING_METHODS } from '../constants';
import type { Species } from './index';

type BreedingMethod = (typeof BREEDING_METHODS)[number];

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'expired'
  | 'rejected'
  | 'suspended';

export type ListingType =
  | 'animal'
  | 'stud_service'
  | 'breeder_profile'
  | 'semen_provider'
  | 'expected_offspring';

export type ListingFee = {
  amount: string;
  currencyCode: string;
};

export type VerificationSummary = {
  approvedCount: number;
  dimensions: Record<string, string>;
};

export type PublicListingSummary = {
  id: string;
  title: string;
  listingType: ListingType;
  species: Species;
  breedName: string | null;
  sex: string;
  city: string | null;
  fee: ListingFee | null;
  breedingMethod: BreedingMethod;
  verificationSummary: VerificationSummary;
  compatibilityScore?: number;
  distanceKm?: number;
  publishedAt: string | null;
  thumbnailUrl?: string | null;
};
