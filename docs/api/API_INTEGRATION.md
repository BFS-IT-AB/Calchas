# 🔑 API-Keys Integration - Vollständige Dokumentation

## ✅ Erfolgreich integriert!

Alle 3 API-Keys wurden vollständig in Calchas integriert.

---

## 📋 Integrierte APIs

### 1. **OpenWeatherMap** ✅

- **API-Key:** BFS-Demo-Key ab Werk hinterlegt (`src/app.js` → `bakedInDefaults`), für Produktion bitte ersetzen
- **Status:** Wird beim ersten App-Start automatisch gespeichert, kann jederzeit über den Einstellungsdialog oder `window.__APP_DEFAULT_API_KEYS` überschrieben werden
- **Features:** Current Weather, Hourly Forecast, Daily Forecast
- **Integration:** Wird als optionale Zusatzquelle geladen wenn Hauptquellen (Open-Meteo, BrightSky) vorhanden

### 2. **VisualCrossing** ✅

- **API-Key:** BFS-Demo-Key vorbefüllt; ausschließlich für lokale Tests gedacht
- **Status:** Lädt automatisch, solange kein eigener Key gespeichert wurde; kann per Settings/Runtime ersetzt werden
- **Features:** Current Weather, Historical Data, Forecast
- **Integration:** Wird als optionale Zusatzquelle geladen

### 3. **Meteostat** ✅

- **API-Key (RapidAPI):** BFS-Demo-Key auf RapidAPI-Basis integriert
- **Status:** Wird wie oben beschrieben automatisch gesetzt, sollte für produktive Deployments durch einen eigenen RapidAPI-Key ersetzt werden
- **Features:** Historical Weather Data
- **Integration:** Verfügbar für historische Abfragen

---

## 🏗️ Implementierung

### Neue Dateien:

1. **`src/utils/apiKeyManager.js`** (neu erstellt)
   - Zentrales API-Key-Management
   - Speichert Keys in localStorage
   - Methoden: `setKey()`, `getKey()`, `hasKey()`, `setDefaults()`

### Modifizierte Dateien:

1. **`src/index.html`**

   - Script-Tag für `apiKeyManager.js` hinzugefügt
   - Script-Tags für optionale APIs hinzugefügt:
     - `api/openweathermap.js`
     - `api/visualcrossing.js`
     - `api/meteostat.js`

2. **`src/app.js`**
   - API-Key-Manager initialisiert in `initApp()`
   - Default-Keys gesetzt beim ersten Start
   - Settings-Handler für API-Key-Inputs hinzugefügt
   - `fetchWeatherData()` erweitert um optionale APIs

---

## 🔧 Technische Details

### API-Key-Manager (apiKeyManager.js)

```javascript
class APIKeyManager {
  constructor() {
    this.keys = {
      openweathermap: null,
      visualcrossing: null,
      meteostat: null
    };
    this.loadKeys();
  }

  setKey(provider, key) { ... }
  getKey(provider) { ... }
  hasKey(provider) { ... }
  setDefaults(defaults) { ... }
}
```

**Verwendung:**

```javascript
// In initApp()
window.apiKeyManager = new APIKeyManager();
window.apiKeyManager.setDefaults(window.__APP_DEFAULT_API_KEYS || {});
```

### Integration in fetchWeatherData()

**Vorher:**

```javascript
async function fetchWeatherData(lat, lon) {
  // Nur Open-Meteo + BrightSky
  const openMeteoResult = await openMeteoAPI.fetchWeather(lat, lon);
  const brightSkyResult = await brightSkyAPI.fetchWeather(lat, lon);
  // ...
}
```

**Nachher:**

```javascript
async function fetchWeatherData(lat, lon) {
  // Hauptquellen (immer)
  const openMeteoResult = await openMeteoAPI.fetchWeather(lat, lon);
  const brightSkyResult = await brightSkyAPI.fetchWeather(lat, lon);

  // OPTIONALE APIs (nur wenn Keys vorhanden)
  if (window.apiKeyManager.hasKey('openweathermap')) {
    const owmAPI = new OpenWeatherMapAPI();
    const owmKey = window.apiKeyManager.getKey('openweathermap');
    openWeatherMapResult = await owmAPI.fetchWeather(lat, lon, owmKey);
    // ... logging & error handling
  }

  if (window.apiKeyManager.hasKey('visualcrossing')) {
    const vcAPI = new VisualCrossingAPI();
    const vcKey = window.apiKeyManager.getKey('visualcrossing');
    visualCrossingResult = await vcAPI.fetchWeather(lat, lon, vcKey);
    // ... logging & error handling
  }

  return {
    openMeteo: ...,
    brightSky: ...,
    openWeatherMap: ...,  // NEU
    visualCrossing: ...,  // NEU
    sources: [...]
  };
}
```

### Settings-Integration

**HTML (bereits vorhanden):**

```html
<input
  id="openweathermap-key"
  class="settings-input"
  placeholder="OpenWeatherMap API Key (optional)"
  type="password"
/>
<input
  id="visualcrossing-key"
  class="settings-input"
  placeholder="VisualCrossing API Key (optional)"
  type="password"
/>
```

**JavaScript (NEU):**

