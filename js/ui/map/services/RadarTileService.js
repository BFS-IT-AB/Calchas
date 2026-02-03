/**
 * RadarTileService.js - Robuster Service für RainViewer Radar-Tiles
 *
 * Dieser Service bietet:
 * - Automatische Retry-Logik bei API-Fehlern
 * - Mehrere Fallback-Endpoints für maximale Verfügbarkeit
 * - Intelligentes Tile-Caching und Prefetching
 * - Zoom-Level-unabhängige Tile-Bereitstellung
 * - Health-Monitoring und automatische Wiederherstellung
 */
(function (global) {
  "use strict";

  // ============================================
  // KONFIGURATION
  // ============================================
  const CONFIG = {
    // API Endpoints mit Priorität
    endpoints: [
      {
        url: "https://api.rainviewer.com/public/weather-maps.json",
        priority: 1,
        type: "primary",
      },
      {
        url: "https://tilecache.rainviewer.com/api/maps.json",
        priority: 2,
        type: "legacy",
      },
    ],

    // Proxy-Fallbacks für CORS-Probleme
    proxyEndpoints: [
      "https://cors.isomorphic-git.org/",
      "https://api.allorigins.win/raw?url=",
    ],

    // Tile-Server (mehrere für Redundanz)
    tileHosts: [
      "https://tilecache.rainviewer.com",
      "https://a.tilecache.rainviewer.com",
      "https://b.tilecache.rainviewer.com",
    ],

    // Timing
    refreshInterval: 5 * 60 * 1000, // 5 Minuten
    retryDelay: 2000, // 2 Sekunden zwischen Retries
    maxRetries: 3, // Maximale Anzahl von Retries
    requestTimeout: 10000, // 10 Sekunden Timeout

    // Tile-Konfiguration
    tileSize: 256, // Standard Tile-Größe
    maxNativeZoom: 12, // RainViewer max Zoom
    maxZoom: 20, // Leaflet max Zoom (mit Upscaling)
    minZoom: 1,

    // Fallback-URL - nutzt dynamischen Ansatz über API
    // Da nowcast_0 kein gültiger RainViewer-Pfad ist, initialisieren wir mit leerem String
    // und laden sofort die echten Frames
    staticFallbackUrl: null,
  };

  // ============================================
  // STATE
  // ============================================
  const state = {
    initialized: false,
    loading: false,
    lastFetch: 0,
    lastError: null,
    errorCount: 0,
    currentHostIndex: 0,

    // Frame-Daten
    radarFrames: { past: [], nowcast: [] },
    satelliteFrames: [],
    currentHost: CONFIG.tileHosts[0],

    // Active frame tracking
    activeMode: "nowcast",
    activeFrameIndex: 0,

    // Callbacks
    onUpdate: null,
    onError: null,

    // Refresh timer
    refreshTimer: null,

    // Health monitoring
    consecutiveFailures: 0,
    lastSuccessfulFetch: 0,
    isHealthy: true,
  };

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Fetch mit Timeout und Retry-Logik
   */
  async function fetchWithRetry(
    url,
    options = {},
    retries = CONFIG.maxRetries,
  ) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONFIG.requestTimeout,
    );

    const fetchOptions = {
      ...options,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
      mode: "cors",
    };

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;

        if (error.name === "AbortError") {
          throw new Error(`Timeout nach ${CONFIG.requestTimeout}ms`);
        }

        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, CONFIG.retryDelay * (attempt + 1)),
          );
        }
      }
    }

    clearTimeout(timeoutId);
    throw lastError || new Error("Unbekannter Fehler");
  }

  /**
   * Versucht mehrere Endpoints nacheinander
   */
  async function fetchFromEndpoints() {
    const errors = [];

    // Primäre Endpoints probieren
    for (const endpoint of CONFIG.endpoints) {
      try {
        const cacheBust = `${endpoint.url}${endpoint.url.includes("?") ? "&" : "?"}ts=${Date.now()}`;
        const data = await fetchWithRetry(cacheBust, {}, 1);
        return { data, type: endpoint.type };
      } catch (error) {
        errors.push({ endpoint: endpoint.url, error: error.message });
        console.warn(
          `[RadarTileService] ${endpoint.url} fehlgeschlagen:`,
          error.message,
        );
      }
    }

    // Proxy-Fallbacks probieren
    const primaryUrl = CONFIG.endpoints[0].url;
    for (const proxy of CONFIG.proxyEndpoints) {
      try {
        const proxyUrl = proxy.includes("?url=")
          ? `${proxy}${encodeURIComponent(primaryUrl)}`
          : `${proxy}${primaryUrl}`;
        const data = await fetchWithRetry(proxyUrl, {}, 1);
        return { data, type: "proxy" };
      } catch (error) {
        errors.push({ endpoint: proxy, error: error.message });
        console.warn(
          `[RadarTileService] Proxy ${proxy} fehlgeschlagen:`,
          error.message,
        );
      }
    }

    throw new Error(`Alle Endpoints fehlgeschlagen: ${JSON.stringify(errors)}`);
  }

  /**
   * Rotiert zum nächsten verfügbaren Tile-Host
   */
  function rotateHost() {
    state.currentHostIndex =
      (state.currentHostIndex + 1) % CONFIG.tileHosts.length;
    state.currentHost = CONFIG.tileHosts[state.currentHostIndex];
    console.log(`[RadarTileService] Gewechselt zu Host: ${state.currentHost}`);
    return state.currentHost;
  }

  /**
   * Normalisiert Frame-Daten aus der API-Antwort
   */
  function normalizeFrames(frames, type) {
    if (!Array.isArray(frames)) return [];

    return frames
      .filter((frame) => frame && frame.path)
      .map((frame) => ({
        id: `${type}-${frame.time || frame.path}`,
        path: frame.path,
        time: (frame.time || 0) * 1000,
        type,
        verified: false,
      }))
      .sort((a, b) => a.time - b.time);
  }

  /**
   * Verarbeitet Legacy-API-Antwort (Array von Timestamps)
   */
  function parseLegacyResponse(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const frames = raw
      .map((ts) => Number(ts))
      .filter((ts) => Number.isFinite(ts))
      .map((time) => ({
        time,
        path: `/v2/radar/${time}`,
      }));

    if (frames.length === 0) return null;

    return {
      host: CONFIG.tileHosts[0],
      radar: { past: frames, nowcast: [] },
      satellite: { infrared: [] },
    };
  }

  /**
   * Baut eine Tile-URL für einen gegebenen Frame
   */
  function buildTileUrl(frame, options = {}) {
    if (!frame?.path) return CONFIG.staticFallbackUrl;

    const host = options.host || state.currentHost || CONFIG.tileHosts[0];
    const tileSize = options.tileSize || CONFIG.tileSize;
    const renderParams = frame.type === "infrared" ? "0/0_0" : "2/1_1";

    // Wenn der Pfad bereits vollständig ist
    if (frame.path.startsWith("http") && frame.path.includes("{z}")) {
      return frame.path;
    }

    // Pfad normalisieren
    const normalizedPath = frame.path.startsWith("/")
      ? frame.path
      : `/${frame.path}`;

    // Wenn der Pfad bereits {z} enthält
    if (normalizedPath.includes("{z}")) {
      return `${host}${normalizedPath}`;
    }

    // Standard Tile-URL aufbauen
    return `${host}${normalizedPath}/${tileSize}/{z}/{x}/{y}/${renderParams}.png`;
  }

  /**
   * Generiert alternative Tile-URLs für Fallback
   */
  function getAlternativeTileUrls(frame) {
    const urls = [];

    // Von allen verfügbaren Hosts
    for (const host of CONFIG.tileHosts) {
      urls.push(buildTileUrl(frame, { host }));
    }

    // Mit alternativer Tile-Größe
    urls.push(buildTileUrl(frame, { tileSize: 512 }));

    return urls;
  }

  // ============================================
  // CORE API
  // ============================================

  /**
   * Initialisiert den Service und startet automatisches Refresh
   */
  function init(options = {}) {
    if (state.initialized && !options.force) {
      return Promise.resolve(getState());
    }

    state.onUpdate = options.onUpdate || null;
    state.onError = options.onError || null;

    // Automatisches Refresh starten
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
    }

    state.refreshTimer = setInterval(() => {
      refresh().catch((err) => {
        console.warn("[RadarTileService] Auto-refresh fehlgeschlagen:", err);
      });
    }, CONFIG.refreshInterval);

    state.initialized = true;

    return refresh();
  }

  /**
   * Holt aktuelle Radar-Daten von der API
   */
  async function refresh() {
    // Vermeidet gleichzeitige Anfragen
    if (state.loading) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!state.loading) {
            clearInterval(checkInterval);
            resolve(getState());
          }
        }, 100);
      });
    }

    // Prüft ob Daten noch frisch sind
    const now = Date.now();
    if (
      state.lastFetch > 0 &&
      now - state.lastFetch < 60000 &&
      state.radarFrames.nowcast.length > 0
    ) {
      return getState();
    }

    state.loading = true;
    state.lastError = null;

    try {
      const { data, type } = await fetchFromEndpoints();

      // Legacy-Format konvertieren falls nötig
      const payload = type === "legacy" ? parseLegacyResponse(data) : data;

      if (
        !payload ||
        (!payload.radar?.past?.length && !payload.radar?.nowcast?.length)
      ) {
        throw new Error("Keine Radar-Daten in API-Antwort");
      }

      // Daten verarbeiten
      state.currentHost = payload.host || CONFIG.tileHosts[0];
      state.radarFrames = {
        past: normalizeFrames(payload.radar?.past, "past"),
        nowcast: normalizeFrames(payload.radar?.nowcast, "nowcast"),
      };
      state.satelliteFrames = normalizeFrames(
        payload.satellite?.infrared,
        "infrared",
      );

      // Status aktualisieren
      state.lastFetch = now;
      state.lastSuccessfulFetch = now;
      state.consecutiveFailures = 0;
      state.isHealthy = true;
      state.errorCount = 0;

      // Aktuellen Frame validieren
      const activeFrames = getActiveFrames();
      if (state.activeFrameIndex >= activeFrames.length) {
        state.activeFrameIndex = Math.max(0, activeFrames.length - 1);
      }

      console.log(
        `[RadarTileService] Erfolgreich geladen: ${state.radarFrames.past.length} past, ${state.radarFrames.nowcast.length} nowcast Frames`,
      );

      // Callback aufrufen
      if (typeof state.onUpdate === "function") {
        state.onUpdate(getState());
      }

      return getState();
    } catch (error) {
      state.consecutiveFailures++;
      state.errorCount++;
      state.lastError = error.message;
      state.isHealthy = state.consecutiveFailures < 3;

      console.error("[RadarTileService] Refresh fehlgeschlagen:", error);

      // Bei wiederholten Fehlern Host wechseln
      if (state.consecutiveFailures >= 2) {
        rotateHost();
      }

      // Callback aufrufen
      if (typeof state.onError === "function") {
        state.onError(error, getState());
      }

      // Fallback aktivieren
      if (!hasFrames()) {
        activateFallback();
      }

      throw error;
    } finally {
      state.loading = false;
    }
  }

  /**
   * Aktiviert den statischen Fallback-Modus
   */
  function activateFallback() {
    console.log("[RadarTileService] Aktiviere Fallback-Modus");

    // Im Fallback-Modus nutzen wir einen dynamisch gerundeten Timestamp
    // RainViewer benötigt echte Unix-Timestamps, NICHT "nowcast_0"
    const roundedTimestamp = Math.floor(Date.now() / 1000 / 600) * 600;

    state.radarFrames = {
      past: [{ time: roundedTimestamp, path: `/v2/radar/${roundedTimestamp}` }],
      nowcast: [],
    };
    state.activeMode = "past";
    state.activeFrameIndex = 0;

    if (typeof state.onUpdate === "function") {
      state.onUpdate(getState());
    }
  }

  /**
   * Setzt den aktiven Modus (past/nowcast/infrared)
   */
  function setMode(mode) {
    if (!["past", "nowcast", "infrared"].includes(mode)) {
      console.warn(`[RadarTileService] Ungültiger Modus: ${mode}`);
      return false;
    }

    const frames = getFramesByMode(mode);
    if (frames.length === 0) {
      console.warn(`[RadarTileService] Keine Frames für Modus: ${mode}`);
      return false;
    }

    state.activeMode = mode;
    state.activeFrameIndex = Math.max(0, frames.length - 1);

    if (typeof state.onUpdate === "function") {
      state.onUpdate(getState());
    }

    return true;
  }

  /**
   * Setzt den aktiven Frame-Index
   */
  function setFrameIndex(index) {
    const frames = getActiveFrames();
    if (frames.length === 0) return false;

    const clampedIndex = Math.min(Math.max(0, index), frames.length - 1);
    state.activeFrameIndex = clampedIndex;

    if (typeof state.onUpdate === "function") {
      state.onUpdate(getState());
    }

    return true;
  }

  /**
   * Schritt zum nächsten/vorherigen Frame
   */
  function step(delta = 1) {
    const frames = getActiveFrames();
    if (frames.length === 0) return false;

    const newIndex =
      (state.activeFrameIndex + delta + frames.length) % frames.length;
    return setFrameIndex(newIndex);
  }

  // ============================================
  // GETTER
  // ============================================

  function getFramesByMode(mode) {
    if (mode === "infrared") {
      return state.satelliteFrames || [];
    }
    return state.radarFrames[mode] || [];
  }

  function getActiveFrames() {
    return getFramesByMode(state.activeMode);
  }

  function getActiveFrame() {
    const frames = getActiveFrames();
    if (frames.length === 0) return null;

    const index = Math.min(
      Math.max(0, state.activeFrameIndex),
      frames.length - 1,
    );
    return frames[index];
  }

  function getCurrentTileUrl() {
    const frame = getActiveFrame();
    if (frame) {
      return buildTileUrl(frame);
    }
    // Dynamische Fallback-URL mit aktuellem Timestamp (gerundet auf 10 Min)
    const now = Math.floor(Date.now() / 1000);
    const rounded = Math.floor(now / 600) * 600; // Auf 10 Minuten runden
    return `${state.currentHost}/v2/radar/${rounded}/256/{z}/{x}/{y}/2/1_1.png`;
  }

  function hasFrames() {
    return (
      state.radarFrames.past.length > 0 ||
      state.radarFrames.nowcast.length > 0 ||
      state.satelliteFrames.length > 0
    );
  }

  function getState() {
    const activeFrames = getActiveFrames();
    const activeFrame = getActiveFrame();

    return {
      initialized: state.initialized,
      loading: state.loading,
      isHealthy: state.isHealthy,
      lastFetch: state.lastFetch,
      lastError: state.lastError,
      errorCount: state.errorCount,

      currentHost: state.currentHost,
      activeMode: state.activeMode,
      activeFrameIndex: state.activeFrameIndex,

      frames: {
        past: state.radarFrames.past,
        nowcast: state.radarFrames.nowcast,
        infrared: state.satelliteFrames,
      },

      activeFrames,
      activeFrame,

      currentTileUrl: getCurrentTileUrl(),

      // Für Leaflet Tile-Layer
      tileLayerOptions: getTileLayerOptions(),
    };
  }

  /**
   * Gibt optimierte Tile-Layer-Optionen für Leaflet zurück
   */
  function getTileLayerOptions() {
    return {
      tileSize: CONFIG.tileSize,
      maxNativeZoom: CONFIG.maxNativeZoom,
      maxZoom: CONFIG.maxZoom,
      minZoom: CONFIG.minZoom,
      opacity: 0.85,
      className: "rainviewer-radar-tiles",
      crossOrigin: "anonymous",
      errorTileUrl:
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      // Wichtig: updateWhenZooming für flüssiges Zoom-Verhalten
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 4,
      // Bounds für Radar-Daten (Global)
      bounds: [
        [-90, -180],
        [90, 180],
      ],
    };
  }

  /**
   * Cleanup beim Beenden
   */
  function destroy() {
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
      state.refreshTimer = null;
    }

    state.initialized = false;
    state.loading = false;
    state.radarFrames = { past: [], nowcast: [] };
    state.satelliteFrames = [];
    state.onUpdate = null;
    state.onError = null;

    console.log("[RadarTileService] Destroyed");
  }

  // ============================================
  // EXPORT
  // ============================================
  global.RadarTileService = {
    // Lifecycle
    init,
    refresh,
    destroy,

    // Navigation
    setMode,
    setFrameIndex,
    step,

    // Getters
    getState,
    getActiveFrames,
    getActiveFrame,
    getCurrentTileUrl,
    hasFrames,
    getFramesByMode,

    // Utilities
    buildTileUrl,
    getAlternativeTileUrls,
    getTileLayerOptions,

    // Config (readonly)
    get config() {
      return { ...CONFIG };
    },
  };
})(typeof window !== "undefined" ? window : global);
