# CareerTrack — Job Application Tracker

A full-stack job application tracking app built with **Next.js 15**, **Prisma**, **Clerk**, and **Supabase PostgreSQL**.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Auth:** Clerk
- **Database:** PostgreSQL via Prisma (Supabase)
- **UI:** shadcn/ui + Tailwind CSS v4
- **Styling:** Geist font, CSS variables theming

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project (or local PostgreSQL via Docker)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (from Clerk Dashboard) |
| `CLERK_SECRET_KEY` | Clerk secret key (from Clerk Dashboard) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk webhook signing secret (for svix) |
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler) |
| `DIRECT_URL` | Direct PostgreSQL connection string (for migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anonymous key |
| `NEXT_PUBLIC_APP_URL` | App URL (default: `http://localhost:3000`) |

### Install & Run

```bash
npm install
npx prisma migrate dev
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── (app)/           # Authenticated routes (dashboard, applications)
│   ├── api/             # API routes (applications CRUD, dashboard stats, webhooks)
│   ├── sign-in/         # Clerk sign-in page
│   ├── sign-up/         # Clerk sign-up page
│   ├── layout.tsx       # Root layout with ClerkProvider
│   └── page.tsx         # Landing page
├── components/          # UI components
│   └── ui/              # shadcn/ui primitives
└── lib/
    ├── auth.ts          # Shared auth helper (getInternalUserId)
    └── prisma.ts        # Prisma client singleton
```

## Features

- [x] Clerk authentication (sign-in / sign-up)
- [x] Dashboard with application stats
- [x] CRUD job applications
- [x] Search and filter applications
- [x] Webhook sync (Clerk user events)
- [x] Loading skeletons and error boundaries
- [x] Row Level Security on database tables
