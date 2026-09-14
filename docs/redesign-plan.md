# Ketchup Frontend Redesign Plan

Status: **finalized — ready to implement.** All open questions below are resolved; nothing in `client/src` has changed yet, this is the spec for that work.

## Decisions

- The dedicated **Overlaps** page/nav item is removed. Overlap discovery (finding shared free time) is folded directly into the **Calendar** page, as on-grid indicators only — no supplementary list/rail.
- Visual direction: **dark, modern, native-app feel** — dark-first UI, tighter density, feels like a slick utility app (Linear/Things/Arc-adjacent) rather than a warm/paper-textured one. Both light and dark themes, user-toggleable, default to system preference.
- The current two-hue "you = red / friend = mustard" brand metaphor is **dropped** in favor of a **single accent color**. Friend-owned things are distinguished by avatar/name/label, not by a second brand hue.
- **No serif.** `Fraunces` display headings are replaced by a heavier weight of the UI sans (`Inter`/`Inter Tight`) instead of a second typeface.
- Sidebar stays **always-expanded** (icon + label), just restyled/tightened — no icon-only collapse state.
- Plans list gets a **status filter** (`SegmentedControl`: All / Pending / Confirmed).
- Theme toggle lives on the **Profile page only**.
- Core functionality is unchanged: recurring/one-time availability, friends (request/accept/decline), overlap → plan conversion, plan accept/decline/cancel, profile editing. This doc is presentation + information architecture only, not the data model or API.

---

## 1. Design system

### 1.1 Palette

Single accent-driven palette. Saturated color is reserved for state and primary actions, not decoration — most of the UI is neutral surfaces at rest.

| Token | Dark (default) | Light |
|---|---|---|
| `--color-bg` | `#0b0c0f` | `#f7f7f8` |
| `--color-surface` | `#16171c` | `#ffffff` |
| `--color-surface-raised` | `#1e2026` | `#ffffff` (+ shadow) |
| `--color-border` | `#2a2c33` | `#e5e5e8` |
| `--color-ink` | `#f2f2f4` | `#16171c` |
| `--color-ink-muted` | `#9a9ba3` | `#63646c` |
| `--color-accent` | `#ff5a36` (ketchup ember) | `#e0431f` |
| `--color-success` | `#3ddc84` | `#1f9d5c` |
| `--color-warning` | `#ffb020` | `#c98300` |
| `--color-danger` | `#ff5c5c` | `#dc2626` |

`--color-accent` is the single "you/action/overlap" color — used for the current-day marker, primary buttons, active nav state, and the calendar's overlap indicator dot/badge. `--color-warning` (amber) covers pending-plan badges etc., not friend identity.

### 1.2 Typography

