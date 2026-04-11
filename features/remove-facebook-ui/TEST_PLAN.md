# Test Plan: Remove Facebook UI

## Unit Tests — `src/app/auth/signin/__tests__/page.test.tsx`
*(new file)*

1. Renders the "Continue with Google" button.
2. Does **not** render any element with the text "Continue with Facebook".
3. Does **not** render any element with the text "Facebook".
4. Renders the "Back to home" link.
5. Renders the "Welcome to Clique" heading.

## Unit Tests — `src/app/data-deletion/__tests__/page.test.tsx`
*(new file)*

6. Renders the "Data Deletion Instructions" heading.
7. Does **not** contain the text "Facebook" anywhere on the page.
8. Does **not** render the "Automatic Data Removal" section heading.
9. Renders the "What Data We Store" section with provider-neutral phrasing ("When you sign in, we store:").
10. Does **not** include "Facebook user ID" in any bullet list.
11. Renders the "How to Request Data Deletion" section and email link.

## Manual Testing Checklist

- [ ] Visit `/auth/signin` — confirm only the Google button is visible; no Facebook button present.
- [ ] Visit `/data-deletion` — confirm no mention of "Facebook" anywhere on the page.
- [ ] Confirm the Google sign-in flow still works end-to-end.
- [ ] Confirm `src/lib/auth.ts` is unchanged (Facebook provider config still present).

## Edge Cases

No edge cases — these are static content deletions with no conditional logic.

## Coverage Targets

- 100% of new/changed lines covered by the new test files.
