import type {
  AnimalBreedingStatus,
  AnimalHealthStatus,
  AnimalSex,
  RegionCode,
  Species,
  VerificationDimensionMap,
} from '@mating/shared';

export type Animal = {
  id: string;
  ownerId: string;
  regionCode: RegionCode;
  regionId: string;
  species: Species;
  breedId: string | null;
  name: string | null;
  tagNumber: string | null;
  sex: AnimalSex;
  dateOfBirth: string | null;
  approximateAgeMonths: number | null;
  weightKg: number | null;
  color: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  provinceOrState: string | null;
  countryCode: string | null;
  breedingStatus: AnimalBreedingStatus;
  healthStatus: AnimalHealthStatus;
  ownerDeclaration: boolean;
  verificationDimensions: VerificationDimensionMap;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type AnimalCreate = {
  ownerId: string;
  regionCode: RegionCode;
  regionId: string;
  species: Species;
  breedId?: string | null;
  name?: string | null;
  tagNumber?: string | null;
  sex: AnimalSex;
  dateOfBirth?: string | null;
  approximateAgeMonths?: number | null;
  weightKg?: number | null;
  color?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  provinceOrState?: string | null;
  countryCode?: string | null;
  verificationDimensions: VerificationDimensionMap;
};

export type AnimalUpdate = Partial<
  Omit<AnimalCreate, 'ownerId' | 'regionCode' | 'regionId'>
> & {
  ownerDeclaration?: boolean;
  healthStatus?: AnimalHealthStatus;
};

export type AnimalMedia = {
  id: string;
  animalId: string;
  storagePath: string;
  mediaType: 'image' | 'document';
  visibility: string;
  sortOrder: number;
  deletedAt: string | null;
};

export type AnimalMediaCreate = {
  animalId: string;
  storagePath: string;
  mediaType: 'image' | 'document';
  sortOrder?: number;
};

export type ListAnimalsFilter = {
  ownerId: string;
  breedingStatus?: AnimalBreedingStatus;
  cursor?: string;
  limit: number;
  includeDeleted?: boolean;
};
