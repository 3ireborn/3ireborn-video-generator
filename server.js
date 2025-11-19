import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ROUTE TEST
app.get("/", (req, res) => {
  res.send("3IReborn Video Generator API is running 🚀");
});

// ROUTE GENERATE VIDEO
app.post("/generate", async (req, res) => {
  try {
    const { prompt, duration, style, voice } = req.body;

    const response = await fetch("https://api.fal.ai/fal/pika/fast-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${process.env.FAL_KEY}`
      },
      body: JSON.stringify({
        prompt,
        duration,
        style,
        voice
      })
    });

    const data = await response.json();
    return res.json(data);

  } catch (error) {
    console.error("Generate error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
