# Requirements: Clique Feed Icon in "Choose a Feed" Menu

## Overview and Motivation

The "Choose a feed" sidebar menu shows a `Globe` icon for the Public feed and a `BookMarked` icon for My Recommendations, but clique items have no icon — just an invisible placeholder `<div>`. This makes the clique entries look visually blank compared to the static feed items. Adding a consistent icon for all clique items aligns the UX and makes the menu feel complete.

## Functional Requirements

1. Every clique entry in the "Choose a feed" nav renders a `UsersRound` icon (from lucide-react, already imported) to its left, in place of the current empty `<div>` placeholder.
2. The icon is styled identically to the other nav icons: `h-3.5 w-3.5 shrink-0 text-zinc-400`.
3. The icon is decorative (`aria-hidden="true"`) — no change to the accessible label of the link.
4. The same icon applies in both the desktop sidebar and the mobile sheet (both use `CliqueSidebar` under the hood).

## Non-Functional Requirements

- Change is confined to `CliqueSidebar` — no other components need updating.
- No new dependencies; `UsersRound` is already imported.

## Out of Scope

- Per-clique custom icons or avatars.
- Any colour differentiation between clique icons and static feed icons.
- Changes to icon size or style for existing nav items.

## Open Questions

None.
