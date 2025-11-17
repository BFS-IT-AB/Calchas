# Calchas – PWA Weather Forecast with Push Notifications

Calchas ist eine moderne, responsive PWA-Wetterplattform mit Dual-API-Support, Offline-Funktionalität, Push-Benachrichtigungen und erweiterten Features (Favoriten, Einheiten-Umschalter, Wetterkarten, Alerts, historische Daten).

**BFS-IT-Projekt | Team: Max, Robin, Samreen, Yannik, Felix**

## Features

- **🌍 Ortssuche**: Per Nominatim Geocoding (OpenStreetMap)
- **📡 Dual-API-System**: Open-Meteo (Hauptquelle) + BrightSky (Fallback) mit automatischer Retry-Logik
- **📊 Detaillierte Vorhersagen**: Neues Hero-Dashboard mit Sonnenpfad, High/Low-Chips, Taupunkt-, Feuchte-, Wind-, Regen-, UV- und Druckkarten plus 24h-Stundenmatrix direkt im Tagespanel
- **🔄 Offline-First PWA**: Service Worker, App-Shell-Caching, Offline-Modus
- **🔔 Push-Benachrichtigungen**: Lokaler VAPID-basierter Push-Server inkl. Dashboard
- **⭐ Favoriten**: Speichern, Reorder, Undo-Funktion
- **🌡️ Einheiten-Toggle**: Temperatur (°C/°F) und Wind (m/s, km/h, mph) instant auf alle Komponenten angewendet
- **🗺️ Wetterkarten** (optional): Leaflet + OpenStreetMap mit Toolbar, RainViewer-Radar, allen OWM-Overlays und Hover-basiertem MapDataInspector (Temperatur, Niederschlag, AQI u.v.m.)
- **🚨 Wetterwarnungen**: Integration von MeteoAlarm/CAP-Feeds (kostenlos, kein Key)
- **📈 Historische Daten**: 30-Tage-Chart, Monatsvergleich (letzte 4 Monate) und 12-Monats-Trend mit Sparkline & Regenaggregaten (Open-Meteo Archiv)
- **📅 Prognose-Center**: 7-Tage-Kacheln mit einklappbaren Stunden-Details plus "Heute"-Timeline
- **🌙 Hell/Dunkel-Modus**: CSS-Variablen-basiertes Theming
- **♿ Barrierefreiheit**: WCAG 2.1 AA Kontrast, ARIA-Labels, Tastatur-Navigation
- **🌐 Mehrsprachigkeit** (i18n): Deutsch, Englisch (erweiterbar)
- **📊 Analytics & Telemetrie**: Opt-in Dashboard mit Events für Suchanfragen, API-Calls, Cache-Hits, Favoriten und Settings-Aktionen inkl. JSON-Export

## Quick Start

### Voraussetzungen

- Node.js ≥ 14
- npm oder yarn
- Moderner Browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
cd calchas
npm install
npx web-push generate-vapid-keys
```

### Lokale Entwicklung

```bash
# Terminal 1: HTTP-Server
npm install -g http-server
http-server -p 8000 -c-1

# Terminal 2: Push-Server (mit VAPID-Keys)
$env:VAPID_PUBLIC_KEY="<dein-public-key>"
$env:VAPID_PRIVATE_KEY="<dein-private-key>"
node tools/push-server.js
```

Dann öffne `http://localhost:8000` im Browser.

## Push-Benachrichtigungen Setup

1. **VAPID-Keys erzeugen**:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Push-Server starten** (mit Keys in Umgebungsvariablen):

   ```bash
   $env:VAPID_PUBLIC_KEY="<dein-public-key>"
   $env:VAPID_PRIVATE_KEY="<dein-private-key>"
   node tools/push-server.js
   ```

3. **In der App subscriben**:

   - Öffne `http://localhost:8000`
   - Gehe zu **Einstellungen** → **Push-Benachrichtigungen**
   - Klick **Fetch VAPID**
   - Klick **Subscribe** und bestätige die Browser-Anfrage

4. **Test-Push senden**:
   - Öffne `http://localhost:3030/dashboard`
   - Klick "Send Demo Push"

## API-Keys & Externe Integrationen

### Kostenlos (kein API-Key erforderlich)

