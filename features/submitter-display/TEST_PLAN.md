# Test Plan: Submitter Display

## Unit Tests — `src/components/__tests__/refreshable-entity-details.test.tsx`
*(add to existing file)*

### New `afterImage` prop
1. Renders the `afterImage` content when provided.
2. Does **not** render any extra content when `afterImage` is omitted.
3. `afterImage` content appears **after** the hero image and **before** the entity `<h1>` in DOM order.

---

## Unit Tests — `src/app/recommendations/[id]/__tests__/page.test.tsx`
*(add to existing file)*

### Submitter display — authenticated user
4. Shows `"Recommended by Test User"` text when the session is non-null.
5. Shows a formatted submission date (e.g. `"Jan 5, 2026"`) when the session is non-null.
6. Submitter line appears **after** the hero image and **before** the entity `<h1>` in DOM order.

### Submitter display — unauthenticated user
7. Does **not** show `"Recommended by"` text when session is `null`.

### Edge cases
8. Shows `"Recommended by Anonymous"` when `recommendation.user.name` is `null` and session is non-null.

---

## Unit Tests — `src/app/__tests__/page.test.tsx`
*(add to / update existing file)*

### Submitter name on cards — authenticated user
9. Shows `"by Test User"` on a recommendation card when session is non-null.
10. Shows `"by Anonymous"` when `user.name` is `null` and session is non-null.

### Submitter name on cards — unauthenticated user
11. Does **not** show `"by [name]"` text on any card when session is `null`.
12. Does **not** show `"by Anonymous"` on any card when session is `null`.

**Note:** The existing test `'shows Anonymous when user has no name'` expects `by Anonymous` with no session — this must be updated to pass a logged-in session instead.

---

## Manual Testing Checklist

- [ ] Log out and visit the home page — confirm no "by [name]" text appears on any recommendation card.
- [ ] Log in and visit the home page — confirm "by [name]" appears on all recommendation cards.
- [ ] Log out and visit a recommendation detail page — confirm no "Recommended by" line appears anywhere on the page.
- [ ] Log in and visit a recommendation detail page — confirm "Recommended by [name] · [date]" appears just below the hero image.
- [ ] Visit a detail page for a recommendation with no image — confirm the submitter line still appears in the correct position (just before the entity name).
- [ ] Verify the submitter line style matches the muted text styling used for commenter metadata.

---

## Coverage Targets

- Unit test coverage for modified files: >90% of new/changed lines.
- No changes to integration tests required (no API changes).
