# Pricing.md

## Pricing Strategy

Use a hybrid marketplace model:

1. Free onboarding to build supply.
2. Paid visibility products once listings receive meaningful traffic.
3. Verification fees for trust.
4. Commission or service fee on completed platform-mediated transactions.
5. Subscriptions for serious breeders and farms.
6. USA phase adds Stripe-powered deposits, contracts, and breeder SaaS features.

## Pakistan Pricing Principles

- Keep entry free for animal owners and early breeders.
- Charge for trust and visibility, not basic participation.
- Avoid high upfront fees for rural livestock owners.
- Offer PKR pricing rounded to familiar amounts.
- Support manual payment reconciliation during MVP.

## Pakistan MVP Pricing

| Product | Suggested Price | Notes |
| --- | ---: | --- |
| Basic owner account | Free | Required for demand |
| Basic animal profile | Free | Builds animal graph |
| Breeder profile | Free during launch | Later paid tiers |
| Featured listing, 7 days | PKR 500-1,500 | Depends on category and city |
| Featured listing, 30 days | PKR 1,500-5,000 | Higher for premium dogs/horses |
| Animal verification | PKR 500-2,000 | Remote/media check; field visit extra |
| Vet health verification | PKR 1,000-5,000 | Vet fee may be passed through |
| Inspector visit | PKR 2,000-10,000 | City and travel dependent |
| Transaction service fee | 3%-8% | Apply to platform-mediated payments |
| Bank transfer reconciliation fee | 0%-2% | Keep free initially if needed |

## Pakistan Subscription Tiers

| Tier | Monthly Price | Target User | Includes |
| --- | ---: | --- | --- |
| Starter | Free | Casual owner | Limited active listings, basic requests |
| Breeder Basic | PKR 1,000-2,500 | Small breeder | More listings, profile badge, analytics |
| Breeder Pro | PKR 5,000-10,000 | Serious breeder/farm | Featured credits, lead tools, priority support |
| Farm/Clinic | PKR 10,000-30,000 | Farms, vets, AI providers | Team accounts, verification tools, reports |

## USA Pricing

| Product | Suggested Price | Notes |
| --- | ---: | --- |
| Basic owner account | Free | Demand acquisition |
| Breeder profile | USD 19-49/month | Comparable to listing subscriptions |
| Per-litter/listing | USD 45-99 per 90 days | Similar buyer-facing listing norms |
| Verified breeder badge | USD 99-299/year | Requires compliance review |
| Transaction service fee | 3%-8% | Deposits and payments |
| Contract and document pack | USD 10-49/use | State-aware templates |
| Premium support/dispute handling | USD 25-150/case | Optional or included in Pro |

## Revenue Streams

### Commission

Take a fee on completed breeding payments handled through the platform.

Pros:

- Aligns with success.
- Low friction for onboarding.

Cons:

- Requires payment trust.
- Users may try to go off-platform.

Mitigation:

- Offer records, dispute handling, verification, and reputation only for platform-mediated transactions.

### Subscriptions

Monthly or annual plans for breeders, farms, clinics, and service providers.

Pros:

- Predictable revenue.
- Works for professional breeders.

Cons:

- Harder for early Pakistan supply unless value is clear.

Mitigation:

- Start with free trial or grandfathered early breeder plans.

### Boosts and Featured Listings

Paid promotion in search and category pages.

Pros:

- Easy to understand.
- Works well in classifieds-trained markets.

Cons:

- Can damage trust if low-quality listings dominate.

Mitigation:

- Require minimum profile completeness and disclose sponsored placement.

### Verification Fees

Charge for identity, animal, health, pedigree, or facility verification.

Pros:

- Directly supports trust positioning.
- Creates defensible data.

Cons:

- Operationally complex.

Mitigation:

- Start remote verification, add paid field inspections selectively.

### SaaS Tools for Breeders

Later features:

- Breeding calendar.
- Litter/offpsring management.
- Customer waitlists.
- Contract templates.
- Vaccination reminders.
- Pedigree exports.

## Escrow Model

MVP should use the term "protected payment" or "platform-held payment status" unless legal review confirms regulated escrow.

Ledger states:

- `payment_created`
- `payment_pending`
- `payment_confirmed`
- `held_pending_completion`
- `released_to_payee`
- `refund_pending`
- `refunded`
- `disputed`
- `charged_back`

## Refund Policy Framework

Refund rules should be region and category specific.

Pakistan MVP:

- Full refund if breeder rejects or does not respond within configured window.
- Partial refund if owner cancels after scheduling.
- No automatic refund after confirmed completion unless dispute is approved.
- Support review required for health, fraud, or welfare claims.

USA Phase 2:

- Add state-specific pet purchaser protection rules.
- Add contract-driven deposit rules.
- Add health certificate and vet exam windows.

## Unit Economics to Track

- Cost per verified breeder.
- Cost per active animal profile.
- Cost per breeding request.
- Search-to-request conversion.
- Request-to-completion conversion.
- Average breeding fee by species.
- Average revenue per completed request.
- Payment dispute rate.
- Support cost per transaction.
- Verification cost and margin.

## Checkpoint

Do not optimize pricing before liquidity. Early pricing should maximize verified supply, completed workflows, and trust signals.

