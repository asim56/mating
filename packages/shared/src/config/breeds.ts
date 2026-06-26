import type { RegionCode, Species } from '../types';

/**
 * Canonical breed taxonomy for the `breeds` module (M1, BREEDS-01).
 *
 * This module is the single source of truth for the seeded `breeds` rows: the
 * same definitions are inserted by `supabase/seed.sql` and served by the API's
 * in-memory breed repository until the database client lands. Keeping the
 * taxonomy here lets every layer (seed, API, tests) read identical, typed values
 * and prevents the species/breed list from drifting between layers.
 *
 * Scope is the Pakistan MVP: the priority species from the ImplementationPlan
 * (cattle, buffalo, goat, sheep, dog) seeded with well-known Pakistani breeds.
 */

/** A canonical breed within a species and region. */
export type BreedDefinition = {
  /** Region this breed belongs to (links to `regions.code`). */
  regionCode: RegionCode;
  /** Species the breed belongs to. */
  species: Species;
  /** Breed name; unique per (species, region). */
  name: string;
  /** Short, non-sensitive description shown on reference surfaces. */
  description: string;
  /** Whether the breed is selectable; inactive breeds are hidden from listings. */
  active: boolean;
};

function pk(species: Species, name: string, description: string): BreedDefinition {
  return { regionCode: 'PK', species, name, description, active: true };
}

/**
 * Canonical, seeded breed definitions for Pakistan. Names are unique within a
 * (species, region) pair, matching the `breeds` unique constraint.
 */
export const BREED_DEFINITIONS: readonly BreedDefinition[] = [
  // Cattle
  pk('cattle', 'Sahiwal', 'Heat-tolerant dairy breed from the Punjab region.'),
  pk('cattle', 'Cholistani', 'Hardy dual-purpose breed from the Cholistan desert.'),
  pk('cattle', 'Red Sindhi', 'Dairy breed originating in Sindh.'),
  pk('cattle', 'Dhanni', 'Draught and dual-purpose breed from the Pothohar plateau.'),
  pk('cattle', 'Tharparkar', 'Dual-purpose breed from the Tharparkar district.'),

  // Buffalo
  pk('buffalo', 'Nili-Ravi', 'High-yield dairy buffalo from central Punjab.'),
  pk('buffalo', 'Kundi', 'Dairy buffalo native to Sindh.'),
  pk('buffalo', 'Azakheli', 'Buffalo breed from the Swat valley.'),

  // Goat
  pk('goat', 'Beetal', 'Large dairy and meat goat from the Punjab.'),
  pk('goat', 'Teddy', 'Small, prolific meat goat from the Pothohar region.'),
  pk('goat', 'Kamori', 'Dairy goat known for its distinctive long ears, from Sindh.'),
  pk('goat', 'Nachi', 'Meat goat with a characteristic dancing gait, from the Punjab.'),

  // Sheep
  pk('sheep', 'Kajli', 'Meat and wool sheep from the Punjab.'),
  pk('sheep', 'Lohi', 'Dual-purpose meat and wool sheep from central Punjab.'),
  pk('sheep', 'Thalli', 'Meat sheep from the Thal desert region.'),
  pk('sheep', 'Balkhi', 'Fat-tailed mountain sheep from Khyber Pakhtunkhwa.'),

  // Dog
  pk('dog', 'Bully Kutta', 'Large guardian and working dog from the subcontinent.'),
  pk('dog', 'Gull Terr', 'Agile working terrier-type dog bred in the Punjab.'),
  pk('dog', 'Gull Dong', 'Powerful guardian dog, a Bully Kutta and Gull Terr cross.'),
];

/** All breed definitions for a region. */
export function getBreedsForRegion(code: RegionCode): BreedDefinition[] {
  return BREED_DEFINITIONS.filter((breed) => breed.regionCode === code);
}

/** All breed definitions for a species within a region. */
export function getBreedsForSpecies(code: RegionCode, species: Species): BreedDefinition[] {
  return BREED_DEFINITIONS.filter(
    (breed) => breed.regionCode === code && breed.species === species,
  );
}
