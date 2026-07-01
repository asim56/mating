import assert from 'node:assert/strict';
import test from 'node:test';

import { BREEDING_REQUEST_STATUS, type BreedingRequestStatus } from '../enums/breeding-request-status';
import {
  BREEDING_REQUEST_ACTIONS,
  BreedingRequestStateMachine,
  BreedingRequestTransitionError,
  type BreedingRequestAction,
} from './breeding-request.state-machine';

const ALLOWED: Array<[BreedingRequestStatus, BreedingRequestAction, BreedingRequestStatus]> = [
  ['Draft', 'submit', 'Requested'],
  ['Requested', 'accept', 'Accepted'],
  ['Requested', 'reject', 'Rejected'],
  ['Requested', 'cancel', 'Cancelled'],
  ['Accepted', 'initiate_payment', 'PaymentPending'],
  ['Accepted', 'schedule', 'Scheduled'],
  ['Accepted', 'cancel', 'Cancelled'],
  ['PaymentPending', 'schedule', 'Scheduled'],
  ['PaymentPending', 'open_dispute', 'Disputed'],
  ['Scheduled', 'start', 'InProgress'],
  ['Scheduled', 'cancel', 'Cancelled'],
  ['Scheduled', 'open_dispute', 'Disputed'],
  ['InProgress', 'complete', 'Completed'],
  ['InProgress', 'open_dispute', 'Disputed'],
  ['Completed', 'generate_record', 'RecordGenerated'],
  ['Completed', 'open_dispute', 'Disputed'],
  ['RecordGenerated', 'close', 'Closed'],
  ['Disputed', 'refund', 'Refunded'],
  ['Disputed', 'resolve_close', 'Closed'],
];

const TERMINAL: BreedingRequestStatus[] = ['Rejected', 'Cancelled', 'Closed', 'Refunded'];

test('all allowed transitions resolve correctly', () => {
  for (const [from, action, expected] of ALLOWED) {
    assert.equal(BreedingRequestStateMachine.resolveTransition(from, action), expected);
    assert.equal(BreedingRequestStateMachine.canTransition(from, action), true);
    assert.equal(BreedingRequestStateMachine.assertTransition(from, action), expected);
  }
});

test('terminal and invalid transitions throw', () => {
  for (const status of TERMINAL) {
    for (const action of BREEDING_REQUEST_ACTIONS) {
      assert.throws(
        () => BreedingRequestStateMachine.assertTransition(status, action),
        BreedingRequestTransitionError,
      );
    }
  }

  assert.throws(
    () => BreedingRequestStateMachine.assertTransition('Rejected', 'accept'),
    BreedingRequestTransitionError,
  );
  assert.throws(
    () => BreedingRequestStateMachine.assertTransition('Draft', 'accept'),
    BreedingRequestTransitionError,
  );
  assert.throws(
    () => BreedingRequestStateMachine.assertTransition('Requested', 'schedule'),
    BreedingRequestTransitionError,
  );
  assert.throws(
    () => BreedingRequestStateMachine.assertTransition('InProgress', 'close'),
    BreedingRequestTransitionError,
  );
});

test('every non-terminal status has at least one outgoing action or is intermediate', () => {
  const statusesWithOutgoing = new Set(ALLOWED.map(([from]) => from));
  for (const status of BREEDING_REQUEST_STATUS) {
    if (TERMINAL.includes(status)) continue;
    assert.ok(statusesWithOutgoing.has(status), `${status} should have outgoing transitions`);
  }
});
