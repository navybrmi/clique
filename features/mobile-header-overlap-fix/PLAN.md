# Implementation Plan: Fix Mobile Header Overlap for Unauthenticated Users

## Architecture Decisions

Minimal change — add `hidden lg:flex` to the "Get Started" button wrapper in `Header`. The button already renders inside a `<>` fragment; wrapping it in a `<div className="hidden lg:flex">` (or adding the class directly to the `Button`'s `asChild` container) hides it below `lg` while preserving desktop behaviour exactly as-is.

## Existing Files to Modify

| File | Changes |
|------|---------|
| `src/components/header.tsx` | Add `hidden lg:flex` classes to the "Get Started" `Button` so it is hidden on mobile |
| `src/components/__tests__/header.test.tsx` | Add tests asserting "Get Started" is not rendered on mobile and "Sign In" is always rendered when unauthenticated |

## New Files to Create

| File | Purpose |
|------|---------|
| `features/mobile-header-overlap-fix/REQUIREMENTS.md` | Already created |
| `features/mobile-header-overlap-fix/PLAN.md` | This plan |
| `features/mobile-header-overlap-fix/TEST_PLAN.md` | Test plan |

## Database / API Changes

None.

## PR Breakdown

Single PR — 5 files changed, well within the 20-file limit.

**PR 1 — Hide "Get Started" on mobile**
- `src/components/header.tsx`
- `src/components/__tests__/header.test.tsx`
- `features/mobile-header-overlap-fix/REQUIREMENTS.md`
- `features/mobile-header-overlap-fix/PLAN.md`
- `features/mobile-header-overlap-fix/TEST_PLAN.md`
