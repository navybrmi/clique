import http from "k6/http";
import { check, sleep } from "k6";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BASE_URL = __ENV.APP_BASE_URL || "http://localhost:3000";

const MOVIE_QUERIES = ["inception", "matrix", "interstellar", "batman", "avengers"];
const MOVIE_IDS = ["27205", "603", "157336", "155", "299536"];
const RESTAURANT_QUERIES = ["pizza", "sushi", "tacos", "burger", "ramen"];
const PLACE_IDS = [
  "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "ChIJhz0mJW5YwokR7eGvhVQkWnY",
  "ChIJr4cQBPBZwokRJm0p88b6xSY",
];
const LOCATIONS = ["New York", "Los Angeles", "Chicago", ""];

export const options = {
  scenarios: {
    mixed: {
      executor: "constant-arrival-rate",
      rate: 30,               // 30 requests per second
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.01"],
  },
};

// Weighted random selection: 40% movie search, 20% movie detail, 25% restaurant search, 15% restaurant detail
function pickAction() {
  const r = Math.random();
  if (r < 0.40) return "movie_search";
  if (r < 0.60) return "movie_detail";
  if (r < 0.85) return "restaurant_search";
  return "restaurant_detail";
}

export default function () {
  const action = pickAction();
  const ts = Date.now();

  switch (action) {
    case "movie_search": {
      const query = randomItem(MOVIE_QUERIES);
      const res = http.get(
        `${BASE_URL}/api/movies/search?query=${encodeURIComponent(query)}&_t=${ts}`
      );
      check(res, {
        "movie search 200": (r) => r.status === 200,
      });
      break;
    }
    case "movie_detail": {
      const id = randomItem(MOVIE_IDS);
      const res = http.get(`${BASE_URL}/api/movies/${id}?_t=${ts}`);
      check(res, {
        "movie detail 200": (r) => r.status === 200,
      });
      break;
    }
    case "restaurant_search": {
      const query = randomItem(RESTAURANT_QUERIES);
      const location = randomItem(LOCATIONS);
      let url = `${BASE_URL}/api/restaurants/search?query=${encodeURIComponent(query)}&_t=${ts}`;
      if (location) url += `&location=${encodeURIComponent(location)}`;
      const res = http.get(url);
      check(res, {
        "restaurant search 200": (r) => r.status === 200,
      });
      break;
    }
    case "restaurant_detail": {
      const placeId = randomItem(PLACE_IDS);
      const res = http.get(
        `${BASE_URL}/api/restaurants/${encodeURIComponent(placeId)}?_t=${ts}`
      );
      check(res, {
        "restaurant detail 200": (r) => r.status === 200,
      });
      break;
    }
  }

  sleep(0.1);
}
