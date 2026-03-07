import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.APP_BASE_URL || "http://localhost:3000";

const SEARCH_QUERIES = [
  "inception", "matrix", "interstellar", "batman", "avengers",
  "godfather", "pulp fiction", "forrest gump", "fight club", "goodfellas",
  "shawshank", "dark knight", "lord of the rings", "star wars", "titanic",
];

const MOVIE_IDS = ["27205", "603", "157336", "155", "299536", "238", "680"];

export const options = {
  stages: [
    { duration: "30s", target: 10 },  // Ramp up to 10 VUs
    { duration: "1m", target: 50 },   // Ramp up to 50 VUs
    { duration: "30s", target: 50 },  // Stay at 50 VUs
    { duration: "30s", target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],   // 95% of requests under 500ms
    http_req_failed: ["rate<0.01"],     // Less than 1% failure rate
  },
};

export default function () {
  // Movie search
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const searchTs = Date.now(); // Vary params to avoid Next.js cache
  const searchRes = http.get(
    `${BASE_URL}/api/movies/search?query=${encodeURIComponent(query)}&_t=${searchTs}`
  );
  check(searchRes, {
    "search status 200": (r) => r.status === 200,
    "search has results": (r) => JSON.parse(r.body).results !== undefined,
  });

  sleep(1);

  // Movie details
  const movieId = MOVIE_IDS[Math.floor(Math.random() * MOVIE_IDS.length)];
  const detailTs = Date.now();
  const detailRes = http.get(
    `${BASE_URL}/api/movies/${movieId}?_t=${detailTs}`
  );
  check(detailRes, {
    "detail status 200": (r) => r.status === 200,
    "detail has title": (r) => JSON.parse(r.body).title !== undefined,
  });

  sleep(1);
}
