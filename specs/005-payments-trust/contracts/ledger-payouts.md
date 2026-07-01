# Contract: Ledger & payouts (authenticated)

Paths under `/api/v1`. Bearer required. Errors: `{ code, message, details? }`.

## GET /ledger/me

Payee balance summary derived from immutable entries. (FR-004)

- 200:
  ```json
  {
    "availableBalance": 12000.00,
    "pendingBalance": 3000.00,
    "currencyCode": "PKR",
    "lastUpdatedAt": "ISO8601"
  }
  ```
- Computation: sum credits − debits for `account_type=payee_balance` and `account_id=self`;
  `pending` = confirmed but not yet released via payout.

## GET /ledger/me/entries

Own ledger line items (cursor-paginated).

- Query: `cursor?`, `limit?`, `entryType?`
- 200: `{ data: [{ id, entryType, direction, amount, currencyCode, createdAt }], meta }`
- No UPDATE/DELETE endpoints exist.

## POST /payout-accounts

Register payout destination. (FR-010, US5)

- Body:
  ```json
  {
    "provider": "bank_transfer|easypaisa|jazzcash",
    "accountType": "bank_account|mobile_wallet",
    "accountReference": "string",
    "metadata?": { "bankName": "...", "accountTitle": "..." }
  }
  ```
- 201: payout account (reference masked in responses)
- 400 `VALIDATION_FAILED`

## GET /payout-accounts

List own payout accounts.

- 200: `{ data: [...] }`

## POST /payouts

Request payout with idempotency. (FR-010, US5)

- Header or body: `idempotencyKey` (required)
- Body: `{ "payoutAccountId": "uuid", "amount": 5000.00, "currencyCode": "PKR" }`
- 201: `{ id, status: "pending", amount, ... }`
- 200: existing payout on duplicate idempotency key
- 400: amount exceeds available balance
- 403: non-owner account

## GET /payouts

List own payouts.

- Query: `cursor?`, `limit?`, `status?`
- 200: cursor-paginated list

## GET /payouts/:id

Get single payout for payee.

- 200 / 403 / 404
