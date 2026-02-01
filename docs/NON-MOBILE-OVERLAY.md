# Non-Mobile Overlay Implementation

## Übersicht

Calchas ist nun so konfiguriert, dass die vollständige App nur auf Smartphones funktioniert. Auf Tablets und Desktop-Geräten wird stattdessen ein informatives Overlay mit wichtigen Links und Informationen angezeigt.

## Implementierte Komponenten

### 1. Gerätetyp-Erkennung (`src/utils/deviceDetection.js`)

**Funktionen:**

- `isSmartphone()` - Prüft, ob das Gerät ein Smartphone ist
- `getDeviceType()` - Gibt 'smartphone', 'tablet' oder 'desktop' zurück
- `isDeviceSupported()` - Prüft, ob die vollständige App unterstützt wird

**Erkennungslogik:**

```javascript
// Kombiniert mehrere Faktoren:
- Screen-Größe (max 768px Breite für Smartphones)
- Touch-Support
- User Agent Patterns
- Portrait-Orientierung
- Expliziter Ausschluss von Tablets
```

### 2. Non-Mobile Overlay (`src/ui/NonMobileOverlay.js`)

**Funktionalität:**

- Zeigt ein vollständiges Overlay auf nicht unterstützten Geräten
- Enthält alle wichtigen Elemente aus "Über Calchas"
- Nutzt die AboutSheet-Funktionen für Modals

**Angezeigte Elemente:**

- ✅ Header mit Logo, Version und "Was ist neu" Button
- ✅ Info-Text über Smartphone-Optimierung
- ✅ Lizenz
- ✅ E-Mail
- ✅ Website
- ✅ Quellcode
- ✅ Problem melden
- ✅ Mitwirkende
- ✅ Discord
- ✅ Drittanbieter-Lizenzen
- ✅ Nutzungsbedingungen
- ✅ Datenschutzerklärung

### 3. Styling (`src/ui/non-mobile-overlay.css`)

**Design:**

- Gradient-Hintergrund (blau)
- Glasmorphismus-Effekte
- Responsive Grid-Layout
- Hover-Animationen
- Float-Animation für Icon

### 4. App-Integration (`src/app.js`)

**Änderungen in `initApp()`:**

```javascript
// Prüfung am Anfang der Funktion
if (window.DeviceDetection && !window.DeviceDetection.isDeviceSupported()) {
  // Zeige Overlay und beende Initialisierung
  window.NonMobileOverlay.showNonMobileOverlay();
  return;
}
// Normale App-Initialisierung nur auf Smartphones
```

### 5. AboutSheet Export-Erweiterung (`src/ui/settings/AboutSheet.js`)

Alle relevanten Modal-Funktionen wurden exportiert:

```javascript
global.AboutSheet = {
  renderAboutSheet,
  showLicenseModal,
  showChangelog,
  showContributorsModal,
  showThirdPartyModal,
  showTermsModal,
  showPrivacyModal,
  createModal,
};
```

## Integration in index.html

```html
<!-- CSS nach dev-dashboard.css -->
<link rel="stylesheet" href="ui/non-mobile-overlay.css" />

<!-- JS vor Dev Dashboard -->
<script src="utils/deviceDetection.js"></script>
<script src="ui/NonMobileOverlay.js"></script>
```

## PWA-Manifest

**Änderung:**

```json
{
  "description": "...Optimiert für Smartphones.",
  "orientation": "portrait-primary",
  ...
}
```

## Testing

Eine Test-Seite wurde erstellt unter:
`tests/device-detection-test.html`

Diese zeigt:

- Erkannter Gerätetyp
- Unterstützungsstatus
- Bildschirm-Informationen
- User Agent

## Verhalten nach Implementierung

### Auf Smartphones:

- ✅ App lädt normal
- ✅ Alle Features verfügbar
- ✅ PWA-Installation möglich
- ✅ Volle Funktionalität

### Auf Tablets:

- ❌ App-Initialisierung wird übersprungen
- ✅ Overlay wird angezeigt
- ✅ Info-Text erklärt die Situation
- ✅ Alle wichtigen Links/Modals verfügbar
- ✅ Schönes, professionelles Design

### Auf Desktop:

- ❌ App-Initialisierung wird übersprungen
- ✅ Overlay wird angezeigt
- ✅ Info-Text erklärt die Situation
- ✅ Alle wichtigen Links/Modals verfügbar
- ✅ Responsive Design

## Browser-Kompatibilität

Die Gerätetyp-Erkennung funktioniert in:

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ✅ Samsung Internet
- ✅ Opera

## Zukünftige Erweiterungen

Falls Tablet/Desktop-Support später hinzugefügt wird:

1. `deviceDetection.js` anpassen
2. Responsive CSS für größere Screens hinzufügen
3. `isDeviceSupported()` erweitern
4. Overlay entfernen oder als optionale Info behalten

## Debugging

Zum Testen der Gerätetyp-Erkennung:

1. Öffne Browser DevTools
2. Wechsle zu Device Emulation
3. Wähle verschiedene Geräte aus
4. Console-Logs zeigen erkannten Typ

**Console-Befehle:**

```javascript
// Gerätetyp prüfen
DeviceDetection.getDeviceType();

// Smartphone-Check
DeviceDetection.isSmartphone();

// Support-Check
DeviceDetection.isDeviceSupported();
```

## Dateien-Übersicht

**Neue Dateien:**

- `src/utils/deviceDetection.js` - Gerätetyp-Erkennung
- `src/ui/NonMobileOverlay.js` - Overlay-Komponente
- `src/ui/non-mobile-overlay.css` - Overlay-Styling
- `tests/device-detection-test.html` - Test-Seite

**Geänderte Dateien:**

- `src/app.js` - Geräteprüfung bei App-Start
- `src/index.html` - Neue Scripts & Styles eingebunden
- `src/ui/settings/AboutSheet.js` - Modal-Funktionen exportiert
- `manifest.json` - Beschreibung aktualisiert

## Erfolgs-Kriterien ✅

- [x] Gerätetyp-Erkennung funktioniert zuverlässig
- [x] Overlay zeigt sich auf Nicht-Smartphones
- [x] Alle "Über Calchas" Elemente sind verfügbar
- [x] Modals funktionieren im Overlay
- [x] Design ist ansprechend und professionell
- [x] PWA-Installation bleibt für Smartphones möglich
- [x] Keine Fehler in der Console
- [x] Code ist gut dokumentiert

---

**Implementiert am:** 01.02.2026
**Version:** v0.7.0-alpha
**Status:** ✅ Abgeschlossen
