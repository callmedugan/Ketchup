# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ketchup — a scheduling/availability app. Users create recurring or one-time availability blocks, see where their availability overlaps with friends', and turn overlaps into plans. Finding shared free time ("Overlaps") is the app's primary surface, not an incidental calendar detail. npm workspaces monorepo: `shared` (recurrence/overlap math + API Zod schemas, consumed by both), `client` (React/Vite frontend), and `server` (Express API) — built and versioned together but developed independently.

## Commands

Run from the repo root unless noted.

```bash
npm install                 # installs deps for all three workspaces

npm run dev                 # builds shared, then runs client + server concurrently
npm run dev:client          # client only (vite dev server, port 5173 by default) — builds shared first
npm run dev:server          # server only (tsx watch, reads server/.env, needs PORT set) — builds shared first

npm run build               # builds shared, then client, then server (tsc -b && vite build, then tsc)
npm run start                # runs the built server (node ./dist/index.js) — serves the built client as static files too

npm run test                 # runs shared's vitest suite (recurrence/overlap/daily-limit logic)
npm run lint --workspace=client    # oxlint (client only; server has no lint script)

npm run seed --workspace=server    # wipes and repopulates the local db with sample users/friends/schedules/plans (needs PLATFORM=dev)
```

`shared` is consumed as compiled output (`shared/dist`), not transpiled on the fly — if you edit `shared/src` and don't see the change in `client`/`server`, rebuild it: `npm run build --workspace=shared`.

The client dev server proxies `/api` and `/auth` to `http://localhost:8080` (see `client/vite.config.ts`), so run the server on port 8080 in dev, or update the proxy if that changes.

## Environment variables

Server (`server/.env`, loaded via `dotenv/config`): `DATABASE_URL` (Postgres), `JWT_SECRET`, `PORT`, `DEV_FRONTEND_URL` (CORS origin), `PLATFORM` (must be `"dev"` for the `/admin/reset` endpoint and `npm run seed` to work — never point a `PLATFORM=dev` `.env` at a database with real data).

## Architecture

### Shared (`shared/src`)

Single source of truth for anything both `client` and `server` need to agree on, so the two can't independently drift:

- **Recurrence/overlap math** (`recurrence/`): `getTimeOverlapRepeating` (does schedule A overlap schedule B, given their repeat types — used by the server for create-time conflict validation), `findScheduleDailyLimitViolation` (enforces `MAX_SCHEDULES_PER_DAY`), and `buildUserInstances`/`buildInstances` (expands recurring schedules into concrete calendar-day instances and computes friend overlaps — used by the client for display). Covered by a vitest suite (`shared/src/tests`) — this is the trickiest logic in the app and the one place worth having real tests.
- **API contracts** (`types/`): Zod schemas for every request/response shape (`scheduleSchema`, `friendSchema`, `userSchema`, `planDataSchema`, `createScheduleRequestSchema`, `createPlanRequestSchema`, etc.) plus the domain constants (`MAX_SCHEDULES_PER_DAY`, length limits, token expirations). Both server handlers and `client/src/utils/types.ts` import from here rather than redefining shapes locally.

### Server (`server/src`)

Express app assembled in `index.ts`: global middleware (CORS, JSON body limit, nosniff header, rate limiter) → route table → static client files + SPA fallback → `handlerError` catch-all (must stay last).

