const { fetchQuote } = require('../lib/yahoo');

module.exports = async (req, res) => {
  const symbols = (new URL(req.url, 'http://localhost').searchParams.get('symbols') || '')
    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (!symbols.length) return res.status(400).json({ error: 'symbols required' });
  const quotes = await Promise.all(
    symbols.map(s => fetchQuote(s).catch(e => ({ symbol: s, error: e.message })))
  );
  res.status(200).json({ quotes });
};
