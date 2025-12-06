// === Haupt-JavaScript-Datei - Interaktivität und Logik ===
// (API-Calls, Button-Clicks, DOM-Manipulation)

/**
 * App-State Management
 */
class AppState {
  constructor() {
    this.currentCity = null;
    this.currentCoordinates = null;
    this.weatherData = {
      openMeteo: null,
      brightSky: null,
      locationDetails: null,
      sunEvents: null,
      moonPhase: null,
    };
    this.isDarkMode = this._loadThemePreference();
    this.favorites = this._loadFavorites();
    this.units = {
      temperature: UI_CONFIG.TEMPERATURE_UNIT,
      wind: UI_CONFIG.WIND_UNIT,
    };
    this.homeLocation = this._loadHomeLocation();
    this.backgroundRefresh = this._loadBackgroundRefresh();
  }

  _loadThemePreference() {
    try {
      return localStorage.getItem("wetter_dark_mode") === "true";
    } catch (e) {
      return false;
    }
  }

  _loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem("wetter_favorites")) || [];
    } catch (e) {
      return [];
    }
  }

  saveFavorite(city, coords) {
    const favorite = { city, coords, addedAt: Date.now() };

    // Prüfe ob schon vorhanden
    const exists = this.favorites.some(
      (f) => f.city.toLowerCase() === city.toLowerCase()
    );
    if (!exists) {
      this.favorites.push(favorite);
      try {
        localStorage.setItem(
          "wetter_favorites",
          JSON.stringify(this.favorites)
        );
      } catch (e) {
        console.warn("Fehler beim Speichern von Favoriten:", e);
      }
    }
  }

  removeFavorite(city) {
    this.favorites = this.favorites.filter(
      (f) => f.city.toLowerCase() !== city.toLowerCase()
    );
    try {
      localStorage.setItem("wetter_favorites", JSON.stringify(this.favorites));
      // Log analytics
      if (window.logAnalyticsEvent) {
        window.logAnalyticsEvent("favorite_action", {
          action: "remove",
          city,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.warn("Fehler beim Löschen von Favoriten:", e);
    }
  }

  isFavorite(city) {
    return this.favorites.some(
      (f) => f.city.toLowerCase() === city.toLowerCase()
    );
  }

  moveFavorite(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const lastIndex = this.favorites.length - 1;
    if (fromIndex < 0 || fromIndex > lastIndex) return;
    let targetIndex = Math.max(0, Math.min(toIndex, lastIndex));
    const item = this.favorites.splice(fromIndex, 1)[0];
    if (!item) return;
    if (fromIndex < targetIndex) {
      targetIndex -= 1;
    }
    this.favorites.splice(targetIndex, 0, item);
    try {
      localStorage.setItem("wetter_favorites", JSON.stringify(this.favorites));
    } catch (e) {
      console.warn("Fehler beim Speichern der Favoriten-Reihenfolge:", e);
    }
  }

  _loadHomeLocation() {
    try {
      const raw = localStorage.getItem("wetter_home_location");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  setHomeLocation(city, coords) {
    if (!city) return;
    const normalizedCoords = coords
      ? {
          lat: coords.lat ?? coords.latitude ?? null,
          lon: coords.lon ?? coords.lng ?? coords.longitude ?? null,
          lng: coords.lng ?? coords.lon ?? coords.longitude ?? null,
        }
      : null;
    this.homeLocation = {
      city,
      coords: normalizedCoords,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(
        "wetter_home_location",
        JSON.stringify(this.homeLocation)
      );
    } catch (e) {
      console.warn("Fehler beim Speichern des Heimatortes:", e);
    }
  }

  clearHomeLocation() {
    this.homeLocation = null;
    try {
      localStorage.removeItem("wetter_home_location");
    } catch (e) {
      console.warn("Fehler beim Entfernen des Heimatortes:", e);
    }
  }

  _loadBackgroundRefresh() {
    try {
      return localStorage.getItem("wetter_refresh_interval") || "off";
    } catch (e) {
      return "off";
    }
  }

  setBackgroundRefresh(value) {
    this.backgroundRefresh = value || "off";
    try {
      localStorage.setItem("wetter_refresh_interval", this.backgroundRefresh);
    } catch (e) {
      console.warn("Fehler beim Speichern des Refresh-Intervalls:", e);
    }
  }
}

const API_PROVIDERS = [
  { id: "open-meteo", name: "Open-Meteo", tag: "Hauptquelle" },
  { id: "brightsky", name: "BrightSky", tag: "Hauptquelle" },
  {
    id: "openweathermap",
    name: "OpenWeatherMap",
    tag: "Optional",
    requiresKey: true,
    key: "openweathermap",
  },
  {
    id: "visualcrossing",
    name: "VisualCrossing",
    tag: "Optional",
    requiresKey: true,
    key: "visualcrossing",
  },
  {
    id: "meteostat",
    name: "Meteostat",
    tag: "Historisch",
    requiresKey: true,
    key: "meteostat",
    note: "Für historische Trenddaten",
  },
  {
    id: "bigdatacloud",
    name: "BigDataCloud",
    tag: "Geodaten",
    note: "Reverse-Geocoding Details",
  },
  {
    id: "sunrisesunset",
    name: "Sunrise & Sunset",
    tag: "Astronomie",
    note: "Dämmerungszeiten",
  },
  {
    id: "moonphase",
    name: "Moon Phase",
    tag: "Astronomie",
    note: "Licht & Phase",
  },
];

const DEMO_CITY_FALLBACK = "Aschaffenburg";

let activeSettingsSubview = null;

const SETTINGS_NAV_MAP = {
  appearance: {
    label: "Aussehen",
    focusSelector: "#darkModeToggle",
  },
  home: {
    label: "Heimatort",
    focusSelector: "#set-home-btn",
  },
  units: {
    label: "Einheiten",
    focusSelector: "#temp-unit-select",
  },
  background: {
    label: "Hintergrundaktualisierungen",
    focusSelector: "#background-refresh-select",
  },
  models: {
    label: "Wettermodelle",
  },
  locale: {
    label: "Sprache & Speicher",
    focusSelector: "#lang-select",
  },
  export: {
    label: "Daten exportieren",
    focusSelector: "#settings-export-data",
  },
  import: {
    label: "Daten importieren",
    focusSelector: "#settings-import-data",
  },
  push: {
    label: "Push-Benachrichtigungen",
    focusSelector: "#pushToggle",
  },
  "api-keys": {
    label: "API Keys",
    focusSelector: "#openweathermap-key",
  },
  status: {
    label: "Status & Quellen",
    focusSelector: "#api-status",
  },
  comparison: {
    label: "API Vergleiche",
    focusSelector: "#settings-source-comparison",
  },
  docs: {
    label: "Technische Dokumentation",
  },
};

function setupMobileViewportWatcher() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const target = document.body;
  if (!target) {
    document.addEventListener("DOMContentLoaded", () =>
      setupMobileViewportWatcher()
    );
    return;
  }

  if (typeof window.matchMedia !== "function") {
    target.classList.add("mobile-app");
    return;
  }

  const mediaQuery = window.matchMedia("(max-width: 768px)");

  const applyState = (event) => {
    const matches =
      typeof event.matches === "boolean" ? event.matches : mediaQuery.matches;
    target.classList.toggle("mobile-app", matches);
  };

  applyState(mediaQuery);

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", applyState);
  } else if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(applyState);
  }
}

/**
 * Versteckt die App-Bar beim Runterscrollen und zeigt sie beim Hochscrollen
 */
function setupAppBarScrollBehavior() {
  const appBar = document.getElementById("app-bar");
  const scrollContainer = document.querySelector(".app-main-views");

  if (!appBar || !scrollContainer) return;

  let lastScrollTop = 0;
  let ticking = false;
  const scrollThreshold = 10; // Mindest-Scroll-Distanz vor Reaktion

  scrollContainer.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollTop = scrollContainer.scrollTop;
          const scrollDelta = currentScrollTop - lastScrollTop;

          // Nur reagieren wenn Scroll-Distanz größer als Schwellenwert
          if (Math.abs(scrollDelta) > scrollThreshold) {
            if (scrollDelta > 0 && currentScrollTop > 60) {
              // Runterscrollen - verstecken
              appBar.classList.add("app-bar--hidden");
            } else if (scrollDelta < 0) {
              // Hochscrollen - zeigen
              appBar.classList.remove("app-bar--hidden");
            }
            lastScrollTop = currentScrollTop;
          }

          // Am Anfang der Seite immer zeigen
          if (currentScrollTop <= 10) {
            appBar.classList.remove("app-bar--hidden");
          }

          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );
}

/**
 * Pull-to-Refresh mit Rate-Limiting (5 Minuten Cooldown)
 */
const REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 Minuten
let lastManualRefreshTime = 0;

function getLastRefreshTime() {
  try {
    const stored = localStorage.getItem("wetter_last_refresh");
    return stored ? parseInt(stored, 10) : 0;
  } catch (e) {
    return lastManualRefreshTime;
  }
}

function setLastRefreshTime(time) {
  lastManualRefreshTime = time;
  try {
    localStorage.setItem("wetter_last_refresh", time.toString());
  } catch (e) {
    // Ignorieren
  }
}

function canRefresh() {
  const lastRefresh = getLastRefreshTime();
  const now = Date.now();
  return now - lastRefresh >= REFRESH_COOLDOWN_MS;
}

function getTimeUntilNextRefresh() {
  const lastRefresh = getLastRefreshTime();
  const now = Date.now();
  const remaining = REFRESH_COOLDOWN_MS - (now - lastRefresh);
  return Math.max(0, Math.ceil(remaining / 60000)); // Minuten
}

function showPullRefreshIndicator(message, type = "info", duration = 2500) {
  let indicator = document.getElementById("pull-refresh-indicator");

  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "pull-refresh-indicator";
    indicator.className = "pull-refresh-indicator";
    document.body.appendChild(indicator);
  }

  indicator.textContent = message;
  indicator.className = "pull-refresh-indicator";

  if (type === "warning") {
    indicator.classList.add("pull-refresh-indicator--warning");
  } else if (type === "success") {
    indicator.classList.add("pull-refresh-indicator--success");
  }

  // Zeige Indikator
  requestAnimationFrame(() => {
    indicator.classList.add("visible");
  });

  // Verstecke nach Dauer
  setTimeout(() => {
    indicator.classList.remove("visible");
  }, duration);
}

function setupPullToRefresh() {
  const scrollContainer = document.querySelector(".app-main-views");
  if (!scrollContainer) return;

  let touchStartY = 0;
  let touchCurrentY = 0;
  let isPulling = false;
  const pullThreshold = 80; // Pixel zum Auslösen

  scrollContainer.addEventListener(
    "touchstart",
    (e) => {
      if (scrollContainer.scrollTop <= 5) {
        touchStartY = e.touches[0].clientY;
        isPulling = true;
      }
    },
    { passive: true }
  );

  scrollContainer.addEventListener(
    "touchmove",
    (e) => {
      if (!isPulling) return;
      touchCurrentY = e.touches[0].clientY;
      const pullDistance = touchCurrentY - touchStartY;

      // Zeige visuelles Feedback beim Ziehen
      if (pullDistance > 30 && scrollContainer.scrollTop <= 0) {
        const indicator = document.getElementById("pull-refresh-indicator");
        if (indicator) {
          indicator.classList.add("pulling");
          if (pullDistance > pullThreshold) {
            indicator.textContent = "↻ Loslassen zum Aktualisieren";
          } else {
            indicator.textContent = "↓ Zum Aktualisieren ziehen";
          }
          indicator.classList.add("visible");
        } else {
          showPullRefreshIndicator("↓ Zum Aktualisieren ziehen", "info", 500);
        }
      }
    },
    { passive: true }
  );

  scrollContainer.addEventListener(
    "touchend",
    async () => {
      if (!isPulling) return;

      const pullDistance = touchCurrentY - touchStartY;
      isPulling = false;
      touchStartY = 0;
      touchCurrentY = 0;

      const indicator = document.getElementById("pull-refresh-indicator");
      if (indicator) {
        indicator.classList.remove("pulling");
      }

      // Prüfe ob Pull-Distanz ausreichend war
      if (pullDistance > pullThreshold && scrollContainer.scrollTop <= 5) {
        // Prüfe Rate-Limit
        if (!canRefresh()) {
          const minutesLeft = getTimeUntilNextRefresh();
          if (minutesLeft > 0) {
            showPullRefreshIndicator(
              `⏳ Bitte warte noch ${minutesLeft} Min.`,
              "warning",
              2500
            );
          } else {
            showPullRefreshIndicator(
              "✓ Bereits auf dem neuesten Stand",
              "info",
              2000
            );
          }
          return;
        }

        // Aktualisierung durchführen
        showPullRefreshIndicator("↻ Aktualisiere...", "info", 1500);

        try {
          if (appState && appState.currentCity) {
            setLastRefreshTime(Date.now());
            await loadWeather(appState.currentCity, { silent: false });
            showPullRefreshIndicator("✓ Aktualisiert!", "success", 1500);
          }
        } catch (e) {
          showPullRefreshIndicator(
            "✗ Fehler beim Aktualisieren",
            "warning",
            2500
          );
          console.error("Pull-to-Refresh Fehler:", e);
        }
      }
    },
    { passive: true }
  );
}

// Exportiere für globale Verwendung
window.canRefresh = canRefresh;
window.getTimeUntilNextRefresh = getTimeUntilNextRefresh;
window.setLastRefreshTime = setLastRefreshTime;

