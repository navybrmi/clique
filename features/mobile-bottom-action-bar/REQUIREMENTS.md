# Requirements: Mobile Bottom Action Bar

## Overview and Motivation

On mobile, the two most important actions — **Add Recommendation** and **Switch Feed** — are buried inside the hamburger drawer and invisible until the user discovers it. Logged-in users in particular have no obvious way to switch cliques or add a recommendation without first knowing to open the menu. A persistent bottom action bar surfaces these two actions directly, making them always one tap away on small screens.

## Functional Requirements

1. A bottom action bar is rendered on mobile viewports only (below the `lg` breakpoint, i.e. where the left sidebar is hidden).
2. The bar is fixed to the bottom of the viewport and always visible while scrolling.
3. **For authenticated users**, the bar contains two buttons:
   - **👥 Cliques** — opens a bottom sheet containing the feed switcher (Public, My Recommendations, and all clique feeds). Selecting a feed navigates and closes the sheet.
   - **➕ Add** — opens the Add Recommendation dialog (same dialog triggered by the existing Add Recommendation button).
4. **For unauthenticated users**, the bar contains only the **➕ Add** button, which triggers the existing sign-in prompt behaviour.
5. The hamburger menu, header, and breadcrumb bar are unchanged.
6. The bottom bar does not appear on `lg` and above (where the left sidebar is already visible).
7. The Cliques bottom sheet lists the same feeds as the desktop sidebar: Public, My Recommendations (authenticated only), and all cliques the user belongs to. It includes the active feed indicator and the Create Clique button.

## Non-Functional Requirements

- The bottom bar must not obscure feed cards — the page should have bottom padding on mobile to account for the bar's height.
- Reuses the existing `CliqueSidebar` content and `AddRecommendationTrigger` component — no duplication of feed-switching or dialog logic.
- The Cliques bottom sheet uses the existing `Sheet` component (same pattern as the hamburger drawer).

## Out of Scope

- Removing or modifying the hamburger menu.
- Removing or modifying the breadcrumb bar.
- Any changes to desktop layout.
- Per-clique contextual actions (invite/manage) in the bottom bar.

## Open Questions

None.
