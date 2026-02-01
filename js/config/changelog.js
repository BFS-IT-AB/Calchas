/**
 * changelog.js - Changelog-Konfiguration für "Was ist neu" Modal
 *
 * ANLEITUNG: BACKLOG/UPDATE-KARTEN ERSTELLEN
 * ------------------------------------------
 * Um eine neue Release-Karte (Backlog-Item) hinzuzufügen:
 * 1. Öffne das Array `CHANGELOG`.
 * 2. Füge ein neues Objekt an den ANFANG des Arrays (Index 0).
 * 3. Struktur:
 *    {
 *      version: "1.X.X",       // Neue Versionsnummer
 *      date: "DD.MM.YYYY",     // Release-Datum
 *      isLatest: true,         // WICHTIG: Auf true setzen! (Bei alter Version auf false ändern)
 *      title: "Titel...",      // Kurzer, prägnanter Titel des Updates
 *      changes: [              // Liste der Änderungen
 *        {
 *          emoji: "✨",        // Passendes Emoji
 *          type: "Added",      // Typ: Added, Fixed, Changed, Removed
 *          text: "Beschreibung..."
 *        }
 *      ]
 *    }
 */

(function (global) {
  // App Version - Ändere diese Zeile für neue Releases
  const APP_VERSION = "0.7.1-alpha";

  // Changelog Einträge - Neueste Version zuerst!
  const CHANGELOG = [
    {
      version: "0.7.1-alpha",
      date: "01.02.2026",
      isLatest: true,
      title: "🔧 Caching-System Audit & Optimierung",
      changes: [
        {
          emoji: "🗂️",
          type: "Fixed",
          text: "Service Worker urlsToCache vollständig aktualisiert (150+ Dateien)",
        },
        {
          emoji: "🛡️",
          type: "Added",
          text: "Mehrstufiger Offline-Fallback: Network → Cache → Old Caches → Fallback",
        },
        {
          emoji: "⚡",
          type: "Added",
          text: "Race Condition Protection für Service Worker Updates",
        },
        {
          emoji: "🔍",
          type: "Added",
          text: "Health Cache TTL-Validierung und Corruption Detection",
        },
        {
          emoji: "💾",
          type: "Fixed",
          text: "localStorage QuotaExceededError mit automatischem Cleanup",
        },
        {
          emoji: "🔧",
          type: "Added",
          text: "Service Worker Diagnostics API für DevTools Testing",
        },
        {
          emoji: "✅",
          type: "Changed",
          text: "Version-Sync Script mit Regex-Validierung nach Replace",
        },
        {
          emoji: "🌐",
          type: "Changed",
          text: "Universeller Git Hook mit Plattform-Autoerkennung",
        },
      ],
    },
    {
      version: "0.7.0-alpha",
      date: "01.02.2026",
      isLatest: false,
      title:
        "🚧 Alpha-Release: Die Basis steht!",
      changes: [
        {
          emoji: "🚀",
          type: "Added",
          text: "Launch von Calchas v0.7.0-alpha: Die moderne PWA für präzise Wetterdaten.",
        },
        {
          emoji: "📡",
          type: "Added",
          text: "Dual-API System: Zuverlässige Daten durch Open-Meteo & BrightSky Fallback.",
        },
        {
          emoji: "🗺️",
          type: "Added",
          text: "Interaktives Wetter-Radar mit Zeitsteuerung und verschiedenen Kartenebenen.",
        },
        {
          emoji: "❤️",
          type: "Added",
          text: "Health & Safety Center: Windchill-Berechnung, Luftqualität und Gesundheitsindex.",
        },
        {
          emoji: "📊",
          type: "Added",
          text: "Umfangreiche Historie: Wetterdaten-Rückblick und Trend-Analysen.",
        },
        {
          emoji: "📱",
          type: "Added",
          text: "PWA-Support: Offline-Modus, installierbar als App.",
        },
        {
          emoji: "🎨",
          type: "Added",
          text: "Favoriten-Manager.",
        },
        {
          emoji: "🔒",
          type: "Added",
          text: "Privacy First: Alle Daten bleiben lokal auf deinem Gerät.",
        },
        {
          emoji: "🌿",
          type: "Added",
          text: "Pollenflug und Informationen",
        },
        {
          emoji: "🏞️",
          type: "Added",
          text: "Dynamische Landschaften basierend auf Wetter",
        },
      ],
    },
    // Füge hier zukünftige Versionen hinzu (über diesem Kommentar)
    // Vergiss nicht isLatest: false bei der alten Version zu setzen!
  ];

  // Exportiere für globalen Zugriff
  global.APP_VERSION = APP_VERSION;
  global.CHANGELOG = CHANGELOG;

  // Hilfsfunktionen für Changelog-Management
  global.ChangelogManager = {
    getVersion: () => APP_VERSION,
    getChangelog: () => CHANGELOG,
    getLatestChanges: () => CHANGELOG.find((c) => c.isLatest) || CHANGELOG[0],
    getVersionChanges: (version) =>
      CHANGELOG.find((c) => c.version === version),
    getAllVersions: () => CHANGELOG.map((c) => c.version),
    // Neu: Validierung
    validateChangelog: () => {
      const latestCount = CHANGELOG.filter((c) => c.isLatest).length;
      if (latestCount !== 1) {
        console.warn(
          `⚠️ Changelog: Expected 1 isLatest entry, found ${latestCount}`,
        );
        return false;
      }
      return true;
    },
  };

  // Auto-validate on load
  if (global.ChangelogManager.validateChangelog) {
    global.ChangelogManager.validateChangelog();
  }
})(window);
