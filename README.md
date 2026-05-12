DevFlow AI
Understand any GitHub repository in 60 seconds. AI-powered codebase scanner, onboarding generator, and repo chat — built for engineers who hate reading 400-file directory trees.

Live demo →

What it does
Drop in a public GitHub URL and DevFlow AI will:

Scan the repo — architecture, tech stack, entry points, health score
Onboard new engineers — auto-generated setup guide, key directories, glossary, first-task suggestions
Chat with the repo — ask "where does auth live?" or "how do I add a new route?" and get answers grounded in the actual codebase
Persist everything — every scan, guide, and chat thread saved to your account
Demo flow
Sign in with email or Google
Paste a repo URL on the Scanner page (e.g. https://github.com/vercel/next.js)
Watch the scan complete → auto-redirect to the scan detail view
Switch between Overview, Onboard Engineer, and Repo Chat tabs
Export the onboarding guide as Markdown, share the scan, or come back later from the dashboard
Built with
Frontend: React 19, TanStack Start v1, TanStack Router (file-based routing), TanStack Query, Tailwind CSS v4, shadcn/ui, Framer Motion, Lucide
Backend: TanStack Start server functions (createServerFn) on Cloudflare Workers
Database & Auth: Lovable Cloud (Postgres + Row-Level Security + Auth)
AI: Lovable AI Gateway — google/gemini-2.5-flash for scanning & chat, google/gemini-2.5-pro for structured onboarding generation
Tooling: Vite 7, TypeScript (strict), Zod, react-markdown, Bun
Architecture

┌────────────────┐     useServerFn     ┌─────────────────────┐
│  React client  │ ──────────────────▶ │  createServerFn     │
│  (TanStack)    │                     │  (Cloudflare Worker)│
└────────────────┘                     └──────────┬──────────┘
        │                                         │
        │ supabase-js (auth)                      │ requireSupabaseAuth
        ▼                                         ▼
┌────────────────────────────────────────────────────────────┐
│  Lovable Cloud  (Postgres + RLS + Auth)                    │
│  repo_scans · chat_threads · chat_messages · profiles      │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
                   Lovable AI Gateway
              (Gemini 2.5 Flash / Pro)
All sensitive logic — GitHub fetching, AI calls, DB writes — lives in src/lib/scanner.functions.ts behind requireSupabaseAuth. RLS guarantees users only ever see their own scans and chats.

Key files
Path	Purpose
src/routes/index.tsx	Landing page
src/routes/scanner.tsx	Repo URL input + scan trigger
src/routes/dashboard.tsx	Past scans, delete, navigate
src/routes/scan.$id.tsx	Overview / Onboard / Chat tabs
src/lib/scanner.functions.ts	All server functions (scan, onboard, chat, history)
What I learned
TanStack Start ≠ Next.js. Loaders are isomorphic — secrets and DB calls have to live in createServerFn, not in loader(). Re-learning this the hard way shaped the whole backend layer.
Structured AI output is a superpower. Forcing Gemini to return Zod-validated JSON for the onboarding guide turned a flaky free-text prompt into a reliable feature.
RLS first, UI second. Designing the repo_scans / chat_threads / chat_messages schema with auth.uid() = user_id policies up front meant zero "why can I see someone else's data?" bugs later.
Challenges
Worker runtime limits. No child_process, no fs.watch, no native deps — had to swap a couple of Node-only libraries for fetch-based equivalents.
Session race on first paint. Auth-protected server functions 401'd on initial load until I gated the route on supabase.auth.getUser() in beforeLoad.
Keeping chat context cheap. Repo scan results can be huge; the chat function trims architecture/stack context to the essentials before sending to the model.
Try it out
Live app: https://devflow1.lovable.app
Code: (add your GitHub URL here)
Local development

bun install
bun run dev
The app expects Lovable Cloud env vars (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY) which are auto-provisioned in Lovable.

