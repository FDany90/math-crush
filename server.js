// Servidor estático mínimo para probar en el celular (misma WiFi).
// Uso: node server.js   ->   abrí http://<IP-de-tu-PC>:8000 en el teléfono
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8000;
const ROOT = __dirname;
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css" };

http.createServer((req, res) => {
  let file = decodeURIComponent(req.url.split("?")[0]);
  if (file === "/") file = "/index.html";
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404).end("No encontrado"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(full)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor listo en http://0.0.0.0:${PORT}`);
});