| API                     | Zweck                                          | Limit                                        |
| ----------------------- | ---------------------------------------------- | -------------------------------------------- |
| **Open-Meteo**          | Hauptvorhersagen (aktuell, stündlich, täglich) | Kostenlos, keine Registrierung               |
| **Nominatim (OSM)**     | Ortssuche & Geocoding                          | Kostenlos; bitte Requests throttlen (~1/sec) |
| **MeteoAlarm/CAP**      | Wetterwarnungen (Regional)                     | Kostenlos, öffentliche Feeds                 |
| **PhaseOfTheMoonToday** | Mondphasen + Moonrise/Moonset-Daten            | Kostenlos (ca. 1.000 Requests/Tag)           |

Dokumentation: https://docs/api-documentation.md

### Optional (mit API-Key)

| API                | Zweck                                 | Registrierung                              | Free Tier        |
| ------------------ | ------------------------------------- | ------------------------------------------ | ---------------- |
| **OpenWeatherMap** | Alternative Vorhersagen, Wetterkarten | https://openweathermap.org/api             | ✓ (60 calls/min) |
| **Meteostat**      | Historische Stationsdaten             | https://meteostat.net/                     | ✓                |
| **VisualCrossing** | Historische & Alternative Vorhersagen | https://www.visualcrossing.com/weather-api | ✓ (Trial)        |

> ℹ️ Die BFS-IT Demo-Builds enthalten wieder eingebackene Default-Keys für **OpenWeatherMap**, **VisualCrossing** und **Meteostat** (siehe `src/app.js` → `bakedInDefaults`). Sie dienen ausschließlich Testzwecken und werden beim ersten Start automatisch gespeichert, sofern der Nutzer noch keine eigenen Keys hat. Für Produktivbetrieb solltest du die Werte im Code ersetzen oder eigene Keys via Runtime-Injektion setzen.

#### Keys Konfigurieren

1. **Umgebungsvariablen** (für Backend/Push-Server):

   ```bash
   $env:OPENWEATHERMAP_KEY="your-key"
   $env:VISUALCROSSING_KEY="your-key"
   $env:METEOSTAT_KEY="your-key"
   ```

2. **In der App** (Frontend):
   - **Einstellungen** → **API-Keys**
   - Keys eingeben (werden – falls möglich – lokal gespeichert; andernfalls für die aktuelle Session gehalten)

> ℹ️ In produktiven Deployments liefert **OpenWeatherMap** (genau wie VisualCrossing & Meteostat) nach wie vor **keine** Demo-Keys mit. Verwende dort deine eigenen Schlüssel über den Einstellungsdialog oder `window.__APP_DEFAULT_API_KEYS`, falls du die in `src/app.js` hinterlegten BFS-Demo-Keys nicht nutzen möchtest.

##### (Optional) Default-Keys per Runtime bereitstellen

Falls du beim Hosten der App eigene Demo-Keys ausrollen möchtest, kannst du vor `app.js` folgenden Snippet einbetten (z. B. in `index.html`):

```html
<script>
  window.__APP_DEFAULT_API_KEYS = {
    openweathermap: "<dein-key>",
    visualcrossing: "<optional>",
    meteostat: "<optional>",
  };
</script>
```

Die Keys werden nur gesetzt, wenn der Nutzer noch keinen eigenen Eintrag gespeichert hat.

## npm Scripts

```bash
npm start              # App auf :8000
npm run push-server   # Push-Server auf :3030
npm test             # Jest Tests
npm run lint         # ESLint Linting
```

## Projektstruktur