async function initAppShell(appState) {
  try {
    setupMobileViewportWatcher();
  } catch (e) {
    console.warn("Viewport Watcher konnte nicht initialisiert werden", e);
  }

  if (window.AppBar && window.AppBar.initAppBar) {
    try {
      window.AppBar.initAppBar();
    } catch (e) {
      console.warn("AppBar Initialisierung fehlgeschlagen", e);
    }
  }

  if (window.BottomNav && window.BottomNav.initBottomNav) {
    try {
      window.BottomNav.initBottomNav();
    } catch (e) {
      console.warn("BottomNav Initialisierung fehlgeschlagen", e);
    }
  }

  if (window.ModalController && window.ModalController.initModalController) {
    try {
      window.ModalController.initModalController();
    } catch (e) {
      console.warn("ModalController Initialisierung fehlgeschlagen", e);
    }
  }

  if (window.LocationPickerController && window.LocationPickerController.init) {
    try {
      window.LocationPickerController.init();
    } catch (e) {
      console.warn(
        "LocationPickerController Initialisierung fehlgeschlagen",
        e
      );
    }
  }

  if (window.SettingsHome && window.SettingsHome.renderSettingsHome) {
    try {
      window.SettingsHome.renderSettingsHome(appState);
    } catch (e) {
      console.warn("SettingsHome Initialisierung fehlgeschlagen", e);
    }
  }

  if (window.ThemeSelectorSheet && window.ThemeSelectorSheet.renderThemeSheet) {
    try {
      window.ThemeSelectorSheet.renderThemeSheet(appState);
    } catch (e) {
      console.warn("ThemeSelectorSheet Initialisierung fehlgeschlagen", e);
    }
  }

  if (window.UnitsSelectorSheet && window.UnitsSelectorSheet.renderUnitsSheet) {
    try {
      window.UnitsSelectorSheet.renderUnitsSheet(appState);
    } catch (e) {
      console.warn("UnitsSelectorSheet Initialisierung fehlgeschlagen", e);
    }
  }

  if (
    window.LanguageSelectorSheet &&
    window.LanguageSelectorSheet.renderLanguageSheet
  ) {
    try {
      window.LanguageSelectorSheet.renderLanguageSheet(appState);
    } catch (e) {
      console.warn("LanguageSelectorSheet Initialisierung fehlgeschlagen", e);
    }
  }

  if (window.HomeLocationSheet && window.HomeLocationSheet.renderHomeSheet) {
    try {
      window.HomeLocationSheet.renderHomeSheet(appState);
    } catch (e) {
      console.warn("HomeLocationSheet Initialisierung fehlgeschlagen", e);
    }
  }

  if (window.AboutSheet && window.AboutSheet.renderAboutSheet) {
    try {
      window.AboutSheet.renderAboutSheet(appState);
    } catch (e) {
      console.warn("AboutSheet Initialisierung fehlgeschlagen", e);
    }
  }

  if (
    window.PrivacyApiInfoSheet &&
    window.PrivacyApiInfoSheet.renderPrivacySheet
  ) {
    try {
      window.PrivacyApiInfoSheet.renderPrivacySheet();
    } catch (e) {
      console.warn("PrivacyApiInfoSheet Initialisierung fehlgeschlagen", e);
    }
  }

  // Map-Layer-Auswahl: LayerBottomSheet-Interaktion
  try {
    const layerSheet = document.getElementById("sheet-map-layers");
    const layerButtons =
      layerSheet?.querySelectorAll(".map-layer-chip[data-layer-id]") || [];

    if (layerButtons.length && window.ModalController) {
      layerButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const layerId = btn.getAttribute("data-layer-id");
          const group = btn.getAttribute("data-layer-group") || "";

          // Analytics-Hook
          if (window.logAnalyticsEvent) {
            window.logAnalyticsEvent("map_layer_selected", {
              layerId,
              group,
              timestamp: Date.now(),
            });
          }

          // Hook: hier könnte ein Radar/Layer-Manager aktiviert werden
          if (window.MapLayerManager && window.MapLayerManager.setActiveLayer) {
            try {
              window.MapLayerManager.setActiveLayer(layerId);
            } catch (err) {
              console.warn("Fehler beim Aktivieren des Map-Layers", err);
            }
          }

          // Sheet nach Auswahl schließen
          try {
            if (window.ModalController && window.ModalController.closeAll) {
              window.ModalController.closeAll();
            }
          } catch (err) {
            console.warn("Fehler beim Schließen des Layer-Sheets", err);
          }
        });
      });
    }
  } catch (e) {
    console.warn("LayerBottomSheet Initialisierung fehlgeschlagen", e);
  }

  // Radar / Kartenansicht vorbereiten (MapContainer + Layers + Timeline-Stub)
  try {
    if (window.MapContainer && typeof window.MapContainer.init === "function") {
      const center =
        appState && appState.currentCoordinates
          ? [
              appState.currentCoordinates.lat || 52.52,
              appState.currentCoordinates.lon || 13.405,
            ]
          : [52.52, 13.405];

      window.MapContainer.init({
        domSelector: "#map-container",
        center,
        zoom: 7,
      });
    }

    // Optionale MapComponent-Integration (falls vorhanden)
    if (window.MapComponent) {
      const map = new window.MapComponent("map-container");
      map.render();

      // Expose for debugging or späteren Gebrauch
      window._radarMap = map;
    }

    if (window.MapLayerManager) {
      window.MapLayerManager.init(window.MapContainer);

      // Layer-Stubs für Phase 1 registrieren
      if (window.RadarLayer) {
        window.MapLayerManager.registerLayer(
          "radar",
          new window.RadarLayer({ id: "radar" })
        );
      }
      if (window.SatelliteLayer) {
        window.MapLayerManager.registerLayer(
          "satellite",
          new window.SatelliteLayer({ id: "satellite" })
        );
      }
      if (window.TemperatureLayer) {
        window.MapLayerManager.registerLayer(
          "temperature",
          new window.TemperatureLayer({ id: "temperature" })
        );
      }
      if (window.WindLayer) {
        window.MapLayerManager.registerLayer(
          "wind",
          new window.WindLayer({ id: "wind" })
        );
      }
    }

    if (
      window.RadarController &&
      typeof window.RadarController.init === "function"
    ) {
      window.RadarController.init(window.MapLayerManager);
      if (typeof window.RadarController.generateFrames === "function") {
        window.RadarController.generateFrames();
      }
    }

    // Layer-Liste im Bottom-Sheet aus Registry rendern (Phase 1)
    const layerListEl = document.getElementById("map-layer-list");
    if (layerListEl && window.MapLayerManager) {
      const LABELS = {
        radar: "Regenradar",
        satellite: "Satellit",
        temperature: "Temperatur",
        wind: "Wind",
        cloud: "Bewölkung",
        humidity: "Luftfeuchte",
        aqi: "Luftqualität",
        alerts: "Warnungen",
      };

      const renderLayerList = () => {
        const order = [
          "radar",
          "satellite",
          "temperature",
          "cloud",
          "humidity",
          "wind",
          "aqi",
          "alerts",
        ];
        const rawLayers = window.MapLayerManager.getLayerList();
        const layers = order
          .map((id) => rawLayers.find((l) => l.id === id))
          .filter(Boolean);
        layerListEl.innerHTML = "";
        layers.forEach((entry) => {
          const row = document.createElement("button");
          row.type = "button";
          row.className = "map-layer-row";
          row.dataset.layerId = entry.id;
          row.setAttribute("aria-pressed", entry.visible ? "true" : "false");

          const label = document.createElement("span");
          label.className = "map-layer-row__label";
          label.textContent = LABELS[entry.id] || entry.id;

          const state = document.createElement("span");
          state.className = "map-layer-row__state";
          state.textContent = entry.visible ? "Aktiv" : "Aus";

          row.appendChild(label);
          row.appendChild(state);

          row.addEventListener("click", () => {
            window.MapLayerManager.toggleLayer(entry.id);
            renderLayerList();
          });

          layerListEl.appendChild(row);
        });
      };

      renderLayerList();
    }

    // Einfache Timeline-Interaktion für Phase 1 (ohne echte Frames)
    const playBtn = document.getElementById("map-timeline-play");
    const prevBtn = document.getElementById("map-timeline-prev");
    const nextBtn = document.getElementById("map-timeline-next");
    const slider = document.getElementById("map-timeline-slider");

    if (playBtn && window.RadarController) {
      let isPlaying = false;
      playBtn.addEventListener("click", () => {
        if (!isPlaying) {
          window.RadarController.play();
          playBtn.textContent = "⏸";
        } else {
          window.RadarController.pause();
          playBtn.textContent = "▶";
        }
        isPlaying = !isPlaying;
      });
    }

    if (prevBtn && window.RadarController) {
      prevBtn.addEventListener("click", () => window.RadarController.step(-1));
    }
    if (nextBtn && window.RadarController) {
      nextBtn.addEventListener("click", () => window.RadarController.step(1));
    }
    if (slider && window.RadarController) {
      slider.addEventListener("input", (event) => {
        window.RadarController.seek(event.target.value);
      });
    }
  } catch (e) {
    console.warn("Radar / Karten-Initialisierung fehlgeschlagen", e);
  }

  // History View - Browser-kompatible Version
  if (window.HistoryView) {
    try {
      const historyView = new window.HistoryView({
        containerId: "history-container",
      });
      let historyData = [];

      // Try to load history data if service is available
      if (
        window.weatherDataService &&
        typeof window.weatherDataService.loadHistory === "function"
      ) {
        try {
          const today = new Date();
          const thirtyDaysAgo = new Date(
            today.getTime() - 30 * 24 * 60 * 60 * 1000
          );
          const lat = appState?.currentCoordinates?.lat ?? 52.52;
          const lon = appState?.currentCoordinates?.lon ?? 13.405;
          const startDate = thirtyDaysAgo.toISOString().split("T")[0];
          const endDate = today.toISOString().split("T")[0];

          historyData =
            (await window.weatherDataService.loadHistory(
              lat,
              lon,
              startDate,
              endDate
            )) || [];
          if (appState) appState.history = historyData;
        } catch (loadErr) {
          console.warn("History data loading failed:", loadErr);
        }
      }

      await historyView.render(historyData);
      window.HISTORY_VIEW = historyView;
    } catch (e) {
      console.warn("History View konnte nicht initialisiert werden", e);
    }
  }

  // Detail-Sheets initialisieren, wenn vorhanden
  try {
    if (
      window.PrecipitationDetailSheet &&
      window.PrecipitationDetailSheet.renderPrecipitationDetailSheet
    ) {
      window.PrecipitationDetailSheet.renderPrecipitationDetailSheet(appState);
    }
    if (
      window.WindDetailSheet &&
      window.WindDetailSheet.renderWindDetailSheet
    ) {
      window.WindDetailSheet.renderWindDetailSheet(appState);
    }
    if (window.UVDetailSheet && window.UVDetailSheet.renderUVDetailSheet) {
      window.UVDetailSheet.renderUVDetailSheet(appState);
    }
    if (window.AQIDetailSheet && window.AQIDetailSheet.renderAQIDetailSheet) {
      window.AQIDetailSheet.renderAQIDetailSheet(appState);
    }
    if (
      window.VisibilityDetailSheet &&
      window.VisibilityDetailSheet.renderVisibilityDetailSheet
    ) {
      window.VisibilityDetailSheet.renderVisibilityDetailSheet(appState);
    }
  } catch (e) {
    console.warn("Detail-Sheets konnten nicht initialisiert werden", e);
  }

  // Falls bereits Renderdaten vorhanden sind, initiales Home-Rendering auslösen
  if (appState && appState.renderData && window.WeatherHero) {
    try {
      const units = appState.units || { temperature: "C", wind: "km/h" };
      const locationDetails = appState.renderData?.locationDetails || {};
      const sunEvents = appState.renderData?.sunEvents || {};
      const daily = appState.renderData?.openMeteo?.daily || [];
      const homeState = {
        current:
          appState.renderData?.currentSnapshot ||
          appState.renderData?.current ||
          {},
        daily: daily,
        hourly:
          appState.renderData?.hourly ||
          buildHourlyDisplayPayload(appState.renderData, 24).hours ||
          [],
        location: appState.location || {
          name: locationDetails.city || "Aschaffenburg",
          cityName: locationDetails.city || "Aschaffenburg",
          country: locationDetails.country || "Deutschland",
        },
        locationDetails: locationDetails,
        sunEvents: sunEvents,
        temperatureUnit: units.temperature || "C",
        windUnit: units.wind || "km/h",
        locale: appState.locale || "de-DE",
        lastUpdated: Date.now(),
        aqi: appState.renderData?.aqi || appState.aqi || {},
        pollen: appState.renderData?.pollen || {},
        moonPhase: appState.renderData?.moonPhase || {},
      };

      const healthState =
        typeof window.healthSafetyEngine === "function"
          ? window.healthSafetyEngine(homeState)
          : {};

      if (window.WeatherHero && window.WeatherHero.renderWeatherHero) {
        window.WeatherHero.renderWeatherHero(homeState, {
          iconForCode: (code, isDay) => {
            try {
              if (window.weatherIconMapper?.toHtml) {
                return window.weatherIconMapper.toHtml(code, isDay);
              }
              if (window.iconMapper?.toHtml) {
                return window.iconMapper.toHtml(code, isDay);
              }
            } catch (e) {
              return "";
            }
            return "";
          },
          formatUpdatedAt: (ts) => {
            if (!ts) return "";
            try {
              return new Date(ts).toLocaleTimeString(homeState.locale, {
                hour: "2-digit",
                minute: "2-digit",
              });
            } catch {
              return "";
            }
          },
        });
      }

      if (window.HomeCards && window.HomeCards.renderHomeCards) {
        window.HomeCards.renderHomeCards(homeState, healthState);
      }

      // Render Weather Cards Grid (Visual Cards)
      if (window.WeatherCards && window.WeatherCards.renderWeatherCards) {
        window.WeatherCards.renderWeatherCards(homeState);
      }

      if (window.HealthSafetyView && window.HealthSafetyView.render) {
        try {
          window.HealthSafetyView.render(homeState, healthState);
        } catch (e) {
          console.warn("HealthSafetyView Rendering fehlgeschlagen", e);
        }
      }

      // Detail-Sheets initial mit Daten befüllen
      try {
        if (window.PrecipitationDetailSheet) {
          window.PrecipitationDetailSheet.renderPrecipitationDetailSheet(
            homeState
          );
        }
        if (window.WindDetailSheet) {
          window.WindDetailSheet.renderWindDetailSheet(homeState);
        }
        if (window.UVDetailSheet) {
          window.UVDetailSheet.renderUVDetailSheet(homeState);
        }
        if (window.AQIDetailSheet) {
          window.AQIDetailSheet.renderAQIDetailSheet(homeState);
        }
        if (window.TemperatureTrendDetailSheet) {
          window.TemperatureTrendDetailSheet.renderTemperatureTrendDetailSheet(
            homeState
          );
        }
        if (window.SunCloudDetailSheet) {
          window.SunCloudDetailSheet.renderSunCloudDetailSheet(homeState);
        }
      } catch (e) {
        console.warn("Detail-Sheets Rendering fehlgeschlagen", e);
      }
    } catch (e) {
      console.warn("Initiales Home-Rendering im App-Shell fehlgeschlagen", e);
    }
  }
}

function buildDemoRenderData() {
  const now = new Date();
  const currentHour = now.getHours();

  // Realistische Winter-Demo-Daten (Dezember)
  const baseTemp = 3; // Aktuelle Temperatur wie im Screenshot

  const hourly = Array.from({ length: 48 }, (_, idx) => {
    const slot = new Date(now.getTime() + idx * 60 * 60 * 1000);
    const hour = slot.getHours();

    // Tagesgang: kälter nachts, wärmer mittags
    const tempVariation = Math.sin(((hour - 6) / 24) * Math.PI * 2) * 3;
    const temp = baseTemp + tempVariation - (idx > 24 ? 1 : 0);
    const humidity = 80 + Math.sin((hour / 12) * Math.PI) * 10;
    const wind = 5 + Math.random() * 5;
    const isDay = hour >= 8 && hour <= 16;
    const weatherCode = 3; // Bedeckt wie im Screenshot

    return {
      time: slot.toISOString(),
      timeLabel: slot.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      temperature: Number(temp.toFixed(1)),
      windSpeed: Number(wind.toFixed(1)),
      windDirection: 180 + Math.random() * 90,
      windGust: Number((wind * 1.5).toFixed(1)),
      humidity: Math.round(humidity),
      feelsLike: Number((temp - 3).toFixed(1)),
      apparentTemperature: Number((temp - 3).toFixed(1)),
      precipitationProbability: idx % 8 === 0 ? 15 : 5,
      precipProb: idx % 8 === 0 ? 15 : 5,
      precipitation: 0,
      pressure: 1015,
      surfacePressure: 1015,
      uvIndex: isDay ? 1 : 0,
      visibility: 40,
      cloudCover: 100,
      dewPoint: temp - 4,
      isDay: isDay ? 1 : 0,
      weatherCode: weatherCode,
      weathercode: weatherCode,
      iconHtml: "☁️",
      description: "Bedeckt",
    };
  });

  // Sunrise/Sunset für Winter
  const sunrise = new Date(now);
  sunrise.setHours(8, 1, 0, 0);
  const sunset = new Date(now);
  sunset.setHours(16, 24, 0, 0);

  // Moonrise/Moonset
  const moonrise = new Date(now);
  moonrise.setHours(2, 46, 0, 0);
  const moonset = new Date(now);
  moonset.setHours(6, 11, 0, 0);

  // 7-Tage Vorhersage wie im Screenshot (heute + 6 Tage)
  const dailyData = [
    { offset: 0, max: 4, min: 1, precip: 3, code: 3, icon: "☁️" }, // Heute
    { offset: 1, max: 5, min: 0, precip: 3, code: 45, icon: "🌫️" },
    { offset: 2, max: 9, min: 1, precip: 84, code: 61, icon: "🌧️" },
    { offset: 3, max: 6, min: 2, precip: 20, code: 3, icon: "☁️" },
    { offset: 4, max: 5, min: 1, precip: 10, code: 2, icon: "⛅" },
    { offset: 5, max: 7, min: 0, precip: 5, code: 3, icon: "☁️" },
    { offset: 6, max: 4, min: -1, precip: 15, code: 71, icon: "🌨️" },
  ];

  const byDay = dailyData.map((day, idx) => {
    const dayDate = new Date(now.getTime() + day.offset * 24 * 60 * 60 * 1000);
    const daySunrise = new Date(dayDate);
    daySunrise.setHours(8, 1, 0, 0);
    const daySunset = new Date(dayDate);
    daySunset.setHours(16, 24, 0, 0);

    return {
      date: dayDate.toISOString(),
      tempMax: day.max,
      tempMin: day.min,
      temperatureMax: day.max,
      temperatureMin: day.min,
      precipProbMax: day.precip,
      precipitationProbabilityMax: day.precip,
      precipitationSum: day.precip > 50 ? 5.2 : 0,
      weatherCode: day.code,
      iconHtml: day.icon,
      sunrise: daySunrise.toISOString(),
      sunset: daySunset.toISOString(),
      moonrise: moonrise.toISOString(),
      moonset: moonset.toISOString(),
      moonPhase: 0.25,
      uvIndexMax: 1,
      windSpeedMax: 15,
      description:
        day.code === 3 ? "Bedeckt" : day.code === 61 ? "Regen" : "Wechselhaft",
    };
  });

  // Aktuelles Wetter
  const currentSnapshot = {
    temperature: baseTemp,
    apparentTemperature: 0,
    feelsLike: 0,
    humidity: 86,
    windSpeed: 8,
    windDirection: 225,
    windGust: 12,
    weatherCode: 3,
    code: 3,
    description: "Bedeckt",
    summary: "Bedeckt",
    isDay: currentHour >= 8 && currentHour <= 16,
    precipProb: 5,
    uvIndex: 1,
    pressure: 1015,
    surfacePressure: 1015,
    visibility: 40,
    cloudCover: 100,
    dewPoint: 4,
    time: now.toISOString(),
  };

  return {
    openMeteo: {
      hourly,
      daily: byDay,
    },
    hourly,
    currentSnapshot,
    current: currentSnapshot,
    brightSky: null,
    locationDetails: {
      city: "Aschaffenburg",
      country: "Deutschland",
      countryFlag: "🇩🇪",
      region: "Bayern",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      latitude: 49.97,
      longitude: 9.15,
    },
    sunEvents: {
      sunrise: sunrise.toISOString(),
      sunset: sunset.toISOString(),
      dayLengthSeconds: 8 * 3600 + 22 * 60,
    },
    moonPhase: {
      phaseName: "Erstes Viertel",
      illumination: 0.25,
      emoji: "🌓",
    },
    aqi: {
      europeanAqi: 29,
      usAqi: 35,
      label: "OK",
    },
    pollen: {
      trees: 1,
      grass: 1,
      weeds: 1,
    },
    sources: [{ id: "demo", name: "Demo", success: true }],
  };
}

