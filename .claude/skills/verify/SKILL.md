---
name: verify
description: Verify Clique changes by driving the running app in a browser, including mobile viewports
user-invocable: true
---

# Verifying Clique changes at runtime

## Launch

```bash
npm run docker:dev   # PostgreSQL + app with hot reload; serves http://localhost:3000
```

Wait for `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` to return 200 (can take ~1–2 min on first boot).

The local dev DB is seeded and the developer's browser usually has a signed-in session cookie for localhost:3000, so authenticated flows are drivable without OAuth.

## Mobile viewport gotcha

Chrome on macOS is often fullscreen — `resize_window` reports success but the viewport stays at full width, and synthetic `cmd+=` zoom keystrokes don't reach browser chrome. Workaround: inject an iframe and drive the app inside it — media queries respond to the iframe's own width:

```js
document.body.innerHTML = '';
document.body.style.cssText = 'background:#666;margin:0;display:flex;justify-content:center;';
const f = document.createElement('iframe');
f.id = 'mobile-frame';
f.src = 'http://localhost:3000/';
f.style.cssText = 'width:390px;height:800px;border:none;display:block;background:#fff';
document.body.appendChild(f);
```

Clicks/screenshots via the computer tool work normally inside the iframe. Widen the iframe (e.g. `1200px`) to check `lg:` desktop behavior. Scroll the app inside the iframe with `document.getElementById('mobile-frame').contentWindow.scrollTo(...)`.

## Logged-out state

The browser session is signed in and the cookie is httpOnly, so drive logged-out flows via SSR HTML instead: `curl -s http://localhost:3000` and grep the markup. Note: components behind `dynamic(..., { ssr: false })` (e.g. AddRecommendationDialog triggers) bail out server-side and only appear after hydration.

## Flows worth driving

- Feed switching: sidebar (desktop), hamburger sheet or bottom bar (mobile); active-feed indicator dot should follow the selection.
- Add Recommendation dialog: opens from hero/sidebar/bottom-bar triggers; when a clique feed is active, that clique is pre-checked under "Add to Cliques".
