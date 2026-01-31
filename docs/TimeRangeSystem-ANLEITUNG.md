# TimeRangeSystem - Vollständige Anleitung

## Übersicht

Das **TimeRangeSystem** ermöglicht flexible Zeitraum-Vergleiche über verschiedene Granularitätsstufen hinweg:

- ⏱️ **Stunden** (Hourly)
- 📅 **Tage** (Daily)
- 📆 **Wochen** (Weekly)
- 🗓️ **Monate** (Monthly)
- 📊 **Jahre** (Yearly)
- 🏛️ **Jahrzehnte** (Decades)
- 🌍 **Jahrhunderte** (Centuries)

## Architektur

### Komponenten

1. **TimeRangeSystem.js** - Kern-Modul mit Granularitäts-Logic
2. **HistoryStats.js** - Modal-Rendering mit Granularitäts-Tabs
3. **HistoryCharts.js** - Dynamische Chart-Konfiguration
4. **HistoryController.js** - Event-Handling und State-Management
5. **history.css** - Styling für Advanced Period Modals

### Datenfluss

```
Nutzer wählt Granularität
    ↓
renderAdvancedPeriodModal() generiert UI
    ↓
generatePeriodsForGranularity() erstellt Perioden
    ↓
aggregateDataByGranularity() gruppiert Daten
    ↓
getComparisonChartConfig() rendert Chart
    ↓
Dynamische Labels und Tooltips
```

## Features

### 1. Granularitäts-Tabs

Nutzer können zwischen 7 Granularitäten switchen:

```javascript
<button
  class="granularity-tab granularity-tab--active"
  data-granularity="month"
>
  <span class="material-symbols-outlined">calendar_month</span>
  <span>Monate</span>
</button>
```

### 2. Schnellauswahl-Presets

Vorgefertigte Zeiträume für schnellen Zugriff:

- Letzte 7 [Einheiten]
- Letzte 30 [Einheiten]
- Letztes Jahr
- Custom Range

### 3. Enhanced Period Items

Perioden-Einträge mit:

- Hauptlabel (z.B. "Januar 2024")
- Subtitle (z.B. "01.01.2024 - 31.01.2024")
- Meta-Info (z.B. "31 Tage")
- Aktiv-Indikator

### 4. Dynamische Chart-Anpassung

Charts passen sich automatisch an:

- Labels ändern sich je nach Granularität
- Tooltips zeigen korrekte Zeitformate
- X-Achse zeigt passende Einheiten

### 5. Daten-Aggregation

```javascript
const TRS = window.TimeRangeSystem;
const aggregatedData = TRS.aggregateDataByGranularity(rawData, "week");
// Gruppiert Daten nach Wochen und berechnet Durchschnitte
```

## Nutzung

### Period Modal öffnen

```javascript
const controller = getHistoryController();

controller.openModal("period", {
  periodType: "A", // oder "B"
  currentPeriod: null,
  granularity: "month", // optional, default: "month"
  periods: [], // optional, wird generiert
  onSelect: async (periodId) => {
    // Callback bei Auswahl
  },
  onGranularityChange: async (granularity, periodType) => {
    // Callback bei Granularitäts-Wechsel
  },
  onPresetSelect: async ({ presetId, startDate, endDate }) => {
    // Callback bei Preset-Auswahl
  },
});
```

### Comparison Chart erstellen

```javascript
const charts = getCharts();
const config = charts.getComparisonChartConfig(
  dataA,
  dataB,
  "Januar 2024",
  "Januar 2023",
  "month", // Granularität
);

const chart = charts.chartManager.create("comparison-chart", config);
```

### Perioden generieren

```javascript
const TRS = window.TimeRangeSystem;
const periods = TRS.generatePeriodsForGranularity("week", "A");

// Ergebnis:
[
  {
    id: "week-A-0",
    label: "KW 48, 2024",
    subtitle: "25.11.2024 - 01.12.2024",
    startDate: "2024-11-25T00:00:00Z",
    endDate: "2024-12-01T23:59:59Z",
    granularity: "week",
    dataPoints: 7,
  },
  // ...
];
```

## GRANULARITY_CONFIG

Jede Granularität hat:

```javascript
{
  label: "Stunden",           // Plural-Label
  singular: "Stunde",         // Singular-Label
  icon: "schedule",           // Material Symbol Icon
  maxDataPoints: 168,         // Max Anzahl Datenpunkte
  formatLabel: (date) => {},  // Funktion für Chart-Labels
  formatFull: (date) => {},   // Funktion für vollständige Anzeige
  getNext: (date) => {},      // Nächste Periode
  getPrevious: (date) => {},  // Vorherige Periode
  calculateRange: (start) => {} // Zeitraum berechnen
}
```

## Event-Handler

### Granularitäts-Tab Click

```javascript
modalElement.querySelectorAll(".granularity-tab").forEach((tab) => {
  tab.addEventListener("click", async () => {
    const granularity = tab.dataset.granularity;
    const periodType = tab.dataset.periodType;
    // Modal neu laden mit neuer Granularität
  });
});
```

### Preset Button Click

```javascript
modalElement.querySelectorAll(".period-preset-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const presetId = btn.dataset.presetId;
    const startDate = btn.dataset.startDate;
    const endDate = btn.dataset.endDate;
    // Preset anwenden
  });
});
```

### Custom Range Button

```javascript
const customRangeBtn = modalElement.querySelector(
  '[data-action="custom-range"]',
);
customRangeBtn.addEventListener("click", () => {
  // Custom Date Modal öffnen
});
```

## CSS-Klassen

