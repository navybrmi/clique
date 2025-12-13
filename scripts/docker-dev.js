#!/usr/bin/env node

// Back-compat wrapper. The actual implementation is `scripts/docker-dev.mjs`.
// `npm run docker:dev` points to the `.mjs` file.
import('./docker-dev.mjs').catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});

