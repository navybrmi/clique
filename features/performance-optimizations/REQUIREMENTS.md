# Requirements: Page Load Performance Optimizations

## Overview & Motivation

The application currently loads pages with multiple avoidable round-trips: the home feed renders as an empty client shell before fetching data, every page fires 6–8 independent database-backed session queries, and the recommendations feed has no pagination or caching. The goal is to reduce page load time by 50% through structural improvements to data fetching, rendering strategy, and bundle size — without changing visible UI behaviour.

---

## Functional Requirements

### F1 — Server-Side Rendering for the Home Page

1. `src/app/page.tsx` SHALL be converted from a client component to a server component. It SHALL fetch recommendations directly via Prisma (or an internal server-side call) before sending HTML to the browser.
2. The `AddRecommendationDialog` component SHALL remain client-side and be lazy-loaded so it does not block the initial render.
3. The rendered HTML received by the browser SHALL include the full recommendation grid (not an empty shell).

### F2 — Centralized Session Resolution

4. Each page's server component SHALL call `auth()` once and pass the resolved `userId` (and any other required session fields) as props to child client components that need it.
5. Client components (Header, AddRecommendationDialog, AddCommentForm, CommentsSection, DeleteRecommendationButton, EditRecommendationButton, RefreshEntityButton) SHALL accept a `userId` prop instead of independently fetching `/api/auth/session` via `useEffect`.
6. The number of HTTP requests to `/api/auth/session` on a full page load SHALL be reduced to zero for authenticated server-rendered pages.

### F3 — Recommendations Feed Pagination

7. `GET /api/recommendations` SHALL accept `page` (integer, default `1`) and `limit` (integer, default `20`, max `50`) query parameters.
8. The response SHALL include a `pagination` object: `{ page, limit, total, hasNextPage }`.
9. The home page SHALL initially load and display the first page of results (20 items). A "Load more" button or infinite-scroll trigger SHALL fetch subsequent pages.

### F4 — Scoped Entity Sub-type Joins

10. All Prisma queries that include entity relations SHALL only join the sub-type table matching the entity's category. Four unnecessary LEFT JOINs per query (e.g. joining `movie`, `fashion`, `household`, `other` when the entity is a `RESTAURANT`) SHALL be eliminated.
11. This applies to: `GET /api/recommendations`, `POST /api/recommendations`, `PUT /api/recommendations/[id]`, `GET /api/recommendations/[id]`, and the recommendation detail page server component.

### F5 — Loading States and Streaming

12. `src/app/loading.tsx` SHALL be created to display a skeleton loading state during home page navigation.
13. `src/app/recommendations/[id]/loading.tsx` SHALL be created to display a skeleton loading state during detail page navigation.
14. The recommendation detail page SHALL wrap independent data-rendering sections in `<Suspense>` boundaries to enable streaming HTML delivery.

### F6 — Lazy Loading of Heavy Client Components

15. `AddRecommendationDialog` SHALL be imported via `next/dynamic({ ssr: false })` in the home page.
16. The dialog chunk SHALL NOT appear in the initial page bundle. It SHALL only be downloaded when the user first interacts with the "Add Recommendation" trigger.

### F7 — Recommendations Feed Caching

17. `GET /api/recommendations` SHALL set appropriate `Cache-Control` headers for unauthenticated responses (e.g. `s-maxage=30, stale-while-revalidate=60`).
18. After create, update, or delete mutations, `revalidatePath('/api/recommendations')` (or equivalent cache invalidation) SHALL be called to prevent stale cached responses.

### F8 — Dedicated Comments Endpoint

19. A `GET /api/recommendations/[id]/comments` endpoint SHALL be created that returns only the comments array and comment count for a given recommendation.
20. `CommentsSection` and `ActionsSidebar` SHALL use this endpoint when refreshing comment data instead of fetching the full recommendation object.

### F9 — Image Optimizations

21. The first visible recommendation card on the home page SHALL have `priority={true}` on its `<Image>` tag to trigger `<link rel="preload">` for the LCP image.
22. `next.config.ts` `remotePatterns` SHALL be restricted to known hostnames (`image.tmdb.org`, `maps.googleapis.com`, `lh3.googleusercontent.com`) instead of the wildcard `**`.

### F10 — Font and Bundle Cleanup

23. If `Geist_Mono` is confirmed unused, it SHALL be removed from `src/app/layout.tsx` to eliminate one unnecessary font download.
24. All icon imports from `lucide-react` in `src/app/page.tsx` SHALL be consolidated into a single `import` statement.

---

## Non-Functional Requirements

- All existing functionality (add/edit/delete recommendations, comments, upvotes, auth) SHALL continue to work correctly after each change.
- No visible UI changes are in scope. Layout, styling, and user interactions remain identical.
- Each sub-feature SHALL be covered by updated or new tests with >90% coverage on modified code.
- Changes SHALL be implemented and shipped as incremental PRs (one per sub-feature) so each can be reviewed and reverted independently.
- Performance improvements SHALL be measurable via Lighthouse CI or Web Vitals instrumentation (LCP, TTFB, TBT).

---

## Out of Scope

- Changes to the authentication provider configuration.
- Database schema changes.
- Introduction of a CDN or edge caching layer.
- React Server Actions (may be considered in a follow-up).
- Mobile-specific layout changes.
- Upvote or user-profile features.

---

## Open Questions

1. Should pagination use offset-based (`page`/`limit`) or cursor-based pagination? Cursor-based is more efficient at scale but more complex to implement on the frontend.
2. Should the recommendations feed cache be per-user (private) or shared (public)? If recommendations are personalized (e.g. friend-only visibility is added later), a shared cache would be incorrect.
3. Is `Geist_Mono` intentionally kept for future use (e.g. code snippets), or is it safe to remove now?
