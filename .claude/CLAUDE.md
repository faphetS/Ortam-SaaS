# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview 

**Ortam-SaaS** — SaaS WhatsApp Bot Builder for businesses (Hebrew + English, RTL support). Users create AI-powered WhatsApp chatbots through a web dashboard without coding.

Built with React/Vite frontend. Backend is fully serverless via **Supabase** (auth, DB, edge functions, storage). No Express server — the `Server/` directory is unused (only `Server/info.txt` remains as a placeholder).

## Commands

### Client (from `Client/`)
- `npm run dev` — Start Vite dev server (http://localhost:5173)
- `npm run build` — TypeScript check + Vite production build
- `npm run lint` — ESLint
- `npm run preview` — Preview production build

Only `Client/` has a package.json. Run `npm install` from there.

## Architecture

### Client (`Client/`)
- **Entry:** `src/main.tsx` → mounts `<App>` inside `<QueryClientProvider>`, `<ErrorBoundary>`, `<BrowserRouter>`, `<StrictMode>`
- **Routing:** React Router v7 in `src/App.tsx` — add new routes here
- **Pages:** `src/pages/` — page-level components (see Page Structure convention below)
- **Components:** `src/components/` — reusable UI (includes `ErrorBoundary`, flow builder nodes, form components)
- **Services:**
  - `src/services/supabase.ts` — typed Supabase client (`createClient<Database>`)
  - `src/services/edge-functions.ts` — typed wrappers for Supabase edge functions (auto-adds auth headers)
- **Hooks:** `src/hooks/` — 9 custom hooks (useAuth, useFlowBuilder, useFlowHistory, useFormFields, useFileUpload, useRagUpload, useGoogleSheet, useFormData, useAutoPublish)
- **Store:** `src/store/auth.store.ts` — Zustand auth state (user, session, loading)
- **Types:** `src/types/database.ts` — auto-generated Supabase types (25+ tables, 40+ RPCs, enums)
- **Styling:** Tailwind CSS 4.x via `@tailwindcss/vite` plugin
- **Path aliases:** `@/*` maps to `./src/*` (configured in tsconfig.app.json + vite.config.ts)

### Backend (Supabase — no local server)
- **Auth:** Supabase Auth with `handle_new_user()` trigger → auto-creates `profiles` row
- **Database:** 25+ tables in Supabase PostgreSQL
- **Edge Functions:** 19 deployed at `https://wkjinyqkvfszgbttmbit.supabase.co/functions/v1/`
  - bot-demo, bot-edit, flow-demo, flow-webhook, flow-assistant, form-submission, form-update, wa-connect, scrape-trigger, scrape-status, rag-upload, rag-delete, sheets-sync, inngest, gateway-admin, admin-api, quick-endpoint, test-integration, upload-media-batch
  - **Shared modules:** `_shared/llm-engine.ts` (LLM calling + `classifyTrigger()`), `_shared/wa-messaging.ts` (WhatsApp via WClixAPI gateway), `_shared/cors.ts`, `_shared/auth.ts`, `_shared/embeddings.ts`, `_shared/chunking.ts`, `_shared/sheets-helpers.ts`, `_shared/integration-catalog.ts`
- **RPC Functions:** 40+ PostgreSQL functions (admin operations, profile, product search, draft/publish bot, session management, etc.)

### Environment Variables
- **Client/.env:** Supabase credentials, API keys (Anthropic, Gemini, OpenRouter, Firecrawl), edge function URLs
- **Client/.env.sample:** Template with all keys (no values)

## Key Conventions
- ES modules (`"type": "module"` in package.json)
- TypeScript strict mode
- ESLint 9 flat config
- Prettier config at project root (`.prettierrc`)
- Path aliases: use `@/` for all imports (e.g., `import { supabase } from "@/services/supabase"`)
- Supabase client: always import from `@/services/supabase`, never create new clients
- Edge functions: use wrappers from `@/services/edge-functions.ts`, never call endpoints directly
- Auth: use `useAuth()` hook from `@/hooks/useAuth.ts` for all auth operations
- State: Zustand for client state (`src/store/`), React Query for server state
- Database types: import from `@/types/database` (e.g., `Tables<"profiles">`, `TablesInsert<"form_responses">`)
- External operations (Supabase, APIs, third-party services): always read `Client/.env` first to get credentials/URLs before asking the user for access details (includes `SUPABASE_ACCESS_TOKEN` for CLI deploys)
- **Supabase debugging:** When asked to check anything Supabase-related (logs, functions, DB state, etc.), always use the credentials from `Client/.env` to query the Supabase Management API or DB directly. Do NOT read the local `supabase/` folder code — check the live deployed state instead.

### Page Structure (`src/pages/`)
- **Naming:** pages are `{Name}Page.tsx`, sections are `{Name}Section.tsx`
- **Single-file page:** if a page has no sections, place it directly in `pages/` — e.g., `pages/ProfilePage.tsx`
- **Multi-section page:** if a page has distinct sections, create a folder for it:
  ```
  pages/{Name}Page/
  ├── {Name}Page.tsx          # main page component
  └── Sections/
      ├── HeroSection.tsx     # individual section components
      └── PricingSection.tsx
  ```
  - The folder and main file share the same name (e.g., `HomePage/HomePage.tsx`)
  - All section components go inside a `Sections/` subfolder
  - The main page imports and composes its sections

## Routes

```
/                          → HomePage (landing)
/auth                      → AuthPage (login, signup, forgot-password)
/create-bot                → CreateBotPage (3-step wizard, protected)
/dashboard                 → UserLayout (protected, nested routes)
  /dashboard               → DashboardPage (conversations, demo chat, knowledge base)
  /dashboard/edit-bot      → EditBotPage
  /dashboard/flow-builder  → FlowBuilderPage (visual flow editor)
  /dashboard/profile       → ProfilePage
```

## What's Ready

### Backend
- Supabase client with typed Database generics
- Auth flow (signUp → admin approval → approved)
- Edge function wrappers in `edge-functions.ts` with auto-auth
- All 19 edge functions deployed and responding
- 40+ RPC functions
- **Draft/Publish system:** `form_responses.draft_bot_prompt` column separates preview from live bot
- **Google Sheets Knowledge Base:** RAG pipeline with auto-sync every 10 min via Inngest cron
- **Visual Flow Builder:** 8 node types (start, text, image, buttons, collect_input, delay, api_call, open_bot, language) with smart LLM-based trigger matching
- **Auto-Follow-Up System:** LLM-generated re-engagement messages via Inngest cron jobs

### Frontend Pages
- **HomePage** — 6 sections (Hero, ProductPreview, Features, FAQ, CTA, Footer)
- **AuthPage** — login, signup, forgot-password (wired to Supabase Auth)
- **CreateBotPage** — 3-step wizard: FormSection, PreviewSection, ConnectSection
- **DashboardPage** — conversations, demo chat, knowledge base, FAQ, business content, blocked numbers
- **FlowBuilderPage** — visual @xyflow/react flow editor with node palette, editor sidebar, toolbar, preview
- **ProfilePage** — user profile settings
- **UserLayout** — sidebar + layout for authenticated routes

### i18n
- 11 namespaces: common, auth, landing, createBot, dashboard, flow, rag, profile, faq, sidebar, support
- Languages: English (`en`) + Hebrew (`he`) with RTL support

## Implementation Workflow

**For every feature (especially when multiple features are requested in one prompt), follow this strict loop per feature:**

### Per-Feature Loop

1. **Implement** the feature
2. **Build check** — run `npm run build` from `Client/`
   - If fails → fix and re-run build until it passes
3. **Feature complete** → proceed to next feature

**Do NOT automatically run code-simplifier, browser-tester, or /simplify agents after each feature.** Only run them when the user explicitly asks for it.

**Never batch-implement multiple features. Each feature must pass the build before starting the next.**
