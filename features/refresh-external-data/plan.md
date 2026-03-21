# Implementation Plan: Refresh External Data

## Overview

This feature adds a "Refresh" button to the recommendation detail page for movies and restaurants. When clicked by the recommendation's creator, it re-fetches the latest data from TMDB (movies) or Google Places (restaurants) and updates the displayed fields in-place with a subtle green highlight animation.

---

## Architecture Decisions & Trade-offs

### 1. New API Endpoint vs. Extending the Existing PUT

**Decision: New dedicated endpoint — `POST /api/recommendations/[id]/refresh`**

The existing `PUT /api/recommendations/[id]` requires the client to send the full updated payload. A refresh operation is fundamentally different: the server fetches fresh data from an external API and decides what to update. Putting this logic in a new endpoint:

- Keeps API keys server-side only (not exposed to the browser)
- Makes the intent explicit and the route easy to find/test
- Doesn't risk breaking the existing PUT contract

Trade-off: Adds a new route file. Acceptable given the clean separation.

---

### 2. Which External API to Call for Refresh

**Movies:** Use TMDB's `/movie/{tmdbId}` details endpoint (not the search endpoint). Since the `tmdbId` is already stored in the `Movie` table, we can fetch precise, complete data for that specific film rather than doing a fuzzy text search.

**Restaurants:** Use Google Places' Place Details endpoint (`/place/details/json?place_id={placeId}`). Since `placeId` is already stored in the `Restaurant` table, this is more accurate than re-searching by name.

**Fallback:** If `tmdbId` or `placeId` is null (e.g., older recommendations created before these IDs were stored), the API returns a `400` with a descriptive error and the UI shows a toast: "Cannot refresh — no external ID found for this item."

---

### 3. In-Place Update vs. Page Reload

**Decision: In-place update using client-side state**

Since the requirement is no page reload and per-field animations, the movie/restaurant detail card section of the page needs to be a client component that holds state. The approach:

1. The `page.tsx` (server component) fetches the recommendation data as it does today.
2. It passes the entity data as initial props into a new client wrapper component (`RefreshableEntityDetails`).
3. `RefreshableEntityDetails` holds the entity data in local React state.
4. The `RefreshEntityButton` (also a client component) lives inside this wrapper and updates the shared state after a successful refresh API call.
5. The wrapper compares old vs. new values to determine which fields changed, and triggers the highlight animation on those fields.

Trade-off: The movie/restaurant detail display moves from being pure server-rendered JSX to a client component. This is a minor trade-off — the data is still initially fetched server-side; we just hand it off to a client component for interactivity.

---

### 4. Per-Field Highlight Animation

**Decision: Tailwind CSS transition on `background-color`**

Each displayed field gets a wrapper `<span>` or `<div>` that accepts a `highlight` boolean prop. When `highlight` is `true`, the class `bg-green-50 transition-colors duration-1000` is applied; after ~1200ms it's removed (via a `setTimeout` that sets `highlight` back to `false`). This produces a fade from soft green back to transparent.

No external animation library is needed. Clean, lightweight, and consistent with the existing Tailwind setup.

---

## Fields Refreshed Per Category

### Movie (from TMDB `/movie/{tmdbId}`)

| TMDB field | Database field | Notes |
|---|---|---|
| `title` | `Entity.name` | Only if returned |
| `release_date` (year portion) | `Movie.year` | Only if returned |
| `genres[].name` (comma-joined) | `Movie.genre` | Only if returned |
| `runtime` (formatted as "Xh Ym") | `Movie.duration` | Only if returned |
| `imdb_id` | `Movie.imdbId` | Only if returned |
| `poster_path` (full URL, w500) | `Recommendation.imageUrl` | Only if returned |
| `overview` | Not stored currently | Out of scope — no column for it |

### Restaurant (from Google Places `/place/details/json?place_id={placeId}`)

Fields requested via the `fields` parameter to minimise billing cost:

| Google Places field | Database field | Notes |
|---|---|---|
| `name` | `Entity.name` | Only if returned |
| `formatted_address` | `Restaurant.location` | Only if returned |
| `types` (filtered, first 2) | `Restaurant.cuisine` | Only if returned |
| `price_level` (→ "$", "$$", etc.) | `Restaurant.priceRange` | Only if returned |
| `formatted_phone_number` | `Restaurant.phoneNumber` | Only if returned |
| `opening_hours.weekday_text` (joined with `\n`) | `Restaurant.hours` | Only if returned |
| `photos[0]` (URL, maxwidth=400) | `Recommendation.imageUrl` | Only if returned |