function renderDemoExperience(reason = "") {
  try {
    if (!window.weatherDisplay) {
      window.__deferredDemoRender = () => renderDemoExperience(reason);
      return false;
    }

    const demoData = buildDemoRenderData();
    if (!demoData?.openMeteo?.hourly?.length) {
      return false;
    }

    if (!appState) {
      appState = new AppState();
      window.appState = appState;
    }

    appState.renderData = demoData;
    appState.weatherData = demoData;
    appState.currentCity = demoData.locationDetails?.city || DEMO_CITY_FALLBACK;

    document.body?.classList?.add("demo-mode");
    if (document.body?.dataset) {
      document.body.dataset.appMode = "demo";
    }

    // Altes Display für Kompatibilität
    weatherDisplay.displayCurrent(demoData, appState.currentCity);
    resetHourlySection();
    const demoHourly = buildHourlyDisplayPayload(demoData, 24);
    weatherDisplay.displayHourly(demoHourly.hours, demoHourly.label || "Demo");
    weatherDisplay.displayForecast(demoData.openMeteo.daily);

    // NEUES Home UI Rendering
    const locationDetails = demoData.locationDetails || {};
    const sunEvents = demoData.sunEvents || {};
    const homeState = {
      current: demoData.currentSnapshot || demoData.current || {},
      daily: demoData.openMeteo?.daily || [],
      hourly: demoData.hourly || [],
      location: {
        name: locationDetails.city || appState.currentCity,
        cityName: locationDetails.city || appState.currentCity,
        country: locationDetails.country || "Deutschland",
      },
      locationDetails: locationDetails,
      sunEvents: sunEvents,
      temperatureUnit: appState.units?.temperature || "C",
      windUnit: appState.units?.wind || "km/h",
      locale: appState.locale || "de-DE",
      lastUpdated: Date.now(),
      aqi: demoData.aqi || {},
      pollen: demoData.pollen || {},
      moonPhase: demoData.moonPhase || {},
    };

    const healthState =
      typeof window.healthSafetyEngine === "function"
        ? window.healthSafetyEngine(homeState)
        : {};

    // Render Hero Section
    if (window.WeatherHero && window.WeatherHero.renderWeatherHero) {
      window.WeatherHero.renderWeatherHero(homeState, {
        iconForCode: (code, isDay) => {
          try {
            if (window.weatherIconMapper?.toHtml)
              return window.weatherIconMapper.toHtml(code, isDay);
            if (window.iconMapper?.toHtml)
              return window.iconMapper.toHtml(code, isDay);
          } catch (e) {}
          return "";
        },
        formatUpdatedAt: (ts) => {
          if (!ts) return "";
          try {
            return new Date(ts).toLocaleTimeString(homeState.locale, {
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {
            return "";
          }
        },
      });
    }

    // Render Home Cards (Insights, Hourly, Daily)
    if (window.HomeCards && window.HomeCards.renderHomeCards) {
      window.HomeCards.renderHomeCards(homeState, healthState);
    }

    // Render Weather Cards Grid (Visual Metric Cards)
    if (window.WeatherCards && window.WeatherCards.renderWeatherCards) {
      window.WeatherCards.renderWeatherCards(homeState);
    }

    // Render Health & Safety View
    if (window.HealthSafetyView && window.HealthSafetyView.render) {
      try {
        window.HealthSafetyView.render(homeState, healthState);
      } catch (e) {
        console.warn("HealthSafetyView Rendering fehlgeschlagen", e);
      }
    }

    // Render Froggy Hero Background
    if (window.FrogHeroPlayer && window.FrogHeroPlayer.renderFrogHero) {
      try {
        window.FrogHeroPlayer.renderFrogHero(homeState);
      } catch (e) {
        console.warn("FrogHeroPlayer Rendering fehlgeschlagen", e);
      }
    }

    try {
      weatherDisplay.showSourcesComparison(
        demoData.openMeteo,
        null,
        demoData.sources || []
      );
    } catch (e) {
      console.warn("Demo-Quellenvergleich fehlgeschlagen", e);
    }

    updateTopbarStatus(appState.currentCity);
    syncExtendedPanels(
      demoData.locationDetails || {
        city: appState.currentCity,
        latitude: 49.97,
        longitude: 9.15,
      }
    );

    if (reason && typeof window.showInfo === "function") {
      window.showInfo(reason);
    }

    // ensure future deferred requests use the fresh snapshot
    if (window.__deferredDemoRender) {
      delete window.__deferredDemoRender;
    }

    console.log("[Demo] UI gerendert mit Demo-Daten:", homeState);
    return true;
  } catch (e) {
    console.warn("Demo-Daten konnten nicht gerendert werden", e);
    return false;
  }
}

function exitDemoMode() {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;
  body.classList.remove("demo-mode");
  if (body.dataset) {
    delete body.dataset.appMode;
  }
}

/**
 * Einfaches HTML-Escape (für Sicherheitszwecke beim Erzeugen von innerHTML vermeiden wir es,
 * stattdessen erzeugen wir DOM-Elemente in `renderFavorites`).
 */
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}

/**
 * Rendert die Favoriten-Liste in der UI
 */
function renderFavorites() {
  const container = document.querySelector(".favorites-list");
  if (!container || !window.appState) return;

  // Leere Container
  container.innerHTML = "";

  const favs = appState.favorites || [];
  if (!favs.length) {
    const p = document.createElement("p");
    p.className = "no-favorites";
    p.textContent =
      "⭐ Noch keine Favoriten. Favorit hinzufügen über das Stern-Symbol.";
    container.appendChild(p);
    return;
  }

  const formatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  favs.forEach((f, index) => {
    const item = document.createElement("div");
    item.className = "favorite-item";
    item.dataset.city = f.city;
    item.dataset.index = String(index);
    item.draggable = true;
    item.setAttribute("role", "listitem");
    item.setAttribute("aria-label", `Favorit ${f.city}`);
    item.setAttribute("aria-grabbed", "false");

    item.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", item.dataset.index || "0");
      item.classList.add("dragging");
      item.setAttribute("aria-grabbed", "true");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      item.classList.remove("dragover");
      item.setAttribute("aria-grabbed", "false");
    });

    item.addEventListener("dragenter", (ev) => {
      ev.preventDefault();
      item.classList.add("dragover");
    });

    item.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("dragover");
    });

    item.addEventListener("drop", (ev) => {
      ev.preventDefault();
      item.classList.remove("dragover");
      const fromIndex = parseInt(ev.dataTransfer.getData("text/plain"), 10);
      const toIndex = parseInt(item.dataset.index || "-1", 10);
      if (!Number.isNaN(fromIndex) && !Number.isNaN(toIndex)) {
        appState.moveFavorite(fromIndex, toIndex);
        renderFavorites();
      }
    });

    const info = document.createElement("div");
    info.className = "favorite-info";

    const nameBtn = document.createElement("button");
    nameBtn.className = "fav-name btn-small";
    nameBtn.type = "button";
    nameBtn.textContent = f.city;
    nameBtn.addEventListener("click", () => {
      loadWeather(f.city);
    });

    const meta = document.createElement("span");
    meta.className = "favorite-meta";
    const metaDate = f.addedAt ? new Date(f.addedAt) : new Date();
    meta.textContent = `Hinzugefügt: ${formatter.format(metaDate)}`;
    info.appendChild(nameBtn);
    info.appendChild(meta);

    const removeBtn = document.createElement("button");
    removeBtn.className = "favorite-remove btn-remove";
    removeBtn.type = "button";
    removeBtn.dataset.city = f.city;
    removeBtn.title = "Favorit entfernen";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Keep a copy for undo
      const removedFav = Object.assign({}, f);
      appState.removeFavorite(f.city);
      renderFavorites();
      // Offer undo via the errorHandler's retry-style action
      errorHandler.showWithRetry(`${f.city} aus Favoriten entfernt`, () => {
        appState.saveFavorite(removedFav.city, removedFav.coords);
        renderFavorites();
        showSuccess(`${removedFav.city} wiederhergestellt`);
      });
    });

    const actions = document.createElement("div");
    actions.className = "favorite-actions";
    actions.appendChild(removeBtn);

    item.appendChild(info);
    item.appendChild(actions);
    container.appendChild(item);
  });

  syncFavoriteToggleState();
}

function syncFavoriteToggleState(city) {
  const favBtn = document.getElementById("favoriteToggle");
  if (!favBtn || !window.appState) return;
  const targetCity = city || window.appState.currentCity;
  if (!targetCity) return;
  const isFav = window.appState.isFavorite(targetCity);
  favBtn.textContent = isFav ? "⭐" : "☆";
  favBtn.title = isFav ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen";
}
window.syncFavoriteToggleState = syncFavoriteToggleState;

function updateHomeLocationLabel() {
  const label = document.getElementById("home-location-label");
  const useBtn = document.getElementById("use-home-btn");
  const clearBtn = document.getElementById("clear-home-btn");
  if (!label) return;
  const city = appState?.homeLocation?.city;
  label.textContent = city || "Nicht gesetzt";
  const disabled = !city;
  if (useBtn) useBtn.disabled = disabled;
  if (clearBtn) clearBtn.disabled = disabled;
}

function focusSearchInput(options = {}) {
  const { select = false, scroll = true } = options;
  const input = document.getElementById("cityInput");
  if (!input) return null;
  if (scroll) {
    try {
      input.scrollIntoView({
        behavior: scroll === "instant" ? "auto" : "smooth",
        block: "center",
      });
    } catch (e) {
      /* scrollIntoView optional */
    }
  }
  input.focus();
  if (select && typeof input.select === "function") {
    input.select();
  }
  return input;
}

let backgroundRefreshTimer = null;

function scheduleBackgroundRefresh() {
  if (backgroundRefreshTimer) {
    clearInterval(backgroundRefreshTimer);
    backgroundRefreshTimer = null;
  }
  if (!appState || !appState.currentCity) return;
  const intervalMinutes = parseInt(appState.backgroundRefresh, 10);
  if (!intervalMinutes || Number.isNaN(intervalMinutes)) return;
  backgroundRefreshTimer = setInterval(() => {
    if (appState?.currentCity) {
      loadWeather(appState.currentCity, { silent: true });
    }
  }, intervalMinutes * 60 * 1000);
}

function updateTopbarStatus(city, timestamp = Date.now()) {
  const labelEl = document.getElementById("topbar-location-name");
  if (labelEl && city) {
    const [primary] = city.split(",");
    labelEl.textContent = primary ? primary.trim() : city;
  }
  const statusEl = document.getElementById("topbar-updated");
  if (statusEl) {
    const formatted = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
    statusEl.textContent = `Aktualisiert ${formatted}`;
  }
}
window.updateTopbarStatus = updateTopbarStatus;

let apiStatusStore = [];

function initializeApiStatusDefaults() {
  const hasManager = typeof window !== "undefined" && window.apiKeyManager;
  apiStatusStore = API_PROVIDERS.map((provider) => {
    const hasKey = provider.key
      ? hasManager && window.apiKeyManager.hasKey(provider.key)
      : true;
    const state = provider.requiresKey
      ? hasKey
        ? "online"
        : "missing-key"
      : "online";
    const message =
      provider.requiresKey && !hasKey
        ? "API-Key erforderlich"
        : provider.note ||
          (provider.requiresKey
            ? "Bereit – Key gespeichert"
            : "Noch nicht geladen");
    const detail = provider.requiresKey
      ? hasKey
        ? `🔐 Key gespeichert${provider.note ? ` · ${provider.note}` : ""}`
        : `Kein Key hinterlegt${provider.note ? ` · ${provider.note}` : ""}`
      : provider.note || "Bereit";
    return {
      id: provider.id,
      name: provider.name,
      tag: provider.tag,
      requiresKey: !!provider.requiresKey,
      hasKey,
      state,
      message,
      detail,
      updatedAt: Date.now(),
    };
  });
  renderApiStatusPanel();
}

function updateApiStatusStore(updates = []) {
  if (!Array.isArray(updates)) return;
  const timestamp = Date.now();
  updates.forEach((update) => {
    if (!update || !update.id) return;
    const providerMeta = API_PROVIDERS.find((p) => p.id === update.id);
    const idx = apiStatusStore.findIndex((entry) => entry.id === update.id);
    const baseEntry =
      idx >= 0
        ? apiStatusStore[idx]
        : {
            id: update.id,
            name: providerMeta?.name || update.id,
            tag: providerMeta?.tag,
            requiresKey: !!providerMeta?.requiresKey,
            hasKey: providerMeta?.requiresKey ? false : true,
            state: "pending",
            message: "Noch keine Daten",
          };

    const merged = {
      ...baseEntry,
      ...update,
    };

    if (providerMeta) {
      merged.name = merged.name || providerMeta.name;
      merged.tag = merged.tag || providerMeta.tag;
      merged.requiresKey = !!providerMeta.requiresKey;
      if (merged.hasKey === undefined) {
        merged.hasKey = providerMeta.requiresKey ? false : true;
      }
    }

    if (typeof update.hasKey === "boolean") {
      merged.hasKey = update.hasKey;
    }

    merged.state = merged.state || "pending";
    merged.message = merged.message || baseEntry.message || "Noch keine Daten";
    merged.updatedAt = update.updatedAt || timestamp;

    if (idx >= 0) {
      apiStatusStore[idx] = merged;
    } else {
      apiStatusStore.push(merged);
    }
  });
  renderApiStatusPanel();
}

function renderApiStatusPanel() {
  const container = document.getElementById("api-status");
  if (!container) return;
  ensureApiStatusActionsBinding(container);

  if (!apiStatusStore.length) {
    container.innerHTML =
      '<p class="api-status-empty">Noch keine Daten geladen</p>';
    return;
  }

  const iconFor = (state) => {
    switch (state) {
      case "online":
        return "✅";
      case "error":
        return "❌";
      case "skipped":
        return "🚫";
      case "missing-key":
        return "🔑";
      case "warning":
        return "⚠️";
      default:
        return "⏳";
    }
  };

  const stateLabelFor = (state) => {
    switch (state) {
      case "online":
        return "ONLINE";
      case "warning":
        return "WARNUNG";
      case "error":
        return "FEHLER";
      case "missing-key":
        return "KEY FEHLT";
      case "invalid-key":
        return "KEY UNGUELTIG";
      case "skipped":
        return "UEBERSPRUNGEN";
      default:
        return "WARTET";
    }
  };

  const html = apiStatusStore
    .map((entry) => {
      const icon = iconFor(entry.state);
      const metaParts = [];
      if (typeof entry.duration === "number") {
        metaParts.push(`${entry.duration}ms`);
      }
      if (entry.fromCache) {
        metaParts.push("Cache");
      }
      if (entry.updatedAt) {
        metaParts.push(
          new Date(entry.updatedAt).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
      const meta = metaParts.filter(Boolean).join(" · ");
      const detail = entry.detail ? escapeHtml(entry.detail) : "";
      const tagMarkup = entry.tag
        ? `<span class="api-status-tag">${escapeHtml(entry.tag)}</span>`
        : "";
      const stateBadge = entry.state
        ? `<span class="api-status-state state-${entry.state}">${stateLabelFor(
            entry.state
          )}</span>`
        : "";
      const keyButtonId = providerKeyInputId(entry.id);
      const keyBlock = entry.requiresKey
        ? `<div class="api-status-keyline">
            <span class="api-status-key ${
              entry.hasKey ? "key-ok" : "key-missing"
            }">${entry.hasKey ? "Key gespeichert" : "Key fehlt"}</span>
            ${
              keyButtonId
                ? `<button class="api-status-action" type="button" data-api-provider="${
                    entry.id
                  }">${
                    entry.hasKey ? "Key verwalten" : "Key hinzufuegen"
                  }</button>`
                : ""
            }
          </div>`
        : "";
      return `
      <div class="api-status-item status-${
        entry.state || "pending"
      }" data-provider="${entry.id || ""}">
        <div class="api-status-row">
          <span class="api-status-name">${icon} ${escapeHtml(
        entry.name || ""
      )}</span>
          <div class="api-status-row-meta">
            ${tagMarkup}
            ${stateBadge}
          </div>
        </div>
        <div class="api-status-message">${escapeHtml(entry.message || "")}</div>
        ${meta ? `<div class="api-status-meta">${meta}</div>` : ""}
        ${detail ? `<small class="api-status-extra">${detail}</small>` : ""}
        ${keyBlock}
      </div>
    `;
    })
    .join("");

  container.innerHTML = html;
}

function ensureApiStatusActionsBinding(container) {
  if (!container || container.dataset.actionsBound) return;
  container.addEventListener("click", (event) => {
    const target = event.target.closest(".api-status-action");
    if (!target) return;
    const providerId = target.dataset.apiProvider;
    if (!providerId) return;
    const inputId = providerKeyInputId(providerId);
    openSettingsModal(inputId || "settings-modal");
  });
  container.dataset.actionsBound = "true";
}

function buildApiStatusMessage(source) {
  if (!source) return "";
  if (source.skipped) {
    return source.error ? `${source.error}` : "Übersprungen";
  }
  if (source.success) {
    const parts = [];
    parts.push(source.fromCache ? "Cache" : "Live");
    if (typeof source.duration === "number") {
      parts.push(`${source.duration}ms`);
    }
    return parts.join(" · ");
  }
  return source.error || "Fehler";
}

function providerRequiresKey(providerId) {
  const provider = API_PROVIDERS.find((p) => p.id === providerId);
  return provider ? !!provider.requiresKey : false;
}

function providerNoteSuffix(providerId) {
  const provider = API_PROVIDERS.find((p) => p.id === providerId);
  return provider && provider.note ? ` · ${provider.note}` : "";
}

function providerKeyInputId(providerId) {
  switch (providerId) {
    case "openweathermap":
      return "openweathermap-key";
    case "visualcrossing":
      return "visualcrossing-key";
    case "meteostat":
      return "meteostat-key";
    default:
      return null;
  }
}

function notifyKeyIssue(providerId, errorMessage) {
  const issue = classifyProviderState(providerId, errorMessage);
  if (!issue) return false;
  const provider = API_PROVIDERS.find((p) => p.id === providerId);
  const inputId = providerKeyInputId(providerId);
  showWarning(issue.message, null, {
    title: `${provider?.name || providerId} API`,
    meta: errorMessage,
    actions: inputId
      ? [
          {
            label: "Einstellungen öffnen",
            kind: "primary",
            onClick: () => openSettingsModal(inputId),
          },
        ]
      : undefined,
  });
  if (inputId) {
    focusAndHighlight(inputId, 250);
  }
  return true;
}

function classifyProviderState(providerId, errorMessage) {
  if (!providerId || !errorMessage) return null;
  if (!providerRequiresKey(providerId)) return null;

  const normalized = errorMessage.toLowerCase();
  const invalidKeyPatterns =
    /invalid api key|unauthorized|401|forbidden|not authorized|ung(?:u|ü)ltig/;
  const missingKeyPatterns =
    /api key required|provide an api key|missing api key|no api key|key erforderlich|fehlender key|appid/;

  if (invalidKeyPatterns.test(normalized)) {
    return {
      state: "invalid-key",
      message: "Ungültiger API-Key – bitte neu speichern",
      detail: errorMessage,
    };
  }

  if (missingKeyPatterns.test(normalized)) {
    return {
      state: "missing-key",
      message: "API-Key erforderlich",
      detail: errorMessage,
    };
  }

  return null;
}

function syncProviderKeyState(providerId) {
  const provider = API_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return;
  const hasManager = typeof window !== "undefined" && window.apiKeyManager;
  const hasKey = provider.key
    ? hasManager && window.apiKeyManager.hasKey(provider.key)
    : true;
  const payload = {
    id: provider.id,
    name: provider.name,
    tag: provider.tag,
  };

  if (provider.requiresKey && !hasKey) {
    payload.state = "missing-key";
    payload.message = "API-Key erforderlich";
    payload.detail = `Kein Key hinterlegt${
      provider.note ? ` · ${provider.note}` : ""
    }`;
  } else {
    payload.state = "online";
    payload.message = provider.note || "Bereit – Key gespeichert";
    payload.detail = provider.requiresKey
      ? `🔐 Key gespeichert${provider.note ? ` · ${provider.note}` : ""}`
      : provider.note;
  }

  payload.requiresKey = !!provider.requiresKey;
  payload.hasKey = hasKey;
  updateApiStatusStore([payload]);
}

/**
 * Build render-ready data from raw API results and apply unit conversions.
 * Returns an object with formatted arrays ready for the UI (hourly/daily per source).
 */
