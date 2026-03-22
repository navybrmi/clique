# Feature: Refresh External Data on Recommendation Detail Page

## Scope

- Applies to **movies** and **restaurants** only.
- Fashion, Household, and Other categories are out of scope.

## Button Visibility & Access

- The refresh button is **visible to all viewers** of a recommendation detail page.
- It is **active (clickable) only for the creator** of the recommendation.
- It is **grayed out (disabled)** for all other viewers.

## Button Placement

- Placed **alongside the existing Edit and Delete buttons** on the detail page.

## What Gets Refreshed

- All fields fetched from the external API:
  - **Restaurants** — Google Places API
  - **Movies** — TMDB API
- **Always overwrite** with the latest API data — no confirmation prompt.
- **Preserve user-entered custom data** only if the API returns nothing/null for that specific field.

## User Feedback

- **In-place update** — no page reload required.
- Fields that were updated animate with a **soft green highlight (`bg-green-50`) fading to transparent over ~1 second**.
- The refresh button shows a **loading state** while the fetch is in progress.
