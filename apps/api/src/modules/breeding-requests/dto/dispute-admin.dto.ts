import type { DisputeResolutionCode, DisputeResolutionType } from '@mating/shared';

export type AssignDisputeDto = {
  assigneeId?: string;
};

export type ResolveDisputeDto = {
  resolutionType: DisputeResolutionType;
  resolutionCode: DisputeResolutionCode;
  notes?: string;
  refundAmount?: number;
};