All fields above are fetched in a single Place Details API call by including `opening_hours` in the `fields` parameter alongside the other field groups. No separate API call is needed.

Fields NOT refreshed (no column in schema): `rating`, `reviewCount`.

---

## Code Changes

### New Files

#### `src/app/api/recommendations/[id]/refresh/route.ts`
New API route. Handles `POST /api/recommendations/[id]/refresh`.

Responsibilities:
- Authenticate the user via `auth()`
- Verify the user is the recommendation owner (403 if not)
- Look up the recommendation with its entity, movie/restaurant, and category
- Return 400 if category is not MOVIE or RESTAURANT
- Return 400 if `tmdbId` / `placeId` is missing
- Call the appropriate external API
- Build an update payload — only include fields where the API returned a non-null value
- Run a Prisma transaction to update `Entity`, `Movie`/`Restaurant`, and `Recommendation.imageUrl`
- Return the updated fields (both the new values and a list of which field names changed)

#### `src/components/refreshable-entity-details.tsx`
New client component. Wraps the movie or restaurant detail display.

Responsibilities:
- Accepts `initialData` (entity + movie/restaurant fields) and `recommendation` as props
- Holds entity data in `useState`
- Tracks which fields were recently updated in a `Set<string>` state
- Renders the detail card, passing `highlight` boolean per field
- Exposes an `onRefresh` callback that the `RefreshEntityButton` calls with the updated data

#### `src/components/refresh-entity-button.tsx`
New client component. Follows the same pattern as `EditRecommendationButton` and `DeleteRecommendationButton`.

Responsibilities:
- Fetches session on mount via `/api/auth/session`
- Renders disabled + grayed out if user is not the owner
- Shows a loading spinner while refresh is in progress
- Calls `POST /api/recommendations/[id]/refresh`
- On success: calls `onRefresh(updatedData, changedFields)` to update parent state
- On error: shows a toast notification with the error message

#### `src/hooks/use-highlight.ts`
Small custom hook.

```ts
// Returns a boolean that is true for `duration` ms after `trigger()` is called
function useHighlight(duration = 1200): [boolean, () => void]
```

Used by each field display in `RefreshableEntityDetails` to manage the highlight lifecycle cleanly.

---

### Modified Files

#### `src/app/recommendations/[id]/page.tsx`
- Import and render `RefreshableEntityDetails` for MOVIE and RESTAURANT categories
- Import and render `RefreshEntityButton` alongside `EditRecommendationButton` and `DeleteRecommendationButton` in the sidebar (only for MOVIE/RESTAURANT)
- Pass the `session` (fetched server-side via `auth()`) down as a prop to `RefreshEntityButton` so it doesn't need its own session fetch — aligning with the pattern used by the page for `userId` checks

#### `src/app/api/movies/search/route.ts`
No changes needed — the refresh endpoint makes its own direct TMDB call.

#### `src/app/api/restaurants/search/route.ts`
No changes needed — the refresh endpoint makes its own direct Google Places call.

---

## API Contract

### `POST /api/recommendations/[id]/refresh`

**Request:** No body required.

**Success Response (200):**
```json
{
  "updatedFields": ["genre", "year", "imageUrl"],
  "entity": {
    "name": "Inception",
    "movie": {
      "year": 2010,
      "genre": "Action, Science Fiction",
      "duration": "2h 28m",
      "tmdbId": "27205",
      "imdbId": "tt1375666"
    }
  },
  "imageUrl": "https://image.tmdb.org/t/p/w500/..."
}
```

**Error Responses:**
- `401` — Not authenticated
- `403` — User is not the recommendation owner
- `404` — Recommendation not found
- `400` — Category is not MOVIE or RESTAURANT, or external ID (tmdbId/placeId) is missing
- `502` — External API call failed (TMDB or Google Places returned an error)

---

## Testing Plan

### Unit Tests

#### `src/app/api/recommendations/[id]/refresh/route.test.ts` (integration test — node env)

Scenarios to cover:
- Returns `401` when unauthenticated
- Returns `403` when authenticated but not the owner
- Returns `404` when recommendation does not exist
- Returns `400` when category is not MOVIE or RESTAURANT
- Returns `400` when `tmdbId` is null for a movie recommendation
- Returns `400` when `placeId` is null for a restaurant recommendation
- Successfully refreshes a movie — mocks TMDB fetch, verifies DB update and response
- Successfully refreshes a restaurant — mocks Google Places fetch, verifies DB update and response
- Preserves existing value when API returns null for a field (partial update)
- Returns `502` when the external API call fails

