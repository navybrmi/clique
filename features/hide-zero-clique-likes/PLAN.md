# Implementation Plan: Hide Zero Secondary Like Count

## Architecture Decisions

No architectural changes needed. The fix is entirely within `LikeCounts` — the render condition changes from `secondary !== null` to `secondary !== null && secondary > 0`, and the display text updates. All callers benefit automatically.

## Existing Files to Modify

| File | Changes |
|------|---------|
| `src/components/like-counts.tsx` | Change render condition to also suppress when `secondary === 0`; update display text from "N in your cliques" to "N likes across your cliques"; update `aria-label` to match |
| `src/components/__tests__/like-counts.test.tsx` | Update the existing `secondary === 0` test (currently asserts "0 in your cliques" is shown — flip to assert it is hidden); update text matchers for new wording; add a test confirming `secondary === 0` behaves identically to `null` |

## New Files to Create

None.

## Database / API Changes

None.

## PR Breakdown

Single PR — 2 files changed, well within the 20-file limit.

**PR 1 — Hide zero secondary like count**
- `src/components/like-counts.tsx`
- `src/components/__tests__/like-counts.test.tsx`
