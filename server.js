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
app.use(express.static(path.join(__dirname, "public"))); // serve frontend

// ENV variables
const PORT = process.env.PORT || 8787;
const FAL_KEY = process.env.FAL_KEY || "";
const PROVIDER_URL =
  process.env.PROVIDER_URL || "https://api.fal.ai/fal/pika-v2.2/video";

// ✔ Anti-Sleep Route (Railway auto shutdown FIX)
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// ✔ Auto ping every 25 seconds (keeps container alive)
setInterval(() => {
  fetch(`http://localhost:${PORT}/ping`).catch(() => {});
}, 25000);

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ========== GENERATE VIDEO API ==========
app.post("/generate", async (req, res) => {
  try {
    const { prompt, duration = 8, style = "cinematic", voice } = req.body;

    if (!prompt || String(prompt).trim() === "") {
      return res.status(400).json({ error: "prompt_required" });
    }

    if (!FAL_KEY) {
      return res.status(500).json({ error: "missing_fal_key" });
    }

    // Payload ke provider
    const payload = {
      model: "pika-v2.2",
      prompt,
      duration: Math.min(30, Math.max(3, Number(duration))),
      style,
      options: { voice }
    };

    const providerResp = await fetch(PROVIDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FAL_KEY}`
      },
      body: JSON.stringify(payload),
    });

    // Jika provider tidak OK → debug lengkap
    if (!providerResp.ok) {
      const text = await providerResp.text();
      return res.status(502).json({
        error: "provider_error",
        http_status: providerResp.status,
        detail: text
      });
    }

    const contentType = providerResp.headers.get("content-type") || "";

    // Jika JSON
    if (contentType.includes("application/json")) {
      const json = await providerResp.json();
      const videoUrl =
        json.video_url ||
        json.result?.video_url ||
        json.output?.video_url ||
        json.video ||
        json.data?.[0]?.url;

      if (videoUrl) {
        return res.json({ video: videoUrl, raw: json });
      }

      return res.json(json); // fallback
    }

    // Jika binary / blob
    const buffer = Buffer.from(await providerResp.arrayBuffer());
    const base64 = `data:${contentType};base64,${buffer.toString("base64")}`;

    return res.json({ video: base64 });

  } catch (err) {
    console.error("Generate Error:", err);
    return res.status(500).json({
      error: "server_error",
      detail: err.message || String(err)
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