function buildRenderData(rawData, units) {
  const result = {
    openMeteo: null,
    brightSky: null,
    locationDetails: null,
    sunEvents: null,
    moonPhase: null,
    airQuality: null,
  };

  // Helper: compute feels-like temperature (apparent temperature)
  // Uses simple formula combining temperature (°C), relative humidity (%) and wind (m/s)
  // Returns value in °C or null if insufficient data
  function computeFeelsLike(tC, humidity, wind_mps) {
    if (typeof tC !== "number") return null;
    const RH = typeof humidity === "number" ? humidity : null;
    const W = typeof wind_mps === "number" ? wind_mps : 0;
    // Approximate vapor pressure (hPa)
    let e = 0;
    if (RH !== null) {
      e = (RH / 100) * 6.105 * Math.exp((17.27 * tC) / (237.7 + tC));
    }
    // Apparent temperature (Steadman-like): T + 0.33*e - 0.70*wind - 4.00
    const at = tC + 0.33 * e - 0.7 * W - 4.0;
    return Math.round(at * 10) / 10;
  }

  const dayFormatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  const toNumber = (value) =>
    typeof value === "number" && !Number.isNaN(value) ? value : null;

  const average = (values = []) => {
    const filtered = values.filter((v) => typeof v === "number");
    if (!filtered.length) return null;
    const total = filtered.reduce((acc, val) => acc + val, 0);
    return total / filtered.length;
  };

  const averageDirection = (values = []) => {
    const filtered = values.filter((v) => typeof v === "number");
    if (!filtered.length) return null;
    const sum = filtered.reduce(
      (acc, deg) => {
        const rad = (deg * Math.PI) / 180;
        acc.x += Math.cos(rad);
        acc.y += Math.sin(rad);
        return acc;
      },
      { x: 0, y: 0 }
    );
    const angle = (Math.atan2(sum.y, sum.x) * 180) / Math.PI;
    return (angle + 360) % 360;
  };

  const directionToCompass = (deg) => {
    if (typeof deg !== "number" || Number.isNaN(deg)) return null;
    const dirs = [
      "N",
      "NNO",
      "NO",
      "ONO",
      "O",
      "OSO",
      "SO",
      "SSO",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    const idx = Math.round(deg / 22.5) % dirs.length;
    return dirs[idx];
  };

  const formatDayLabel = (dateStr) => {
    if (!dateStr) return "";
    try {
      return dayFormatter.format(new Date(`${dateStr}T00:00:00`));
    } catch (err) {
      return dateStr;
    }
  };

  const classifyEuAqi = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return { label: "--", severity: "unknown" };
    }
    if (value <= 25) return { label: "Gut", severity: "good" };
    if (value <= 50) return { label: "Akzeptabel", severity: "fair" };
    if (value <= 75) return { label: "Mäßig", severity: "moderate" };
    if (value <= 100) return { label: "Schlecht", severity: "poor" };
    if (value <= 125) return { label: "Sehr schlecht", severity: "very-poor" };
    return { label: "Extrem", severity: "extreme" };
  };

  const classifyUsAqi = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return { label: "--", severity: "unknown" };
    }
    if (value <= 50) return { label: "Good", severity: "good" };
    if (value <= 100) return { label: "Moderate", severity: "moderate" };
    if (value <= 150) return { label: "USG", severity: "usg" };
    if (value <= 200) return { label: "Unhealthy", severity: "unhealthy" };
    if (value <= 300)
      return { label: "Very Unhealthy", severity: "very-unhealthy" };
    return { label: "Hazardous", severity: "hazardous" };
  };

  const normalizeAirQuality = (rawAir) => {
    if (!rawAir?.hourly || !Array.isArray(rawAir.hourly.time)) {
      return null;
    }
    const pick = (key) =>
      Array.isArray(rawAir.hourly[key]) && rawAir.hourly[key].length
        ? rawAir.hourly[key][0]
        : null;
    const timestamp = rawAir.hourly.time[0] || null;
    const euValue = toNumber(pick("european_aqi"));
    const usValue = toNumber(pick("us_aqi"));
    return {
      timestamp,
      european:
        euValue === null
          ? null
          : Object.assign({ value: euValue }, classifyEuAqi(euValue)),
      us:
        usValue === null
          ? null
          : Object.assign({ value: usValue }, classifyUsAqi(usValue)),
      pollutants: {
        pm10: toNumber(pick("pm10")),
        pm25: toNumber(pick("pm2_5")),
        ozone: toNumber(pick("ozone")),
        co: toNumber(pick("carbon_monoxide")),
        no2: toNumber(pick("nitrogen_dioxide")),
        so2: toNumber(pick("sulphur_dioxide")),
      },
      source: "Open-Meteo Air",
    };
  };

  const createHourGrid = (hours = []) => {
    const hourLookup = new Map();
    hours.forEach((entry) => {
      if (!entry?.time) return;
      const dt = new Date(entry.time);
      if (Number.isNaN(dt.getTime())) return;
      const hour = dt.getHours();
      if (!hourLookup.has(hour)) {
        hourLookup.set(hour, entry);
      }
    });

    return Array.from({ length: 24 }, (_, hour) => {
      const slot = hourLookup.get(hour);
      const precipProb = toNumber(
        slot?.precipitationProbability ?? slot?.precipProb
      );
      return {
        hour,
        temperature: toNumber(slot?.temperature),
        emoji: slot?.emoji || "",
        precipitation: toNumber(slot?.precipitation),
        precipitationProbability: precipProb,
        precipProb: precipProb,
        uvIndex: toNumber(slot?.uvIndex),
        uvIndexClearSky: toNumber(slot?.uvIndexClearSky),
        windSpeed: toNumber(slot?.windSpeed),
        windDirection: toNumber(slot?.windDirection),
        dewPoint: toNumber(slot?.dewPoint),
        humidity: toNumber(slot?.humidity),
        isDay:
          typeof slot?.isDay === "number" ? slot.isDay : slot?.isDay ?? null,
      };
    });
  };

  const buildDayInsights = (byDayEntries = [], dailyEntries = []) =>
    byDayEntries.map((entry) => {
      const hours = entry.hours || [];
      const hourGrid = createHourGrid(hours);
      const hourTemps = hourGrid
        .map((slot) => slot.temperature)
        .filter((v) => v !== null);
      const dewValues = hourGrid
        .map((slot) => slot.dewPoint)
        .filter((v) => v !== null);
      const humidityValues = hourGrid
        .map((slot) => slot.humidity)
        .filter((v) => v !== null);
      const windSpeeds = hourGrid
        .map((slot) => slot.windSpeed)
        .filter((v) => v !== null);
      const windDirections = hourGrid
        .map((slot) => slot.windDirection)
        .filter((v) => v !== null);
      const precipAmounts = hourGrid.map((slot) => slot.precipitation || 0);

      const matchingDaily = dailyEntries.find((d) => d.date === entry.date);
      const uvSeries = hourGrid
        .map((slot) => slot.uvIndex)
        .filter((v) => v !== null);
      const uvPeak =
        typeof matchingDaily?.uvIndexMax === "number"
          ? matchingDaily.uvIndexMax
          : uvSeries.length
          ? Math.max(...uvSeries)
          : null;

      const sunrise = matchingDaily?.sunrise || null;
      const sunset = matchingDaily?.sunset || null;
      const sunriseDate = sunrise ? new Date(sunrise) : null;
      const sunsetDate = sunset ? new Date(sunset) : null;
      const daylightMinutes =
        sunriseDate && sunsetDate
          ? Math.max(0, Math.round((sunsetDate - sunriseDate) / 60000))
          : null;
      const sunrisePercent =
        sunriseDate !== null
          ? ((sunriseDate.getHours() + sunriseDate.getMinutes() / 60) / 24) *
            100
          : null;
      const sunsetPercent =
        sunsetDate !== null
          ? ((sunsetDate.getHours() + sunsetDate.getMinutes() / 60) / 24) * 100
          : null;

      const windDirectionAvg = averageDirection(windDirections);

      const condition =
        typeof matchingDaily?.weatherCode === "number"
          ? WEATHER_CODES[matchingDaily.weatherCode]?.description
          : undefined;

      return {
        date: entry.date,
        label: formatDayLabel(entry.date),
        emoji:
          matchingDaily?.emoji ||
          hours.find((h) => {
            const dt = new Date(h.time);
            return dt.getHours() === 12;
          })?.emoji ||
          hours[0]?.emoji ||
          "❓",
        summary: {
          tempMax:
            typeof matchingDaily?.tempMax === "number"
              ? matchingDaily.tempMax
              : hourTemps.length
              ? Math.max(...hourTemps)
              : null,
          tempMin:
            typeof matchingDaily?.tempMin === "number"
              ? matchingDaily.tempMin
              : hourTemps.length
              ? Math.min(...hourTemps)
              : null,
          dewPointAvg: average(dewValues),
          humidityAvg: average(humidityValues),
          precipitationSum:
            typeof matchingDaily?.precipitationSum === "number"
              ? matchingDaily.precipitationSum
              : precipAmounts.reduce((acc, val) => acc + (val || 0), 0),
          precipitationHours: matchingDaily?.precipitationHours ?? null,
          wind: {
            avgSpeed: average(windSpeeds),
            maxSpeed: windSpeeds.length ? Math.max(...windSpeeds) : null,
            directionDeg: windDirectionAvg,
            cardinal: directionToCompass(windDirectionAvg),
          },
          uvIndexMax: uvPeak,
          condition,
        },
        sun: {
          sunrise,
          sunset,
          sunrisePercent,
          sunsetPercent,
          daylightMinutes,
        },
        precipitationTimeline: hourGrid.map((slot) => ({
          hour: slot.hour,
          amount: slot.precipitation ?? 0,
          probability: slot.precipitationProbability ?? null,
          isDay: slot.isDay,
        })),
        uvTimeline: hourGrid.map((slot) => ({
          hour: slot.hour,
          value: slot.uvIndex,
          clearSky: slot.uvIndexClearSky,
        })),
        hourGrid,
        hours,
      };
    });
  try {
    if (rawData.openMeteo) {
      const hourly = openMeteoAPI.formatHourlyData(rawData.openMeteo, 168);
      const daily = openMeteoAPI.formatDailyData(rawData.openMeteo, 7);

      // Convert temps and wind per units
      const convertedHourly = hourly.map((h) => {
        const tC = typeof h.temperature === "number" ? h.temperature : null; // °C
        // Open-Meteo provides windspeed_10m in km/h -> convert to m/s for internal calc
        const rawWind = typeof h.windSpeed === "number" ? h.windSpeed : null; // likely km/h
        const wind_mps = rawWind === null ? null : rawWind / 3.6;
        const temp =
          tC === null
            ? null
            : units.temperature === "F"
            ? (tC * 9) / 5 + 32
            : tC;
        const dewPointRaw = typeof h.dewPoint === "number" ? h.dewPoint : null;
        const dewPoint =
          dewPointRaw === null
            ? null
            : units.temperature === "F"
            ? (dewPointRaw * 9) / 5 + 32
            : dewPointRaw;
        // Wind conversion: m/s -> km/h (multiply by 3.6) or m/s -> mph (multiply by 2.237)
        let wind = null;
        if (wind_mps !== null) {
          if (units.wind === "m/s") {
            wind = wind_mps;
          } else if (units.wind === "mph") {
            wind = wind_mps * 2.237; // 1 m/s = 2.237 mph
          } else {
            wind = wind_mps * 3.6; // Default: km/h
          }
        }
        // compute feels-like in °C using internal values, then convert if needed
        const feelsC =
          tC === null
            ? null
            : computeFeelsLike(tC, h.humidity ?? null, wind_mps);
        const feels =
          feelsC === null
            ? null
            : units.temperature === "F"
            ? (feelsC * 9) / 5 + 32
            : feelsC;
        return Object.assign({}, h, {
          temperature: temp,
          windSpeed: wind,
          feelsLike: feels,
          dewPoint,
        });
      });

      const convertedDaily = daily.map((d) => {
        const max = typeof d.tempMax === "number" ? d.tempMax : null;
        const min = typeof d.tempMin === "number" ? d.tempMin : null;
        const tMax =
          max === null
            ? null
            : units.temperature === "F"
            ? (max * 9) / 5 + 32
            : max;
        const tMin =
          min === null
            ? null
            : units.temperature === "F"
            ? (min * 9) / 5 + 32
            : min;
        return Object.assign({}, d, {
          tempMax: tMax,
          tempMin: tMin,
          temperatureMax: tMax,
          temperatureMin: tMin,
          precipProbMax: d.precipitationProbabilityMax || d.precipProbMax || 0,
          iconHtml: d.emoji || "☁️",
        });
      });
      result.openMeteo = { hourly: convertedHourly, daily: convertedDaily };
      // Group hourly into days for 7-day view (first 3 days will include per-hour slices)
      function groupHourlyByDay(hourlyArray, maxDays = 7) {
        const map = new Map();
        hourlyArray.forEach((h) => {
          try {
            const dateKey =
              typeof h.time === "string" && h.time.includes("T")
                ? h.time.split("T")[0]
                : new Date(h.time).toISOString().split("T")[0];
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey).push(h);
          } catch (e) {
            // ignore malformed time
          }
        });
        // Convert map to array and limit to maxDays
        const arr = Array.from(map.entries()).map(([date, hours]) => ({
          date,
          hours,
        }));
        return arr.slice(0, maxDays);
      }
      result.openMeteo.byDay = groupHourlyByDay(convertedHourly, 7);
      result.openMeteo.dayInsights = buildDayInsights(
        result.openMeteo.byDay,
        convertedDaily
      );
    }

    if (rawData.brightSky) {
      const bs = brightSkyAPI.formatWeatherData(rawData.brightSky, 48);
      const converted = bs.map((h) => {
        const tC = typeof h.temperature === "number" ? h.temperature : null; // assume °C
        const wind_mps = typeof h.windSpeed === "number" ? h.windSpeed : null; // assume m/s
        const temp =
          tC === null
            ? null
            : units.temperature === "F"
            ? (tC * 9) / 5 + 32
            : tC;
        // Wind conversion: m/s -> km/h or m/s -> mph
        let wind = null;
        if (wind_mps !== null) {
          if (units.wind === "m/s") {
            wind = wind_mps;
          } else if (units.wind === "mph") {
            wind = wind_mps * 2.237; // 1 m/s = 2.237 mph
          } else {
            wind = wind_mps * 3.6; // Default: km/h
          }
        }
        const feelsC =
          tC === null
            ? null
            : computeFeelsLike(
                tC,
                h.relativeHumidity ?? h.humidity ?? null,
                wind_mps
              );
        const feels =
          feelsC === null
            ? null
            : units.temperature === "F"
            ? (feelsC * 9) / 5 + 32
            : feelsC;
        return Object.assign({}, h, {
          temperature: temp,
          windSpeed: wind,
          feelsLike: feels,
        });
      });
      result.brightSky = { hourly: converted };
    }

    result.locationDetails = rawData.locationDetails || null;
    result.sunEvents = rawData.sunEvents || null;
    result.moonPhase = rawData.moonPhase || null;
    result.airQuality = normalizeAirQuality(rawData.airQuality);
    result.aqi = rawData.airQuality
      ? {
          europeanAqi: result.airQuality?.european?.value,
          usAqi: result.airQuality?.us?.value,
          label:
            result.airQuality?.european?.label || result.airQuality?.us?.label,
        }
      : null;
    result.pollen = rawData.pollen || null;

    // Finde den Index der aktuellen Stunde in den hourly-Daten
    const findCurrentHourIndex = (hourlyArray) => {
      if (!Array.isArray(hourlyArray) || !hourlyArray.length) return 0;
      const now = new Date();
      const currentHour = now.getHours();
      const currentDateStr = now.toISOString().split("T")[0];

      // Suche die Stunde, die am nächsten zur aktuellen Zeit ist
      for (let i = 0; i < hourlyArray.length; i++) {
        const h = hourlyArray[i];
        if (!h.time) continue;
        const hDate = new Date(h.time);
        const hDateStr = h.time.includes("T")
          ? h.time.split("T")[0]
          : hDate.toISOString().split("T")[0];
        const hHour = hDate.getHours();

        // Wenn das Datum und die Stunde übereinstimmen oder wir in der Zukunft sind
        if (hDateStr === currentDateStr && hHour >= currentHour) {
          return i;
        }
        // Wenn wir bereits im nächsten Tag sind
        if (hDateStr > currentDateStr) {
          return Math.max(0, i - 1);
        }
      }
      return 0;
    };

    // Filtere hourly-Daten ab der aktuellen Stunde
    const currentHourIdx = findCurrentHourIndex(result.openMeteo?.hourly);
    result.hourly = result.openMeteo?.hourly?.slice(currentHourIdx) || [];

    // Erstelle currentSnapshot aus der AKTUELLEN Stunde (nicht der ersten im Array)
    if (result.openMeteo?.hourly?.length) {
      const h =
        result.openMeteo.hourly[currentHourIdx] || result.openMeteo.hourly[0];
      const d = result.openMeteo?.daily?.[0] || {};
      result.currentSnapshot = {
        temperature: h.temperature,
        apparentTemperature: h.feelsLike,
        feelsLike: h.feelsLike,
        humidity: h.humidity,
        windSpeed: h.windSpeed,
        windDirection: h.windDirection,
        windGust: h.windGust,
        weatherCode: h.weathercode || h.weatherCode,
        code: h.weathercode || h.weatherCode,
        description: h.description || h.summary,
        summary: h.summary || h.description,
        isDay: h.isDay === 1 || h.isDay === true,
        precipProb: h.precipitationProbability,
        uvIndex: h.uvIndex,
        pressure: h.pressure || h.surfacePressure,
        surfacePressure: h.surfacePressure,
        visibility: h.visibility,
        cloudCover: h.cloudCover,
        dewPoint: h.dewPoint,
        time: h.time,
      };
      result.current = result.currentSnapshot;
    }
  } catch (e) {
    console.warn("buildRenderData failed", e);
  }
  return result;
}

