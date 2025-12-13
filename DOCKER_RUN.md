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
- Update OAuth/TMDB/Places env vars in `docker-compose.yml` if you want those integrations enabled.
