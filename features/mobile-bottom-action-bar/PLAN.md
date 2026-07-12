# Implementation Plan: Mobile Bottom Action Bar

## Architecture Decisions

**New `MobileBottomBar` client component.** Manages Sheet open/close state for the Cliques bottom sheet. Receives clique data as props from `page.tsx` (which already prefetches `userCliques`), so no extra DB query is needed.

**New `"mobile-bar"` layout in `AddRecommendationTrigger`.** Rather than duplicating login-alert logic, a third `layout` variant renders a compact icon + label button styled for the bottom bar. This keeps all dialog trigger logic in one place.

**Reuse `CliqueSidebar` in a bottom Sheet.** The Cliques sheet renders the full `CliqueSidebar` (same content as the hamburger drawer), side `"bottom"`, capped at `max-h-[80vh]`.

**`lg:hidden` + fixed positioning.** The bar is invisible on desktop (left sidebar already shows) and fixed to the bottom of the viewport on mobile.

**`pb-20 lg:pb-0` on `<main>`.** Prevents feed cards from being hidden behind the 64px bar on mobile.

---

## New Files to Create

| File | Purpose |
|------|---------|
| `src/components/mobile-bottom-bar.tsx` | `"use client"` component — fixed bottom bar with Cliques sheet trigger + Add button |
| `src/components/__tests__/mobile-bottom-bar.test.tsx` | Unit tests |

## Existing Files to Modify

| File | Changes |
|------|---------|
| `src/components/add-recommendation-trigger.tsx` | Add `"mobile-bar"` as a third layout variant — compact icon+label button for the bottom bar |
| `src/app/page.tsx` | Render `<MobileBottomBar>` after `</main>`, add `pb-20 lg:pb-0` to the `<main>` element |

---

## `MobileBottomBar` component shape

```tsx
// Props
interface MobileBottomBarProps {
  userId: string | null
  cliques: CliqueSidebarItem[]
  activeCliqueId?: string
  activeMine?: boolean
  currentCliqueId?: string
}

// Render (mobile only, lg:hidden, fixed bottom-0)
<div lg:hidden fixed bottom-0 full-width border-t bg-white z-50>
  <div flex h-16>
    {/* Cliques button — authenticated only */}
    {userId && (
      <Sheet>
        <SheetTrigger> <UsersRound /> Cliques </SheetTrigger>
        <SheetContent side="bottom" max-h-80vh>
          <SheetHeader><SheetTitle>Choose a feed</SheetTitle></SheetHeader>
          <CliqueSidebar ... onNavigate={close} />
        </SheetContent>
      </Sheet>
    )}
    {/* Add button — always shown */}
    <AddRecommendationTrigger userId={userId} currentCliqueId={currentCliqueId} layout="mobile-bar" />
  </div>
</div>
```

## `add-recommendation-trigger.tsx` change

Add `"mobile-bar"` to the `layout` union:
```tsx
layout?: "hero" | "sidebar" | "mobile-bar"
```

When `layout === "mobile-bar"`, render a compact icon+label `<button>` (same style as the Cliques button in the bottom bar), rather than the existing `<Button>` variants.

---

## Database / API Changes

None — `userCliques` is already fetched in `page.tsx`.

---

## PR Breakdown

Single PR — 4 files changed.

**PR 1 — Mobile bottom action bar**
- `src/components/mobile-bottom-bar.tsx` (new)
- `src/components/__tests__/mobile-bottom-bar.test.tsx` (new)
- `src/components/add-recommendation-trigger.tsx` (modified)
- `src/app/page.tsx` (modified)
