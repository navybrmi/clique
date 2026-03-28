# Implementation Plan: Page Load Performance Optimizations

## Architecture Overview

The optimizations are grouped into 5 PRs ordered by impact and dependency. PR 1 is the prerequisite for PR 2 (the home page must be a Server Component before `auth()` can be called in it). PRs 3–5 are incremental improvements that can follow in any order after PR 2.

```
PR 1: Server component home page + lazy dialog      (F1, F6)
PR 2: Centralized session resolution                (F2)
PR 3: Pagination + caching on recommendations feed  (F3, F7)
PR 4: Scoped entity joins + comments endpoint       (F4, F8)
PR 5: Loading states, images, font, bundle cleanup  (F5, F9, F10)
```

---

## PR 1 — Server Component Home Page + Lazy Dialog

**Estimated impact:** Highest. Eliminates the empty-shell render and the client-side `/api/recommendations` fetch on every home page load.

### Files to Modify

#### `src/app/page.tsx`
- Remove `"use client"` directive.
- Remove `useState` / `useEffect` for recommendations fetching.
- Add a direct Prisma call (or call a shared `getRecommendations()` server utility) to fetch the first page of recommendations.
- Do NOT use `next/dynamic` directly in `page.tsx` — Server Components cannot render `ssr: false` dynamic imports. Instead, extract all interactive state (dialog open/close) into a small `"use client"` `AddRecommendationTrigger` component and render `<AddRecommendationTrigger />` from the server page.
- Consolidate the two separate `lucide-react` import lines (lines 9 and 11) into one.

#### `src/lib/recommendations.ts` (new file)
- Export `getRecommendations({ page, limit })` — a server-side utility that calls `prisma.recommendation.findMany(...)` with pagination. Shared between the page server component and the API route.

### Files to Create
- `src/components/add-recommendation-trigger.tsx` — `"use client"` wrapper that:
  - Holds the dialog open state and renders the trigger button.
  - Uses `next/dynamic` with `{ ssr: false }` to lazy-load `AddRecommendationDialog`:
    ```ts
    const AddRecommendationDialog = dynamic(
      () => import('@/components/add-recommendation-dialog'),
      { ssr: false }
    )
    ```
  - Renders `<AddRecommendationDialog />` conditionally based on local open state.

### No Changes Needed
- `src/app/api/recommendations/route.ts` — keep as-is for now; pagination is added in PR 3.

---

## PR 2 — Centralized Session Resolution

**Estimated impact:** High. Removes 6–8 database-backed `/api/auth/session` HTTP requests per page load.

### Approach

Call `auth()` once in each server component entry point, pass `userId` (and `userImage`/`userName` where needed) as props through the component tree.

### Files to Modify

#### `src/app/page.tsx`
- Call `const session = await auth()` at the top.
- Pass `session?.user?.id` as `currentUserId` prop to `AddRecommendationTrigger`.

#### `src/app/recommendations/[id]/page.tsx`
- Already a server component — add `const session = await auth()` at the top.
- Pass `currentUserId` as a prop to: `AddCommentForm`, `CommentsSection`, `DeleteRecommendationButton`, `EditRecommendationButton`, `RefreshEntityButton`, `ActionsSidebar`.

#### `src/components/header.tsx`
- Remove `useEffect` + `fetch('/api/auth/session')`.
- Accept `session` (or `currentUserId`) as a prop.
- Update callers (`src/app/layout.tsx` or page-level layouts) to pass the session down.

#### `src/components/add-recommendation-dialog.tsx`
- Remove both `fetch('/api/auth/session')` calls (lines 119 and 550).
- Accept `userId` as a required prop.

#### `src/components/add-comment-form.tsx`
- Remove `useEffect` + `fetch("/api/auth/session")`.
- Accept `userId` as a prop; show the form only when `userId` is truthy.

#### `src/components/comments-section.tsx`
- Remove `useEffect` + `fetch("/api/auth/session")`.
- Accept `currentUserId` as a prop; pass it to `AddCommentForm` and individual comment delete buttons.

#### `src/components/delete-recommendation-button.tsx`
- Remove `useEffect` + `fetch('/api/auth/session')`.
- Accept `currentUserId` as a prop; compare against `recommendation.userId` to show/hide the button.

#### `src/components/edit-recommendation-button.tsx`
- Same as `delete-recommendation-button.tsx`.

#### `src/components/refresh-entity-button.tsx`
- Remove `useEffect` + `fetch("/api/auth/session")`.
- Accept `currentUserId` as a prop.

#### `src/app/layout.tsx`
- Call `auth()` and pass session to `<Header>`.

### Notes
- Where a component is currently checking `session.user.id === recommendation.userId` to decide visibility, the prop should be named `currentUserId: string | null | undefined` to cover unauthenticated users.
- The `useEffect`-based auth state loading skeletons (e.g. a loading spinner while session resolves) can be removed once the prop is always available on first render.

---

## PR 3 — Pagination + Caching on Recommendations Feed

**Estimated impact:** Medium-High. Prevents sending the full DB table over the wire on every feed load; adds CDN-level caching for the public feed.

### Files to Modify

#### `src/app/api/recommendations/route.ts` (`GET` handler)
- Add `page` (default `1`) and `limit` (default `20`, max `50`) query param parsing.
- Add `skip: (page - 1) * limit` and `take: limit` to `findMany`.
- Add a parallel `prisma.recommendation.count()` call to compute `total` and `hasNextPage`.
- Return `{ data: recommendations, pagination: { page, limit, total, hasNextPage } }`.
- Add `Cache-Control: s-maxage=30, stale-while-revalidate=60` header for unauthenticated requests.

#### `src/lib/recommendations.ts`
- Update `getRecommendations()` (added in PR 1) to accept and forward `page`/`limit`.

