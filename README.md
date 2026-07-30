# Bayflix

A TMDB-powered streaming browser with a modern, Netflix-style interface, built with Next.js (App Router). Firebase handles authentication; a Cloudflare Worker + R2 bucket serves the actual video stream played by the in-app player.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19
- **Tailwind CSS v4** for styling
- **Firebase Auth** (email/password + Google) for sign in/up
- **TMDB API**, proxied through a Next.js Route Handler so the API key never reaches the browser
- **hls.js** for adaptive HLS playback of the Cloudflare Worker stream
- **framer-motion** + **lucide-react** for motion and icons

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   - `TMDB_API_KEY` / `TMDB_BASE_URL` — get a free API key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api). This stays server-only.
   - `NEXT_PUBLIC_FIREBASE_*` — from your Firebase project settings (Project settings → General → Your apps → Web app config). These are safe to expose to the client; Firebase access is controlled by security rules, not by secrecy of these values. Make sure **Email/Password** and **Google** sign-in providers are enabled in Firebase Authentication.
   - `NEXT_PUBLIC_HLS_WORKER_BASE_URL` — the Cloudflare Worker that fronts the R2 bucket serving the demo HLS stream (defaults to the one already deployed).

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## App structure

- `app/page.js` — public marketing landing page.
- `app/signin`, `app/signup` — Firebase auth pages.
- `app/(app)/` — authenticated app shell (top navbar + `RequireAuth` guard):
  - `browse` — the dashboard (hero banner + rows), analogous to Netflix's home.
  - `search` — combined movie/TV search.
  - `category/[slug]` — popular / trending / top-rated / upcoming / now-playing, unified into one page.
  - `movie/[id]`, `tv/[id]` — detail pages (cast, recommendations, trailer, play).
  - `profile` — account page.
- `app/watch/[id]` — fullscreen custom HLS player (no nav chrome), still guarded by `RequireAuth`.
- `app/api/tmdb/[...path]` — server-side proxy to TMDB.
- `lib/` — Firebase client, auth context, TMDB client helpers.
- `components/` — UI building blocks (Navbar, Hero, MovieRow, MovieCard, TrailerModal, NetflixPlayer, etc.).

## Notes on the video player

The Cloudflare Worker + R2 bucket currently host a single demo stream (`testvideo/master.m3u8` and per-quality variants). Every "Play" button routes to `/watch/[id]` and plays that same stream — the title/id are used for the on-screen metadata and for wiring up trailers/detail pages, not for picking a different file server-side. Swap in per-title HLS assets on the Worker/R2 side and this page will pick them up without any frontend changes needed beyond the URL scheme in `components/NetflixPlayer.js`.

Trailers are separate: they're fetched live from TMDB's `/videos` endpoint and played back via an embedded YouTube iframe in a modal (or muted in the background of the hero banner) — they never touch the Cloudflare Worker.
