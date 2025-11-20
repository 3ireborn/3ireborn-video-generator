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

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API proxy
app.post("/api/generate", async (req, res) => {
  try {
    const falKey = process.env.FAL_KEY;
    const providerUrl = process.env.PROVIDER_URL;

    if (!falKey || !providerUrl) {
      return res.status(500).json({ error: "Missing environment variables" });
    }

    const result = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${falKey}`
      },
      body: JSON.stringify(req.body)
    });

    const json = await result.json();
    res.json(json);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// IMPORTANT → Railway MUST USE THIS PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
