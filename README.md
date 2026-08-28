# Ketchup

<img width="3822" height="1807" alt="Ketchup application" src="https://github.com/user-attachments/assets/815205f2-6d53-46e9-9266-bdf479b613c9" />

**Ketchup** is a scheduling and availability app designed to make planning time with friends easier.

Users can share their availability, connect with friends, and quickly see when their schedules overlap — taking the back-and-forth out of making plans.

### [Try Ketchup Live](https://ketchup-frontend.vercel.app/)

## Features

- **Availability Calendar** — Create one-time, daily, or weekly availability and manage it through a visual calendar.
- **Friends** — Send and manage friend requests to build your network.
- **Schedule Matching** — Automatically find overlapping availability between you and your friends.
- **Plans** — Turn shared availability into plans and send invitations to friends.
- **Notifications** — See when you have new friend requests or plan invitations.
- **Profiles** — Customize your profile and avatar.
- **Responsive Design** — Designed to work across desktop and mobile devices.

## Tech Stack

### Frontend

- TypeScript
- React
- Vite
- Tailwind CSS
- React Router
- date-fns

### Backend

- TypeScript
- Node.js
- Express
- PostgreSQL
- Drizzle ORM
- Zod

### Deployment

- AWS EC2
- Caddy
- Vercel

## Project Structure

Ketchup is organized as an npm workspace containing separate frontend and backend applications.

```text
ketchup/
├── client/          # React + Vite frontend
├── server/          # Express API
├── package.json     # Workspace configuration
└── package-lock.json
```

This allows the frontend and backend to remain independently organized while still being built and managed as a single project.

## Development

Install dependencies for all workspaces from the project root:

```bash
npm install
```

Run the frontend:

```bash
npm run dev:client
```

Run the backend:

```bash
npm run dev:server
```

Build the complete application:

```bash
npm run build
```

## How It Works

Ketchup lets users create blocks of availability on their calendar. Once two friends have overlapping availability, Ketchup calculates their shared free time and surfaces the overlap directly in the calendar.

From there, either user can create a plan for a time within that overlap. Plans can be accepted, declined, or cancelled, giving both users a shared place to manage upcoming plans.

## Why Ketchup?

Making plans often turns into a long conversation:

> "When are you free?"
> "Maybe Saturday."
> "What time?"
> "What about Sunday instead?"

Ketchup replaces that conversation with a shared view of when you and your friends are actually available.

Instead of coordinating schedules manually, you can **see when you're both free and make the plan.**

## Status

Ketchup is actively being developed. Current work is focused on improving the production deployment, mobile experience, and overall application architecture.
