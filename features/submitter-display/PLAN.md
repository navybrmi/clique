# Implementation Plan: Submitter Display

## Architecture Decisions

- **No new files needed.** All changes are confined to two pages and one component.
- **No DB/API changes.** The submitter's `name` and `createdAt` are already fetched on both affected pages.
- **Server-side auth-gating.** Both `page.tsx` files are server components with `session` already in scope — the conditional render happens at the server, so there is no flash-of-content for unauthenticated visitors.
- **`afterImage` slot on `RefreshableEntityDetails`.** The hero image is rendered inside this client component, so the cleanest way to inject content "just below the image" (before the entity name `<h1>`) is to add an optional `afterImage?: React.ReactNode` prop to the component.

## Files to Modify

### 1. `src/components/refreshable-entity-details.tsx`
- Add `afterImage?: React.ReactNode` to `RefreshableEntityDetailsProps`.
- Render `{afterImage}` between the hero image block and the entity `<h1>`.

### 2. `src/app/recommendations/[id]/page.tsx`
- Build the submitter JSX: `"Recommended by [name] · [formatted date]"` in a small muted text style.
- Format `recommendation.createdAt` using `toLocaleDateString` (e.g. "Jan 5, 2026").
- Pass this as the `afterImage` prop to `<RefreshableEntityDetails>`, wrapped in `session ? (...) : null`.

### 3. `src/app/page.tsx`
- Wrap the existing `by {rec.user.name || "Anonymous"}` span in a `session ? (...) : null` guard.

## No New Files, No Schema Changes, No New Dependencies

## PR Breakdown

### PR 1 — feat: show submitter name and date on recommendation detail page; hide submitter name for unauthenticated users
- `src/components/refreshable-entity-details.tsx`
- `src/app/recommendations/[id]/page.tsx`
- `src/app/page.tsx`
- Corresponding test files
