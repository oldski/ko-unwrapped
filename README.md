# 🎶 KO Unwrapped

**KO Unwrapped** is a year-round, personal take on Spotify Wrapped. It records my listening history from the Spotify API into Postgres every hour, then turns it into animated stats, 3D visualizations, and a set builder that uses Claude to pick and order tracks for DJ-style playlists.

Live at [unwrapped.oldskilabs.com](https://unwrapped.oldskilabs.com).

---

## ✨ What's in it

| Page | What it shows |
|:-----|:--------------|
| **Home** (`/`) | Full-screen now playing over an animated visualizer |
| **Insights** (`/insights`) | Calendar heatmap, listening streaks, "On This Day", taste over time, and data export |
| **3D Tracks** (`/tracks-3d`) | Top tracks as an explorable Three.js scene, by Spotify time range |
| **Taste** (`/taste-profile`) | Genre profile of top artists and tracks, by Spotify time range |
| **Stats** (`/stats`) | History-based stats for any date range: totals, peak hour and day, an hour × weekday heatmap, top artists, and period-vs-period comparison |
| **Top Tracks** (`/top-tracks`) | Most-played tracks from the stored history |
| **Curate** (`/curate`) | The set builder (owner-only, see below) |

### Curate: the set builder

`/curate` builds a continuous set from a few seed tracks and saves it to Spotify as a playlist. Anyone can start the Spotify login, but the callback compares the signed-in Spotify user ID with `OWNER_SPOTIFY_USER_ID` and turns everyone else away. Every route that calls Claude, pushes a playlist, or writes enrichment data checks that same session again.

1. **Seeds.** Pick tracks by search, vibe tag, or past listening session.
2. **Candidates.** A scorer ranks library tracks against the seeds by vibe tags, genres, and filters.
3. **Discovery.** For the *balanced* and *adventurous* presets, Claude and Last.fm suggest similar tracks that aren't in the library, and each one is verified with Spotify search before it can be used.
4. **Set director.** Claude (`claude-sonnet-5-5`) picks and orders the set from that pool. It writes a note for each placement and transition, a short narrative, and a daylist-style playlist name ("wistful cabin cry rainy sunday"). It uses BPM and Camelot key where they're known, so neighboring tracks stay within ±6% BPM and in compatible keys.
5. **Push.** The set becomes a private playlist on my account, with the narrative as its description.

If the director is unavailable, the set falls back to the scorer's own order, smoothed by energy, and gets a name built from its vibe tags.

Spotify's in-app **Mix** transitions (crossfades, beatmatching) can't be set through the Web API. The app's job is to choose and order tracks so that Spotify's auto-mix sounds good.

---

## 🛠️ Tech stack

| Tech | Used for |
|:-----|:---------|
| [Next.js 16](https://nextjs.org/) (App Router) + React 19 | App and API routes |
| [Tailwind CSS 4](https://tailwindcss.com/) | Styling |
| [Framer Motion](https://motion.dev/) + [GSAP](https://gsap.com/) | Animation |
| [Three.js](https://threejs.org/) via React Three Fiber | 3D visualizations |
| [Recharts](https://recharts.org/) | Charts |
| [Drizzle ORM](https://orm.drizzle.team/) + Postgres ([Supabase](https://supabase.com/)) | Listening history and curation data |
| [Anthropic API](https://docs.claude.com/) | Vibe tagging (Haiku), set director and discovery (Sonnet) |
| Spotify Web API, [Last.fm](https://www.last.fm/api), [GetSongBPM](https://getsongbpm.com/api), Deezer | Listening data, similar tracks, BPM and key |
| [Vitest](https://vitest.dev/) | Tests |
| [Vercel](https://vercel.com/) | Hosting and the hourly history-sync cron |

---

## 🚀 Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open **http://127.0.0.1:3000**, not `localhost`. Spotify rejects `localhost` redirect URIs, so the login callback is registered on `127.0.0.1`. Keep port 3000 free: `NEXT_PUBLIC_HOST` and the Spotify callback both expect it.

### Environment variables

Every variable is listed with a comment in [`.env.example`](.env.example). The main ones:

- `DATABASE_URL` / `DATABASE_DIRECT_URL`: Supabase pooled (port 6543) and session/direct (port 5432) connection strings, from the Supabase dashboard's **Connect** panel. Production values in Vercel are marked Sensitive, so `vercel env pull` returns them blank.
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `OWNER_SPOTIFY_USER_ID`
- `SPOTIFY_REFRESH_TOKEN`: sign in once at `/spotify-auth` and copy the token it shows
- `SESSION_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_HOST`
- `ANTHROPIC_API_KEY`, `LASTFM_API_KEY`, `GETSONGBPM_API_KEY`

### Scripts

| Command | Does |
|:--------|:-----|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server (use these to judge performance; dev is much slower) |
| `npm test` | Vitest suite in `tests/`. Some tests query the database, so they need a working `DATABASE_URL` |
| `npm run db:generate` / `db:migrate` | Create and apply Drizzle migrations in `drizzle/` |
| `npm run db:studio` | Browse the database |

---

## 🗄️ Data

- **History sync.** A Vercel cron calls `/api/cron/sync-listening-history` every hour (`vercel.json`), which saves recently played tracks into `play_history`.
- **Enrichment.** Owner-only `POST` routes under `/api/curation/enrich/` fill in data the set builder uses:
  - `artists`: artist genres
  - `sessions`: groups history into listening sessions
  - `tags`: vibe tags from a fixed vocabulary, written by Haiku
  - `mix`: BPM and Camelot key, from GetSongBPM first and then Deezer for BPM
- **Access.** The app connects to Postgres directly through Drizzle. Row-level security is on for every table with no policies, so Supabase's public API can't reach the data.

---

## 📚 More docs

[`API_ROUTES.md`](API_ROUTES.md) lists the API routes and their data sources.

BPM and key data courtesy of [GetSongBPM](https://getsongbpm.com).
