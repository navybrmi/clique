# Implementation Plan: Clique-Scoped Engagement & Home Feed Redesign

## A. Architecture decisions & trade-offs

1. **Likes stay global; per-clique figures are derived at read time.** No `UpVote`
   schema change. The "within-clique" and "my-cliques" numbers are computed with
   set-based SQL aggregates over the visible reco set. *Trade-off:* slightly heavier
   read queries vs. a much simpler, migration-free write path and unchanged like
   semantics.

2. **Comments become clique-scoped via a required `Comment.cliqueId`.** Threads are keyed
   on `(recommendationId, cliqueId)`. *Trade-off:* a required FK forces dropping legacy
   comments (decision recorded in REQUIREMENTS) but keeps every read/write unambiguous —
   no nullable special-casing.

3. **A single engagement data-layer module (`src/lib/engagement.ts`)** computes chips +
   like counts + per-clique comment counts in **batched** queries keyed by a list of reco
   IDs, so feeds never do per-card round-trips (avoids N+1). Uses `prisma.$queryRaw` for
   the relational aggregates (co-member counts, member-count ranking) since they're
   awkward in the Prisma query API, and follows the existing **delegate-availability
   guard** pattern from `page.tsx` so a stale client degrades gracefully.

4. **Clique context is carried by the existing `?cliqueId=` query param** (same convention
   as upvotes), both for the comments API and the detail page — no new routing concepts.

## B. Database schema changes (`prisma/schema.prisma`)

```prisma
model Comment {
  id        String   @id @default(cuid())
  content   String
  cliqueId  String                       // NEW — required
  clique    Clique   @relation(fields: [cliqueId], references: [id], onDelete: Cascade) // NEW
  // ...existing userId / recommendationId ...
  @@index([recommendationId, cliqueId])  // NEW
  @@index([cliqueId])                    // NEW
}

model Clique {
  // ...existing...
  comments  Comment[]                    // NEW back-relation
}
```

**Migration** (`--create-only`, then hand-edit the SQL):
```sql
DELETE FROM "Comment";                                  -- drop legacy comments first
ALTER TABLE "Comment" ADD COLUMN "cliqueId" TEXT NOT NULL;
ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_cliqueId_fkey"
  FOREIGN KEY ("cliqueId") REFERENCES "Clique"("id") ON DELETE CASCADE;
CREATE INDEX "Comment_recommendationId_cliqueId_idx" ON "Comment"("recommendationId","cliqueId");
CREATE INDEX "Comment_cliqueId_idx" ON "Comment"("cliqueId");
```
Then `npx prisma generate`.

## C. New files

| File | Purpose |
|------|---------|
| `src/lib/engagement.ts` | Batched read helpers (details below). |
| `src/lib/__tests__/engagement.test.ts` | Unit tests for the helpers. |
| `src/components/clique-chips.tsx` | Renders up to N clique chips linking to `/?cliqueId=`. Used by feed card. |
| `src/components/like-counts.tsx` | Display-only "total + secondary" like figures with `aria-label`s. |
| `src/components/in-your-cliques-card.tsx` | Detail-sidebar card listing the user's cliques containing the reco (or empty state). |
| `src/components/comment-clique-prompt.tsx` | "Open in a clique to comment" prompt with links (no-clique detail context). |
| `features/clique-scoped-engagement/TEST_PLAN.md` | Phase 4 output. |

### `src/lib/engagement.ts` — exported functions
- `getUserCliquesForRecommendations(recIds, userId)` -> `Map<recId, {id, name, memberCount}[]>`
  (sorted by `memberCount` desc). Feeds slice to 2; detail card uses all.
- `getLikeTotals(recIds)` -> `Map<recId, number>` (global upvote counts).
- `getMyCliquesLikeCounts(recIds, userId)` -> `Map<recId, number>` (distinct likers sharing a
  reco-containing clique with the user).
- `getWithinCliqueLikeCounts(recIds, cliqueId)` -> `Map<recId, number>` (likers who are members
  of the active clique).
- `getCliqueCommentCounts(recIds, cliqueId)` -> `Map<recId, number>` (per-clique thread sizes;
  via `comment.groupBy`).

#### Reference SQL (raw-path aggregates)

My-cliques like count:
```sql
SELECT uv."recommendationId", COUNT(DISTINCT uv."userId") AS cnt
FROM "UpVote" uv
WHERE uv."recommendationId" = ANY($1)
  AND EXISTS (
    SELECT 1 FROM "CliqueRecommendation" cr
    JOIN "CliqueMember" cm_liker ON cm_liker."cliqueId" = cr."cliqueId" AND cm_liker."userId" = uv."userId"
    JOIN "CliqueMember" cm_me    ON cm_me."cliqueId"    = cr."cliqueId" AND cm_me."userId"    = $2
    WHERE cr."recommendationId" = uv."recommendationId"
  )
GROUP BY uv."recommendationId";
```

