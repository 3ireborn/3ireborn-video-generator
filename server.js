import express from "express";
import cors from "cors";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT;  // Railway inject otomatis
const FAL_KEY = process.env.FAL_KEY;
const PROVIDER_URL = process.env.PROVIDER_URL;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/generate", async (req, res) => {
  try {
    const { prompt, duration = 8, style = "cinematic", voice } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt_required" });
    }

    if (!FAL_KEY) {
      return res.status(500).json({ error: "missing_api_key" });
    }

    const payload = {
      model: "pika-v2.2",
      prompt,
      duration: Number(duration) || 8,
      style,
      options: { voice }
    };

    const response = await fetch(PROVIDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FAL_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const ct = response.headers.get("content-type") || "";

    if (!response.ok) {
      const txt = await response.text();
      return res.status(502).json({ error: "provider_error", detail: txt });
    }

    if (ct.includes("application/json")) {
      const json = await response.json();
      const videoUrl =
        json.video_url ||
        json.result?.video_url ||
        json.output?.video_url ||
        json.video ||
        json.data?.[0]?.url;

      return res.json({ video: videoUrl || null, raw: json });
    }

    const buffer = await response.arrayBuffer();
    const base64 = `data:${ct};base64,${Buffer.from(buffer).toString("base64")}`;
    return res.json({ video: base64 });

  } catch (err) {
    return res.status(500).json({ error: "server_error", detail: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on PORT: ${PORT}`)
);
