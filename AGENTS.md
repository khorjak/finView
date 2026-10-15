# Repository Guidelines

## Project Overview

finView is a local stock watchlist dashboard: enter ticker symbols, see live quotes (price, change, sparkline) refreshed every 30s, and click a ticker for a popup with the 5 latest news headlines. Deliberately minimal — **zero npm dependencies, no API key, no build step**. Data comes from Yahoo Finance's unofficial API.

## Architecture & Data Flow

Single-page client plus two API surfaces: `server.js` for local runs and `api/` serverless functions for Vercel, both using `lib/yahoo.js`. The API exists only because browsers are CORS-blocked from calling Yahoo directly (and to keep API details out of the client).

```
browser (index.html) ──GET /api/quotes?symbols=A,B ──▶ server.js or api/quotes.js ──▶ Yahoo /v8/finance/chart/{sym}?range=1d&interval=5m
                      ◀── {quotes:[{price, change, closes[]…}]} ────┘ (per-symbol fetch, errors captured per symbol)
                      ──GET /api/news?symbol=X ──────────────▶ server.js or api/news.js ──▶ Yahoo /v1/finance/search?q={sym}&newsCount=5
```

- **Server** (`server.js`): one `http.createServer(async (req, res))` with sequential `if (url.pathname === …)` route blocks — every route must `return` after responding, or execution falls through to the 404 and throws `ERR_HTTP_HEADERS_SENT` (this crashed the server once; keep it fixed). On Vercel there is no long-running server: `api/quotes.js` and `api/news.js` expose the same routes as functions, using `res.status().json()`.
- **Client** (`index.html`, inline `<script>`, not a module): `addForm` submit → validates symbol via `/api/quotes` before adding (typos never create dead rows) → persists to localStorage → `refresh()` → `render(quotes)` builds rows via template literals into `$('rows').innerHTML`. `setInterval(refresh, 30000)`.
- **Popup lifecycle**: popup is a standalone `#popup` div outside the table (survives 30s re-renders); `openPopup` anchors it to the clicked link via `getBoundingClientRect`, clamped to the viewport. A `newsSeq` counter guards stale fetches: capture `const seq = ++newsSeq`, after every `await` check `if (seq !== newsSeq) return`; `closePopup` bumps `newsSeq`.
- **State**: `watchlist` (localStorage key `finView.watchlist`, JSON array), `lastPrice` map (drives `flash-up`/`flash-down` CSS animation on price change), `newsSeq`.

## Key Directories

Top level: `lib/` (shared Yahoo fetchers), `api/` (Vercel functions), and `server.js`, `index.html`, `README.md`. No `package.json`, no config files, no `node_modules`. Do not introduce scaffolding unless asked.

## Development Commands

```bash
node server.js            # start dashboard (default port 3000)
PORT=8080 node server.js  # override port
```

Open http://localhost:3000. There is nothing to build, lint, or install.

Deploy: Vercel serves `index.html` statically and runs `api/*.js` as functions. No `vercel.json`; there is no build step.

## Code Conventions & Common Patterns

- **Error handling**: `fetchQuote(s).catch(e => ({symbol: s, error: e.message}))` inside `Promise.all` in both `server.js` and `api/quotes.js`, so one bad symbol never fails the batch; news handlers wrap their fetch in try/catch → 502. Client renders errors inline — error cell in the row, "Refresh failed — retrying" in `#updated`, per-symbol messages in `.msg` — never crashes the render.
- **HTML construction**: template literals joined into `innerHTML`. All dynamic text (`q.name`, `n.title`, `n.publisher`) passes through the `esc()` helper (XSS). News links use `target="_blank" rel="noopener"`.
- **Server route shape**: normalize params (`.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)`), 400 with `{error: …}` JSON on empty input, upstream URLs use `encodeURIComponent` and a `User-Agent: Mozilla/5.0` header (Yahoo rejects default clients).
- **Style**: `const` arrow-function helpers (`$`, `fmt`, `pct`, `cls`, `esc`); CSS custom properties on `:root` (`--bg --surface --border --fg --muted --accent --up --down`); `td.num` right-aligned with `font-variant-numeric: tabular-nums`; `—` placeholder for null values, `−` true minus, forced `+` on non-negative percents.
- **Null/edge guards to preserve**: `chartPreviousClose ?? previousClose`; `closes` nulls filtered (sparkline needs ≥2 points); `prev ? pct : 0`; sparkline `span = max - min || 1`.

## Important Files

- `server.js` — local dev server: routes at the bottom (`/`, `/index.html`, `/api/quotes`, `/api/news`, 404 fallback), `PORT` at line 7.
- `api/quotes.js`, `api/news.js` — Vercel serverless functions for the same two API routes (`(req, res)` handlers).
- `lib/yahoo.js` — `fetchQuote` and `fetchNews`, the Yahoo fetchers shared by `server.js` and `api/`.
- `index.html` — entire client: CSS in `<style>`, helpers and `render()`/`sparkline()` in the script's first half, form/row/popup event handlers in the second half.
- `README.md` — run instructions, feature list, and caveats.

## Runtime/Tooling Preferences

- **Node ≥ 18** (uses built-in global `fetch`); no package manager in play — never add npm dependencies; Node stdlib only.
- No transpilation, bundling, or formatting tools; plain modern JS (optional chaining, `??`) in all JS files.
- Yahoo Finance endpoints are **unofficial** — schema changes break quotes; surface failures per-row/per-popup rather than adding fallbacks.

## Testing & QA

No test framework, no CI, no coverage. Verification is manual smoke-testing against a running server:

```bash
curl -s http://localhost:3000/api/quotes?symbols=AAPL      # 200, {quotes:[…]}
curl -s http://localhost:3000/api/news?symbol=AAPL         # 200, {symbol, news:[5 items]}
curl -s http://localhost:3000/api/news                    # 400 {error:'symbol required'}
```

When changing behavior, verify in a real browser: add/remove symbols, duplicate and invalid-symbol rejection, localStorage persistence across reload, popup open/close (Escape, outside click, ×), headline links opening in a new tab, price flash on refresh. Restart the `node server.js` process after any `server.js` edit (no reload watcher); `index.html` is re-read per request, so client edits are live on reload.
