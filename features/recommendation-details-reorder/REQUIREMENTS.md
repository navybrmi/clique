# Requirements: Recommendation Details Page — Reorder Key Info

## Overview & Motivation

Currently on the recommendation details page, the category badge, star rating, and "Why This Recommendation?" tags appear **below** the restaurant/movie detail card — meaning a user has to scroll past the full details block to see the category and the recommender's rationale. Moving these elements immediately under the entity name surfaces the most important context (what kind of thing is this? how good is it? why is it recommended?) before diving into specifics.

---

## Functional Requirements

1. **Reorder left-column content**: The category badge, star rating (1–10 stars), and "Why This Recommendation?" section SHALL be rendered directly below the entity name (`<h1>`), and before the entity detail card (Restaurant Details / Movie Details / Fashion Details / Household Product Details).

2. **Always render "Why This Recommendation?"**: The "Why This Recommendation?" heading and tag area SHALL always be visible, regardless of whether any tags exist. When no tags are present, the section SHALL render with a placeholder such as *"No tags added"* (muted/secondary text style).

3. **No other layout changes**: The hero image, detail cards, fashion/household cards, comments section, and the right sidebar (ActionsSidebar + Edit/Refresh/Delete buttons) all remain exactly as they are today.

---

## Non-Functional Requirements

- The reordering must not break the existing refresh animation behaviour — the `RefreshableEntityDetails` component listens for `entity-data-refreshed` events and animates changed fields; this must continue to work correctly.
- No new API calls or data-fetching changes are needed.
- The change must be covered by updated/new component or page-level unit tests (>90% coverage on modified code).

---

## Out of Scope

- Moving or modifying the comments section.
- Changes to the right sidebar layout.
- Mobile-specific layout changes.
- Any changes to the star rating component logic or tag data model.

---

## Open Questions

None.
