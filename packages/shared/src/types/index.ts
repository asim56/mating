import type { BREEDING_METHODS, REGIONS, USER_ROLES } from '../constants';

export type RegionCode = keyof typeof REGIONS;
export type UserRole = (typeof USER_ROLES)[number];
export type BreedingMethod = (typeof BREEDING_METHODS)[number];

export type CursorPaginationParams = {
  cursor?: string;
  limit?: number;
};

export type CursorPaginationMeta = {
  nextCursor: string | null;
  hasMore: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: CursorPaginationMeta;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type Timestamps = {
  createdAt: string;
  updatedAt: string;
};

export type SoftDeletable = {
  deletedAt: string | null;
};
