# Calchas Developer Dashboard – Architektur & Zieldefinition

## 1. Zweck des Developer Dashboards

Das Developer Dashboard von Calchas ist ein **internes Entwickler-Cockpit** für eine Progressive Web App.
Es dient **nicht** als Feature-Spielerei, sondern als zentrales Werkzeug für:

- Systemverständnis
- Debugging
- Monitoring
- Validierung
- Testen von Grenz- und Fehlerfällen

Das Dashboard soll beantworten:
- Was passiert gerade?
- Warum ist dieser Zustand entstanden?
- Wie zuverlässig sind Daten und Systeme?
- Wie reagiert die App unter Stress oder Fehlerbedingungen?

---

## 2. Zielgruppe

Primäre Zielgruppe:
- Core-Developer
- Maintainer
- Contributor mit technischen Rechten

Sekundäre Zielgruppe:
- Power-User / Tester (eingeschränkter Modus)

Nicht-Zielgruppe:
- Endnutzer

Ein Großteil der Funktionen ist **Dev-only** und darf niemals im normalen User-Mode erscheinen.

---

## 3. Design- & Architekturprinzipien

- Klare Trennung zwischen:
  - Beobachten (Read-only)
  - Eingreifen (Actions)
  - Erklären (Systemlogik & Ursachen)
- Keine redundanten Informationen über mehrere Tabs hinweg
- Jeder Tab beantwortet **eine klare Entwicklerfrage**
- Dashboard = Cockpit, nicht Feature-Liste
- Bestehende Funktionen werden integriert, nicht doppelt implementiert

---

## 4. Finale Tab-Struktur

---

## Tab 1 — Overview

### Zweck
Schneller Überblick über den aktuellen Gesamtzustand der App.

### Bringt
- Sofortige Einschätzung: „Ist das System gesund?“
- Kontext für alle weiteren Debugging-Schritte

### Inhalte
- Globaler Systemstatus:
  - Healthy / Degraded / Offline
- App-Informationen:
  - App-Version
  - Build-ID
  - optional Commit-Hash
- Aktueller App-State:
  - idle / fetching / offline / fallback
- Netzwerkstatus:
  - online / offline
  - Verbindungstyp
- Performance-Snapshot:
  - FPS
  - Memory Usage
- Aktiver Datenmodus:
  - live / cached / estimated
- Sichere Quick Actions:
  - Logs exportieren
  - Diagnostics öffnen

### Nicht enthalten
- Detailstatus einzelner Services
- Cache-Details
- Logs oder Error-Listen

---

## Tab 2 — Runtime & State

### Zweck
Verstehen, wie die App intern denkt und in welchem logischen Zustand sie sich befindet.

### Bringt
- Erklärung für UI-Zustände
- Transparenz über State-Machine und Lifecycle

### Inhalte
- Globaler App-State (State Machine)
- App-Lifecycle:
  - Laufzeit seit Start
  - letzter Reload
- Feature-States:
  - Forecast geladen?
  - Radar aktiv?
  - Health aktiv?
- Error-Zustände:
  - aktive Fehler
  - stille Fehler
  - Recoveries
- Abgeleitete Zustände:
  - z. B. „Offline, aber funktional“

---

## Tab 3 — Service Worker

### Zweck
Zentrales Kontrollzentrum für Offline-Funktionalität, Updates und Caching.

### Bringt
- Verlässliches Debugging von PWA-spezifischen Problemen
- Kontrolle über Update-Zyklen

### Inhalte
- Service-Worker-Status:
  - installiert / wartend / aktiv
  - skipWaiting aktiv?
- SW-Version & Build-ID
- Scope & Client-Bindung:
  - Anzahl verbundener Clients
- Event-Historie:
  - install
  - activate
  - fetch
- Aktionen:
  - skipWaiting triggern
  - Cache validieren
  - SW-Caches löschen
  - Diagnostics

### Regel
Alle Service-Worker-relevanten Informationen existieren ausschließlich hier.

---

## Tab 4 — Capabilities

### Zweck
Transparenz über tatsächliche Geräte- und Browserfähigkeiten.

### Bringt
- Erklärung für geräteabhängige Bugs
- Klarheit über Fallbacks und Einschränkungen

### Inhalte
- Feature-Matrix:
  - Background Sync
  - Periodic Sync
  - Push
  - Geolocation
  - Sensor APIs
- Permission-Status:
  - granted / denied / prompt
- Storage:
  - persistent storage granted?
  - quota
- Aktive Fallbacks
- Plattform-Einschränkungen:
  - Private Mode
  - iOS-Limits

---

## Tab 5 — Data & APIs

### Zweck
Verstehen, wo Wetterdaten herkommen und wie vertrauenswürdig sie sind.

### Bringt
- Einschätzung der Datenqualität
- Transparenz über API-Ausfälle und Fallbacks

### Inhalte
- Status aller angebundenen APIs
- Pro Datenquelle:
  - Quelle
  - letzter Fetch
  - Alter
  - TTL
  - Status: fresh / stale / expired
- Datenpfad:
  - API → Cache → UI
- API Error-Rates
- API-Test-Tool:
  - manuelle Requests
  - Response-Inspektion

### Nicht enthalten
- Cache-Struktur oder Storage-Details

---

## Tab 6 — Cache & Storage

### Zweck
Analyse und Kontrolle aller persistenten Daten.

### Bringt
- Debugging von Caching- und Speicherproblemen
- Kontrolle über Speicherverbrauch

### Inhalte
- Cache-Übersicht:
  - Name
  - Typ
  - Größe
  - Anzahl Einträge
- Cache-Inspektor:
  - Inhalte anzeigen
- Gezieltes Löschen einzelner Caches
- Storage Inspector:
  - LocalStorage
  - SessionStorage
  - Cookies
- Größenangaben pro Storage-Bucket

---

## Tab 7 — Errors & Logs

### Zweck
Fehler nicht nur sehen, sondern verstehen.

### Bringt
- Kontextualisiertes Debugging
- Nachvollziehbare Fehlerhistorie

### Inhalte
- Error Timeline:
  - Quelle (App / Service Worker / API)
  - First seen / Last seen
  - Häufigkeit
  - Severity
- Filter & Gruppierung
- Live Console:
  - Log / Warn / Error / Info
- Export:
  - Debug als JSON
  - Console als TXT

---

## Tab 8 — Simulation

### Zweck
Testen von Grenz- und Fehlerfällen.

### Bringt
- Validierung von Fallbacks
- Resilienz-Tests

### Inhalte
- Offline-Simulation
- Slow-Network-Simulation
- API-Fehler erzwingen
- Cache-Korruption simulieren
- Feature-Deaktivierung

### Regel
Dieser Tab ist **Dev-only** und niemals im normalen User-Mode sichtbar.

---

## Tab 9 — Config & Build

### Zweck
Transparenz über die aktuell laufende Konfiguration.

### Bringt
- Reproduzierbarkeit
- Klarheit über Build- und Environment-Zustand

### Inhalte (Read-only)
- App-Version
- Build-ID
- Build-Zeit
- Environment (prod / preview / local)
- Feature Flags
- API-Endpunkte
- Aktive Cache-Strategien

---

## Tab 10 — Roadmap (optional)

### Zweck
Produktvision und Entwicklungsrichtung.

### Bringt
- Orientierung für Contributor
- Abgrenzung zwischen Ist-Zustand und Vision

### Inhalte
- Versionen:
  - v0.1.x-alpha
  - v0.10.x-beta
  - v1.0.0-stable
- Feature-Chips
- Status je Version

### Regel
Keine Live-Daten, kein Debugging, klare Trennung von technischen Tabs.
