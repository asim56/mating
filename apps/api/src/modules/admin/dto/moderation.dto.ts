import type { ModerationReasonCode } from '@mating/shared';

export type SuspendListingDto = {
  reasonCode: ModerationReasonCode;
  notes?: string;
};

export type SuspendAnimalDto = {
  reasonCode: ModerationReasonCode;
  notes?: string;
};

export type ApproveCategoryDto = {
  approved: boolean;
  notes?: string;
};

export type UnsuspendDto = {
  notes?: string;
};

export type ReportMessageDto = {
  reasonCode: ModerationReasonCode;
  notes?: string;
};