### Granularity Tabs

- `.granularity-selector` - Container
- `.granularity-tabs` - Grid-Layout
- `.granularity-tab` - Einzelner Tab
- `.granularity-tab--active` - Aktiver Tab

### Period Presets

- `.period-presets` - Preset-Container
- `.period-preset-grid` - Grid für Buttons
- `.period-preset-btn` - Preset-Button

### Enhanced Period Items

- `.period-item--enhanced` - Enhanced Item Style
- `.period-item__indicator` - Aktiv-Indikator (linke Kante)
- `.period-item__content` - Content-Container
- `.period-item__name` - Haupt-Label
- `.period-item__subtitle` - Unter-Label
- `.period-item__meta` - Meta-Info
- `.period-item__check` - Check-Icon

### Custom Range

- `.period-custom-section` - Container
- `.period-custom-btn` - Custom Range Button

## Best Practices

### 1. Granularität wählen

```javascript
// Für kurze Zeiträume (< 2 Monate):
const granularity = "day";

// Für mittlere Zeiträume (2-12 Monate):
const granularity = "week";

// Für lange Zeiträume (> 1 Jahr):
const granularity = "month";

// Automatische Erkennung:
const TRS = window.TimeRangeSystem;
const optimal = TRS.detectOptimalGranularity(startDate, endDate);
```

### 2. Daten aggregieren

```javascript
// IMMER vor Chart-Rendering aggregieren:
const TRS = window.TimeRangeSystem;
if (granularity !== "day") {
  dataA = TRS.aggregateDataByGranularity(dataA, granularity);
  dataB = TRS.aggregateDataByGranularity(dataB, granularity);
}
```

### 3. Fallbacks

```javascript
// IMMER Fallback für ältere Browser:
const TRS = window.TimeRangeSystem;
if (!TRS) {
  // Basic mode ohne TimeRangeSystem
  return renderPeriodSelectorModal(periods, currentPeriod, periodType);
}
```

### 4. State-Management

```javascript
// Granularität im State speichern:
this.state.selectedGranularity = "week";
this.state.periodTypeAGranularity = "month";
this.state.periodTypeBGranularity = "month";
```

## Troubleshooting

### Charts zeigen keine Labels

**Problem:** Labels sind undefined oder "[object Object]"

**Lösung:**

```javascript
// Sicherstellen dass formatLabel() verwendet wird:
const labels = data.map((d, i) => {
  if (config && d.date) {
    return config.formatLabel(new Date(d.date));
  }
  return i + 1;
});
```

### Aggregation funktioniert nicht

**Problem:** Daten sind nicht gruppiert

**Lösung:**

```javascript
// Prüfen ob TimeRangeSystem geladen ist:
const TRS = window.TimeRangeSystem;
if (!TRS) {
  console.error("TimeRangeSystem nicht geladen!");
  return;
}

// Prüfen ob Daten korrekte Struktur haben:
if (!data.every((d) => d.date)) {
  console.error("Daten haben kein 'date' Property!");
  return;
}
```

### Modal öffnet nicht

**Problem:** renderAdvancedPeriodModal wird nicht gefunden

**Lösung:**

```javascript
// In HistoryStats.js prüfen ob exportiert:
return {
  // ...
  renderAdvancedPeriodModal,
  generatePeriodsForGranularity,
  // ...
};

// In HistoryController prüfen ob Stats geladen:
const stats = getStats();
if (!stats) {
  console.error("HistoryStats nicht geladen!");
}
```

## API-Referenz

### TimeRangeSystem.aggregateDataByGranularity(data, granularity)

Aggregiert Daten nach Granularität.

**Parameter:**

- `data` (Array): Raw data mit `date` Property
- `granularity` (string): "hour", "day", "week", "month", "year", "decade", "century"

**Returns:** Array von aggregierten Objekten

**Beispiel:**

```javascript
const weeklyData = TRS.aggregateDataByGranularity(dailyData, "week");
```

### TimeRangeSystem.generateTimeRangePresets(referenceDate)

Generiert vorgefertigte Zeiträume.

**Parameter:**

- `referenceDate` (Date, optional): Referenzdatum (default: now)

**Returns:** Array von Preset-Objekten

**Beispiel:**

```javascript
const presets = TRS.generateTimeRangePresets();
// [
//   { id: "last-7-days", label: "Letzte 7 Tage", ... },
//   { id: "last-30-days", label: "Letzte 30 Tage", ... },
//   ...
// ]
```

### TimeRangeSystem.detectOptimalGranularity(startDate, endDate)

Erkennt optimale Granularität für Zeitraum.

**Parameter:**

- `startDate` (Date): Start-Datum
- `endDate` (Date): End-Datum

**Returns:** string (Granularität)

**Beispiel:**

```javascript
const start = new Date("2023-01-01");
const end = new Date("2024-12-31");
const optimal = TRS.detectOptimalGranularity(start, end);
// Returns: "month"
```

## Weitere Dokumentation

- [ENTWICKLUNGS-CHANGELOG.md](./ENTWICKLUNGS-CHANGELOG.md) - Vollständiger Change-Log
- [guidelines.md](./guidelines.md) - Entwicklungs-Richtlinien
- [TimeRangeSystem.js](../src/ui/history/components/TimeRangeSystem.js) - Source Code

## Support

Bei Fragen oder Problemen siehe:

1. Console-Logs aktivieren: `localStorage.setItem('debug', 'true')`
2. Browser DevTools öffnen (F12)
3. Network-Tab prüfen für API-Fehler
4. Console-Tab prüfen für JavaScript-Fehler
