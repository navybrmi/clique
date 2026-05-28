# Test Plan: Category Filter & Browse Categories Removal

## Unit Tests — CategoryFilter (`src/components/__tests__/category-filter.test.tsx`)

1. Renders both "Movies" and "Restaurants" toggle chips
2. Both chips are visually selected by default (when `selectedCategories` contains both)
3. Clicking a selected chip calls `onChange` with that category removed
4. Clicking an unselected chip calls `onChange` with that category added
5. A chip is visually distinguished (aria-pressed or class) when selected vs unselected
6. Does not render any other category options (Fashion, Household, Other)

---

## Unit Tests — RecommendationFeed (`src/components/__tests__/recommendation-feed.test.tsx`)

**Filter state & rendering:**
1. Renders the `CategoryFilter` bar
2. By default (both selected), renders all recommendations regardless of category
3. When only "Movies" is selected, renders only Movie recommendations
4. When only "Restaurants" is selected, renders only Restaurant recommendations
5. When both are selected, renders Movies + Restaurants + all other categories (Fashion, Household, Other)
6. When all are deselected (none selected), renders all recommendations (no filter)

**Empty states:**
7. When `recommendations` is empty, shows the "no recommendations yet" message (not the filter empty state)
8. When `recommendations` is non-empty but the active filter matches nothing, shows "No recommendations of this type yet."
9. When `activeMine` is true and recommendations is empty, shows "You haven't added any recommendations yet."

**Card rendering:**
10. Renders a card for each visible recommendation with the entity name
11. Shows the `UpvoteButton` when `upvoteContext` is present on a recommendation
12. Does not show `UpvoteButton` when `upvoteContext` is absent
13. Shows `AddToCliquesDialog` when `showAddToCliqueActions` is true
14. Does not show `AddToCliquesDialog` when `showAddToCliqueActions` is false

---

## Unit Tests — AddRecommendationTrigger (updated, `src/components/__tests__/add-recommendation-trigger.test.tsx`)

15. Does **not** render a "Browse Categories" button
16. Renders only the "Add Recommendation" button in hero layout
17. Existing tests for login alert, `onSuccess`, `onBlockedOpen`, `userId`/`currentCliqueId` forwarding remain unchanged

---

## Manual Testing Checklist

- [ ] "Browse Categories" button no longer appears on the home page (logged in or logged out)
- [ ] Category filter bar is visible above the recommendation feed when no clique is selected
- [ ] Category filter bar is visible above the recommendation feed when a clique is active
- [ ] By default, both "Movies" and "Restaurants" chips appear selected and all recommendations are shown
- [ ] Clicking "Movies" (deselects it) shows only Restaurant recommendations
- [ ] Clicking "Restaurants" (deselects it) shows only Movie recommendations
- [ ] Clicking both chips off shows all recommendations again
- [ ] A clique feed with only Movie recs filtered to "Restaurants" shows "No recommendations of this type yet."
- [ ] Refreshing the page resets the filter back to the default (both selected, all shown)
- [ ] Filter works on the public (unauthenticated) feed
- [ ] Fashion / Household / Other recommendations are still visible when no filter is active

---

## Edge Cases to Validate

- Feed with only Fashion/Household/Other items: when Movies or Restaurants chip is selected alone, shows "No recommendations of this type yet." When both are deselected, all items are shown again.
- Empty clique feed: filter shows the existing "no recommendations" empty state, not the filter empty state.

---

## Coverage Targets

- `CategoryFilter`: 100% (simple component)
- `RecommendationFeed`: ≥ 90% lines/functions
- `AddRecommendationTrigger` (updated): maintain existing coverage