`Inter` for body/UI text throughout. Headings use `Inter Tight` (or `Inter` at 650-700 weight if we don't want a second font file) instead of `Fraunces` — no serif anywhere.

### 1.3 Density & shape

Tighter paddings, smaller default corner radius (`8px`/`12px` instead of today's `16px`/`24px` cards), thinner (1px) borders, hierarchy communicated via surface elevation steps (`bg` → `surface` → `surface-raised`) rather than colored tints.

### 1.4 Theming mechanism

`ThemeContext` storing `"light" | "dark" | "system"` in `localStorage`, applied as `data-theme` on `<html>`; `index.css` defines dark values under `@theme` as default with a `[data-theme="light"]` override block (and `prefers-color-scheme` respected when preference is `"system"`). Toggle control lives in Profile (§3.6) only.

### 1.5 Component inventory (`components/ui/`)

Restyle in place, no prop/behavior changes: `Button`, `Input`/`Textarea`, `Badge`, `Modal`, `HoldButton`, `Avatar`/`AvatarStack`, `EmptyState`, `LoadingSpinner`.

- `OverlapMark` — **deleted.** It was the visual expression of the two-color "blend" metaphor, which no longer exists. Sidebar/header wordmark becomes a simple logotype or a single-color icon instead.
- New: `ThemeToggle` — light/dark/system control, lives in Profile.
- New: `SegmentedControl` — small pill-tab control, used by Plans' status filter (§3.5).

---

## 2. Navigation / IA

Nav items: **Calendar, Friends, Plans, Profile** (4, down from 5). Calendar is the default/landing route post-login instead of Overlaps.

`AppShell.tsx`:
- Remove the Overlaps `NavLink` and its icon.
- Sidebar keeps today's always-expanded structure (logo, 4 nav items with icon+label+badge, user row with avatar/name/logout) — restyled to the new dark tokens and tighter spacing, no collapse behavior.
- Mobile bottom nav drops to 4 items (more breathing room per item than today's 5-column grid).
- `ProtectedRoute` / post-login redirect target changes from `/overlaps` to `/calendar`.

`App.tsx` / router: delete the `/overlaps` route. Delete `OverlapsPage.tsx`, `OverlapsFeed.tsx`, `OverlapEntryCard.tsx`.

---

## 3. Page-by-page

### 3.1 Login / Register (`LoginPage.tsx`, `RegisterPage.tsx`)

Unauthenticated, isolated from app state — lowest-risk first target to prove the new tokens (dark background, centered card, accent primary button). No structural changes, same fields/flow.

### 3.2 App shell (`AppShell.tsx`)

- Sidebar: logotype, 4 nav items, user row (avatar, name, logout) at bottom. No theme toggle here (lives on Profile).
- Mobile: header (logo + avatar) stays, bottom nav restyled to 4 items.

### 3.3 Calendar (`CalendarPage.tsx` → `Calendar.tsx` → `Desktop`/`MobileCalendar.tsx`) — absorbs Overlaps

Biggest structural change. Today: a week-scrolling grid of day cells with the user's own `ScheduleCard`s; overlap info is hidden inside a modal only reachable by tapping a card that happens to have one.

- **Day cells/schedule blocks get an overlap indicator** — any block with ≥1 friend overlap gets a visible accent-colored dot/count badge, so overlaps are scannable across the visible week at a glance. This is the on-grid replacement for the old Overlaps feed. **No separate list/rail** — this is the only surface for overlap discovery besides the per-friend view in §3.4.
- **Tapping a schedule block** opens a detail modal — today's `OverlapModal.tsx`, renamed `ScheduleDetailModal` (the "Overlap" page concept no longer exists). Same content: block time, existing-plan badge, list of friend overlaps, "Make plans" per overlap. Functionally unchanged from today.
- Week-grid stays the only view — no Day/Week toggle. Not in scope now.
- Header bar (`"MMMM yyyy"`) restyled to the new accent instead of the red gradient.
- `InfiniteWeekScroll`/`InfiniteWeekScrollMobile`, `ScheduleCard`, `NewScheduleModal` — visual restyle only, no behavior change.

### 3.4 Friends (`FriendsPage.tsx` → `FriendsSplitView.tsx`)

Structural layout (list pane + detail pane, mobile push-navigation) is unchanged — restyle only, plus one content addition:

- `FriendsListPane`, `UserSearchBar` — dark surfaces, accent-colored active/selected state.
- `FriendDetailsPane` — **new content:** shows the next couple of upcoming overlaps with this specific friend (filtered from the same `buildScheduleInstances` data the calendar uses), each with a link into the "make a new plan" flow (reuses the existing `/plans` navigation with `newPlanOverlap`/`userScheduleId` state, same as today's `OverlapModal` "Make plans" button).

### 3.5 Plans (`PlansPage.tsx` → `PlansSplitView.tsx`)

Same split-pane pattern, restyle only, plus one new control:

- `PlansListPane` — add a `SegmentedControl` status filter (All / Pending / Confirmed) above the list; status-based visual treatment re-mapped to the new palette (`--color-warning` for pending, `--color-success` for confirmed).
- `PlanDetailsPane`, `NewPlansModal` — restyle only. `NewPlansModal` is now reached from Calendar's `ScheduleDetailModal` or from Friends' per-friend overlap list (§3.4) — one fewer entry point than today since the Overlaps page is gone, same underlying navigation call.

### 3.6 Profile (`ProfilePage.tsx` → `Profile.tsx`)

Structural layout stays (avatar + name header, editable bio, timezone/email rows, logout + save actions) — restyle only, plus:

- **New:** `ThemeToggle` control added here (light/dark/system).

---

## 4. Sequencing

1. Design tokens + `ThemeContext` (`index.css`, `data-theme`) — infrastructure only, no visible change yet.
2. Restyle `components/ui/*` primitives against the new tokens — re-skins large parts of every page for free since every page composes these. Delete `OverlapMark`.
3. Login/Register restyle (isolated smoke test of the new tokens).
4. AppShell + nav restyle; remove Overlaps route/nav item; redirect target → `/calendar`.
5. Calendar rebuild — overlap indicators on grid, `OverlapModal` → `ScheduleDetailModal` rename, restyle header/cards.
6. Friends restyle + new per-friend overlap list in `FriendDetailsPane`.
7. Plans restyle + status `SegmentedControl`.
8. Profile restyle + `ThemeToggle`.
9. Delete now-dead files: `OverlapsPage.tsx`, `OverlapsFeed.tsx`, `OverlapEntryCard.tsx`.
