# Test Plan: Clique-Scoped Engagement & Home Feed Redesign

## 1. Unit tests (jsdom — `npm test`)

### 1.1 `src/lib/__tests__/engagement.test.ts` (data-layer helpers)
Helpers that implement a `$queryRaw` fallback are tested on **both** the Prisma-delegate path
and the raw fallback path (mock the client). Helpers that use a single Prisma path only —
e.g. `getCliqueCommentCounts` via `comment.groupBy` — are tested on that one path; do not
assert a non-existent fallback for them.
- `getLikeTotals` — returns correct global counts; recos with zero likes map to 0; empty
  `recIds` -> empty map (no query fired).
- `getMyCliquesLikeCounts` — counts **distinct** likers sharing a reco-containing clique; a
  liker in two shared cliques counts **once**; likers with no shared clique excluded; reco
  in a clique I'm not in contributes 0.
- `getWithinCliqueLikeCounts` — only likers who are members of the active clique counted;
  non-members excluded.
- `getUserCliquesForRecommendations` — returns only cliques the user belongs to that contain
  the reco; sorted by `memberCount` desc; ties stable; excludes cliques the user isn't in.
- `getCliqueCommentCounts` — per-clique thread sizes; other cliques' comments excluded;
  zero -> 0.
- Edge: empty `recIds`, unknown `userId`, malformed/stale delegate (falls back to raw).

### 1.2 Components
- **`clique-chips.tsx`** — renders up to 2 chips; each links to `/?cliqueId=<id>`; renders
  nothing when list empty; 3+ cliques -> only top 2 shown; `aria-label`s present.
- **`like-counts.tsx`** — shows total always; shows secondary when non-null; hides/omits
  secondary when null (logged out); correct `aria-label` text; "0" rendered, not blank.
- **`in-your-cliques-card.tsx`** — lists all provided cliques with links; renders empty-state
  copy ("Add this to a clique to like and comment") when list empty.
- **`comment-clique-prompt.tsx`** — renders one link per user-clique containing the reco;
  renders "must add to a clique" message when no cliques.
- **`recommendation-feed.tsx`** —
  - Public/logged-in card: chips + two like figures rendered; **no** interactive upvote
    button; **no** comment count.
  - Logged-out card: total likes only; no chips; no secondary.
  - Clique-view card: total + within-clique like figures + clique comment count; interactive
    upvote present.
  - Category filter still works with new card markup.
- **`comments-section.tsx`** —
  - Valid clique context (`canComment=true`): thread + form render; posting hits `?cliqueId=`.
  - No clique context: `<CommentCliquePrompt>` shown instead of thread/form.
  - Delete own comment updates the clique-scoped count and emits `commentUpdated`.
- **`add-comment-form.tsx`** — includes `cliqueId` in POST; hidden when `canComment=false`;
  existing validation (empty, >500 chars) preserved.
- **`actions-sidebar.tsx`** — `updateCommentCount` fetch includes `?cliqueId=`; like total +
  contextual secondary displayed; upvote button only in clique context (unchanged).

## 2. Integration tests (node — `npm run test:integration`)

### 2.1 `POST /api/recommendations/[id]/comments`
- `401` when unauthenticated.
- `400` when `cliqueId` missing.
- `403` when authenticated but **not a member** of the clique.
- `404` when reco is **not in** the given clique.
- `201` happy path -> comment persisted **with `cliqueId`**; response shape unchanged otherwise.
- Validation still enforced: empty/whitespace `content` -> 400; >500 chars -> 400.
- Two members of **different** cliques posting on the same reco -> comments isolated per clique.

### 2.2 `GET /api/recommendations/[id]`
- With valid `?cliqueId=` -> returns only that clique's comments; `commentCount` = that
  thread's size.
- Without `cliqueId` -> `comments: []`.
- With a `cliqueId` the user isn't in -> treated as no-context (`comments: []`), no leak of
  another clique's thread.
- Unknown reco id -> 404.

### 2.3 `DELETE …/comments/[commentId]`
- Owner can delete; non-owner -> 403; unauthenticated -> 401.
- After delete, the clique's `commentCount` decremented; other cliques' threads untouched.

### 2.4 Upvotes (regression)
- Existing clique-gated upvote POST/DELETE behavior unchanged (still 403 for non-members,
  global single like preserved).

## 3. Migration test
- Apply migration on a DB seeded with legacy comments -> `Comment` table emptied, `cliqueId`
  column NOT NULL, FK + indexes present.
- Inserting a comment without `cliqueId` fails at the DB level.
- Deleting a clique cascades to its comments.

## 4. Manual testing checklist
1. **Public feed (logged in):** each card shows up to 2 clique chips (largest shared cliques)
   and two like numbers (total + my-cliques); chips navigate to the clique feed; no like
   button on public cards.
2. **Public feed (logged out):** cards show total likes only; no chips, no secondary number.
3. **Clique feed:** cards show total + within-clique likes and the clique's comment count;
   upvote button works and persists.
4. **My-cliques like count correctness:** like a reco from clique A (reco also in clique B you
   are in) -> public card my-cliques count reflects distinct shared-clique likers (no double
   count).
5. **Detail via clique (`?cliqueId=`):** comments thread is the clique's own; posting works;
   the same reco opened from a different clique shows a **different** thread.
6. **Detail via public (no clique):** comments section shows the "open in a clique" prompt
   with links; no posting possible.
7. **Detail with no qualifying clique:** prompt explains the reco must be added to a clique
   first.
8. **"In your cliques" card:** appears under Edit/Delete; lists only your cliques containing
   the reco; links work; empty state shows when none.
9. **Gating enforcement:** attempt `POST /comments` via curl without membership -> 403;
   without `cliqueId` -> 400.
10. **Counts stay in sync:** add/delete a comment -> header count and sidebar count update for
    the active clique only.

## 5. Edge cases to validate
- Reco in **zero** cliques: no chips, my-cliques = 0, detail shows empty "In your cliques" +
  comment prompt with "add to a clique" message.
- Reco in cliques the user **isn't** in only: public card shows total likes, **no** chips,
  my-cliques = 0.
- User in **many** overlapping cliques: distinct-liker math holds (no double counting); chips
  capped at 2.
- Deleting a clique with active comments cascades cleanly; feeds for other cliques unaffected.
- Stale Prisma client (delegate missing): helpers fall back to raw SQL; page still renders.

## 6. Coverage targets
- New/modified code **>90%** (project policy), via the two Jest configs.
- **Jest coverage config must be adjusted in the implementation PR:** today the unit config
  excludes `src/lib/**` (`'!src/lib/**'` in `jest.config.js`) and the integration config only
  collects `src/lib/clique-service.ts`. To measure the new `src/lib/engagement.ts`, add it to
  `collectCoverageFrom` in the appropriate config (integration, mirroring `clique-service.ts`)
  and/or carve an exception to the `!src/lib/**` exclusion — otherwise the helper will not
  appear in either coverage report.
- Integration thresholds respected: 70% branches / 100% functions / 80% lines & statements.
- Unit thresholds respected: 10% branches / 20% functions / 29% lines & statements (new
  component/helper tests should comfortably exceed locally).
