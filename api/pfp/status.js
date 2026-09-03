const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!REPLICATE_API_TOKEN) {
    console.error('Missing REPLICATE_API_TOKEN env var in Vercel project settings.');
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }

  const id = req.query.id;
  if (!id || Array.isArray(id) || !/^[a-zA-Z0-9]+$/.test(id)) {
    res.status(400).json({ error: 'A valid prediction id is required' });
    return;
  }

  try {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    const prediction = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: prediction?.detail || 'Could not check status' });
      return;
    }

    if (prediction.status === 'succeeded') {
      const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      res.status(200).json({ status: 'succeeded', url: output });
      return;
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      res.status(200).json({ status: prediction.status, error: prediction.error || 'Generation failed' });
      return;
    }
    res.status(200).json({ status: prediction.status });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not reach the generator. Try again.' });
  }
};
