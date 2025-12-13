# Clique 🎯

A social web application for sharing recommendations among friends. Discover and share your favorite restaurants, movies, fashion items, household products, and more.

## Tech Stack

- **Framework**: Next.js 16.0.6 with App Router and Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database ORM**: Prisma 6.9.0
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js v5 (configured, not yet implemented)
- **Form Management**: React Hook Form + Zod
- **Icons**: Lucide React
- **Runtime**: Node.js v25.2.1

## Features

### ✅ Implemented
- 🔐 User authentication with GitHub and Google OAuth
- 📝 Create and share recommendations via dialog form
- 🔍 Browse recommendations on homepage with interactive cards
- 📄 View detailed recommendation pages with comments and likes
- 🏷️ Category-based organization (Restaurant, Movie, Fashion, Household, Other)
- 📊 Category-specific fields (cuisine, director, brand, etc.)
- 🎬 Movie typeahead search with TMDB integration (auto-fill movie details)
- ⭐ Rating system (0-10 scale)
- 🔗 Link and image URL support for recommendations
- 📡 RESTful API routes for CRUD operations
- 🔄 Auto-refresh after creating new recommendations
- 👤 User menu with profile dropdown

### 🚧 Coming Soon
- 💬 Add comments to recommendations
- ❤️ Like/unlike functionality
- 🖼️ Image upload capability
- 🔎 Search and filtering
- 👥 User profiles and friend connections

## Getting Started

### Prerequisites

- Node.js 18.x or higher (tested with v25.2.1)
- PostgreSQL database
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/navybrmi/clique.git
cd clique
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/clique?schema=public"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="your-secret-key-here"

# OAuth Providers (see AUTH_SETUP.md for setup instructions)
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"
GOOGLE_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"

# TMDB API for movie search (get your free API key at https://www.themoviedb.org/settings/api)
TMDB_API_KEY="your-tmdb-api-key"

# Google Places API for restaurant search (get your API key at https://console.cloud.google.com/apis/credentials)
GOOGLE_PLACES_API_KEY="your-google-places-api-key"
```

**Note**: For authentication setup, see [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed OAuth configuration instructions.

**To enable movie typeahead search:**
1. Create a free account at [The Movie Database (TMDB)](https://www.themoviedb.org/signup)
2. Go to [API Settings](https://www.themoviedb.org/settings/api)
3. Request an API key (it's free for non-commercial use)
4. Add the API key to your `.env` file as `TMDB_API_KEY`

**To enable restaurant typeahead search:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API** in the API Library
4. Go to **Credentials** and create an API key
5. (Recommended) Restrict the API key to Places API only
6. Add the API key to your `.env` file as `GOOGLE_PLACES_API_KEY`

4. Set up the database:
```bash
# Create database (macOS with Homebrew PostgreSQL)
/opt/homebrew/opt/postgresql@15/bin/createdb clique

# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed database with sample data
psql -d clique -f prisma/seed.sql
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Quick Start Demo

The seed data includes:
- 1 demo user (`demo-user-1`)
- 3 sample recommendations (Sushi restaurant, Inception movie, Running shoes)

You can immediately:
- Browse recommendations on the homepage
- Click cards to view details
- Click "Add Recommendation" to create new ones

## Database Setup

### Local PostgreSQL

Install PostgreSQL on your machine or use a cloud provider:

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb clique
```

**Using Prisma's local database (recommended for development):**
```bash
npx prisma dev
```

### Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create and run migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database
npx prisma migrate reset
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── recommendations/
│   │       ├── route.ts          # GET all, POST new
│   │       └── [id]/route.ts     # GET single recommendation
│   ├── recommendations/
│   │   └── [id]/page.tsx         # Dynamic detail page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage with cards
│   └── globals.css               # Global styles
├── components/
│   ├── add-recommendation-dialog.tsx  # Form dialog component
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── textarea.tsx
│       └── ... (other UI components)
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   ├── prisma.ts                 # Prisma client singleton
│   └── utils.ts                  # Utility functions
├── types/
│   └── index.ts                  # TypeScript definitions
prisma/
├── schema.prisma                 # Database schema
├── migrations/                   # Migration history
├── seed.sql                      # SQL seed file
├── seed.ts                       # TypeScript seed (alternative)
└── seed.js                       # JavaScript seed (alternative)
```

## Database Schema

The application uses PostgreSQL with Prisma ORM. Main models:

- **User**: User accounts with email, name, and profile image
- **Recommendation**: Core model with title, description, category, rating (0-10), link, and imageUrl
- **Comment**: User comments on recommendations
- **Like**: User likes on recommendations
- **Account/Session/VerificationToken**: NextAuth.js authentication models

