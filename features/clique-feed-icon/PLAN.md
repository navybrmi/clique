# Implementation Plan: Clique Feed Icon in "Choose a Feed" Menu

## Architecture Decisions

Single-line change inside the `cliques.map()` render in `CliqueSidebar`. `UsersRound` is already imported in the file — no new imports needed. The empty `<div>` placeholder is replaced with the icon element using the same className pattern as `Globe` and `BookMarked`.

## Existing Files to Modify

| File | Changes |
|------|---------|
| `src/components/clique-sidebar.tsx` | Replace the empty `<div className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />` with `<UsersRound className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden="true" />` inside the `cliques.map()` block |
| `src/components/__tests__/clique-sidebar.test.tsx` | Add a test asserting that each clique link renders a `UsersRound` icon |

## New Files to Create

| File | Purpose |
|------|---------|
| `features/clique-feed-icon/REQUIREMENTS.md` | Already created |
| `features/clique-feed-icon/PLAN.md` | This plan |
| `features/clique-feed-icon/TEST_PLAN.md` | Test plan |

## Database / API Changes

None.

## PR Breakdown

Single PR — 5 files changed, well within the 20-file limit.

**PR 1 — Add UsersRound icon to clique feed nav items**
- `src/components/clique-sidebar.tsx`
- `src/components/__tests__/clique-sidebar.test.tsx`
- `features/clique-feed-icon/REQUIREMENTS.md`
- `features/clique-feed-icon/PLAN.md`
- `features/clique-feed-icon/TEST_PLAN.md`
