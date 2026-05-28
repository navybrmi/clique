# Requirements: Category Filter & Browse Categories Removal

## Overview and Motivation

The home page currently shows a "Browse Categories" button that is not needed at this stage and should be removed to simplify the UI. In its place, users need a way to filter the recommendation feed by content type — without leaving the page or navigating away. A multi-select category filter placed above the feed provides this directly, making it easy to focus on Movies, Restaurants, or both at once.

---

## Functional Requirements

1. **Remove the "Browse Categories" button** from the home page entirely.

2. **Add a category filter bar** above the main recommendation feed (the primary content area, not the clique side panel).

3. **Filter options**: "Movies" and "Restaurants" only. Other categories (Fashion, Household, Other) are out of scope for this change.

4. **Multi-select**: any combination of Movies and Restaurants may be selected simultaneously.

5. **Default state**: when the page loads, all categories are shown (equivalent to no filter applied — both options visually appear active/selected).

6. **Deselect-all behaviour**: if the user deselects all filter options, treat it as "no filter" — show all recommendations regardless of category.

7. **Filter is always visible**: the filter bar appears whether or not a clique is selected. It applies to the public/home feed as well as to clique-specific feeds.

8. **Scope**: the filter affects every recommendation shown in the main feed area — both the general home feed (no clique selected) and the clique feed (when a clique is active).

9. **Empty state**: if a filter is active and no recommendations match in the current view, display a message such as "No recommendations of this type yet."

10. **State is session-only**: filter selections are held in component state and reset when the page is refreshed. No persistence to localStorage, cookies, or URL params.

11. **All members can filter**: the filter is available to all authenticated users, the clique creator, and unauthenticated users viewing the public feed.

---

## Non-Functional Requirements

- The filter should be visually consistent with the existing UI (shadcn/ui components, existing colour palette).
- Filtering must be client-side only — no additional API calls triggered per filter change (recommendations are already fetched; the filter just hides/shows).
- No impact on existing API contracts or database schema.

---

## Out of Scope

- Persisting filter state across sessions or page refreshes.
- Adding Fashion, Household, or Other as filter options (can be done in a future iteration).
- Filtering inside the clique side panel itself (the filter lives in the main feed area only).
- URL-based deep linking to a pre-filtered state.

---

## Open Questions

None — all ambiguities resolved.
