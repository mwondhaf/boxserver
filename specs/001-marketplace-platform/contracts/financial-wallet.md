# Contract: Financial Splits, Wallets & Payouts (US7)

Mostly internal (triggered by capture/refund events + scheduled sweeps), plus admin visibility. The external ledger is reached through the `LedgerClient` interface (live BoxWallet impl).

## Internal (no public HTTP; invoked by domain events / cron)
- **On payment captured** (order or parcel): record split via `LedgerClient.confirmOrder({ correlationId, ... })`.
  - Commission rule precedence: vendor `commissionRuleId` → zone mapping → order fallback. (FR-034)
  - Vendor wallet ← order value − commission; rider wallet ← delivery fee − platform cut. (FR-033)
  - Wallets auto-created on first need; outcome logged. (FR-035)
  - Idempotent on `correlationId`; duplicate (409) is a no-op. (FR-036, SC-003)
- **On refund / auto-cancel of paid order**: reverse split; set `refundPending` until confirmed; retry on failure. (FR-036)
- **Scheduled sweeps**: retry failed syncs; reprocess quarantined (inactive-wallet) events once active; retry failed refunds. (FR-036)

## Admin & vendor visibility
- `GET /admin/financial/confirmations?status&cursor` — `admin` — sync/confirmation log + quarantine state.
- `POST /admin/financial/confirmations/:orderId/retry` — `admin` — manual retry of a stuck sync.
- `GET /admin/wallets` — `admin` — wallet mappings + auto-create log.
- `GET /vendor/wallet` — `vendor:admin`+ — vendor's balance/earnings summary (from ledger).

## Rider payouts
- `GET /admin/payouts?riderId&status` — `admin` — payout batches.
- `POST /admin/payouts` — `admin` — create a payout batch for a freelance rider over a period (`deliveryCount`, amount). (FR-037)
- `POST /admin/payouts/:id/approve` · `/mark-completed` — lifecycle. 
- `GET /rider/earnings` — `rider` — earnings + payouts; **in-house riders see no per-order earnings/payouts** (FR-028, FR-037).

**Validation**: exactly one split per captured order/parcel; exactly one reversal per refund (SC-003).
