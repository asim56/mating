import type { BreedingRequestStatus } from '../enums/breeding-request-status';

export const BREEDING_REQUEST_ACTIONS = [
  'submit',
  'accept',
  'reject',
  'cancel',
  'initiate_payment',
  'schedule',
  'start',
  'complete',
  'generate_record',
  'close',
  'open_dispute',
  'refund',
  'resolve_close',
] as const;

export type BreedingRequestAction = (typeof BREEDING_REQUEST_ACTIONS)[number];

/** Maps (fromStatus, action) → toStatus for allowed transitions. */
export const BREEDING_REQUEST_TRANSITIONS: Partial<
  Record<BreedingRequestStatus, Partial<Record<BreedingRequestAction, BreedingRequestStatus>>>
> = {
  Draft: { submit: 'Requested' },
  Requested: { accept: 'Accepted', reject: 'Rejected', cancel: 'Cancelled' },
  Accepted: { initiate_payment: 'PaymentPending', schedule: 'Scheduled', cancel: 'Cancelled' },
  PaymentPending: { schedule: 'Scheduled', open_dispute: 'Disputed' },
  Scheduled: { start: 'InProgress', cancel: 'Cancelled', open_dispute: 'Disputed' },
  InProgress: { complete: 'Completed', open_dispute: 'Disputed' },
  Completed: { generate_record: 'RecordGenerated', open_dispute: 'Disputed' },
  RecordGenerated: { close: 'Closed' },
  Disputed: { refund: 'Refunded', resolve_close: 'Closed' },
};

export class BreedingRequestStateMachine {
  static resolveTransition(
    from: BreedingRequestStatus,
    action: BreedingRequestAction,
  ): BreedingRequestStatus | null {
    return BREEDING_REQUEST_TRANSITIONS[from]?.[action] ?? null;
  }

  static assertTransition(
    from: BreedingRequestStatus,
    action: BreedingRequestAction,
  ): BreedingRequestStatus {
    const to = BreedingRequestStateMachine.resolveTransition(from, action);
    if (!to) {
      throw new BreedingRequestTransitionError(from, action);
    }
    return to;
  }

  static canTransition(from: BreedingRequestStatus, action: BreedingRequestAction): boolean {
    return BreedingRequestStateMachine.resolveTransition(from, action) !== null;
  }
}

export class BreedingRequestTransitionError extends Error {
  readonly from: BreedingRequestStatus;
  readonly action: BreedingRequestAction;

  constructor(from: BreedingRequestStatus, action: BreedingRequestAction) {
    super(`Invalid transition: ${from} via ${action}`);
    this.name = 'BreedingRequestTransitionError';
    this.from = from;
    this.action = action;
  }
}
