import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// Server-side only — never sent to the browser. Set via env var (see .env / README), not hardcoded.
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const MODEL = 'google/nano-banana-2';

if (!REPLICATE_API_TOKEN) {
  console.error('Missing REPLICATE_API_TOKEN env var. Set it in .env or your shell before starting the server.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/pfp') {
      return await handlePfp(req, res);
    }
    return await serveStatic(req, res);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Server error' }));
  }
});

async function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(__dirname, urlPath));
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 15 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handlePfp(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid request body' }));
  }

  const { image } = body;
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'A valid image is required' }));
  }

  const prompt =
    'Transform this photo into an official Minecraft video game character skin portrait: blocky voxel head and shoulders, chunky cube-based geometry, flat low-res pixelated textures, simple flat-shaded lighting like the Minecraft game engine, centered square portrait, preserve the recognizable likeness, hair color and skin tone of the subject. Background: a vivid Minecraft Overworld scene behind the subject — green grass blocks, dirt and stone, a blue daylight sky with a few pixel clouds, rendered in the same blocky low-res game style as the subject. Do not use a plain, grey, white, or studio background.';

  try {
    const createRes = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=55',
      },
      body: JSON.stringify({
        input: {
          prompt,
          image_input: [image],
          aspect_ratio: '1:1',
          output_format: 'png',
        },
      }),
    });

    let prediction = await createRes.json();
    if (!createRes.ok) {
      res.writeHead(createRes.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: prediction?.detail || 'Generation failed to start' }));
    }

    prediction = await pollPrediction(prediction);

    if (prediction.status !== 'succeeded') {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: prediction.error || 'Generation failed' }));
    }

    const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: output }));
  } catch (err) {
    console.error(err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Could not reach the generator. Try again.' }));
  }
}

async function pollPrediction(prediction) {
  let tries = 0;
  while ((prediction.status === 'starting' || prediction.status === 'processing') && tries < 40) {
    await new Promise((r) => setTimeout(r, 1500));
    const r = await fetch(prediction.urls.get, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    prediction = await r.json();
    tries++;
  }
  return prediction;
}

server.listen(PORT, () => console.log(`MINECRAFTERS serving on http://localhost:${PORT}`));
