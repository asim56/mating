import type { VerificationDimension } from '../types/animal';

/** All passive verification dimensions initialized to `unverified` on create. */
export const VERIFICATION_DIMENSIONS: readonly VerificationDimension[] = [
  'owner_identity',
  'media',
  'health',
  'vaccination',
  'pedigree',
  'facility',
] as const;

/** Human-readable requirement keys returned when publish-ready validation fails. */
export const ANIMAL_PUBLISH_READY_REQUIREMENTS = [
  'min_age',
  'owner_declaration',
  'image_count',
  'health_not_blocked',
  'required_fields',
] as const;

export type PublishReadyRequirement = (typeof ANIMAL_PUBLISH_READY_REQUIREMENTS)[number];
