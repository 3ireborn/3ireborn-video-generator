import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8080;

// Fix __dirname (karena ES Module)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve file di folder public
app.use(express.static(path.join(__dirname, "public")));

// Route utama (supaya Railway tahu app ini hidup)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// KEEP SERVER ALIVE
app.listen(PORT, () => {
  console.log("🔥 Server hidup di PORT:", PORT);
});
