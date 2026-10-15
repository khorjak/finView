// finView — dependency-free dashboard server.
// Serves the UI and proxies the Yahoo Finance chart API (browsers get CORS-blocked calling it directly).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const { fetchQuote, fetchNews } = require('./lib/yahoo');

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
