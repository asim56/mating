export type PedigreeRecord = {
  id: string;
  animalId: string;
  sireAnimalId: string | null;
  damAnimalId: string | null;
  registryName: string | null;
  registryNumber: string | null;
  documentPath: string | null;
  verificationStatus: 'unverified' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
};

export type PedigreeCreate = {
  animalId: string;
  sireAnimalId?: string | null;
  damAnimalId?: string | null;
  registryName?: string | null;
  registryNumber?: string | null;
  documentPath?: string | null;
};
