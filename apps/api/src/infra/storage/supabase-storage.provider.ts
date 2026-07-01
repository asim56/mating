import { Injectable } from '@nestjs/common';

import type {
  SignedReadInput,
  SignedUploadInput,
  SignedUrlResult,
  StorageProvider,
} from '@mating/shared';

import { SupabaseService } from '../supabase/supabase.service';

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

@Injectable()
export class SupabaseStorageProvider implements StorageProvider {
  constructor(private readonly supabase: SupabaseService) {}

  async createSignedUploadUrl(input: SignedUploadInput): Promise<SignedUrlResult> {
    const expiresIn = input.expiresInSeconds ?? 3600;
    const { data, error } = await this.supabase.client.storage
      .from(input.bucket)
      .createSignedUploadUrl(input.path, { upsert: false });

    if (error || !data) {
      throw new Error(`signed upload URL failed: ${error?.message ?? 'unknown'}`);
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return { url: data.signedUrl, expiresAt };
  }

  async createSignedReadUrl(input: SignedReadInput): Promise<SignedUrlResult> {
    const expiresIn = input.expiresInSeconds ?? 3600;
    const { data, error } = await this.supabase.client.storage
      .from(input.bucket)
      .createSignedUrl(input.path, expiresIn);

    if (error || !data) {
      throw new Error(`signed read URL failed: ${error?.message ?? 'unknown'}`);
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return { url: data.signedUrl, expiresAt };
  }
}

/** Builds owner-scoped storage path: `{ownerId}/{animalId}/{filename}`. */
export function ownerScopedPath(ownerId: string, animalId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${ownerId}/${animalId}/${safeName}`;
}
