# Implementation Plan: Category Filter & Browse Categories Removal

## Architecture Decisions

**Extract feed grid into a client component.** `page.tsx` is a server component that fetches and renders everything inline. Client-side filtering requires React state, so the card grid must live in a `"use client"` component. The server component fetches all recommendations, then passes them as a prop to the client component which manages filter state and renders the filtered result.

**Two focused components.** `CategoryFilter` handles the dropdown UI only (no knowledge of recommendations). `RecommendationFeed` owns the filter state, applies it to the recommendation list, and renders the grid. This keeps each component testable in isolation.

**Move `HomeFeedItem` type.** Currently defined inline in `page.tsx`, it needs to be shared with `RecommendationFeed`. Moving it to `src/types/feed.ts` avoids a circular import.

**Filter logic.** Two options — "Movie" and "Restaurant" — match `rec.entity.category.displayName`. Default: both selected. When all or none are selected, show everything (no filter). When a strict subset is selected, show only matching items.

**No new API calls.** All filtering is client-side on the already-fetched recommendations array.

---

## New Files to Create

| File | Purpose |
|------|---------|
| `src/types/feed.ts` | `HomeFeedItem` type, shared between `page.tsx` and `RecommendationFeed` |
| `src/components/category-filter.tsx` | `"use client"` multi-select dropdown — renders a "Filter Category:" label and a `DropdownMenu` with `DropdownMenuCheckboxItem` for Movies/Restaurants; calls `onChange` on toggle; dropdown stays open between selections |
| `src/components/recommendation-feed.tsx` | `"use client"` wrapper — holds `selectedCategories` state, renders `CategoryFilter` + filtered card grid (card JSX moves here from `page.tsx`) |
| `src/components/__tests__/category-filter.test.tsx` | Unit tests for `CategoryFilter` |
| `src/components/__tests__/recommendation-feed.test.tsx` | Unit tests for `RecommendationFeed` |

---

## Existing Files to Modify

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Remove inline card grid JSX; replace with `<RecommendationFeed recommendations={recommendations} .../>`. Import `HomeFeedItem` from `src/types/feed.ts`. |
| `src/components/add-recommendation-trigger.tsx` | Delete the "Browse Categories" `<Button>`. Clean up now-unused wrapper layout if it simplifies. |
| `src/components/__tests__/add-recommendation-trigger.test.tsx` | Remove the "renders the Browse Categories button" test and the sidebar-layout `w-full` assertion on Browse Categories. |

---

## Filter Logic

```
FILTER_OPTIONS = ["Movie", "Restaurant"]

selectedCategories: string[]   // default: all options selected

filteredRecommendations =
  if selectedCategories.length === 0
  || selectedCategories.length === FILTER_OPTIONS.length
    → all recommendations  (no filter)
  else
    → recommendations where entity.category.displayName ∈ selectedCategories
```

**Empty state rules** (inside `RecommendationFeed`):
- `recommendations.length === 0` → existing messages ("No recommendations yet…" / "You haven't added any…")
- `filteredRecommendations.length === 0` but recommendations exist → "No recommendations of this type yet."

---

## API Contract

No new API endpoints. No database schema changes.

---

## PR Breakdown

### PR 1 — Category filter & Browse Categories removal
**Label:** frontend
**Files (8):**
- `src/types/feed.ts`
- `src/components/category-filter.tsx`
- `src/components/recommendation-feed.tsx`
- `src/components/__tests__/category-filter.test.tsx`
- `src/components/__tests__/recommendation-feed.test.tsx`
- `src/app/page.tsx`
- `src/components/add-recommendation-trigger.tsx`
- `src/components/__tests__/add-recommendation-trigger.test.tsx`
