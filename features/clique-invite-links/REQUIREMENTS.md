# Clique Invite Links — Requirements

## Overview and Motivation

Currently, Clique members can only invite specific people by email address. These per-person invites are accepted without any approval step. This works for trusted 1:1 invites but is difficult to share broadly (e.g. via a group chat or social media). This enhancement adds a second invite mechanism: a shareable generic invite link that any member can generate. Because the link is open-ended, joins via this link require explicit approval from the clique creator before the requester gains feed access.

---

## Functional Requirements

### Generic Invite Links

1. Any existing clique member can generate a generic invite link from the clique management dialog.
2. Each link contains a unique random token embedded in the URL (e.g. `/invite/[token]`).
3. Links expire automatically after exactly 1 week from creation.
4. Multiple active invite links per clique are allowed simultaneously.
5. There is no manual revocation — links expire after 1 week only.
6. A "Copy link" button appears next to each generated link in the clique management dialog.

### Joining via Generic Link

7. Anyone who clicks a valid (non-expired) invite link is taken to an invite landing page showing the clique name and a "Request to Join" button.
8. If the visitor is not authenticated, they are prompted to sign in with Google first, then redirected back to the invite landing page.
9. On submitting the join request, a `CliqueMembershipRequest` with status `PENDING` is created for that user and clique.
10. If the link has expired, the landing page shows an appropriate error and the request is blocked.
11. If the user is already a member of the clique, the landing page shows a message indicating they are already a member (no duplicate request created).
12. If the user already has a pending request for the same clique, a duplicate request is not created — the landing page shows their request is awaiting approval.

### Approval Flow (Creator Only)

13. When a join request is submitted, the clique creator receives an in-app notification (visible in the notification bell).
14. The clique management dialog shows a "Pending Requests" section (visible to the creator only) listing all `PENDING` membership requests with Approve and Reject buttons.
15. The clique panel on the right side of the desktop feed (when viewing a clique) also shows pending requests to the creator with Approve/Reject actions.
16. Approving a request: the user is added as a `CliqueMember` and the request status is set to `APPROVED`.
17. Rejecting a request: the request status is set to `REJECTED`.
18. In both cases, the requester receives an in-app notification informing them of the outcome.

### Pending State

19. A user with a `PENDING` membership request cannot view the clique feed — they are shown a "Your request is pending approval" message if they try to access the clique feed URL.

### Per-Person Invites (Unchanged)

20. The existing per-person invite flow (invite by email, no approval required) remains exactly as-is.

---

## Non-Functional Requirements

- The invite token must be cryptographically random and unguessable (e.g. `crypto.randomUUID()`).
- Expired and rejected requests must not appear in the pending requests list.
- The invite landing page must be accessible to unauthenticated users (public route).
- Approval and rejection actions must be restricted to the clique creator server-side (not just client-side).

---

## Out of Scope

- Admin roles (approval is creator-only for now).
- Configurable expiry durations (fixed at 1 week).
- Email notifications for approval/rejection (in-app only).
- Invite link usage analytics.
- Manual link revocation before expiry.

---

## Open Questions

None — all requirements are resolved.
