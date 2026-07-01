import type { RegionCode, Species } from '@mating/shared';

/**
 * Domain representation of a `breeds` row. Mirrors the Supabase table created in
 * `20250702000000_breeds.sql` and the canonical taxonomy in `@mating/shared`
 * (config/breeds).
 */
export type Breed = {
  id: string;
  regionCode: RegionCode;
  species: Species;
  name: string;
  description: string | null;
  active: boolean;
};

/** Fields accepted when creating a breed (id is server-assigned). */
export type BreedCreate = {
  regionCode: RegionCode;
  species: Species;
  name: string;
  description?: string | null;
  active?: boolean;
};

/** Fields an admin may patch on a breed. Species/region/name identity is stable. */
export type BreedUpdate = {
  name?: string;
  description?: string | null;
  active?: boolean;
};

/**
 * Public-safe projection of a breed: reference data only. There is nothing
 * sensitive on a breed, so the public view simply omits the `active` flag
 * (inactive breeds are filtered out before projection).
 */
export type BreedPublicView = {
  id: string;
  regionCode: RegionCode;
  species: Species;
  name: string;
  description: string | null;
};

export function toPublicView(breed: Breed): BreedPublicView {
  return {
    id: breed.id,
    regionCode: breed.regionCode,
    species: breed.species,
    name: breed.name,
    description: breed.description,
  };
}
