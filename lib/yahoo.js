// Yahoo Finance fetchers shared by server.js (local) and api/ (Vercel serverless).
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

module.exports = { fetchQuote, fetchNews };