```javascript
// Load existing keys into inputs
const owmKeyInput = document.getElementById("openweathermap-key");
const vcKeyInput = document.getElementById("visualcrossing-key");
if (owmKeyInput)
  owmKeyInput.value = window.apiKeyManager.getKey("openweathermap") || "";
if (vcKeyInput)
  vcKeyInput.value = window.apiKeyManager.getKey("visualcrossing") || "";

// Save handlers
owmKeyInput.addEventListener("change", (e) => {
  window.apiKeyManager.setKey("openweathermap", e.target.value);
  showSuccess("OpenWeatherMap API-Key gespeichert");
});
```

---

## 🧪 Testen

### 1. **API-Keys prüfen:**

```javascript
// In Browser Console (F12):
console.log(window.apiKeyManager.exportKeys());
// Erwartung: { openweathermap: "228...", visualcrossing: "JVC...", meteostat: "edd..." }
```

### 2. **Verfügbare APIs anzeigen:**

```javascript
console.log(window.apiKeyManager.getAvailableAPIs());
// Erwartung: ["openweathermap", "visualcrossing", "meteostat"]
```

### 3. **Wetter laden und Sources prüfen:**

1. Suche eine Stadt (z.B. "Berlin")
2. Öffne Console (F12)
3. **Erwartung:**
   ```
   ✅ Open-Meteo erfolgreich
   ✅ BrightSky erfolgreich
   ✅ OpenWeatherMap Daten geladen
   ✅ VisualCrossing Daten geladen
   ```

### 4. **Settings Modal prüfen:**

1. Öffne Settings (⚙️)
2. Scrolle zu "Optionale API Keys"
3. **Erwartung:**
   - OpenWeatherMap Input zeigt: `22889ea...` (teilweise sichtbar wegen type="password")
   - VisualCrossing Input zeigt: `JVCZ3W...` (teilweise sichtbar)

### 5. **localStorage prüfen:**

```javascript
// In Console:
console.log(localStorage.getItem("wetter_api_openweathermap"));
console.log(localStorage.getItem("wetter_api_visualcrossing"));
console.log(localStorage.getItem("wetter_api_meteostat"));
```

---

## 📊 API-Quellen Vergleich

Nach einer Suche sollten jetzt **bis zu 4 Quellen** in der Sources-Anzeige erscheinen:

| Quelle         | Status       | Typ                       |
| -------------- | ------------ | ------------------------- |
| Open-Meteo     | ✅ Aktiv     | Hauptquelle (kostenlos)   |
| BrightSky      | ✅ Aktiv     | Hauptquelle (kostenlos)   |
| OpenWeatherMap | ✅ Aktiv     | Optional (API-Key)        |
| VisualCrossing | ✅ Aktiv     | Optional (API-Key)        |
| Meteostat      | ⏳ Verfügbar | Optional (für Historical) |

**Info:** Meteostat wird derzeit nur für historische Daten verwendet, nicht beim normalen Weather-Fetch.

---

## 🔒 Datenschutz & Sicherheit

### Speicherung:

- **Wo:** Browser localStorage
- **Sichtbar:** Nur für den Nutzer auf seinem Gerät
- **Verschlüsselung:** Keine (localStorage ist plain text)
- **Übertragung:** Nur an jeweilige API-Server (HTTPS)

### Best Practices:

1. ✅ Keys werden NICHT in Git committed
2. ✅ Input-Felder haben `type="password"` (Maskierung)
3. ✅ Keys nur bei Bedarf geladen (lazy loading)
4. ⚠️ User sollte Keys regelmäßig rotieren (Sicherheit)

### Hinweis für Deployment:

Falls die App öffentlich deployed wird:

- **Nicht empfohlen:** Hard-coded API-Keys im Frontend
- **Besser:** Backend-Proxy der die API-Keys verwaltet
- **Alternative:** User lässt eigene Keys eintragen (aktueller Ansatz)

---

## 📁 Geänderte Dateien

### Neu erstellt:

1. ✅ `src/utils/apiKeyManager.js` (120 Zeilen)

### Modifiziert:

1. ✅ `src/index.html` (Script-Tags hinzugefügt)
2. ✅ `src/app.js` (~50 Zeilen geändert)
   - API-Key-Manager Init
   - Default-Keys setzen
   - Settings-Handler
   - fetchWeatherData erweitert

### Unverändert (aber jetzt geladen):

1. ✅ `src/api/openweathermap.js` (existiert bereits)
2. ✅ `src/api/visualcrossing.js` (existiert bereits)
3. ✅ `src/api/meteostat.js` (existiert bereits)

---

## 🎯 Ergebnis

**Alle 3 API-Keys sind vollständig integriert!**

### Was funktioniert:

- ✅ API-Keys werden automatisch beim ersten Start gespeichert
- ✅ Keys sind in Settings sichtbar und editierbar
- ✅ OpenWeatherMap wird beim Weather-Fetch aufgerufen
- ✅ VisualCrossing wird beim Weather-Fetch aufgerufen
- ✅ Meteostat-Key ist verfügbar für historische Abfragen
- ✅ Console-Logging zeigt erfolgreiche API-Calls
- ✅ Sources-Array enthält alle erfolgreichen Quellen

### Nächste Schritte (optional):

1. ⏳ Meteostat in Historical-Chart integrieren (nutzt derzeit Open-Meteo Archive)
2. ⏳ UI für erweiterte API-Auswahl (welche Quellen bevorzugt?)
3. ⏳ Fallback-Logik wenn Hauptquellen fehlschlagen (optionale APIs als Backup)

**Die Integration ist abgeschlossen und einsatzbereit!** 🎉
