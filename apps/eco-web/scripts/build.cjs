/**
 * Production build: copies public/ → dist/public/ and stamps build metadata into index.html.
 * No npm dependencies beyond Node.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "public");
const outDir = path.join(root, "dist", "public");

if (!fs.existsSync(srcDir)) {
  console.error("Missing public/ directory.");
  process.exit(1);
}

fs.rmSync(path.join(root, "dist"), { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.cpSync(srcDir, outDir, { recursive: true });

const indexPath = path.join(outDir, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
const stamp = new Date().toISOString();
html = html.replace(
  "<!--BUILD_META-->",
  `<meta name="build" content="${stamp}" />`
);
fs.writeFileSync(indexPath, html);

console.log(`Build complete → ${path.relative(root, outDir)} (${stamp})`);
