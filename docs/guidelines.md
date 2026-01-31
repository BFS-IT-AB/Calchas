# Calchas Project Guidelines

Diese Datei fasst alle wesentlichen Projektinformationen zusammen und dient als zentrale Anlaufstelle für Entwickler und Beteiligte.

Hinweis (intern): Diese Leitlinie ist ausschließlich für Entwickler/Contributor gedacht. Nutzerinformationen, Downloads und App-Hinweise stehen in der Benutzer-README unter `README.md`.

## 0. Navigation & Index (intern)

- Überblick & Kern-Features: Abschnitt 1
- Tech-Stack & Befehle: Abschnitt 2–3
- Setup & Workflow: Abschnitt 4
- Struktur & Architektur: Abschnitt 5–6
- Rechtliches & Links: Abschnitt 7–8
- Engineering-Guidelines: Abschnitt 9–18

---

## 1. Über das Projekt (What's it about?)

**Calchas** ist eine moderne Progressive Web App (PWA) für Wetterdaten, die besonderen Wert auf Zuverlässigkeit, Offline-Fähigkeit und umfassende Features legt.

### Kern-Features

- **Dual-API-Strategie:** Open-Meteo (Primär) und BrightSky (Fallback) für maximale Verfügbarkeit.
- **Wetterdaten:** Aktuell, Stündlich, 7-Tage-Vorhersage, Historie.
- **Visualisierung:** Leaflet-Karten (Wetter, Warnungen), Historische Verlaufsgrafiken, Analytics-Dashboard.
- **PWA:** Installierbar, Offline-Cache (Service Worker), Push-Benachrichtigungen.
- **Personalisierung:** Favoriten, Dark/Light Mode, API-Key-Management.

**Aktuelle Version:** 0.7.0-alpha (Status: Alpha Release)

---

## 2. Tech-Stack

Das Projekt setzt bewusst auf Standards ohne schwere Frameworks:

- **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3 (Grid/Flexbox).
- **Backend:** Node.js (für HTTP-Serving und Push-Notification Server).
- **Bibliotheken:**
  - `Leaflet` (Karten)
  - `Chart.js` (implizit für Graphen genutzt oder ähnliche Logik)
  - `@rive-app/canvas` (Animationen)
- **Testing:** Jest (Unit & Integration Tests), ESLint (Code Quality).
- **Infrastruktur:** Service Worker für Offline-Support, `web-push` für Benachrichtigungen.

---

## 3. Wichtige Befehle (Commands)

Alle Befehle werden aus dem Root-Verzeichnis ausgeführt.

### Start & Development

```bash
# Abhängigkeiten installieren
npm install

# App starten (HTTP Server auf Port 8000)
npm start

# Development Server (mit Cache-Deaktivierung -c-1)
npm run dev

# Push-Notification Server starten (Port 3001)
npm run push-server
```

### Testing & Quality

```bash
# Alle Tests ausführen (mit Coverage)
npm test

# Tests im Watch-Mode (während der Entwicklung)
npm run test:watch

# Code-Linting durchführen und fixen
npm run lint

# Pre-Deployment Check
npm run predeploy
```

---

## 4. Setup & Workflow

### Initiales Setup

1.  Repository klonen.
2.  `npm install` ausführen.
3.  `npm start` starten und `http://localhost:8000` öffnen.

### API Keys

Die App kommt mit Demo-Keys (`src/app.js`), die für lokale Tests funktionieren.

- **Management:** Keys können über das UI (Einstellungen) oder `src/utils/apiKeyManager.js` verwaltet werden.
- **Integration:**
  - **Open-Meteo & BrightSky:** Keine Keys benötigt (Free/Public endpoints).
  - **OpenWeatherMap, VisualCrossing, Meteostat:** Keys optional für erweiterte Daten (One Call API, Historie).

### Development Workflow

1.  Code-Änderung in `src/`.
2.  Browser Refresh (App lädt Änderungen dank ES Modules direkt).
3.  Tests schreiben/anpassen in `tests/` oder `src/__tests__/`.
4.  Linter laufen lassen.

---

## 5. Projektstruktur

```
src/
├── api/            # API-Klassen (weather.js, brightsky.js, etc.)
├── ui/             # UI-Komponenten (weatherDisplay.js, mapComponent.js)
├── utils/          # Hilfsfunktionen (apiKeyManager.js, cache.js)
├── config/         # Konfigurationen
├── assets/         # Icons, Bilder, Screenshots
├── app.js          # Haupteinstiegspunkt
└── service-worker.js # PWA Offline-Logik

tools/              # Server-Scripte (http-server.js, push-server.js)
tests/              # E2E und Unit Tests
docs/               # Dokumentation
```

---

## 6. Architektur & APIs

### Dual-API Prinzip

Die App fragt primär Open-Meteo ab. Schlägt dies fehl oder liefert keine Daten, wird nahtlos auf BrightSky (DWD Daten) umgeschaltet.

- **Implementation:** `src/app.js` steuert den Fallback-Mechanismus.
- **Error Handling:** `src/ui/errorHandler.js` managed Retries und User-Feedback.

### Push Notifications

- Benötigt laufenden Push-Server (`npm run push-server`).
- VAPID Keys werden automatisch generiert/verwaltet.
- Frontend registriert Subscription via Service Worker.

---

## 7. Rechtliches (Legal)

Die App enthält Vorlagen für rechtliche Texte, die in `src/` verlinkt/genutzt werden:

- **Datenschutz:** Siehe Privacy Policy in der App.
- **Nutzungsbedingungen:** Siehe Terms of Use in der App.

