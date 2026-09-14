# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ketchup — a scheduling/availability app. Users create recurring or one-time availability blocks, see where their availability overlaps with friends', and turn overlaps into plans. npm workspaces monorepo: `client` (React/Vite frontend) and `server` (Express API), built and versioned together but developed independently.

## Commands

Run from the repo root unless noted.

```bash
npm install                # installs deps for both workspaces

npm run dev                # runs client + server concurrently
npm run dev:client         # client only (vite dev server, port 5173 by default)
npm run dev:server         # server only (tsx watch, reads server/.env, needs PORT set)

npm run build              # builds client then server (tsc -b && vite build, then tsc)
npm run start              # runs the built server (node ./dist/index.js) — serves the built client as static files too

npm run lint --workspace=client   # oxlint (client only; server has no lint script)
```

There is no test suite in this repo yet (`server`'s `test` script is a placeholder that exits 1).

The client dev server proxies `/api` and `/auth` to `http://localhost:8080` (see `client/vite.config.ts`), so run the server on port 8080 in dev, or update the proxy if that changes.

## Environment variables

Server (`server/.env`, loaded via `dotenv/config`): `DATABASE_URL` (Postgres), `JWT_SECRET`, `PORT`, `DEV_FRONTEND_URL` (CORS origin), `PLATFORM` (must be `"dev"` for the `/admin/reset` endpoint to work).

Client: `VITE_API_URL` (used by the dev-only `TestDataGenerator` component).

## Architecture

### Server (`server/src`)

Express app assembled in `index.ts`: global middleware (CORS, JSON body limit, nosniff header, rate limiter) → route table → static client files + SPA fallback → `handlerError` catch-all (must stay last).

- **Errors**: handlers `throw` typed errors from `error.ts` (`BadRequestError` 400, `UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404, `ConflictError` 409). `handlers/error.ts` maps them to status codes centrally — handlers never call `res.status(...)` for error paths, just throw and let Express's error middleware catch it.
- **Handlers vs. queries**: `handlers/*.ts` validate (via Zod schemas defined at the top of each handler file) and orchestrate; `db/queries.ts` holds all Drizzle queries as one flat file of `*FromDb`/`*InDb`/`*ToDb`-suffixed functions. Handlers never build Drizzle queries inline.
- **Auth**: JWT access tokens (short-lived, `JWT_TOKEN_EXPIRATION_MINS`) + opaque refresh tokens stored in the `refresh_tokens` table (long-lived, revocable). `middlewareAuthentication` reads the bearer token, validates it, and injects `req.userId`/`req.token`. `db/auth.ts` holds password hashing (argon2) and JWT sign/verify.
- **Schema** (`db/schema.ts`, Drizzle + Postgres): `users`, `schedules` (repeat type `once`/`daily`/`weekly`), `refresh_tokens`, `friends` (composite-PK edge table, directional `requesterId`/`responderId` with a `status` enum — always query both directions), `plans`, `plan_schedules`. Migrations are generated with `drizzle-kit` into `server/drizzle/` per `server/drizzle.config.ts`.
- **Timezones**: all timestamps are stored/compared in UTC. Client-supplied local times are converted with `date-fns-tz`'s `fromZonedTime`/`toZonedTime` — never `z.coerce.date()` on a request body field that represents a wall-clock time, since that coerces using the *server's* local timezone, not the user's (this bit the project before — see `handlers/schedules.ts`'s `createScheduleSchema`, which keeps `startTime`/`endTime` as raw strings and converts explicitly with the request's `timezone` field).
- **Schedule overlap logic**: lives in `handlers/schedules.ts` (`getTimeOverlapRepeating`, `validateScheduleDailyLimit` and helpers). Handles comparing recurring (`daily`/`weekly`) schedules against one-time (`once`) ones, and enforces `MAX_SCHEDULES_PER_DAY` per user per day.
- **Logging**: structured one-line logs via `handlers/logging.ts` (`logInfo`/`logWarn`/`logError`), not raw `console.log`.

### Client (`client/src`)

- **Routing**: `App.tsx` wraps everything in `ErrorBoundary` → `AppProviders` → `BrowserRouter`. Auth-gated routes live under a single `<ProtectedRoute />` element; `/login` and `/register` are public.
- **State**: global state is context-based, composed in `contexts/AppProviders.tsx` (`AuthProvider` → `FriendsProvider` → `ScheduleProvider` → `PlansProvider` — order matters, inner providers can depend on outer ones). No external state library.
- **Auth flow**: `AuthContext` persists `user`/`token` to `localStorage`, exposes `authFetch` (a `fetch` wrapper that attaches the bearer token and force-logs-out on a 401 response) — use `authFetch` for any authenticated API call rather than raw `fetch`.
- **Data validation**: `utils/types.ts` defines Zod schemas for every API shape (`scheduleSchema`, `friendSchema`, `userSchema`, `planDataSchema`, etc.) plus `get*FromParsedJson` helpers that parse either a single object or an array and return `undefined` on failure. Server responses are expected to be run through these before being trusted/stored in state.
- **Calendar/overlap building**: `components/calendar/Instance.ts` expands raw recurring `Schedule` records from the API into concrete calendar-day `ScheduleInstance`s within a date range (`buildUserInstances`/`buildInstances`), computes overlaps between the user's instances and friends' instances, and converts everything into the user's timezone for display. This is the client-side counterpart to the server's overlap-checking logic — the two are not shared code and can drift, so changes to one repeat/overlap semantic likely need mirroring in the other.
- **Responsive design**: calendar has separate `DesktopCalendar.tsx`/`MobileCalendar.tsx` implementations switched via the `useMediaQuery` hook, rather than one calendar with responsive CSS.
- **Test data**: `testing/TestDataGenerator.tsx` is a dev-only UI tool that calls the live API (via `authFetch`) to seed sample users/schedules/plans for manual testing — not an automated test.
