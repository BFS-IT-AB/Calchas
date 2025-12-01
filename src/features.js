/* global L, Chart */

/**
 * features.js - Additional UI modules used by app.js
 * Weather map, alert aggregation, historical charts and local analytics.
 */

/**
 * @typedef {Window & {
 *   apiKeyManager?: {
 *     hasKey(key: string): boolean;
 *     getKey(key: string): string | null | undefined;
 *   };
 *   updateApiStatusEntry?: (
 *     service: string,
 *     status: { state: string; message: string; detail?: string }
 *   ) => void;
 *   loadWeather?: (city: string) => Promise<void> | void;
 *   L?: any;
 *   Chart?: any;
 * }} AugmentedWindow
 */

/**
 * @returns {AugmentedWindow | undefined}
 */
function getAugmentedWindow() {
  if (typeof window === "undefined") return undefined;
  return /** @type {AugmentedWindow} */ (window);
}

/**
 * @returns {any}
 */
function getLeafletInstance() {
  return getAugmentedWindow()?.L;
}

/**
 * @returns {any}
 */
function getChartInstance() {
  return getAugmentedWindow()?.Chart;
}

// ============================================
// 1. LEAFLET MAP / OVERLAYS
// ============================================

class WeatherMap {
  constructor(containerId) {
    this.containerId = containerId;
    this.leaflet = getLeafletInstance();
    this.map = null;
    this.marker = null;
    this.baseLayer = null;
    this.layerControl = null;
    this.overlayLookup = new Map();
    this.overlayConfigs = this._buildOverlayConfig();
    this.toolbarConfigs = this._buildToolbarConfig();
    this.legendOrder = this.overlayConfigs.map((cfg) => cfg.key);
    this.legendItems = new Map();
    this.statusEl = null;
    this.noticeEl = null;
    this.currentOverlay = null;
    this.rainViewerTileUrl = null;
    this.rainViewerFetchedAt = 0;
    this.rainViewerPromise = null;
    this.rainViewerFrames = { past: [], nowcast: [] };
    this.rainViewerFrameIndex = 0;
    this.rainViewerMode = "nowcast";
    this.rainViewerHost = "https://tilecache.rainviewer.com";
    this.rainViewerSatelliteFrames = [];
    this.rainViewerFallbackActive = false;
    this.radarControlsEl = null;
    this.rainViewerLoading = false;
    this.rainViewerError = null;
    this.rainViewerPlaybackHandle = null;
    this.rainViewerIsPlaying = false;
    this._radarControlHandler = null;
    this._radarTimelineHandler = null;
    this.overlayEventsBound = false;
    this.overlayLayerByKey = new Map();
    this.toolbarEl = null;
    this.toolbarActiveKey = null;
    this.inspector = null;
    this._toolbarHandler = null;
    this.resizeObserver = null;
    this._invalidateHandle = null;
    this._visibilityRetry = null;
    this._viewportHandlers = null;
    this.legendEl = null;
    this.layerContextEl = null;
    this.quickActionsEl = null;
    this._quickActionHandler = null;
  }

  init(lat, lon, city) {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.warn("WeatherMap container missing", this.containerId);
      return;
    }

    if (!this.leaflet) {
      container.innerHTML =
        '<div class="map-unavailable">Leaflet nicht geladen - Karte deaktiviert</div>';
      return;
    }

    this._observeContainer(container);
    this._ensureLegendTarget();
    this._bindQuickActions();

    if (!this.map) {
      this._createMap(lat, lon);
      this._ensureOverlayStatus();
      this._injectOverlayNotice(container);
      this._ensureRadarControlsTarget();
      this._bindViewportListeners();
    }

