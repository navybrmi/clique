# Test Plan: Clique Feed Icon in "Choose a Feed" Menu

## Unit Tests — CliqueSidebar (`src/components/__tests__/clique-sidebar.test.tsx`)

1. Each clique link renders a `UsersRound` icon (one icon per clique)
2. The `UsersRound` icon has `aria-hidden="true"` (decorative, not read by screen readers)
3. When there are multiple cliques, each link has its own icon
4. The `Globe` icon on the Public link and `BookMarked` icon on My Recommendations are unaffected

## Manual Testing Checklist

- [ ] Open the home page logged in with at least one clique — each clique entry in "Choose a feed" shows a `UsersRound` icon to the left of the name
- [ ] Icon colour matches the `Globe` and `BookMarked` icons (muted zinc-400 grey)
- [ ] Icon renders correctly on mobile (sidebar sheet)
- [ ] Active and inactive clique items both show the icon
- [ ] Public and My Recommendations items are unchanged

## Edge Cases to Validate

- Zero cliques: the empty state is shown, no clique links rendered — no icon visible (correct)
- One clique: icon appears on the single item
- Many cliques (5+): every item has an icon, layout doesn't break

## Coverage Target

- `CliqueSidebar`: maintain existing coverage; new icon rendering branch covered by the new test
