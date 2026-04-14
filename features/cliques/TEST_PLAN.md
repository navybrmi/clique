# Cliques — Test Plan

## PR 1: Schema & Migration

**No automated tests** — Prisma migrations are validated by `prisma migrate dev` running without errors. Manual verification: run the migration against a local dev database and confirm all tables and indexes are created.

---

## PR 2: Core Clique APIs (Integration Tests)

**`GET /api/cliques`**
1. Returns 401 when unauthenticated
2. Returns empty array for a user with no cliques
3. Returns all cliques (created + joined) for the current user
4. Does not return cliques the user does not belong to

**`POST /api/cliques`**
5. Returns 401 when unauthenticated
6. Creates a clique with a valid name; creator is automatically added as a member
7. Returns 400 when name is missing or empty
8. Returns 409 when the user already belongs to 10 cliques

**`GET /api/cliques/:id`**
9. Returns 401 when unauthenticated
10. Returns 403 when the user is not a member of the clique
11. Returns 404 for a non-existent clique ID
12. Returns clique details and full member list for a valid member

**`DELETE /api/cliques/:id`**
13. Returns 401 when unauthenticated
14. Returns 403 when the user is a member but not the creator
15. Deletes the clique and all CliqueRecommendation associations; underlying Recommendation rows remain
16. Returns 404 for a non-existent clique ID

**`DELETE /api/cliques/:id/members`**
17. Returns 401 when unauthenticated
18. Returns 403 when the requester is not the creator
19. Returns 404 when the target userId is not a member
20. Successfully removes the member; that user can no longer access the clique feed

---

## PR 3: Invite & Notification APIs (Integration Tests)

**`GET /api/cliques/:id/invites`**
21. Returns 401 when unauthenticated
22. Returns 403 when requester is not the clique creator
23. Returns only active (PENDING) invites for the clique when requested by the creator
24. Does not include invites for other cliques

**`POST /api/cliques/:id/invites` (link type)**
25. Returns 401 when unauthenticated
26. Returns 403 when requester is not a clique member
27. Creates an invite with a unique token, PENDING status, and expiry 1 year from now
28. Token is 64 hex characters (crypto-random)

**`POST /api/cliques/:id/invites` (user type — email/username)**
29. Returns 400 when emailOrUsername is missing
30. Returns 404 when no matching user is found
31. Creates PENDING invite and sends in-app Notification to the invitee
32. Sends an email via Resend to the invitee (mock Resend in tests)

**`DELETE /api/cliques/:id/invites/:inviteId`**
33. Returns 401 when unauthenticated
34. Returns 403 when requester is not the creator
35. Sets invite status to REVOKED

**`GET /api/invites/:token`**
36. Returns invite metadata (clique name, expiry, status) without auth
37. Returns 404 for an unknown token
38. Returns status REVOKED for a revoked invite

**`POST /api/invites/:token` (accept)**
39. Returns 401 when unauthenticated
40. Returns 404 for unknown token
41. Returns 409 when token is REVOKED, ACCEPTED, or EXPIRED
42. Returns 409 when clique already has 50 members
43. Returns 409 when user already belongs to 10 cliques
44. Successfully adds the user as a CliqueMember and marks invite ACCEPTED (single-use)
45. Re-submitting the same token after acceptance returns 409

**`GET /api/notifications`**
46. Returns 401 when unauthenticated
47. Returns up to 50 most recent notifications for the current user
48. Does not return notifications belonging to other users

**`PATCH /api/notifications`**
49. Marks all notifications as read when no IDs are provided
50. Marks only the specified notification IDs as read
51. Returns 401 when unauthenticated

---

## PR 4: Clique Recommendations API (Integration Tests)

**`GET /api/cliques/:id/recommendations`**
52. Returns 401 when unauthenticated
53. Returns 403 when requester is not a member
54. Returns only recommendations explicitly added to the clique (not all public recommendations)
55. For a recommendation whose submitter is a Clique member: response includes `submitterName` = the submitter's name
56. For a recommendation bookmarked in from outside: response includes `addedByName` (the member who bookmarked it) and `submitterName` is null/hidden
57. A recommendation added to multiple cliques appears correctly in each clique's feed independently

**`POST /api/cliques/:id/recommendations` (bookmark)**
58. Returns 401 when unauthenticated
59. Returns 403 when requester is not a member
60. Returns 404 when recommendationId doesn't exist
61. Returns 409 when the recommendation is already in this clique
62. Successfully creates a CliqueRecommendation row with `addedById` = current user

**Recommendation creation with Clique (modifications to `POST /api/recommendations`)**
63. When `cliqueIds` is provided, creates CliqueRecommendation rows for each specified clique after the recommendation is created
64. Returns 403 when the user is not a member of one of the specified cliques
65. Entity name conflict: when an exact entity name match exists among public recommendations, returns a conflict payload `{ conflict: true, existingRecommendationId }` with status 409 instead of creating a new recommendation

---

## PR 5: Home Page Left Nav + Clique Feed (Unit Tests)

**`CliqueSidebar` component**
66. Renders "Public" link that navigates to `/` (no cliqueId)
67. Renders a link for each clique in the list
68. Highlights the active item matching the current `activeCliqueId` prop
69. Renders a "Create Clique" button that opens the CreateCliqueDialog
70. Is not rendered when the user is unauthenticated (tested via CliqueSidebarWrapper)

**`CreateCliqueDialog` component**
71. Renders a name input and submit button
72. Submit button is disabled when name is empty
73. Calls POST `/api/cliques` on submit with the correct body
74. Shows error message when the API returns a 409 (10-clique limit hit)
75. Closes and notifies parent on successful creation

---

