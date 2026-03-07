# Performance Testing with WireMock and k6

This directory contains the performance testing infrastructure for Clique. It uses [WireMock](https://wiremock.org/) to stub external API dependencies (TMDB and Google Places) and [k6](https://k6.io/) to run load tests against the application.

## Prerequisites

- Docker and Docker Compose v2
- (Optional) Real `TMDB_API_KEY` and `GOOGLE_PLACES_API_KEY` — only needed if you want to record new API responses

## Quick Start

```bash
# Run load tests with default settings (mixed workload, no artificial latency)
npm run perf:test

# Stop the perf stack when done
npm run perf:stop
```

That's it. The stack starts a PostgreSQL database, WireMock with pre-recorded stubs, the Next.js app, and k6 — all in Docker.

## Architecture

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│   k6     │──────>│  Next.js App │──────>│  WireMock    │
│ (load    │ HTTP  │  :3000       │ HTTP  │  :8080       │
│ generator)│       │              │       │              │
└──────────┘       └──────┬───────┘       └──────────────┘
                          │                 Stubs:
                          │                 /tmdb/*  (TMDB API)
                   ┌──────▼───────┐        /google/* (Google Places)
                   │  PostgreSQL  │
                   │  :5433       │
                   └──────────────┘
```

The app's API routes read `TMDB_BASE_URL` and `GOOGLE_PLACES_BASE_URL` from environment variables. In the perf stack, these point to WireMock (`http://wiremock:8080/tmdb` and `http://wiremock:8080/google`), so no real API calls are made during testing.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run perf:test` | Start the stack and run a k6 load test |
| `npm run perf:record` | Start the stack in recording mode to capture new API responses |
| `npm run perf:stop` | Tear down the entire perf stack |

## Running Load Tests

### Default (mixed workload)

```bash
npm run perf:test
```

Runs `mixed-workload.js` — a constant-arrival-rate test at 30 req/s for 2 minutes with a weighted mix of endpoints:
- 40% movie search
- 20% movie detail
- 25% restaurant search
- 15% restaurant detail

### Choosing a specific test script

```bash
K6_SCRIPT=movie-search.js npm run perf:test
K6_SCRIPT=restaurant-search.js npm run perf:test
```

Available scripts in `k6/scripts/`:

| Script | Description | Load Profile |
|--------|-------------|-------------|
| `mixed-workload.js` | All endpoints, weighted random | 30 req/s constant for 2 min |
| `movie-search.js` | Movie search + detail endpoints | Ramp 0→10→50→0 VUs over ~2.5 min |
| `restaurant-search.js` | Restaurant search + detail endpoints | Ramp 0→10→50→0 VUs over ~2.5 min |

### Simulating API latency

Inject artificial delay into WireMock responses to simulate slow upstream APIs:

```bash
# Add 200ms latency to TMDB stubs
TMDB_LATENCY=200 npm run perf:test

# Add 300ms latency to Google Places stubs
GOOGLE_LATENCY=300 npm run perf:test

# Both at once
TMDB_LATENCY=200 GOOGLE_LATENCY=300 npm run perf:test
```

You can also inject latency at runtime while the stack is already running:

```bash
bash perf/scripts/set-latency.sh tmdb 200
bash perf/scripts/set-latency.sh google 300
```

### Test results

k6 outputs a summary to the console and writes detailed JSON results to `perf/k6/results/result-<timestamp>.json`. Result files are gitignored.

### Pass/fail thresholds

| Script | p95 Response Time | Error Rate |
|--------|------------------|------------|
| `mixed-workload.js` | < 800ms | < 1% |
| `movie-search.js` | < 500ms | < 1% |
| `restaurant-search.js` | < 500ms | < 1% |

k6 exits with a non-zero code if thresholds are breached.

## Recording New API Responses

If you need to update the WireMock stubs with fresh data from the real APIs:

1. Ensure you have valid API keys. Either export them or add them to the project `.env` file:
   ```bash
   export TMDB_API_KEY=your_key_here
   export GOOGLE_PLACES_API_KEY=your_key_here
   ```

2. Start recording mode:
   ```bash
   npm run perf:record
   ```
   This configures WireMock as a proxy — requests to `/tmdb/*` are forwarded to `https://api.themoviedb.org/3` and requests to `/google/*` are forwarded to `https://maps.googleapis.com`. All responses are recorded.

3. Use the app at `http://localhost:3000` — search for movies, restaurants, view details, etc. Each API call will be captured by WireMock.

4. Press **Enter** in the terminal when done. The script stops recording, saves the captured stubs to `perf/wiremock/recordings/`, and tears down the stack.

5. Review the recordings and copy any you want to keep into `perf/wiremock/mappings/` and `perf/wiremock/__files/`.

## WireMock Stubs

Pre-recorded stubs are committed to the repo:

### Mappings (`wiremock/mappings/`)

| File | Matches | Response |
|------|---------|----------|
| `tmdb-search-movie.json` | `GET /tmdb/search/movie.*` | 5 movie results (Inception, etc.) |
| `tmdb-genre-list.json` | `GET /tmdb/genre/movie/list.*` | 18 TMDB genres |
| `tmdb-movie-details.json` | `GET /tmdb/movie/[0-9]+.*` | Inception details |
| `google-places-textsearch.json` | `GET /google/maps/api/place/textsearch/json.*` | 5 pizza restaurants |
| `google-places-details.json` | `GET /google/maps/api/place/details/json.*` | Joe's Pizza details |

All stubs return the same canned response regardless of query parameters. This is intentional — for load testing, we care about throughput and latency, not response variety.

### WireMock Admin API

While the stack is running, you can inspect WireMock at `http://localhost:8080/__admin`:

```bash
# Health check
curl http://localhost:8080/__admin/health

# List all mappings
curl http://localhost:8080/__admin/mappings

# View request log
curl http://localhost:8080/__admin/requests
```

## Environment Configuration

The perf stack uses `perf/.env.perf` with dummy values — no real API keys are needed for replay mode:

```
TMDB_BASE_URL=http://wiremock:8080/tmdb
GOOGLE_PLACES_BASE_URL=http://wiremock:8080/google
TMDB_API_KEY=perf-test-key
GOOGLE_PLACES_API_KEY=perf-test-key
DATABASE_URL=postgresql://postgres:postgres@db:5432/clique_perf
AUTH_SECRET=perf-test-secret
AUTH_TRUST_HOST=true
```

The PostgreSQL instance runs on port **5433** (host-side) to avoid conflicts with the development database on port 5432.

## Directory Structure

```
perf/
├── .env.perf                     # Environment overrides for the perf stack
├── docker-compose.perf.yml       # Docker Compose for db, wiremock, app, k6
├── k6/
│   ├── results/                  # k6 JSON output (gitignored)
│   └── scripts/
│       ├── mixed-workload.js     # Constant arrival rate, weighted endpoint mix
│       ├── movie-search.js       # Ramping VU test for movie endpoints
│       └── restaurant-search.js  # Ramping VU test for restaurant endpoints
├── scripts/
│   ├── perf-record.sh            # Start WireMock in proxy/recording mode
│   ├── perf-stop.sh              # Tear down the perf stack
│   ├── perf-test.sh              # Run k6 load tests in replay mode
│   └── set-latency.sh            # Inject artificial delay into stubs
└── wiremock/
    ├── __files/                  # Static response bodies (JSON)
    ├── mappings/                 # WireMock stub configurations
    └── recordings/               # Captured recordings (gitignored)
```

## Troubleshooting

**Stack won't start / port conflicts**
```bash
npm run perf:stop                 # Clean up any leftover containers
docker ps                         # Check for conflicting containers on ports 3000, 5433, 8080
```

**App container fails to start**
Ensure `Dockerfile.dev` exists in the project root. The perf stack builds the app from `../Dockerfile.dev`.

**k6 can't reach the app**
The k6 container uses `http://app:3000` (Docker internal networking). Ensure the `app` service is healthy before k6 starts — `perf-test.sh` handles this automatically by polling health endpoints.

**WireMock returns 404 for a request**
Check that the request URL matches one of the patterns in `wiremock/mappings/`. Use the admin API to inspect the request log:
```bash
curl http://localhost:8080/__admin/requests
```

**Want to reset WireMock state without restarting**
```bash
curl -X POST http://localhost:8080/__admin/reset
```
