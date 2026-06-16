# Integration.md

## Integration Strategy

All external services must be wrapped behind internal provider interfaces. The application should not leak provider-specific request or response structures into domain services.

## Primary Providers

| Capability | MVP Provider | Phase 2 Provider | Notes |
| --- | --- | --- | --- |
| Auth | Supabase Auth | Supabase Auth or dedicated identity service | Abstract auth claims and role mapping |
| Database | Supabase PostgreSQL | Supabase PostgreSQL / managed Postgres | Keep migrations portable |
| Storage | Supabase Storage | Supabase Storage or S3-compatible | Use signed URLs |
| Realtime | Supabase Realtime | Dedicated websocket service if needed | MVP chat can start here |
| Email | Resend | Resend | Transactional templates |
| SMS | Twilio or local aggregator | Twilio | Pakistan SMS deliverability must be validated |
| Push | Firebase Cloud Messaging | FCM | PWA and future native apps |
| Pakistan Payments | Easypaisa, JazzCash, bank transfer | Same plus Raast-enabled options | Provider availability and merchant approval required |
| USA Payments | Not MVP | Stripe | Stripe Connect for payouts |
| Analytics | PostHog | PostHog plus warehouse later | Track funnel events |
| Error Monitoring | Sentry | Sentry | Frontend and backend |
| Web Analytics | Vercel Analytics | Vercel Analytics | Page-level performance |

## Supabase

### Use

- Authentication.
- PostgreSQL.
- Row Level Security.
- Storage buckets.
- Realtime subscriptions.

### Buckets

| Bucket | Access | Contents |
| --- | --- | --- |
| `animal-media` | Public thumbnails, signed originals | Animal images and videos |
| `health-records` | Private signed URLs | Vet certificates, lab results |
| `pedigree-documents` | Private signed URLs | Registration and lineage documents |
| `payment-proofs` | Private signed URLs | Bank transfer receipts |
| `verification-evidence` | Private signed URLs | Inspector and identity evidence |

### Storage Rules

- Images and videos must be associated with an animal or verification record.
- Documents default to private.
- Public media should use optimized derivatives.
- Original files should be retained for verification and audit.

## Resend

### Email Templates

- Welcome email.
- Email verification.
- Breeding request received.
- Request accepted/rejected.
- Schedule confirmed.
- Payment receipt.
- Refund confirmation.
- Verification approved/rejected.
- Dispute opened/resolved.

## SMS Provider

### MVP Requirements

- OTP support if Supabase phone auth does not meet local deliverability needs.
- Request status updates.
- Payment reminders.
- Verification appointment reminders.

Pakistan SMS deliverability must be tested with actual mobile networks before launch.

## Firebase Cloud Messaging

### Push Events

- New message.
- Request status change.
- Payment status change.
- Verification status change.
- Schedule reminder.

## Payments

### Pakistan: Easypaisa and JazzCash

Expected flows:

- Hosted checkout or wallet checkout where available.
- Transaction callback/webhook.
- Manual status polling fallback.
- Proof upload for bank transfer.
- Admin reconciliation screen.

Important:

- True escrow may require a licensed partner or legally compliant wallet structure.
- MVP should represent escrow internally as a ledger state and release funds operationally according to provider capabilities.
- Do not claim regulated escrow unless legal review confirms the structure.

### USA: Stripe

Expected flows:

- Stripe Checkout for one-time fees.
- Stripe Billing for subscriptions.
- Stripe Connect for marketplace payouts.
- Refunds through Stripe API.
- Webhook signature verification.
- Idempotent payment event handling.

## PostHog

### Event Naming

Use snake_case event names and include:

- `region`
- `role`
- `species`
- `source`
- `listing_id` when applicable
- `request_id` when applicable
- `payment_provider` when applicable

Do not send health documents, private messages, full names, phone numbers, or payment proof contents to analytics.

## Sentry

### Requirements

- Capture frontend runtime errors.
- Capture API exceptions.
- Include release version.
- Exclude secrets, tokens, signed URLs, and private health data.
- Alert on payment webhook failures and high 5xx rates.

## Integration Interfaces

Backend should define interfaces similar to:

```ts
export interface PaymentProvider {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<PaymentProviderEvent>;
  refund(input: RefundInput): Promise<RefundResult>;
}

export interface NotificationProvider {
  send(input: NotificationInput): Promise<NotificationResult>;
}

export interface StorageProvider {
  createSignedUploadUrl(input: SignedUploadInput): Promise<SignedUrlResult>;
  createSignedReadUrl(input: SignedReadInput): Promise<SignedUrlResult>;
}
```

## Checkpoint

No domain service should import a payment, email, SMS, storage, or analytics SDK directly. Integrations must be swappable by region and environment.

