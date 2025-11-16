# 🧪 Quick Test - API-Keys Integration

## ⚡ Schnelltest (5 Minuten)

### 1. **Browser neu laden**

```
Strg + F5 (Hard Reload)
```

### 2. **Console öffnen**

```
F12 → Tab "Console"
```

### 3. **API-Keys prüfen**

Console-Befehl eingeben:

```javascript
console.log(window.apiKeyManager.exportKeys());
```

**Erwartetes Ergebnis:**

```javascript
{
  openweathermap: "9f79d40dc85bebc834364783854eefbd",
  visualcrossing: "JVCZ3WAHB5XBT7GXQC7RQBGBE",
  meteostat: "edda72c60bmsh4a38c4687147239p14e8d5jsn6f578346b68a"
}
```

### 4. **Stadt suchen**

Suche: `Berlin`

**Console-Output prüfen:**

```
🚀 Initialisiere Calchas...
✅ API Keys geladen: {openweathermap: true, visualcrossing: true, meteostat: true}
🌡️ Lade Wetterdaten für 52.52, 13.405
✅ Open-Meteo erfolgreich
✅ BrightSky erfolgreich
✅ OpenWeatherMap Daten geladen
✅ VisualCrossing Daten geladen
```

### 5. **Settings Modal prüfen**

1. Klicke "⚙️ Einstellungen"
2. Scrolle zu "Optionale API Keys"
3. **Erwartung:**
   - OpenWeatherMap Feld zeigt: `●●●●●●●●●●` (maskiert wegen type="password")
   - VisualCrossing Feld zeigt: `●●●●●●●●●●` (maskiert)

### 6. **localStorage prüfen**

Console-Befehl:

```javascript
console.log({
  owm: localStorage.getItem("wetter_api_openweathermap"),
  vc: localStorage.getItem("wetter_api_visualcrossing"),
  ms: localStorage.getItem("wetter_api_meteostat"),
});
```

**Erwartung:** Alle 3 Keys sollten angezeigt werden

---

## ✅ Erfolgs-Kriterien

### MUST HAVE (kritisch):

- ✅ API-Keys werden beim App-Start geladen
- ✅ Keys sind in localStorage gespeichert
- ✅ OpenWeatherMap wird beim Fetch aufgerufen
- ✅ VisualCrossing wird beim Fetch aufgerufen
- ✅ Console zeigt "Daten geladen" für optionale APIs

### SHOULD HAVE (wichtig):

- ✅ Settings zeigen Keys (maskiert)
- ✅ Keys können geändert werden
- ✅ Änderungen werden gespeichert
- ✅ Toast-Notification bei Speicherung

### NICE TO HAVE (optional):

- ⏳ UI zeigt alle 4 Quellen in Sources-Comparison
- ⏳ Meteostat in Historical-Chart integriert

---

## ⚠️ Troubleshooting

### Problem 1: "apiKeyManager is not defined"

**Ursache:** Script nicht geladen oder zu spät
**Lösung:**

1. Hard Reload (Strg+F5)
2. Prüfe Network-Tab: `apiKeyManager.js` geladen?
3. Prüfe Console: JavaScript-Fehler?

### Problem 2: Keys nicht gespeichert

**Ursache:** localStorage deaktiviert oder voll
**Lösung:**

```javascript
// Console:
try {
  localStorage.setItem("test", "test");
  console.log("✅ localStorage funktioniert");
  localStorage.removeItem("test");
} catch (e) {
  console.error("❌ localStorage Problem:", e);
}
```

### Problem 3: Optionale APIs werden nicht aufgerufen

**Ursache:** Keys fehlen oder `hasKey()` gibt false zurück
**Lösung:**

```javascript
// Console:
console.log("OpenWeatherMap:", window.apiKeyManager.hasKey("openweathermap"));
console.log("VisualCrossing:", window.apiKeyManager.hasKey("visualcrossing"));
// Erwartung: beide true
```

### Problem 4: API-Fehler "Invalid API Key"

**Ursache:** Key falsch eingegeben oder abgelaufen
**Lösung:**

1. Prüfe Key in Settings
2. Teste Key direkt:

```javascript
// OpenWeatherMap Test:
fetch(
  "https://api.openweathermap.org/data/2.5/onecall?lat=52.52&lon=13.405&appid=9f79d40dc85bebc834364783854eefbd"
)
  .then((r) => r.json())
  .then((d) => console.log("OWM Test:", d));
```

---

## 🎯 Nächste Schritte

Nach erfolgreichem Test:

### Für normale Nutzung:

```
✅ App ist ready!
→ Starte einfach mit Stadt-Suchen
→ Alle 4 APIs werden automatisch genutzt
```

### Für weitere Entwicklung:

1. **Sources-UI erweitern:**

   - Zeige OpenWeatherMap + VisualCrossing im Vergleich
   - Toggle für bevorzugte Quelle

2. **Meteostat integrieren:**

   - Historical-Chart mit Meteostat-Daten
   - Vergleich Open-Meteo Archive vs Meteostat

3. **Fallback-Logik:**
   - Nutze optionale APIs als Backup wenn Hauptquellen fehlen
   - Prioritäten-System für Quellen

---

## 📊 Erwartete Console-Logs

Bei erfolgreicher Integration sollte die Console so aussehen:

```
🚀 Initialisiere Calchas...
✅ API Keys geladen: {openweathermap: true, visualcrossing: true, meteostat: true}
✅ App initialisiert

[Nach Stadt-Suche:]
🌡️ Lade Wetterdaten für 52.52, 13.405
✅ Open-Meteo erfolgreich (234ms)
✅ BrightSky erfolgreich (456ms)
✅ OpenWeatherMap Daten geladen
✅ VisualCrossing Daten geladen
✅ Wetter für Berlin geladen
```

**Keine roten Fehler!** Nur grüne Häkchen ✅

---

## 🎉 Fertig!

Wenn alle Tests erfolgreich sind:

- **API-Keys sind integriert** ✅
- **App nutzt 4 Wetter-Quellen** ✅
- **Alles funktioniert** ✅

**Happy Testing!** 🌦️
