# Requirements: Clique-Scoped Engagement & Home Feed Redesign

## 1. Overview & Motivation
Today the home page shows every recommendation publicly, likes are global but loosely
gated, and comments are completely ungated. We want engagement (likes & comments) to be
**anchored to a user's cliques**: you can only like or comment on a recommendation once it
lives inside one of your cliques, comments become **per-clique private threads**, and the
feed/detail surfaces make a reco's clique associations and like volume visible.

## 2. Functional Requirements

### 2.1 Engagement gating
1. A user may **like** a recommendation only if it belongs to **at least one clique the
   user is a member of**. Likes remain **global** — one `UpVote` per
   `(user, recommendation)`. The like action is performed in a clique context and the
   server validates membership + that the reco is in that clique.
2. A user may **comment** on a recommendation only **within a clique they belong to that
   contains the reco**. Comments become **clique-scoped**: each `(recommendation, clique)`
   pair has its own exclusive thread. A clique's members see and post only to that clique's
   thread.
3. All gating is **enforced server-side** on the mutating endpoints; the UI gating is
   purely cosmetic on top.

### 2.2 Public feed card
4. Show up to **2 clique "chips"** = cliques that (a) contain the reco **and** (b) the
   current user is a member of, selected as the **2 largest by member count**. Each chip
   links to that clique's feed (`/?cliqueId=<id>`).
5. Show **two like counts**, display-only (no interactive like button on public cards):
   - **Total likes** — global count across all cliques, including cliques the user isn't in.
   - **My-cliques likes** — count of **distinct** users who liked the reco **and** share at
     least one clique (containing the reco) with the current user. (Distinct → no
     double-counting across overlapping cliques.)
6. **Logged-out / no-clique users:** show **Total likes only**; no chips, no my-cliques
   number.
7. Comment counts are **not** shown on public cards.

### 2.3 Clique feed card (within `?cliqueId=X`)
8. Comment count reflects **only the current clique's** thread (not global).
9. Like counts show **Total** (global) + **Within this clique** (members of clique X who
   liked the reco).
10. The upvote button stays **interactive** in clique context (existing behavior), still
    gated server-side.

### 2.4 Recommendation detail view
11. In the right column, **below** the Edit/Refresh/Delete card, add an **"In your cliques"**
    card listing every clique that contains the reco **and** that the current user is a
    member of. Each entry links to the clique feed. If the list is empty, show a short empty
    state ("Add this to a clique to like and comment").
12. **Comments section is clique-scoped:**
    - With `?cliqueId=X` where the user is a member of X and the reco is in X → show **X's
      thread**; posting targets **X only**.
    - With **no clique context** (e.g., arriving from the public feed) → show **no thread**;
      display a prompt plus links to open the reco within one of the user's cliques that
      contains it. No posting.
    - If the user has **no** clique containing the reco → message indicating they must add it
      to a clique first.
13. Like display in detail mirrors the cards: **Total** always; **Within this clique** when
    in a valid clique context; **My-cliques sum** in the no-clique/public context.
    Interactive like only in a valid clique context.

### 2.5 Data model
14. `Comment` gains a **required** `cliqueId` (FK → `Clique`, `onDelete: Cascade`), with an
    index on `(recommendationId, cliqueId)`. The migration **drops all existing comments**.
15. `UpVote` is **unchanged** (remains global, one per user/reco).

### 2.6 API
16. `POST /api/recommendations/[id]/comments` requires a `cliqueId`, validates the user is a
    member of that clique and the reco is in it, and persists `cliqueId`. Returns 403/404
    otherwise.
17. Comment fetching (detail page + `GET /api/recommendations/[id]`) is **filtered by
    clique**; the global comment list is no longer returned for rendering threads.
18. `DELETE` comment stays owner-scoped; deletion still adjusts the correct clique thread
    count.
19. Feed/detail data layer computes, without N+1: per-reco clique chips, per-reco total +
    my-cliques like counts, and per-clique comment counts.

## 3. Non-Functional Requirements
- **Performance:** chips and counts computed via **batched** queries (aggregate over the
  visible reco set), not per-card round-trips.
- **Security:** server-side enforcement on every mutating endpoint; never trust
  client-supplied membership.
- **Backward compatibility:** public feed, clique feed, and logged-out views all continue to
  render gracefully; the Prisma-delegate fallback pattern already in `page.tsx` is preserved.
- **Accessibility:** new counts/chips have proper `aria-label`s and keyboard focusability,
  consistent with existing cards.
- **Testing:** >90% coverage on new/modified code (unit + integration), per project policy.

## 4. Out of Scope
- Notifications for new likes/comments.
- Real-time/live updating of counts.
- Converting likes to a clique-scoped model (explicitly rejected — likes stay global).
- Comment editing, pagination, or threading/replies.
- Changes to who can *add* a reco to a clique.

## 5. Open Questions
- None blocking. Default assumptions recorded above: logged-out public cards show total
  likes only; empty "In your cliques" card shows a short empty state rather than being
  hidden.

## 6. Decision Log
- **Gate rule:** like/comment allowed when the reco is in ≥1 clique the user is a member of
  (a fellow member adding it also unlocks it).
- **Comments:** clique-scoped, exclusive per `(reco, clique)` thread.
- **Likes:** stay global (one per user/reco); the per-clique and my-cliques figures are
  *derived* counts, not separate like rows.
- **Public card top-2 cliques:** the 2 largest shared cliques by member count, linking to
  the clique feed.
- **Detail clique list:** only cliques the current user is a member of.
- **Public card likes:** display-only.
- **No-clique detail comments:** prompt to pick a clique; no thread shown.
- **Detail comment target:** the active clique only.
- **Legacy comments:** dropped entirely on migration.
