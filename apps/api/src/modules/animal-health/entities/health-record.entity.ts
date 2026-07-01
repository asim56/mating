import type { HealthRecordType } from '@mating/shared';

export type HealthRecord = {
  id: string;
  animalId: string;
  veterinarianId: string | null;
  recordType: HealthRecordType;
  title: string;
  recordDate: string;
  expiresAt: string | null;
  status: string;
  storagePath: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type HealthRecordCreate = {
  animalId: string;
  veterinarianId?: string | null;
  recordType: HealthRecordType;
  title: string;
  recordDate: string;
  expiresAt?: string | null;
  storagePath?: string | null;
  createdBy: string;
};