function normalizeHourlyKey(time) {
  if (!time) return null;
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return null;
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

function averageNumericField(entries, key) {
  const values = entries
    .map((entry) =>
      typeof entry?.[key] === "number" && Number.isFinite(entry[key])
        ? entry[key]
        : null
    )
    .filter((value) => value !== null);
  if (!values.length) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function averageDirectionalField(entries, key) {
  const values = entries
    .map((entry) =>
      typeof entry?.[key] === "number" && Number.isFinite(entry[key])
        ? entry[key]
        : null
    )
    .filter((value) => value !== null);
  if (!values.length) return null;
  const vector = values.reduce(
    (acc, deg) => {
      const rad = (deg * Math.PI) / 180;
      acc.x += Math.cos(rad);
      acc.y += Math.sin(rad);
      return acc;
    },
    { x: 0, y: 0 }
  );
  const angle = Math.atan2(vector.y, vector.x);
  return ((angle * 180) / Math.PI + 360) % 360;
}

function aggregateHourlyEntries(entries, fallbackTime) {
  if (!Array.isArray(entries) || !entries.length) return null;
  const aggregated = {
    time: entries.find((entry) => entry?.time)?.time || fallbackTime,
  };
  const numericKeys = [
    "temperature",
    "feelsLike",
    "windSpeed",
    "humidity",
    "precipitation",
    "precipitationProbability",
    "dewPoint",
    "pressure",
    "uvIndex",
    "uvIndexClearSky",
  ];
  numericKeys.forEach((key) => {
    aggregated[key] = averageNumericField(entries, key);
  });
  aggregated.windDirection = averageDirectionalField(entries, "windDirection");
  aggregated.emoji =
    entries.find((entry) => typeof entry?.emoji === "string")?.emoji || "❓";
  aggregated.description =
    entries.find((entry) => typeof entry?.description === "string")
      ?.description ||
    entries.find((entry) => typeof entry?.condition === "string")?.condition ||
    "";
  aggregated.isDay =
    entries.find((entry) => entry?.isDay !== undefined)?.isDay ?? null;
  aggregated.weatherCode = entries.find(
    (entry) =>
      typeof entry?.weatherCode === "number" &&
      Number.isFinite(entry.weatherCode)
  )?.weatherCode;
  return aggregated;
}

function mergeHourlySamples(openHourly, brightHourly, limit = 24) {
  const buckets = new Map();
  const ingest = (entry, priority = 0) => {
    if (!entry) return;
    const key = normalizeHourlyKey(entry.time);
    if (!key) return;
    const bucket = buckets.get(key) || {
      time: entry.time,
      entries: [],
      priority,
    };
    if (priority < bucket.priority) {
      bucket.time = entry.time;
      bucket.priority = priority;
    }
    bucket.entries.push(entry);
    buckets.set(key, bucket);
  };

  openHourly.forEach((entry) => ingest(entry, 0));
  brightHourly.forEach((entry) => ingest(entry, 1));

  return Array.from(buckets.values())
    .sort((a, b) => {
      const aTime = new Date(a.time).getTime();
      const bTime = new Date(b.time).getTime();
      return aTime - bTime;
    })
    .slice(0, limit)
    .map((bucket) => aggregateHourlyEntries(bucket.entries, bucket.time))
    .filter(Boolean);
}

function buildHourlyDisplayPayload(renderData, limit = 24) {
  if (!renderData) {
    return { hours: [], label: "" };
  }

  // Priorisiere die bereits ab der aktuellen Stunde gefilterten hourly-Daten
  if (Array.isArray(renderData?.hourly) && renderData.hourly.length) {
    return {
      hours: renderData.hourly.slice(0, limit),
      label: "Open-Meteo",
    };
  }

  const openHourly = Array.isArray(renderData?.openMeteo?.hourly)
    ? renderData.openMeteo.hourly
    : [];
  const brightHourly = Array.isArray(renderData?.brightSky?.hourly)
    ? renderData.brightSky.hourly
    : [];
  if (!openHourly.length && !brightHourly.length) {
    return { hours: [], label: "" };
  }
  if (!openHourly.length || !brightHourly.length) {
    const useOpen = openHourly.length > 0;
    return {
      hours: (useOpen ? openHourly : brightHourly).slice(0, limit),
      label: useOpen ? "Open-Meteo" : "BrightSky",
    };
  }
  return {
    hours: mergeHourlySamples(openHourly, brightHourly, limit),
    label: "Open-Meteo × BrightSky",
  };
}

function resetHourlySection() {
  const target = document.getElementById("hourly-section");
  if (!target) return;
  target.innerHTML = "";
  if (target.dataset) {
    delete target.dataset.hourlyInitialized;
  }
}

/**
 * Rerender UI from appState.renderData
 */
function renderFromRenderData() {
  try {
    if (!appState || !appState.renderData) return;
    const city = appState.currentCity || "";
    // display current (uses renderData format)
    weatherDisplay.displayCurrent(appState.renderData, city);
    if (city) {
      updateTopbarStatus(city);
    }

    const hourlyPayload = buildHourlyDisplayPayload(appState.renderData, 24);
    resetHourlySection();
    weatherDisplay.displayHourly(
      hourlyPayload.hours,
      hourlyPayload.label || "Stundenvorhersage"
    );

    if (appState.renderData.openMeteo) {
      weatherDisplay.displayForecast(appState.renderData.openMeteo.daily);
    }
  } catch (e) {
    console.warn("renderFromRenderData failed", e);
  }
}

/**
 * Persistiert den letzten erfolgreichen Renderzustand für Offline/Reload-Fallbacks
 * @param {string} city
 * @param {object} weatherData
 */
function persistLatestSnapshot(city, weatherData) {
  if (!appState?.renderData) return;
  try {
    const snapshot = {
      city,
      timestamp: Date.now(),
      renderData: appState.renderData,
      sources: weatherData?.sources || [],
      units: appState.units,
    };
    localStorage.setItem("wetter_last_snapshot", JSON.stringify(snapshot));
  } catch (e) {
    console.warn("Snapshot speichern fehlgeschlagen", e);
  }
}

/**
 * Stellt zuletzt gespeicherte Wetterdaten wieder her, falls verfügbar
 * @returns {boolean}
 */
function tryRestoreLastSnapshot() {
  try {
    const rawSnapshot = localStorage.getItem("wetter_last_snapshot");
    if (!rawSnapshot) return false;
    const snapshot = JSON.parse(rawSnapshot);
    if (!snapshot?.renderData) return false;

    if (!appState) {
      appState = new AppState();
      window.appState = appState;
    }

    appState.renderData = snapshot.renderData;
    appState.currentCity = snapshot.city || appState.currentCity;
    if (snapshot.units) {
      appState.units = {
        ...appState.units,
        ...snapshot.units,
      };
    }

    exitDemoMode();

    if (snapshot.city) {
      updateTopbarStatus(snapshot.city);
    }

    if (snapshot.timestamp) {
      const lastUpdatedEl = document.getElementById("topbar-updated");
      if (lastUpdatedEl) {
        const lastDate = new Date(snapshot.timestamp);
        lastUpdatedEl.textContent = `Zuletzt aktualisiert: ${lastDate.toLocaleString(
          "de-DE",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        )}`;
      }
    }

    weatherDisplay.displayCurrent(snapshot.renderData, snapshot.city || "");
    const restoredHourly = buildHourlyDisplayPayload(snapshot.renderData, 24);
    resetHourlySection();
    weatherDisplay.displayHourly(
      restoredHourly.hours,
      restoredHourly.label || "Stundenvorhersage"
    );
    if (snapshot.renderData.openMeteo) {
      weatherDisplay.displayForecast(snapshot.renderData.openMeteo.daily || []);
    }

    try {
      weatherDisplay.showSourcesComparison(
        snapshot.renderData.openMeteo || null,
        snapshot.renderData.brightSky || null,
        snapshot.sources || []
      );
    } catch (e) {
      console.warn("Snapshot Quellenanzeige fehlgeschlagen", e);
    }

    syncExtendedPanels({
      city: snapshot.city,
      locationDetails: snapshot.renderData?.locationDetails,
    });

    return true;
  } catch (e) {
    console.warn("Snapshot Wiederherstellung fehlgeschlagen", e);
    return false;
  }
}

/**
 * Geo-Suche über Nominatim
 */
async function searchLocation(city) {
  try {
    console.log(`🔍 Suche Ort: ${city}`);

    const validation = validateCityInput(city);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const params = new URLSearchParams({
      format: API_ENDPOINTS.NOMINATIM.PARAMS.format,
      q: sanitizeInput(city),
      limit: API_ENDPOINTS.NOMINATIM.PARAMS.limit,
      addressdetails: API_ENDPOINTS.NOMINATIM.PARAMS.addressdetails,
    });

    const url = `${API_ENDPOINTS.NOMINATIM.BASE}?${params.toString()}`;
    const response = await safeApiFetch(
      url,
      {},
      API_ENDPOINTS.NOMINATIM.TIMEOUT
    );
    const geoData = await response.json();

    const validation2 = validateApiResponse(geoData, "nominatim");
    if (!validation2.valid) {
      throw new Error(validation2.error);
    }

    console.log(`✅ Ort gefunden: ${geoData[0].display_name}`);

    return {
      city: geoData[0].display_name,
      lat: parseFloat(geoData[0].lat),
      lon: parseFloat(geoData[0].lon),
      results: geoData,
    };
  } catch (error) {
    console.error("❌ Ortssuche fehlgeschlagen:", error.message);
    throw error;
  }
}

const OPEN_METEO_AIR_BASE =
  "https://air-quality-api.open-meteo.com/v1/air-quality";

async function fetchAirQualitySnapshot(lat, lon) {
  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      hourly:
        "european_aqi,us_aqi,pm2_5,pm10,carbon_monoxide,ozone,nitrogen_dioxide,sulphur_dioxide",
      timezone: "auto",
    });
    const url = `${OPEN_METEO_AIR_BASE}?${params.toString()}`;
    const start = Date.now();
    const response = await safeApiFetch(
      url,
      {},
      API_ENDPOINTS.AIR_QUALITY.TIMEOUT || 6000
    );
    const payload = await response.json();
    if (!payload?.hourly || !Array.isArray(payload.hourly.time)) {
      throw new Error("Air-Quality Antwort unvollständig");
    }
    return {
      data: payload,
      duration: Date.now() - start,
      source: "openmeteo-air",
    };
  } catch (error) {
    return { error: error?.message || "Air-Quality nicht verfügbar" };
  }
}

/**
 * Lädt Wetterdaten von beiden APIs mit Fallback
 */
async function fetchWeatherData(lat, lon) {
  const sources = [];

  console.log(`🌡️ Lade Wetterdaten für ${lat}, ${lon}`);

  const [openMeteoResult, brightSkyResult] = await Promise.all([
    openMeteoAPI.fetchWeather(lat, lon),
    brightSkyAPI.fetchWeather(lat, lon),
  ]);

  if (!openMeteoResult.error) {
    sources.push({
      id: "open-meteo",
      name: "Open-Meteo",
      success: true,
      duration: openMeteoResult.duration,
      fromCache: openMeteoResult.fromCache,
    });
  } else {
    sources.push({
      id: "open-meteo",
      name: "Open-Meteo",
      success: false,
      error: openMeteoResult.error,
    });
    showWarning(`Open-Meteo: ${openMeteoResult.error}`);
  }

  if (!brightSkyResult.error) {
    sources.push({
      id: "brightsky",
      name: "BrightSky",
      success: true,
      duration: brightSkyResult.duration,
      fromCache: brightSkyResult.fromCache,
    });
  } else {
    sources.push({
      id: "brightsky",
      name: "BrightSky",
      success: false,
      error: brightSkyResult.error,
    });
    showWarning(`BrightSky: ${brightSkyResult.error}`);
  }

  // OPTIONALE APIs - Nur wenn API-Keys vorhanden
  let openWeatherMapResult = null;
  let visualCrossingResult = null;
  let bigDataCloudResult = null;
  let sunriseSunsetResult = null;
  let moonPhaseResult = null;
  let airQualityResult = null;

  // OpenWeatherMap (optional)
  if (window.apiKeyManager && window.apiKeyManager.hasKey("openweathermap")) {
    try {
      const owmAPI = new OpenWeatherMapAPI();
      const owmKey = window.apiKeyManager.getKey("openweathermap");
      openWeatherMapResult = await owmAPI.fetchWeather(lat, lon, owmKey);

      if (!openWeatherMapResult.error) {
        sources.push({
          id: "openweathermap",
          name: "OpenWeatherMap",
          state: openWeatherMapResult.state,
          statusMessage:
            openWeatherMapResult.statusMessage ||
            buildApiStatusMessage({
              success: true,
              duration: openWeatherMapResult.duration,
              fromCache: false,
            }),
          statusDetail: openWeatherMapResult.detail,
          success: true,
          duration: openWeatherMapResult.duration || 0,
          fromCache: false,
        });
        console.log("✅ OpenWeatherMap Daten geladen");
      } else {
        sources.push({
          id: "openweathermap",
          name: "OpenWeatherMap",
          state: openWeatherMapResult.state,
          statusMessage: openWeatherMapResult.statusMessage,
          statusDetail: openWeatherMapResult.detail,
          success: false,
          error: openWeatherMapResult.error,
        });
        const handled = notifyKeyIssue(
          "openweathermap",
          openWeatherMapResult.error
        );
        if (!handled) {
          showWarning(`OpenWeatherMap: ${openWeatherMapResult.error}`);
        }
      }
    } catch (e) {
      console.warn("OpenWeatherMap Fehler:", e.message);
      sources.push({
        id: "openweathermap",
        name: "OpenWeatherMap",
        success: false,
        error: e.message || "Unbekannter Fehler",
      });
      const handled = notifyKeyIssue("openweathermap", e.message);
      if (!handled) {
        showWarning(`OpenWeatherMap: ${e?.message || "Unbekannter Fehler"}`);
      }
    }
  }

  // VisualCrossing (optional)
  if (window.apiKeyManager && window.apiKeyManager.hasKey("visualcrossing")) {
    try {
      const vcAPI = new VisualCrossingAPI();
      const vcKey = window.apiKeyManager.getKey("visualcrossing");
      visualCrossingResult = await vcAPI.fetchWeather(lat, lon, vcKey);

      if (!visualCrossingResult.error) {
        sources.push({
          id: "visualcrossing",
          name: "VisualCrossing",
          success: true,
          duration: visualCrossingResult.duration || 0,
          fromCache: false,
        });
        console.log("✅ VisualCrossing Daten geladen");
      } else {
        sources.push({
          id: "visualcrossing",
          name: "VisualCrossing",
          success: false,
          error: visualCrossingResult.error,
        });
        const handled = notifyKeyIssue(
          "visualcrossing",
          visualCrossingResult.error
        );
        if (!handled) {
          showWarning(`VisualCrossing: ${visualCrossingResult.error}`);
        }
      }
    } catch (e) {
      console.warn("VisualCrossing Fehler:", e.message);
      sources.push({
        id: "visualcrossing",
        name: "VisualCrossing",
        success: false,
        error: e.message || "Unbekannter Fehler",
      });
      const handled = notifyKeyIssue("visualcrossing", e.message);
      if (!handled) {
        showWarning(`VisualCrossing: ${e?.message || "Unbekannter Fehler"}`);
      }
    }
  }

  if (typeof bigDataCloudAPI !== "undefined") {
    try {
      const key = window.apiKeyManager?.getKey("bigdatacloud") || null;
      bigDataCloudResult = await bigDataCloudAPI.fetchLocationDetails(
        lat,
        lon,
        key
      );
      if (!bigDataCloudResult.error) {
        sources.push({
          id: "bigdatacloud",
          name: "BigDataCloud",
          success: true,
          duration: bigDataCloudResult.duration,
          fromCache: false,
        });
      } else {
        sources.push({
          id: "bigdatacloud",
          name: "BigDataCloud",
          success: false,
          error: bigDataCloudResult.error,
        });
      }
    } catch (e) {
      console.warn("BigDataCloud Fehler:", e.message);
      sources.push({
        id: "bigdatacloud",
        name: "BigDataCloud",
        success: false,
        error: e.message || "Unbekannter Fehler",
      });
    }
  }

  if (typeof sunriseSunsetAPI !== "undefined") {
    try {
      const key = window.apiKeyManager?.getKey("sunrisesunset") || null;
      sunriseSunsetResult = await sunriseSunsetAPI.fetchSunEvents(
        lat,
        lon,
        key
      );
      if (!sunriseSunsetResult.error) {
        sources.push({
          id: "sunrisesunset",
          name: "Sunrise & Sunset",
          success: true,
          duration: sunriseSunsetResult.duration,
          fromCache: false,
        });
      } else {
        sources.push({
          id: "sunrisesunset",
          name: "Sunrise & Sunset",
          success: false,
          error: sunriseSunsetResult.error,
        });
      }
    } catch (e) {
      console.warn("SunriseSunset Fehler:", e.message);
      sources.push({
        id: "sunrisesunset",
        name: "Sunrise & Sunset",
        success: false,
        error: e.message || "Unbekannter Fehler",
      });
    }
  }

  if (typeof moonPhaseAPI !== "undefined") {
    try {
      const key = window.apiKeyManager?.getKey("moonphase") || null;
      const moonPhaseContext = {
        city:
          (bigDataCloudResult && !bigDataCloudResult.error
            ? bigDataCloudResult.data?.city ||
              bigDataCloudResult.data?.locality ||
              bigDataCloudResult.data?.region
            : null) ||
          window.appState?.currentCity ||
          null,
        locationDetails:
          bigDataCloudResult && !bigDataCloudResult.error
            ? bigDataCloudResult.data
            : null,
        latitude: lat,
        longitude: lon,
      };
      moonPhaseResult = await moonPhaseAPI.fetchPhase(
        new Date(),
        key,
        moonPhaseContext
      );
      if (!moonPhaseResult.error) {
        sources.push({
          id: "moonphase",
          name: "Moon Phase",
          success: true,
          duration: moonPhaseResult.duration,
          fromCache: false,
        });
      } else {
        sources.push({
          id: "moonphase",
          name: "Moon Phase",
          success: false,
          error: moonPhaseResult.error,
        });
      }
    } catch (e) {
      console.warn("MoonPhase Fehler:", e.message);
      sources.push({
        id: "moonphase",
        name: "Moon Phase",
        success: false,
        error: e.message || "Unbekannter Fehler",
      });
    }
  }

  try {
    airQualityResult = await fetchAirQualitySnapshot(lat, lon);
    if (!airQualityResult.error) {
      sources.push({
        id: "air-quality",
        name: "Open-Meteo Air",
        success: true,
        duration: airQualityResult.duration,
        fromCache: false,
      });
    } else {
      sources.push({
        id: "air-quality",
        name: "Open-Meteo Air",
        success: false,
        error: airQualityResult.error,
      });
    }
  } catch (err) {
    sources.push({
      id: "air-quality",
      name: "Open-Meteo Air",
      success: false,
      error: err?.message || "Air-Quality Fehler",
    });
  }

  if (sources.length) {
    const statusPayload = sources
      .filter((src) => src.id)
      .map((src) => {
        const classification = classifyProviderState(src.id, src.error);
        const state =
          src.state ||
          classification?.state ||
          (src.skipped ? "skipped" : src.success ? "online" : "error");
        const message =
          classification?.message ||
          src.statusMessage ||
          buildApiStatusMessage(src);
        const detail =
          classification?.detail ||
          src.statusDetail ||
          (!src.success && src.error
            ? src.error
            : providerRequiresKey(src.id)
            ? `🔐 Key aktiv${providerNoteSuffix(src.id)}`
            : "");
        return {
          id: src.id,
          name: src.name,
          state,
          message,
          duration: src.duration,
          fromCache: src.fromCache,
          detail,
        };
      });
    updateApiStatusStore(statusPayload);
  }

  // Prüfe ob mindestens eine Hauptquelle erfolgreich war
  const hasMainData = [openMeteoResult, brightSkyResult].some((r) => !r.error);
  if (!hasMainData) {
    throw new Error(
      "Keine Wetterdaten verfügbar - Hauptquellen fehlgeschlagen"
    );
  }

  return {
    openMeteo: openMeteoResult.error ? null : openMeteoResult.data,
    brightSky: brightSkyResult.error ? null : brightSkyResult.data,
    openWeatherMap:
      openWeatherMapResult && !openWeatherMapResult.error
        ? openWeatherMapResult.data
        : null,
    visualCrossing:
      visualCrossingResult && !visualCrossingResult.error
        ? visualCrossingResult.data
        : null,
    locationDetails:
      bigDataCloudResult && !bigDataCloudResult.error
        ? bigDataCloudResult.data
        : null,
    sunEvents:
      sunriseSunsetResult && !sunriseSunsetResult.error
        ? sunriseSunsetResult.data
        : null,
    moonPhase:
      moonPhaseResult && !moonPhaseResult.error ? moonPhaseResult.data : null,
    airQuality:
      airQualityResult && !airQualityResult.error
        ? airQualityResult.data
        : null,
    sources,
  };
}

