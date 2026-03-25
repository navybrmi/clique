# Changelog

All notable changes to Clique will be documented in this file.

## [2026-03-24] · PR #38 — Add JSDoc comments to undocumented functions and types

Comprehensive JSDoc documentation was added across the codebase to improve developer experience, enable richer IDE auto-complete, and make the codebase more accessible to new contributors.

### Documentation
- Add JSDoc comments to all previously undocumented public functions and types in `lib/`, `components/`, and `app/api/` directories
- Document parameter types, return values, and thrown errors for auth configuration helpers, Prisma singleton, and tag service utilities

---

## [2026-03-20] · PR #37 — Refresh entity in-place updates

Entities (movies, restaurants, etc.) now refresh their external data in place without requiring a full page reload, resulting in a smoother user experience when data becomes stale.

### Added
- In-place refresh mechanism for entity cards — data updates without unmounting the component
- Optimistic UI state applied immediately while the refresh request is in flight

### Changed
- Entity update flow now patches only the changed fields rather than replacing the full record

### Fixed
- Stale data displayed after an external API update no longer requires a manual page refresh to clear

---

