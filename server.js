// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/generate", async (req, res) => {
  try {
    const FAL_KEY = process.env.FAL_KEY;
    const PROVIDER_URL = process.env.PROVIDER_URL;

    if (!FAL_KEY || !PROVIDER_URL) {
      console.error("Missing env:", { hasKey: !!FAL_KEY, hasUrl: !!PROVIDER_URL });
      return res.status(500).json({ error: "server_missing_api_key_or_url" });
    }

    console.log("Proxying request to provider:", PROVIDER_URL);
    console.log("Request body preview:", JSON.stringify(req.body).slice(0, 800));

    // Try common auth header formats: Bearer first, then Key
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${FAL_KEY}`
    };

    // call provider
    const providerResp = await fetch(PROVIDER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(req.body),
      // timeout not available in node-fetch v3 by default; keep simple
    });

    const ct = providerResp.headers.get("content-type") || "";

    // forward non-OK status (but still try to parse)
    if (!providerResp.ok) {
      const text = await providerResp.text().catch(() => null);
      console.error("Provider returned error:", providerResp.status, text);
      return res.status(502).json({ error: "provider_error", status: providerResp.status, detail: text });
    }

    // if JSON
    if (ct.includes("application/json")) {
      const j = await providerResp.json();
      console.log("Provider JSON response preview:", JSON.stringify(j).slice(0, 800));
      return res.json(j);
    }

    // non-json -> return text or base64
    const text = await providerResp.text().catch(() => null);
    if (text) return res.json({ data: text });

    // fallback: stream binary -> base64
    const buffer = await providerResp.arrayBuffer();
    const b = Buffer.from(buffer);
    const base64 = `data:${ct};base64,${b.toString("base64")}`;
    return res.json({ video: base64 });

  } catch (err) {
    console.error("Generate error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "server_error", detail: err && err.message ? err.message : String(err) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on PORT: ${PORT}`));