```
calchas/
├── src/
│   ├── app.js               # Kernlogik, AppState, Events
│   ├── features.js          # Karten, Alerts, Historie, Analytics
│   ├── index.html           # Hauptlayout & Komponenten-Container
│   ├── style.css            # Globales Styling & Dark Mode
│   ├── service-worker.js    # PWA & Offline-Strategie
│   ├── api/
│   │   ├── weather.js       # Open-Meteo Wrapper
│   │   ├── brightsky.js     # BrightSky Wrapper
│   │   ├── openweathermap.js
│   │   ├── visualcrossing.js
│   │   └── meteostat.js
│   ├── ui/
│   │   ├── alertsPanel.js
│   │   ├── errorHandler.js
│   │   ├── historicalChart.js
│   │   ├── mapComponent.js
│   │   ├── searchInput.js
│   │   └── weatherDisplay.js
│   ├── utils/
│   │   ├── analytics.js
│   │   ├── apiKeyManager.js
│   │   ├── cache.js
│   │   ├── constants.js
│   │   └── validation.js
│   └── i18n/
│       ├── de.json
│       ├── en.json
│       └── helper.js
├── docs/                   # Strukturierter Wissensspeicher
│   ├── README.md           # Dokumentations-Index & Navigationshilfe
│   ├── guides/             # QUICKSTART, setup, SERVER_START
│   ├── api/                # API_INTEGRATION, API_ACCOUNTS, etc.
│   ├── architecture/       # overview.md
│   ├── status/             # FIXES, IMPLEMENTATION_STATUS, ...
│   ├── testing/            # TESTING.md
│   └── legal/              # PRIVACY_POLICY, TERMS_OF_USE
├── tools/
│   ├── http-server.js      # Lokaler Static Server
│   ├── push-server.js      # Push-Backend mit Dashboard
│   └── push-demo.js        # Test-Sender
├── tests/
│   ├── analytics.test.js
│   ├── api.test.js
│   ├── cache.test.js
│   ├── e2e.test.js
│   └── validation.test.js
├── coverage/               # Jest Coverage Reports
├── manifest.json
├── package.json / lock
├── README.md               # Diese Datei
└── LICENSE
```

## Barrierefreiheit (WCAG 2.1 AA)

- ✅ **Kontrast**: Minimum 7:1 für Text, 16:1 für Headings
- ✅ **Tastatur-Navigation**: Alle interaktiven Elemente via Tab/Enter/Arrow erreichbar
- ✅ **ARIA-Labels**: Beschreibungen für Buttons, Icons, Regionen
- ✅ **Focus-Indikatoren**: Sichtbare Outlines für `:focus-visible`
- ✅ **Skip-Links**: "Skip to main content" vor Navigation
- ✅ **Semantische HTML**: `<main>`, `<article>`, `<button>` statt generische `<div>`

Teste mit:

```bash
npm install -g axe-core
# Oder nutze Axe DevTools Browser-Extension
```

## Internationalisierung (i18n)

**Verfügbare Sprachen**: Deutsch (Standard), Englisch

**Translations**:

```
src/i18n/
├── de.json       # Deutsche Übersetzungen
├── en.json       # Englische Übersetzungen
└── helper.js     # Translation-Funktion
```

**Verwendung**:

```javascript
const t = useTranslation("en"); // oder 'de'
const label = t("weather.current"); // "Current Conditions" oder "Aktuelle Bedingungen"
```

**Sprache wechseln**:

- App → **Einstellungen** → **Sprache** → Deutsch/English
- Wird in localStorage gespeichert

## Performance & Optimierung

- **Caching**:
  - Vorhersagen: 30 Min TTL
  - Ortssuche: 7 Tage TTL
  - Service Worker: App-Shell + On-Demand
- **Kompression**: Gzip via HTTP-Server
- **Bundle-Size**: Vanilla JS, keine großen Frameworks (~50KB unminified)
- **Images**: Nur Emoji für Icons (keine Bilder für kritische Pfade)

## Debugging & Troubleshooting

### Service Worker nicht aktiviert

- Überprüfe, ob du `localhost` oder `HTTPS` nutzt
- Browser Console (F12) → **Application** → **Service Workers**
- Hard Refresh: Ctrl+Shift+R

### Push funktioniert nicht

- Push-Server läuft? `node tools/push-server.js`
- VAPID Public Key geholt? **Einstellungen** → "Fetch VAPID"
- Browser Console → **Application** → **Notifications** → Permissions prüfen
- Teste: `curl http://localhost:3030/keys`

### Open-Meteo 400 Error

- Prüfe Browser Console für Response-Snippet
- Überprüfe Koordinaten und Parameter
- Teste manuell: `https://api.open-meteo.com/v1/forecast?latitude=52.5&longitude=13.4&hourly=temperature_2m`

## Deployment

### Statischer Hosting (GitHub Pages, Netlify, Vercel)

```bash
# dist Ordner vorbereiten
mkdir -p dist
cp -r src/* dist/
cp manifest.json dist/
cp service-worker.js dist/

# Hochladen zu GitHub Pages / Netlify
```

