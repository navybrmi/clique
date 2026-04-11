# Remove Facebook UI

## Overview and Motivation

Setting up Facebook OAuth is complex and will be revisited later. In the meantime, the Facebook sign-in option should be hidden from all user-facing surfaces so users are not presented with an option that isn't ready. All backend code supporting Facebook OAuth is intentionally kept intact.

## Functional Requirements

1. Remove the "Continue with Facebook" button from the sign-in page (`src/app/auth/signin/page.tsx`).
2. Remove all Facebook-specific references from the data-deletion page (`src/app/data-deletion/page.tsx`), including text about signing in with Facebook, storing Facebook user IDs, and revoking access through Facebook settings.
3. All backend code — the Facebook provider configuration in `src/lib/auth.ts`, the route handler comment in `src/app/api/auth/[...nextauth]/route.ts`, and all related imports — must remain untouched.

## Non-Functional Requirements

- No new dependencies.
- No database or API changes.
- The sign-in page must continue to function correctly with Google authentication after the Facebook button is removed.

## Out of Scope

- Removing any backend/server-side Facebook OAuth code.
- Making any changes to `src/lib/auth.ts` or `src/app/api/auth/[...nextauth]/route.ts`.
- Any UI changes beyond the two files listed above.

## Open Questions

None.
