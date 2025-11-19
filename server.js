// server.js
require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

// Env / config
const PROVIDER_URL = process.env.PROVIDER_URL || ''; // optional: keep empty if using FAL gateway server-side logic
const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || '';
const PORT = process.env.PORT || 8787;

/**
 * POST /api/gen-video
 * body: { prompt, style, duration, mode, voice }
 * This server proxies request to the provider (fal/pika). Adjust payload per provider doc.
 */
app.post('/api/gen-video', async (req, res) => {
  try {
    const { prompt, style = 'cinematic', duration = 8, mode = '3ireborn', voice } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    // Build payload for the gateway (FAL) — adapt if provider expects different shape.
    const payload = {
      // This payload is generic. If your gateway requires a different body shape, update here.
      model: "pika-v2.2",
      prompt,
      duration: Math.min(30, Math.max(3, Number(duration) || 8)),
      aspectRatio: "16:9",
      style,
      options: { mode, voice }
    };

    // Determine endpoint and auth:
    // If you use fal.ai gateway, PROVIDER_URL can be empty and we call fal endpoint; otherwise use PROVIDER_URL.
    const url = PROVIDER_URL || 'https://api.fal.ai/v1/generate/video'; // example default for fal
    const apiKey = FAL_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'server_missing_api_key', message: 'Set FAL_KEY environment variable in Railway' });
    }

    // Call provider
    const providerResp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/octet-stream'
      },
      body: JSON.stringify(payload),
    });

    if (!providerResp.ok) {
      const txt = await providerResp.text().catch(()=>null);
      console.error('Provider error', providerResp.status, txt);
      return res.status(502).json({ error: 'provider_error', status: providerResp.status, detail: txt });
    }

    const ct = providerResp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      // e.g. { video_url: "https://..." }
      const j = await providerResp.json();
      return res.json(j);
    }

    // otherwise binary stream -> pipe to client
    res.setHeader('Content-Type', providerResp.headers.get('content-type') || 'video/webm');
    res.setHeader('Content-Disposition', 'inline; filename="video.webm"');

    const body = providerResp.body;
    if (!body) return res.status(500).json({ error: 'no_body_from_provider' });

    body.pipe(res);
  } catch (err) {
    console.error('server error', err);
    res.status(500).json({ error: 'server_error', detail: (err && err.message) || String(err) });
  }
});

// Fallback: send index.html for any other route (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`3IReborn proxy running on http://localhost:${PORT}`));
