# Changelog

All notable changes to Clique will be documented in this file.
Each version links to its GitHub Release.

## [v0.10.1](https://github.com/navybrmi/clique/releases/tag/v0.10.1) — 2026-04-19

<!-- Release notes generated using configuration in .github/release.yml at v0.10.1 -->



**Full Changelog**: https://github.com/navybrmi/clique/compare/v0.10.0...v0.10.1

---

## [v0.2.0](https://github.com/navybrmi/clique/releases/tag/v0.2.0) — 2026-03-24 · PR #38

Comprehensive JSDoc documentation was added across the codebase to improve developer experience, enable richer IDE auto-complete, and make it easier for new contributors to navigate the project.

### Documentation
- Add JSDoc comments to all previously undocumented public functions and types in `lib/`, `components/`, and `app/api/`
- Document parameter types, return values, and thrown errors for auth helpers, Prisma singleton, and tag service utilities

---

## [v0.1.0](https://github.com/navybrmi/clique/releases/tag/v0.1.0) — 2026-03-20 · PR #37

Entities (movies, restaurants, etc.) now refresh their external data in place without requiring a full page reload, giving users a smoother experience when data becomes stale.

### Added
- In-place refresh for entity cards — data updates without unmounting the component
- Optimistic UI state applied immediately while the refresh request is in flight

### Changed
- Entity update flow now patches only changed fields rather than replacing the full record

### Fixed
- Stale data after an external API update no longer requires a manual page refresh to clear

---

