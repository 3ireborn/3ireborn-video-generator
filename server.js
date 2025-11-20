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

// Serve HTML from /public
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// FAL / Pika Proxy
app.post("/api/generate", async (req, res) => {
  try {
    const falKey = process.env.FAL_KEY;
    const providerUrl = process.env.PROVIDER_URL;

    if (!falKey || !providerUrl) {
      return res.status(500).json({ error: "Missing API keys" });
    }

    const response = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const json = await response.json();
    res.json(json);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto detect port from Railway
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on PORT: ${PORT}`);
});
