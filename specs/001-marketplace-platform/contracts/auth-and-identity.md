# Contract: Auth & Identity (US1)

Identity, sessions, platform roles, and vendor organizations (teams). Sessions and org membership are managed by Better Auth; these routes wrap/extend it.

## Better Auth (mounted handler)
- `ALL /api/auth/*` — `public` — Better Auth handler: sign-up, sign-in, sign-out, session, organization, and invitation endpoints. Email/password + organization plugin. (FR-001, FR-002)

## Session & actor
- `GET /me` — any authenticated — returns the resolved `ActorContext`: `{ userId, platformRole, name, email, activeOrganization?: { id, role }, rider?: { id, accountStatus } }`. (FR-001, FR-005)

## Platform roles (admin)
- `GET /admin/users` — `admin` — list/search users with roles. (paginated)
- `PATCH /admin/users/:userId/role` — `admin` — set `platformRole` ∈ {customer, rider, admin}. (FR-002)

## Vendor organizations (teams)
- `POST /organizations` — `customer`+ — create a vendor org; caller becomes `owner`. Body: business profile (name, type, contact, location). (FR-002)
- `GET /organizations/:id` — `vendor:member`+ (own org) / `admin` — org profile.
- `PATCH /organizations/:id` — `vendor:admin`+ — update business profile, hours, fulfillment flags, `isBusy`/`isActive`.
- `PATCH /organizations/:id/payout` — `vendor:owner` only — payout/bank settings. (FR-004)
- `DELETE /organizations/:id` — `vendor:owner` only — delete org. (FR-004)
- `GET /organizations/:id/members` — `vendor:admin`+ — list members (via Better Auth).
- `POST /organizations/:id/invitations` — `vendor:admin`+ — invite teammate with role member/admin. (FR-002)
- `PATCH /organizations/:id/members/:userId/role` — `vendor:owner` — change member role.

**Authorization invariants**: members can manage catalog/orders but not payout/bank or org deletion (FR-004); all org sub-resources are scoped to the active org; cross-org access denied (SC-010).
