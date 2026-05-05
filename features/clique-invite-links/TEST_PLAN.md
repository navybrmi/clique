# Clique Invite Links — Test Plan

## Unit Tests

### `src/lib/invite-service.ts`
1. `getInviteExpiry()` with no argument returns a date ~52 weeks from now
2. `getInviteExpiry(1)` returns a date ~1 week from now
3. `generateInviteToken()` returns a string of expected length with only hex characters

### `src/types/clique.ts` (type-level, validated via build)
1. `CliqueMembershipRequest` type is correctly shaped
2. `TypedNotification` discriminated union correctly narrows on `CLIQUE_JOIN_REQUEST`, `CLIQUE_JOIN_APPROVED`, `CLIQUE_JOIN_REJECTED`

### `src/components/clique-management-dialog.tsx`
1. "Pending Requests" tab is not rendered when `currentUserId` is not the creator
2. "Pending Requests" tab is rendered for the creator
3. Renders a list of pending requests fetched from the API
4. Approve button calls `POST /api/cliques/[id]/membership-requests/[requestId]/approve`
5. Reject button calls `POST /api/cliques/[id]/membership-requests/[requestId]/reject`
6. Shows empty state when no pending requests exist
7. Shows loading state while fetching requests

### `src/app/invite/[token]/page.tsx`
1. Shows clique name and "Request to Join" button for a valid link when authenticated
2. Shows "Sign in to continue" when unauthenticated
3. Shows "This invite link has expired" for an expired token
4. Shows "Invalid invite link" for an unknown token
5. Shows "You are already a member" if user is already in the clique
6. Shows "Your request is pending approval" if user has an existing PENDING request
7. Shows success state after submitting a join request

---

## Integration Tests

### `POST /api/invites/[token]` (modified)
1. Link-type invite: returns `{ status: "pending" }` and creates `CliqueMembershipRequest`
2. Link-type invite: sends `CLIQUE_JOIN_REQUEST` notification to clique creator
3. Link-type invite: returns 410 if invite is expired
4. Link-type invite: returns 409 if user is already a member
5. Link-type invite: returns `{ status: "already_pending" }` if duplicate request
6. User-type invite: continues to add member directly (existing behaviour preserved)
7. Returns 401 if unauthenticated
8. Returns 404 if token does not exist

### `GET /api/cliques/[id]/membership-requests`
1. Returns list of PENDING requests with user details for the clique creator
2. Does not return APPROVED or REJECTED requests
3. Returns 403 if caller is not the creator
4. Returns 401 if unauthenticated
5. Returns 404 if clique does not exist

### `POST /api/cliques/[id]/membership-requests/[requestId]/approve`
1. Sets request status to APPROVED and adds user as `CliqueMember`
2. Sends `CLIQUE_JOIN_APPROVED` notification to the requester
3. Is idempotent — returns 200 if already approved
4. Returns 403 if caller is not the creator
5. Returns 404 if request does not exist
6. Returns 401 if unauthenticated

### `POST /api/cliques/[id]/membership-requests/[requestId]/reject`
1. Sets request status to REJECTED
2. Sends `CLIQUE_JOIN_REJECTED` notification to the requester
3. Returns 403 if caller is not the creator
4. Returns 404 if request does not exist
5. Returns 401 if unauthenticated

---

## Manual Testing Checklist

- [ ] As a member, open the clique management dialog → "Generate Invite Link" creates a link expiring in 1 week
- [ ] Copy the link → open in an incognito window → lands on invite page showing the clique name
- [ ] Click "Request to Join" without being signed in → redirected to Google sign-in → returned to invite page after auth
- [ ] Submit a join request → see "Your request is pending approval" message
- [ ] Try to navigate to the clique feed URL directly while pending → see "pending approval" message instead of feed
- [ ] Sign in as creator → notification bell shows a new `CLIQUE_JOIN_REQUEST` notification
- [ ] Open clique management dialog → "Pending Requests" tab shows the requester
- [ ] Approve the request → requester is added to the clique
- [ ] Requester receives `CLIQUE_JOIN_APPROVED` in-app notification
- [ ] Requester can now access the clique feed
- [ ] Repeat the flow but reject → requester receives `CLIQUE_JOIN_REJECTED` notification and remains locked out
- [ ] Use the same link a second time from a different account → new pending request created
- [ ] Wait for or manually expire a link → invite page shows "This invite link has expired"
- [ ] Per-person invite flow still works end-to-end without any approval step
- [ ] On desktop, verify the CliquePanel also shows pending requests to the creator

---

## Edge Cases to Validate

- User submits a join request, then is invited directly (per-person) → should be added immediately; direct add supersedes the pending request
- Creator approves a request when the clique is at the 50-member limit → should return a clear error
- Two users submit join requests simultaneously → both should be independently tracked
- Creator deletes the clique while requests are pending → cascade delete handles cleanup

---

## Coverage Targets

- New API routes: ≥ 80% lines, 70% branches (integration tests)
- New/modified components: ≥ 90% lines (unit tests)
- `invite-service.ts` changes: 100% lines
