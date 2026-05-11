# DevFlow AI — Build Plan

A premium, dark-mode AI developer platform (Linear/Vercel/Cursor aesthetic) that analyzes GitHub repos. Built on the existing TanStack Start + Tailwind + shadcn stack, with Lovable Cloud for auth and Lovable AI Gateway for AI features.

## Design system

- Dark mode only. Override `src/styles.css` tokens with a deep near-black background, cool slate surfaces, and a violet→cyan signature gradient (`--gradient-primary`).
- Typography: Geist/Inter pairing via Google Fonts; tight tracking on headlines.
- Shared primitives: glass card (`bg-card/40 backdrop-blur-xl border-white/5`), glow button variant, gradient text, animated grid background, noise overlay, glow ring.
- Motion via `framer-motion`: page fades, stagger reveals, hover lifts, animated counters, scanning shimmer.

## Routes (TanStack file-based)

Public:
- `/` Landing
- `/login`, `/signup`, `/reset-password`

Protected under `_authenticated/` (gated by Supabase session):
- `/dashboard`
- `/scanner` (Repository Scanner)
- `/chat` (AI Repo Chat)
- `/architecture` (Visualization)
- `/contributors` (Insights)
- `/docs` (README Generator)
- `/settings`

Each route has unique `head()` meta (title/description/og).

## Landing page (`/`)

Sections: sticky glass navbar → cinematic hero (animated gradient blobs, floating glass status cards: "Security Risk Detected", "README Generated", "Architecture Mapped", "Complexity 82", animated code snippet background) → feature showcase grid (bento) → interactive demo preview (mock scanner output) → architecture preview (animated SVG nodes/edges) → stats counters → testimonials marquee → pricing (3 tiers) → CTA footer.

Hero copy: "Understand Any Codebase Instantly." + subhead + "Start Scanning" / "Watch Demo" buttons.

## Authentication

- Lovable Cloud (Supabase) email/password + Google sign-in.
- `profiles` table (id, display_name, avatar_url, github_username) with auto-create trigger and RLS.
- `_authenticated` layout route with `beforeLoad` redirect to `/login`; redirect-back via search param.

## Dashboard shell

- `SidebarProvider` shell: collapsible icon sidebar (logo + nav items with lucide icons + active highlight) and top navbar (command search, notifications bell, avatar dropdown).
- `/dashboard` widgets: stat cards (repos scanned, insights generated, health score, security warnings) with animated counters; complexity line chart and activity heatmap via `recharts`; recent scans table; quick-scan input.

## Repository Scanner (`/scanner`)

- Large gradient-bordered GitHub URL input with validation.
- On submit: multi-phase scanning animation (Analyzing architecture → Parsing dependencies → Generating AI insights) with progress shimmer.
- Results tabs: Summary, File Tree, Architecture, Dependencies (graph), Complexity heatmap, Security warnings, AI suggestions, Optimizations. Expandable glass cards + charts.
- Backend: TanStack `createServerFn` calls GitHub REST (public, no token initially) to fetch repo metadata + tree, then streams AI analysis through Lovable AI Gateway (`google/gemini-3-flash-preview`). Persist scans in `repo_scans` table.

## AI Repo Chat (`/chat`)

- AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`) installed via `bun x ai-elements@latest add ...`.
- Thread list sidebar + dedicated `/chat/$threadId` route, DB-backed threads (`chat_threads`, `chat_messages` with user scoping & RLS). New thread → navigate.
- Server route `src/routes/api/chat.ts` streams via `streamText` with the active repo context as system prompt. Suggested prompt chips ("Explain backend architecture", "Find potential bugs", etc.).
- Assistant messages render with markdown, no background; user bubble uses `primary`/`primary-foreground`.

## Architecture Visualization (`/architecture`)

- Interactive node graph using `reactflow` (frontend/backend/db/api/dependencies nodes), animated edges, glow on hover, zoom/pan/drag, mini-map, side panel detail on node click.

## Contributor Insights (`/contributors`)

- Recharts dashboards: commit frequency (area), top contributors (bar + avatar list), PR analytics (stacked bar), activity heatmap, maintenance score gauge, issue trend line.

## README Generator (`/docs`)

- Form (repo + sections to include) → AI generates README / install guide / API docs / contribution guide as tabs.
- Live markdown preview (`react-markdown` + `remark-gfm`). Copy Markdown + Export PDF (client-side via `jspdf` from rendered HTML).

## Settings (`/settings`)

- Tabs: Profile, Appearance (theme placeholder, dark locked), API Keys (GitHub PAT stored in `user_secrets` table, encrypted via RLS-scoped row), Integrations, Notifications, Billing (mock).

## Reusable components (`src/components/devflow/`)

`GlowButton`, `GlassCard`, `GradientText`, `AnimatedCounter`, `StatCard`, `ChartCard`, `LoadingSkeleton`, `AIResponseCard`, `ScanProgress`, `FloatingBadge`, `GridBackground`, `NoiseOverlay`, `FloatingModal`.

## Backend (Lovable Cloud)

Tables (with RLS):
- `profiles` — user metadata
- `repo_scans` — id, user_id, repo_url, summary, results jsonb, created_at
- `chat_threads` — id, user_id, repo_scan_id, title, updated_at
- `chat_messages` — id (uuid), thread_id, role, parts jsonb, created_at
- `user_settings` — preferences jsonb
- `user_secrets` — github_pat (server-only access)

Server functions (`src/lib/*.functions.ts`):
- `scanRepository` (fetch GitHub + AI analyze, persist)
- `listScans`, `getScan`
- `generateReadme`
- `getContributorInsights` (GitHub API)
- Chat handled by `/api/chat` server route.

AI calls go through `createLovableAiGatewayProvider` with `LOVABLE_API_KEY` server-side only.

## Tech additions

`bun add framer-motion recharts reactflow react-markdown remark-gfm zod ai @ai-sdk/react @ai-sdk/openai-compatible jspdf`, plus AI Elements components.

## Build order

1. Enable Lovable Cloud + AI Gateway; set up tokens/migrations.
2. Design system tokens + shared components + animated backgrounds.
3. Landing page.
4. Auth pages + `_authenticated` guard + profiles trigger.
5. Dashboard shell (sidebar + topbar) + `/dashboard`.
6. Repository Scanner end-to-end (GitHub fetch + AI stream + persistence).
7. AI Repo Chat with DB threads + `/api/chat` route.
8. Architecture visualization (reactflow).
9. Contributor Insights charts.
10. README Generator + export.
11. Settings.
12. Polish pass: motion, empty states, responsive, mobile nav, SEO meta.

## Open questions before building

1. Confirm Lovable Cloud + Lovable AI Gateway for auth and AI (default).
2. Real GitHub analysis on public repos via unauthenticated GitHub API to start, with optional user PAT in Settings for private repos — OK?
3. Pricing tiers content: invent placeholder Free / Pro $29 / Team $99 — OK?
4. Should chat threads be database-persisted (recommended) per the chat-agent contract?
