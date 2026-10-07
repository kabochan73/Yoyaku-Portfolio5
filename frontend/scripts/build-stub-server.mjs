// CI の next build で、静的シェルに入る施設情報を返すためだけのサーバー
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const port = Number(process.env.STUB_PORT ?? 4010);
const facility = readFileSync(
  new URL("../src/test/fixtures/facility.json", import.meta.url),
);

createServer((request, response) => {
  if (request.method === "GET" && request.url === "/api/facility") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(facility);
    return;
  }
  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ message: "Not Found" }));
}).listen(port, () => {
  console.log(`build stub server listening on http://127.0.0.1:${port}`);
});
