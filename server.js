import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// FIX untuk __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve file STATIC di folder "public"
app.use(express.static(path.join(__dirname, "public")));

// Route utama → kirim index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ====== API ENDPOINT UNTUK GENERATE VIDEO ======
app.post("/generate", async (req, res) => {
  try {
    const { mode, prompt, voice, duration } = req.body;

    // Contoh API call ke FAL / PIKA
    const response = await fetch("https://fal.run/pika/video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${process.env.FAL_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        duration,
        voice,
      }),
    });

    const result = await response.json();
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PORT dari Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
