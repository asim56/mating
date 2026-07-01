import type {
  BreedingMethod,
  ListingStatus,
  ListingType,
  RegionCode,
  Species,
  VerificationDimensionMap,
} from '@mating/shared';

export type Listing = {
  id: string;
  animalId: string;
  ownerId: string;
  regionId: string;
  regionCode: RegionCode;
  listingType: ListingType;
  status: ListingStatus;
  title: string;
  description: string | null;
  breedingMethod: BreedingMethod;
  priceAmount: number | null;
  currencyCode: string;
  availability: Record<string, unknown>;
  locationRadiusKm: number | null;
  boostActive: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  species: Species;
  breedId: string | null;
  breedName: string | null;
  sex: string;
  city: string | null;
  provinceOrState: string | null;
  latitude: number | null;
  longitude: number | null;
  healthStatus: string;
  verificationDimensions: VerificationDimensionMap;
  ownerDisplayName: string | null;
};

export type ListingCreate = {
  animalId: string;
  ownerId: string;
  regionId: string;
  regionCode: RegionCode;
  listingType: ListingType;
  title: string;
  description?: string | null;
  breedingMethod: BreedingMethod;
  priceAmount?: number | null;
  currencyCode: string;
  availability?: Record<string, unknown>;
  locationRadiusKm?: number | null;
  species: Species;
  breedId: string | null;
  breedName: string | null;
  sex: string;
  city: string | null;
  provinceOrState: string | null;
  latitude: number | null;
  longitude: number | null;
  healthStatus: string;
  verificationDimensions: VerificationDimensionMap;
  ownerDisplayName: string | null;
};

export type ListingUpdate = Partial<
  Pick<
    Listing,
    | 'title'
    | 'description'
    | 'breedingMethod'
    | 'priceAmount'
    | 'availability'
    | 'locationRadiusKm'
    | 'listingType'
  >
>;

export type ListListingsFilter = {
  ownerId: string;
  status?: ListingStatus;
  cursor?: string;
  limit: number;
};

export type SavedListing = {
  userId: string;
  listingId: string;
  createdAt: string;
};
