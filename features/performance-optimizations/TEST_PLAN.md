# Test Plan: Page Load Performance Optimizations

## PR 1 — Server Component Home Page + Lazy Dialog

### Unit Tests — `src/app/__tests__/page.test.tsx` (update/new)

1. `renders recommendation cards server-side` — mock Prisma `findMany` to return 2 recommendations; render the page component; assert both card titles appear in the document without any `fetch` calls to `/api/recommendations`.
2. `does not import AddRecommendationDialog in the initial bundle` — assert the dynamic import is present and that `ssr: false` is configured (inspect the module's dynamic import call).
3. `renders empty state when no recommendations exist` — mock `findMany` to return `[]`; assert an appropriate empty-state message is rendered.
4. `consolidates lucide-react imports` — static analysis / snapshot test to confirm no duplicate import sources.

### Integration Tests — `src/app/api/recommendations/__tests__/route.test.ts` (existing, regression)

All existing GET tests must continue to pass unchanged.

---

## PR 2 — Centralized Session Resolution

### Unit Tests — per component

For each of the 7 modified client components, add or update tests asserting:

1. **`src/components/__tests__/header.test.tsx`**
   - `renders sign-in button when currentUserId is null` — pass `currentUserId={null}`; assert sign-in UI renders.
   - `renders user avatar when currentUserId is provided` — pass a valid `currentUserId`; assert avatar/name renders.
   - `does not call fetch("/api/auth/session")` — spy on `global.fetch`; assert it is never called.

2. **`src/components/__tests__/add-recommendation-dialog.test.tsx`**
   - `accepts userId prop and does not fetch session` — render with `userId="user1"`; assert `fetch` is not called.
   - `disables submit when userId is not provided` — render with no `userId`; assert the trigger is disabled or absent.

3. **`src/components/__tests__/add-comment-form.test.tsx`**
   - `renders form when userId is provided`.
   - `renders sign-in prompt when userId is null`.
   - `does not call fetch("/api/auth/session")`.

4. **`src/components/__tests__/comments-section.test.tsx`**
   - `passes currentUserId to AddCommentForm`.
   - `does not call fetch("/api/auth/session")`.

5. **`src/components/__tests__/delete-recommendation-button.test.tsx`**
   - `renders delete button when currentUserId matches recommendation.userId`.
   - `does not render when currentUserId is null`.
   - `does not render when currentUserId does not match`.
   - `does not call fetch("/api/auth/session")`.

6. **`src/components/__tests__/edit-recommendation-button.test.tsx`**
   - Same three visibility cases as delete button.
   - `does not call fetch("/api/auth/session")`.

7. **`src/components/__tests__/refresh-entity-button.test.tsx`**
   - `renders when currentUserId is provided`.
   - `does not render when currentUserId is null`.
   - `does not call fetch("/api/auth/session")`.

### Integration Tests

- `src/app/api/auth/__tests__/session.test.ts` — existing session endpoint tests must continue to pass (endpoint still exists for external callers).

---

## PR 3 — Pagination + Caching

### Integration Tests — `src/app/api/recommendations/__tests__/route.test.ts`

1. `returns first page of 20 results by default` — seed 25 mock recommendations; assert response `data.length === 20` and `pagination.hasNextPage === true`.
2. `returns correct second page` — request `?page=2&limit=20`; assert `data.length === 5` and `pagination.hasNextPage === false`.
3. `respects custom limit parameter` — request `?limit=5`; assert `data.length === 5`.
4. `clamps limit to max 50` — request `?limit=100`; assert `data.length <= 50`.
5. `returns pagination metadata` — assert response includes `{ page, limit, total, hasNextPage }` with correct values.
6. `returns Cache-Control header` — assert response header includes `s-maxage=30`.
7. `POST creates recommendation and response shape is unchanged` — existing POST tests pass without modification.

### Unit Tests — `src/lib/__tests__/recommendations.test.ts`

1. `getRecommendations returns paginated results`.
2. `getRecommendations defaults to page 1, limit 20`.
3. `getRecommendations passes correct skip/take to Prisma`.

---

## PR 4 — Scoped Entity Joins + Comments Endpoint

### Unit Tests — `src/lib/__tests__/recommendation-includes.test.ts`

1. `returns only restaurant include for RESTAURANT category`.
2. `returns only movie include for MOVIE category`.
3. `returns only fashion include for FASHION category`.
4. `returns only household include for HOUSEHOLD category`.
5. `returns only other include for OTHER category`.
6. `all non-matching sub-types are false`.

### Integration Tests — `src/app/api/recommendations/[id]/comments/__tests__/route.test.ts` (new)

1. `GET returns comments array and count for a valid recommendation ID`.
2. `GET returns empty array and count 0 when no comments exist`.
3. `GET returns 404 for a non-existent recommendation ID`.
4. `GET returns 400 when recommendation ID is missing`.
5. `GET does not return entity or user data beyond comment author`.

### Integration Tests — `src/app/api/recommendations/__tests__/route.test.ts` (regression)

- All existing GET/POST tests pass with the scoped include helper.
- Assert that the response for a RESTAURANT recommendation has `entity.restaurant` populated and `entity.movie === null`.

### Integration Tests — `src/app/api/recommendations/[id]/__tests__/route.test.ts` (regression)

- PUT returns updated recommendation without a second `findUnique` call — assert `prisma.recommendation.findUnique` is called at most once (spy).
- DELETE continues to return 204.

### Unit Tests — `src/components/__tests__/comments-section.test.tsx`

- `refreshComments calls /api/recommendations/[id]/comments not the full recommendation endpoint` — mock `fetch`; submit a comment; assert the refresh call targets the comments endpoint.

### Unit Tests — `src/components/__tests__/actions-sidebar.test.tsx`

- `comment count refresh calls the comments endpoint`.

---

## PR 5 — Loading States, Images, Font, Bundle Cleanup

### Unit Tests — `src/app/__tests__/loading.test.tsx` (new)

1. `renders home loading skeleton without crashing`.
2. `renders the expected number of skeleton cards` — assert 6 skeleton elements.

### Unit Tests — `src/app/recommendations/[id]/__tests__/loading.test.tsx` (new)

1. `renders detail page loading skeleton without crashing`.

### Unit Tests — `src/app/__tests__/page.test.tsx` (update)

1. `first card image has priority prop` — render with at least one recommendation; assert the first `<Image>` has `priority={true}` and subsequent ones do not.

### Configuration Checks (CI lint/build)

1. `next.config.ts remotePatterns does not contain wildcard hostname` — a lint rule or snapshot test asserting `**` is absent from the config.
2. `layout.tsx does not import Geist_Mono if removed` — snapshot or import graph assertion.

---

## Manual / Performance Testing Checklist

### Functional Regression (all PRs)

- [ ] Home page renders recommendation cards on first load (no blank flash).
- [ ] Add Recommendation dialog opens and submits correctly.
- [ ] Edit and Delete buttons appear only for the recommendation owner.
- [ ] Comments can be added and deleted.
- [ ] Refresh button re-fetches entity data from TMDB / Google Places.
- [ ] Signing out and in works correctly.
- [ ] Navigating to a recommendation detail page and back renders correctly.
- [ ] Pagination: "Load more" / infinite scroll fetches the next page correctly.
- [ ] Unauthenticated user sees the feed but not owner-only controls.

### Performance Measurements (Lighthouse CI or Web Vitals)

Run Lighthouse against the home page and a recommendation detail page before and after each PR:

| Metric | Baseline Target | Post-optimization Target |
|---|---|---|
| Time to First Byte (TTFB) | < 800 ms | < 400 ms |
| First Contentful Paint (FCP) | < 2.0 s | < 1.0 s |
| Largest Contentful Paint (LCP) | < 3.0 s | < 1.5 s |
| Total Blocking Time (TBT) | < 300 ms | < 150 ms |
| Initial JS bundle size | Baseline | ≥ 20% reduction |

### Network Tab Checks (DevTools)

- [ ] After PR 2: zero requests to `/api/auth/session` on page load.
- [ ] After PR 3: initial `GET /api/recommendations` response is ≤ 20 items.
- [ ] After PR 4: `GET /api/recommendations/[id]` response does not contain 4 null sub-type fields.
- [ ] After PR 6 (dialog lazy load): `AddRecommendationDialog` chunk is absent from the Network tab until the dialog trigger is clicked.

---

## Edge Cases

- Unauthenticated user on home page — page renders feed; add/edit/delete controls are hidden; no session errors in console.
- Empty recommendations database — home page renders empty state without crashing.
- Recommendation with no image — `<Image>` tag is absent; layout does not break.
- `page` param out of range (e.g. `?page=999`) — API returns empty `data` array with `hasNextPage: false`.
- `limit` param exceeds max (e.g. `?limit=1000`) — API clamps to 50.
- Category sub-type not found for a scoped include — query returns `null` for that sub-type gracefully.

---

## Coverage Targets

| File | Target |
|---|---|
| `src/app/page.tsx` | >90% |
| `src/app/layout.tsx` | >80% |
| `src/lib/recommendations.ts` | 100% |
| `src/lib/recommendation-includes.ts` | 100% |
| `src/app/api/recommendations/route.ts` | >90% |
| `src/app/api/recommendations/[id]/comments/route.ts` | >90% |
| All modified client components | >90% on modified lines |
