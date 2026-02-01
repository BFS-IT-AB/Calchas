const fs = require("fs");
const path = require("path");

// Version aus manifest.json lesen
const manifestPath = path.join(__dirname, "../../manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const appVersion = manifest.version;

if (!appVersion) {
  console.error("❌ Error: No version field found in manifest.json");
  process.exit(1);
}

// Timestamp generieren
const now = new Date();
const timestamp = now
  .toISOString()
  .replace(/T/, "-")
  .replace(/\..+/, "")
  .replace(/:/g, "")
  .slice(0, 15); // Format: 2026-02-01-1753

const buildId = timestamp;
const cacheName = `calchas-${buildId}`;

// service-worker.js updaten
const swPath = path.join(__dirname, "../../service-worker.js");
let sw = fs.readFileSync(swPath, "utf8");

// APP_VERSION aktualisieren
sw = sw.replace(
  /const APP_VERSION = ["'].*?["'];/,
  `const APP_VERSION = "${appVersion}";`,
);

// CACHE_NAME aktualisieren
sw = sw.replace(
  /const CACHE_NAME = ["']calchas-.*?["'];/,
  `const CACHE_NAME = "${cacheName}";`,
);

fs.writeFileSync(swPath, sw);

console.log("✓ Version synchronization complete:");
console.log(`  App Version: ${appVersion}`);
console.log(`  Build ID: ${buildId}`);
console.log(`  Cache Name: ${cacheName}`);
console.log("");
console.log("✓ service-worker.js updated");
