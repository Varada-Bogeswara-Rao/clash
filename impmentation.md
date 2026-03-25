# Role and Goal
You are an expert Next.js and frontend developer with a deep understanding of minimalist, editorial UI/UX design and full-stack API integration. Your task is to generate a complete boilerplate (Next.js App Router + Tailwind CSS + Supabase) for an automated Clash of Clans player tracking dashboard.

# Tech Stack
- Next.js (App Router)
- Tailwind CSS
- Supabase (`@supabase/supabase-js`)
- Framer Motion (for UI animations)
- `lucide-react` (for minimalist icons)

# Design System & UI/UX Constraints (CRITICAL)
Read these constraints carefully. Failure to adhere to them will result in a rejected output.
* **Colors:** Strictly minimal light theme. Use off-whites (e.g., `#F7F7F5`, `#FAFAFA`) for backgrounds and deep charcoal/blacks for text. 
* **Absolutely NO gradients:** No linear-gradients, radial-gradients, or background meshes.
* **NO bright popping colors:** Do not use neon or typical "gamer" glowing colors. If colors are needed for status (e.g., in a clan vs. clanless), use muted, organic tones (like a soft sage green for active, muted brick red for inactive).
* **Typography:** * Headings/Display: Google Font `Instrument Serif`.
  * Body/Data/Numbers/Tables: `Times New Roman`.
* **Borders & Shadows:** Use clean, 1px solid borders (`border-gray-200` or `border-black/10`). Use only very subtle, soft shadows if necessary for depth, but prefer flat, bordered container designs.
* **Motion & Immersive Design:** The site must feel fluid. Use Framer Motion to implement:
  * Smooth page-to-page transitions (e.g., subtle fade and slight upward translate).
  * Staggered section reveals (table rows and stats should reveal one after another smoothly on load).
  * Hover states (subtle scale down or background color shift, NOT glowing).

# Backend & Database Requirements

**Environment Variables Expected:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` 
- `CLASH_API_KEY` 
- `CRON_SECRET` 

**1. Database Schema (Assume these exist in Supabase):**
- Table `tracked_players`: Columns `tag` (PK, text), `name` (text).
- Table `player_history`: Columns `id` (PK, uuid), `player_tag` (FK), `date` (date), `clan_tag` (text, nullable), `clan_name` (text, nullable).

**2. Backend API Route (The Serverless Cron Job):**
Create an API route at `app/api/cron/daily-fetch/route.ts`.
- Verify the `Authorization: Bearer <CRON_SECRET>` header.
- Initialize Supabase using the `SUPABASE_SERVICE_ROLE_KEY`.
- Fetch all player tags from `tracked_players`.
- Iterate through the tags using a `for...of` loop. Include `await new Promise(resolve => setTimeout(resolve, 100))` inside the loop to respect Supercell's rate limit.
- Fetch: `https://api.clashofclans.com/v1/players/{encoded_tag}` using the `CLASH_API_KEY`.
- Extract `clan.tag` and `clan.name` (handle nulls if they are clanless).
- Insert a new record into `player_history` with the current date.

# Required Pages & Component Architecture

### 1. `app/layout.tsx`
* Configure the global fonts (`Instrument Serif` via `next/font/google` and standard `Times New Roman`).
* Include a persistent minimalist top navigation bar with: "Overview", "Player Ledger", and "Database".
* Setup a global wrapper for Framer Motion page transitions (`AnimatePresence`).

### 2. `app/page.tsx` (Overview / Dashboard)
* **Hero Section:** Large, elegant `Instrument Serif` typography introducing the tracker.
* **Stats Strip:** Minimalist bordered boxes showing "Total Players Tracked" and "Active Clans".
* **The Ledger (Data Table):** A clean, editorial-style data table displaying the `player_history` data from Supabase.
  * Columns: Date, Player Name, Player Tag, Clan Name, Status.
  * Use Framer Motion to stagger the entrance of the table rows.
  * Ensure empty states are handled (if a player is clanless, display a subtle "Unaffiliated" badge in muted red/gray).

# Deliverables
1. Provide the `tailwind.config.ts` reflecting the strict color and typography rules.
2. Provide the code for `app/layout.tsx`.
3. Provide the code for the Cron Job API Route (`app/api/cron/daily-fetch/route.ts`).
4. Provide the code for the main dashboard (`app/page.tsx`), including the Framer Motion animations and Supabase data fetching.

