# Clique - AI Agent Instructions

## Architecture Overview

**Stack**: Next.js 16 App Router + Turbopack, React 19, TypeScript, Prisma 6.9, PostgreSQL, NextAuth v5, shadcn/ui

**Data Model Pattern**: Entity-Recommendation separation with category-specific extensions
- `Entity` (name, category) → polymorphic relations → `Restaurant|Movie|Fashion|Household|Other`
- `Recommendation` (rating, tags, link, imageUrl) references `Entity`
- User creates recommendations that point to shared entities (deduplication)
- See `prisma/schema.prisma` for complete model relationships

**Key Architectural Decisions**:
- Entities are reusable across recommendations (multiple users can recommend same restaurant)
- Category-specific data lives in separate tables (Restaurant, Movie, etc.) linked via `entityId`
- `Recommendation.tags` is string array for "why recommended" reasons
- NextAuth uses Prisma adapter with Facebook/Google OAuth

## Critical Developer Workflows

### Testing Strategy
```bash
npm run test              # Component tests (jest-environment-jsdom)
npm run test:integration  # API route tests (node environment)
npm run test:all          # Runs both sequentially
npm run build             # RUNS test:all FIRST - build fails if tests fail
```

**Dual Jest Configs**:
- `jest.config.js`: Component tests, jsdom, `src/components/__tests__/`
- `jest.integration.config.js`: API tests, node, excludes component tests
- `jest.setup.js`: Polyfills Web APIs (Request, Response) from undici for API tests

**Test Patterns**:
- Mock NextAuth: `jest.mock('next-auth/react')` in setup
- API tests use `NextRequest`/`NextResponse` from `next/server`
- Mock Prisma client per test file, not globally
- See `src/app/api/recommendations/__tests__/route.test.ts` for complete examples

### Development Server
```bash
npm run dev  # Uses scripts/dev.js - auto-opens browser, press 'q' to quit
```
Custom dev script auto-launches browser after 2s and watches for 'q' keypress to gracefully shutdown.

### Database Operations
```bash
npx prisma generate       # After schema changes (auto-runs on postinstall)
npx prisma migrate dev    # Create and apply migration
npx prisma db push        # Direct schema push (no migration file)
npm run db:seed           # Seed database with test data
```

## Project-Specific Conventions

### API Route Structure
Pattern: `/api/{resource}/route.ts` for collection, `/api/{resource}/[id]/route.ts` for single item

**External API Integrations**:
- TMDB (movies): `/api/movies/search` + `/api/movies/[id]` - caches results 1hr, genres 24hr
- Google Places (restaurants): `/api/restaurants/search` + `/api/restaurants/[id]`
- Both return normalized data matching UI expectations

**CRUD Pattern** (see `src/app/api/recommendations/route.ts`):
- GET: Fetch with Prisma includes for relations
- POST: Create entity first, then recommendation (handles duplicates via entity name)
- PUT: Validate ownership via `userId`, update both entity and category-specific data
- DELETE: Cascade handled by Prisma schema `onDelete: Cascade`

### Component Patterns

**Dialog Forms**: `<AddRecommendationDialog>` is canonical example
- React Hook Form + Zod validation
- Debounced typeahead search (300ms) for movies/restaurants
- Auto-populate fields from API suggestions
- Tag management with duplicates prevention
- `onSuccess` callback pattern for parent refresh

**Styling**: All components use `cn()` utility from `lib/utils.ts`
```tsx
import { cn } from "@/lib/utils"
<div className={cn("base-classes", condition && "conditional-classes", className)} />
```

**shadcn/ui**: Components in `src/components/ui/` - modify freely, not managed by CLI

### Authentication Flow
- Configured in `src/lib/auth.ts` - exports `auth`, `signIn`, `signOut`, `handlers`
- `/api/auth/[...nextauth]/route.ts` uses exported `handlers`
- Custom sign-in page: `/auth/signin` (configured in NextAuth pages)
- Session includes `userId` via callback (see auth.ts line 55)

### State Management
- Client components fetch data via `fetch('/api/...')` on mount
- No global state library - local useState + useEffect pattern
- Pass `onSuccess` callbacks to trigger parent re-fetch after mutations

## Critical Files

- `prisma/schema.prisma`: Single source of truth for data model
- `src/lib/auth.ts`: NextAuth config, dynamic provider setup
- `src/lib/prisma.ts`: Singleton Prisma client with hot-reload prevention
- `jest.setup.js`: Web API polyfills required for API route tests
- `src/components/add-recommendation-dialog.tsx`: 746 lines - complex form with typeahead, demonstrates all patterns

## Environment Variables Required

```env
DATABASE_URL              # PostgreSQL connection
NEXTAUTH_URL              # http://localhost:3000 in dev
AUTH_SECRET               # Random string for session encryption
FACEBOOK_ID/SECRET        # Optional OAuth
GOOGLE_ID/SECRET          # Optional OAuth
TMDB_API_KEY              # Movie search (themoviedb.org)
GOOGLE_PLACES_API_KEY     # Restaurant search
```

## Common Pitfalls

1. **Prisma Regeneration**: Always run `npx prisma generate` after schema changes
2. **Test Environment**: API route tests MUST use node environment, not jsdom
3. **Entity Creation**: Check if entity exists by name before creating (avoid duplicates)
4. **NextRequest in Tests**: Requires undici polyfills in jest.setup.js
5. **Build Process**: Tests run before build - fix test failures or build will fail in CI/CD
6. **Category-Specific Data**: When updating recommendations, update both Entity and category table

## Code Quality Standards

- All functions/components have JSDoc documentation (see existing code)
- Use `@param`, `@returns`, `@throws`, `@example` tags
- API routes document request/response formats in comments
- Component props interfaces documented with field descriptions
- Coverage thresholds: Components 40%, API routes 80%
