# 🌦️ Wetter-App

**BFS IT-Projekt | Team: Max, Robin, Samreen, Yannik, Felix**

## Überblick
Web-basierte Wetter-App mit Ortssuche, aktuellen Daten und Forecast für heute + morgen.

## Features
- ✅ Ortssuche mit automatischer Geo-Kodierung
- ✅ Wetter heute (aktuell)
- ✅ Wetter morgen (Forecast)
- ✅ Datenquellen: open-meteo.com & brightsky.dev
- ✅ Caching (5-15 Min aktuell, 1-2h Forecast)
- ✅ Fehlerbehandlung mit Retry-Button

## Tech Stack
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **APIs:** 
  - open-meteo.com (primär)
  - brightsky.dev (fallback)
- **Tools:** VS Code, Git, GitHub, Live Server

## Setup
```bash
# Repository clonen
git clone https://github.com/wetter-app-bfsit/wetter-app.git

# In VS Code öffnen
code wetter-app

# Live Server starten
# Rechtsklick auf src/index.html → "Open with Live Server"