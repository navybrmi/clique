# Implementation Plan: Recommendation Details Page — Reorder Key Info

## Architecture Decision

`RefreshableEntityDetails` currently renders, in order: hero image → entity name (`h1`) → detail card. The badge, rating, and tags need to sit between the name and the detail card, but the detail card uses the same reactive state inside `RefreshableEntityDetails` (for refresh animations). Splitting the component would break that.

**Chosen approach — `children` slot**: Add an optional `children` prop to `RefreshableEntityDetails`. The component renders `{children}` between the entity name `<div>` and the detail cards. The page passes the badge + rating + tags block as children. This keeps `RefreshableEntityDetails` generic and avoids coupling it to recommendation-specific data.

---

## Files to Modify

### 1. `src/components/refreshable-entity-details.tsx`
- Add `children?: React.ReactNode` to `RefreshableEntityDetailsProps`.
- Render `{children}` in the JSX between the entity name `<div>` and the restaurant/movie detail card blocks.

### 2. `src/app/recommendations/[id]/page.tsx`
- Remove the standalone badge + rating `<div>` block from the left column.
- Remove the standalone "Why This Recommendation?" `<div>` block from the left column.
- Pass both blocks as `children` to `<RefreshableEntityDetails>`.
- Change the "Why This Recommendation?" conditional from `tags.length > 0` to always render, showing `<span className="text-sm text-zinc-400 italic">No tags added</span>` when the array is empty.

### 3. `src/components/__tests__/refreshable-entity-details.test.tsx`
- Add a test: `children` content is rendered when provided.
- Add a test: component renders correctly with no children (existing behaviour unchanged).

---

## New Files to Create

- `src/app/recommendations/[id]/__tests__/page.test.tsx` — new page-level unit tests (see TEST_PLAN.md)

---

## Database / API Changes

None.

---

## External Dependencies

None.

---

## Resulting Left-Column Render Order (after change)

```
RefreshableEntityDetails
  ├── Hero image
  ├── Entity name (h1)
  ├── [children slot]
  │     ├── Category badge + star rating
  │     └── "Why This Recommendation?" (always visible)
  ├── Restaurant Details card  (if restaurant)
  └── Movie Details card       (if movie)
Fashion Details card           (if fashion)
Household Details card         (if household)
CommentsSection
```

---

## PR Breakdown

### PR 1 — UI reorder (this is the only PR)
**Label:** frontend
**Scope:** All changes for this feature — children slot in `RefreshableEntityDetails`, page reorder, always-visible tags, and all tests.
**Files:**
- `src/components/refreshable-entity-details.tsx`
- `src/app/recommendations/[id]/page.tsx`
- `src/components/__tests__/refreshable-entity-details.test.tsx`
- `src/app/recommendations/[id]/__tests__/page.test.tsx` (new)
