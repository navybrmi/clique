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

**Movies:** Use TMDB's `/movie/{tmdbId}` details endpoint. If `tmdbId` is missing (older recommendations created before it was stored), the route searches TMDB by movie name first, takes the result whose title and year both match (or the top result as a fallback), saves the discovered `tmdbId` to the database, and then proceeds with the details fetch. This means `tmdbId` is backfilled automatically on the first successful refresh.

**Restaurants:** Use Google Places' Place Details endpoint (`/place/details/json?place_id={placeId}`). Since `placeId` is stored in the `Restaurant` table, this is more accurate than re-searching by name.

**Fallback:** If TMDB search by name returns no results, or `placeId` is null, the API returns a `400` with a descriptive error.

---

### 3. In-Place Update vs. Page Reload

**Decision: In-place update via custom DOM event**

The `RefreshEntityButton` (sidebar) and `RefreshableEntityDetails` (main column) are siblings under a server component page and cannot share props or state directly. A custom DOM event (`entity-data-refreshed`) decouples them cleanly:

- `RefreshEntityButton` dispatches the event after a successful API call
- `RefreshableEntityDetails` listens for the event via `useEffect` and merges the updated data into its local state

This avoids restructuring the page as a client component and keeps both components independently testable.

---

### 4. Per-Field Highlight Animation

**Decision: Tailwind CSS transition on `background-color`**

Each displayed field wrapper receives a computed class via an `hl(field)` helper. When a field is in the `highlightedFields` Set, it gets `bg-green-50 dark:bg-green-950/30 transition-colors duration-1000 rounded px-1 -mx-1`. After 1200 ms the set is cleared, and the field fades back to transparent.

No external animation library is needed. Clean, lightweight, and consistent with the existing Tailwind setup.

---

### 5. Success Feedback on the Refresh Button

**Decision: Transient success state on the button itself**

After a successful refresh the button briefly shows a green checkmark + "Refreshed!" label for 2 seconds, then reverts to the normal "Refresh" state. This provides immediate, unambiguous confirmation without requiring a toast library.

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

`overview` is not stored — no column exists for it.

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

All fields above are fetched in a single Place Details API call. No separate call is needed for hours.

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
- For movies: if `tmdbId` is null, search TMDB by name, save the discovered ID, then continue
- Return 400 if `placeId` is null (restaurants) or TMDB name search yields no results
- Call the appropriate external API
- Build an update payload — only include fields where the API returned a non-null value
- Run a Prisma `$transaction` to update `Entity`, `Movie`/`Restaurant`, and `Recommendation.imageUrl`
- Return `{ updatedFields, entity, imageUrl }`

#### `src/hooks/use-highlight.ts`
Small custom hook.

```ts
// Returns a boolean that is true for `duration` ms after `trigger()` is called.
// Uses a ref-tracked timer to handle rapid calls and cleanup on unmount.
function useHighlight(duration = 1200): [boolean, () => void]
```

#### `src/components/refresh-entity-button.tsx`
Client component. Follows the same pattern as `EditRecommendationButton` and `DeleteRecommendationButton`.

Responsibilities:
- Fetches session on mount via `/api/auth/session`
- Renders disabled + grayed out if user is not the owner
- Shows a spinner + "Refreshing..." while the refresh API call is in progress
- On success: dispatches the `entity-data-refreshed` custom DOM event; then shows a green "Refreshed!" state for 2 seconds
- On error: `alert()` with the API error message

#### `src/components/refreshable-entity-details.tsx`
Client component. Holds the entity/image state and renders the detail card with per-field highlights.

Responsibilities:
- Accepts `initialEntity`, `initialImageUrl`, and `link` as props
- Holds entity and image URL in `useState`
- Listens for the `entity-data-refreshed` DOM event via `useEffect`
- On event: merges updated fields into state, records which fields changed in a `Set<string>`, and clears the set after 1200 ms
- Renders: hero image, entity name h1, restaurant or movie detail card with per-field highlight classes

Exports the `REFRESH_EVENT` constant used by both components.

---

### Modified Files

#### `src/app/recommendations/[id]/page.tsx`
- Replaced the inline hero image, entity name `<h1>`, and movie/restaurant detail cards with `<RefreshableEntityDetails>`
- `RefreshEntityButton` added to the sidebar alongside Edit/Delete (only rendered for MOVIE and RESTAURANT)
- Fashion, household, and other detail cards remain server-rendered (not eligible for refresh)

#### `src/components/add-recommendation-dialog.tsx`
- Added `tmdbId: ""` to the `movieData` state shape
- `handleMovieSelect` now sets `tmdbId: String(movie.id)` in all three `setMovieData` calls (initial, after detail fetch, and error fallback)
- All form reset calls updated to include `tmdbId: ""`

This ensures `tmdbId` is persisted for all newly created movie recommendations, preventing the name-lookup fallback from being needed for fresh data.

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
- `400` — Category is not MOVIE or RESTAURANT; or `placeId` is null; or TMDB name search returned no results
- `502` — External API call failed (TMDB or Google Places returned an error)
- `500` — Unexpected server/database error

---

## Testing

### Integration Tests (node env)

#### `src/app/api/recommendations/[id]/refresh/__tests__/route.test.ts` — 20 tests

