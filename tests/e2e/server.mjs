import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const root = process.cwd();
const port = 4173;
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const requested = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.resolve(root, `.${requested}`);
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) throw new Error("Ruta no permitida");
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("No es un archivo");
    response.writeHead(200, {
      "content-type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Servidor R10 disponible en http://127.0.0.1:${port}`);
});
