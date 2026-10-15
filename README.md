# finView

A local stock watchlist dashboard. No dependencies, no API key.

## Features

- Watchlist with live quotes, auto-refreshed every 30s.
- Click a ticker symbol for a popup with the 5 latest news headlines; each opens in a new tab.

## Run

```
node server.js
```

Open http://localhost:3000 (port via `PORT` env var).

Deploy: Vercel serves `index.html` statically and runs `api/` as serverless functions. No config needed.

## Notes

- Quotes come from Yahoo Finance's unofficial chart API (`query1.finance.yahoo.com`). Free, but unofficial — if Yahoo changes it, quotes break.
- `server.js` is for local runs and proxies Yahoo because browsers are CORS-blocked from calling it directly. On Vercel the same routes are served by `api/quotes.js` and `api/news.js`.
- The watchlist persists in browser `localStorage` (per browser, not on the server).
- Symbols: Yahoo conventions — `AAPL`, `MSFT`, `BRK-B`, `SAP.DE`.
