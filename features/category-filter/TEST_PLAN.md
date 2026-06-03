# Test Plan: Category Filter & Browse Categories Removal

## Unit Tests — CategoryFilter (`src/components/__tests__/category-filter.test.tsx`)

1. Renders the "Filter Category:" label
2. Trigger button shows "All" when both categories are selected
3. Trigger button shows "None" when no categories are selected
4. Trigger button shows the selected category label when only one is selected
5. Opening the dropdown shows Movies and Restaurants as checkbox items
6. Does not render any other category options (Fashion, Household, Other) in the dropdown
7. Checkbox item is marked checked/unchecked based on `selectedCategories`
8. Clicking an unchecked item calls `onChange` with that category added
9. Clicking a checked item calls `onChange` with that category removed
10. Dropdown stays open after selecting an item (allows multi-select without reopening)

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
- [ ] By default, the dropdown trigger shows "All" and all recommendations are shown
- [ ] Opening the dropdown shows Movies and Restaurants both checked
- [ ] Unchecking "Movies" shows only Restaurant recommendations; trigger updates to "🍽️ Restaurants"
- [ ] Unchecking "Restaurants" shows only Movie recommendations; trigger updates to "🎬 Movies"
- [ ] Unchecking both options shows all recommendations; trigger shows "None"
- [ ] The dropdown stays open after unchecking one option, allowing the second to be unchecked without reopening
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