/**
 * Zeigt Wetterdaten an
 */
function displayWeatherResults(location, weatherData) {
  const { openMeteo, brightSky, sources } = weatherData;

  // Update detailed comparison view (if available)
  try {
    // Pass converted renderData if available (appState.renderData set by caller)
    weatherDisplay.showSourcesComparison(
      appState?.renderData?.openMeteo ? appState.renderData.openMeteo : null,
      appState?.renderData?.brightSky ? appState.renderData.brightSky : null,
      sources
    );
  } catch (e) {
    // ignore
  }

  let hourlyPayload = buildHourlyDisplayPayload(appState?.renderData, 24);
  if (!hourlyPayload.hours.length) {
    let fallbackHours = [];
    let fallbackLabel = "";
    if (openMeteo) {
      fallbackHours = openMeteoAPI.formatHourlyData(openMeteo, 24);
      fallbackLabel = "Open-Meteo";
    } else if (brightSky) {
      fallbackHours = brightSkyAPI.formatWeatherData(brightSky, 24);
      fallbackLabel = "BrightSky";
    }
    hourlyPayload = { hours: fallbackHours, label: fallbackLabel };
  }

  resetHourlySection();
  weatherDisplay.displayHourly(
    hourlyPayload.hours,
    hourlyPayload.label || "Stundenvorhersage"
  );

  if (hourlyPayload.hours.length > 0) {
    const firstHour = hourlyPayload.hours[0];
    weatherDisplay.updateCurrentValues({
      temp: firstHour.temperature,
      windSpeed: firstHour.windSpeed,
      humidity: firstHour.humidity,
      feelsLike: firstHour.feelsLike ?? firstHour.feels_like,
      emoji: firstHour.emoji,
      description: firstHour.description || "",
    });
  }

  if (appState?.renderData?.openMeteo?.daily?.length) {
    weatherDisplay.displayForecast(appState.renderData.openMeteo.daily);
  } else if (openMeteo) {
    const dailyData = openMeteoAPI.formatDailyData(openMeteo, 7);
    weatherDisplay.displayForecast(dailyData);
  }

  if (brightSky) {
    const formattedData = brightSkyAPI.formatWeatherData(brightSky, 24);
    console.log("BrightSky Daten verfügbar:", formattedData.length);
  }
}

/**
 * Hauptfunktion: Wetter laden und anzeigen
 */
async function loadWeather(city, options = {}) {
  const { silent = false } = options;
  try {
    // Log analytics
    if (window.logAnalyticsEvent) {
      window.logAnalyticsEvent("search", { city, timestamp: Date.now() });
    }

    if (!silent) {
      weatherDisplay.showLoading();
      setSearchComponentsLoadingState(true);
      errorHandler.clearAll();
    }

    // Suche Ort
    const location = await searchLocation(city);
    appState.currentCity = location.city;
    appState.currentCoordinates = {
      lat: location.lat,
      lon: location.lon,
      lng: location.lon,
    };

    // Lade Wetterdaten
    const weatherData = await fetchWeatherData(location.lat, location.lon);

    // Log API call
    if (window.logAnalyticsEvent) {
      window.logAnalyticsEvent("api_call", {
        city: location.city,
        timestamp: Date.now(),
      });
    }

    // Speichere WeatherData im globalen State und bereite renderbare Daten vor
    try {
      appState.weatherData = weatherData;
      appState.renderData = buildRenderData(
        weatherData,
        appState.units || { temperature: "C", wind: "km/h" }
      );
    } catch (e) {
      /* ignore */
    }

    exitDemoMode();

    // Zeige Ergebnisse (verwende die konvertierten renderData für Anzeige)
    try {
      weatherDisplay.displayCurrent(appState.renderData, location.city);
    } catch (e) {
      // Fallback: falls renderData fehlt, zeige rohe Daten
      weatherDisplay.displayCurrent(weatherData, location.city);
    }

    // Neues Home-Layout (Hero + Karten) befüllen
    try {
      const units = appState.units || { temperature: "C", wind: "km/h" };
      const locationDetails =
        appState.renderData?.locationDetails ||
        weatherData?.locationDetails ||
        {};
      const sunEvents =
        appState.renderData?.sunEvents || weatherData?.sunEvents || {};
      const daily = appState.renderData?.openMeteo?.daily || [];
      // Verwende die bereits ab der aktuellen Stunde gefilterten hourly-Daten
      const hourlyData =
        appState.renderData?.hourly ||
        buildHourlyDisplayPayload(appState.renderData, 24).hours ||
        [];
      const homeState = {
        current:
          appState.renderData?.currentSnapshot ||
          appState.renderData?.current ||
          {},
        daily: daily,
        hourly: hourlyData.map((h) => ({
          ...h,
          precipProb: h.precipitationProbability ?? h.precipProb ?? null,
        })),
        location: {
          name: location.city,
          cityName: location.city,
          country:
            locationDetails.country ||
            weatherData?.locationDetails?.countryCode ||
            "Deutschland",
          timezone:
            weatherData?.openMeteo?.timezone ||
            locationDetails?.timezone ||
            null,
        },
        locationDetails: locationDetails,
        sunEvents: sunEvents,
        temperatureUnit: units.temperature || "C",
        windUnit: units.wind || "km/h",
        locale: appState.locale || "de-DE",
        lastUpdated: Date.now(),
        timezone:
          weatherData?.openMeteo?.timezone ||
          locationDetails?.timezone ||
          "Europe/Berlin",
        aqi: appState.renderData?.aqi || appState.aqi || {},
        pollen: appState.renderData?.pollen || {},
        moonPhase: appState.renderData?.moonPhase || {},
      };

      const healthState =
        typeof window.healthSafetyEngine === "function"
          ? window.healthSafetyEngine(homeState)
          : {};

      if (window.WeatherHero && window.WeatherHero.renderWeatherHero) {
        window.WeatherHero.renderWeatherHero(homeState, {
          iconForCode: (code, isDay) => {
            try {
              if (window.weatherIconMapper?.toHtml) {
                return window.weatherIconMapper.toHtml(code, isDay);
              }
              if (window.iconMapper?.toHtml) {
                return window.iconMapper.toHtml(code, isDay);
              }
            } catch (e) {
              return "";
            }
            return "";
          },
          formatUpdatedAt: (ts) => {
            if (!ts) return "";
            try {
              return new Date(ts).toLocaleTimeString(homeState.locale, {
                hour: "2-digit",
                minute: "2-digit",
              });
            } catch {
              return "";
            }
          },
        });
      }

      if (window.HomeCards && window.HomeCards.renderHomeCards) {
        window.HomeCards.renderHomeCards(homeState, healthState);
      }

      // Render Weather Cards Grid (Visual Cards)
      if (window.WeatherCards && window.WeatherCards.renderWeatherCards) {
        window.WeatherCards.renderWeatherCards(homeState);
      }

      // Render Froggy Hero Background
      if (window.FrogHeroPlayer && window.FrogHeroPlayer.renderFrogHero) {
        try {
          window.FrogHeroPlayer.renderFrogHero(homeState.current);
        } catch (e) {
          console.warn("FrogHeroPlayer Rendering fehlgeschlagen", e);
        }
      }
    } catch (e) {
      console.warn("Neues Home-Layout Rendering fehlgeschlagen", e);
    }

    displayWeatherResults(location, weatherData);
    updateTopbarStatus(location.city);
    const favToggle = document.getElementById("favoriteToggle");
    if (favToggle) {
      favToggle.dataset.city = location.city;
      syncFavoriteToggleState(location.city);
    }
    if (location.city) {
      document.title = `Calchas – ${location.city}`;
    }

    syncExtendedPanels({
      city: location.city,
      lat: location.lat,
      lon: location.lon,
      locationDetails: weatherData?.locationDetails,
      coords: location,
    });

    // Speichere im Cache
    weatherCache.setGeo(city, {
      city: location.city,
      lat: location.lat,
      lon: location.lon,
    });

    persistLatestSnapshot(location.city, weatherData);

    if (!silent) {
      showSuccess(`✅ Wetter für ${location.city} geladen`);
    }
    scheduleBackgroundRefresh();
  } catch (error) {
    console.error("❌ Fehler beim Laden:", error);
    if (!silent) {
      const restoredSnapshot = tryRestoreLastSnapshot();
      const demoRendered =
        !restoredSnapshot &&
        renderDemoExperience(
          "📺 Demo-Modus aktiviert – keine Live-Daten verfügbar."
        );

      if (restoredSnapshot) {
        showWarning("Offline-Modus: Zeige letzte gespeicherte Daten");
      } else if (!demoRendered) {
        weatherDisplay.showError(error.message);
      }

      errorHandler.showWithRetry(error.message, () => loadWeather(city));
    } else {
      console.warn("Hintergrund-Update fehlgeschlagen:", error.message);
      if (!tryRestoreLastSnapshot()) {
        renderDemoExperience();
      }
    }
  } finally {
    if (!silent) {
      setSearchComponentsLoadingState(false);
    }
  }
}

/**
 * Wetter mit bekannten Koordinaten laden (ohne erneute Ortssuche)
 */