- Returns `401` when unauthenticated
- Returns `403` when authenticated but not the owner
- Returns `404` when recommendation does not exist
- Returns `400` when category is not MOVIE or RESTAURANT
- **Looks up tmdbId by name when missing and proceeds with refresh**
- **Prefers year-and-title matched result when looking up tmdbId by name**
- **Returns `400` when tmdbId is missing and TMDB search finds no results**
- Returns `502` when TMDB API call fails
- Successfully refreshes a movie — verifies DB update and response
- Preserves existing movie fields when TMDB returns null values
- Formats runtime as "Xh Ym" and "Ym" correctly
- Returns `400` when `placeId` is null for a restaurant
- Returns `502` when Google Places HTTP call fails
- Returns `502` when Google Places returns non-OK status
- Successfully refreshes a restaurant — verifies DB update and response
- Filters out generic place types for cuisine
- Joins `weekday_text` with newlines for hours
- Preserves existing restaurant fields when Places returns null values
- Returns `500` when database transaction fails

### Unit Tests (jsdom env)

#### `src/hooks/__tests__/use-highlight.test.ts` — 5 tests
- Returns `false` initially
- Returns `true` immediately after `trigger()` is called
- Returns `false` after the default duration (1200 ms)
- Returns `false` after a custom duration
- Stays `true` if duration has not yet elapsed

#### `src/components/__tests__/refresh-entity-button.test.tsx` — 10 tests
- Renders disabled when user is not logged in
- Renders disabled when user is not the owner
- Renders enabled when user is the owner
- Shows spinner and disables button during refresh
- **Dispatches `entity-data-refreshed` event with result data on success**
- **Shows green "Refreshed!" success state after a successful refresh**
- **Reverts from "Refreshed!" back to "Refresh" after 2 seconds**
- Shows alert with API error message on failure
- Shows generic alert on network error
- Re-enables button after an error

#### `src/components/__tests__/refreshable-entity-details.test.tsx` — 14 tests
- Renders the entity name
- Renders movie fields (director, year, genre, duration)
- Renders restaurant fields (cuisine, location, priceRange, hours, phoneNumber)
- Renders hero image when `initialImageUrl` is provided
- Does not render hero image when absent
- Renders website link when `link` is provided
- Updates entity name when refresh event is dispatched
- Updates movie fields when refresh event is dispatched
- Updates restaurant fields when refresh event is dispatched
- Updates hero image when `imageUrl` is in the refresh result
- Preserves existing fields not included in the refresh result
- Applies highlight class to updated fields immediately after refresh
- Removes highlight class after 1200 ms
- Removes event listener on unmount

---

## PR Breakdown

### PR 1 — Backend: Refresh API Endpoint ✅ Merged

**Files:**
- `src/app/api/recommendations/[id]/refresh/route.ts` _(new)_
- `src/app/api/recommendations/[id]/refresh/__tests__/route.test.ts` _(new)_

**Scope:** Purely server-side. Auth, ownership check, TMDB and Google Places integration, partial field update logic, Prisma transaction, error handling.

---

### PR 2 — Frontend: Refresh Button ✅ Merged

**Files:**
- `src/hooks/use-highlight.ts` _(new)_
- `src/hooks/__tests__/use-highlight.test.ts` _(new)_
- `src/components/refresh-entity-button.tsx` _(new)_
- `src/components/__tests__/refresh-entity-button.test.tsx` _(new)_
- `src/app/recommendations/[id]/page.tsx` _(modified)_
- `jest.integration.config.js` _(modified — exclude hooks dir from node env)_

**Scope:** Adds the refresh button to the detail page sidebar. Active only for the owner. Shows spinner during request, error alert on failure. On success triggers `router.refresh()` as a temporary measure (replaced in PR 3).

---

### PR 3 — Frontend: In-Place Update + Animation + Fixes 🔄 Open (#37)

**Files:**
- `src/components/refreshable-entity-details.tsx` _(new)_
- `src/components/__tests__/refreshable-entity-details.test.tsx` _(new)_
- `src/components/refresh-entity-button.tsx` _(modified)_
- `src/components/__tests__/refresh-entity-button.test.tsx` _(modified)_
- `src/app/recommendations/[id]/page.tsx` _(modified)_
- `src/components/add-recommendation-dialog.tsx` _(modified — tmdbId fix)_
- `src/app/api/recommendations/[id]/refresh/route.ts` _(modified — tmdbId backfill)_
- `src/app/api/recommendations/[id]/refresh/__tests__/route.test.ts` _(modified)_

**Scope:**
- Replaces `router.refresh()` with a custom DOM event (`entity-data-refreshed`) for true in-place updates
- Extracts hero image, entity name, and movie/restaurant cards into `RefreshableEntityDetails` client component
- Per-field green highlight animation on changed fields
- Button shows "Refreshed!" success state for 2 seconds after success
- **Bug fix:** `tmdbId` now saved when creating movie recommendations via the dialog
- **Enhancement:** Refresh route auto-looks up `tmdbId` by movie name when it is missing, backfills it, then proceeds with the refresh

---

## Open Questions / Risks

1. **Google Places billing**: The Place Details API charges per field group. We request only the `basic` and `contact` field sets to minimise cost. The `photos` field is in the `basic` set.

2. **TMDB rate limits**: TMDB allows ~40 requests/10 seconds on the free tier. The refresh is user-triggered and per-recommendation, so this is not a concern.

3. **Entity shared across recommendations**: Multiple users can recommend the same movie/restaurant (same `entityId`). Refreshing from one recommendation updates the shared `Entity` and `Movie`/`Restaurant` records — this affects how the entity appears on *all* recommendations for that entity. This is acceptable behaviour (the data is factual/external).

4. **`imageUrl` is on `Recommendation`, not `Entity`**: Each recommendation has its own `imageUrl`. Refreshing only updates the `imageUrl` on the recommendation being refreshed, not on other recommendations of the same entity.

5. **tmdbId backfill accuracy**: When looking up a tmdbId by name, the route prefers an exact title+year match. If no year is stored and multiple movies share the same name, the top TMDB result is used. This may occasionally pick the wrong film for ambiguous titles. Users can correct this by editing the recommendation and re-selecting via the search dropdown.
