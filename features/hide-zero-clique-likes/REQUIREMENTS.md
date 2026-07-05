# Requirements: Hide Zero Secondary Like Count

## Overview and Motivation

The recommendation feed cards display two like counts: a global total and a secondary "in your cliques" count for logged-in users. When the secondary count is zero it adds visual noise without conveying useful information — a user gains nothing from seeing "0 in your cliques." This change suppresses the secondary label when it contributes no signal, and also updates its wording for clarity.

## Functional Requirements

1. When `secondary` is `0`, the secondary label must not be rendered — identical behaviour to `null`.
2. When `secondary` is a positive integer, display it as **"N likes across your cliques"** (replacing the current "N in your cliques" wording).
3. When `secondary` is `null`, existing behaviour is unchanged — the secondary label is not rendered.
4. The global total (`total`) is always rendered regardless of its value or the value of `secondary`.

## Non-Functional Requirements

- Change is confined to `LikeCounts` — no callers need to be updated.
- Accessible `aria-label` on the secondary span must be updated to match the new wording.

## Out of Scope

- Changing how or when `secondary` is computed.
- Any changes to the global total display.
- The recommendation detail page (`/recommendations/[id]`) — `LikeCounts` is a shared component so it benefits automatically, but no page-level changes are needed.

## Open Questions

None.
