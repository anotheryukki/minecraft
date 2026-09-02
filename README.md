# MINECRAFTERS ($MINECRAFT)

A satirical, Minecraft-themed memecoin landing page with an AI pfp generator ("Forge Your Cult Skin") powered by Replicate's `google/nano-banana-2` model.

## Run locally

1. Copy `.env.example` to `.env` and fill in your own Replicate API token:
   ```
   cp .env.example .env
   ```
2. Install dependencies (only needed for the screenshot helper script):
   ```
   npm install
   ```
3. Start the server:
   ```
   node --env-file=.env serve.mjs
   ```
4. Open http://localhost:3000

The server (`serve.mjs`) serves the static site and proxies `/api/pfp` to Replicate, keeping the API token server-side only — it is never sent to the browser.

## Files

- `index.html` — the whole site (single file, inline styles/scripts)
- `serve.mjs` — static file server + `/api/pfp` proxy to Replicate
- `screenshot.mjs` — puppeteer helper for local screenshot review, saves to `temporary screenshots/`
