// finView — dependency-free dashboard server.
// Serves the UI and proxies the Yahoo Finance chart API (browsers get CORS-blocked calling it directly).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(data.chart?.error?.description || 'Unknown symbol');
  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose;
  const closes = (result.indicators?.quote?.[0]?.close || []).filter(v => v != null);
  return {
    symbol: meta.symbol,
    name: meta.longName || meta.shortName || meta.symbol,
    currency: meta.currency,
    price,
    previousClose: prev,
    change: +(price - prev).toFixed(2),
    changePercent: prev ? +(((price - prev) / prev) * 100).toFixed(2) : 0,
    closes,
    marketTime: meta.regularMarketTime,
  };
}
async function fetchNews(symbol) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=5`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.news || []).map(n => ({
    title: n.title,
    link: n.link,
    publisher: n.publisher,
    time: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
  }));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(INDEX).pipe(res);
    return;
  }
  if (url.pathname === '/api/quotes') {
    const symbols = (url.searchParams.get('symbols') || '')
      .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (!symbols.length) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'symbols required' }));
      return;
    }
    const quotes = await Promise.all(
      symbols.map(s => fetchQuote(s).catch(e => ({ symbol: s, error: e.message })))
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ quotes }));
    return;
  }
  if (url.pathname === '/api/news') {
    const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase();
    if (!symbol) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'symbol required' }));
      return;
    }
    try {
      const news = await fetchNews(symbol);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ symbol, news }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => console.log(`finView running at http://localhost:${PORT}`));
