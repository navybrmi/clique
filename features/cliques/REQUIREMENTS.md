# Cliques

## Overview and Motivation

Clique's core value proposition is trusted recommendations from people you know. Right now recommendations are publicly available and submitter attribution is visible to authenticated users, but there is no way to group recommendations by social circle. This feature introduces **Cliques** — named friend groups that let members share, discover, and curate recommendations together. Users can form their Clique, invite friends, and see a private feed of only the recommendations their Clique has added. Public recommendations remain available to everyone; submitter visibility on the public feed is left as-is for now (see requirement #19), but richer social context — who submitted, who added — is surfaced within a Clique.

## Functional Requirements

### Clique Management

1. Any authenticated user can create a Clique with a name. A user can belong to at most 10 Cliques (created + joined combined).
2. Each Clique has a maximum of 50 members.
3. Only the Clique creator can remove members or delete the Clique.
4. Deleting a Clique removes all Clique associations but leaves the underlying recommendations public.

### Invitations

5. Any Clique member can invite others via an invite link or by searching for a user by email or username in-app.
6. Invite links are single-use and expire after 1 year. The Clique creator can revoke an invite link.
7. When invited by email/username, the invitee receives both an in-app notification and an email.
8. An invitation must be explicitly accepted before the invitee joins the Clique.

### Recommendations & Clique Feed

9. All recommendations are public by default. During the creation flow, the user may optionally select one or more Cliques to add the recommendation to.
10. Before creating a recommendation that is being added to a Clique, the system checks for an exact entity name match among existing public recommendations. If a match is found, the user is prompted to add the existing recommendation to the Clique instead of creating a new one.
11. Any Clique member can bookmark an existing public recommendation to one or more of their Cliques at any time (outside of the creation flow).
12. The Clique feed shows only recommendations explicitly added to that Clique (created-and-added, or bookmarked). It does not show all public recommendations.
13. Within the Clique feed:
    - If a recommendation was submitted by a member of the Clique, their name is shown as the submitter.
    - If a recommendation was submitted by someone outside the Clique (bookmarked in), the submitter name is hidden; instead, the name of the Clique member who added/bookmarked it is shown.
14. A recommendation can be added to multiple Cliques simultaneously.

### Navigation & Views

15. The home page has a left navigation pane listing "Public" and each Clique the user belongs to. Only one view is active at a time.
16. The left nav is shown only on the home/feed page. Unauthenticated users see only the public feed with no left nav.
17. On the recommendation detail page, when the user navigated from a Clique context, the active Clique name is displayed so users know which Clique they are viewing from.

### Submitter Name Visibility

18. Within a Clique feed/detail view, submitter names are shown per rule 13 above.
19. *(TODO — deferred)* On the public feed and detail page, submitter names should eventually be hidden from all users. The current behaviour (names shown to logged-in users) is left as-is until a dedicated follow-up.

## Non-Functional Requirements

- All Clique data (membership, feed) must be scoped to authenticated users. Unauthenticated users can only access the public feed.
- Invite link tokens must be cryptographically random and unguessable.
- The 10-Clique and 50-member limits must be enforced at the API layer, not just the UI.
- Email notifications use the existing email infrastructure (or a new transactional email provider if none exists).

## Out of Scope

- Transferring Clique ownership.
- Clique-specific features distinct from public recommendations (e.g. private comments, Clique-only upvotes) — these will be designed separately.
- Reverting submitter name visibility on the public feed (captured as a TODO above).
- Any moderation or reporting tools for Cliques.

## Open Questions

None.
