import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.APP_BASE_URL || "http://localhost:3000";

const SEARCH_QUERIES = [
  "pizza", "sushi", "tacos", "burger", "ramen",
  "thai", "indian", "italian", "chinese", "mediterranean",
];

const LOCATIONS = [
  "New York", "Los Angeles", "Chicago", "San Francisco", "Seattle",
  "", "", "", // Empty locations to test without location param
];

const PLACE_IDS = [
  "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "ChIJhz0mJW5YwokR7eGvhVQkWnY",
  "ChIJr4cQBPBZwokRJm0p88b6xSY",
];

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // Restaurant search
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const searchTs = Date.now();
  let url = `${BASE_URL}/api/restaurants/search?query=${encodeURIComponent(query)}&_t=${searchTs}`;
  if (location) {
    url += `&location=${encodeURIComponent(location)}`;
  }

  const searchRes = http.get(url);
  check(searchRes, {
    "search status 200": (r) => r.status === 200,
    "search has results": (r) => JSON.parse(r.body).results !== undefined,
  });

  sleep(1);

  // Restaurant details
  const placeId = PLACE_IDS[Math.floor(Math.random() * PLACE_IDS.length)];
  const detailTs = Date.now();
  const detailRes = http.get(
    `${BASE_URL}/api/restaurants/${encodeURIComponent(placeId)}?_t=${detailTs}`
  );
  check(detailRes, {
    "detail status 200": (r) => r.status === 200,
    "detail has name": (r) => JSON.parse(r.body).name !== undefined,
  });

  sleep(1);
}
