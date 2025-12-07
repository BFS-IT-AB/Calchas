/**
 * SettingsHome.js - Einstellungen-Hauptseite
 * Design inspiriert von WeatherMaster App
 */
(function (global) {
  // SVG Icons für Settings - Material Design Style
  const ICONS = {
    appearance: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
    home: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
    units: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
    background: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
    models: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>`,
    language: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>`,
    export: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>`,
    import: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" transform="rotate(180 12 12)"/></svg>`,
    discord: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`,
    about: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
  };

  // Icon colors - matching goal screenshot
  const COLORS = {
    appearance: "#c9a227",
    home: "#7cb342",
    units: "#5c6bc0",
    background: "#c75b39",
    models: "#26a69a",
    language: "#9c27b0",
    export: "#7986cb",
    import: "#5c6bc0",
    discord: "#5865f2",
    about: "#7e57c2",
  };

  function renderSettingsHome(appState) {
    const container = document.getElementById("settings-home-container");
    if (!container) {
      console.warn("[SettingsHome] Container nicht gefunden");
      return;
    }

    const homeLocation = getHomeLocationLabel(appState);
    const currentLang =
      global.i18n?.getLanguage?.() === "en" ? "English" : "Deutsch";

    container.innerHTML = `
      <div class="settings-home">
        ${renderRow(
          "appearance",
          "Aussehen",
          "Theme",
          "sheet-settings-theme"
        )}
        ${renderRow("home", "Heimatort", homeLocation, "sheet-settings-home")}
        ${renderRow(
          "units",
          "Einheiten",
          "Temperatur, Wind, Luftdruck, Sichtweite, Niederschlag, Tageszeit, Luftqualitätsindex",
          "sheet-settings-units"
        )}
        ${renderRow(
          "background",
          "Hintergrundaktualisierungen",
          "Update-Intervall, geplante Updates & Benachrichtigungen",
          "sheet-settings-background"
        )}
        ${renderRow(
          "models",
          "Wettermodelle",
          "API-Schlüssel-Verwaltung & API-Status",
          "sheet-settings-models"
        )}
        ${renderRow(
          "language",
          "Sprache",
          currentLang,
          "sheet-settings-language"
        )}
        ${renderRow(
          "export",
          "Daten exportieren",
          null,
          "sheet-settings-export"
        )}
        ${renderRow(
          "import",
          "Daten importieren",
          null,
          "sheet-settings-import"
        )}
        ${renderRow(
          "about",
          "Über WeatherMaster",
          "Änderungsprotokoll, Version, Lizenzen und mehr",
          "sheet-settings-about"
        )}
      </div>
    `;
  }

  function getHomeLocationLabel(appState) {
    const fallback = "Nicht gesetzt";
    const home = appState?.homeLocation;
    if (home?.city || home?.name) {
      const city = home.city || home.name;
      const country = home.country || home.countryCode || "";
      return country ? `${city}, ${country}` : city;
    }

    try {
      const homeData = localStorage.getItem("wetter_home_location");
      if (homeData) {
        const parsed = JSON.parse(homeData);
        if (parsed?.city) {
          return parsed.country
            ? `${parsed.city}, ${parsed.country}`
            : parsed.city;
        }
      }
    } catch (e) {}
    return fallback;
  }

  function renderRow(key, title, subtitle, sheetId) {
    const icon = ICONS[key] || "";
    const color = COLORS[key] || "#666";
    const subtitleHtml = subtitle
      ? `<span class="settings-row__subtitle">${subtitle}</span>`
      : "";

    return `
      <button class="settings-row" type="button" data-bottom-sheet="${sheetId}">
        <span class="settings-row__icon" style="background-color: ${color}">${icon}</span>
        <span class="settings-row__content">
          <span class="settings-row__title">${title}</span>
          ${subtitleHtml}
        </span>
        <span class="settings-row__chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </span>
      </button>
    `;
  }

  function renderExternalLink(key, title, subtitle, url) {
    const icon = ICONS[key] || "";
    const color = COLORS[key] || "#666";
    const subtitleHtml = subtitle
      ? `<span class="settings-row__subtitle">${subtitle}</span>`
      : "";

    return `
      <a class="settings-row settings-row--external" href="${url}" target="_blank" rel="noopener noreferrer">
        <span class="settings-row__icon" style="background-color: ${color}">${icon}</span>
        <span class="settings-row__content">
          <span class="settings-row__title">${title}</span>
          ${subtitleHtml}
        </span>
        <span class="settings-row__chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </span>
      </a>
    `;
  }

  global.SettingsHome = { renderSettingsHome };
})(window);