### Category Enum
- `RESTAURANT` - Food and dining recommendations
- `MOVIE` - Films and entertainment
- `FASHION` - Clothing and style items
- `HOUSEHOLD` - Home goods and utilities
- `OTHER` - Miscellaneous recommendations

### Key Relationships
- Users can create multiple recommendations
- Recommendations belong to a user and can have many comments and likes
- Comments and likes are linked to both users and recommendations

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run component tests
- `npm run test:coverage` - Run component tests with coverage
- `npm run test:integration` - Run API integration tests
- `npm run test:integration:coverage` - Run integration tests with coverage
- `npm run test:all` - Run all tests (required before build)

## Testing & CI/CD

This project uses Jest for testing and GitHub Actions for continuous integration.

### Running Tests Locally

```bash
# Run all tests
npm run test:all

# Run component tests only
npm run test

# Run integration tests only
npm run test:integration

# Run with coverage reports
npm run test:coverage
npm run test:integration:coverage

# Watch mode for development
npm run test -- --watch
npm run test:integration -- --watch
```

### Test Structure

- **Component Tests**: 21 tests covering UI components (5 skipped in CI due to environment-specific Radix UI rendering)
- **Integration Tests**: 60 tests covering API routes and business logic
- **Total**: 76 passing, 9 skipped
- **Test Environment**: Dual Jest configuration (jsdom for components, node for API routes)

### Coverage Thresholds

The project maintains strict coverage requirements:

**Component Tests:**
- Branches: 35%
- Functions: 30%
- Lines/Statements: 40%

**API Routes (Integration Tests):**
- Branches: 70%
- Functions: 100%
- Lines/Statements: 80%

Coverage reports are generated in:
- `coverage/` - Component test coverage
- `coverage-integration/` - Integration test coverage

### GitHub Actions Workflow

Every pull request automatically runs:
- ✅ All tests (component + integration) with Node.js 20
- ✅ Coverage report generation in lcov format
- ✅ Coverage diff automatically commented on PR
- ✅ (Optional) Upload to Codecov for historical trend tracking

The workflow is configured in `.github/workflows/test.yml` and runs on:
- Pull requests to `main` branch
- Pushes to `main` branch

### Viewing Test Results

**On Pull Requests:**
1. GitHub Actions will run tests automatically
2. Check status appears on the PR (✅ Tests passed or ❌ Tests failed)
3. Coverage diff is commented directly on the PR showing:
   - Overall coverage percentage
   - Changes compared to base branch
   - File-by-file coverage breakdown

**Locally:**
```bash
# Generate and view coverage report
npm run test:coverage
open coverage/lcov-report/index.html

npm run test:integration:coverage
open coverage-integration/lcov-report/index.html
```

### Setting up Codecov (Optional)

For historical coverage tracking and trend analysis:

1. Sign up at [codecov.io](https://codecov.io) and connect your GitHub repository
2. Add `CODECOV_TOKEN` to your GitHub repository secrets:
   - Go to Settings → Secrets and variables → Actions
   - Add new secret named `CODECOV_TOKEN`
   - Paste your Codecov token
3. Coverage data will be automatically uploaded on every test run
4. View trends at `https://codecov.io/gh/YOUR_USERNAME/clique`

**Note:** Codecov integration is optional. The workflow will continue to run successfully without the token, providing PR coverage comments via the built-in GitHub token.

### Build Quality Gate

The build process (`npm run build`) automatically runs all tests first:
```bash
npm run test:all && next build
```

This ensures that:
- No broken code is deployed to production
- All tests must pass before deployment succeeds
- Coverage thresholds are maintained

**Vercel Deployment:** Connected to the repository and automatically deploys when tests pass.
- `npm run test` - Run component tests
- `npm run test:coverage` - Run component tests with coverage
- `npm run test:integration` - Run API integration tests
- `npm run test:integration:coverage` - Run integration tests with coverage
- `npm run test:all` - Run all tests (required before build)

## Testing & CI/CD

This project uses Jest for testing and GitHub Actions for continuous integration.

### Running Tests Locally

```bash
# Run all tests
npm run test:all

# Run component tests only
npm run test

# Run integration tests only
npm run test:integration

# Run with coverage reports
npm run test:coverage
npm run test:integration:coverage

# Watch mode for development
npm run test -- --watch
npm run test:integration -- --watch
```

### Test Structure

- **Component Tests**: 21 total (16 passing, 5 skipped in CI due to environment-specific Radix UI rendering)
- **Integration Tests**: 64 total (60 passing, 4 skipped)
- **Total**: 85 tests (76 passing, 9 skipped)
- **Test Environment**: Dual Jest configuration (jsdom for components, node for API routes)

### Coverage Thresholds

The project maintains strict coverage requirements:

**Component Tests:**
- Branches: 34%
- Functions: 30%
- Lines/Statements: 40%

**API Routes (Integration Tests):**
- Branches: 70%
- Functions: 100%
- Lines/Statements: 80%

Coverage reports are generated in:
- `coverage/` - Component test coverage
- `coverage-integration/` - Integration test coverage

### GitHub Actions Workflow

Every pull request automatically runs:
- ✅ All tests (component + integration) with Node.js 20
- ✅ Coverage report generation in lcov format
- ✅ Coverage diff automatically commented on PR
- ✅ (Optional) Upload to Codecov for historical trend tracking

The workflow is configured in `.github/workflows/test.yml` and runs on:
- Pull requests to `main` branch
- Pushes to `main` branch

### Viewing Test Results

**On Pull Requests:**
1. GitHub Actions will run tests automatically
2. Check status appears on the PR (✅ Tests passed or ❌ Tests failed)
3. **Two separate coverage reports** are commented directly on the PR:
   - **Component Test Coverage**: Coverage for UI components
   - **Integration Test Coverage**: Coverage for API routes
   - Each shows: overall coverage percentage, changes compared to base branch, and file-by-file breakdown

**Locally:**
```bash
# Generate and view coverage report
npm run test:coverage
open coverage/lcov-report/index.html

npm run test:integration:coverage
open coverage-integration/lcov-report/index.html
```

### Setting up Codecov (Optional)

For historical coverage tracking and trend analysis:

1. Sign up at [codecov.io](https://codecov.io) and connect your GitHub repository
2. Add `CODECOV_TOKEN` to your GitHub repository secrets:
   - Go to Settings → Secrets and variables → Actions
   - Add new secret named `CODECOV_TOKEN`
   - Paste your Codecov token
3. Coverage data will be automatically uploaded on every test run
4. View trends at `https://codecov.io/gh/YOUR_USERNAME/clique`

**Note:** Codecov integration is optional. The workflow will continue to run successfully without the token, providing PR coverage comments via the built-in GitHub token.

### Build Quality Gate

The build process (`npm run build`) automatically runs all tests first:
```bash
npm run test:all && next build
```

This ensures that:
- No broken code is deployed to production
- All tests must pass before deployment succeeds
- Coverage thresholds are maintained

**Vercel Deployment:** Connected to the repository and automatically deploys when tests pass.

## API Routes

### Recommendations
- `GET /api/recommendations` - List all recommendations with user info and counts
- `POST /api/recommendations` - Create new recommendation (requires title, category, userId)
- `GET /api/recommendations/[id]` - Get single recommendation with full details

### Request/Response Examples

**Create Recommendation:**
```json
POST /api/recommendations
{
  "title": "Amazing Pizza Place",
  "description": "Best pizza in town!",
  "category": "RESTAURANT",
  "rating": 9,
  "link": "https://example.com",
  "imageUrl": "https://example.com/image.jpg",
  "userId": "demo-user-1"
}
```

## Development Notes

### Prisma Version
This project uses **Prisma 6.9.0** for compatibility with Node.js 25. Prisma 7.x has initialization issues with this Node version.

### Known Issues
- Authentication UI not yet implemented (NextAuth configured in backend)
- Comment and like features display data but don't have add/remove functionality yet
- Currently using `demo-user-1` as the default user for new recommendations

## Next Steps

### Immediate Priorities
1. ✅ ~~Set up database and migrations~~
2. ✅ ~~Implement API routes for recommendations~~
3. ✅ ~~Build recommendation creation form~~
4. ✅ ~~Create recommendation browsing and detail pages~~
5. 🚧 Implement authentication UI and sign-in flow
6. 🚧 Add comment creation functionality
7. 🚧 Add like/unlike interactions

### Future Enhancements
- Image upload functionality (currently supports URLs only)
- User profiles and friend connections
- Category filtering and search
- Real-time updates with WebSockets
- Recommendation sharing and social features
- Mobile responsive optimizations
- Deploy to Vercel or preferred hosting platform

## Troubleshooting

### Database Connection Issues
If you see "string did not match expected pattern" errors, ensure:
- PostgreSQL is running: `brew services list`
- Database exists: `psql -l | grep clique`
- DATABASE_URL in `.env` is correct

### Prisma Client Issues
If Prisma Client is not generating properly:
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### Port 3000 Already in Use
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