    this._setMarker(lat, lon, city);
    this.map.setView([lat, lon], 10);
    this.ensureVisibility();
  }

  _createMap(lat, lon) {
    this.map = this.leaflet
      .map(this.containerId, {
        preferCanvas: true,
        zoomControl: true,
      })
      .setView([lat, lon], 10);

    this.baseLayer = this.leaflet
      .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "OpenStreetMap contributors",
        maxZoom: 18,
      })
      .addTo(this.map);

    this.refreshOverlays();
    if (this.inspector && typeof this.inspector.bindToMap === "function") {
      this.inspector.bindToMap(this);
    }
    this.ensureVisibility();
  }

  _setMarker(lat, lon, city) {
    if (!this.map) return;

    if (this.marker) {
      this.marker.setLatLng([lat, lon]);
      this.marker.setPopupContent(`<strong>${city || "Standort"}</strong>`);
    } else {
      this.marker = this.leaflet.marker([lat, lon]).addTo(this.map);
      this.marker.bindPopup(`<strong>${city || "Standort"}</strong>`);
    }
  }

  _buildOverlayConfig() {
    return [
      {
        key: "radar",
        label: "Regenradar (RainViewer)",
        provider: "RainViewer",
        attribution: " RainViewer",
        url: "https://tilecache.rainviewer.com/v2/radar/nowcast_0/512/{z}/{x}/{y}/2/1_1.png",
      },
      {
        key: "owm-clouds",
        label: "Wolkendecke (OWM)",
        provider: "OpenWeatherMap",
        requiresKey: true,
        template:
          "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid={API_KEY}",
      },
      {
        key: "owm-temp",
        label: "Temperatur (OWM)",
        provider: "OpenWeatherMap",
        requiresKey: true,
        template:
          "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid={API_KEY}",
      },
      {
        key: "owm-precip",
        label: "Niederschlag (OWM)",
        provider: "OpenWeatherMap",
        requiresKey: true,
        template:
          "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid={API_KEY}",
      },
      {
        key: "owm-wind",
        label: "Wind (OWM)",
        provider: "OpenWeatherMap",
        requiresKey: true,
        template:
          "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid={API_KEY}",
      },
      {
        key: "owm-pressure",
        label: "Luftdruck (OWM)",
        provider: "OpenWeatherMap",
        requiresKey: true,
        template:
          "https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid={API_KEY}",
      },
      {
        key: "owm-snow",
        label: "Schnee (OWM)",
        provider: "OpenWeatherMap",
        requiresKey: true,
        template:
          "https://tile.openweathermap.org/map/snow_new/{z}/{x}/{y}.png?appid={API_KEY}",
      },
    ];
  }

  _buildToolbarConfig() {
    return [
      {
        key: "temp",
        label: "Temperatur-Layer",
        shortLabel: "Temp",
        icon: "🌡️",
        provider: "OpenWeatherMap",
        description:
          "Visualisiert aktuelle Temperaturfelder als farbige Heatmap.",
        overlayKey: "owm-temp",
        inspectorMode: "temperature",
      },
      {
        key: "radar",
        label: "Radar + Regen",
        shortLabel: "Radar",
        icon: "🌧️",
        provider: "RainViewer",
        description:
          "Animiertes Radar mit vergangenem und prognostiziertem Niederschlag.",
        overlayKey: "radar",
        inspectorMode: "precipitation",
      },
      {
        key: "precip",
        label: "Niederschlag",
        shortLabel: "Regen",
        icon: "💧",
        provider: "OpenWeatherMap",
        description: "Farbige Darstellung für Regen- und Schneeintensität.",
        overlayKey: "owm-precip",
        inspectorMode: "precipitation",
      },
      {
        key: "wind",
        label: "Wind",
        shortLabel: "Wind",
        icon: "🌬️",
        provider: "OpenWeatherMap",
        description: "Windrichtungen und -geschwindigkeiten als Strömung.",
        overlayKey: "owm-wind",
        inspectorMode: "wind",
      },
      {
        key: "clouds",
        label: "Wolken",
        shortLabel: "Wolken",
        icon: "☁️",
        provider: "OpenWeatherMap",
        description: "Bewölkungsdichte und Struktur aus Satellitendaten.",
        overlayKey: "owm-clouds",
        inspectorMode: "clouds",
      },
      {
        key: "pressure",
        label: "Druck",
        shortLabel: "Druck",
        icon: "🧭",
        provider: "OpenWeatherMap",
        description: "Luftdruck-Isobaren zur Einordnung der Großwetterlage.",
        overlayKey: "owm-pressure",
      },
      {
        key: "snow",
        label: "Winter",
        shortLabel: "Winter",
        icon: "❄️",
        provider: "OpenWeatherMap",
        description: "Schnee- und Eis-Layer für Winterbedingungen.",
        overlayKey: "owm-snow",
        inspectorMode: "winter",
      },
      {
        key: "humidity",
        label: "Luftfeuchte",
        shortLabel: "Feuchte",
        icon: "💦",
        provider: "Calchas Inspector",
        description:
          "Inspector zeigt relative Luftfeuchte für den fokussierten Ort.",
        inspectorMode: "humidity",
      },
      {
        key: "visibility",
        label: "Sichtweite",
        shortLabel: "Sicht",
        icon: "🛰️",
        provider: "Calchas Inspector",
        description:
          "Berechnet Sichtweite & Einschränkungen für den ausgewählten Punkt.",
        inspectorMode: "visibility",
      },
      {
        key: "dewpoint",
        label: "Taupunkt",
        shortLabel: "Tau",
        icon: "🧊",
        provider: "Calchas Inspector",
        description: "Zeigt Taupunkt & Feuchtegefühl innerhalb des Inspectors.",
        inspectorMode: "dewpoint",
      },
      {
        key: "air",
        label: "Luftqualität",
        shortLabel: "Air",
        icon: "🫧",
        provider: "Calchas Inspector",
        description:
          "Inspector blendet lokale Luftqualitäts-Indizes (AQI) ein.",
        inspectorMode: "air-quality",
      },
    ];
  }

  _buildOverlayLayers() {
    if (!this.map) return;

    const overlays = {};
    const locked = [];
    let pendingRainViewer = false;
    const browserWindow = getAugmentedWindow();
    const hasKeyManager = Boolean(browserWindow?.apiKeyManager);
    const owmKey = browserWindow?.apiKeyManager?.hasKey("openweathermap")
      ? browserWindow.apiKeyManager.getKey("openweathermap")
      : null;

    this.overlayLookup.clear();
    this.overlayLayerByKey.clear();
    this.legendItems.clear();

    this.overlayConfigs.forEach((config) => {
      let url = config.url;
      let state = "available";
      let detail = config.provider || "";
      let shouldSkipLayer = false;

      if (config.key === "radar") {
        const rainUrl = this._getActiveRainViewerTileUrl();
        if (rainUrl) {
          url = rainUrl;
        } else {
          pendingRainViewer = true;
          state = "loading";
          detail = "Radar wird geladen";
          shouldSkipLayer = true;
        }
      }

      if (config.requiresKey) {
        if (!owmKey) {
          locked.push(config.label);
          state = "locked";
          detail = "API-Key erforderlich";
          shouldSkipLayer = true;
        } else {
          url = (config.template || "").replace("{API_KEY}", owmKey);
        }
      }

      if (!url && !shouldSkipLayer) {
        state = "error";
        detail = "Overlay nicht verfügbar";
        shouldSkipLayer = true;
      }

      if (shouldSkipLayer) {
        this._updateLegendEntry(config, state, detail);
        return;
      }

      const layerOptions = {
        attribution: config.attribution || config.provider,
        opacity: config.key === "radar" ? 0.85 : 0.65,
        maxZoom: config.key === "radar" ? 12 : 18,
      };

      if (config.key === "radar") {
        Object.assign(layerOptions, {
          tileSize: 512,
          zoomOffset: -1,
          detectRetina: true,
          updateWhenIdle: true,
          updateInterval: 150,
          className: "rainviewer-tiles",
        });
      }

      const layer = this.leaflet.tileLayer(url, layerOptions);

      layer.on("tileerror", () => this._handleTileError(config));

      overlays[config.label] = layer;
      this.overlayLookup.set(layer, config);
      this.overlayLayerByKey.set(config.key, layer);
      this._updateLegendEntry(config, "available", config.provider || "");
    });

    const hasOverlays = Object.keys(overlays).length > 0;

    if (hasOverlays) {
      if (!this.currentOverlay) {
        this._activateDefaultOverlay(overlays);
      }

      if (!this.overlayEventsBound) {
        this.map.on("overlayadd", (event) =>
          this._handleOverlayAdd(event.layer)
        );
        this.map.on("overlayremove", (event) =>
          this._handleOverlayRemove(event.layer)
        );
        this.overlayEventsBound = true;
      }
    }

    if (this.noticeEl) {
      if (locked.length && pendingRainViewer) {
        this.noticeEl.textContent =
          "RainViewer wird geladen… · OWM-Overlays benötigen einen API-Key.";
      } else if (locked.length) {
        this.noticeEl.textContent =
          "Zusätzliche Overlays benötigen einen OpenWeatherMap API-Key.";
      } else if (pendingRainViewer) {
        this.noticeEl.textContent = "RainViewer Radar wird geladen…";
      } else if (!hasOverlays) {
        this.noticeEl.textContent = "Keine Overlays verfügbar.";
      } else {
        this.noticeEl.textContent = "";
      }
    }

    if (pendingRainViewer) {
      this._ensureRainViewerTiles().then((success) => {
        if (success) {
          this.refreshOverlays();
        } else {
          const suffix = locked.length
            ? " · OWM-Overlays benötigen einen API-Key."
            : "";
          const message = "RainViewer Radar derzeit nicht erreichbar" + suffix;
          if (this.noticeEl) {
            this.noticeEl.textContent = message;
          }
          const radarConfig = this.overlayConfigs.find(
            (entry) => entry.key === "radar"
          );
          if (radarConfig) {
            this._updateLegendEntry(radarConfig, "error", message);
            this._renderOverlayLegend();
            this._syncToolbarAvailability();
          }
        }
      });
    }
  }

  bindToolbar(toolbarSelector) {
    const target =
      typeof toolbarSelector === "string"
        ? document.querySelector(toolbarSelector)
        : toolbarSelector;
    if (!target) return;
    if (this.toolbarEl && this._toolbarHandler) {
      this.toolbarEl.removeEventListener("click", this._toolbarHandler);
    }
    this.toolbarEl = target;
    this.layerContextEl = document.getElementById("map-layer-context");
    this.toolbarEl.innerHTML = this.toolbarConfigs
      .map(
        (config) => `
          <button type="button" class="map-layer-btn" data-layer="${
            config.key
          }" title="${config.label}" aria-label="${
          config.label
        }" aria-pressed="false">
            <span class="map-layer-btn-icon">${config.icon || "•"}</span>
            <span class="map-layer-btn-label">${
              config.shortLabel || config.label
            }</span>
          </button>
        `
      )
      .join("");
    this._toolbarHandler = (event) => {
      const btn = event.target.closest(".map-layer-btn");
      if (!btn) return;
      if (btn.disabled || btn.classList.contains("is-disabled")) return;
      const key = btn.dataset.layer;
      this._handleToolbarSelection(key);
    };
    this.toolbarEl.addEventListener("click", this._toolbarHandler);
    this._syncToolbarAvailability();
    this._updateLayerContext(this.toolbarActiveKey);
  }

  attachInspector(inspector) {
    this.inspector = inspector;
    if (inspector && typeof inspector.bindToMap === "function") {
      inspector.bindToMap(this);
    }
  }

  _handleToolbarSelection(key) {
    const config = this.toolbarConfigs.find((entry) => entry.key === key);
    if (!config) return;
    if (config.overlayKey) {
      this._activateOverlayLayer(config.overlayKey);
    }
    if (config.inspectorMode && this.inspector) {
      this.inspector.setMode(config.inspectorMode);
    }
    this._highlightToolbarSelection(key);
  }

  _activateOverlayLayer(key) {
    if (!this.map) return;
    const targetLayer = this.overlayLayerByKey.get(key);
    if (!targetLayer) {
      this.refreshOverlays();
      return;
    }
    if (
      this.currentOverlay?.layer &&
      this.map.hasLayer(this.currentOverlay.layer) &&
      this.currentOverlay.layer !== targetLayer
    ) {
      this.map.removeLayer(this.currentOverlay.layer);
    }
    if (!this.map.hasLayer(targetLayer)) {
      targetLayer.addTo(this.map);
    }
    const config = this.overlayConfigs.find((entry) => entry.key === key);
    this.currentOverlay = config
      ? Object.assign({ layer: targetLayer }, config)
      : { layer: targetLayer };
    this._highlightToolbarSelectionByOverlay(key);
    this._updateOverlayStatus();
  }

  _highlightToolbarSelection(key) {
    if (!this.toolbarEl) return;
    this.toolbarActiveKey = key;
    this.toolbarEl.querySelectorAll(".map-layer-btn").forEach((btn) => {
      const isActive = Boolean(key) && btn.dataset.layer === key;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    this._updateLayerContext(key);
  }

  _updateLayerContext(key) {
    if (!this.layerContextEl) return;

    if (!key) {
      this.layerContextEl.innerHTML = `
        <div class="map-layer-context-body">
          <div>
            <p class="map-layer-context-eyebrow">Layer auswählen</p>
            <strong>Keine Ebene aktiv</strong>
            <p>Wähle oben eine Kartenebene, um Datenquelle und Anzeigeoptionen zu sehen.</p>
          </div>
          <div class="map-layer-context-meta">
            <span class="map-layer-context-badge" data-state="available">Bereit</span>
          </div>
        </div>
      `;
      return;
    }

    const config = this.toolbarConfigs.find((entry) => entry.key === key);
    if (!config) {
      this._updateLayerContext(null);
      return;
    }

    const overlayKey = config.overlayKey || null;
    const overlayConfig = overlayKey
      ? this.overlayConfigs.find((entry) => entry.key === overlayKey)
      : null;
    const legendInfo = overlayKey ? this.legendItems.get(overlayKey) : null;
    const provider =
      config.provider ||
      overlayConfig?.provider ||
      legendInfo?.provider ||
      (overlayKey ? "OpenWeatherMap" : "Calchas Inspector");
    const state = legendInfo?.state || (overlayKey ? "available" : "inspector");
    const badgeState =
      this.currentOverlay?.key === overlayKey ? "active" : state;
    const statusLabelMap = {
      active: "Aktiv auf Karte",
      available: "Bereit",
      loading: "Lädt",
      locked: "API-Key nötig",
      error: "Fehler",
      warning: "Warnung",
      inspector: "Inspector",
    };
    const description =
      config.description ||
      overlayConfig?.description ||
      (overlayKey
        ? "Overlay steht bereit."
        : "Inspector blendet Details in der rechten Spalte ein.");
    const detailText =
      legendInfo?.detail || (overlayKey ? "" : "Inspector aktiv");

    this.layerContextEl.innerHTML = `
      <div class="map-layer-context-body">
        <div>
          <p class="map-layer-context-eyebrow">${provider}</p>
          <strong>${config.label}</strong>
          <p>${description}</p>
        </div>
        <div class="map-layer-context-meta">
          <span class="map-layer-context-badge" data-state="${badgeState}">
            ${statusLabelMap[badgeState] || "Bereit"}
          </span>
          ${detailText ? `<small>${detailText}</small>` : ""}
        </div>
      </div>
    `;
  }

  _highlightToolbarSelectionByOverlay(overlayKey) {
    const toolbarEntry = this.toolbarConfigs.find(
      (entry) => entry.overlayKey === overlayKey
    );
    if (toolbarEntry) {
      this._highlightToolbarSelection(toolbarEntry.key);
    }
  }

  refreshOverlays() {
    if (!this.map) return;

    if (this.layerControl) {
      this.layerControl.remove();
      this.layerControl = null;
    }

    if (this.overlayLookup.size) {
      this.overlayLookup.forEach((_, layer) => {
        if (this.map.hasLayer(layer)) {
          this.map.removeLayer(layer);
        }
      });
      this.overlayLookup.clear();
    }

    if (
      this.currentOverlay?.layer &&
      this.map.hasLayer(this.currentOverlay.layer)
    ) {
      this.map.removeLayer(this.currentOverlay.layer);
    }
    this.currentOverlay = null;

    this._buildOverlayLayers();
    this._updateOverlayStatus();
  }

  _ensureRainViewerTiles() {
    const stillFresh =
      this._getActiveRainViewerTileUrl() &&
      Date.now() - this.rainViewerFetchedAt < 5 * 60 * 1000;
    if (stillFresh) {
      return Promise.resolve(true);
    }

    if (this.rainViewerPromise) {
      return this.rainViewerPromise;
    }

    this.rainViewerLoading = true;
    this.rainViewerError = null;
    this._renderRadarControls();

    const requestInit = /** @type {RequestInit} */ ({
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      mode: "cors",
    });

    const withCacheBust = (url) => {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}ts=${Date.now()}`;
    };

    const fetchJson = (url, label) =>
      fetch(withCacheBust(url), requestInit).then((response) => {
        if (!response.ok) {
          throw new Error(`${label} (${response.status})`);
        }
        return response.json();
      });

    const primaryUrl = "https://api.rainviewer.com/public/weather-maps.json";
    const legacyUrl = "https://tilecache.rainviewer.com/api/maps.json";
    const proxyUrlIso = `https://cors.isomorphic-git.org/${primaryUrl}`;
    const proxyUrlAllOrigins =
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(primaryUrl);

    const processPayload = (payload, mode) => {
      if (mode === "legacy") {
        payload = this._coerceLegacyRainViewerPayload(payload);
      }
      if (!payload?.radar) {
        throw new Error(`RainViewer ${mode} ohne Radar-Daten`);
      }
      this._ingestRainViewerPayload(payload);
      this.rainViewerError =
        mode === "legacy"
          ? "RainViewer liefert nur Rückblick-Frames (Legacy-API)."
          : null;
      if (mode === "legacy" && this.noticeEl) {
        this.noticeEl.textContent =
          "RainViewer Legacy-Modus: Nur Rückblick-Frames verfügbar.";
      }
      this.rainViewerLoading = false;
      this._renderRadarControls();
      return true;
    };

    const attemptSequence = async () => {
      const targets = [
        { url: primaryUrl, label: "RainViewer v2", mode: "primary" },
        { url: legacyUrl, label: "RainViewer legacy", mode: "legacy" },
        {
          url: proxyUrlIso,
          label: "RainViewer Proxy (isomorphic-git)",
          mode: "primary",
        },
        {
          url: proxyUrlAllOrigins,
          label: "RainViewer Proxy (allorigins)",
          mode: "primary",
        },
      ];

      let lastError = null;
      for (const target of targets) {
        try {
          const payload = await fetchJson(target.url, target.label);
          return processPayload(payload, target.mode);
        } catch (error) {
          lastError = error;
          console.warn(`${target.label} fehlgeschlagen`, error);
        }
      }
      throw lastError || new Error("RainViewer API nicht erreichbar");
    };

    this.rainViewerPromise = attemptSequence()
      .then((success) => {
        if (success) {
          this.refreshOverlays();
        }
        return success;
      })
      .catch((err) => {
        console.warn("RainViewer Frames nicht verfügbar", err);
        this.rainViewerTileUrl = null;
        this.rainViewerFrames = { past: [], nowcast: [] };
        this.rainViewerLoading = false;
        this.rainViewerError =
          "RainViewer konnte keine Radar-Daten liefern. Bitte später erneut versuchen.";
        this._stopRainViewerPlayback({ silent: true });
        this._renderRadarControls();
        this._handleRadarUnavailable(this.rainViewerError);
        return false;
      })
      .finally(() => {
        this.rainViewerPromise = null;
      });

    return this.rainViewerPromise;
  }

  _handleOverlayAdd(layer) {
    const config = this.overlayLookup.get(layer);
    this.currentOverlay = config ? Object.assign({ layer }, config) : null;
    if (config?.key) {
      this._highlightToolbarSelectionByOverlay(config.key);
    }
    this._updateOverlayStatus();
    this._renderOverlayLegend();
    this._renderRadarControls();
  }

  _handleOverlayRemove(layer) {
    if (this.currentOverlay && layer === this.currentOverlay.layer) {
      this.currentOverlay = null;
    }
    if (this.toolbarActiveKey) {
      this._highlightToolbarSelection(null);
    }
    this._updateOverlayStatus();
    this._renderOverlayLegend();
    this._renderRadarControls();
  }

  _ensureOverlayStatus() {
    if (this.statusEl) return;
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const pill = document.createElement("div");
    pill.className = "map-overlay-pill";
    pill.textContent = "Karte: Standard (OSM)";
    container.appendChild(pill);
    this.statusEl = pill;
  }

  _injectOverlayNotice(container) {
    if (this.noticeEl) return;
    const notice = document.createElement("div");
    notice.className = "map-overlay-notice";
    container.appendChild(notice);
    this.noticeEl = notice;
  }

  _announceNotice(message) {
    if (!this.noticeEl || !message) return;
    this.noticeEl.textContent = message;
  }

  _ensureRadarControlsTarget() {
    if (this.radarControlsEl) return;
    const target = document.getElementById("map-radar-controls");
    if (!target) return;
    this.radarControlsEl = target;
    this._renderRadarControls();
    this._bindRadarControlEvents();
  }

  _bindQuickActions() {
    if (this._quickActionHandler) return;
    const target = document.getElementById("map-quick-actions");
    if (!target) return;
    this.quickActionsEl = target;
    this._quickActionHandler = (event) => {
      const btn = event.target.closest("[data-map-action]");
      if (!btn) return;
      event.preventDefault();
      const action = btn.getAttribute("data-map-action");
      this._handleQuickAction(action);
    };
    target.addEventListener("click", this._quickActionHandler);
  }

  _handleQuickAction(action) {
    if (!action || !this.map) return;
    switch (action) {
      case "locate": {
        if (this.marker) {
          const latLng = this.marker.getLatLng();
          const zoom = Math.max(this.map.getZoom() || 0, 10);
          this.map.flyTo(latLng, zoom, { duration: 0.65 });
          this.marker.openPopup();
        }
        const geoStarted = this._locateUserPosition();
        if (!geoStarted && !this.marker) {
          this._announceNotice("Kein gespeicherter Standort zum Zentrieren.");
        }
        break;
      }
      case "radar": {
        this._handleToolbarSelection("radar");
        if (!this._getActiveRainViewerFrames().length) {
          this._ensureRainViewerTiles();
        }
        break;
      }
      case "refresh": {
        if (this.noticeEl) {
          this.noticeEl.textContent = "Overlays werden aktualisiert…";
        }
        this.refreshOverlays();
        break;
      }
      case "inspector": {
        this._focusInspectorPanel();
        break;
      }
      default:
        break;
    }
  }

  _locateUserPosition() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      this._announceNotice(
        "Geolokalisierung wird von diesem Gerät nicht unterstützt."
      );
      return false;
    }

    this._announceNotice("Bestimme aktuellen Standort…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const zoom = Math.max(this.map?.getZoom() || 0, 11);
        this._setMarker(latitude, longitude, "Aktueller Standort");
        this.map?.flyTo([latitude, longitude], zoom, { duration: 0.8 });
        this.marker?.openPopup();
        this._announceNotice("Standort gefunden – lade Wetterdaten…");
        this._syncWeatherWithGeolocation(latitude, longitude);
      },
      (error) => {
        console.warn("Geolokalisierung fehlgeschlagen", error);
        const reason =
          error?.message || "Standort konnte nicht ermittelt werden.";
        this._announceNotice(reason);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 120000,
      }
    );
    return true;
  }

  async _syncWeatherWithGeolocation(lat, lon) {
    try {
      const url =
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=" +
        encodeURIComponent(lat) +
        "&lon=" +
        encodeURIComponent(lon);
      const response = await fetch(url, {
        headers: { "Accept-Language": "de" },
      });
      if (!response.ok) {
        throw new Error(
          `Reverse-Geocoding fehlgeschlagen (${response.status})`
        );
      }
      const payload = await response.json();
      const resolvedCity =
        payload?.address?.city ||
        payload?.address?.town ||
        payload?.address?.village ||
        payload?.address?.county ||
        "Aktueller Standort";
      this._setMarker(lat, lon, resolvedCity);
      const input = /** @type {HTMLInputElement | null} */ (
        document.getElementById("cityInput")
      );
      if (input) {
        input.value = resolvedCity;
      }
      const win = getAugmentedWindow();
      if (typeof win?.loadWeather === "function") {
        win.loadWeather(resolvedCity);
      }
      this._announceNotice(`Standort ${resolvedCity} geladen.`);
    } catch (error) {
      console.warn("Reverse-Geocoding nicht möglich", error);
      this._announceNotice("Standort gefunden – bitte Ort manuell bestätigen.");
    }
  }

  _focusInspectorPanel() {
    const inspector = document.getElementById("map-inspector");
    if (!inspector) return;
    if (!inspector.hasAttribute("tabindex")) {
      inspector.setAttribute("tabindex", "-1");
    }
    inspector.focus({ preventScroll: false });
    inspector.addEventListener(
      "blur",
      () => {
        if (inspector.getAttribute("tabindex") === "-1") {
          inspector.removeAttribute("tabindex");
        }
      },
      { once: true }
    );
  }

  _bindRadarControlEvents() {
    if (!this.radarControlsEl || this._radarControlHandler) return;
    this._radarControlHandler = (event) => this._handleRadarControlClick(event);
    this._radarTimelineHandler = (event) =>
      this._handleRadarTimelinePointer(event);
    this.radarControlsEl.addEventListener("click", this._radarControlHandler);
    this.radarControlsEl.addEventListener(
      "pointerdown",
      this._radarTimelineHandler
    );
  }

  _renderRadarControls() {
    if (!this.radarControlsEl) return;

    if (this.rainViewerLoading) {
      this.radarControlsEl.innerHTML =
        '<div class="map-radar-empty">RainViewer wird geladen…</div>';
      return;
    }

    const pastFrames = this.rainViewerFrames?.past || [];
    const nowcastFrames = this.rainViewerFrames?.nowcast || [];
    const satelliteFrames = this.rainViewerSatelliteFrames || [];
    let activeFrames = this._getActiveRainViewerFrames();
    if (!activeFrames.length) {
      if (pastFrames.length && this.rainViewerMode !== "past") {
        this.rainViewerMode = "past";
        activeFrames = this._getActiveRainViewerFrames();
      } else if (nowcastFrames.length && this.rainViewerMode !== "nowcast") {
        this.rainViewerMode = "nowcast";
        activeFrames = this._getActiveRainViewerFrames();
      } else if (satelliteFrames.length && this.rainViewerMode !== "infrared") {
        this.rainViewerMode = "infrared";
        activeFrames = this._getActiveRainViewerFrames();
      }
    }

    if (!activeFrames.length) {
      this._stopRainViewerPlayback({ silent: true });
      const reason = this.rainViewerError
        ? `<p class="map-radar-hint">${this.rainViewerError}</p>`
        : "";
      this.radarControlsEl.innerHTML =
        '<div class="map-radar-empty">Keine Radar-Daten verfügbar.</div>' +
        reason;
      return;
    }

    this.rainViewerFrameIndex = Math.min(
      Math.max(this.rainViewerFrameIndex, 0),
      activeFrames.length - 1
    );

    const activeFrame = this._getActiveRainViewerFrame();
    const label = this._formatRadarFrameLabel(activeFrame);
    const context = this._formatRadarFrameContext(activeFrame);
    const progress =
      activeFrames.length > 1
        ? (this.rainViewerFrameIndex / (activeFrames.length - 1)) * 100
        : 0;
    const overlayActive = this.currentOverlay?.key === "radar";
    const playing = this.rainViewerIsPlaying;
    const disableClass = activeFrames.length ? "" : "is-disabled";
    const disableAttr = activeFrames.length ? "" : "disabled";

    const modeButton = (mode, text, available) => {
      const classes = [
        "map-radar-mode-btn",
        this.rainViewerMode === mode ? "is-active" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const disabled = available ? "" : "disabled";
      return `<button type="button" class="${classes}" data-radar-mode="${mode}" ${disabled}>${text}</button>`;
    };

    this.radarControlsEl.innerHTML = `
      <div class="map-radar-primary">
        <div class="map-radar-mode" role="group" aria-label="Radar-Zeitraum">
          ${modeButton("past", "Rückblick", pastFrames.length)}
          ${modeButton("nowcast", "Vorhersage", nowcastFrames.length)}
          ${modeButton("infrared", "Satellit", satelliteFrames.length)}
        </div>
        <div class="map-radar-playback" role="group" aria-label="Radar-Steuerung">
          <button type="button" class="map-radar-btn ${disableClass}" ${disableAttr}
            data-radar-action="prev" aria-label="Vorheriger Frame">⏮</button>
          <button type="button" class="map-radar-btn ${disableClass}" ${disableAttr}
            data-radar-action="play" aria-label="Animation starten" ${
              playing ? "hidden" : ""
            }>▶</button>
          <button type="button" class="map-radar-btn ${disableClass}" ${disableAttr}
            data-radar-action="pause" aria-label="Animation stoppen" ${
              playing ? "" : "hidden"
            }>⏸</button>
          <button type="button" class="map-radar-btn ${disableClass}" ${disableAttr}
            data-radar-action="next" aria-label="Nächster Frame">⏭</button>
        </div>
      </div>
      <div class="map-radar-timeline" role="group" aria-label="Radar-Timeline">
        <span class="map-radar-timeline-label">${label}</span>
        <div class="map-radar-timeline-track" data-radar-track="true" ${
          activeFrames.length ? "" : 'data-disabled="true"'
        }>
          <div class="map-radar-timeline-fill" style="width:${progress}%"></div>
          <div class="map-radar-timeline-thumb" style="left:${progress}%"></div>
        </div>
      </div>
      <div class="map-radar-meta">
        <span>${context}</span>
        <span>${activeFrames.length} Frames</span>
      </div>
      ${
        overlayActive
          ? ""
          : '<p class="map-radar-hint">Radar/Satellit-Overlay in der Toolbar aktivieren, um es auf der Karte einzublenden.</p>'
      }
    `;
  }

  _handleRadarUnavailable(message) {
    if (this.noticeEl) {
      this.noticeEl.textContent = message || "RainViewer nicht verfügbar.";
    }
    const radarConfig = this.overlayConfigs.find(
      (entry) => entry.key === "radar"
    );
    if (radarConfig) {
      this._updateLegendEntry(radarConfig, "warning", message);
      this._renderOverlayLegend();
      this._syncToolbarAvailability();
    }
    this._useRainViewerFallback(message);
  }

  _useRainViewerFallback(message) {
    const fallbackUrl =
      "https://tilecache.rainviewer.com/v2/radar/nowcast_0/512/{z}/{x}/{y}/2/1_1.png";
    this.rainViewerFallbackActive = true;
    this.rainViewerTileUrl = fallbackUrl;
    this.rainViewerError =
      message || "RainViewer liefert derzeit nur statische Radar-Kacheln.";
    if (this.currentOverlay?.key === "radar" && this.currentOverlay.layer) {
      this.currentOverlay.layer.setUrl(fallbackUrl);
    }
    if (!this.overlayLayerByKey.has("radar")) {
      this.refreshOverlays();
    }
    const radarConfig = this.overlayConfigs.find(
      (entry) => entry.key === "radar"
    );
    if (radarConfig) {
      this._updateLegendEntry(
        radarConfig,
        "warning",
        message || "RainViewer Fallback (statische Tiles)"
      );
      this._renderOverlayLegend();
      this._syncToolbarAvailability();
    }
    this._renderRadarControls();
  }

  _handleRadarControlClick(event) {
    const modeBtn = event.target.closest("[data-radar-mode]");
    if (modeBtn) {
      if (modeBtn.disabled) return;
      const mode = modeBtn.getAttribute("data-radar-mode");
      this._handleRadarModeSwitch(mode);
      return;
    }

    const actionBtn = event.target.closest("[data-radar-action]");
    if (actionBtn) {
      if (actionBtn.disabled || actionBtn.classList.contains("is-disabled")) {
        return;
      }
      const action = actionBtn.getAttribute("data-radar-action");
      this._handleRadarAction(action);
    }
  }

  _handleRadarTimelinePointer(event) {
    const track = event.target.closest("[data-radar-track]");
    if (!track || track.getAttribute("data-disabled") === "true") {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    event.preventDefault();
    const rect = track.getBoundingClientRect();
    if (!rect.width) return;
    const percent = (event.clientX - rect.left) / rect.width;
    this._scrubRainViewerTimeline(percent);
  }

  _handleRadarModeSwitch(mode) {
    if (!mode || mode === this.rainViewerMode) return;
    this.rainViewerMode = mode;
    const frames = this._getActiveRainViewerFrames();
    if (!frames.length) {
      this._renderRadarControls();
      return;
    }
    this.rainViewerFrameIndex = Math.max(frames.length - 1, 0);
    this._applyRainViewerFrameChange();
  }

  _handleRadarAction(action) {
    switch (action) {
      case "prev":
        this._stepRainViewerFrame(-1);
        break;
      case "next":
        this._stepRainViewerFrame(1);
        break;
      case "play":
        this._startRainViewerPlayback();
        break;
      case "pause":
        this._stopRainViewerPlayback();
        break;
      default:
        break;
    }
  }

  _scrubRainViewerTimeline(percent) {
    const frames = this._getActiveRainViewerFrames();
    if (!frames.length) return;
    const clamped = Math.min(Math.max(percent, 0), 1);
    const index = Math.round(clamped * (frames.length - 1));
    this._setRainViewerFrame(index);
  }

  _stepRainViewerFrame(delta) {
    const frames = this._getActiveRainViewerFrames();
    if (!frames.length) return;
    const length = frames.length;
    const nextIndex =
      (((this.rainViewerFrameIndex + delta) % length) + length) % length;
    this._setRainViewerFrame(nextIndex);
  }

  _setRainViewerFrame(index) {
    const frames = this._getActiveRainViewerFrames();
    if (!frames.length) return;
    const length = frames.length;
    const clamped = Math.min(Math.max(index, 0), length - 1);
    this.rainViewerFrameIndex = clamped;
    this._applyRainViewerFrameChange();
  }

  _startRainViewerPlayback() {
    if (this.rainViewerIsPlaying) return;
    if (!this._getActiveRainViewerFrames().length) return;
    this.rainViewerIsPlaying = true;
    if (this.rainViewerPlaybackHandle) {
      clearInterval(this.rainViewerPlaybackHandle);
    }
    this.rainViewerPlaybackHandle = setInterval(() => {
      this._stepRainViewerFrame(1);
    }, 900);
    this._renderRadarControls();
  }

  _stopRainViewerPlayback(options = {}) {
    const silent = Boolean(options.silent);
    if (this.rainViewerPlaybackHandle) {
      clearInterval(this.rainViewerPlaybackHandle);
      this.rainViewerPlaybackHandle = null;
    }
    if (!this.rainViewerIsPlaying) {
      this.rainViewerIsPlaying = false;
      return;
    }
    this.rainViewerIsPlaying = false;
    if (!silent) {
      this._renderRadarControls();
    }
  }

  _applyRainViewerFrameChange() {
    const url = this._getActiveRainViewerTileUrl();
    if (!url) {
      this._renderRadarControls();
      return;
    }
    this.rainViewerTileUrl = url;
    const layer = this.overlayLayerByKey.get("radar");
    if (layer && typeof layer.setUrl === "function") {
      layer.setUrl(url);
    }
    this._renderRadarControls();
  }

  _getActiveRainViewerFrames(mode = this.rainViewerMode) {
    if (!this.rainViewerFrames) return [];
    if (mode === "infrared") {
      return this.rainViewerSatelliteFrames || [];
    }
    return this.rainViewerFrames[mode] || [];
  }

  _getActiveRainViewerFrame() {
    const frames = this._getActiveRainViewerFrames();
    if (!frames.length) return null;
    const index = Math.min(
      Math.max(this.rainViewerFrameIndex, 0),
      frames.length - 1
    );
    return frames[index];
  }

  _getActiveRainViewerTileUrl() {
    const frame = this._getActiveRainViewerFrame();
    if (frame) {
      return this._buildRainViewerTileUrl(frame);
    }
    if (this.rainViewerFallbackActive && this.rainViewerTileUrl) {
      return this.rainViewerTileUrl;
    }
    return null;
  }

  _buildRainViewerTileUrl(frame) {
    if (!frame?.path) return null;
    const host = this.rainViewerHost || "https://tilecache.rainviewer.com";
    const tileSize = frame.type === "infrared" ? "256" : "512";
    const renderParams = frame.type === "infrared" ? "0/0_0" : "2/1_1";
    if (frame.path.startsWith("http")) {
      if (frame.path.includes("{z}")) {
        return frame.path;
      }
      return `${frame.path}/${tileSize}/{z}/{x}/{y}/${renderParams}.png`;
    }
    const normalized = frame.path.startsWith("/")
      ? frame.path
      : `/${frame.path}`;
    const base = `${host}${normalized}`;
    if (base.includes("{z}")) {
      return base;
    }
    return `${base}/${tileSize}/{z}/{x}/{y}/${renderParams}.png`;
  }

  _formatRadarFrameLabel(frame) {
    if (!frame?.time) return "–";
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return formatter.format(new Date(frame.time));
  }

  _formatRadarFrameContext(frame) {
    if (!frame?.time) return "Keine Daten";
    const modeLabel =
      frame.type === "past"
        ? "Rückblick"
        : frame.type === "infrared"
        ? "Satellit"
        : "Vorhersage";
    const diffMinutes = Math.round((frame.time - Date.now()) / 60000);
    let relative = "jetzt";
    if (diffMinutes > 0) {
      relative = `+${diffMinutes} min`;
    } else if (diffMinutes < 0) {
      relative = `${diffMinutes} min`;
    }
    return `${modeLabel} · ${relative}`;
  }

  _normalizeRainViewerFrames(frames, type) {
    if (!Array.isArray(frames)) return [];
    return frames
      .filter((frame) => frame && frame.path)
      .map((frame) => ({
        id: `${type}-${frame.time || frame.path}`,
        path: frame.path,
        time: (frame.time || 0) * 1000,
        type,
      }));
  }

  _ingestRainViewerPayload(payload) {
    const past = this._normalizeRainViewerFrames(payload?.radar?.past, "past");
    const nowcast = this._normalizeRainViewerFrames(
      payload?.radar?.nowcast,
      "nowcast"
    );
    const satellite = this._normalizeRainViewerFrames(
      payload?.satellite?.infrared,
      "infrared"
    );
    if (!past.length && !nowcast.length && !satellite.length) {
      throw new Error("Kein Radar-Frame verfügbar");
    }
    this.rainViewerHost = payload?.host || this.rainViewerHost;
    this.rainViewerFrames = { past, nowcast };
    this.rainViewerSatelliteFrames = satellite;
    this.rainViewerFallbackActive = false;
    const currentFrames = this._getActiveRainViewerFrames(this.rainViewerMode);
    if (!this.rainViewerMode || !currentFrames.length) {
      if (nowcast.length) {
        this.rainViewerMode = "nowcast";
      } else if (past.length) {
        this.rainViewerMode = "past";
      } else if (satellite.length) {
        this.rainViewerMode = "infrared";
      }
    }
    const activeFrames = this._getActiveRainViewerFrames();
    this.rainViewerFrameIndex = activeFrames.length
      ? Math.max(activeFrames.length - 1, 0)
      : 0;
    this.rainViewerTileUrl = this._getActiveRainViewerTileUrl();
    this.rainViewerFetchedAt = Date.now();
    this.rainViewerError = null;
    if (this.noticeEl) {
      const latest = this._getActiveRainViewerFrame();
      const label = latest ? this._formatRadarFrameLabel(latest) : "";
      this.noticeEl.textContent = label
        ? `RainViewer aktualisiert ${label}`
        : "RainViewer aktiv";
    }
  }

  _coerceLegacyRainViewerPayload(raw) {
    if (!Array.isArray(raw) || !raw.length) {
      return null;
    }
    const frames = raw
      .map((value) => Number(value))
      .filter((time) => Number.isFinite(time))
      .map((time) => ({
        time,
        path: `/v2/radar/${time}`,
      }));
    if (!frames.length) {
      return null;
    }
    return {
      host: "https://tilecache.rainviewer.com",
      radar: {
        past: frames,
        nowcast: [],
      },
    };
  }

  _ensureLegendTarget() {
    if (this.legendEl) return;
    this.legendEl = document.getElementById("map-overlay-legend");
  }

  _updateLegendEntry(config, state, detail) {
    if (!config?.key) return;
    this.legendItems.set(config.key, {
      key: config.key,
      label: config.label,
      provider: config.provider,
      state: state || "available",
      detail: detail || config.provider || "",
    });
  }

  _renderOverlayLegend() {
    if (!this.legendEl) return;
    const chunks = [];
    this.legendOrder.forEach((key) => {
      const info = this.legendItems.get(key);
      if (!info) return;
      const isActive = this.currentOverlay?.key === key;
      const badgeState = isActive ? "active" : info.state || "available";
      const detailText = info.detail || info.provider || "";
      const badgeLabel = {
        active: "Aktiv",
        available: "Bereit",
        loading: "Lädt",
        locked: "Gesperrt",
        error: "Fehler",
        warning: "Warnung",
      }[badgeState];

      chunks.push(`
        <div class="map-overlay-legend-item" data-layer="${key}">
          <div>
            <strong>${info.label}</strong>
            ${detailText ? `<small>${detailText}</small>` : ""}
          </div>
          <span class="map-overlay-badge" data-state="${badgeState}">
            ${badgeLabel || "Status"}
          </span>
        </div>
      `);
    });

    if (!chunks.length) {
      this.legendEl.innerHTML =
        '<div class="map-overlay-legend-item"><strong>Keine Overlays geladen</strong></div>';
    } else {
      this.legendEl.innerHTML = chunks.join("\n");
    }

    this._updateLayerContext(this.toolbarActiveKey);
  }

  _syncToolbarAvailability() {
    if (!this.toolbarEl) return;
    const overlayStates = new Map();
    this.legendItems.forEach((info, key) => overlayStates.set(key, info.state));

    this.toolbarConfigs.forEach((config) => {
      const btn = this.toolbarEl.querySelector(
        `.map-layer-btn[data-layer="${config.key}"]`
      );
      if (!btn) return;
      if (!config.overlayKey) {
        btn.disabled = false;
        btn.classList.remove("is-disabled");
        return;
      }
      const state = overlayStates.get(config.overlayKey) || "available";
      const blocked = ["locked", "loading", "error"].includes(state);
      btn.disabled = blocked;
      btn.classList.toggle("is-disabled", blocked);
      if (blocked && this.toolbarActiveKey === config.key) {
        this._highlightToolbarSelection(null);
      }
    });

    this._updateLayerContext(this.toolbarActiveKey);
  }

  _updateOverlayStatus() {
    if (!this.statusEl) return;
    if (this.currentOverlay) {
      const label = this.currentOverlay.label;
      const provider = this.currentOverlay.provider;
      let statusText = `Overlay: ${label} - Quelle: ${provider}`;
      if (this.currentOverlay.key === "radar") {
        const frame = this._getActiveRainViewerFrame();
        const timestamp = frame ? this._formatRadarFrameLabel(frame) : null;
        if (timestamp) {
          statusText += ` · ${timestamp}`;
        }
      }
      this.statusEl.textContent = statusText;
      this.statusEl.classList.remove("pill-neutral");
    } else {
      this.statusEl.textContent = "Karte: Standard (OSM)";
      this.statusEl.classList.add("pill-neutral");
    }

    this._updateLayerContext(this.toolbarActiveKey);
  }

  _activateDefaultOverlay(overlays) {
    if (!this.map) return;
    const entries = Object.entries(overlays);
    if (!entries.length) return;
    const preferred = entries.find(([label]) =>
      label.toLowerCase().includes("radar")
    );
    const [, layer] = preferred || entries[0];
    if (layer && !this.map.hasLayer(layer)) {
      layer.addTo(this.map);
      const config = this.overlayLookup.get(layer);
      this.currentOverlay = config ? Object.assign({ layer }, config) : null;
      this._updateOverlayStatus();
    }
  }

  _handleTileError(config) {
    let message = "";
    if (config.requiresKey) {
      message =
        "OpenWeatherMap Overlays konnten nicht geladen werden – bitte API-Key pruefen.";
      const win = getAugmentedWindow();
      if (win?.updateApiStatusEntry) {
        win.updateApiStatusEntry("openweathermap", {
          state: "invalid-key",
          message: "Overlay konnte nicht geladen werden",
          detail: "OpenWeatherMap meldete einen Fehler beim Laden der Tiles.",
        });
      }
    } else {
      message = `${config.label} ist aktuell nicht verfuegbar.`;
    }
    if (this.noticeEl) {
      this.noticeEl.textContent = message;
    }
    this._updateLegendEntry(config, "error", message);
    this._renderOverlayLegend();
    this._syncToolbarAvailability();
  }

  destroy() {
    if (this.layerControl) {
      this.layerControl.remove();
      this.layerControl = null;
    }

    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
    }

    this.marker = null;
    this.overlayLookup.clear();
    this.overlayLayerByKey.clear();
    this.currentOverlay = null;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this._unbindViewportListeners();

    if (this._visibilityRetry) {
      clearTimeout(this._visibilityRetry);
      this._visibilityRetry = null;
    }

    if (this._invalidateHandle) {
      const caf =
        (typeof window !== "undefined" && window.cancelAnimationFrame) ||
        clearTimeout;
      caf(this._invalidateHandle);
      this._invalidateHandle = null;
    }

    this._stopRainViewerPlayback({ silent: true });
    if (this.radarControlsEl && this._radarControlHandler) {
      this.radarControlsEl.removeEventListener(
        "click",
        this._radarControlHandler
      );
      this._radarControlHandler = null;
    }
    if (this.radarControlsEl && this._radarTimelineHandler) {
      this.radarControlsEl.removeEventListener(
        "pointerdown",
        this._radarTimelineHandler
      );
      this._radarTimelineHandler = null;
    }
    if (this.quickActionsEl && this._quickActionHandler) {
      this.quickActionsEl.removeEventListener(
        "click",
        this._quickActionHandler
      );
      this._quickActionHandler = null;
    }
  }

  _observeContainer(container) {
    if (!container || typeof ResizeObserver === "undefined") return;
    if (this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => this.ensureVisibility());
    this.resizeObserver.observe(container);
  }

  _bindViewportListeners() {
    if (typeof window === "undefined" || this._viewportHandlers) return;
    const resizeHandler = () => this.ensureVisibility();
    const orientationHandler = () => this.ensureVisibility();
    const visibilityHandler = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        this.ensureVisibility();
      }
    };

    window.addEventListener("resize", resizeHandler);
    window.addEventListener("orientationchange", orientationHandler);
    document.addEventListener("visibilitychange", visibilityHandler);

    this._viewportHandlers = {
      resizeHandler,
      orientationHandler,
      visibilityHandler,
    };
  }

  _unbindViewportListeners() {
    if (!this._viewportHandlers || typeof window === "undefined") return;
    const { resizeHandler, orientationHandler, visibilityHandler } =
      this._viewportHandlers;
    window.removeEventListener("resize", resizeHandler);
    window.removeEventListener("orientationchange", orientationHandler);
    document.removeEventListener("visibilitychange", visibilityHandler);
    this._viewportHandlers = null;
  }

  ensureVisibility() {
    if (!this.map) return;
    const container = document.getElementById(this.containerId);
    if (!container) return;

    if (this._visibilityRetry) {
      clearTimeout(this._visibilityRetry);
      this._visibilityRetry = null;
    }

    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      this._visibilityRetry = setTimeout(() => this.ensureVisibility(), 140);
      return;
    }

    const raf =
      (typeof window !== "undefined" && window.requestAnimationFrame) ||
      ((cb) => setTimeout(cb, 16));
    const caf =
      (typeof window !== "undefined" && window.cancelAnimationFrame) ||
      clearTimeout;

    if (this._invalidateHandle) {
      caf(this._invalidateHandle);
      this._invalidateHandle = null;
    }

    this._invalidateHandle = raf(() => {
      try {
        this.map.invalidateSize();
      } finally {
        this._invalidateHandle = null;
      }
    });
  }
}

