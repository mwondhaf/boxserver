<!--
SYNC IMPACT REPORT
==================
Version change: (template, unratified) → 1.0.0
Bump rationale: Initial ratification of the BoxServer constitution. First concrete
  definition of all principles and governance, so MAJOR baseline 1.0.0.

Modified principles: (none — initial definition)
Added sections:
  - Core Principles I–VI
  - Technology & Architecture Constraints
  - Development Workflow & Quality Gates
  - Governance
Removed sections: (none)

Templates requiring updates:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check gate reads
    this file dynamically; no hardcoded principle conflicts)
  - .specify/templates/spec-template.md ✅ aligned (acceptance scenarios are
    behavioral/manual, not automated unit/UX tests; consistent with Principle V)
  - .specify/templates/tasks-template.md ✅ aligned (tests already marked OPTIONAL;
    consistent with Principle V "No Unit or UX Tests")
  - .specify/templates/checklist-template.md ✅ no changes required

Follow-up TODOs: (none)
-->

# BoxServer Constitution

BoxServer is a server-first reimplementation of the BoxConv multi-vendor food delivery
marketplace. It preserves BoxConv's product behavior while replacing its runtime stack:
NestJS for the API, Better Auth for identity, Drizzle ORM for persistence, and a
TanStack Router + Legend State client. These principles are binding on all contributors
and all generated artifacts.

## Core Principles

### I. Mandated Stack (NON-NEGOTIABLE)

The following technologies are fixed and MUST NOT be substituted without a constitutional
amendment:

- **API / backend**: NestJS. All business logic, endpoints, and background jobs live in
  NestJS modules, providers, and controllers.
- **Authentication**: Better Auth. It is the sole source of identity and sessions.
- **Persistence**: Drizzle ORM against PostgreSQL.
- **Client routing**: TanStack Router.
- **Client state**: Legend State.

Rationale: A single, explicitly named stack removes per-feature technology debates,
keeps the codebase coherent, and makes generated plans and tasks deterministic. Adding a
new library that overlaps the responsibility of a mandated one (e.g. a second state
manager, ORM, or auth layer) is a violation, not a convenience.

### II. Drizzle Relational Queries, No Manual Joins (NON-NEGOTIABLE)

All multi-table reads MUST use Drizzle's Relational Query Builder
(`db.query.<table>.findMany / findFirst` with `with: { ... }`). Hand-written joins
(`.leftJoin()`, `.innerJoin()`, raw `SQL` join clauses) are prohibited for fetching
related data. Table relations MUST be declared in the Drizzle schema so the RQB can
resolve them.

Rationale: RQB returns correctly typed, nested results and keeps relationship knowledge
in one place (the schema). Manual joins drift from the schema, lose type safety, and
produce flat result shapes that each caller must reassemble. Raw SQL is permitted only
for operations the RQB cannot express (e.g. aggregates or migrations) and MUST be
justified in the plan's Complexity Tracking table.

### III. Server-Derived, Role-Scoped Authorization

Identity MUST be derived from the Better Auth session on the server. No endpoint, query,
or mutation may accept a `userId` (or equivalent caller identity) as an input argument.
The platform has three actor roles — **admin**, **vendor**, and **rider** — and a vendor
is an organization that may have multiple member users. Authorization MUST be enforced
server-side through an explicit policy/ability layer; the client is never trusted to
gate access. Operations not meant for public callers MUST be implemented as internal-only
(not exposed through public controllers).

Rationale: Mirrors BoxConv's security model (session-derived identity, org-based vendors,
CASL ability rules) and prevents privilege escalation via forged identity parameters.

### IV. Explicit, Validated API Contracts

Every public endpoint MUST be a NestJS controller route backed by a DTO whose shape is
validated at the boundary (class-validator / Zod). Inputs are validated before any
business logic runs; IDs are typed; return shapes are explicit. Unvalidated or
loosely-typed (`any`) data MUST NOT cross an API boundary. Prefer `unknown` with
narrowing over `any`.

