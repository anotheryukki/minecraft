const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const MODEL = 'google/nano-banana-2';

const PROMPT =
  'Transform this photo into an official Minecraft video game character skin portrait: blocky voxel head and shoulders, chunky cube-based geometry, flat low-res pixelated textures, simple flat-shaded lighting like the Minecraft game engine, centered square portrait, preserve the recognizable likeness, hair color and skin tone of the subject. Background: a vivid Minecraft Overworld scene behind the subject — green grass blocks, dirt and stone, a blue daylight sky with a few pixel clouds, rendered in the same blocky low-res game style as the subject. Do not use a plain, grey, white, or studio background.';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!REPLICATE_API_TOKEN) {
    console.error('Missing REPLICATE_API_TOKEN env var in Vercel project settings.');
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }

  const { image } = req.body || {};
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    res.status(400).json({ error: 'A valid image is required' });
    return;
  }

  try {
    const createRes = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: PROMPT,
          image_input: [image],
          aspect_ratio: '1:1',
          output_format: 'png',
        },
      }),
    });

    const prediction = await createRes.json();
    if (!createRes.ok) {
      res.status(createRes.status).json({ error: prediction?.detail || 'Generation failed to start' });
      return;
    }

    res.status(200).json({ id: prediction.id, status: prediction.status });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not reach the generator. Try again.' });
  }
};
