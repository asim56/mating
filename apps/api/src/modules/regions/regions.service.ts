import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ApiError, ERROR_CODES } from '../../common';
import type { UpdateRegionDto } from './dto/update-region.dto';
import {
  type Region,
  type RegionPublicView,
  type RegionUpdate,
  toPublicView,
} from './entities/region.entity';
import { AUDIT_EMITTER } from '../audit/audit.service';
import { REGION_REPOSITORY, type RegionRepository } from './regions.repository';
import {
  type AuditEmitter,
  regionUpdatedEvent,
} from './events/region-updated.event';

@Injectable()
export class RegionsService {
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: AuditEmitter,
  ) {}

  /** Active regions only, projected to the public-safe view. */
  async listPublic(): Promise<RegionPublicView[]> {
    const active = await this.regions.findActive();
    return active.map(toPublicView);
  }

  /** All regions (admin), including full configuration. */
  async listAll(): Promise<Region[]> {
    return this.regions.findAll();
  }

  /** Single region by code (admin); 404 when unknown. */
  async getByCode(code: string): Promise<Region> {
    const region = await this.regions.findByCode(code);
    if (!region) {
      throw new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Region '${code}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }
    return region;
  }

  /**
   * Applies an admin patch and emits a `region.updated` audit event. 404 when
   * the region is unknown. Only the fields present in `dto` are changed.
   */
  async update(code: string, dto: UpdateRegionDto, actorId: string): Promise<Region> {
    const patch: RegionUpdate = dto;
    const updated = await this.regions.update(code, patch);
    if (!updated) {
      throw new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Region '${code}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.audit.emit(regionUpdatedEvent(actorId, code, Object.keys(dto)));
    return updated;
  }
}
