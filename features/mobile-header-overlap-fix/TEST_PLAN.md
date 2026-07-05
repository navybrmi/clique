# Test Plan: Fix Mobile Header Overlap for Unauthenticated Users

## Unit Tests — Header (`src/components/__tests__/header.test.tsx`)

1. "Sign In" link is rendered when user is not authenticated
2. "Get Started" button has the `hidden` CSS class (hidden on mobile) when user is not authenticated
3. "Get Started" button has the `lg:flex` CSS class (visible on desktop) when user is not authenticated
4. When authenticated, neither "Sign In" nor "Get Started" appears

## Manual Testing Checklist

- [ ] On mobile viewport (< 1024px), only "Sign In" is visible in the header when logged out — "Get Started" does not appear
- [ ] "Clique" title is no longer overlapping with the "Sign In" button on mobile
- [ ] On desktop (≥ 1024px), both "Sign In" and "Get Started" appear as before
- [ ] Clicking "Sign In" on mobile navigates to `/auth/signin`

## Edge Cases to Validate

- Narrow viewport (320px): "Clique" title and "Sign In" button coexist without overlap
- Authenticated user on mobile: header shows notification bell + user menu, unaffected by this change

## Coverage Target

- `Header`: maintain existing coverage; new class assertions covered by added tests
