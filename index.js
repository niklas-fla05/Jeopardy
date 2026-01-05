const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/screen", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "screen.html"));
});

app.get("/host", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "host.html"));
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
