const fs = require("fs");
const path = require("path");

/**
 * setup-hooks.js - Installiert Git Hooks für Calchas
 *
 * Wird automatisch ausgeführt nach `npm install` (postinstall)
 * Kann auch manuell ausgeführt werden: node dev/tools/setup-hooks.js
 */

const ROOT_DIR = path.join(__dirname, "../..");
const HOOKS_SOURCE = path.join(ROOT_DIR, "dev/hooks");
const HOOKS_TARGET = path.join(ROOT_DIR, ".git/hooks");

// Liste der zu installierenden Hooks
const HOOKS = ["pre-commit"];

console.log("");
console.log(
  "═══════════════════════════════════════════════════════════════════════════",
);
console.log("  Calchas: Installing Git Hooks...");
console.log(
  "═══════════════════════════════════════════════════════════════════════════",
);
console.log("");

// Prüfe ob .git existiert (könnte ein Submodule oder kein Git-Repo sein)
if (!fs.existsSync(path.join(ROOT_DIR, ".git"))) {
  console.log("⚠️  No .git directory found - skipping hook installation");
  console.log(
    "   (This is normal for CI/CD environments or npm package installs)",
  );
  process.exit(0);
}

// Stelle sicher, dass hooks Ordner existiert
if (!fs.existsSync(HOOKS_TARGET)) {
  fs.mkdirSync(HOOKS_TARGET, { recursive: true });
}

let installed = 0;
let skipped = 0;

for (const hook of HOOKS) {
  const source = path.join(HOOKS_SOURCE, hook);
  const target = path.join(HOOKS_TARGET, hook);

  if (!fs.existsSync(source)) {
    console.log(`⚠️  Source hook not found: ${hook}`);
    skipped++;
    continue;
  }

  try {
    // Lese Source-Hook
    const content = fs.readFileSync(source, "utf8");

    // Schreibe Target-Hook
    fs.writeFileSync(target, content, { mode: 0o755 });

    console.log(`✓ Installed: ${hook}`);
    installed++;
  } catch (err) {
    console.error(`✗ Failed to install ${hook}: ${err.message}`);
    skipped++;
  }
}

console.log("");
console.log(
  `═══════════════════════════════════════════════════════════════════════════`,
);
console.log(`  ✓ ${installed} hook(s) installed, ${skipped} skipped`);
console.log(
  `═══════════════════════════════════════════════════════════════════════════`,
);
console.log("");

// Erfolg auch wenn keine Hooks installiert wurden (CI/CD)
process.exit(0);