---

## 8. Hilfreiche Links & Status

- **API Testing:** `http://localhost:8000/docs/api/QUICK_TEST_API.md` (lokal prüfen).
- **Coverage:** `coverage/lcov-report/index.html` öffnen für Test-Details.
- **Troubleshooting:**
  - Leaflet Karte lädt nicht? → Internetverbindung/CDN prüfen.
  - VAPID Key fehlt? → Push-Server Neustart & App Reload.

---

_Zuletzt aktualisiert: 24.01.2026 – Bereinigt und um praxisnahe Guidelines erweitert._

---

## 9. Coding Standards

- **Sprachstil:** Moderne ES6+ Module, keine Frameworks. Bevorzuge reine Funktionen und kleine, gut benannte Module.
- **Linting:** ESLint ist verbindlich. Vor jedem Commit `npm run lint` ausführen; Fehler müssen behoben sein.
- **Namenskonventionen:**
  - Dateien: `kebab-case.js` für Module, `PascalCase.js` für Klassen/Komponenten.
  - Funktionen/Variablen: `camelCase`; Konstanten: `UPPER_SNAKE_CASE` nur für globale Build-Flags.
- **Imports:** Relative Pfade innerhalb von `src/` mit klaren Ordnern (`api/`, `ui/`, `utils/`). Keine zyklischen Abhängigkeiten.
- **Style/CSS:** Mobile-first; nutze CSS-Variablen und vermeide Inline-Styles.

---

## 10. Git Workflow

- **Branches:**
  - `main` (stabil),
  - `feature/<kurz-beschreibung>` für Features,
  - `fix/<bug-id>` für Hotfixes.
- **Commits:** Nutze Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). Kurze präzise Messages.
- **Pull Requests:** Klein halten (< ~300 LoC), Tests & Lint müssen grün sein. PR-Checkliste siehe unten.
- **Reviews:** Mind. 1 Review, Fokus auf Lesbarkeit, Tests, Sicherheitsaspekte.
- **Changelog:** Änderungen und Versionen werden in `src/config/changelog.js` gepflegt. Eine detaillierte Anleitung zum Erstellen neuer Backlog/Updatekarten befindet sich direkt im Header dieser Datei.

---

## 11. Testing & QA Richtlinien

- **Abdeckung:** Relevante Logik in `utils/` und `api/` mit Unit-Tests, UI-Renderer mit Smoke-Tests.
- **Pflichtbefehle:** `npm test` muss grün sein; bei UI-Änderungen Screenshots im PR anhängen (optional).
- **Coverage:** Ziel > 70% statements/branches. Kritische Pfade (Caching, Fallback) bevorzugt testen.
- **Fehlerfälle:** Tests für API-Fallbacks, Offline-Zustände, ungültige Eingaben.

---

## 12. Accessibility & i18n

- **A11y:** Semantische HTML-Struktur, ausreichende Kontraste, Fokuszustände, ARIA nur wo nötig.
- **Tastaturbedienung:** Alle interaktiven Elemente müssen per Tab erreichbar sein.
- **i18n:** Texte kommen aus `src/i18n/*.json`. Keine harten Strings im Code. Deutsch/Englisch vollständig halten.

---

## 13. Security & Privacy

- **API Keys:** Niemals hartkodieren; Nutzung über `apiKeyManager` oder Umgebungsvariablen im lokalen Umfeld.
- **Speicherung:** Nur notwendige Daten (`favorites`, `settings`, Cache). Keine personenbezogenen Daten.
- **Push:** VAPID-Schlüssel sicher handhaben; keine Weitergabe an Dritte.
- **Dependencies:** Regelmäßig `npm audit` prüfen; kritische CVEs zeitnah beheben.

---

## 14. Performance & PWA

- **Caching:** Service Worker nur für statische Assets und stabile API-Responses; Stale-While-Revalidate wo sinnvoll.
- **Lazy Loading:** Karten/History nur initialisieren, wenn Sichtbar.
- **Netzwerk:** Fallback-Strategie strikt beibehalten (Open-Meteo → BrightSky). Timeouts und Retries angemessen.
- **Assets:** Bilder/WebP, Icons als SVG, Fonts sparsam.

---

## 15. Fehlerbehandlung & Logging

- **Fehleranzeigen:** Nutzerfreundliche Meldungen via `ui/errorHandler.js`.
- **Retries:** Begrenzte Wiederholungen mit Backoff bei Netzwerkfehlern.
- **Analytics:** Nur aggregierte, nicht-personenbezogene Nutzungsdaten; Opt-out respektieren.

---

## 16. Releases & Versionierung

- **Versioning:** SemVer (`MAJOR.MINOR.PATCH`). Release-Notes in `src/config/changelog.js` pflegen.
- **Predeploy:** `npm run predeploy` vor Release ausführen (Lint, Tests, PWA-Checks).
- **Tagging:** Git-Tags für Releases (`v0.2.0`).

---

## 17. PR-Checkliste

- Tests grün (`npm test`).
- Linting fehlerfrei (`npm run lint`).
- Keine sensiblen Daten/Keys im Code.
- A11y geprüft (Fokus, Kontrast, Labels).
- i18n-Support vorhanden (Deutsch/Englisch).
- Screens/Flows manuell getestet (Home, Karten, Settings).

---

## 18. Ownership & Kontakt

- Maintainer: felixontv, MaxBexa4, Robink53, yannickraabe4-stack
- Rechtliches: Siehe `legal/privacy.html` und `legal/terms.html`.
- Fragen/Issues: bitte im Repo als Issue anlegen.
