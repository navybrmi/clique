# Run Clique with Docker

This repo includes a local Docker setup to run the app + Postgres.

## Prereqs

- Docker Desktop (or compatible Docker engine)

## Start

Preferred (interactive):

```bash
npm run docker:dev
```

Or directly:

```bash
docker compose up --build
```

- App: http://localhost:3000
- Postgres: localhost:5432

## Stop

```bash
docker compose down
```

## Notes

- The app container waits for Postgres, runs `prisma migrate deploy`, then starts Next.js.
- Environment variables are read from your `.env` file (OAuth providers, TMDB, Google Places).
- The Docker Postgres database is separate from your local one. To seed it, run:
  ```bash
  docker compose exec app npx prisma db seed
  ```
  Or use the SQL seed:
  ```bash
  docker compose exec db psql -U postgres -d clique -f /app/prisma/seed.sql
  ```
