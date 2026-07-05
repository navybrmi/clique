# Requirements: Fix Mobile Header Overlap for Unauthenticated Users

## Overview and Motivation

On mobile, the "Clique" title is absolutely centered in the header. When a user is not signed in, two buttons ("Sign In" + "Get Started") appear on the right — both linking to `/auth/signin`. The combined width of these two buttons pushes into the centered title, causing it to visually merge with "Sign In". Since both buttons perform the identical action, "Get Started" is redundant on mobile and can be hidden without any loss of functionality.

## Functional Requirements

1. The "Get Started" button is hidden on mobile viewports (below the `lg` breakpoint).
2. The "Sign In" button remains visible on all viewports when the user is not authenticated.
3. On desktop (`lg` and above), both "Sign In" and "Get Started" continue to appear as before.
4. The "Clique" title no longer overlaps with the auth buttons on mobile.

## Non-Functional Requirements

- Change is confined to `Header` — no other components need updating.
- No new dependencies or layout restructuring required; a single Tailwind responsive class on the "Get Started" button is sufficient.

## Out of Scope

- Changing the sign-in flow or the destination URL.
- Redesigning the desktop header layout.
- Any changes to the authenticated header (notification bell + user menu).

## Open Questions

None.
