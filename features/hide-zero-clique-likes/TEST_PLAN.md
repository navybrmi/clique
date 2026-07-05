# Test Plan: Hide Zero Secondary Like Count

## Unit Tests — LikeCounts (`src/components/__tests__/like-counts.test.tsx`)

1. Always shows the global total with correct accessible label
2. Shows "N likes across your cliques" when `secondary` is a positive integer
3. Omits the secondary label when `secondary` is `null` (logged-out user)
4. Omits the secondary label when `secondary` is `0`
5. `secondary === 0` and `secondary === null` produce identical rendered output (no secondary span)
6. Global total still renders when `secondary` is `0`

## Manual Testing Checklist

- [ ] Log in and open the home feed — cards with clique likes > 0 show "N likes across your cliques"
- [ ] Verify cards where no clique member has liked show no secondary label at all
- [ ] Log out — no secondary label appears on any card
- [ ] Open `/recommendations/[id]` — secondary label follows the same rules

## Edge Cases to Validate

- `total = 0`, `secondary = 0` — only the global total (0) is shown, no secondary
- `total = 5`, `secondary = 0` — only "5" is shown, no secondary
- `total = 0`, `secondary = 3` — both render correctly

## Coverage Target

- `LikeCounts`: 100%
