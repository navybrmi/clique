# Clique Invite Links — Implementation Plan

## Architecture Decisions

**Reuse `CliqueInvite` for generic links** — the existing model already has a `type: "link"` variant and token-based lookup. No new table needed for the link itself.

**New `CliqueMembershipRequest` model** — tracks pending/approved/rejected join requests submitted via link-type invites. Separate from `CliqueInvite` so per-person invites remain unaffected.

**Differentiate at accept time** — `POST /api/invites/[token]` currently always adds the user directly as a member. We change it to check the invite type: `"user"` → direct add (existing behaviour); `"link"` → create `CliqueMembershipRequest` with status `PENDING`.

**New notification types** — add `CLIQUE_JOIN_REQUEST` (to creator), `CLIQUE_JOIN_APPROVED`, and `CLIQUE_JOIN_REJECTED` (to requester) to the `NotificationType` enum.

**Expiry change** — `getInviteExpiry()` currently returns 1 year. Add a `weeks` parameter; link-type invites pass `1`.

---

## New Files to Create

| File | Purpose |
|------|---------|
| `prisma/migrations/[timestamp]_clique_membership_requests/migration.sql` | DB migration |
| `src/app/invite/[token]/page.tsx` | Public invite landing page |
| `src/app/api/cliques/[id]/membership-requests/route.ts` | List pending requests (creator-only) |
| `src/app/api/cliques/[id]/membership-requests/[requestId]/approve/route.ts` | Approve a request |
| `src/app/api/cliques/[id]/membership-requests/[requestId]/reject/route.ts` | Reject a request |
| `src/app/api/cliques/[id]/membership-requests/__tests__/route.test.ts` | Integration tests |
| `src/app/api/cliques/[id]/membership-requests/[requestId]/approve/__tests__/route.test.ts` | Integration tests |
| `src/app/api/cliques/[id]/membership-requests/[requestId]/reject/__tests__/route.test.ts` | Integration tests |
| `src/app/api/invites/[token]/__tests__/route.test.ts` | Integration tests for updated accept route |
| `src/components/__tests__/clique-management-dialog.test.tsx` | Unit tests for pending requests UI |

---

## Existing Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `CliqueMembershipRequest` model + `CliqueMembershipRequestStatus` enum; add `CLIQUE_JOIN_REQUEST`, `CLIQUE_JOIN_APPROVED`, `CLIQUE_JOIN_REJECTED` to `NotificationType` enum |
| `src/lib/invite-service.ts` | `getInviteExpiry()` accepts optional `weeks` param (default 52, link-type passes 1) |
| `src/app/api/cliques/[id]/invites/route.ts` | Pass `weeks: 1` when creating link-type invites |
| `src/app/api/invites/[token]/route.ts` | `POST`: if invite type is `"link"`, create `CliqueMembershipRequest` + notify creator instead of directly adding member |
| `src/types/clique.ts` | Add `CliqueMembershipRequest` type; add payload types for the 3 new notification types; expand `TypedNotification` union |
| `src/components/clique-management-dialog.tsx` | Add "Pending Requests" tab (creator-only); fetch from new API; Approve/Reject buttons |
| `src/components/clique-panel.tsx` | Add pending requests section with Approve/Reject (creator-only); accept `pendingRequests` prop |
| `src/components/clique-panel-wrapper.tsx` | Fetch pending membership requests and pass to `CliquePanel` |
| `src/app/page.tsx` | When `activeCliqueId` is set and user is not a member, check for a `PENDING` request and show "Your request is pending approval" instead of generic "no access" |

---

## Database Schema Changes

```prisma
enum CliqueMembershipRequestStatus {
  PENDING
  APPROVED
  REJECTED
}

model CliqueMembershipRequest {
  id          String                        @id @default(cuid())
  cliqueId    String
  userId      String
  inviteToken String
  status      CliqueMembershipRequestStatus @default(PENDING)
  createdAt   DateTime                      @default(now())
  resolvedAt  DateTime?
  clique      Clique                        @relation(fields: [cliqueId], references: [id], onDelete: Cascade)
  user        User                          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([cliqueId, userId])
}

// Add to NotificationType enum:
// CLIQUE_JOIN_REQUEST
// CLIQUE_JOIN_APPROVED
// CLIQUE_JOIN_REJECTED
```

---

## API Contract

**`POST /api/invites/[token]`** (modified)
- If invite type is `"link"`: upserts a `CliqueMembershipRequest` (PENDING), sends `CLIQUE_JOIN_REQUEST` notification to creator. Returns `{ status: "pending" }`.
- If invite type is `"user"`: existing behaviour — adds directly as member. Returns `{ status: "joined" }`.
- Errors: 410 if expired, 409 if already a member, 200 with `{ status: "already_pending" }` if duplicate.

**`GET /api/cliques/[id]/membership-requests`** (new)
- Auth: creator only. Returns list of PENDING requests with `{ id, userId, userName, userImage, createdAt }`.

**`POST /api/cliques/[id]/membership-requests/[requestId]/approve`** (new)
- Auth: creator only. Atomically: sets status to APPROVED, inserts `CliqueMember`, sends `CLIQUE_JOIN_APPROVED` notification to requester.

**`POST /api/cliques/[id]/membership-requests/[requestId]/reject`** (new)
- Auth: creator only. Sets status to REJECTED, sends `CLIQUE_JOIN_REJECTED` notification to requester.

---

## PR Breakdown

### PR 1 — Schema + types + service layer
**Label:** backend/foundations
**Files (~6):**
- `prisma/schema.prisma`
- `prisma/migrations/[timestamp]_clique_membership_requests/migration.sql`
- `src/lib/invite-service.ts`
- `src/app/api/cliques/[id]/invites/route.ts`
- `src/types/clique.ts`

### PR 2 — API routes
**Label:** backend
**Depends on:** PR 1
**Files (~8):**
- `src/app/api/invites/[token]/route.ts`
- `src/app/api/cliques/[id]/membership-requests/route.ts`
- `src/app/api/cliques/[id]/membership-requests/[requestId]/approve/route.ts`
- `src/app/api/cliques/[id]/membership-requests/[requestId]/reject/route.ts`
- `src/app/api/cliques/[id]/membership-requests/__tests__/route.test.ts`
- `src/app/api/cliques/[id]/membership-requests/[requestId]/approve/__tests__/route.test.ts`
- `src/app/api/cliques/[id]/membership-requests/[requestId]/reject/__tests__/route.test.ts`
- `src/app/api/invites/[token]/__tests__/route.test.ts`

### PR 3 — Frontend
**Label:** frontend
**Depends on:** PR 2
**Files (~7):**
- `src/app/invite/[token]/page.tsx`
- `src/app/page.tsx`
- `src/components/clique-management-dialog.tsx`
- `src/components/clique-panel.tsx`
- `src/components/clique-panel-wrapper.tsx`
- `src/components/__tests__/clique-management-dialog.test.tsx`