class MapDataInspector {
  constructor(outputId) {
    this.outputId = outputId;
    this.outputEl = null;
    this.currentMode = "temperature";
    this.cache = new Map();
    this.hoverTimer = null;
    this.latestData = null;
    this.weatherMap = null;
    this._mousemoveHandler = null;
    this._mouseoutHandler = null;
    this.pointer = null;
    this.pointerKey = null;
    this.latestKey = null;
    this.loadingKey = null;
    this.loading = false;
    this.tooltipEl = null;
    this.mapContainer = null;
  }

  bindToMap(weatherMap) {
    this.weatherMap = weatherMap;
    this.outputEl = document.getElementById(this.outputId);
    if (!weatherMap?.map) return;
    if (this._mousemoveHandler) {
      weatherMap.map.off("mousemove", this._mousemoveHandler);
    }
    if (this._mouseoutHandler) {
      weatherMap.map.off("mouseout", this._mouseoutHandler);
    }
    this._mousemoveHandler = (event) => this._handlePointer(event.latlng);
    this._mouseoutHandler = () => this._handlePointer(null);
    weatherMap.map.on("mousemove", this._mousemoveHandler);
    weatherMap.map.on("mouseout", this._mouseoutHandler);
    this._ensureTooltipContainer();
    this._render();
  }