#### `src/app/page.tsx` (server component, from PR 1)
- Render a "Load more" button that fetches the next page client-side, or implement a client-side `useSWRInfinite` / `useIntersectionObserver` pattern for infinite scroll.
- Since the page is now a server component, the infinite scroll trigger will need to be a small client island component.

#### `src/app/api/recommendations/[id]/route.ts` (`PUT` / `DELETE` handlers)
- After mutation, invalidate the recommendations feed cache using a shared cache tag: call `revalidateTag('recommendations')` (or trigger the equivalent CDN cache-tag purge if using an external CDN).

#### `src/app/api/recommendations/route.ts` (`POST` handler)
- Same `revalidateTag('recommendations')` call after creation so both the Data Cache and any CDN honouring `Cache-Control: s-maxage` are refreshed.

---

## PR 4 — Scoped Entity Joins + Dedicated Comments Endpoint

**Estimated impact:** Medium. Reduces 5 LEFT JOINs to 1 per recommendation query; removes full-recommendation over-fetching for comment refreshes.

### Files to Modify

#### Shared query helper (new file: `src/lib/recommendation-includes.ts`)
Create a helper that returns the correct Prisma `include` shape based on a category name:
```ts
export function entityIncludeForCategory(categoryName: string) {
  return {
    category: true,
    restaurant: categoryName === 'RESTAURANT' ? true : false,
    movie: categoryName === 'MOVIE' ? true : false,
    fashion: categoryName === 'FASHION' ? true : false,
    household: categoryName === 'HOUSEHOLD' ? true : false,
    other: categoryName === 'OTHER' ? true : false,
  }
}
```

Update the following files to use this helper (fetch category name first, then scope the include):
- `src/app/api/recommendations/route.ts` (GET + POST)
- `src/app/api/recommendations/[id]/route.ts` (GET + PUT)
- `src/app/recommendations/[id]/page.tsx`

#### New file: `src/app/api/recommendations/[id]/comments/route.ts`
- `GET` handler: return `{ comments: [...], count: number }` for a given recommendation ID.
- Uses `prisma.comment.findMany({ where: { recommendationId: id }, include: { user: { select: { id, name, image } } }, orderBy: { createdAt: 'asc' } })`.

#### `src/components/comments-section.tsx`
- Change `refreshComments` to call `GET /api/recommendations/${id}/comments` instead of the full recommendation endpoint.

#### `src/components/actions-sidebar.tsx`
- Change the comment count refresh to call the new comments endpoint.

#### Redundant post-mutation fetches
- `src/app/api/recommendations/[id]/route.ts` (PUT handler): remove the post-update `findUnique` call; use the `include` clause on `prisma.recommendation.update` directly.
- `src/app/api/recommendations/[id]/refresh/route.ts`: remove the post-transaction `findUnique` calls in `refreshMovie` and `refreshRestaurant`; return the updated data from the transaction result.

---

## PR 5 — Loading States, Images, Font, Bundle Cleanup

**Estimated impact:** Medium (LCP improvement) + Low (housekeeping).

### Files to Create

#### `src/app/loading.tsx`
Skeleton grid matching the home page layout:
```tsx
export default function Loading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-zinc-800 animate-pulse h-64" />
      ))}
    </div>
  )
}
```

#### `src/app/recommendations/[id]/loading.tsx`
Skeleton matching the detail page two-column layout.

### Files to Modify

#### `src/app/page.tsx`
- Add `priority={true}` to the `<Image>` tag of the first recommendation card (index `0`).

#### `next.config.ts`
- Replace `{ protocol: 'https', hostname: '**' }` with explicit `remotePatterns` entries for all required image hosts:
  ```ts
  { protocol: 'https', hostname: 'image.tmdb.org' },          // TMDB posters
  { protocol: 'https', hostname: 'maps.googleapis.com' },     // Google Places / Maps images
  { protocol: 'https', hostname: 'images.unsplash.com' },     // Unsplash images
  { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google OAuth avatars
  { protocol: 'https', hostname: 'graph.facebook.com' },        // Facebook OAuth avatars
  ```
- Remove placeholder entries such as `example.com` that are not required for real traffic.

#### `src/app/layout.tsx`
- Remove `Geist_Mono` import and CSS variable assignment if confirmed unused.

---

## Database / API Changes Summary

| PR | Breaking API Change? | Migration Needed? |
|---|---|---|
| PR 1 | No | No |
| PR 2 | No (internal only) | No |
| PR 3 | Yes — `GET /api/recommendations` response shape changes from array to `{ data, pagination }` | No DB migration |
| PR 4 | No (new endpoint added; existing endpoints unchanged) | No |
| PR 5 | No | No |

**Note:** PR 3 changes the `GET /api/recommendations` response from a bare array to `{ data: [...], pagination: {...} }`. Any client code consuming this endpoint directly must be updated in the same PR.

---

## PR Breakdown Summary

| PR | Requirements | Key Files |
|---|---|---|
| PR 1 | F1, F6 | `src/app/page.tsx`, `src/lib/recommendations.ts`, `src/components/add-recommendation-trigger.tsx` |
| PR 2 | F2 | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/recommendations/[id]/page.tsx`, 7 client components |
| PR 3 | F3, F7 | `src/app/api/recommendations/route.ts`, `src/lib/recommendations.ts`, `src/app/page.tsx` |
| PR 4 | F4, F8 | `src/lib/recommendation-includes.ts`, `src/app/api/recommendations/[id]/comments/route.ts`, 5 API routes, 2 components |
| PR 5 | F5, F9, F10 | `src/app/loading.tsx`, `src/app/recommendations/[id]/loading.tsx`, `next.config.ts`, `src/app/layout.tsx` |
