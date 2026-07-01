export const PAYMENT_INTENT_CREATED = 'payment.intent_created';
export const PAYMENT_PROOF_UPLOADED = 'payment.proof_uploaded';
export const PAYMENT_CONFIRMED = 'payment.confirmed';
export const PAYMENT_RECONCILED = 'payment.reconciled';
export const PAYMENT_REFUNDED = 'payment.refunded';
export const WEBHOOK_RECEIVED = 'webhook.received';
export const WEBHOOK_DUPLICATE_IGNORED = 'webhook.duplicate_ignored';
export const BOOST_PURCHASED = 'boost.purchased';
export const SUBSCRIPTION_CREATED = 'subscription.created';
export const SUBSCRIPTION_CANCEL_SCHEDULED = 'subscription.cancel_scheduled';
export const ADMIN_DOCUMENT_ACCESSED = 'admin.document_accessed';

export type PaymentAuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

export function paymentIntentCreatedEvent(
  actorId: string,
  intentId: string,
  metadata?: Record<string, unknown>,
): PaymentAuditEvent {
  return {
    action: PAYMENT_INTENT_CREATED,
    actorId,
    subjectType: 'payment_intent',
    subjectId: intentId,
    metadata,
  };
}

export function paymentProofUploadedEvent(
  actorId: string,
  intentId: string,
): PaymentAuditEvent {
  return {
    action: PAYMENT_PROOF_UPLOADED,
    actorId,
    subjectType: 'payment_intent',
    subjectId: intentId,
  };
}

export function paymentConfirmedEvent(
  actorId: string,
  intentId: string,
  metadata?: Record<string, unknown>,
): PaymentAuditEvent {
  return {
    action: PAYMENT_CONFIRMED,
    actorId,
    subjectType: 'payment_intent',
    subjectId: intentId,
    metadata,
  };
}

export function paymentReconciledEvent(
  actorId: string,
  intentId: string,
  metadata?: Record<string, unknown>,
): PaymentAuditEvent {
  return {
    action: PAYMENT_RECONCILED,
    actorId,
    subjectType: 'payment_intent',
    subjectId: intentId,
    metadata,
  };
}

export function paymentRefundedEvent(
  actorId: string,
  intentId: string,
  metadata?: Record<string, unknown>,
): PaymentAuditEvent {
  return {
    action: PAYMENT_REFUNDED,
    actorId,
    subjectType: 'payment_intent',
    subjectId: intentId,
    metadata,
  };
}

export function webhookReceivedEvent(
  provider: string,
  eventId: string,
  intentId?: string,
): PaymentAuditEvent {
  return {
    action: WEBHOOK_RECEIVED,
    actorId: 'system',
    subjectType: 'webhook_event',
    subjectId: eventId,
    metadata: { provider, paymentIntentId: intentId },
  };
}

export function webhookDuplicateIgnoredEvent(
  provider: string,
  eventId: string,
): PaymentAuditEvent {
  return {
    action: WEBHOOK_DUPLICATE_IGNORED,
    actorId: 'system',
    subjectType: 'webhook_event',
    subjectId: eventId,
    metadata: { provider },
  };
}

export function adminDocumentAccessedEvent(
  adminId: string,
  intentId: string,
): PaymentAuditEvent {
  return {
    action: ADMIN_DOCUMENT_ACCESSED,
    actorId: adminId,
    subjectType: 'payment_intent',
    subjectId: intentId,
  };
}