async function loadWeatherByCoords(lat, lon, cityName, options = {}) {
  const { silent = false } = options;
  try {
    if (window.logAnalyticsEvent) {
      window.logAnalyticsEvent("search", {
        city: cityName,
        lat,
        lon,
        timestamp: Date.now(),
      });
    }

    if (!silent) {
      weatherDisplay.showLoading();
      setSearchComponentsLoadingState(true);
      errorHandler.clearAll();
    }

    const location = {
      city: cityName,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    };

    appState.currentCity = location.city;
    appState.currentCoordinates = {
      lat: location.lat,
      lon: location.lon,
      lng: location.lon,
    };

    const weatherData = await fetchWeatherData(location.lat, location.lon);

    // Speichere WeatherData im globalen State
    try {
      appState.weatherData = weatherData;
      appState.renderData = buildRenderData(
        weatherData,
        appState.units || { temperature: "C", wind: "km/h" }
      );
    } catch (e) {
      console.warn("buildRenderData fehlgeschlagen", e);
    }

    exitDemoMode();

    // Zeige Ergebnisse
    try {
      weatherDisplay.displayCurrent(appState.renderData, location.city);
    } catch (e) {
      weatherDisplay.displayCurrent(weatherData, location.city);
    }

    // Home-Layout rendern
    try {
      const units = appState.units || { temperature: "C", wind: "km/h" };
      // Verwende die bereits ab der aktuellen Stunde gefilterten hourly-Daten
      const hourlyData2 =
        appState.renderData?.hourly ||
        buildHourlyDisplayPayload(appState.renderData, 24).hours ||
        [];
      const homeState = {
        current:
          appState.renderData?.currentSnapshot ||
          appState.renderData?.current ||
          {},
        daily: appState.renderData?.openMeteo?.daily || [],
        hourly: hourlyData2.map((h) => ({
          ...h,
          precipProb: h.precipitationProbability ?? h.precipProb ?? null,
        })),
        location: {
          name: location.city,
          country: weatherData?.locationDetails?.countryCode,
          timezone: weatherData?.openMeteo?.timezone || null,
        },
        temperatureUnit: units.temperature || "C",
        windUnit: units.wind || "km/h",
        locale: appState.locale || "de-DE",
        lastUpdated: Date.now(),
        timezone: weatherData?.openMeteo?.timezone || "Europe/Berlin",
        aqi: appState.renderData?.aqi || appState.aqi || {},
        pollen: appState.renderData?.pollen || {},
      };

      const healthState =
        typeof window.healthSafetyEngine === "function"
          ? window.healthSafetyEngine(homeState)
          : {};

      if (window.WeatherHero?.renderWeatherHero) {
        window.WeatherHero.renderWeatherHero(homeState, {
          iconForCode: (code, isDay) =>
            window.weatherIconMapper?.toHtml?.(code, isDay) ||
            window.iconMapper?.toHtml?.(code, isDay) ||
            "",
          formatUpdatedAt: (ts) =>
            ts
              ? new Date(ts).toLocaleTimeString(homeState.locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
        });
      }

      if (window.HomeCards?.renderHomeCards) {
        window.HomeCards.renderHomeCards(homeState, healthState);
      }

      if (window.WeatherCards?.renderWeatherCards) {
        window.WeatherCards.renderWeatherCards(homeState);
      }
    } catch (e) {
      console.warn("Home-Layout Rendering fehlgeschlagen", e);
    }

    displayWeatherResults(location, weatherData);
    updateTopbarStatus(location.city);

    const favToggle = document.getElementById("favoriteToggle");
    if (favToggle) {
      favToggle.dataset.city = location.city;
      syncFavoriteToggleState(location.city);
    }
    if (location.city) {
      addSearchHistory(location.city);
      document.title = `Calchas – ${location.city}`;
    }

    if (!silent) {
      weatherDisplay.hideLoading();
    }
  } catch (error) {
    console.error("❌ Fehler beim Laden der Wetterdaten:", error);
    if (!silent) {
      weatherDisplay.hideLoading();
      errorHandler.showError(error.message);
    }
  } finally {
    if (!silent) {
      setSearchComponentsLoadingState(false);
    }
  }
}

if (typeof window !== "undefined") {
  window.loadWeather = loadWeather;
  window.loadWeatherByCoords = loadWeatherByCoords;
}

function initializeFeatureModules() {
  setupAnalyticsBridge();

  if (
    typeof WeatherMap === "function" &&
    typeof MapDataInspector === "function"
  ) {
    try {
      mapInspector = new MapDataInspector("map-inspector");
      weatherMapFeature = new WeatherMap("weather-map");
      weatherMapFeature.attachInspector(mapInspector);
      weatherMapFeature.bindToolbar("#map-layer-toolbar");
      window.weatherMap = weatherMapFeature;
    } catch (error) {
      console.warn("Kartenmodul konnte nicht initialisiert werden:", error);
    }
  } else {
    console.warn(
      "WeatherMap oder MapDataInspector nicht verfügbar – Kartenansicht deaktiviert."
    );
  }

  if (typeof WeatherAlerts === "function") {
    weatherAlerts = new WeatherAlerts("weather-alerts");
  }

  if (typeof HistoricalChart === "function") {
    historicalChart = new HistoricalChart("historical-chart");
  }

  const initialSeed =
    appState?.renderData?.locationDetails ||
    appState?.currentCoordinates ||
    appState?.weatherData?.locationDetails ||
    appState?.homeLocation?.coords ||
    null;

  if (initialSeed) {
    syncExtendedPanels({
      city: appState?.currentCity || initialSeed.city,
      locationDetails:
        appState?.renderData?.locationDetails ||
        appState?.weatherData?.locationDetails ||
        initialSeed,
      coords: initialSeed,
    });
  } else if (weatherMapFeature) {
    const defaultSeed = {
      city: "Berlin (Demo)",
      coords: {
        lat: 52.52,
        lon: 13.405,
      },
    };
    const fallbackSource = appState?.homeLocation || defaultSeed;
    const resolvedFallback =
      resolveLocationInput(fallbackSource) || resolveLocationInput(defaultSeed);
    if (resolvedFallback) {
      weatherMapFeature.init(
        resolvedFallback.lat,
        resolvedFallback.lon,
        resolvedFallback.label || fallbackSource?.city || defaultSeed.city
      );
    }
  }
}

function setupAnalyticsBridge() {
  if (analyticsDashboard) {
    return;
  }
  if (typeof Analytics !== "function") {
    if (!window.logAnalyticsEvent) {
      window.logAnalyticsEvent = () => {};
    }
    return;
  }
  try {
    analyticsDashboard = new Analytics();
    window.analytics = analyticsDashboard;
    window.logAnalyticsEvent = (type, payload = {}) => {
      try {
        analyticsDashboard.logEvent(type, payload);
      } catch (err) {
        console.warn("Analytics konnte nicht protokollieren:", err);
      } finally {
        refreshAnalyticsPanel();
      }
    };
    refreshAnalyticsPanel();
  } catch (error) {
    console.warn("Analytics-Modul konnte nicht initialisiert werden:", error);
    if (!window.logAnalyticsEvent) {
      window.logAnalyticsEvent = () => {};
    }
  }
  wireSettingsDataButtons();
}

function refreshAnalyticsPanel() {
  if (analyticsDashboard) {
    analyticsDashboard.renderDashboard("analytics-panel");
  }
}

function wireSettingsDataButtons() {
  const exportBtn = document.getElementById("settings-export-data");
  if (exportBtn && !exportBtn.dataset.bound) {
    exportBtn.addEventListener("click", () => {
      if (!analyticsDashboard) {
        if (typeof showWarning === "function") {
          showWarning(
            "Analytics noch nicht bereit – bitte später erneut versuchen."
          );
        }
        return;
      }
      try {
        const blob = new Blob([analyticsDashboard.exportData()], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `calchas-analytics-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        if (typeof showSuccess === "function") {
          showSuccess("Export abgeschlossen – Datei gespeichert.");
        }
      } catch (error) {
        console.warn("Analytics Export fehlgeschlagen", error);
        if (typeof showError === "function") {
          showError("Export fehlgeschlagen – bitte erneut versuchen.");
        }
      }
    });
    exportBtn.dataset.bound = "true";
  }

  const importBtn = document.getElementById("settings-import-data");
  const importInput = document.getElementById("settings-import-file");
  if (importBtn && importInput && !importBtn.dataset.bound) {
    importBtn.addEventListener("click", () => importInput.click());
    importBtn.dataset.bound = "true";
  }

  if (importInput && !importInput.dataset.bound) {
    importInput.addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const raw = await file.text();
        const payload = JSON.parse(raw);
        if (!payload?.events || !Array.isArray(payload.events)) {
          throw new Error("Ungültiges Exportformat");
        }
        if (!analyticsDashboard) {
          setupAnalyticsBridge();
        }
        if (!analyticsDashboard) {
          throw new Error("Analytics nicht verfügbar");
        }
        analyticsDashboard.events = payload.events;
        analyticsDashboard.saveEvents();
        refreshAnalyticsPanel();
        if (typeof showSuccess === "function") {
          showSuccess("Analytics-Daten importiert.");
        }
      } catch (error) {
        console.warn("Analytics Import fehlgeschlagen", error);
        if (typeof showError === "function") {
          showError(error.message || "Import fehlgeschlagen");
        }
      } finally {
        event.target.value = "";
      }
    });
    importInput.dataset.bound = "true";
  }
}

function syncExtendedPanels(locationLike) {
  const resolved = resolveLocationInput(locationLike);
  if (!resolved) {
    refreshAnalyticsPanel();
    return;
  }
  const { lat, lon, label } = resolved;
  if (weatherMapFeature) {
    weatherMapFeature.init(lat, lon, label);
  }
  if (weatherAlerts) {
    weatherAlerts.fetchAlerts(lat, lon, label);
  }
  if (historicalChart) {
    historicalChart.fetchAndRender(lat, lon, label);
  }
  refreshAnalyticsPanel();
}

function resolveLocationInput(locationLike) {
  const sources = [
    locationLike,
    locationLike?.coords,
    locationLike?.locationDetails,
    appState?.currentCoordinates,
  ].filter(Boolean);

  for (const source of sources) {
    const latCandidate =
      source.lat ??
      source.latitude ??
      (Array.isArray(source) ? source[0] : undefined);
    const lonCandidate =
      source.lon ??
      source.lng ??
      source.longitude ??
      (Array.isArray(source) ? source[1] : undefined);
    const lat =
      typeof latCandidate === "string"
        ? parseFloat(latCandidate)
        : latCandidate;
    const lon =
      typeof lonCandidate === "string"
        ? parseFloat(lonCandidate)
        : lonCandidate;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const label =
        [
          locationLike?.city,
          locationLike?.label,
          locationLike?.name,
          locationLike?.locationDetails?.city,
          source.city,
          appState?.currentCity,
        ].find((entry) => typeof entry === "string" && entry.trim().length) ||
        DEMO_CITY_FALLBACK;
      return { lat, lon, label };
    }
  }
  return null;
}

/**
 * Initialisierung
 */
function initApp() {
  console.log("🚀 Initialisiere Calchas...");

  setupMobileViewportWatcher();
  setupSettingsNavigation();
  setupAppBarScrollBehavior();
  setupPullToRefresh();

  // Initialisiere API Key Manager
  window.apiKeyManager = new APIKeyManager();

  // Setze Default API-Keys (falls noch nicht vorhanden)
  const runtimeDefaultKeys =
    typeof window !== "undefined" &&
    window.__APP_DEFAULT_API_KEYS &&
    typeof window.__APP_DEFAULT_API_KEYS === "object"
      ? window.__APP_DEFAULT_API_KEYS
      : {};

  const bakedInDefaults = {
    // Vom Nutzer bereitgestellte Default-Keys, damit optionale APIs sofort laufen
    openweathermap: "9f79d40dc85bebc834364783854eefbd",
    visualcrossing: "JVCZ3WAHB5XBT7GXQC7RQBGBE",
    meteostat: "edda72c60bmsh4a38c4687147239p14e8d5jsn6f578346b68a",
  };

  window.apiKeyManager.setDefaults({
    ...bakedInDefaults,
    ...runtimeDefaultKeys,
  });

  initializeApiStatusDefaults();
  window.updateApiStatusEntry = (providerId, payload = {}) => {
    if (!providerId) return;
    updateApiStatusStore([{ id: providerId, ...payload }]);
  };

  // Initialisiere Components
  initErrorHandler("#error-container");
  searchComponent = new SearchInputComponent(
    "#cityInput",
    "#searchBtn",
    "#recent-cities"
  );
  weatherDisplay = new WeatherDisplayComponent(
    "current-weather",
    "forecast-container"
  );
  registerSearchComponentInstance(searchComponent, { primary: true });
  window.weatherDisplay = weatherDisplay;
  if (window.__deferredDemoRender) {
    try {
      window.__deferredDemoRender();
    } finally {
      delete window.__deferredDemoRender;
    }
  }

  document.getElementById("searchFocusBtn")?.addEventListener("click", () => {
    focusSearchInput({ select: true });
  });

  // Globale State
  appState = new AppState();
  window.appState = appState;
  initializeFeatureModules();
  if (!window.logAnalyticsEvent) {
    window.logAnalyticsEvent = () => {};
  }
  updateHomeLocationLabel();

  // Render Favorites initial
  try {
    renderFavorites();
  } catch (e) {
    console.warn("Favoriten rendern fehlgeschlagen:", e);
  }

  const useHomeBtn = document.getElementById("use-home-btn");
  if (useHomeBtn) {
    useHomeBtn.addEventListener("click", () => {
      const home = appState?.homeLocation;
      if (!home?.city) {
        showError("Kein Heimatort gespeichert.");
        return;
      }
      const input =
        focusSearchInput({ select: true }) ||
        document.getElementById("cityInput");
      if (input) input.value = home.city;
      loadWeather(home.city);
    });
  }

  const setHomeBtn = document.getElementById("set-home-btn");
  if (setHomeBtn) {
    setHomeBtn.addEventListener("click", () => {
      if (!appState.currentCity || !appState.currentCoordinates) {
        showError("Bitte lade zuerst einen Ort, bevor du ihn speicherst.");
        return;
      }
      appState.setHomeLocation(
        appState.currentCity,
        appState.currentCoordinates
      );
      updateHomeLocationLabel();
      showSuccess(`${appState.currentCity} als Heimatort gespeichert.`);
    });
  }

  const comparisonRefreshBtn = document.getElementById(
    "force-comparison-refresh"
  );
  if (comparisonRefreshBtn) {
    comparisonRefreshBtn.addEventListener("click", () => {
      if (appState?.currentCity) {
        showInfo("Vergleich wird aktualisiert...");
        loadWeather(appState.currentCity);
      } else {
        showWarning("Bitte lade zunächst einen Ort für den Vergleich.");
      }
    });
  }

  const clearHomeBtn = document.getElementById("clear-home-btn");
  if (clearHomeBtn) {
    clearHomeBtn.addEventListener("click", () => {
      if (!appState.homeLocation) return;
      const removedCity = appState.homeLocation.city;
      appState.clearHomeLocation();
      updateHomeLocationLabel();
      showInfo(`${removedCity} als Heimatort entfernt`);
    });
  }

  // Event-Listener
  window.addEventListener("search", (e) => {
    loadWeather(e.detail.city);
  });

  const refreshSelect = document.getElementById("background-refresh-select");
  if (refreshSelect) {
    refreshSelect.value = appState.backgroundRefresh || "off";
    refreshSelect.addEventListener("change", (e) => {
      appState.setBackgroundRefresh(e.target.value);
      scheduleBackgroundRefresh();
      if (e.target.value === "off") {
        showInfo("Automatische Aktualisierung deaktiviert.");
      } else {
        showSuccess(`Aktualisierung startet alle ${e.target.value} Minuten.`);
      }
    });
  }

  document.getElementById("darkModeToggle")?.addEventListener("change", (e) => {
    appState.isDarkMode = e.target.checked;
    document.body.classList.toggle("dark-mode", appState.isDarkMode);
    try {
      localStorage.setItem(
        "wetter_dark_mode",
        appState.isDarkMode ? "true" : "false"
      );
    } catch (e) {
      console.warn("localStorage fehler:", e);
    }
  });

  // Dark Mode initial state
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (darkModeToggle && appState) {
    darkModeToggle.checked = appState.isDarkMode;
  }

  // Settings Button - Toggle Modal
  const settingsBtn = document.getElementById("settingsBtn");
  const modalOverlay = document.getElementById("modal-overlay");

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      openSettingsModal();
    });
  }

  // Modal Close Handlers
  const closeModalBtns = document.querySelectorAll(".modal-close");
  closeModalBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.close;
      closeModal(modalId);
    });
  });

  // Close modal on overlay click
  if (modalOverlay) {
    modalOverlay.addEventListener("click", () => {
      closeAllModals();
    });
  }

  const cityInputEl = document.getElementById("cityInput");
  const savedHome = appState.homeLocation?.city;

  if (savedHome) {
    if (cityInputEl) cityInputEl.value = savedHome;
    loadWeather(savedHome);
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`📍 Standort gefunden: ${latitude}, ${longitude}`);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const cityName =
            data.address?.city ||
            data.address?.town ||
            data.address?.county ||
            "Standort";

          if (cityInputEl) cityInputEl.value = cityName;
          await loadWeather(cityName);
          console.log(`✅ Wetter für ${cityName} automatisch geladen`);
        } catch (err) {
          console.error("Fehler:", err);
          if (cityInputEl) cityInputEl.value = "Berlin";
          loadWeather("Berlin");
        }
      },
      () => {
        console.warn("❌ Geolokalisierung abgelehnt, lade Berlin");
        if (cityInputEl) cityInputEl.value = "Berlin";
        loadWeather("Berlin");
      },
      { timeout: 5000 }
    );
  } else {
    console.warn("⚠️ Geolokalisierung nicht unterstützt");
    if (cityInputEl) cityInputEl.value = "Berlin";
    loadWeather("Berlin");
  }

  // Units selects initial state and handlers
  const tempSelect = document.getElementById("temp-unit-select");
  const windSelect = document.getElementById("wind-unit-select");
  // Load persisted units if present
  try {
    const savedTemp = localStorage.getItem("wetter_unit_temp");
    const savedWind = localStorage.getItem("wetter_unit_wind");
    if (savedTemp) appState.units.temperature = savedTemp;
    if (savedWind) appState.units.wind = savedWind;
  } catch (e) {
    /* ignore */
  }

  if (tempSelect) {
    tempSelect.value = appState.units.temperature || tempSelect.value;
    tempSelect.addEventListener("change", (e) => {
      appState.units.temperature = e.target.value;
      try {
        localStorage.setItem("wetter_unit_temp", e.target.value);
      } catch (err) {}
      // Rebuild renderData and re-render
      try {
        if (appState.weatherData) {
          appState.renderData = buildRenderData(
            appState.weatherData,
            appState.units
          );
          renderFromRenderData();
        }
      } catch (err) {
        console.warn("Unit change render failed", err);
      }
    });
  }

  if (windSelect) {
    windSelect.value = appState.units.wind || windSelect.value;
    windSelect.addEventListener("change", (e) => {
      appState.units.wind = e.target.value;
      try {
        localStorage.setItem("wetter_unit_wind", e.target.value);
      } catch (err) {}
      try {
        if (appState.weatherData) {
          appState.renderData = buildRenderData(
            appState.weatherData,
            appState.units
          );
          renderFromRenderData();
        }
      } catch (err) {
        console.warn("Unit change render failed", err);
      }
    });
  }

  // Setze initiales Theme
  if (appState.isDarkMode) {
    document.body.classList.add("dark-mode");
  }

  // Favoriten Toggle: Delegierter Klick-Handler (für den Stern-Button im aktuellen View)
  document.addEventListener("click", (e) => {
    const favToggle = e.target.closest && e.target.closest("#favoriteToggle");
    if (favToggle) {
      const city = favToggle.dataset.city;
      if (!city) return;

      if (appState.isFavorite(city)) {
        appState.removeFavorite(city);
        favToggle.textContent = "☆";
        favToggle.title = "Zu Favoriten hinzufügen";
        showInfo(`${city} aus Favoriten entfernt`);
      } else {
        appState.saveFavorite(city, appState.currentCoordinates || null);
        favToggle.textContent = "⭐";
        favToggle.title = "Aus Favoriten entfernen";
        showSuccess(`${city} zu Favoriten hinzugefügt`);
      }

      // Update Favoriten-Liste
      try {
        renderFavorites();
        syncFavoriteToggleState(city);
      } catch (err) {
        console.warn(err);
      }
    }
  });

  // Starte Cache-Cleanup
  setCacheInvalidation();

  // Push toggle handler (subscribe/unsubscribe)
  const pushBtn = document.getElementById("pushToggle");
  if (pushBtn) {
    syncPushToggleState();
    pushBtn.addEventListener("click", async () => {
      const enabled = localStorage.getItem("wetter_push_enabled") === "true";
      setPushToggleBusy(true);
      try {
        if (enabled) {
          await unsubscribeFromPush();
          showInfo("Push-Benachrichtigungen deaktiviert");
        } else {
          const ok = await subscribeToPush();
          if (ok) {
            showSuccess(
              "Push-Benachrichtigungen aktiviert (Subscription gespeichert)"
            );
          }
        }
      } catch (e) {
        console.warn("Push toggle error", e);
        handlePushToggleError(e);
      } finally {
        setPushToggleBusy(false);
      }
    });
  }

  // Cache & Verlauf Aktionen in den Einstellungen
  const clearCacheBtn = document.getElementById("clear-cache-btn");
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener("click", () => {
      try {
        const statsBefore =
          typeof weatherCache.getStats === "function"
            ? weatherCache.getStats()
            : null;
        weatherCache.clear();
        showSuccess("Cache geleert – neue Anfragen laden frische Daten.");
        if (window.logAnalyticsEvent) {
          window.logAnalyticsEvent("settings_action", {
            action: "clear_cache",
            clearedEntries: statsBefore?.totalEntries || 0,
            clearedBytes: statsBefore?.totalSize || 0,
          });
        }
      } catch (err) {
        console.warn("Cache konnte nicht geleert werden", err);
        showWarning(
          "Cache konnte nicht geleert werden. Bitte erneut versuchen."
        );
      }
    });
  }

  const clearRecentBtn = document.getElementById("clear-recent-btn");
  if (clearRecentBtn) {
    clearRecentBtn.addEventListener("click", () => {
      const hadEntries = clearAllSearchComponentRecents();
      if (hadEntries) {
        showSuccess("Suchverlauf geleert.");
      } else {
        showInfo("Kein Suchverlauf vorhanden.");
      }
    });
  }

  // API Keys - Load existing keys into inputs
  const owmKeyInput = document.getElementById("openweathermap-key");
  const vcKeyInput = document.getElementById("visualcrossing-key");
  const meteostatKeyInput = document.getElementById("meteostat-key");
  if (owmKeyInput)
    owmKeyInput.value = window.apiKeyManager.getKey("openweathermap") || "";
  if (vcKeyInput)
    vcKeyInput.value = window.apiKeyManager.getKey("visualcrossing") || "";
  if (meteostatKeyInput)
    meteostatKeyInput.value = window.apiKeyManager.getKey("meteostat") || "";

  // API Keys - Save handlers
  if (owmKeyInput) {
    const persistOwmKey = (rawValue) => {
      const trimmed = (rawValue || "").trim();
      if (!trimmed) {
        window.apiKeyManager.setKey("openweathermap", "");
        showInfo("OpenWeatherMap API-Key entfernt");
        syncProviderKeyState("openweathermap");
        return;
      }
      if (!/^[A-Za-z0-9]{32,64}$/.test(trimmed)) {
        showWarning(
          "OpenWeatherMap API-Key muss 32 Zeichen enthalten. Bitte kopiere ihn exakt aus deinem OWM-Dashboard."
        );
        focusAndHighlight("openweathermap-key", 200);
        return;
      }
      const success = window.apiKeyManager.setKey("openweathermap", trimmed);
      if (success) {
        showSuccess("OpenWeatherMap API-Key gespeichert");
        syncProviderKeyState("openweathermap");
      }
    };

    ["change", "blur"].forEach((evtName) => {
      owmKeyInput.addEventListener(evtName, (e) =>
        persistOwmKey(e.target.value)
      );
    });

    owmKeyInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        persistOwmKey(e.target.value);
      }
    });
  }
  if (vcKeyInput) {
    vcKeyInput.addEventListener("change", (e) => {
      const success = window.apiKeyManager.setKey(
        "visualcrossing",
        e.target.value
      );
      if (success) {
        showSuccess("VisualCrossing API-Key gespeichert");
        syncProviderKeyState("visualcrossing");
      }
    });
  }
  if (meteostatKeyInput) {
    meteostatKeyInput.addEventListener("change", (e) => {
      const success = window.apiKeyManager.setKey("meteostat", e.target.value);
      if (success) {
        showSuccess("Meteostat API-Key gespeichert");
        syncProviderKeyState("meteostat");
      }
    });
  }

  // VAPID Save button
  const saveVapidBtn = document.getElementById("saveVapidBtn");
  if (saveVapidBtn) {
    saveVapidBtn.addEventListener("click", () => {
      const v = document.getElementById("vapidKeyInput")?.value?.trim() || "";
      if (v.length < 20) {
        showWarning("Bitte gib einen gültigen VAPID Public Key an.");
        return;
      }
      persistVapidKey(v);
      showSuccess("VAPID key gespeichert.");
      syncPushToggleState();
    });
  }

  // Fetch VAPID from local server button
  const fetchVapidBtn = document.getElementById("fetchVapidBtn");
  if (fetchVapidBtn) {
    fetchVapidBtn.addEventListener("click", async () => {
      try {
        fetchVapidBtn.disabled = true;
        fetchVapidBtn.dataset.loading = "true";
        const key = await ensureVapidKey({ forceFetch: true });
        if (key) {
          showSuccess("VAPID key vom lokalen Server geladen");
        } else {
          showWarning("Konnte VAPID key nicht vom lokalen Server laden");
        }
      } catch (e) {
        showWarning("Fehler beim Laden des VAPID keys: " + (e && e.message));
      } finally {
        fetchVapidBtn.disabled = false;
        delete fetchVapidBtn.dataset.loading;
        syncPushToggleState();
      }
    });
  }

  // AUTO-FETCH VAPID on app init - nur wenn Push-Server erreichbar
  // Push-Benachrichtigungen sind optional und benötigen einen separaten Server
  if (typeof ensureVapidKey === "function") {
    setTimeout(async () => {
      try {
        // Prüfe erst ob der Push-Server überhaupt läuft
        const testRes = await fetch("http://localhost:3030/keys", {
          method: "HEAD",
        }).catch(() => null);
        if (!testRes || !testRes.ok) {
          console.info(
            "ℹ️ Push-Server nicht verfügbar – Push-Benachrichtigungen deaktiviert"
          );
          return;
        }
        const key = await ensureVapidKey();
        if (key) {
          console.log("✅ VAPID Key bereitgestellt");
        }
      } catch (e) {
        // Stille Fehlerbehandlung - Push ist optional
      } finally {
        if (typeof syncPushToggleState === "function") syncPushToggleState();
      }
    }, 2000); // Verzögert um App-Start nicht zu blockieren
  }

  // Home-Bereich: Immer sinnvolle Demo-Daten anzeigen, falls keine
  // gespeicherten Live-Daten vorhanden sind. So bleibt die App auch bei
  // 401/503/Offline sofort bedienbar.
  const restoredSnapshot = tryRestoreLastSnapshot();
  if (restoredSnapshot) {
    showInfo("📦 Zeige letzten gespeicherten Wetterstand – aktualisiere...");
  } else {
    const offline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    const reason = offline
      ? "📺 Offline erkannt – Demo-Daten werden angezeigt."
      : "👋 Demo-Vorschau aktiv – starte eine Suche für Live-Wetter.";
    renderDemoExperience(reason);
  }

  // Expose a simple smoke-test callable from console
  window.runSmokeTest = runSmokeTest;

  // App-Shell / Navigation initialisieren (neue mobile UI)
  try {
    initAppShell(appState);
  } catch (e) {
    console.warn("App-Shell konnte nicht initialisiert werden", e);
  }

  console.log("✅ App initialisiert");
}

// Globale Komponenten-Instanzen
let appState;
let searchComponent;
let weatherDisplay;
let weatherMapFeature;
let mapInspector;
let weatherAlerts;
let historicalChart;
let analyticsDashboard;

const searchComponentRegistry = [];

function getRegisteredSearchComponents() {
  if (typeof window !== "undefined") {
    if (Array.isArray(window.searchComponents)) {
      window.searchComponents.forEach((component) => {
        if (component && !searchComponentRegistry.includes(component)) {
          searchComponentRegistry.push(component);
        }
      });
    } else if (window.searchComponent) {
      if (!searchComponentRegistry.includes(window.searchComponent)) {
        searchComponentRegistry.push(window.searchComponent);
      }
    }
  } else if (searchComponent) {
    if (!searchComponentRegistry.includes(searchComponent)) {
      searchComponentRegistry.push(searchComponent);
    }
  }
  return searchComponentRegistry;
}

function registerSearchComponentInstance(instance, options = {}) {
  if (!instance) return null;
  if (!searchComponentRegistry.includes(instance)) {
    searchComponentRegistry.push(instance);
  }
  if (typeof window !== "undefined") {
    window.searchComponents = searchComponentRegistry;
    if (!window.searchComponent || options?.primary) {
      window.searchComponent = instance;
    }
  }
  if ((!searchComponent || options?.primary) && typeof instance === "object") {
    searchComponent = instance;
  }
  return instance;
}

function setSearchComponentsLoadingState(isLoading) {
  getRegisteredSearchComponents().forEach((component) => {
    if (component && typeof component.setLoading === "function") {
      try {
        component.setLoading(isLoading);
      } catch (err) {
        console.warn(
          "SearchInput Loading-State konnte nicht gesetzt werden",
          err
        );
      }
    }
  });
}

function clearAllSearchComponentRecents() {
  let hadEntries = false;
  getRegisteredSearchComponents().forEach((component) => {
    if (component && typeof component.clearRecent === "function") {
      try {
        hadEntries = component.clearRecent() || hadEntries;
      } catch (err) {
        console.warn("Suchverlauf konnte nicht geleert werden", err);
      }
    }
  });
  return hadEntries;
}

if (typeof window !== "undefined") {
  window.clearSearchHistory = clearAllSearchComponentRecents;
  window.registerSearchComponentInstance = registerSearchComponentInstance;
  window.setSearchComponentsLoadingState = setSearchComponentsLoadingState;
}

// Starte App wenn DOM bereit
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// === Stundenanzeige mit Endlosschleife & sanftem Drag ===
function renderHourly(
  containerId,
  times,
  temps,
  weatherCodes = [],
  useIcons = false
) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.classList.add("hourly");
  container.innerHTML = `
  <div class="hourly-bg"></div>
`;

  const baseCount = 24;
  const hours = times.slice(0, baseCount);
  const temps24 = temps.slice(0, baseCount);
  const codes24 = weatherCodes.slice(0, baseCount);
  const allTimes = [...hours, ...hours];
  const allTemps = [...temps24, ...temps24];
  const allCodes = [...codes24, ...codes24];

  allTimes.forEach((time, i) => {
    const date = new Date(time);
    const hour = date.getHours().toString().padStart(2, "0");
    const temp = allTemps[i]?.toFixed(1) ?? "-";
    let icon = "☀️";

    if (!useIcons) {
      const code = allCodes[i];
      if ([0].includes(code)) icon = "☀️";
      else if ([1, 2].includes(code)) icon = "🌤️";
      else if ([3].includes(code)) icon = "☁️";
      else if ([45, 48].includes(code)) icon = "🌫️";
      else if ([51, 61, 80].includes(code)) icon = "🌦️";
      else if ([63, 65, 81, 82].includes(code)) icon = "🌧️";
      else if ([71, 73, 75, 77, 85, 86].includes(code)) icon = "❄️";
      else icon = "🌡️";
    } else {
      const code = allCodes[i] || "";
      if (code.includes("cloudy")) icon = "☁️";
      else if (code.includes("rain")) icon = "🌧️";
      else if (code.includes("clear")) icon = "☀️";
      else icon = "🌦️";
    }

    const div = document.createElement("div");
    div.className = "hour";
    div.innerHTML = `<b>${hour}h</b><br>${icon}<br>${temp}°C`;
    container.appendChild(div);
  });

  // Textauswahl komplett deaktivieren
  container.style.userSelect = "none";

  // Sanftes Dragging aktivieren
  enableSmoothDragScroll(container);

  // Endlos-Loop
  container.addEventListener("scroll", () => {
    const half = container.scrollWidth / 2;
    if (container.scrollLeft >= half) container.scrollLeft -= half;
    else if (container.scrollLeft <= 0) container.scrollLeft += half;
  });

  // Startposition mittig
  container.scrollLeft = container.scrollWidth / 4;
}

/**
 * Einfacher Smoke-Test: prüft presence von Kern-Komponenten und Rendertests (offline-safe)
 * Gibt ein Objekt mit Resultaten zurück und loggt im Console.
 */
async function runSmokeTest() {
  const results = [];
  try {
    results.push({
      ok: !!window.searchComponent,
      msg: "searchComponent vorhanden",
    });
    results.push({
      ok: !!window.weatherDisplay,
      msg: "weatherDisplay vorhanden",
    });
    results.push({ ok: !!window.appState, msg: "appState vorhanden" });

    // Versuch Favoriten zu rendern
    try {
      renderFavorites();
      results.push({
        ok: true,
        msg: "renderFavorites() erfolgreich ausgeführt",
      });
    } catch (e) {
      results.push({
        ok: false,
        msg: "renderFavorites() fehlgeschlagen: " + e.message,
      });
    }

    // Loading/empty view
    try {
      weatherDisplay.showEmpty();
      results.push({ ok: true, msg: "weatherDisplay.showEmpty() OK" });
    } catch (e) {
      results.push({
        ok: false,
        msg: "weatherDisplay.showEmpty() failed: " + e.message,
      });
    }
  } catch (err) {
    results.push({ ok: false, msg: "Smoke test exception: " + err.message });
  }

  console.group("Smoke Test Results");
  results.forEach((r) =>
    console[r.ok ? "log" : "error"]((r.ok ? "PASS" : "FAIL") + " - " + r.msg)
  );
  console.groupEnd();
  return results;
}

/**
 * Subscribe to Push (best-effort). Stores subscription JSON in localStorage.
 * Note: For production you should pass a VAPID public key (applicationServerKey).
 */
async function subscribeToPush() {
  if (!("serviceWorker" in navigator))
    throw new Error("Service Worker nicht unterstützt");
  const reg = await navigator.serviceWorker.ready;
  try {
    let stored = await ensureVapidKey();
    if (!stored || stored.length < 20) {
      stored = resolveVapidKey();
    }
    if (!stored || stored.length < 20) {
      throw new Error(
        'Missing VAPID public key. Bitte füge in den Einstellungen deinen VAPID Public Key (Base64 URL-safe) ein oder starte den lokalen Push-Server und klicke "Fetch VAPID".'
      );
    }
    persistVapidKey(stored);
    const options = { userVisibleOnly: true };
    try {
      options.applicationServerKey = urlBase64ToUint8Array(stored);
    } catch (e) {
      throw new Error(
        "Ungültiges VAPID Key Format. Bitte überprüfe den Public Key."
      );
    }

    const sub = await reg.pushManager.subscribe(options);
    // try to send subscription to local push server if reachable
    try {
      await sendSubscriptionToServer(sub);
      showSuccess("Push-Subscription an lokalen Server übermittelt");
    } catch (e) {
      console.warn("Could not send subscription to local server", e);
    }
    localStorage.setItem("wetter_push_subscription", JSON.stringify(sub));
    localStorage.setItem("wetter_push_enabled", "true");
    console.log("Push Subscription:", sub);
    syncPushToggleState();
    return true;
  } catch (err) {
    console.warn("Push subscription failed", err);
    throw err;
  }
}

/**
 * Fetch VAPID public key from local push server (/keys)
 */
async function fetchVapidFromServer() {
  try {
    const res = await fetch("http://localhost:3030/keys");
    if (!res.ok) throw new Error("Local push server not available");
    const json = await res.json();
    return json.publicKey || null;
  } catch (e) {
    console.warn("fetchVapidFromServer failed", e);
    return null;
  }
}

/**
 * Send subscription object to local push server /subscribe
 */
async function sendSubscriptionToServer(subscription) {
  try {
    const res = await fetch("http://localhost:3030/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    if (!res.ok) throw new Error("Server returned " + res.status);
    return await res.json();
  } catch (e) {
    console.warn("sendSubscriptionToServer failed", e);
    throw e;
  }
}

/**
 * Helper: converts a URL-safe base64 string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator))
    throw new Error("Service Worker nicht unterstützt");
  const reg = await navigator.serviceWorker.ready;
  const subs = await reg.pushManager.getSubscription();
  if (subs) {
    await subs.unsubscribe();
  }
  localStorage.removeItem("wetter_push_subscription");
  localStorage.setItem("wetter_push_enabled", "false");
  syncPushToggleState();
  return true;
}

function handlePushToggleError(error) {
  const message = error?.message || "Unbekannter Fehler";
  const normalized = message.toLowerCase();

  if (normalized.includes("vapid")) {
    showWarning(
      "Push-Benachrichtigungen benötigen einen gültigen VAPID Public Key.",
      null,
      {
        title: "Push-Setup unvollständig",
        list: [
          "Öffne ⚙️ Einstellungen → Push-Benachrichtigungen",
          'Trage den Base64 VAPID Public Key ein oder klicke "Fetch VAPID"',
          "Aktiviere anschließend den Push-Schalter erneut",
        ],
        actions: [
          {
            label: "Einstellungen öffnen",
            kind: "primary",
            onClick: () => openSettingsModal("vapidKeyInput"),
          },
          {
            label: "Fetch VAPID",
            onClick: () => document.getElementById("fetchVapidBtn")?.click(),
          },
        ],
      }
    );
    return;
  }

  if (normalized.includes("service worker")) {
    showWarning(
      "Push-Benachrichtigungen werden von diesem Browser leider nicht unterstützt.",
      null,
      {
        meta: "Verwende einen aktuellen Chromium- oder Firefox-Browser mit aktiviertem Service Worker Support.",
      }
    );
    return;
  }

  showWarning(`Push konnte nicht umgeschaltet werden: ${message}`, null, {
    meta: "Bitte prüfe die Browser-Konsole für weitere Details.",
  });
}

function resolveVapidKey() {
  const input = document.getElementById("vapidKeyInput");
  const typed = input?.value?.trim();
  if (typed && typed.length >= 20) return typed;
  try {
    const stored = localStorage.getItem("wetter_vapid_public") || "";
    return stored.trim();
  } catch (e) {
    return "";
  }
}

function persistVapidKey(key) {
  if (!key) return "";
  const normalized = key.trim();
  if (!normalized) return "";
  try {
    localStorage.setItem("wetter_vapid_public", normalized);
  } catch (e) {
    console.warn("VAPID key konnte nicht gespeichert werden:", e);
  }
  const input = document.getElementById("vapidKeyInput");
  if (input && input.value !== normalized) {
    input.value = normalized;
  }
  return normalized;
}

function hasUsableVapidKey() {
  return resolveVapidKey().length >= 20;
}

async function ensureVapidKey({ forceFetch = false } = {}) {
  if (!forceFetch) {
    const existing = resolveVapidKey();
    if (existing && existing.length >= 20) {
      return existing;
    }
  }
  const fetched = await fetchVapidFromServer();
  if (fetched && fetched.length >= 20) {
    return persistVapidKey(fetched);
  }
  return null;
}

function syncPushToggleState() {
  const pushBtn = document.getElementById("pushToggle");
  if (!pushBtn) return;
  let enabled = false;
  try {
    enabled = localStorage.getItem("wetter_push_enabled") === "true";
  } catch (e) {
    enabled = false;
  }
  const hasKey = hasUsableVapidKey();
  pushBtn.textContent = enabled ? "🔕" : "🔔";
  pushBtn.title = enabled
    ? "Push-Benachrichtigungen deaktivieren"
    : hasKey
    ? "Push-Benachrichtigungen aktivieren"
    : "VAPID Key erforderlich";
  pushBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  const shouldDisable = !hasKey && !enabled;
  pushBtn.disabled = shouldDisable;
  pushBtn.dataset.pushState = enabled ? "on" : "off";
  pushBtn.dataset.pushKey = hasKey ? "ready" : "missing";
}

function setPushToggleBusy(isBusy) {
  const pushBtn = document.getElementById("pushToggle");
  if (!pushBtn) return;
  if (isBusy) {
    pushBtn.setAttribute("aria-busy", "true");
    pushBtn.dataset.loading = "true";
    pushBtn.disabled = true;
  } else {
    pushBtn.removeAttribute("aria-busy");
    delete pushBtn.dataset.loading;
    syncPushToggleState();
  }
}

// Legacy Settings-Modal entfernt – zentrale Settings laufen über die
// mobile App-View (BottomNav → data-view="settings" + Bottom-Sheets).
// Die folgenden Funktionen bleiben als No-Op bestehen, damit ältere
// Aufrufe nichts kaputt machen.

function openSettingsModal(focusFieldId) {
  if (focusFieldId) {
    focusAndHighlight(focusFieldId, 250);
  }
}

function closeModal(modalId) {
  if (!modalId) return;
  if (modalId === "settings-modal") {
    closeSettingsSubview();
  }
}

function closeAllModals() {
  closeSettingsSubview();
}

function openSettingsSubview(targetView) {
  if (!targetView) return;
  if (!SETTINGS_NAV_MAP[targetView]) {
    console.warn(`Kein Settings-View für "${targetView}" definiert.`);
  }
  const overlay = document.getElementById("settings-subview-overlay");
  if (!overlay) return;
  const view = overlay.querySelector(
    `.settings-subview[data-view="${targetView}"]`
  );
  if (!view) return;

  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");

  overlay.querySelectorAll(".settings-subview").forEach((section) => {
    if (section === view) {
      section.setAttribute("aria-hidden", "false");
      section.removeAttribute("hidden");
    } else {
      section.setAttribute("aria-hidden", "true");
      section.setAttribute("hidden", "hidden");
    }
  });

  activeSettingsSubview = targetView;

  setTimeout(() => {
    const config = SETTINGS_NAV_MAP[targetView];
    const preferredFocus = config?.focusSelector
      ? view.querySelector(config.focusSelector)
      : null;
    const focusTarget =
      preferredFocus ||
      view.querySelector("[data-settings-initial-focus]") ||
      view.querySelector(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex='-1'])"
      );
    focusTarget?.focus({ preventScroll: false });
  }, 60);
}

function closeSettingsSubview() {
  const overlay = document.getElementById("settings-subview-overlay");
  if (!overlay) return;
  overlay.classList.remove("active");
  overlay.setAttribute("aria-hidden", "true");
  overlay.querySelectorAll(".settings-subview").forEach((section) => {
    section.setAttribute("aria-hidden", "true");
    section.setAttribute("hidden", "hidden");
  });
  activeSettingsSubview = null;
}

function setupSettingsNavigation() {
  const panel = document.querySelector(".settings-panel");
  const overlay = document.getElementById("settings-subview-overlay");
  if (!panel || !overlay) return;

  const triggers = panel.querySelectorAll(
    ".settings-link[data-settings-target]"
  );
  triggers.forEach((trigger) => {
    const target = trigger.getAttribute("data-settings-target");
    if (!target) return;
    if (!SETTINGS_NAV_MAP[target]) {
      console.warn(`Unbekannter settings target: ${target}`);
    }
    trigger.addEventListener("click", () => openSettingsSubview(target));
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSettingsSubview(target);
      }
    });
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeSettingsSubview();
    }
  });

  overlay
    .querySelectorAll("[data-settings-back]")
    .forEach((btn) =>
      btn.addEventListener("click", () => closeSettingsSubview())
    );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeSettingsSubview) {
      const isOverlayActive = overlay.classList.contains("active");
      if (isOverlayActive) {
        event.stopPropagation();
        closeSettingsSubview();
      }
    }
  });

  closeSettingsSubview();
}

function focusAndHighlight(elementId, delay = 150) {
  if (!elementId) return;
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const parentView = element.closest(".settings-subview");
    const targetView = parentView?.getAttribute("data-view");
    if (targetView && parentView?.getAttribute("aria-hidden") === "true") {
      openSettingsSubview(targetView);
    }
    try {
      element.focus({ preventScroll: false });
    } catch (e) {
      element.focus();
    }
    element.classList.add("input-highlight");
    setTimeout(() => element.classList.remove("input-highlight"), 2200);
  }, delay);
}

// === Drag ohne Zucken ===
function enableSmoothDragScroll(container) {
  let isDown = false;
  let startX, scrollLeft;

  const startDrag = (pageX) => {
    isDown = true;
    container.classList.add("dragging");
    startX = pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  };

  const endDrag = () => {
    isDown = false;
    container.classList.remove("dragging");
  };

  const moveDrag = (pageX) => {
    if (!isDown) return;
    const x = pageX - container.offsetLeft;
    const walk = x - startX;
    container.scrollLeft = scrollLeft - walk;
  };

  // Maus
  container.addEventListener("mousedown", (e) => startDrag(e.pageX));
  container.addEventListener("mousemove", (e) => moveDrag(e.pageX));
  window.addEventListener("mouseup", endDrag);

  // Touch
  container.addEventListener("touchstart", (e) =>
    startDrag(e.touches[0].pageX)
  );
  container.addEventListener("touchmove", (e) => moveDrag(e.touches[0].pageX));
  container.addEventListener("touchend", endDrag);
}
