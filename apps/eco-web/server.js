/**
 * Serves API routes plus static UI from dist/public (after build) or public/ (dev).
 * Kubernetes-oriented: optional mounted JSON config, env-driven settings, /data volume stamp.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8080;
const SERVICE_NAME = process.env.SERVICE_NAME || "eco-web";
const CONFIG_MOUNT_PATH = process.env.CONFIG_MOUNT_PATH || "/config";
const CONFIG_FILE_NAME = process.env.CONFIG_FILE_NAME || "app-config.json";
const DATA_DIR = process.env.DATA_DIR || "/data";
const REQUIRE_CONFIG_FILE = String(process.env.REQUIRE_CONFIG_FILE || "").toLowerCase() === "true";

/** Plain env (often from ConfigMap env CM or Helm values). */
const DEPLOYMENT_ENV = process.env.DEPLOYMENT_ENV || "";
const PUBLIC_BANNER = process.env.PUBLIC_BANNER || "";

const DIST_STATIC = path.join(__dirname, "dist", "public");
const DEV_STATIC = path.join(__dirname, "public");
const STATIC_ROOT = fs.existsSync(DIST_STATIC) ? DIST_STATIC : DEV_STATIC;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

let fileConfig = {};
let configLoaded = false;
let dataDirWritable = false;

function configFilePath() {
  return path.join(CONFIG_MOUNT_PATH, CONFIG_FILE_NAME);
}

function tryLoadFileConfig() {
  const fp = configFilePath();
  try {
    const raw = fs.readFileSync(fp, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      fileConfig = parsed;
      configLoaded = true;
      return true;
    }
  } catch {
    // missing file, parse error, or unreadable
  }
  if (!REQUIRE_CONFIG_FILE) {
    configLoaded = true;
  }
  return false;
}

function tryWriteDataStamp() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      return;
    }
    const stamp = path.join(DATA_DIR, "startup.txt");
    fs.writeFileSync(
      stamp,
      `startedAt=${new Date().toISOString()}\nport=${PORT}\nservice=${SERVICE_NAME}\n`,
      { flag: "w" }
    );
    dataDirWritable = true;
  } catch {
    dataDirWritable = false;
  }
}

if (REQUIRE_CONFIG_FILE) {
  tryLoadFileConfig();
  if (!configLoaded) {
    const t = setInterval(() => {
      if (tryLoadFileConfig()) {
        clearInterval(t);
      }
    }, 2000);
  }
} else {
  tryLoadFileConfig();
  if (!configLoaded) {
    configLoaded = true;
  }
}

tryWriteDataStamp();

function safeJoin(root, requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath.split("?")[0]);
  } catch {
    return null;
  }
  const rel = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  if (!rel || rel.includes("\0")) {
    return null;
  }
  const base = path.resolve(root);
  const full = path.resolve(base, rel);
  const relToBase = path.relative(base, full);
  if (relToBase.startsWith("..") || path.isAbsolute(relToBase)) {
    return null;
  }
  return full;
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
  });
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];

  if (urlPath === "/health" || urlPath === "/healthz") {
    json(res, 200, {
      status: "ok",
      service: SERVICE_NAME,
      uptimeSeconds: Math.round(process.uptime()),
      configLoaded,
      requireConfigFile: REQUIRE_CONFIG_FILE,
      dataDirWritable,
      deploymentEnv: DEPLOYMENT_ENV || undefined,
    });
    return;
  }

  if (urlPath === "/ready") {
    const ready = !REQUIRE_CONFIG_FILE || configLoaded;
    res.writeHead(ready ? 200 : 503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(ready ? "ready" : "not ready");
    return;
  }

  if (urlPath === "/api/runtime") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method not allowed");
      return;
    }
    const payload = {
      service: SERVICE_NAME,
      port: PORT,
      deploymentEnv: DEPLOYMENT_ENV || null,
      publicBanner: PUBLIC_BANNER || null,
      configPath: path.join(CONFIG_MOUNT_PATH, CONFIG_FILE_NAME),
      configLoaded,
      fileConfig,
      dataDir: DATA_DIR,
      dataDirWritable,
    };
    if (req.method === "HEAD") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end();
      return;
    }
    json(res, 200, payload);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
    return;
  }

  let filePath = safeJoin(STATIC_ROOT, urlPath);
  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad path");
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (!err && st.isDirectory()) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }
    if (err || !st.isFile()) {
      if (urlPath !== "/" && !path.extname(urlPath)) {
        const indexFallback = safeJoin(STATIC_ROOT, "/index.html");
        if (indexFallback) {
          serveFile(indexFallback, res);
          return;
        }
      }
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<!DOCTYPE html><title>404</title><p>Not found.</p>");
      return;
    }
    if (req.method === "HEAD") {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end();
      return;
    }
    serveFile(filePath, res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const mode = STATIC_ROOT === DIST_STATIC ? "production (dist/public)" : "development (public)";
  console.log(`${SERVICE_NAME} listening on http://0.0.0.0:${PORT} — static: ${mode}`);
});
