const { fetchNews } = require('../lib/yahoo');

module.exports = async (req, res) => {
  const symbol = (new URL(req.url, 'http://localhost').searchParams.get('symbol') || '').trim().toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    res.status(200).json({ symbol, news: await fetchNews(symbol) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
