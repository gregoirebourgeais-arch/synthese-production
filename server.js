const express = require("express");
const path = require("path");
const jsonServer = require("json-server");

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware JSON Server
const router = jsonServer.router(path.join(__dirname, "public", "db.json"));
const middlewares = jsonServer.defaults();
app.use("/api", middlewares, router);

// Servir les fichiers statiques (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, "public")));

// Redirection toutes routes vers index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Serveur en ligne sur le port ${PORT}`);
});