  _ensureTooltipContainer() {
    if (this.tooltipEl || !this.weatherMap?.map) return;
    const container = this.weatherMap.map.getContainer();
    if (!container) return;
    container.classList.add("weather-map-container");
    this.mapContainer = container;
    const tooltip = document.createElement("div");
    tooltip.className = "map-hover-tooltip is-hidden";
    tooltip.setAttribute("role", "status");
    container.appendChild(tooltip);
    this.tooltipEl = tooltip;
  }

  setMode(mode) {
    if (mode) {
      this.currentMode = mode;
      this._render();
    }
  }

  _handlePointer(latlng) {
    if (!latlng) {
      this.pointer = null;
      this.pointerKey = null;
      this.loadingKey = null;
      this.loading = false;
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
      this._renderTooltip();
      return;
    }
    this.pointer = latlng;
    this.pointerKey = this._buildCacheKey(latlng);
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }
    this.loading = true;
    this.loadingKey = this.pointerKey;
    this._renderTooltip();
    this.hoverTimer = setTimeout(() => this._fetchData(latlng), 180);
  }

  _buildCacheKey(latlng) {
    if (!latlng) return null;
    return `${latlng.lat.toFixed(2)},${latlng.lng.toFixed(2)}`;
  }

  async _fetchData(latlng) {
    const lat = latlng.lat;
    const lon = latlng.lng;
    const roundedLat = lat.toFixed(2);
    const roundedLon = lon.toFixed(2);
    const cacheKey = this._buildCacheKey(latlng);
    if (!cacheKey) return;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      this.latestData = cached.data;
      this.latestKey = cacheKey;
      this.loading = false;
      this.loadingKey = null;
      this._render();
      return;
    }
    this.loading = true;
    this.loadingKey = cacheKey;
    this._renderTooltip();
    try {
      const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
      weatherUrl.search = new URLSearchParams({
        latitude: roundedLat,
        longitude: roundedLon,
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,visibility,is_day,pressure_msl,dew_point_2m",
        hourly: "snowfall,precipitation_probability,uv_index",
        timezone: "auto",
      }).toString();
      const airUrl = new URL(
        "https://air-quality-api.open-meteo.com/v1/air-quality"
      );
      airUrl.search = new URLSearchParams({
        latitude: roundedLat,
        longitude: roundedLon,
        hourly: "pm10,pm2_5,european_aqi",
        timezone: "auto",
      }).toString();

      const [weatherRes, airRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(airUrl),
      ]);
      const weather = weatherRes.ok ? await weatherRes.json() : null;
      const air = airRes.ok ? await airRes.json() : null;
      const normalized = this._normalizeData(
        weather,
        air,
        roundedLat,
        roundedLon
      );
      this.cache.set(cacheKey, {
        data: normalized,
        timestamp: Date.now(),
      });

      if (this.pointerKey && this.pointerKey !== cacheKey) {
        if (this.loadingKey === cacheKey) {
          this.loading = false;
          this.loadingKey = null;
          this._renderTooltip();
        }
        return;
      }

      this.latestData = normalized;
      this.latestKey = cacheKey;
      this.loading = false;
      this.loadingKey = null;
      this._render();
    } catch (error) {
      console.warn("MapDataInspector", error);
      if (this.loadingKey === cacheKey) {
        this.loading = false;
        this.loadingKey = null;
        this._renderTooltip();
      }
    }
  }

  _normalizeData(weather, air, lat, lon) {
    if (!weather?.current) return null;
    const current = weather.current;
    const hourly = weather.hourly || {};
    const airHourly = air?.hourly || {};
    const pickHourly = (key) =>
      Array.isArray(hourly[key]) && hourly[key].length ? hourly[key][0] : null;
    const pickAir = (key) =>
      Array.isArray(airHourly[key]) && airHourly[key].length
        ? airHourly[key][0]
        : null;
    return {
      label: `${lat} deg, ${lon} deg`,
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      precipitation: current.precipitation,
      precipitationProbability: pickHourly("precipitation_probability"),
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      clouds: current.cloud_cover,
      humidity: current.relative_humidity_2m,
      visibility: current.visibility,
      dewPoint: current.dew_point_2m,
      pressure: current.pressure_msl,
      snowfall: pickHourly("snowfall"),
      uvIndex: pickHourly("uv_index"),
      airQuality: {
        aqi: pickAir("european_aqi"),
        pm25: pickAir("pm2_5"),
        pm10: pickAir("pm10"),
      },
    };
  }

  _buildMetricList(data) {
    return [
      {
        key: "temperature",
        label: "Temperatur",
        value: this._formatTemp(data.temperature),
      },
      {
        key: "feels",
        label: "Gefühlt",
        value: this._formatTemp(data.feelsLike),
      },
      {
        key: "precipitation",
        label: "Niederschlag",
        value: `${this._formatValue(
          data.precipitation,
          "mm/h",
          2
        )} (${this._formatValue(data.precipitationProbability, "%")})`,
      },
      {
        key: "wind",
        label: "Wind",
        value: `${this._formatValue(data.windSpeed, " km/h")} ${
          data.windDirection
            ? `(dir ${Math.round(data.windDirection)} deg)`
            : ""
        }`.trim(),
      },
      {
        key: "clouds",
        label: "Wolken",
        value: this._formatValue(data.clouds, "%"),
      },
      {
        key: "humidity",
        label: "Luftfeuchte",
        value: this._formatValue(data.humidity, "%"),
      },
      {
        key: "visibility",
        label: "Sichtweite",
        value: this._formatValue(data.visibility / 1000, " km", 1),
      },
      {
        key: "dewpoint",
        label: "Taupunkt",
        value: this._formatTemp(data.dewPoint),
      },
      {
        key: "pressure",
        label: "Luftdruck",
        value: this._formatValue(data.pressure, " hPa", 0),
      },
      {
        key: "uv",
        label: "UV",
        value: this._formatValue(data.uvIndex, "", 1),
      },
      {
        key: "winter",
        label: "Winter",
        value: this._formatValue(data.snowfall, " mm"),
      },
      {
        key: "air-quality",
        label: "AQI",
        value: this._formatValue(data.airQuality?.aqi, ""),
      },
    ];
  }

  _render() {
    this._renderPanel();
    this._renderTooltip();
  }

  _renderPanel() {
    if (!this.outputEl) return;
    if (!this.latestData) {
      this.outputEl.innerHTML =
        '<p class="map-inspector-empty">Bewege die Maus über die Karte, um Messwerte zu sehen.</p>';
      return;
    }
    const metrics = this._buildMetricList(this.latestData);
    const items = metrics
      .map(
        (metric) => `
          <li data-focus="${metric.key === this.currentMode}">
            <span>${metric.label}</span>
            <em>${metric.value}</em>
          </li>
        `
      )
      .join("");
    this.outputEl.innerHTML = `
      <h4>Daten · ${this.latestData.label}</h4>
      <ul>${items}</ul>
    `;
  }

  _renderTooltip() {
    this._ensureTooltipContainer();
    if (!this.tooltipEl || !this.weatherMap?.map) return;
    if (!this.pointer) {
      this.tooltipEl.classList.add("is-hidden");
      return;
    }

    const pointerKey = this.pointerKey;
    const hasFreshData =
      pointerKey && this.latestKey === pointerKey && this.latestData;
    const isLoading = this.loading && this.loadingKey === pointerKey;

    if (!hasFreshData && !isLoading) {
      this.tooltipEl.classList.add("is-hidden");
      return;
    }

    if (!hasFreshData) {
      this.tooltipEl.innerHTML =
        '<div class="map-hover-loading">Ermittle Daten…</div>';
      this.tooltipEl.classList.add("is-loading");
    } else {
      const data = this.latestData;
      const content = `
        <div class="map-hover-row">
          <div>
            <p class="map-hover-label">Temperatur</p>
            <p class="map-hover-temp">${this._formatTemp(data.temperature)}</p>
          </div>
          <div>
            <p class="map-hover-label">Gefühlt</p>
            <p>${this._formatTemp(data.feelsLike)}</p>
          </div>
        </div>
        <div class="map-hover-row secondary">
          <span>Wind: ${this._formatValue(data.windSpeed, " km/h")}</span>
          <span>Regen: ${this._formatValue(
            data.precipitation,
            " mm/h",
            2
          )}</span>
        </div>
        <div class="map-hover-row secondary">
          <span>Wolken: ${this._formatValue(data.clouds, "%")}</span>
          <span>Feuchte: ${this._formatValue(data.humidity, "%")}</span>
        </div>
      `;
      this.tooltipEl.innerHTML = content;
      this.tooltipEl.classList.remove("is-loading");
    }

    this.tooltipEl.classList.remove("is-hidden");
    this._positionTooltip();
  }

  _positionTooltip() {
    if (!this.tooltipEl || !this.weatherMap?.map || !this.pointer) return;
    const container = this.mapContainer || this.weatherMap.map.getContainer();
    if (!container) return;
    const point = this.weatherMap.map.latLngToContainerPoint(this.pointer);
    const tooltipRect = this.tooltipEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    let left = point.x + 16;
    let top = point.y + 16;

    if (left + tooltipRect.width > containerRect.width) {
      left = point.x - tooltipRect.width - 16;
    }
    if (top + tooltipRect.height > containerRect.height) {
      top = point.y - tooltipRect.height - 16;
    }

    left = Math.max(8, left);
    top = Math.max(8, top);

    this.tooltipEl.style.transform = `translate(${left}px, ${top}px)`;
  }

  _formatValue(value, suffix = "", digits = 0) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "–";
    }
    return `${Number(value).toFixed(digits)}${suffix}`;
  }

  _formatTemp(value) {
    return this._formatValue(value, " °C", 1);
  }
}