### Mit Push-Benachrichtigungen (Production)

1. **Push-Server auf eigenem Server hosten** (Heroku, Railway, DigitalOcean)
2. **Umgebungsvariablen setzen**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
3. **App-Config updaten** (`src/constants.js`): `PUSH_SERVER_URL = "https://dein-domain.com:3030"`
4. **Frontend fragt dann automatisch bei deinem Server nach**

Beispiel Heroku:

```bash
heroku create calchas
heroku config:set VAPID_PUBLIC_KEY="..."
heroku config:set VAPID_PRIVATE_KEY="..."
git push heroku main
```

## Lizenz

[Siehe LICENSE](LICENSE)

## Support & Beiträge

- 🐛 **Bugs melden**: GitHub Issues
- 💡 **Features vorschlagen**: GitHub Discussions
- 🤝 **Beiträge**: Pull Requests willkommen! Bitte gegen `main` Branch.

## Testing & QA

### Automatisierte Tests

```bash
npm test                      # Jest Suite (88 tests, all passing)
npm run test:watch           # Watch mode für Development
```

### Manuelle QA Checkliste

Siehe **`docs/TESTING.md`** für detaillierte QA-Szenarien:

- ✅ Location Search Flow (deutsch/english)
- ✅ Temperature Unit Toggle (°C ↔ °F auf allen Komponenten)
- ✅ Wind Unit Toggle (m/s ↔ km/h ↔ mph)
- ✅ Favorites Management (Add, Remove, Persist)
- ✅ Dark Mode Toggle (WCAG AA Kontrast)
- ✅ Language Switch (i18n de/en)
- ✅ Push Notifications (VAPID, Subscription, Delivery)
- ✅ Offline Mode (Service Worker, Stale-While-Revalidate)
- ✅ 7-Day Forecast (Hourly für erste 3 Tage)
- ✅ Maps Integration (Leaflet + OSM)
- ✅ Weather Alerts (MeteoAlarm CAP Feeds)
- ✅ Historical Data & Charts (Canvas-basierte Visualisierung)
- ✅ Analytics (Opt-in Data Collection)
- ✅ Cache & Verlauf Buttons (Leeren, Undo, Analytics-Logging)
- ✅ Accessibility (WCAG 2.1 AA, Keyboard Nav, Screen Reader)
- ✅ Error Handling (Network, Invalid Input, Rate Limiting)
- ✅ Cross-Browser (Chrome, Firefox, Safari, Edge)
- ✅ PWA Installation (Add to Home Screen)
- ✅ Performance (< 3s initial, < 1s cached)

### Test Coverage

```
Test Suites: 5 passed, 5 total
Tests:       88 passed, 0 failed
Snapshots:   0 total
Time:        0.9s
Components Tested:
  ✅ Cache Manager (smoke tests)
  ✅ Analytics Module (smoke tests)
  ✅ Validation Helpers (smoke tests)
  ✅ API Formatters (smoke tests)
  ✅ E2E Workflows (88 smoke tests covering all features)
```

### Browser Compatibility

| Browser | Version | Light Mode | Dark Mode | Offline | Push | Notes                          |
| ------- | ------- | ---------- | --------- | ------- | ---- | ------------------------------ |
| Chrome  | 90+     | ✅         | ✅        | ✅      | ✅   | Vollständige PWA-Unterstützung |
| Firefox | 88+     | ✅         | ✅        | ✅      | ⚠️   | Push über Firefox möglich      |
| Safari  | 14+     | ✅         | ✅        | ✅      | ⚠️   | PWA-Support begrenzt           |
| Edge    | 90+     | ✅         | ✅        | ✅      | ✅   | Chromium-basiert, vollständig  |

### Accessibility Audit

```
WCAG 2.1 Level AA Compliance:
✅ Contrast: 7:1 body text, 16:1 headings
✅ Keyboard Navigation: Tab, Enter, Space
✅ Screen Reader: Semantic HTML, ARIA labels
✅ Focus Indicators: 3px outline visible
✅ Touch Targets: 44x44px minimum buttons
✅ Color Not Only: Alerts use icons + colors
✅ Motion: No auto-playing animations
```

---

**Viel Spaß mit Calchas!** 🌤️