- **Errors**: handlers `throw` typed errors from `error.ts` (`BadRequestError` 400, `UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404, `ConflictError` 409). `handlers/error.ts` maps them to status codes centrally — handlers never call `res.status(...)` for error paths, just throw and let Express's error middleware catch it.
- **Handlers vs. queries**: `handlers/*.ts` validate (via Zod schemas imported from `@ketchup/shared` or defined locally for server-only shapes like login) and orchestrate; `db/queries.ts` holds all Drizzle queries as one flat file of `*FromDb`/`*InDb`/`*ToDb`-suffixed functions. Handlers never build Drizzle queries inline.
- **Auth**: JWT access tokens (short-lived, `JWT_TOKEN_EXPIRATION_MINS`) + opaque refresh tokens stored in the `refresh_tokens` table (long-lived, revocable — `handlerLogout` takes the refresh token in the request body and revokes it, scoped to the authenticated user). `middlewareAuthentication` reads the bearer token, validates it, and injects `req.userId`/`req.token`. `db/auth.ts` holds password hashing (argon2) and JWT sign/verify.
- **Schema** (`db/schema.ts`, Drizzle + Postgres): `users`, `schedules` (repeat type `once`/`daily`/`weekly`), `refresh_tokens`, `friends` (composite-PK edge table, directional `requesterId`/`responderId` with a `status` enum — always query both directions), `plans`, `plan_schedules` (records which two schedule blocks a plan was proposed from — `handlerCreatePlans` validates both belong to the creator/friend pair and aren't already committed to another active plan before writing this). Migrations are generated with `drizzle-kit` into `server/drizzle/` per `server/drizzle.config.ts`.
- **Timezones**: all timestamps are stored/compared in UTC. Client-supplied local times are converted with `date-fns-tz`'s `fromZonedTime`/`toZonedTime` — never `z.coerce.date()` on a request body field that represents a wall-clock time, since that coerces using the *server's* local timezone, not the user's (this bit the project before — see `createScheduleRequestSchema` in `@ketchup/shared`, which keeps `startTime`/`endTime` as raw strings and converts explicitly with the request's `timezone` field). `getTimeOverlapRepeating` takes an explicit `timezone` argument for the same reason, rather than relying on whatever zone the server process happens to run in.
- **Logging**: structured one-line logs via `handlers/logging.ts` (`logInfo`/`logWarn`/`logError`), not raw `console.log`.
- **Dev data**: `scripts/seed.ts` (run via `npm run seed`) truncates and repopulates the database with a handful of users, friendships, overlapping schedules, and plans in various statuses — gated on `PLATFORM=dev`.

### Client (`client/src`)

- **Routing**: `App.tsx` wraps everything in `ErrorBoundary` → `AppProviders` → `BrowserRouter`. Auth-gated routes live under `<ProtectedRoute />` (waits on `isInitializing` before deciding to redirect, so a silent token refresh gets a chance to complete) → `<AppShell />`, a single layout route rendering the sidebar/bottom-nav chrome once around an `<Outlet />` rather than being re-mounted per page. `/login` and `/register` are public.
- **State**: global state is context-based, composed in `contexts/AppProviders.tsx` (`AuthProvider` → `FriendsProvider` → `ScheduleProvider` → `PlansProvider` — order matters, inner providers can depend on outer ones). No external state library. Each data context (`FriendsContext`, `SchedulesContext`, `PlansContext`) exposes an `isLoading*` flag for its initial fetch — check it before rendering an empty state, or a slow load reads as "you have nothing" instead of "still loading."
- **Auth flow**: `AuthContext` persists `user`/`token`/`refreshToken` to `localStorage`, proactively renews the access token shortly before it expires and silently retries once on a reactive 401 before forcing logout, and exposes `authFetch` (a `fetch` wrapper that attaches the bearer token) — use `authFetch` for any authenticated API call rather than raw `fetch`.
- **Data validation**: `utils/types.ts` re-exports the Zod schemas from `@ketchup/shared` (adding only client-only extensions, like `Plan` joining a friend's display name onto `PlanData`) plus `get*FromParsedJson` helpers that parse either a single object or an array and return `undefined` on failure. Server responses are expected to be run through these before being trusted/stored in state.
- **Design system**: `components/ui/` holds the shared primitives (`Button`, `Input`/`Textarea`, `Badge`, `Modal`, `HoldButton`, `Avatar`/`AvatarStack`, `EmptyState`, `LoadingSpinner`, `OverlapMark`) — reach for these instead of one-off styled elements. Brand tokens live in `index.css`'s `@theme` block: `brand-red` ("you"), `brand-mustard` ("a friend"), `brand-overlap` (the blended tone), plus warm neutrals (`ink`/`paper`/`surface`/`border`). `OverlapMark` (two brand-colored circles blended via `mix-blend-mode`) is the app's signature mark — it's not just decorative, it's the literal visual expression of the product's core question.
- **Calendar/overlap building**: `components/calendar/Instance.ts` is a thin re-export of `@ketchup/shared`'s recurrence functions under this app's established naming (`ScheduleInstance`, `ScheduleWithUserInfo`) — the actual expansion/overlap logic lives in `shared` now, not duplicated here.
- **Overlap discovery**: `components/overlaps/OverlapsFeed.tsx` (routed at `/overlaps`, the "Overlaps" nav item) is the hero surface — a chronological feed of the user's upcoming availability blocks that have a friend overlap, grouped by day. It calls the same `buildScheduleInstances` the calendar uses and opens the same `OverlapModal` on tap, so "make plans" behaves identically from either surface.
- **Responsive design**: calendar has separate `DesktopCalendar.tsx`/`MobileCalendar.tsx` implementations switched via the `useMediaQuery` hook, rather than one calendar with responsive CSS. The app shell itself (sidebar vs. bottom tab bar) switches via CSS breakpoints instead, since both variants render near-identical markup.
