/**
 * TextReplacer.js - Automatische Textersetzung bei Sprachenwechsel
 * Ersetzt alle hardcodierten deutschen Texte mit englischen Übersetzungen
 */

(function(global) {
  // Mapping von deutschen zu englischen Texten - UMFASSEND
  const TRANSLATION_MAP = {
    // === SETTINGS ===
    "Aussehen": "Appearance",
    "Heimatort": "Home Location",
    "Einheiten": "Units",
    "Hintergrundaktualisierungen": "Background Updates",
    "Wettermodelle": "Weather Models",
    "Sprache": "Language",
    "Daten exportieren": "Export Data",
    "Daten importieren": "Import Data",
    "Über Calchas": "About Calchas",
    
    // === APPEARANCE ===
    "Themen, Animationen und App-Layout": "Themes, animations and app layout",
    "System": "System",
    "Folgt dem Gerätemodus": "Follow device mode",
    "Hell": "Light",
    "Helles Layout mit hohem Kontrast": "Light layout with high contrast",
    "Dunkel": "Dark",
    "Dunkles Layout für nachts": "Dark layout for nights",
    "Dark Mode aktivieren": "Enable Dark Mode",
    
    // === HOME LOCATION ===
    "Heimatort und Favoriten verwalten": "Manage home location and favorites",
    "Heimatort verwalten": "Manage home location",
    "Lege einen Ort fest, der beim Start sofort geladen wird": "Set a location that loads immediately on startup",
    "Du kannst ihn jederzeit entfernen": "You can remove it anytime",
    "Aktuellen Ort speichern": "Save Current Location",
    "Entfernen": "Remove",
    "Keine Favoriten gespeichert": "No favorites saved",
    
    // === UNITS ===
    "Temperatur, Wind, Luftdruck, Sichtweite, Niederschlag und AQI": "Temperature, wind, pressure, visibility, precipitation and AQI",
    "Einheit Temperatur": "Temperature Unit",
    "Einheit Windstärke": "Wind Unit",
    "Einheit Sichtweite": "Visibility Unit",
    "Einheit Niederschlag": "Precipitation Unit",
    "Einheit Luftdruck": "Pressure Unit",
    "Zeitformat": "Time Format",
    "AQI Typ": "AQI Type",
    "Celsius": "Celsius",
    "Celsius (°C)": "Celsius (°C)",
    "Fahrenheit": "Fahrenheit",
    "Fahrenheit (°F)": "Fahrenheit (°F)",
    "Kilometer pro Stunde (km/h)": "Kilometers per hour (km/h)",
    "Meter pro Sekunde (m/s)": "Meters per second (m/s)",
    "Meilen pro Stunde (mph)": "Miles per hour (mph)",
    "Km/h": "km/h",
    "Km": "km",
    "mm": "mm",
    "hPa": "hPa",
    "24 hr": "24 hr",
    "Europäischer AQI": "European AQI",
    
    // === BACKGROUND UPDATES ===
    "Widget-Updates und geplante Aktualisierungen": "Widget updates and scheduled updates",
    "Automatische Aktualisierung": "Automatic Updates",
    "Wetterdaten werden automatisch aktualisiert, wenn die App geöffnet ist": "Weather data is automatically updated when the app is open",
    "AKTUALISIERUNGSINTERVALL": "UPDATE INTERVAL",
    "Aus": "Off",
    "5 Minuten": "Every 5 minutes",
    "15 Minuten": "Every 15 minutes",
    "30 Minuten": "Every 30 minutes",
    "1 Stunde": "Hourly",
    "Browser-Benachrichtigungen": "Browser Notifications",
    "Nicht aktiviert": "Not activated",
    "Aktivieren": "Activate",
    "SONSTIGE": "OTHER",
    
    // === WEATHER MODELS ===
    "Wettermodelle": "Weather Models",
    "Open-Meteo Wettermodelle auswählen": "Select Open-Meteo weather models",
    "API-Datenquellen": "API Data Sources",
    "Calchas nutzt mehrere Wetter-APIs für genaue Daten": "Calchas uses multiple weather APIs for accurate data",
    "Mit eigenen API-Keys kannst du erweiterte Funktionen freischalten": "With your own API keys you can unlock advanced features",
    "Primäre Wetterdaten (kostenlos)": "Primary weather data (free)",
    "Deutsche Wetterdaten vom DWD (kostenlos)": "German weather data from DWD (free)",
    "Geocoding & Ortsuche (kostenlos)": "Geocoding & location search (free)",
    "Aktiv": "Active",
    
    // === LANGUAGE ===
    "App-Sprache wählen": "Choose app language",
    "Ändere die Sprache der App-Oberfläche": "Change the language of the app interface",
    "Wetterdaten werden automatisch angepasst": "Weather data will automatically adjust",
    "Deutsch": "German",
    "English": "English",
    "Englisch": "English",
    "DE": "DE",
    "GB": "GB",
    
    // === EXPORT ===
    "Daten exportieren": "Export Data",
    "Einstellungen und Favoriten exportieren": "Export settings and favorites",
    "Exportiere deine Einstellungen, Favoriten und den Heimatort als JSON-Datei": "Export your settings, favorites and home location as a JSON file",
    "Daten als JSON exportieren": "Export data as JSON",
    "Favoriten:": "Favorites:",
    "Einheiten: Gespeichert": "Units: Saved",
    "Theme:": "Theme:",
    
    // === IMPORT ===
    "Daten importieren": "Import Data",
    "Einstellungen und Favoriten importieren": "Import settings and favorites",
    "Importiere eine zuvor exportierte JSON-Datei, um deine Einstellungen wiederherzustellen": "Import a previously exported JSON file to restore your settings",
    "JSON-Datei auswählen": "Choose JSON file",
    
    // === ABOUT ===
    "Version, Lizenzen und Datenschutzhinweise": "Version, licenses and privacy notes",
    "Was ist neu": "What's new",
    "Lizenzen": "Licenses",
    "MIT Lizenzen": "MIT Licenses",
    "E-Mail": "Email",
    "Noch keine E-Mail verfügbar": "No email available yet",
    "Quellcode": "Source Code",
    "Auf GitHub": "On GitHub",
    "Problem melden": "Report Problem",
    "Mitwirkende": "Contributors",
    "Community beitreten": "Join Community",
    
    // === HOME PAGE ===
    "Bedeckt": "Overcast",
    "Gefühlt": "Feels Like",
    "Einsichten": "Insights",
    "Hohe Regenwahrscheinlichkeit von 95%": "High probability of rain of 95%",
    "Regenschirm nicht vergessen!": "Don't forget your umbrella!",
    "Tagesübersicht": "Daily Overview",
    "Frischer Start in den Tag": "Fresh start into the day",
    "Um 00:00 werden schwüle Bedingungen mit einer Luftfeuchtigkeit von 96% erwartet": "Muggy conditions with 96% humidity expected at 00:00",
    "Schwüle Bedingungen mit einer Luftfeuchtigkeit von 96% erwartet": "Muggy conditions with 96% humidity expected",
    "schwüle Bedingungen": "muggy conditions",
    "Bedingungen": "conditions",
    "Die Luftqualität ist gut (AQI": "Air quality is good (AQI",
    "Regenwahrscheinlichkeit: bis zu": "Probability of rain: up to",
    "Erwarte einen Temperaturbereich von": "Expect a temperature range of",
    "Tagestänge:": "Day length:",
    "Tagestänge": "Day length",
    "Stündliche Vorhersage": "Hourly Forecast",
    "Die nächsten Tage": "The next days",
    "Heute": "Today",
    "Luftfeuchtigkeit": "Humidity",
    "Sonne": "Sun",
    "Sehr feucht": "Very humid",
    "Taupunkt": "Dew point",
    "Abnehmende Sichel": "Waning Crescent",
    "beleuchtet": "illuminated",
    "Mond": "Moon",
    "Pollenflug": "Pollen",
    "Wenig": "Low",
    "Mittel": "Medium",
    "Viel": "High",
    "Wetter-Status": "Weather Status",
    "Nächste 24 Stunden": "Next 24 hours",
    "Alles im grünen Bereich": "Everything is fine",
    "Keine besonderen Wetterereignisse erwartet": "No severe weather expected",
    "Schnell-Check": "Quick Check",
    "Was du heute wissen musst": "What you need to know today",
    "Regenschirm wegnehmen?": "Umbrella needed?",
    "Regenwahrscheinlichkeit": "Probability of rain",
    "Sonnenschutz nötig?": "Sunscreen needed?",
    "UV-Index": "UV Index",
    "Jacke anziehen?": "Put on a jacket?",
    "Warme Jacke": "Warm jacket",
    "Autofahrt sicher?": "Safe to drive?",
    "Normale Bedingungen": "Normal conditions",
    "Gute Sicht, wenig Wind": "Good visibility, little wind",
    "Sport im Freien?": "Sports outdoors?",
    "Ideale Bedingungen": "Ideal conditions",
    "Outdoor Score": "Outdoor Score",
    "Weather History": "Weather History",
    "Dashboard": "Dashboard",
    "Vergleich": "Comparison",
    "Kalender": "Calendar",
    "Letzte 30 Tage": "Last 30 days",
    "Windtrends": "Wind trends",
    "Ø Durchschnitt": "Ø Average",
    "Höchst": "Highest",
    "Tiefst": "Lowest",
    "AI Insight": "AI Insight",
    "vs Ø": "vs Ø",
    "Unterdurchschnittlich kühl": "Below average cool",
    "Sonnige Tage": "Sunny days",
    "Max. Temp": "Max. Temp",
    "Min. Temp": "Min. Temp",
    "Ø Temp": "Ø Temp",
    "Regentage": "Rainy days",
    "Helles Layout mit hohem Kontrast": "Light layout with high contrast",
    "Dunkles Layout für nachts": "Dark layout for nights",
    "settings.home.setNewHome": "Set new home location",
    "Einheit Temperatur": "Temperature Unit",
    "Celsius": "Celsius",
    "Einheit Windstärke": "Wind Unit",
    "Km/h": "km/h",
    "Einheit Sichtweite": "Visibility Unit",
    "Km": "km",
    "Einheit Niederschlag": "Precipitation Unit",
    "mm": "mm",
    "Einheit Luftdruck": "Pressure Unit",
    "hPa": "hPa",
    "Zeitformat": "Time Format",
    "24 hr": "24 hr",
    "AQI Typ": "AQI Type",
    "Europäischer AQI": "European AQI",
    "Best time": "Best time",
    "Uhr": "o'clock",
    "Tippen für Details": "Tap for details",
    "Tippen für Details →": "Tap for details →",
    "System": "System",
    "Folgt dem Gerätemodus": "Follow device mode",
    "Tageslicht": "Daylight",
    "Mäßig": "Moderate",
    "Leicht erhöht": "Slightly elevated",
    "Böen": "Gusts",
    "NIEDERSCHLAG": "PRECIPITATION",
    "Regenschirm mitnehmen?": "Take umbrella?",
    "Regenschirm wegnehmen?": "Umbrella not needed",
    "Last 30 days": "Last 30 days",
    "Temperatur, Wind, Druck und mehr.": "Temperature, Wind, Pressure and more.",
    "Hellas Layout mit hohem Kontrast": "Light layout with high contrast",
    "Helles Layout mit hohem Kontrast": "Light layout with high contrast",
    
    // === HEALTH ===
    "Gesundheit & Sicherheit": "Health & Safety",
    "🏥 Gesundheit & Sicherheit": "🏥 Health & Safety",
    "Outdoor-Score": "Outdoor Score",
    "Nächste 12h": "Next 12h",
    "SEHR GUT": "VERY GOOD",
    "GUT": "GOOD",
    "MITTEL": "MODERATE",
    "SCHLECHT": "POOR",
    "Perfekt für Sport & lange Aktivitäten": "Perfect for sports & long activities",
    "Feuchtigkeit": "Humidity",
    "Sichtweite": "Visibility",
    "Beste Zeit:": "Best time:",
    "Uhr (Score: Tippen für Details": "o'clock (Score: Tap for details",
    
    // === NAVIGATION ===
    "Home": "Home",
    "Karten": "Maps",
    "Health": "Health",
    "Historie": "History",
    "Settings": "Settings",
    "⚙️ Einstellungen": "⚙️ Settings",
    
    // === COMMON BUTTONS ===
    "Suchen": "Search",
    "Speichern": "Save",
    "Abbrechen": "Cancel",
    "Schließen": "Close",
    "Löschen": "Delete",
    "OK": "OK",
    "Nein": "No",
    "Zurück": "Back",
    "Zu Favoriten hinzufügen": "Add to Favorites",
    "Aus Favoriten entfernen": "Remove from Favorites",
    "Einstellungen öffnen": "Open Settings",
    "Suche fokussieren": "Focus Search",
    "Standort wählen": "Choose Location",
    "Mein Standort": "My Location",
    "Aktuellen Standort verwenden": "Use Current Location",
    
    // === SECTIONS ===
    "Noch kein Ort": "No location selected",
    "Keine Aktualisierung": "No updates",
    "Kein Heimatort gespeichert": "No home location set",
    "Nicht gesetzt": "Not set",
    "Favoriten": "Favorites",
    "Zuletzt gesucht": "Recently Searched",
    "Keine kürzlichen Suchen": "No recent searches",
    "Kartenansicht": "Map View",
    "Wetter-Historie": "Weather History",
    "Historische Daten": "Historical Data",
    "Einstellungen": "Settings",
    
    // === FOOTER ===
    "Datenquellen": "Data Sources",
    "Datenschutz": "Privacy",
    "Nutzungsbedingungen": "Terms of Service",
    "© 2025 Calchas": "© 2025 Calchas",
  };

  // Store original text content to avoid double-replacement
  const originalContent = new WeakMap();

  /**
   * Recursively walk through DOM and replace text
   */
  function walkAndReplace(node, lang) {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent;
      
      // Get original text if stored, otherwise use current
      let original = originalContent.get(node);
      if (!original) {
        original = text;
        originalContent.set(node, original);
      }
      
      // Reset to original first
      text = original;
      
      if (lang === 'en') {
        // Replace German with English - longer strings first to avoid partial replacements
        const sortedEntries = Object.entries(TRANSLATION_MAP).sort((a, b) => b[0].length - a[0].length);
        for (const [de, en] of sortedEntries) {
          if (text.includes(de)) {
            text = text.replace(new RegExp(de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), en);
          }
        }
      }
      // If lang === 'de', keep original text
      
      node.textContent = text;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip script and style tags
      if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
        for (let child of node.childNodes) {
          walkAndReplace(child, lang);
        }
      }
    }
  }

  /**
   * Update language in the page
   */
  function updateLanguage(lang) {
    console.log(`🌐 TextReplacer: Updating language to: ${lang}`);
    
    // Update HTML lang attribute
    document.documentElement.lang = lang === 'en' ? 'en' : 'de';
    
    // Walk through DOM and replace text
    walkAndReplace(document.body, lang);
    
    console.log(`✅ TextReplacer: Text replacement complete`);
  }

  // Export
  window.TextReplacer = {
    updateLanguage: updateLanguage,
    TRANSLATION_MAP: TRANSLATION_MAP
  };

})(window);



