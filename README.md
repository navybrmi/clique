# Clique 🎯

A social web application for sharing recommendations among friends. Discover and share your favorite restaurants, movies, fashion items, household products, and more.

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js v5
- **Form Management**: React Hook Form + Zod
- **Icons**: Lucide React

## Features

- 🔐 User authentication
- 📝 Create and share recommendations across multiple categories
- 💬 Comment on recommendations
- ❤️ Like your favorite recommendations
- 🏷️ Category-based browsing (Restaurant, Movie, Fashion, Household, Other)
- 👥 Social feed for your clique

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd clique
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your database connection string and other required variables:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/clique?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

4. Generate Prisma Client:
```bash
npx prisma generate
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

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
├── app/              # Next.js app router pages
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Home page
├── components/       # React components
│   └── ui/          # shadcn/ui components
├── lib/             # Utility functions
│   ├── auth.ts      # NextAuth configuration
│   ├── prisma.ts    # Prisma client
│   └── utils.ts     # Utility functions
├── types/           # TypeScript type definitions
prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migrations
```

## Database Schema

The application includes the following main models:

- **User**: User accounts and profiles
- **Recommendation**: User-created recommendations
- **Comment**: Comments on recommendations
- **Like**: User likes on recommendations
- **Account/Session**: NextAuth.js authentication models

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

1. Set up authentication providers (Google, GitHub, etc.)
2. Implement API routes for CRUD operations
3. Add image upload functionality
4. Build recommendation creation and browsing pages
5. Implement real-time features with WebSockets
6. Add search and filtering
7. Deploy to Vercel or your preferred hosting platform

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

