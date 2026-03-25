# Test Plan: Recommendation Details Page — Reorder Key Info

## Unit Tests — `src/components/__tests__/refreshable-entity-details.test.tsx`

**New test cases to add:**

1. `renders children between the entity name and the detail card` — render with a movie entity and a `<span data-testid="slot">test child</span>` as children; assert the slot is in the document.
2. `renders children after the entity name` — assert that the children node appears after the `<h1>` in the DOM (query by position).
3. `renders children before the detail card` — assert that the children node appears before the movie/restaurant detail card content.
4. `renders correctly with no children provided` — no children passed; assert no crash and detail cards still render (regression guard).

**Existing tests** — all must continue to pass unchanged (no modifications needed to them).

---

## Unit Tests — `src/app/recommendations/[id]/__tests__/page.test.tsx` (new file)

1. `renders category badge above the detail card` — mock Prisma, render page with a restaurant entity; assert the category badge text is in the document and appears before the "Restaurant Details" heading in DOM order.
2. `renders star rating above the detail card` — assert the rating value (e.g., "8/10") is present and precedes "Restaurant Details" in DOM order.
3. `renders "Why This Recommendation?" above the detail card` — assert the heading is present and precedes "Restaurant Details".
4. `renders tag badges when tags are present` — provide `tags: ["Great food"]`; assert "Great food" badge is rendered.
5. `renders "No tags added" placeholder when tags array is empty` — provide `tags: []`; assert "No tags added" is rendered.
6. `renders "No tags added" placeholder when tags is null/undefined` — assert placeholder renders without crash.
7. `still renders all detail card fields` — assert restaurant details (location, hours, etc.) are still present (regression guard).

---

## Manual Testing Checklist

- [ ] Open a restaurant recommendation detail page. Confirm category badge, star rating, and "Why This Recommendation?" appear **below the restaurant name** and **above the Restaurant Details card**.
- [ ] Open a movie recommendation detail page. Confirm the same ordering (badge + rating + tags above the Movie Details card).
- [ ] Open a recommendation with no tags. Confirm "Why This Recommendation?" section is visible with "No tags added" placeholder.
- [ ] Open a recommendation with tags. Confirm all tags render as badges.
- [ ] Click "Refresh" on a restaurant or movie recommendation. Confirm the refresh animation still highlights changed fields (location, hours, etc.) correctly and the page layout does not shift.
- [ ] Open a fashion or household recommendation. Confirm the Fashion/Household Details card still renders below the "Why This Recommendation?" section.
- [ ] Open a recommendation on a narrow (mobile) viewport. Confirm no visual regression.

---

## Edge Cases

- `tags` is `null` or `undefined` (not just empty array) — must not crash; show placeholder.
- Entity has no image — hero image section absent; badge/rating/tags still appear directly under the name.
- Very long tag list — tags wrap gracefully within the flex container.

---

## Coverage Targets

- `refreshable-entity-details.tsx` — maintain/exceed existing coverage; new `children` prop lines at 100%.
- `page.tsx` (recommendation detail) — >90% line coverage on the modified/new JSX sections.
