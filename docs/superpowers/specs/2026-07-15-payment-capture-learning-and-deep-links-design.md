# Payment capture learning and deep links

## Goal

Make repeated card-payment review faster without removing user control. Record remembers the most recently confirmed classification for a normalized merchant and opens a notification tap directly on the exact detected payment.

## Learned defaults

Confirmed transaction suggestions are the source of truth. For each pending suggestion, the backend finds the newest accepted suggestion owned by the same account with the same normalized merchant and a linked transaction. It returns a non-destructive preset containing the corrected merchant name, wallet, category, and note plus a `merchant-history` source marker.

This reuses durable accepted suggestions and linked transactions rather than creating a second merchant-rule store. Learning is account-scoped, cross-device, and updated automatically when the user confirms a later correction. Missing or deleted wallets/categories are ignored by the client, leaving the field unselected.

The review sheet applies the preset only as editable initial values. It labels remembered fields, preserves detected amount and time, and never creates a ledger transaction without confirmation.

## Notification routing

Native payment notifications carry the local suggestion ID. Synchronization sends that ID as the stable event hash and receives the backend suggestion. The app resolves a requested ID against backend ID, exact event hash, or the local event-hash suffix before opening the sheet.

Tapping the notification body or Edit opens `/finance/transactions?paymentSuggestionId=<id>&captureAction=edit`. Confirm opens the same exact review with `captureAction=confirm`; it does not bypass the review sheet. If the requested suggestion was already accepted, rejected, expired, or unavailable, Record opens the pending review queue and explains that the original item is no longer waiting.

## Error and privacy rules

- Raw notification text remains local and is never part of learning.
- Merchant history is account-owned and derived only from confirmed transactions.
- A preset never overrides amount, currency, or occurrence time.
- A notification tap never silently creates a transaction.
- Invalid learned wallet/category IDs are discarded before rendering.

## Verification

- Backend tests cover newest-match enrichment, account isolation, no-history behavior, and accepted corrections becoming the next preset.
- Frontend tests cover merchant matching, valid preset filtering, exact/suffix deep-link resolution, and stale-link fallback.
- Android contract tests require the content intent and actions to carry `paymentSuggestionId` and require MainActivity to route it.
- The finance flow is exercised through the existing native/mobile tests and Android debug build.
