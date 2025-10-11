import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const adapter = new JSONFile("db.json");
const db = new Low(adapter, { consignes: [] });
await db.read();

// --- API ---
app.get("/api/consignes", async (req, res) => {
  await db.read();
  res.json(db.data.consignes);
});

app.post("/api/consignes", async (req, res) => {
  await db.read();
  db.data.consignes.push(req.body);
  await db.write();
  res.status(201).json(req.body);
});

// --- FRONTEND ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur Synthèse en ligne sur le port ${PORT}`));