Rationale: Validated contracts are the project's primary correctness mechanism in the
absence of unit tests (see Principle V), and they keep the client and server in agreement.

### V. No Unit or UX Tests

This project does NOT author unit tests or automated UX/UI tests. Correctness is assured
through TypeScript strictness, validated DTO contracts (Principle IV), Drizzle's
schema-derived types (Principle II), linting/formatting gates, and manual or integration
verification of behavior. Generated plans and task lists MUST NOT introduce unit-test or
UI-test tasks.

Rationale: Explicit scope decision by the project owner. Quality is enforced at the type
and contract layer rather than through a test pyramid. Acceptance scenarios in specs
remain valid as behavioral descriptions and manual verification steps, not as automated
test mandates.

### VI. Functional Parity with BoxConv

The goal is behavioral parity with the existing BoxConv marketplace, not a redesign of
its product. Core domains MUST be preserved: vendors and vendor teams, riders, customers,
catalog/menu, orders and order lifecycle, fare/pricing calculation, the wallet and
commission/payout flows (BoxWallet), and search. Deviations from BoxConv behavior MUST be
intentional and documented in the relevant feature spec, not incidental side effects of
the stack change.

Rationale: A "replicate" mandate means user-visible behavior is the fixed contract; the
stack is the variable. Undocumented behavioral drift defeats the purpose of the rewrite.

## Technology & Architecture Constraints

- **Language**: TypeScript in strict mode across server and client.
- **Module boundaries**: Organize by domain/feature (NestJS modules server-side; feature
  folders client-side). Keep admin, vendor, and rider concerns separable.
- **No barrel files**: Do not create or import from index re-export files; import directly
  from the defining module. (Carried over from BoxConv to avoid circular-dependency
  failures.)
- **Schema first for data**: `schema.ts` (Drizzle) is the source of truth for data shapes
  and relations; generated/migration artifacts are never hand-edited.
- **Configuration & secrets**: Read from environment/config; never hardcode credentials,
  and never log secrets or session tokens.
- **Path discipline**: Honor the project's configured path aliases instead of long
  relative chains.

## Development Workflow & Quality Gates

- **Spec-driven**: Features flow through the Spec Kit workflow (constitution → specify →
  plan → tasks → implement). The Constitution Check gate in the plan MUST pass before
  design and be re-checked after design.
- **Lint & format are mandatory gates**: Code MUST pass the project's lint and format
  checks before it is considered done. Because there are no unit tests, these gates plus
  type-checking are the automated safety net and MUST NOT be bypassed.
- **No test gate**: There is no unit/UX test gate (Principle V). Reviewers verify behavior
  through the spec's acceptance scenarios and manual/integration checks.
- **Justify complexity**: Any deviation from these principles (raw SQL joins, an
  additional library overlapping a mandated one, accepting identity as input, etc.) MUST
  be recorded in the plan's Complexity Tracking table with the simpler alternative and why
  it was rejected.

## Governance

This constitution supersedes other practices and conventions where they conflict. All
plans, task lists, and code reviews MUST verify compliance with these principles, and the
plan's Constitution Check gate is the enforcement point.

Amendments require: (1) a written change with rationale, (2) a version bump per the policy
below, and (3) propagation to dependent templates and guidance docs in the same change.

Versioning policy (semantic):
- **MAJOR**: Backward-incompatible governance or principle removals/redefinitions.
- **MINOR**: A new principle/section or materially expanded guidance.
- **PATCH**: Clarifications, wording, or non-semantic refinements.

Compliance review: every feature plan re-runs the Constitution Check; violations must be
remediated or explicitly justified in Complexity Tracking before implementation proceeds.
Runtime engineering guidance lives in the project `CLAUDE.md` files and MUST stay
consistent with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-06-13 | **Last Amended**: 2026-06-13
