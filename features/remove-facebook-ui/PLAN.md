# Implementation Plan: Remove Facebook UI

## Architecture Decisions

- No new files, no new dependencies, no backend changes.
- Both changes are pure content deletions — no structural refactoring required.

## Files to Modify

### 1. `src/app/auth/signin/page.tsx`
- Delete the entire Facebook `<form>` block (lines 26–38), including the server action, the Button, and the inline SVG icon.
- The Google form, "Back to home" link, and all surrounding layout remain untouched.

### 2. `src/app/data-deletion/page.tsx`
- Change the opening line of "What Data We Store" from "When you sign in with Facebook, we store:" to a provider-neutral phrasing (e.g. "When you sign in, we store:").
- Remove "Your Facebook user ID" from the stored-data bullet list.
- Remove "Your Facebook user ID (if available)" from the deletion-request bullet list.
- Delete the entire "Automatic Data Removal" section, which is Facebook-specific.

## No Schema, API, or Dependency Changes

## PR Breakdown

### PR 1 — feat: remove Facebook sign-in button and data-deletion page references
- `src/app/auth/signin/page.tsx`
- `src/app/data-deletion/page.tsx`
- Corresponding test files
