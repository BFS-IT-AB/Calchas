const fs = require("fs");
const path = require("path");

/**
 * sync-version.js - Zentrale Versionssynchronisierung für Calchas
 *
 * Synchronisiert Versionen zwischen:
 * - manifest.json (SOURCE OF TRUTH für APP_VERSION)
 * - service-worker.js (Cache-Version und Build-ID)
 *
 * BUILD-ID wird bei JEDEM Aufruf neu generiert (Timestamp)
 * APP_VERSION wird nur manuell in manifest.json geändert
 *
 * Wird ausgeführt:
 * - Manuell: npm run version-sync
 * - Automatisch: Git pre-commit Hook
 * - Bei Deploy: npm run pre-deploy
 */

const ROOT_DIR = path.join(__dirname, "../..");

// ═══════════════════════════════════════════════════════════════════════════
// 1. VERSION AUS MANIFEST.JSON LESEN (Single Source of Truth)
// ═══════════════════════════════════════════════════════════════════════════
const manifestPath = path.join(ROOT_DIR, "manifest.json");
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (err) {
  console.error("❌ Error: Could not read manifest.json:", err.message);
  process.exit(1);
}

const appVersion = manifest.version;

if (!appVersion) {
  console.error("❌ Error: No version field found in manifest.json");
  process.exit(1);
}

// Validate version format (SemVer with optional pre-release tag)
const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
if (!semverRegex.test(appVersion)) {
  console.warn(
    `⚠️ Warning: Version "${appVersion}" doesn't follow strict SemVer format`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. BUILD-ID GENERIEREN (Timestamp für Cache-Invalidierung)
// ═══════════════════════════════════════════════════════════════════════════
const now = new Date();
const timestamp = now
  .toISOString()
  .replace(/T/, "-")
  .replace(/\..+/, "")
  .replace(/:/g, "")
  .slice(0, 15); // Format: 2026-02-01-1753

const buildId = timestamp;
const cacheName = `calchas-${buildId}`;

// ═══════════════════════════════════════════════════════════════════════════
// 3. SERVICE-WORKER.JS AKTUALISIEREN
// ═══════════════════════════════════════════════════════════════════════════
const swPath = path.join(ROOT_DIR, "service-worker.js");
let sw;
try {
  sw = fs.readFileSync(swPath, "utf8");
} catch (err) {
  console.error("❌ Error: Could not read service-worker.js:", err.message);
  process.exit(1);
}

const originalSw = sw;

// APP_VERSION aktualisieren
const versionPattern = /const APP_VERSION = ["'].*?["'];/;
sw = sw.replace(versionPattern, `const APP_VERSION = "${appVersion}";`);

// CACHE_NAME aktualisieren
const cachePattern = /const CACHE_NAME = ["']calchas-.*?["'];/;
sw = sw.replace(cachePattern, `const CACHE_NAME = "${cacheName}";`);

// Validierung: Prüfe ob Replacements erfolgreich waren
const versionCheck = new RegExp(
  `const APP_VERSION = "${appVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}";`,
);
const cacheCheck = new RegExp(`const CACHE_NAME = "${cacheName}";`);

if (!versionCheck.test(sw)) {
  console.error("❌ Error: APP_VERSION replacement failed!");
  console.error("   Expected:", `const APP_VERSION = "${appVersion}";`);
  process.exit(1);
}

if (!cacheCheck.test(sw)) {
  console.error("❌ Error: CACHE_NAME replacement failed!");
  console.error("   Expected:", `const CACHE_NAME = "${cacheName}";`);
  process.exit(1);
}

// Prüfe ob tatsächlich Änderungen gemacht wurden
const hasChanges = sw !== originalSw;

// Speichern
try {
  fs.writeFileSync(swPath, sw);
} catch (err) {
  console.error("❌ Error: Could not write service-worker.js:", err.message);
  process.exit(1);
}

console.log("");
console.log(
  "═══════════════════════════════════════════════════════════════════════════",
);
console.log("✓ VERSION SYNCHRONIZATION COMPLETE");
console.log(
  "═══════════════════════════════════════════════════════════════════════════",
);
console.log(`  📦 App Version:  ${appVersion} (from manifest.json)`);
console.log(`  🔖 Build ID:     ${buildId}`);
console.log(`  📁 Cache Name:   ${cacheName}`);
console.log("");

if (hasChanges) {
  console.log("📝 Updated files:");
  console.log("   - service-worker.js");
  console.log("");
  console.log("⚠️  Don't forget to commit these changes!");
} else {
  console.log(
    "ℹ️  service-worker.js was already up-to-date (BUILD_ID refreshed)",
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. CHANGELOG VERSION PRÜFEN (Optional - nur Warnung)
// ═══════════════════════════════════════════════════════════════════════════
const changelogPath = path.join(ROOT_DIR, "js/config/changelog.js");
if (fs.existsSync(changelogPath)) {
  const changelog = fs.readFileSync(changelogPath, "utf8");
  const changelogVersionMatch = changelog.match(
    /const APP_VERSION = ["'](.+?)["']/,
  );
  if (changelogVersionMatch && changelogVersionMatch[1] !== appVersion) {
    console.warn("");
    console.warn(
      `⚠️ Warning: changelog.js has different version (${changelogVersionMatch[1]})`,
    );
    console.warn(`   Consider updating to match manifest.json (${appVersion})`);
  }
}
