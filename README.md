# Clique 🎯

[![Tests](https://github.com/navybrmi/clique/actions/workflows/test.yml/badge.svg)](https://github.com/navybrmi/clique/actions/workflows/test.yml)
[![CodeQL](https://github.com/navybrmi/clique/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/navybrmi/clique/actions/workflows/codeql-analysis.yml)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel)](https://vercel.com/navybrmis-projects/clique)
[![codecov](https://codecov.io/gh/navybrmi/clique/branch/main/graph/badge.svg)](https://codecov.io/gh/navybrmi/clique)

A social web application for sharing recommendations among friends. Discover and share your favorite restaurants, movies, fashion items, household products, and more.

## Tech Stack

- **Framework**: Next.js 16 with App Router and Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database ORM**: Prisma 6.9.0
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js v5 with Google and Facebook OAuth
- **Form Management**: React Hook Form + Zod
- **Icons**: Lucide React
- **Runtime**: Node.js v24

## Features

### ✅ Implemented
- 🔐 User authentication with Google and Facebook OAuth
- 📝 Create, edit, and delete recommendations (owners only)
- 🔍 Browse recommendations on homepage with interactive cards
- 🖼️ Full-image cards with blurred background fill
- 📄 View detailed recommendation pages with comments and upvote counts
- 🏷️ Category-based organization (Restaurant, Movie, Fashion, Household, Other)
- 📊 Category-specific fields (cuisine, director, brand, etc.)
- 🎬 Movie typeahead search with TMDB integration (auto-fill movie details)
- 🍽️ Restaurant typeahead search with Google Places integration (auto-fill restaurant details)
- 🏷️ Tag suggestions with community promotion system (tags with 20+ uses auto-promoted)
- ⭐ Rating system (0-10 scale)
- 🔗 Link and image URL support for recommendations
- 📡 RESTful API routes for CRUD operations
- 🔄 Auto-refresh after creating new recommendations
- 👤 User menu with profile dropdown
- 💬 Add and delete comments on recommendations
- 🔢 Upvote and comment counts displayed on recommendation detail pages
- 🔁 Refresh external data (re-fetch movie/restaurant details from TMDB/Google Places)
- 🚫 Form fields disabled until category is selected

### 🚧 Coming Soon
- ❤️ Interactive upvote/like functionality
- 🖼️ Image upload capability
- 🔎 Search and filtering
- 👥 User profiles and friend connections

## Getting Started

### Prerequisites

- Node.js 18.x or higher (tested with v24)
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
GOOGLE_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"
FACEBOOK_ID="your-facebook-app-id"
FACEBOOK_SECRET="your-facebook-app-secret"

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
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Run with Docker


### Fast Docker Development (Recommended)

Preferred (interactive):

```bash
npm run docker:dev
```

This uses BuildKit, persistent volumes, and hot reload for rapid local development.

Or directly:

```bash
DOCKER_BUILDKIT=1 docker compose -f docker-compose.dev.yml up --build
```

To stop:
```bash
docker compose -f docker-compose.dev.yml down
```

### Production-like Docker Build

To run a production-style build and test in Docker:

```bash
npm run docker:prod
```

Or directly:

```bash
docker compose up --build
```

See `DOCKER_RUN.md` for details.

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
│   │   ├── auth/[...nextauth]/   # NextAuth.js OAuth routes
│   │   ├── recommendations/
│   │   │   ├── route.ts          # GET all, POST new
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET single, PUT update, DELETE
│   │   │       ├── comments/     # POST new comment
│   │   │       │   └── [commentId]/route.ts  # DELETE comment
│   │   │       └── refresh/route.ts  # POST refresh from external API
│   │   ├── movies/search/        # GET movie search (TMDB)
│   │   ├── restaurants/search/   # GET restaurant search (Google Places)
│   │   ├── categories/           # GET list of categories
│   │   └── tags/                 # GET tag suggestions
│   ├── recommendations/
│   │   └── [id]/page.tsx         # Dynamic detail page
│   ├── data-deletion/            # OAuth data deletion page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage with cards
│   └── globals.css               # Global styles
├── components/
│   ├── add-recommendation-dialog.tsx  # Create recommendation form
│   ├── edit-recommendation-button.tsx # Edit owned recommendations
│   ├── delete-recommendation-button.tsx # Delete owned recommendations
│   ├── add-comment-form.tsx      # Add comment form
│   ├── comments-section.tsx      # Comments list and form
│   ├── actions-sidebar.tsx       # Upvote/comment/share counts
│   ├── refresh-entity-button.tsx # Refresh external data button
│   ├── refreshable-entity-details.tsx # Entity details with refresh
│   ├── header.tsx                # Site header with auth
│   ├── user-menu.tsx             # User profile dropdown
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
│   ├── auth.ts                   # NextAuth configuration (Google + Facebook)
│   ├── prisma.ts                 # Prisma client singleton
│   ├── tag-service.ts            # Community tag promotion logic
│   ├── movie-tags.ts             # Hardcoded movie tag definitions
│   └── utils.ts                  # Utility functions
├── types/
│   └── index.ts                  # TypeScript definitions
perf/
├── k6/                           # k6 load test scripts
├── wiremock/                     # WireMock stubs for API mocking
└── docker-compose.perf.yml       # Performance test environment
prisma/
├── schema.prisma                 # Database schema
├── migrations/                   # Migration history
└── seed.ts                       # TypeScript seed script
```

## Database Schema

The application uses PostgreSQL with Prisma ORM. Main models:

- **User**: User accounts with email, name, and profile image
- **Entity**: Base container linked 1-to-1 with category-specific tables (polymorphic model)
- **Restaurant**: Restaurant-specific data (cuisine, location, priceRange, placeId, etc.)
- **Movie**: Movie-specific data (director, year, genre, tmdbId, imdbId, etc.)
- **Fashion**: Fashion-specific data (brand, size, material, etc.)
- **Household**: Household-specific data (brand, model, store, etc.)
- **Other**: Catch-all for miscellaneous recommendations
- **Recommendation**: Core model linking a User to an Entity with title, description, rating (0-10), link, and imageUrl
- **Comment**: User comments on recommendations
- **UpVote**: User upvotes on recommendations (unique per user per recommendation)
- **CommunityTag**: Tag usage tracking; tags reaching 20+ uses are promoted to suggestions
- **Account/Session/VerificationToken**: NextAuth.js authentication models

### Category Enum
- `RESTAURANT` - Food and dining recommendations
- `MOVIE` - Films and entertainment
- `FASHION` - Clothing and style items
- `HOUSEHOLD` - Home goods and utilities
- `OTHER` - Miscellaneous recommendations

### Key Relationships
- Users can create multiple recommendations
- Recommendations reference an Entity (which holds category-specific data)
- Recommendations can have many comments and upvotes
- Comments and upvotes are linked to both users and recommendations

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run component/unit tests
- `npm run test:coverage` - Run component tests with coverage
- `npm run test:integration` - Run API integration tests
- `npm run test:integration:coverage` - Run integration tests with coverage
- `npm run test:all` - Run all tests (required before build)
- `npm run docker:dev` - Start PostgreSQL + app with hot reload
- `npm run docker:prod` - Run production-style Docker build
- `npm run db:seed` - Seed database with sample data

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
npm run test:watch
```

### Test Structure

- **Component Tests**: UI components and pages (jsdom environment)
- **Integration Tests**: API routes and business logic (node environment)
- **Test Environment**: Dual Jest configuration (`jest.config.js` for components, `jest.integration.config.js` for API routes)

### Coverage Thresholds

The project maintains strict coverage requirements:

**Component Tests:**
- Branches: 10%
- Functions: 20%
- Lines/Statements: 29%

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
- ✅ Two separate coverage reports commented directly on the PR (component + integration)
- ✅ Upload to Codecov for historical trend tracking
- ✅ CodeQL security analysis
- ✅ Automated GitHub Release creation on pushes to `main`

The workflow is configured in `.github/workflows/test.yml` and runs on:
- Pull requests to `main` branch
- Pushes to `main` branch

Markdown-only changes skip test and CodeQL workflows automatically.

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

### Performance Testing

The project includes a performance testing setup using WireMock and k6:

```bash
# Start the performance test environment
docker compose -f perf/docker-compose.perf.yml up

# Run k6 load tests
k6 run perf/k6/recommendations.js
```

WireMock stubs in `perf/wiremock/` mock external APIs (TMDB, Google Places) so load tests run without hitting rate limits.

## API Routes

### Recommendations
- `GET /api/recommendations` - List all recommendations with user info and counts
- `POST /api/recommendations` - Create new recommendation (requires auth)
- `GET /api/recommendations/[id]` - Get single recommendation with full details
- `PUT /api/recommendations/[id]` - Update recommendation (owner only)
- `DELETE /api/recommendations/[id]` - Delete recommendation (owner only)

### Comments
- `POST /api/recommendations/[id]/comments` - Add a comment (requires auth)
- `DELETE /api/recommendations/[id]/comments/[commentId]` - Delete a comment (owner only)

### External Data Refresh
- `POST /api/recommendations/[id]/refresh` - Re-fetch entity details from TMDB or Google Places

### Search & Metadata
- `GET /api/movies/search?q=<query>` - Search movies via TMDB
- `GET /api/restaurants/search?q=<query>` - Search restaurants via Google Places
- `GET /api/categories` - List all categories
- `GET /api/tags?category=<category>` - Get tag suggestions for a category

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
  "imageUrl": "https://example.com/image.jpg"
}
```

## Development Notes

### Prisma Version
This project uses **Prisma 6.9.0** for compatibility with Node.js 24. Prisma 7.x has initialization issues with this Node version.

### Polymorphic Entity Model
The `Entity` table acts as a base container linked 1-to-1 with category-specific tables (`Restaurant`, `Movie`, `Fashion`, `Household`, `Other`). A `Recommendation` points to an `Entity`, which holds the category-specific data. This keeps the recommendation model clean while supporting rich per-category fields.

### Community Tag Promotion
Tags are tracked in the `CommunityTag` table with usage counts. Tags reaching 20+ uses get promoted and appear as suggestions in the add recommendation form. Hardcoded tags (in `movie-tags.ts`) are always available regardless of usage count.

## Next Steps

### Immediate Priorities
1. ✅ ~~Set up database and migrations~~
2. ✅ ~~Implement API routes for recommendations~~
3. ✅ ~~Build recommendation creation form~~
4. ✅ ~~Create recommendation browsing and detail pages~~
5. ✅ ~~Implement authentication UI and sign-in flow~~
6. ✅ ~~Add comment creation functionality~~
7. 🚧 Add interactive upvote/like functionality

### Future Enhancements
- Image upload functionality (currently supports URLs only)
- User profiles and friend connections
- Category filtering and search
- Real-time updates with WebSockets
- Recommendation sharing and social features
- Mobile responsive optimizations

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
