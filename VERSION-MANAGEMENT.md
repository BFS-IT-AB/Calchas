# Version Management System

## Überblick
Calchas verwendet ein Dual-Versioning System:
- **APP_VERSION** (SemVer): Für Major/Minor Releases (z.B. `0.7.0-alpha`)
- **BUILD_ID** (Timestamp): Für jeden Deploy/Bugfix (z.B. `2026-02-01-1753`)

## Single Source of Truth: manifest.json

Die Version wird **nur einmal** in `manifest.json` gepflegt:

```json
{
  "name": "Calchas - Aktuelle Wetterdaten",
  "short_name": "Calchas",
  "version": "0.7.0-alpha",
  ...
}
```

## Workflow

### 1. Version ändern (bei Releases)
```bash
# Öffne manifest.json und ändere "version"
"version": "0.7.1-alpha"
```

### 2. Service Worker synchronisieren
```bash
npm run version-sync
```

**Was passiert:**
- Liest Version aus `manifest.json`
- Generiert automatisch neuen Timestamp für `BUILD_ID`
- Aktualisiert `service-worker.js`:
  ```javascript
  const APP_VERSION = "0.7.1-alpha";
  const CACHE_NAME = "calchas-2026-02-01-1753";
  const BUILD_ID = "2026-02-01-1753";
  ```

### 3. Deploy vorbereiten
```bash
npm run pre-deploy
```

**Was passiert:**
- Führt `version-sync` aus
- Fügt `service-worker.js` automatisch zu Git hinzu

### 4. Commit & Push
```bash
git commit -m "chore: bump version to 0.7.1-alpha"
git push origin main
```

## Versionsanzeige in der App

Die Version wird **dynamisch** vom Service Worker geladen und im **"Über Calchas"** Dialog angezeigt:

```
Calchas
v0.7.0-alpha
Build: 01.02.26 17:53
```

### Technische Details

**1. Version Service** (`js/utils/version.js`)
```javascript
import { getVersionInfo } from './utils/version.js';

const versionInfo = await getVersionInfo();
// {
//   appVersion: "0.7.0-alpha",
//   buildId: "2026-02-01-1753",
//   cacheVersion: "calchas-2026-02-01-1753"
// }
```

**2. Service Worker Message Handler**
```javascript
self.addEventListener('message', (event) => {
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      appVersion: APP_VERSION,
      buildId: BUILD_ID,
      cacheVersion: CACHE_NAME
    });
  }
});
```

## Best Practices

### ❌ Nicht machen
```javascript
// Service Worker NICHT manuell bearbeiten
const APP_VERSION = "0.7.0-alpha"; // ❌ Nicht hier ändern
const CACHE_NAME = "calchas-2026-02-01-1753"; // ❌ Nicht hier ändern
```

### ✅ Immer so
```bash
# 1. manifest.json bearbeiten
# 2. npm run version-sync
# 3. git commit & push
```

## Bei jedem Bugfix

**Problem:** Nach Bugfix wird alter Cache verwendet!

**Lösung:** Automatisch durch `version-sync`
```bash
npm run version-sync
# Generiert neuen CACHE_NAME mit aktuellem Timestamp
# Browser verwirft alten Cache beim nächsten Laden
```

## Vorteile

✅ **Eine Quelle der Wahrheit** - Version nur in `manifest.json`  
✅ **Automatische Cache-Invalidierung** - Jeder Deploy = neuer Cache  
✅ **Keine manuellen Fehler** - Script übernimmt Synchronisation  
✅ **Build-Tracking** - Genauer Timestamp jedes Builds  
✅ **Dynamische Anzeige** - Echte Version direkt vom Service Worker  

## Scripts

| Script | Befehl | Zweck |
|--------|--------|-------|
| `version-sync` | `node dev/tools/sync-version.js` | Synchronisiert Version von manifest.json → service-worker.js |
| `pre-deploy` | `npm run version-sync && git add service-worker.js` | Deploy-Vorbereitung |
| `predeploy` | `npm test && npm run lint` | Pre-Deploy Checks |

## Beispiel Workflow

```bash
# Neues Feature entwickelt
git add .
git commit -m "feat: neue Funktion XYZ"

# Version erhöhen in manifest.json
# "version": "0.7.1-alpha"

# Service Worker aktualisieren
npm run version-sync
# ✓ App Version: 0.7.1-alpha
# ✓ Build ID: 2026-02-01-1815
# ✓ Cache Name: calchas-2026-02-01-1815

# Commit
git add manifest.json service-worker.js
git commit -m "chore: bump version to v0.7.1-alpha"
git push origin main
```

## Debugging

### Version prüfen (Browser Console)
```javascript
// Im Browser
const mc = new MessageChannel();
mc.port1.onmessage = (e) => console.log(e.data);
navigator.serviceWorker.controller.postMessage(
  { type: 'GET_VERSION' },
  [mc.port2]
);
// Output: { appVersion: "0.7.0-alpha", buildId: "2026-02-01-1753", ... }
```

### Service Worker Version prüfen
```javascript
// service-worker.js aktivieren und Console checken
// ✓ App Version: 0.7.0-alpha
// ✓ Build ID: 2026-02-01-1753
// ✓ Cache Name: calchas-2026-02-01-1753
```

## Deployment Checklist

- [ ] Features entwickelt
- [ ] Tests laufen durch (`npm test`)
- [ ] Lint-Fehler behoben (`npm run lint`)
- [ ] Version in `manifest.json` erhöht
- [ ] `npm run version-sync` ausgeführt
- [ ] Beide Dateien committet (`manifest.json`, `service-worker.js`)
- [ ] Gepusht (`git push origin main`)
- [ ] Nach Deploy: Cache-Invalidierung im Browser prüfen
