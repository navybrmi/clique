# Submitter Display

## Overview and Motivation

The recommendation detail page already fetches the submitter's user data but does not display it, leaving viewers without context on who made the recommendation. Additionally, the home/feed page currently renders the submitter's name on every recommendation card with no authentication gate. This feature adds the submitter's name to the detail page and enforces a consistent rule across the site: **submitter names are only visible to logged-in users**.

## Functional Requirements

1. On the recommendation detail page (`/recommendations/[id]`), display the submitter's name and the submission date just below the hero image.
2. The submitter display on the detail page must only be rendered when the viewing user is authenticated. It must not appear for unauthenticated visitors.
3. The submission date displayed on the detail page must be the `createdAt` timestamp of the recommendation, formatted in a human-readable way (e.g., "Jan 5, 2026").
4. The submitter display must be plain text — no link to a profile page.
5. On the home/feed page, the existing `by {name}` line on recommendation cards must be hidden from unauthenticated users. It may continue to display for logged-in users.
6. No other changes to how submitter data is fetched are required — the necessary fields are already included in existing queries.

## Non-Functional Requirements

- No new API calls or database schema changes are needed.
- The auth-gating must be handled server-side (the detail page and home page are both server components), not via client-side session checks, to avoid flash-of-content for unauthenticated users.
- The UI for the submitter display on the detail page should be consistent in style with how commenter names are shown elsewhere (e.g., similar typography/spacing).

## Out of Scope

- Linking the submitter's name to a profile page.
- Showing the submitter's avatar/profile picture.
- Any changes to the comments section (commenter names remain visible regardless of auth status, as comments require login to post and this is a separate concern).
- Any changes to other pages beyond the detail page and home/feed page.

## Open Questions

None.
