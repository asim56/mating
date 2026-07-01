/** Breeding lifecycle status for an animal record. */
export type AnimalBreedingStatus = 'draft' | 'publish_ready' | 'listed' | 'not_listed';

/** Passive verification dimensions displayed per-dimension (never aggregated). */
export type VerificationDimension =
  | 'owner_identity'
  | 'media'
  | 'health'
  | 'vaccination'
  | 'pedigree'
  | 'facility';

export type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

export type VerificationDimensionMap = Record<VerificationDimension, VerificationStatus>;

/** Clinical health record categories. */
export type HealthRecordType =
  | 'vaccination'
  | 'deworming'
  | 'disease_test'
  | 'fertility'
  | 'pregnancy'
  | 'certificate'
  | 'contraindication';

export type AnimalHealthStatus = 'unknown' | 'healthy' | 'attention' | 'blocked';

export type AnimalMediaType = 'image' | 'document';

export type AnimalSex = 'male' | 'female' | 'unknown';