// ============================================
// 2. WEATHER ALERT AGGREGATION
// ============================================

class WeatherAlerts {
  constructor(containerId) {
    this.containerId = containerId;
    this.activeRequest = 0;
  }

  async fetchAlerts(lat, lon, city) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    this.activeRequest += 1;
    const requestId = this.activeRequest;
    container.innerHTML =
      '<p class="alerts-loading">Warnungen werden geladen...</p>';

    try {
      const url = this._buildForecastUrl(lat, lon);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Warnungs-API ${response.status}`);
      }
      const payload = await response.json();

      if (this.activeRequest !== requestId) {
        return;
      }

      const alerts = this._deriveAlerts(payload);
      this.renderAlerts(alerts, city || "Standort");
    } catch (error) {
      console.error("WeatherAlerts", error);
      container.innerHTML = `
        <div class="alerts-empty">
          <p>Warnungen aktuell nicht verfuegbar</p>
          <small>${error.message || "Unbekannter Fehler"}</small>
        </div>
      `;
    }
  }

  _buildForecastUrl(lat, lon) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      hourly:
        "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weathercode,windspeed_10m",
      timezone: "auto",
      forecast_days: "2",
    });
    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  }

  _deriveAlerts(payload) {
    const alerts = [];
    const hourly = payload && payload.hourly ? payload.hourly : {};
    const hours = (hourly.time || []).slice(0, 24);

    const grab = (arr, idx, fallback = null) => {
      if (!arr || !(idx in arr)) return fallback;
      const value = Number(arr[idx]);
      return Number.isFinite(value) ? value : fallback;
    };

    const pushAlert = (id, data) => {
      if (alerts.some((item) => item.id === id)) return;
      alerts.push(Object.assign({ id }, data));
    };

    hours.forEach((iso, idx) => {
      const temp = grab(hourly.temperature_2m, idx);
      const feels = grab(hourly.apparent_temperature, idx);
      const prob = grab(hourly.precipitation_probability, idx, 0);
      const rain = grab(hourly.precipitation, idx, 0);
      const wind = grab(hourly.windspeed_10m, idx, 0);
      const code = grab(hourly.weathercode, idx);

      if (typeof wind === "number" && wind >= 75) {
        pushAlert(`wind-${iso}`, {
          severity: "red",
          icon: "[wind]",
          title: "Sturmwarnung",
          description: `Windspitzen um ${wind.toFixed(0)} km/h erwartet.`,
          time: iso,
        });
      } else if (typeof wind === "number" && wind >= 55) {
        pushAlert(`wind-${iso}`, {
          severity: "orange",
          icon: "[wind]",
          title: "Sturmboeen",
          description: `Wind bis ${wind.toFixed(0)} km/h moeglich.`,
          time: iso,
        });
      }

      if (typeof temp === "number" && temp >= 32) {
        pushAlert(`heat-${iso}`, {
          severity: "orange",
          icon: "[heat]",
          title: "Starke Hitze",
          description: `Temperaturen ueber 32 Grad erwartet.`,
          time: iso,
        });
      }

      if (typeof feels === "number" && feels <= -12) {
        pushAlert(`frost-${iso}`, {
          severity: "yellow",
          icon: "[frost]",
          title: "Strenger Frost",
          description: `Gefuehlte Temperatur um ${feels.toFixed(0)} Grad.`,
          time: iso,
        });
      }

      if (typeof rain === "number" && rain >= 5 && prob >= 60) {
        pushAlert(`rain-${iso}`, {
          severity: "orange",
          icon: "[rain]",
          title: "Starkregen",
          description: `${rain.toFixed(1)} mm mit ${prob}% Wahrscheinlichkeit.`,
          time: iso,
        });
      }

      if ([95, 96, 99].indexOf(code) >= 0) {
        pushAlert(`storm-${iso}`, {
          severity: "red",
          icon: "[storm]",
          title: "Gewitterfront",
          description: "Gewitter mit Hagel oder Starkregen moeglich.",
          time: iso,
        });
      }
    });

    return alerts;
  }

  renderAlerts(alerts, city) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    if (!alerts.length) {
      container.innerHTML = `
        <div class="alerts-empty">
          <div class="emoji"></div>
          <h3>Keine aktuellen Warnungen</h3>
          <p>Fuer ${city} liegen derzeit keine Meldungen vor.</p>
        </div>
      `;
      return;
    }

    const cards = alerts
      .map((alert) => {
        return `
          <article class="alert-card alert-${alert.severity}">
            <div class="alert-icon">${alert.icon || ""}</div>
            <div class="alert-body">
              <header>
                <h3>${alert.title}</h3>
                <span>${this._formatTime(alert.time)}</span>
              </header>
              <p>${alert.description}</p>
            </div>
          </article>
        `;
      })
      .join("");

    container.innerHTML = `
      <div class="alert-summary">${alerts.length} Warnung(en) fuer ${city}</div>
      ${cards}
    `;
  }

  _formatTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString("de-DE", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

// ============================================
// 3. HISTORICAL WEATHER CHARTS
// ============================================

class HistoricalChart {
  constructor(containerId) {
    this.containerId = containerId;
    this.chart = null;
    this.chartLib = getChartInstance();
  }

  async fetchAndRender(lat, lon, city) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML =
      '<p style="padding:20px; text-align:center;"> Lade historische Daten...</p>';

    try {
      const safeLat = Number(lat);
      const safeLon = Number(lon);
      if (!Number.isFinite(safeLat) || !Number.isFinite(safeLon)) {
        throw new Error("Ungueltige Koordinaten fuer historische Daten");
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 400);

      const start = startDate.toISOString().split("T")[0];
      const end = endDate.toISOString().split("T")[0];

      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${safeLat}&longitude=${safeLon}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Archiv-API ${response.status}: ${text}`);
      }

      const data = await response.json();
      data.meta = {
        provider: "Open-Meteo Archiv",
        range: { start, end },
      };
      this.renderChart(data, city || "Standort");
    } catch (error) {
      console.error("HistoricalChart", error);
      container.innerHTML = `
        <div class="historical-error">
          <p>Keine historischen Daten verfuegbar</p>
          <small>${error.message || "Unbekannter Fehler"}</small>
        </div>
      `;
    }
  }

  renderChart(data, city) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const entries = this._normalizeDailyEntries(data.daily || {});
    if (!entries.length) {
      container.innerHTML = `
        <div class="historical-error">
          <p>Keine historischen Daten verfuegbar</p>
          <small>Der Anbieter hat fuer diesen Zeitraum nichts geliefert.</small>
        </div>
      `;
      return;
    }

    const breakdown = this._computeHistoricalBreakdown(entries);
    const chartEntries = breakdown.chartEntries.length
      ? breakdown.chartEntries
      : entries;
    const labels = chartEntries.map((entry) => entry.label);
    container.innerHTML = `
      <div class="historical-chart-canvas">
        <canvas id="historical-chart-canvas" aria-label="Historische Wetterdaten" role="img"></canvas>
      </div>
    `;
    const canvas = container.querySelector("#historical-chart-canvas");
    if (!canvas) return;

    if (!this.chartLib) {
      container.insertAdjacentHTML(
        "beforeend",
        '<p class="historical-error">Chart.js nicht geladen</p>'
      );
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new this.chartLib(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Max Temp (degC)",
            data: chartEntries.map((entry) => entry.max),
            borderColor: "#dc3545",
            backgroundColor: "rgba(220,53,69,0.1)",
            tension: 0.35,
            fill: false,
            yAxisID: "temp",
          },
          {
            label: "Min Temp (degC)",
            data: chartEntries.map((entry) => entry.min),
            borderColor: "#007bff",
            backgroundColor: "rgba(0,123,255,0.1)",
            tension: 0.35,
            fill: false,
            yAxisID: "temp",
          },
          {
            type: "bar",
            label: "Niederschlag (mm)",
            data: chartEntries.map((entry) => entry.rain || 0),
            backgroundColor: "rgba(0,150,136,0.35)",
            borderColor: "rgba(0,150,136,0.8)",
            borderWidth: 1,
            yAxisID: "precip",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          title: {
            display: true,
            text: `Temperatur & Niederschlag  ${city || "Standort"}`,
          },
          legend: { position: "bottom" },
        },
        scales: {
          temp: {
            position: "left",
            title: { display: true, text: "Temperatur (degC)" },
            ticks: { callback: (value) => `${value} deg` },
          },
          precip: {
            position: "right",
            beginAtZero: true,
            title: { display: true, text: "Niederschlag (mm)" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });

    const stats = this._computeHistoricalStats(chartEntries);
    const rangeLabel = this._describeRange(chartEntries);
    const summaryHtml = this._renderHistoricalSummary(
      stats,
      data.meta || {},
      rangeLabel
    );
    const monthlyHtml = this._renderMonthlyComparison(breakdown.monthlyBuckets);
    const trendHtml = this._renderYearTrend(breakdown.yearTrend);
    const tableHtml = this._renderHistoricalTable(chartEntries, stats);
    container.insertAdjacentHTML(
      "beforeend",
      summaryHtml + monthlyHtml + trendHtml + tableHtml
    );
  }

  _normalizeDailyEntries(daily) {
    const times = daily.time || [];
    const maxValues = daily.temperature_2m_max || [];
    const minValues = daily.temperature_2m_min || [];
    const precipitation = daily.precipitation_sum || [];

    return times.map((isoDate, idx) => {
      const max = this._toNumber(maxValues[idx]);
      const min = this._toNumber(minValues[idx]);
      const rain = this._toNumber(precipitation[idx], 0);
      const range =
        typeof max === "number" && typeof min === "number"
          ? Number((max - min).toFixed(1))
          : null;
      return {
        date: isoDate,
        label: new Date(isoDate).toLocaleDateString("de-DE", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        }),
        max,
        min,
        rain,
        range,
      };
    });
  }

  _computeHistoricalStats(entries) {
    const validMax = entries.filter((entry) => typeof entry.max === "number");
    const validMin = entries.filter((entry) => typeof entry.min === "number");
    const warmest = validMax.reduce(
      (acc, entry) => (!acc || entry.max > acc.max ? entry : acc),
      null
    );
    const coldest = validMin.reduce(
      (acc, entry) => (!acc || entry.min < acc.min ? entry : acc),
      null
    );
    const wettest = entries.reduce(
      (acc, entry) =>
        !acc || (entry.rain || 0) > (acc.rain || 0) ? entry : acc,
      null
    );

    const average = (list, key) => {
      if (!list.length) return null;
      const sum = list.reduce((total, entry) => total + (entry[key] || 0), 0);
      return sum / list.length;
    };

    return {
      avgMax: average(validMax, "max"),
      avgMin: average(validMin, "min"),
      totalRain: entries.reduce((total, entry) => total + (entry.rain || 0), 0),
      warmest,
      coldest,
      wettest,
    };
  }

  _computeHistoricalBreakdown(entries) {
    if (!Array.isArray(entries) || !entries.length) {
      return { chartEntries: [], monthlyBuckets: [], yearTrend: [] };
    }
    const sorted = entries
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const chartEntries = sorted.slice(-30);
    const monthlyBuckets = this._aggregateMonthly(sorted);
    const yearTrend = monthlyBuckets.slice(-12);
    return { chartEntries, monthlyBuckets, yearTrend };
  }

  _aggregateMonthly(entries) {
    const store = new Map();
    entries.forEach((entry) => {
      if (!entry?.date) return;
      const key = entry.date.slice(0, 7);
      if (!store.has(key)) {
        store.set(key, {
          key,
          sumMax: 0,
          countMax: 0,
          sumMin: 0,
          countMin: 0,
          totalRain: 0,
        });
      }
      const bucket = store.get(key);
      if (typeof entry.max === "number") {
        bucket.sumMax += entry.max;
        bucket.countMax += 1;
      }
      if (typeof entry.min === "number") {
        bucket.sumMin += entry.min;
        bucket.countMin += 1;
      }
      if (typeof entry.rain === "number") {
        bucket.totalRain += entry.rain;
      }
    });

    return Array.from(store.entries())
      .map(([key, bucket]) => {
        const date = new Date(`${key}-01T00:00:00`);
        const label = Number.isNaN(date.getTime())
          ? key
          : date.toLocaleDateString("de-DE", {
              month: "short",
              year: "2-digit",
            });
        const avgMax = bucket.countMax ? bucket.sumMax / bucket.countMax : null;
        const avgMin = bucket.countMin ? bucket.sumMin / bucket.countMin : null;
        const avgTemp =
          avgMax !== null && avgMin !== null ? (avgMax + avgMin) / 2 : avgMax;
        return {
          key,
          label,
          avgMax,
          avgMin,
          avgTemp,
          totalRain: bucket.totalRain,
          order: date.getTime() || Date.now(),
        };
      })
      .sort((a, b) => a.order - b.order);
  }

  _renderMonthlyComparison(buckets = []) {
    const recent = buckets.slice(-4);
    if (!recent.length) return "";
    const cards = recent
      .map(
        (bucket) => `
          <article class="historical-summary-card monthly-card">
            <span class="label">${bucket.label}</span>
            <strong>${
              this._formatValue(bucket.avgMax, " degC", 1) || "--"
            }</strong>
            <small>Min ${
              this._formatValue(bucket.avgMin, " degC", 1) || "--"
            } · Regen ${
          this._formatValue(bucket.totalRain, " mm", 1) || "--"
        }</small>
          </article>
        `
      )
      .join("");

    return `
      <section class="historical-monthly-grid">
        <header>
          <h4>Monatsvergleich</h4>
          <small>Letzte ${recent.length} Monate</small>
        </header>
        <div class="historical-monthly-cards">${cards}</div>
      </section>
    `;
  }

  _renderYearTrend(buckets = []) {
    const trendBuckets = buckets.slice(-12);
    if (!trendBuckets.length) return "";
    const sparkline = this._renderTrendSparkline(
      trendBuckets.map((bucket) => bucket.avgTemp)
    );
    const rows = trendBuckets
      .map(
        (bucket) => `
          <li>
            <span>${bucket.label}</span>
            <strong>${
              this._formatValue(bucket.avgTemp, " degC", 1) || "--"
            }</strong>
            <em>${this._formatValue(bucket.totalRain, " mm", 1) || "--"}</em>
          </li>
        `
      )
      .join("");

    return `
      <section class="historical-trend-panel">
        <header>
          <h4>Jahrestrend</h4>
          <small>Durchschnittliche Monatswerte</small>
        </header>
        ${sparkline}
        <ul class="trend-list">${rows}</ul>
      </section>
    `;
  }

  _renderTrendSparkline(series = []) {
    const sanitized = series
      .map((value, index) => ({ value, index }))
      .filter(
        (entry) => typeof entry.value === "number" && !Number.isNaN(entry.value)
      );
    if (!sanitized.length) {
      return '<div class="trend-sparkline trend-sparkline--empty">Keine Trenddaten</div>';
    }
    const minValue = Math.min(...sanitized.map((entry) => entry.value));
    const maxValue = Math.max(...sanitized.map((entry) => entry.value));
    const width = 200;
    const height = 60;
    const totalSteps = Math.max(sanitized.length - 1, 1);
    const points = sanitized
      .map((entry) => {
        const x = (entry.index / totalSteps) * width;
        const normalized =
          maxValue === minValue
            ? 0.5
            : (entry.value - minValue) / (maxValue - minValue);
        const y = height - normalized * height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
    return `
      <svg class="trend-sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <polyline points="${points}" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" />
      </svg>
    `;
  }

  _describeRange(entries) {
    if (!Array.isArray(entries) || !entries.length) return "letzte Tage";
    const first = entries[0]?.date;
    const last = entries[entries.length - 1]?.date;
    if (!first || !last) return "letzte Tage";
    return `${this._formatDate(first)} – ${this._formatDate(last)}`;
  }

  _renderHistoricalSummary(stats, meta, rangeOverride) {
    const fmt = (value, suffix = " degC") =>
      typeof value === "number" ? `${value.toFixed(1)}${suffix}` : "";
    const rainFmt = (value) =>
      typeof value === "number" ? `${value.toFixed(1)} mm` : "";
    const hasRange = meta && meta.range && meta.range.start && meta.range.end;
    const fallbackRange = hasRange
      ? `${this._formatDate(meta.range.start)}  ${this._formatDate(
          meta.range.end
        )}`
      : "letzte Tage";
    const rangeText = rangeOverride || fallbackRange;
    const provider = meta && meta.provider ? meta.provider : "Open-Meteo";

    return `
      <div class="historical-summary-meta">
        <p>Quelle: <strong>${provider}</strong>  Zeitraum: ${rangeText}</p>
      </div>
      <div class="historical-summary-grid">
        <article class="historical-summary-card">
          <span class="label">Durchschnitt Max</span>
          <strong>${fmt(stats.avgMax)}</strong>
        </article>
        <article class="historical-summary-card">
          <span class="label">Durchschnitt Min</span>
          <strong>${fmt(stats.avgMin)}</strong>
        </article>
        <article class="historical-summary-card">
          <span class="label">Gesamter Niederschlag</span>
          <strong>${rainFmt(stats.totalRain)}</strong>
        </article>
        <article class="historical-summary-card">
          <span class="label">Extrema</span>
          <strong>${
            stats.warmest
              ? `${stats.warmest.label} (${fmt(stats.warmest.max)})`
              : ""
          }</strong>
          <small>${
            stats.coldest
              ? `Kaeltester Tag: ${stats.coldest.label} (${fmt(
                  stats.coldest.min
                )})`
              : ""
          }</small>
        </article>
      </div>
    `;
  }

  _renderHistoricalTable(entries, stats) {
    if (!entries.length) return "";
    const warmDate = stats.warmest && stats.warmest.date;
    const coldDate = stats.coldest && stats.coldest.date;
    const wetDate = stats.wettest && stats.wettest.date;

    const rows = entries
      .map((entry) => {
        let tone = "";
        if (entry.date === warmDate) tone = "max";
        else if (entry.date === coldDate) tone = "min";
        else if (entry.date === wetDate) tone = "rain";
        return `
          <tr ${tone ? `data-extreme="${tone}"` : ""}>
            <td>${entry.label}</td>
            <td>${this._formatValue(entry.max, " degC")}</td>
            <td>${this._formatValue(entry.min, " degC")}</td>
            <td>${
              typeof entry.range === "number"
                ? `${entry.range.toFixed(1)} deg`
                : ""
            }</td>
            <td>${this._formatValue(entry.rain, " mm", 1)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="historical-table-wrapper">
        <table class="historical-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Max</th>
              <th>Min</th>
              <th>Spanne</th>
              <th>Niederschlag</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  _formatValue(value, suffix = "", digits = 1) {
    if (typeof value !== "number") return "";
    return `${value.toFixed(digits)}${suffix}`;
  }

  _toNumber(value, fallback = null) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  _formatDate(input) {
    if (!input) return "?";
    return new Date(input).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
    });
  }
}

// ============================================
// 4. LOCAL ANALYTICS (unchanged)
// ============================================

class Analytics {
  constructor() {
    this.events = this.loadEvents();
    const saved = localStorage.getItem("wetter_analytics_enabled");
    this.enabled = saved === null ? true : saved === "true";
    if (saved === null) {
      localStorage.setItem("wetter_analytics_enabled", "true");
    }
  }

  loadEvents() {
    try {
      return JSON.parse(
        localStorage.getItem("wetter_analytics_events") || "[]"
      );
    } catch (error) {
      console.warn("Analytics load failed", error);
      return [];
    }
  }

  saveEvents() {
    try {
      localStorage.setItem(
        "wetter_analytics_events",
        JSON.stringify(this.events)
      );
    } catch (error) {
      console.warn("Analytics save failed", error);
    }
  }

  logEvent(type, data) {
    if (!this.enabled) return;
    this.events.push({ type, data, timestamp: Date.now() });
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
    this.saveEvents();
  }

  getStats() {
    const count = (t) => this.events.filter((event) => event.type === t).length;
    return {
      searches: count("search"),
      apiCalls: count("api_call"),
      cacheHits: count("cache_hit"),
      favActions: count("favorite_action"),
      total: this.events.length,
    };
  }

  exportData() {
    return JSON.stringify(
      {
        events: this.events,
        stats: this.getStats(),
        exportDate: new Date().toISOString(),
      },
      null,
      2
    );
  }

  renderDashboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = this.getStats();
    const hasData = stats.total > 0;
    const chipLabel = hasData
      ? `${stats.total} Ereignisse`
      : "Noch keine Events";
    const emptyState = hasData
      ? ""
      : '<p class="analytics-empty">Noch keine Daten – führe eine Suche aus, füge Favoriten hinzu oder lade Wetterdaten, um diese Übersicht zu füllen.</p>';
    const gridModifier = hasData ? "" : " analytics-grid--disabled";
    container.innerHTML = `
      <div class="analytics-panel">
        <div class="analytics-panel-header">
          <div>
            <p class="section-subtitle">Lokale Insights</p>
            <h3>📊 Nutzungsstatistiken</h3>
          </div>
          <span class="analytics-chip">${chipLabel}</span>
        </div>
        ${emptyState}
        <div class="analytics-grid${gridModifier}">
          <article><strong>${
            stats.searches
          }</strong><span>Suchanfragen</span></article>
          <article><strong>${
            stats.apiCalls
          }</strong><span>API Calls</span></article>
          <article><strong>${
            stats.cacheHits
          }</strong><span>Cache Hits</span></article>
          <article><strong>${
            stats.favActions
          }</strong><span>Favoriten-Aktionen</span></article>
        </div>
        <div class="analytics-footer">
          <label class="analytics-toggle">
            <input type="checkbox" id="analytics-toggle" ${
              this.enabled ? "checked" : ""
            }>
            <span>Analytics aktiviert (nur lokal gespeichert)</span>
          </label>
          <button id="export-analytics-btn" class="btn-secondary">Analytics exportieren</button>
        </div>
      </div>
    `;

    const toggle = /** @type {HTMLInputElement | null} */ (
      document.getElementById("analytics-toggle")
    );
    if (toggle) {
      toggle.addEventListener("change", (event) => {
        const input = /** @type {HTMLInputElement} */ (event.target);
        this.enabled = Boolean(input?.checked);
        localStorage.setItem("wetter_analytics_enabled", String(this.enabled));
      });
    }

    const exportBtn = document.getElementById("export-analytics-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const blob = new Blob([this.exportData()], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `wetter-analytics-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  }
}

// Global exports
const globalWindow = /** @type {Record<string, any> | undefined} */ (
  getAugmentedWindow()
);
if (globalWindow) {
  globalWindow.WeatherMap = WeatherMap;
  globalWindow.MapDataInspector = MapDataInspector;
  globalWindow.WeatherAlerts = WeatherAlerts;
  globalWindow.HistoricalChart = HistoricalChart;
  globalWindow.Analytics = Analytics;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    WeatherMap,
    MapDataInspector,
    WeatherAlerts,
    HistoricalChart,
    Analytics,
  };
}
document.addEventListener("selectstart", function (e) {
  if (e.target.closest(".weather-box")) {
    // Prüft, ob das ausgewählte Element innerhalb deines Kastens liegt
    e.preventDefault();
  }
});
