// server.js
import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve static files

const PORT = process.env.PORT || 8787;
const FAL_KEY = process.env.FAL_KEY || "";
// contoh default provider URL, ganti jika provider mu beda
const PROVIDER_URL = process.env.PROVIDER_URL || "https://api.fal.ai/v1/generate/video";

/** Root -> serve index.html (optional, static middleware already does this) */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * POST /generate
 * Body: { prompt, duration, style, voice }
 * Response: { video: "https://..." }  OR error JSON
 */
app.post("/generate", async (req, res) => {
  try {
    const { prompt, duration = 8, style = "cinematic", voice } = req.body;
    if (!prompt || String(prompt).trim().length === 0) {
      return res.status(400).json({ error: "prompt required" });
    }

    if (!FAL_KEY) {
      return res.status(500).json({ error: "server_missing_api_key" });
    }

    // Build provider payload (sesuaikan kalau provider butuh format lain)
    const payload = {
      model: "pika-v2.2",
      prompt: prompt,
      duration: Math.min(30, Math.max(3, Number(duration) || 8)),
      style,
      options: { voice }
    };

    // Call provider (FAL) — expects JSON response with video_url or similar
    const providerResp = await fetch(PROVIDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FAL_KEY}`
      },
      body: JSON.stringify(payload),
    });

    // If provider returned non-JSON (e.g. redirect to HTML error), forward error
    const ct = providerResp.headers.get("content-type") || "";
    if (!providerResp.ok) {
      const txt = await providerResp.text().catch(()=>null);
      return res.status(502).json({ error: "provider_error", status: providerResp.status, detail: txt });
    }

    if (ct.includes("application/json")) {
      const j = await providerResp.json();
      // try common fields
      const videoUrl = j.video_url || j.result?.video_url || j.output?.video_url || j.video || j.data?.[0]?.url;
      if (videoUrl) return res.json({ video: videoUrl, raw: j });
      // if provider returns upload id / object, return full JSON for debugging
      return res.json(j);
    }

    // If provider returned binary stream (unlikely in this setup) -> stream back
    const buffer = await providerResp.arrayBuffer();
    const b = Buffer.from(buffer);
    // respond with base64 URL (browser can use) - safer than raw binary
    const base64 = `data:${ct};base64,${b.toString("base64")}`;
    return res.json({ video: base64 });

  } catch (err) {
    console.error("Generate error:", err);
    return res.status(500).json({ error: "server_error", detail: (err && err.message) || String(err) });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
