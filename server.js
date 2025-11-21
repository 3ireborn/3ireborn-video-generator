import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Health check route (wajib biar Railway tidak mematikan server)
app.get("/", (req, res) => {
  res.send("Server is running OK ✔");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
