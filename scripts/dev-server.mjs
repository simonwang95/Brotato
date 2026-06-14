import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvLocal, parseScreenshotWithOpenAi } from "../src/ocrService.js";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 5174);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function loadAiConfig() {
  const envPath = join(rootDir, "env.local");
  const fileEnv = existsSync(envPath) ? parseEnvLocal(readFileSync(envPath, "utf8")) : {};
  return { ...fileEnv, ...process.env };
}

function readRequestJson(request) {
  return new Promise((resolveJson, rejectJson) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) {
        rejectJson(new Error("上传图片过大，请裁剪后重试。"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolveJson(JSON.parse(body || "{}"));
      } catch {
        rejectJson(new Error("请求体不是有效 JSON。"));
      }
    });
    request.on("error", rejectJson);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function handleParseScreenshot(request, response) {
  try {
    const { imageDataUrl, selectedCharacter } = await readRequestJson(request);
    const result = await parseScreenshotWithOpenAi({
      env: loadAiConfig(),
      imageDataUrl,
      selectedCharacter,
    });
    sendJson(response, result.status, result.body);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(rootDir, requestedPath));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
  });
  response.end(readFileSync(filePath));
}

const server = createServer((request, response) => {
  if (request.method === "POST" && request.url?.startsWith("/api/parse-screenshot")) {
    handleParseScreenshot(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405);
    response.end("Method not allowed");
    return;
  }

  serveStatic(request, response);
});

server.listen(port, () => {
  console.log(`Brotato Number Lab running at http://127.0.0.1:${port}`);
});