#### `src/components/__tests__/refresh-entity-button.test.tsx` (unit — jsdom env)

Scenarios to cover:
- Renders a disabled, grayed-out button when user is not the owner
- Renders an enabled button when user is the owner
- Shows a loading spinner while the refresh is in progress
- Calls `onRefresh` with updated data on success
- Shows an error toast on API failure
- Button is disabled during the loading state (prevents double-click)

#### `src/components/__tests__/refreshable-entity-details.test.tsx` (unit — jsdom env)

Scenarios to cover:
- Renders initial entity data correctly
- Updates displayed data when `onRefresh` is called
- Applies highlight class to changed fields after refresh
- Removes highlight class after the animation duration
- Does not apply highlight to unchanged fields

#### `src/hooks/__tests__/use-highlight.test.ts`

Scenarios to cover:
- Returns `false` initially
- Returns `true` immediately after `trigger()` is called
- Returns `false` after the duration has elapsed

---

## Implementation Sequence

1. **New API route** — `refresh/route.ts` (server-side logic, external API calls, DB update)
2. **`useHighlight` hook** — small, self-contained
3. **`RefreshableEntityDetails` component** — display + animation logic
4. **`RefreshEntityButton` component** — button + loading + error handling
5. **Wire into `page.tsx`** — integrate all new components
6. **Tests** — write tests for all new files
7. **Manual smoke test** — verify with the running app

---

## PR Breakdown

Changes are delivered in 3 incremental PRs, each independently testable and reviewable.

### PR 1 — Backend: Refresh API Endpoint

**Files:**
- `src/app/api/recommendations/[id]/refresh/route.ts` _(new)_
- `src/app/api/recommendations/[id]/__tests__/refresh.test.ts` _(new)_

**Scope:** Purely server-side. No UI changes. Implements the refresh endpoint including auth, ownership check, external API calls (TMDB / Google Places), partial field update logic, and error handling.

**Validation:** All integration test scenarios pass. Endpoint can be manually tested via curl or a REST client.

---

### PR 2 — Frontend: Refresh Button

**Files:**
- `src/hooks/use-highlight.ts` _(new)_
- `src/hooks/__tests__/use-highlight.test.ts` _(new)_
- `src/components/refresh-entity-button.tsx` _(new)_
- `src/components/__tests__/refresh-entity-button.test.tsx` _(new)_
- `src/app/recommendations/[id]/page.tsx` _(modified — add button alongside Edit/Delete)_

**Scope:** Adds the refresh button to the detail page. Button is visible to all, active only for the owner (grayed out otherwise), shows a loading spinner during the API call, and shows an error toast on failure. No in-place update or animation yet — success just triggers a `router.refresh()` as a temporary measure.

**Validation:** Button renders correctly for owner vs. non-owner. Loading and error states work. Clicking refresh calls the API and the page data updates (via router refresh).

---

### PR 3 — Frontend: In-Place Update + Animation

**Files:**
- `src/components/refreshable-entity-details.tsx` _(new)_
- `src/components/__tests__/refreshable-entity-details.test.tsx` _(new)_
- `src/app/recommendations/[id]/page.tsx` _(modified — wrap detail section with RefreshableEntityDetails)_
- `src/components/refresh-entity-button.tsx` _(modified — call onRefresh callback instead of router.refresh())_

**Scope:** Replaces the temporary `router.refresh()` with true in-place state updates. Extracts the movie/restaurant detail display into a client component that holds state and applies the green highlight fade animation to changed fields.

**Validation:** After clicking refresh, updated fields highlight briefly in green and fade back. No page reload occurs. Unchanged fields do not animate.

---

## Open Questions / Risks

1. **Google Places billing**: The Place Details API charges per field group. We will request only the `basic` and `contact` field sets to minimise cost. The `photos` field is in the `basic` set.

2. **TMDB rate limits**: TMDB allows ~40 requests/10 seconds on the free tier. The refresh is user-triggered and per-recommendation, so this is not a concern.

3. **Entity shared across recommendations**: Multiple users can recommend the same movie/restaurant (same `entityId`). Refreshing from one recommendation updates the shared `Entity` and `Movie`/`Restaurant` records — this affects how the entity appears on *all* recommendations for that entity. This is acceptable behaviour (the data is factual/external), but worth noting.

4. **`imageUrl` is on `Recommendation`, not `Entity`**: Each recommendation has its own `imageUrl`. Refreshing only updates the `imageUrl` on the recommendation being refreshed, not on other recommendations of the same entity.