User cliques containing reco, ranked by member count:
```sql
SELECT cr."recommendationId", c.id, c.name, COUNT(cm_all."userId") AS member_count
FROM "CliqueRecommendation" cr
JOIN "Clique" c            ON c.id = cr."cliqueId"
JOIN "CliqueMember" cm_me  ON cm_me."cliqueId" = c.id AND cm_me."userId" = $2
LEFT JOIN "CliqueMember" cm_all ON cm_all."cliqueId" = c.id
WHERE cr."recommendationId" = ANY($1)
GROUP BY cr."recommendationId", c.id, c.name
ORDER BY member_count DESC;
```

Within-clique like count:
```sql
SELECT uv."recommendationId", COUNT(*) AS cnt
FROM "UpVote" uv
JOIN "CliqueMember" cm ON cm."userId" = uv."userId" AND cm."cliqueId" = $2
WHERE uv."recommendationId" = ANY($1)
GROUP BY uv."recommendationId";
```

## D. Existing files to modify

**Types**
- `src/types/feed.ts` — extend `HomeFeedItem` with
  `engagement: { likeTotal: number; likeSecondary: number | null }`, optional
  `cliqueChips?: {id,name}[]`, and make the clique-view `commentCount` reflect the clique
  thread. Deprecate display reliance on `_count.upvotes`.
- `src/types/clique.ts` — `CliqueFeedItem` gains the same engagement fields (or they're
  attached during normalization).

**Home page / feed**
- `src/app/page.tsx` — after building each feed, gather `recIds` and enrich:
  - Public/my view (logged in): chips (top 2) + `likeTotal` + `myCliques`. Logged out:
    `likeTotal` only, no chips.
  - Clique view: `likeTotal` + `withinClique` + per-clique `commentCount`.
  - Wire results through the two `normalize*` helpers.
- `src/components/recommendation-feed.tsx` — render `<CliqueChips>` (public/my, logged-in)
  and `<LikeCounts>` on every card; replace the current clique-only comment/upvote block so
  public cards show the two like figures (display-only) and clique cards show total +
  within-clique + clique comment count.

**Recommendation detail**
- `src/app/recommendations/[id]/page.tsx` — compute: the user's cliques containing the reco
  (for the new card + comment gating), the active-clique comment thread (only when valid
  clique context), and like figures (total + within-clique or my-cliques sum). Render
  `<InYourCliquesCard>` under the Edit/Delete card. Pass clique context + `canComment` to
  `CommentsSection`.
- `src/components/actions-sidebar.tsx` — `updateCommentCount` fetch includes `?cliqueId=`;
  show like total + contextual secondary; interactive upvote unchanged (clique context only).
- `src/components/comments-section.tsx` — accept `cliqueId` + `canComment`. When no valid
  clique context, render `<CommentCliquePrompt>` instead of the thread/form; otherwise behave
  as today but scoped. Fetches include `?cliqueId=`.
- `src/components/add-comment-form.tsx` — POST includes `cliqueId`; hidden when `canComment`
  is false.

**API**
- `src/app/api/recommendations/[id]/comments/route.ts` (POST) — require `?cliqueId=`;
  validate `cliqueMember` membership **and** `cliqueRecommendation` link (mirrors the upvotes
  route); persist `cliqueId`; 400 if missing, 403 if not a member, 404 if reco not in clique.
- `src/app/api/recommendations/[id]/route.ts` (GET) — accept `?cliqueId=`; when present &
  valid, return only that clique's `comments` and `commentCount =` that clique's size; when
  absent, return `comments: []`. Keep `_count` for totals/back-compat.
- `src/app/api/recommendations/[id]/comments/[commentId]/route.ts` (DELETE) — unchanged
  ownership rule; response continues to drive the per-clique count refresh.

## E. API contract changes

| Endpoint | Change |
|----------|--------|
| `POST /api/recommendations/[id]/comments?cliqueId=<id>` | New required `cliqueId`. `400` missing, `403` non-member, `404` reco-not-in-clique. Body unchanged (`{ content }`). |
| `GET /api/recommendations/[id]?cliqueId=<id>` | Returns clique-scoped `comments[]`; without `cliqueId`, `comments: []`. |
| `DELETE …/comments/[commentId]` | Behavior unchanged. |

## F. External dependencies
None. No new npm packages; all work uses existing Prisma, Next.js, shadcn/ui primitives, and
lucide-react icons.

## G. Risks & mitigations
- **Raw SQL + delegate fallback:** guard each helper like `page.tsx` does, and cover both
  delegate and raw paths in tests.
- **Count drift in UI:** centralize count refresh through the `commentUpdated` event already
  in place, now clique-aware.
- **Migration data loss is intentional** (legacy comments dropped) — called out explicitly in
  the migration and PR description.

## H. PR Breakdown
_To be added in Phase 5 (PR breakdown), after the test plan is approved._