## PR 6: Clique Management UI (Unit Tests)

**`CliqueManagementDialog`**
76. Renders the list of current members with names
77. "Remove" button is only shown to the creator (not regular members)
78. Clicking "Remove" calls DELETE `/api/cliques/:id/members` and removes the row optimistically
79. "Delete Clique" button only shown to creator
80. Clicking "Delete Clique" shows a confirmation prompt before calling DELETE `/api/cliques/:id`

**`CliqueInviteDialog`**
81. Renders two tabs: "Invite Link" and "Invite by Name / Email"
82. "Copy Link" tab: generates and displays the invite link on load; shows a "Copy" button
83. "Copy Link" tab: "Revoke" button calls DELETE invite endpoint and shows a new link can be generated
84. "By Name/Email" tab: calls POST invite with `type: "user"` and shows success confirmation
85. Shows error message when user is not found

---

## PR 7: Invite Accept Page + Notification Bell (Unit Tests)

**`/invite/[token]` page**
86. Unauthenticated user: renders a sign-in prompt with the invite context ("You've been invited to join [Clique Name]")
87. Authenticated user: shows clique name, expiry date, and "Accept" button
88. Renders error state when token is REVOKED or EXPIRED
89. Clicking "Accept" calls POST `/api/invites/:token` and redirects to `/?cliqueId=<id>`

**`NotificationBell` component**
90. Renders a bell icon with no badge when there are no unread notifications
91. Renders an unread count badge when there are unread notifications
92. Clicking the bell opens a dropdown listing notifications
93. Clicking a notification item marks it as read (calls PATCH `/api/notifications`)
94. Notification for a Clique invite renders the clique name and links to the invite page

---

## PR 8: Recommendation Creation & Bookmarking UI (Unit Tests)

**`RecommendationForm` — Clique selector**
95. Does not render the Clique selector when the user has no cliques
96. Renders checkboxes for each of the user's cliques when cliques exist
97. Selected clique IDs are included in the form submission payload

**`RecommendationForm` — Entity name conflict**
98. When the API returns a 409 conflict, shows a prompt: "A recommendation for [name] already exists. Add it to your Clique instead?"
99. Clicking "Add to Clique" calls POST `/api/cliques/:id/recommendations` with the existing recommendation ID and closes the form
100. Clicking "Create Anyway" re-submits the form ignoring the conflict (if we allow this — otherwise not applicable)

**`BookmarkToCliqueDialog`**
101. Renders a list of the user's cliques with checkboxes
102. Submit calls POST `/api/cliques/:id/recommendations` for each selected clique
103. Shows success confirmation after all requests complete
104. Shows error if the user belongs to no cliques

---

## PR 9: Detail Page Clique Context (Unit Tests)

**`/recommendations/[id]` page**
105. When `?cliqueId` is absent: does not render a Clique context banner
106. When `?cliqueId` is present and user is a member: renders "Viewing from [Clique Name]" banner
107. When `?cliqueId` is present but user is not a member (or clique doesn't exist): banner is not rendered (graceful fallback)

---

## Manual Testing Checklist

**Clique management**
- [ ] Create a Clique; verify it appears in the left nav
- [ ] Try to create an 11th Clique; verify the error message
- [ ] Open Clique management; verify member list
- [ ] As creator, remove a member; verify they no longer see the Clique in their nav
- [ ] As creator, delete a Clique; verify recommendations still appear in the public feed

**Invitations**
- [ ] Generate an invite link; open in incognito; sign in; verify you join the Clique
- [ ] Reuse the same invite link after acceptance; verify it's rejected (single-use)
- [ ] Invite by email/username; verify in-app notification appears
- [ ] Verify invite email is received (Resend sandbox or real address)
- [ ] Revoke an invite link; attempt to accept; verify it's rejected
- [ ] Try to accept an invite to a Clique that already has 50 members; verify the error

**Clique feed and recommendations**
- [ ] Add a recommendation and select a Clique during creation; verify it appears in the Clique feed but also in the public feed
- [ ] Verify submitter name shown in Clique feed when submitter is a member
- [ ] Bookmark a public recommendation to a Clique; verify it appears in the Clique feed with your name as "added by"
- [ ] Navigate to a recommendation detail from a Clique feed; verify the Clique name banner appears
- [ ] Navigate to a recommendation detail directly (no cliqueId); verify no banner appears
- [ ] Trigger entity name conflict: try to add a recommendation for an entity that already exists while a Clique is selected; verify the conflict prompt
- [ ] Add the same recommendation to two different Cliques; verify it appears in both feeds

**Visibility and auth**
- [ ] Sign out; verify left nav is not shown, public feed works normally
- [ ] Sign in as a non-member; try to access `/api/cliques/:id/recommendations` directly; verify 403

---

## Coverage Targets

> **Note:** The `src/lib/clique-service.ts` and `src/lib/invite-service.ts` targets below require a Jest coverage config update to be enforceable in CI. The current `collectCoverageFrom` in both Jest configs only collects from `src/app/api/**`; the integration config must be expanded to include `src/lib/**` before these file-level thresholds can be measured. This config change is part of PR 4.

| Layer | Statements | Branches | Functions | Lines |
|-------|-----------|----------|-----------|-------|
| API routes (integration) | ≥ 80% | ≥ 70% | 100% | ≥ 80% |
| UI components (unit) | ≥ 90% | ≥ 90% | 100% | ≥ 90% |
| `src/lib/clique-service.ts` *(after Jest coverage config update)* | ≥ 90% | ≥ 80% | 100% | ≥ 90% |
| `src/lib/invite-service.ts` *(after Jest coverage config update)* | ≥ 90% | ≥ 80% | 100% | ≥ 90% |
