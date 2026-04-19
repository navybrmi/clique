# Changelog

All notable changes to Clique will be documented in this file.
Each version links to its GitHub Release.

## [v0.10.1](https://github.com/navybrmi/clique/releases/tag/v0.10.1) — 2026-04-19

### Fixed
- Fix YAML syntax error in release workflow caused by unindented f-string content inside block scalar
- Replace direct push to main with PR-based CHANGELOG update to satisfy branch protection rules

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.10.0...v0.10.1

---

## [v0.10.0](https://github.com/navybrmi/clique/releases/tag/v0.10.0) — 2026-04-19

### Added
- Invite accept page (`/invite/[token]`) with status display and one-click join flow ([#60](https://github.com/navybrmi/clique/pull/60))
- Notification bell in the header showing unread clique invites with mark-read support ([#60](https://github.com/navybrmi/clique/pull/60))
- Clique-scoped upvoting — upvotes are recorded per clique context; removed upvoting from public feed ([#59](https://github.com/navybrmi/clique/pull/59))
- Funny AI-generated release notes via Copilot API appended to each GitHub Release ([#58](https://github.com/navybrmi/clique/pull/58))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.9.1...v0.10.0

---

## [v0.9.1](https://github.com/navybrmi/clique/releases/tag/v0.9.1) — 2026-04-18

### Changed
- Added Codecov token to CI workflow and local env for coverage reporting ([#55](https://github.com/navybrmi/clique/pull/55))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.9.0...v0.9.1

---

## [v0.9.0](https://github.com/navybrmi/clique/releases/tag/v0.9.0) — 2026-04-18

### Added
- Clique management dialog: rename clique, view and revoke pending invites ([#57](https://github.com/navybrmi/clique/pull/57))
- Invite dialog: generate a shareable invite link for a clique ([#57](https://github.com/navybrmi/clique/pull/57))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.8.0...v0.9.0

---

## [v0.8.0](https://github.com/navybrmi/clique/releases/tag/v0.8.0) — 2026-04-17

### Added
- Add-to-clique icon button overlay on recommendation card images ([#56](https://github.com/navybrmi/clique/pull/56))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.7.1...v0.8.0

---

## [v0.7.1](https://github.com/navybrmi/clique/releases/tag/v0.7.1) — 2026-04-17

### Added
- Clique-aware home feed: switch between public feed and clique-scoped feeds via sidebar ([#54](https://github.com/navybrmi/clique/pull/54))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.7.0...v0.7.1

---

## [v0.7.0](https://github.com/navybrmi/clique/releases/tag/v0.7.0) — 2026-04-15

### Added
- Clique recommendations feed: bookmark recommendations to cliques and fetch a clique-scoped feed ([#53](https://github.com/navybrmi/clique/pull/53))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.6.0...v0.7.0

---

## [v0.6.0](https://github.com/navybrmi/clique/releases/tag/v0.6.0) — 2026-04-15

### Added
- Invite, accept, and notification APIs: create invite tokens, accept invites, and notify invited users ([#52](https://github.com/navybrmi/clique/pull/52))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.5.0...v0.6.0

---

## [v0.5.0](https://github.com/navybrmi/clique/releases/tag/v0.5.0) — 2026-04-15

### Added
- Core clique CRUD and member management APIs: create, read, update, delete cliques and manage membership ([#51](https://github.com/navybrmi/clique/pull/51))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.4.0...v0.5.0

---

## [v0.4.0](https://github.com/navybrmi/clique/releases/tag/v0.4.0) — 2026-04-14

### Added
- Clique schema and Prisma migration: `Clique`, `CliqueMember`, `CliqueInvite`, and `Notification` models ([#50](https://github.com/navybrmi/clique/pull/50))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.3.1...v0.4.0

---

## [v0.3.1](https://github.com/navybrmi/clique/releases/tag/v0.3.1) — 2026-04-14

### Added
- Cliques design documentation: requirements, implementation plan, and test plan ([#49](https://github.com/navybrmi/clique/pull/49))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.3.0...v0.3.1

---

## [v0.3.0](https://github.com/navybrmi/clique/releases/tag/v0.3.0) — 2026-04-12

### Removed
- Facebook sign-in button and data-deletion page — Google OAuth only going forward ([#48](https://github.com/navybrmi/clique/pull/48))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.2.1...v0.3.0

---

## [v0.2.1](https://github.com/navybrmi/clique/releases/tag/v0.2.1) — 2026-04-11

### Fixed
- Submission dates now display in the user's local browser timezone instead of UTC ([#47](https://github.com/navybrmi/clique/pull/47))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.2.0...v0.2.1

---

## [v0.2.0](https://github.com/navybrmi/clique/releases/tag/v0.2.0) — 2026-04-11

### Added
- Submitter name and submission date shown on recommendation detail page ([#46](https://github.com/navybrmi/clique/pull/46))
- Submitter name hidden from unauthenticated users for privacy

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.1.1...v0.2.0

---

## [v0.1.1](https://github.com/navybrmi/clique/releases/tag/v0.1.1) — 2026-04-07

### Changed
- Centralized session resolution to eliminate redundant database hits on page load ([#44](https://github.com/navybrmi/clique/pull/44))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.1.0...v0.1.1

---

## [v0.1.0](https://github.com/navybrmi/clique/releases/tag/v0.1.0) — 2026-03-28

### Added
- In-place entity refresh with per-field highlight animations ([#37](https://github.com/navybrmi/clique/pull/37))
- Refresh external data API for movies and restaurants ([#35](https://github.com/navybrmi/clique/pull/35), [#36](https://github.com/navybrmi/clique/pull/36))
- Reordered recommendation detail page: category, rating, and tags shown below entity name ([#39](https://github.com/navybrmi/clique/pull/39))
- Performance testing infrastructure with WireMock and k6 ([#32](https://github.com/navybrmi/clique/pull/32))
- Sub-agent configuration files for Claude Code ([#30](https://github.com/navybrmi/clique/pull/30))

### Fixed
- AbortController added to prevent race conditions in detail fetches ([#31](https://github.com/navybrmi/clique/pull/31))
- Layout spacing in add recommendation dialog ([#34](https://github.com/navybrmi/clique/pull/34))
- Upgraded Next.js to 16.1.6 ([#33](https://github.com/navybrmi/clique/pull/33))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.0.2...v0.1.0

---

## [v0.0.2](https://github.com/navybrmi/clique/releases/tag/v0.0.2) — 2026-03-27

### Changed
- Updated README to reflect current feature set and project structure ([#42](https://github.com/navybrmi/clique/pull/42))

**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.0.1...v0.0.2

---

## [v0.0.1](https://github.com/navybrmi/clique/releases/tag/v0.0.1) — 2026-03-27

Initial release of Clique — a social recommendation platform for sharing movies, restaurants, fashion, and more with friends.

### Added
- Google OAuth authentication with NextAuth.js v5
- Recommendation creation with categories: movies, restaurants, fashion, household, other
- Movie search via TMDB API; restaurant search via Google Places API
- Movie and restaurant tag suggestions with community promotion system
- Comment creation, display, and deletion on recommendations
- Edit and delete recommendation actions (owner only)
- Full-image card display with blurred background fill
- Docker Compose dev environment with one-command setup
- GitHub Actions CI: test, coverage, and CodeQL workflows
- Automated GitHub Releases

**Full Changelog**: https://github.com/navybrmi/clique/commits/v0.0.1
