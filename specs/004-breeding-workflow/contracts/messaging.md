# Contract: Messaging

Paths under `/api/v1`. Bearer required. Uses `messaging` rate-limit category. Errors:
`{ code, message, details? }`. Cursor pagination on message lists.

Phone numbers in `body` are masked per `PHONE_REVEAL_POLICY` until the linked breeding
request reaches `Accepted` or `Scheduled` (unless `regions.config.phoneRevealAfter`
overrides). (FR-007, US3)

## GET /conversations

List conversations for the current user. (FR-006)

- Query: `cursor?`, `limit?`, `requestId?`, `listingId?`
- 200:

```json
{
  "data": [
    {
      "id": "uuid",
      "requestId": "uuid",
      "listingId": null,
      "status": "active",
      "lastMessageAt": "2026-06-20T12:00:00Z",
      "participants": [{ "userId": "uuid", "displayName": "string" }]
    }
  ],
  "meta": { "nextCursor?", "hasMore" }
}
```

## GET /conversations/:id/messages

Paginated messages (participant or support only). (FR-006, US3)

- Query: `cursor?`, `limit?` (default 50)
- 200:

```json
{
  "data": [
    {
      "id": "uuid",
      "senderId": "uuid",
      "body": "See you at the farm. [phone hidden]",
      "attachment": { "path": "...", "readUrl": "signed", "expiresAt": "..." },
      "phoneRevealed": false,
      "createdAt": "2026-06-20T12:00:00Z"
    }
  ],
  "meta": { "nextCursor?", "hasMore" }
}
```

- 403: non-participant
- When request is `Accepted`/`Scheduled` (per policy): `phoneRevealed: true` and unmasked
  body for newly eligible messages; historical messages stored masked remain masked unless
  policy says re-render (default: stored form returned).

## POST /conversations/:id/messages

Send message. (FR-006, FR-007)

- Body: `{ body?, attachmentPath? }` — `attachmentPath` from prior signed upload flow
- 201: created message (masked body if pre-reveal)
- 400: empty body and no attachment
- 403: non-participant or frozen conversation
- 429 `RATE_LIMITED`

## POST /conversations

Start conversation (listing inquiry or request thread).

- Body: `{ listingId? , requestId? }` + implicit counterparty from listing/request
- 201: conversation (idempotent if already exists between participants for same context)

## POST /messages/:id/report

Report message for support. (FR-008)

- Body: `{ reasonCode, description? }`
- 200: `{ reported: true }`; `moderation_status` → `reported`; audit `message.reported`
- 403: non-participant reporter

## Support freeze (admin)

- `POST /admin/conversations/:id/freeze` — sets `status: frozen` (M4 admin route; used
  during dispute); documented for support visibility requirement FR-008.

## Phone masking rules

| Request status | Message body phone patterns |
|----------------|------------------------------|
| `Requested`, `Draft` | Masked |
| `Accepted`, `Scheduled`, later | Revealed per regional policy (default: revealed) |
| No linked request (listing only) | Always masked |
| `Rejected`, `Cancelled` | Read-only; no new messages (policy) |

Automated tests MUST assert 100% mask rate pre-acceptance (SC-003).
