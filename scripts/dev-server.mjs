import { createServer } from "node:http";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getOcrStatus,
  parseEnvLocal,
  parseScreenshotWithOpenAi,
} from "../src/ocrService.js";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const host = "127.0.0.1";
const port = Number(process.env.PORT || 5174);
// 与 api/parse-screenshot.js 保持一致：Vercel Functions 请求体平台上限 4.5 MB。
const MAX_BODY_BYTES = Math.floor(4.5 * 1024 * 1024);

// 静态资源严格 allowlist：只允许运行时页面需要的入口、样式、浏览器 JS 和公开数据。
// env.local、.git、source、tests、scripts、api、docs 等一律不对外提供。
const ALLOWED_STATIC_FILES = new Set(["/index.html", "/styles.css"]);
const ALLOWED_STATIC_PREFIXES = ["/src/", "/data/"];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

// 页面不使用内联脚本、内联样式或外部源资源，CSP 只允许同源。
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function loadAiConfig() {
  const envPath = join(rootDir, "env.local");
  const fileEnv = existsSync(envPath) ? parseEnvLocal(readFileSync(envPath, "utf8")) : {};
  return { ...fileEnv, ...process.env };
}

function normalizeLoopbackIp(remoteAddress) {
  if (!remoteAddress) return "127.0.0.1";
  if (remoteAddress === "::1" || remoteAddress === "::ffff:127.0.0.1") return "127.0.0.1";
  return remoteAddress;
}

function sendText(response, statusCode, text) {
  if (response.headersSent) {
    response.end();
    return;
  }
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  });
  response.end(text);
}

function sendJson(response, statusCode, payload) {
  if (response.headersSent) {
    response.end();
    return;
  }
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  });
  response.end(JSON.stringify(payload));
}

function httpError(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function readRequestJson(request) {
  return new Promise((resolveJson, rejectJson) => {
    let body = "";
    let oversized = false;
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      rejectJson(error);
    };

    request.on("data", (chunk) => {
      // 超过上限后继续消费但不累积：不能 destroy socket，
      // 否则客户端还在发送剩余数据时连接被切断，fetch 会报错而不是收到 413。
      if (oversized) return;
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        oversized = true;
        body = "";
      }
    });
    request.on("end", () => {
      if (settled) return;
      if (oversized) {
        fail(httpError("请求体过大。", 413, "BODY_TOO_LARGE"));
        return;
      }
      let parsed;
      try {
        // 必须先解析成功再标记 settled，否则解析失败时 fail() 会因
        // settled 已为 true 而直接返回，promise 永远 pending。
        parsed = JSON.parse(body || "{}");
      } catch {
        fail(httpError("请求体不是有效 JSON。", 400, "INVALID_JSON"));
        return;
      }
      settled = true;
      resolveJson(parsed);
    });
    request.on("error", () => fail(httpError("请求中断。", 400, "BAD_REQUEST")));
  });
}

async function handleParseScreenshot(request, response) {
  let payload;
  try {
    payload = await readRequestJson(request);
  } catch (error) {
    sendJson(response, error.status ?? 400, { error: error.message, code: error.code ?? "BAD_REQUEST" });
    return;
  }

  const result = await parseScreenshotWithOpenAi({
    env: loadAiConfig(),
    imageDataUrl: payload.imageDataUrl,
    selectedCharacter: payload.selectedCharacter,
    cropped: payload.cropped === true,
    clientIp: normalizeLoopbackIp(request.socket?.remoteAddress),
  });
  sendJson(response, result.status, result.body);
}

function isAllowedPath(pathname) {
  return (
    ALLOWED_STATIC_FILES.has(pathname) ||
    ALLOWED_STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

// 返回 { filePath } 或 { status, reason }。
// 依次检查：dotfile → allowlist → 逻辑路径边界 → 符号链接 realpath 边界
// → 对真实路径再次做 allowlist 检查（符号链接不能指向仓库内非公开文件）。
function resolveAllowedStaticPath(pathname) {
  const normalized = pathname === "/" ? "/index.html" : pathname;

  if (normalized.split("/").some((segment) => segment.startsWith("."))) {
    return { status: 403, reason: "dotfile" };
  }

  if (!isAllowedPath(normalized)) {
    return { status: 403, reason: "not-allowed" };
  }

  // 用 join 而不是 resolve：normalized 以 "/" 开头，resolve 会把它当成绝对路径。
  const logicalPath = join(rootDir, normalized);
  const logicalRelative = relative(rootDir, logicalPath);
  if (isAbsolute(logicalRelative) || logicalRelative.split(sep).includes("..")) {
    return { status: 403, reason: "path-escape" };
  }

  let realPath;
  try {
    realPath = realpathSync(logicalPath);
  } catch {
    return { status: 404, reason: "missing" };
  }

  const realRoot = realpathSync(rootDir);
  const realRelative = relative(realRoot, realPath);
  if (isAbsolute(realRelative) || realRelative.split(sep).includes("..")) {
    return { status: 403, reason: "symlink-escape" };
  }

  const realPosix = "/" + realRelative.split(sep).join("/");
  // 目录请求（如 /src/）的 realpath 不带尾斜杠，两种形式都要过 allowlist。
  if (!isAllowedPath(realPosix) && !isAllowedPath(`${realPosix}/`)) {
    return { status: 403, reason: "symlink-not-allowed" };
  }

  return { filePath: realPath };
}

function serveStatic(request, response) {
  let url;
  try {
    url = new URL(request.url, `http://${request.headers.host || host}`);
  } catch {
    sendText(response, 400, "Bad Request");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendText(response, 400, "Bad Request");
    return;
  }

  const resolved = resolveAllowedStaticPath(pathname);
  if (!resolved.filePath) {
    sendText(response, resolved.status, resolved.status === 403 ? "Forbidden" : "Not Found");
    return;
  }

  let stat;
  try {
    stat = statSync(resolved.filePath);
  } catch {
    sendText(response, 404, "Not Found");
    return;
  }
  if (!stat.isFile()) {
    // 目录请求不列出内容，直接 404。
    sendText(response, 404, "Not Found");
    return;
  }

  try {
    const body = readFileSync(resolved.filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(resolved.filePath)] || "application/octet-stream",
      "Content-Security-Policy": CONTENT_SECURITY_POLICY,
      "Cache-Control": "no-cache",
    });
    response.end(body);
  } catch {
    sendText(response, 500, "Internal Server Error");
  }
}

const server = createServer((request, response) => {
  try {
    const isApiRoute =
      request.url === "/api/parse-screenshot" || request.url?.startsWith("/api/parse-screenshot?");

    if (isApiRoute && request.method === "POST") {
      handleParseScreenshot(request, response);
      return;
    }

    if (isApiRoute && request.method === "GET") {
      sendJson(response, 200, getOcrStatus(loadAiConfig()));
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendText(response, 405, "Method Not Allowed");
      return;
    }

    serveStatic(request, response);
  } catch {
    // 任何单个请求的异常都不允许终止进程。
    sendText(response, 500, "Internal Server Error");
  }
});

server.on("error", (error) => {
  console.error(`开发服务器启动失败：${error.message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`Brotato Number Lab running at http://${host}:${actualPort}（仅绑定回环地址）`);
});