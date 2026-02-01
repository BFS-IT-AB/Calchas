/**
 * HistoryController.js - Central Orchestrator for History Page
 *
 * Architecture: Coordinates all history components, manages state,
 * and routes all modal interactions through MasterUIController.
 *
 * NO Mutation Observers - uses explicit function calls for UI initialization.
 * NO Global Variables - all state contained within module scope.
 *
 * @module ui/history/HistoryController
 * @version 2.1.0
 */
(function (global) {
  "use strict";

  // ============================================
  // IMPORTS (via global scope)
  // ============================================
  const getMasterUI = () => global.MasterUIController;
  const getChartManager = () => global.HistoryCharts;
  const getStatsManager = () => global.HistoryStats;
  const getWeatherDataService = () => global.weatherDataService;

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    containerId: "history-container",
    modalContainerId: "history-modal-container",
    transitionDuration: 300,
    // Cache settings
    CACHE_TTL: 30 * 60 * 1000, // 30 minutes
    // API Endpoints
    ARCHIVE_API_URL: "https://archive-api.open-meteo.com/v1/archive",
    FORECAST_API_URL: "https://api.open-meteo.com/v1/forecast",
  };

  // ============================================
  // MOCK DATA (Fallback when API unavailable)
  // ============================================
  const MOCK_DATA = {
    generateMonth(year, month) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const data = [];

      // Seasonal temperature baselines
      const tempBases = {
        0: { min: -5, max: 5 }, // January
        1: { min: -3, max: 7 }, // February
        2: { min: 0, max: 12 }, // March
        3: { min: 4, max: 16 }, // April
        4: { min: 8, max: 20 }, // May
        5: { min: 12, max: 24 }, // June
        6: { min: 15, max: 28 }, // July
        7: { min: 14, max: 27 }, // August
        8: { min: 10, max: 21 }, // September
        9: { min: 6, max: 14 }, // October
        10: { min: 2, max: 9 }, // November
        11: { min: -2, max: 5 }, // December
      };

      const base = tempBases[month] || tempBases[6];

      for (let day = 1; day <= daysInMonth; day++) {
        const variance = Math.random() * 6 - 3;
        const tempMin = base.min + variance + Math.random() * 3;
        const tempMax = base.max + variance + Math.random() * 4;
        const tempAvg = (tempMin + tempMax) / 2;

        data.push({
          date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          temp_max: Math.round(tempMax * 10) / 10,
          temp_min: Math.round(tempMin * 10) / 10,
          temp_avg: Math.round(tempAvg * 10) / 10,
          precip:
            Math.random() < 0.3 ? Math.round(Math.random() * 15 * 10) / 10 : 0,
          wind_speed: Math.round((5 + Math.random() * 30) * 10) / 10,
          humidity: Math.round(40 + Math.random() * 50),
          sunshine: Math.round(Math.random() * 12 * 10) / 10,
          weather_code:
            Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 95),
        });
      }

      return data;
    },

    generateRange(startDate, endDate) {
      const data = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      let current = new Date(start);
      while (current <= end) {
        const monthData = this.generateMonth(
          current.getFullYear(),
          current.getMonth(),
        );
        const dayOfMonth = current.getDate();
        if (monthData[dayOfMonth - 1]) {
          data.push(monthData[dayOfMonth - 1]);
        }
        current.setDate(current.getDate() + 1);
      }

      return data;
    },
  };

  // ============================================
  // DATA PIPELINE - Central Data Management
  // ============================================
  class DataPipeline {
    constructor() {
      this._cache = new Map();
      this._pendingRequests = new Map();
    }

    /**
     * Load historical data for a specific year/month
     * Tries API first, falls back to mock data
     *
     * @param {number} year - Full year (e.g., 2025)
     * @param {number} month - Zero-indexed month (0-11)
     * @param {Object} location - { lat, lon } coordinates
     * @returns {Promise<Array>} - Normalized weather data
     */
    async loadHistoricalData(year, month, location) {
      const cacheKey = `data_${year}_${month}_${location.lat}_${location.lon}`;

      // Check cache
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        console.log(`📦 [DataPipeline] Cache hit: ${cacheKey}`);
        return cached;
      }

      // Prevent duplicate requests
      if (this._pendingRequests.has(cacheKey)) {
        return this._pendingRequests.get(cacheKey);
      }

      const promise = this._fetchData(year, month, location, cacheKey);
      this._pendingRequests.set(cacheKey, promise);

      try {
        return await promise;
      } finally {
        this._pendingRequests.delete(cacheKey);
      }
    }

    async _fetchData(year, month, location, cacheKey) {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

      try {
        // Try WeatherDataService first
        const dataService = getWeatherDataService();
        if (dataService?.loadHistory) {
          console.log(
            `🌐 [DataPipeline] Using WeatherDataService: ${startDate} to ${endDate}`,
          );
          const data = await dataService.loadHistory(
            location.lat,
            location.lon,
            startDate,
            endDate,
          );
          if (data && data.length > 0) {
            this._setCache(cacheKey, data);
            return data;
          }
        }

        // Direct API call fallback
        const data = await this._fetchFromAPI(
          location.lat,
          location.lon,
          startDate,
          endDate,
        );
        if (data && data.length > 0) {
          this._setCache(cacheKey, data);
          return data;
        }
      } catch (error) {
        console.warn(`⚠️ [DataPipeline] API fetch failed:`, error);
      }

      // Final fallback: Mock data
      console.log(`📊 [DataPipeline] Using mock data for ${year}-${month + 1}`);
      const mockData = MOCK_DATA.generateMonth(year, month);
      this._setCache(cacheKey, mockData);
      return mockData;
    }

    async _fetchFromAPI(lat, lon, startDate, endDate) {
      const url = new URL(CONFIG.ARCHIVE_API_URL);
      url.searchParams.set("latitude", lat);
      url.searchParams.set("longitude", lon);
      url.searchParams.set("start_date", startDate);
      url.searchParams.set("end_date", endDate);
      url.searchParams.set(
        "daily",
        [
          "temperature_2m_max",
          "temperature_2m_min",
          "temperature_2m_mean",
          "precipitation_sum",
          "wind_speed_10m_max",
          "relative_humidity_2m_mean",
          "sunshine_duration",
          "weather_code",
        ].join(","),
      );
      url.searchParams.set("timezone", "Europe/Berlin");

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const raw = await response.json();
      return this._normalizeAPIResponse(raw);
    }

    _normalizeAPIResponse(data) {
      if (!data?.daily?.time) return [];

      const { daily } = data;
      return daily.time.map((date, i) => ({
        date,
        temp_max: daily.temperature_2m_max?.[i] ?? null,
        temp_min: daily.temperature_2m_min?.[i] ?? null,
        temp_avg: daily.temperature_2m_mean?.[i] ?? null,
        precip: daily.precipitation_sum?.[i] ?? 0,
        wind_speed: daily.wind_speed_10m_max?.[i] ?? 0,
        humidity: daily.relative_humidity_2m_mean?.[i] ?? null,
        sunshine: daily.sunshine_duration?.[i]
          ? Math.round((daily.sunshine_duration[i] / 3600) * 10) / 10
          : 0,
        weather_code: daily.weather_code?.[i] ?? null,
      }));
    }

    /**
     * Load data for a date range
     */
    async loadDateRange(startDate, endDate, location) {
      const cacheKey = `range_${startDate}_${endDate}_${location.lat}_${location.lon}`;

      const cached = this._getFromCache(cacheKey);
      if (cached) return cached;

      try {
        const dataService = getWeatherDataService();
        if (dataService?.loadHistory) {
          const data = await dataService.loadHistory(
            location.lat,
            location.lon,
            startDate,
            endDate,
          );
          if (data?.length > 0) {
            this._setCache(cacheKey, data);
            return data;
          }
        }

        const data = await this._fetchFromAPI(
          location.lat,
          location.lon,
          startDate,
          endDate,
        );
        if (data?.length > 0) {
          this._setCache(cacheKey, data);
          return data;
        }
      } catch (error) {
        console.warn(`⚠️ [DataPipeline] Range fetch failed:`, error);
      }

      // Mock fallback
      const mockData = MOCK_DATA.generateRange(startDate, endDate);
      this._setCache(cacheKey, mockData);
      return mockData;
    }

    /**
     * Load hourly data for a date range (for day/hour comparisons)
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {object} location - {lat, lon}
     * @returns {Promise<Array>} - Array of hourly data points
     */
    async loadHourlyDateRange(startDate, endDate, location) {
      const cacheKey = `hourly_${startDate}_${endDate}_${location.lat}_${location.lon}`;

      const cached = this._getFromCache(cacheKey);
      if (cached) {
        console.log(
          `✅ [DataPipeline] Hourly data from cache: ${startDate} to ${endDate}`,
        );
        return cached;
      }

      try {
        const dataService = getWeatherDataService();
        if (dataService?.loadHourlyHistory) {
          console.log(
            `🌐 [DataPipeline] Loading hourly data: ${startDate} to ${endDate}`,
          );
          const result = await dataService.loadHourlyHistory(
            location.lat,
            location.lon,
            startDate,
            endDate,
          );

          if (
            result &&
            !result.error &&
            result.hourly &&
            result.hourly.length > 0
          ) {
            console.log(
              `✅ [DataPipeline] Hourly data loaded: ${result.hourly.length} hours from ${result.source}`,
            );
            this._setCache(cacheKey, result.hourly);
            return result.hourly;
          }

          console.warn(
            `⚠️ [DataPipeline] Hourly data load returned no data or error: ${result?.error}`,
          );
        }
      } catch (error) {
        console.error(`❌ [DataPipeline] Hourly data load failed:`, error);
      }

      // Fallback: Try to load daily data and convert to pseudo-hourly
      console.log(
        `📊 [DataPipeline] Falling back to daily data for ${startDate} to ${endDate}`,
      );
      try {
        const dailyData = await this.loadDateRange(
          startDate,
          endDate,
          location,
        );
        if (dailyData && dailyData.length > 0) {
          // Convert daily to pseudo-hourly (one entry per day at noon)
          const pseudoHourly = dailyData.map((day) => ({
            timestamp: `${day.date}T12:00:00`,
            date: day.date,
            hour: 12,
            temp: day.temp_avg,
            temp_avg: day.temp_avg,
            temp_min: day.temp_min,
            temp_max: day.temp_max,
            precip: day.precip,
            wind_speed: day.wind_speed,
            humidity: day.humidity,
            _dailyFallback: true,
          }));

          this._setCache(cacheKey, pseudoHourly);
          return pseudoHourly;
        }
      } catch (fallbackError) {
        console.error(
          `❌ [DataPipeline] Daily fallback also failed:`,
          fallbackError,
        );
      }

      // Final fallback: Empty array
      console.warn(
        `⚠️ [DataPipeline] No hourly data available for ${startDate} to ${endDate}`,
      );
      return [];
    }

    _getFromCache(key) {
      const entry = this._cache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expires) {
        this._cache.delete(key);
        return null;
      }
      return entry.data;
    }

    _setCache(key, data) {
      this._cache.set(key, {
        data,
        expires: Date.now() + CONFIG.CACHE_TTL,
      });
    }

    clearCache() {
      this._cache.clear();
      console.log("🗑️ [DataPipeline] Cache cleared");
    }
  }

  // ============================================
  // GLOBALER APP-STANDORT HELPER
  // ============================================
  function getGlobalAppLocation() {
    const appState = window.appState;
    if (appState?.currentCity && appState?.currentCoordinates) {
      return {
        id: "global",
        name: appState.currentCity,
        lat: appState.currentCoordinates.lat || 52.52,
        lon: appState.currentCoordinates.lon || 13.41,
      };
    }
    // Fallback
    return {
      id: "fallback",
      name: "Berlin",
      lat: 52.52,
      lon: 13.41,
    };
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  class HistoryState {
    constructor() {
      // Hole initialen Standort aus globalem appState
      const initialLocation = getGlobalAppLocation();

      this._state = {
        currentTab: "analyse",
        currentMetric: "temperature",
        currentPeriod: "30",
        // Nutze den globalen App-Standort
        currentLocation: initialLocation,
        comparisonPeriodA: "januar2025",
        comparisonPeriodB: "januar2026",
        customStartDate: null,
        customEndDate: null,
        currentCalendarDate: new Date(),
        selectedCalendarDay: null,
        selectedExtreme: null,
        // Modal State
        activeModal: null,
        // Data stores
        currentData: [],
        comparisonDataA: [],
        comparisonDataB: [],
        currentStats: null,
        extremes: null,
        insights: [],
        // Status
        isLoading: false,
        isInitialized: false,
        lastError: null,
      };
      this._listeners = new Map();

      // Registriere Listener für globale Standort-Änderungen
      this._setupLocationListener();
    }

    /**
     * Hört auf globale app:locationChanged Events
     */
    _setupLocationListener() {
      document.addEventListener("app:locationChanged", (event) => {
        const { lat, lon, label } = event.detail || {};
        if (lat && lon) {
          this.set("currentLocation", {
            id: "global",
            name: label || "Standort",
            lat: lat,
            lon: lon,
          });
        }
      });
    }

    get(key) {
      return key ? this._state[key] : { ...this._state };
    }

    set(key, value) {
      const oldValue = this._state[key];
      this._state[key] = value;
      this._notify(key, value, oldValue);
    }

    batch(updates) {
      Object.entries(updates).forEach(([key, value]) => {
        this._state[key] = value;
      });
      // Notify all at once
      Object.entries(updates).forEach(([key, value]) => {
        this._notify(key, value, undefined);
      });
    }

    _notify(key, newValue, oldValue) {
      if (this._listeners.has(key)) {
        this._listeners.get(key).forEach((cb) => {
          try {
            cb(newValue, oldValue);
          } catch (e) {
            console.error("[HistoryState] Listener error:", e);
          }
        });
      }
    }

    subscribe(key, callback) {
      if (!this._listeners.has(key)) {
        this._listeners.set(key, new Set());
      }
      this._listeners.get(key).add(callback);
      return () => this._listeners.get(key)?.delete(callback);
    }

    reset() {
      this._state.selectedCalendarDay = null;
      this._state.selectedExtreme = null;
      this._state.isLoading = false;
      this._state.lastError = null;
    }

    /**
     * Memory cleanup - call when switching views
     */
    clearDataStores() {
      this._state.currentData = [];
      this._state.comparisonDataA = [];
      this._state.comparisonDataB = [];
      this._state.currentStats = null;
      this._state.extremes = null;
      this._state.insights = [];
      console.log("🧹 [HistoryState] Data stores cleared");
    }
  }

  // ============================================
  // HISTORY CONTROLLER
  // ============================================
  class HistoryController {
    constructor() {
      this.state = new HistoryState();
      this.dataPipeline = new DataPipeline();
      this.container = null;
      this._boundHandlers = new Map();
      this._viewInstance = null;
    }

    // ========================================
    // LIFECYCLE
    // ========================================

    /**
     * Initialize the History page - called explicitly when user navigates to History.
     * NO Mutation Observer - explicit call from app.js navigation handler.
     *
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {Object} options.location - Current location coordinates
     */
    async init(options = {}) {
      console.log("🚀 [HistoryController] History-Initialisierung gestartet");

      this.container =
        options.container || document.getElementById(CONFIG.containerId);
      if (!this.container) {
        console.error(
          "[HistoryController] Container not found:",
          CONFIG.containerId,
        );
        return;
      }

      // Set initial location if provided
      if (options.location) {
        this.state.set("currentLocation", {
          ...this.state.get("currentLocation"),
          ...options.location,
        });
      }

      // Ensure modal container exists
      this._ensureModalContainer();

      // Initialize the view instance
      if (global.HistoryView) {
        this._viewInstance = new global.HistoryView({
          containerId: CONFIG.containerId,
          controller: this, // Pass controller reference for modal routing
        });
        console.log("✅ [HistoryController] View instance created");
      }

      // ========================================
      // DATEN-SYNCHRONITÄT: Auto-Update bei State-Änderungen
      // ========================================
      this._setupStateSubscriptions();

      this.state.set("isInitialized", true);
      console.log("✅ [HistoryController] Initialized - ready for render()");

      // Event-Delegation am #history-section Container einrichten
      this._setupEventDelegation();

      // KRITISCH: Initiales Render explizit aufrufen
      if (
        this._viewInstance &&
        typeof this._viewInstance.render === "function"
      ) {
        console.error("INIT CALLING RENDER NOW");
        await this._viewInstance.render();
      }
    }

    /**
     * Setup Event-Delegation am #history-section Container.
     * WICHTIG: Da Karten dynamisch gerendert werden, müssen Klicks
     * via .closest() am Container abgefangen werden.
     */
    _setupEventDelegation() {
      const section = document.getElementById("history-section");
      if (!section) {
        console.warn(
          "[HistoryController] #history-section not found for event delegation",
        );
        return;
      }

      // Vermeide doppelte Listener
      if (section.dataset.delegationBound === "true") {
        return;
      }
      section.dataset.delegationBound = "true";

      // Zentraler Click-Handler via Event-Delegation
      section.addEventListener("click", async (e) => {
        // Lifecycle-Check
        if (!this.state.get("isInitialized")) {
          console.warn("[HistoryController] Click ignored - not initialized");
          return;
        }

        // Extreme-Card Klick
        const extremeCard = e.target.closest(".extreme-card");
        if (extremeCard) {
          e.preventDefault();
          e.stopPropagation();

          const extremeId = extremeCard.dataset.extremeId;
          const extremeType = extremeCard.dataset.extremeType;
          const extremeDate = extremeCard.dataset.extremeDate;

          console.log("[HistoryController] Extreme card clicked:", {
            extremeId,
            extremeType,
            extremeDate,
          });

          // Extreme-Daten laden und Modal öffnen
          await this._handleExtremeCardClick({
            id: extremeId,
            type: extremeType,
            date: extremeDate,
          });
          return;
        }

        // Metric-Card Klick (falls clickable)
        const metricCard = e.target.closest(".metric-card--clickable");
        if (metricCard) {
          const action = metricCard.dataset.action;
          if (action) {
            console.log("[HistoryController] Metric card action:", action);
            this._handleMetricCardAction(action);
          }
          return;
        }

        // Modal-Overlay Klick (zum Schließen)
        const overlay = e.target.closest(".modal-overlay");
        if (overlay && !e.target.closest(".modal")) {
          this.closeModal();
          return;
        }

        // Close-Button in Modal
        const closeBtn = e.target.closest('[data-action="close"]');
        if (closeBtn) {
          this.closeModal();
          return;
        }
      });

      // Keyboard-Handler für Accessibility (ESC schließt Modal)
      section.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.state.get("activeModal")) {
          this.closeModal();
        }
      });

      console.log(
        "✅ [HistoryController] Event delegation bound to #history-section",
      );
    }

    /**
     * Handle Extreme-Card Klick
     * OPTIMIERT: Instant Feedback mit Skeleton, dann progressive Hydration
     * @private
     */
    async _handleExtremeCardClick(extremeInfo) {
      const { id, type, date } = extremeInfo;

      // 1. SOFORT: Modal mit Skeleton öffnen (Instant Feedback)
      this._openExtremeModalWithSkeleton(type);

      // 2. PARALLEL: Daten laden
      const extremeData = await this._loadExtremeData(id, type, date);

      if (!extremeData) {
        console.warn(
          "[HistoryController] Extreme data not found for:",
          extremeInfo,
        );
        // Modal schließen bei Fehler
        this.closeModal();
        return;
      }

      // 3. State für selectedExtreme setzen
      this.state.set("selectedExtreme", {
        id,
        type,
        date,
        data: extremeData,
      });

      // 4. PROGRESSIVE HYDRATION: Skeleton durch echte Daten ersetzen
      await this._hydrateExtremeModal(extremeData, type, date);
    }

    /**
     * Öffnet das Extreme-Modal sofort mit Skeleton-Loader
     * @private
     */
    _openExtremeModalWithSkeleton(type) {
      const typeIcons = {
        hot: "local_fire_department",
        cold: "ac_unit",
        rain: "rainy",
        wind: "storm",
      };
      const typeTitles = {
        hot: "Heißester Tag",
        cold: "Kältester Tag",
        rain: "Nassester Tag",
        wind: "Stürmischster Tag",
      };

      const skeletonContent = `
        <div class="history-modal__content history-modal__content--extreme history-modal__content--loading">
          <div class="swipe-handle"></div>
          <button class="history-modal__close" data-action="close" aria-label="Schließen">
            <span class="material-symbols-outlined">close</span>
          </button>

          <!-- Header mit echtem Icon (bekannt durch type) -->
          <div class="extreme-detail__header extreme-detail__header--${type}">
            <div class="extreme-detail__icon">
              <span class="material-symbols-outlined">${typeIcons[type] || "thermostat"}</span>
            </div>
            <div class="extreme-detail__title-group">
              <h3>${typeTitles[type] || "Extremwert"}</h3>
              <span class="extreme-detail__value skeleton skeleton--text" style="width: 80px; height: 24px;"></span>
            </div>
          </div>

          <!-- Info Skeleton -->
          <div class="extreme-detail__info">
            <div class="extreme-detail__row">
              <span class="material-symbols-outlined">calendar_today</span>
              <span class="skeleton skeleton--text" style="width: 120px;"></span>
            </div>
            <div class="extreme-detail__row">
              <span class="material-symbols-outlined">location_on</span>
              <span class="skeleton skeleton--text" style="width: 100px;"></span>
            </div>
          </div>

          <!-- Chart Skeleton -->
          <div class="extreme-detail__chart extreme-detail__chart--skeleton">
            <div class="skeleton skeleton--chart" style="width: 100%; height: 120px; border-radius: 8px;"></div>
          </div>

          <!-- Metrics Skeleton Grid -->
          <div class="extreme-detail__metrics">
            ${this._renderMetricSkeleton()}
            ${this._renderMetricSkeleton()}
            ${this._renderMetricSkeleton()}
            ${this._renderMetricSkeleton()}
            ${this._renderMetricSkeleton()}
          </div>

          <!-- Loading Indicator -->
          <div class="extreme-detail__loading">
            <div class="loading-spinner"></div>
            <span>Daten werden geladen...</span>
          </div>
        </div>
      `;

      // Modal-Element erstellen/aktualisieren
      const modalId = "history-modal-extreme";
      const modalElement = this._createOrGetModal(modalId, skeletonContent);

      // Modal sofort öffnen
      this.toggleModal(modalId, true);

      console.log("[HistoryController] Extreme modal opened with skeleton");
    }

    /**
     * Rendert einen einzelnen Metric-Skeleton
     * @private
     */
    _renderMetricSkeleton() {
      return `
        <div class="extreme-detail__metric extreme-detail__metric--skeleton">
          <span class="material-symbols-outlined" style="opacity: 0.3;">hourglass_empty</span>
          <div class="extreme-detail__metric-data">
            <span class="skeleton skeleton--text" style="width: 60px; height: 12px;"></span>
            <span class="skeleton skeleton--text" style="width: 50px; height: 16px; margin-top: 4px;"></span>
          </div>
        </div>
      `;
    }

    /**
     * Lädt Extreme-Daten aus State oder berechnet sie
     * @private
     */
    async _loadExtremeData(id, type, date) {
      // Extreme-Daten aus State holen
      const extremes = this.state.get("extremes");
      const currentData = this.state.get("currentData") || [];

      let extremeData = null;

      if (extremes) {
        // Suche nach Typ
        const typeMap = {
          hot: "hottestDay",
          cold: "coldestDay",
          rain: "wettestDay",
          wind: "windiestDay",
        };
        extremeData = extremes[typeMap[type]] || null;
      }

      // Fallback: Suche in currentData nach Datum
      if (!extremeData && date) {
        extremeData = currentData.find((d) => d.date === date) || null;
      }

      // Falls keine Daten: Versuche async zu laden
      if (!extremeData && currentData.length > 0) {
        const stats = getStatsManager();
        if (stats?.findExtremes) {
          const freshExtremes = stats.findExtremes(currentData);
          this.state.set("extremes", freshExtremes);

          const typeMap = {
            hot: "hottestDay",
            cold: "coldestDay",
            rain: "wettestDay",
            wind: "windiestDay",
          };
          extremeData = freshExtremes?.[typeMap[type]] || null;
        }
      }

      return extremeData;
    }

    /**
     * Hydratisiert das Extreme-Modal mit echten Daten
     * Ersetzt Skeleton durch echte Werte mit Animation
     * @private
     */
    async _hydrateExtremeModal(extremeData, type, date) {
      const modalElement = document.getElementById("history-modal-extreme");
      if (!modalElement) return;

      const stats = getStatsManager();
      const location = this.state.get("currentLocation");

      // Extreme-Objekt für Template aufbauen
      const typeIcons = {
        hot: "local_fire_department",
        cold: "ac_unit",
        rain: "rainy",
        wind: "storm",
      };
      const typeTitles = {
        hot: "Heißester Tag",
        cold: "Kältester Tag",
        rain: "Nassester Tag",
        wind: "Stürmischster Tag",
      };
      const typeValues = {
        hot: `${extremeData.temp_max?.toFixed(1) ?? "–"}°C`,
        cold: `${extremeData.temp_min?.toFixed(1) ?? "–"}°C`,
        rain: `${extremeData.precip?.toFixed(1) ?? "0"} mm`,
        wind: `${extremeData.wind_speed?.toFixed(0) ?? "–"} km/h`,
      };

      const extreme = {
        type,
        icon: typeIcons[type],
        title: typeTitles[type],
        value: typeValues[type],
        dateFormatted: new Date(extremeData.date).toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        data: extremeData,
      };

      // Vollständiges Modal-Content rendern
      // Nutze das erweiterte Modal wenn verfügbar
      const fullContent = stats?.renderExtremeDetailModalEnhanced
        ? stats.renderExtremeDetailModalEnhanced(extreme, location)
        : stats?.renderExtremeDetailModal
          ? stats.renderExtremeDetailModal(extreme, location)
          : this._renderFallbackExtremeContent(extreme, location);

      // SMOOTH TRANSITION: Fade out skeleton, fade in content
      const contentContainer = modalElement.querySelector(
        ".history-modal__content",
      );
      if (contentContainer) {
        contentContainer.classList.add("history-modal__content--hydrating");

        // Kurze Verzögerung für Animation
        await new Promise((r) => setTimeout(r, 150));

        // Content ersetzen
        modalElement.innerHTML = fullContent;

        // Fade in
        const newContent = modalElement.querySelector(
          ".history-modal__content",
        );
        if (newContent) {
          newContent.classList.add("history-modal__content--hydrated");
        }
      } else {
        modalElement.innerHTML = fullContent;
      }

      // Event-Bindings für neues Content
      this._bindModalEvents("extreme", modalElement, { extreme, location });

      // Mini-Chart zeichnen (wenn Chart-Manager verfügbar)
      const charts = getChartManager();
      if (charts?.drawExtremeMiniChart && extremeData) {
        requestAnimationFrame(() => {
          const canvas = modalElement.querySelector(
            "#history-extreme-mini-chart",
          );
          if (canvas) {
            charts.drawExtremeMiniChart(canvas, extremeData, type);
          }
        });
      }

      console.log("[HistoryController] Extreme modal hydrated with real data");
    }

    /**
     * Fallback-Rendering wenn HistoryStats nicht verfügbar
     * @private
     */
    _renderFallbackExtremeContent(extreme, location) {
      const data = extreme.data || {};
      return `
        <div class="history-modal__content history-modal__content--extreme">
          <div class="swipe-handle"></div>
          <button class="history-modal__close" data-action="close" aria-label="Schließen">
            <span class="material-symbols-outlined">close</span>
          </button>

          <div class="extreme-detail__header extreme-detail__header--${extreme.type}">
            <div class="extreme-detail__icon">
              <span class="material-symbols-outlined">${extreme.icon}</span>
            </div>
            <div class="extreme-detail__title-group">
              <h3>${extreme.title}</h3>
              <span class="extreme-detail__value">${extreme.value}</span>
            </div>
          </div>

          <div class="extreme-detail__info">
            <div class="extreme-detail__row">
              <span class="material-symbols-outlined">calendar_today</span>
              <span>${extreme.dateFormatted}</span>
            </div>
            <div class="extreme-detail__row">
              <span class="material-symbols-outlined">location_on</span>
              <span>${location?.name || "Berlin"}</span>
            </div>
          </div>

          <div class="extreme-detail__metrics">
            <div class="extreme-detail__metric">
              <span class="material-symbols-outlined">device_thermostat</span>
              <div class="extreme-detail__metric-data">
                <span class="extreme-detail__metric-label">Temperatur</span>
                <span class="extreme-detail__metric-value">${data.temp_min?.toFixed(1) ?? "–"}° / ${data.temp_max?.toFixed(1) ?? "–"}°C</span>
              </div>
            </div>
            <div class="extreme-detail__metric">
              <span class="material-symbols-outlined">water_drop</span>
              <div class="extreme-detail__metric-data">
                <span class="extreme-detail__metric-label">Niederschlag</span>
                <span class="extreme-detail__metric-value">${data.precip?.toFixed(1) ?? "0"} mm</span>
              </div>
            </div>
            <div class="extreme-detail__metric">
              <span class="material-symbols-outlined">air</span>
              <div class="extreme-detail__metric-data">
                <span class="extreme-detail__metric-label">Wind</span>
                <span class="extreme-detail__metric-value">${data.wind_speed?.toFixed(0) ?? "–"} km/h</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Handle Metric-Card Action
     * @private
     */
    _handleMetricCardAction(action) {
      switch (action) {
        case "open-temperature-detail":
          this.openModal("dayDetail", { metric: "temperature" });
          break;
        case "open-precipitation-detail":
          this.openModal("dayDetail", { metric: "precipitation" });
          break;
        case "open-extreme":
          // Tab wechseln zu Extreme
          this.state.set("currentTab", "extreme");
          break;
        default:
          console.log("[HistoryController] Unknown metric action:", action);
      }
    }

    /**
     * Setup state subscriptions für automatische View-Updates
     * KRITISCH: Wenn Kalender-Monat sich ändert, lade neue Daten UND aktualisiere View
     */
    _setupStateSubscriptions() {
      // Bei Kalender-Datum-Änderung: Neue Daten laden
      this.state.subscribe("currentCalendarDate", async (newDate) => {
        if (!newDate || !this._viewInstance) return;
        console.log("📅 [HistoryController] Kalender-Monat geändert:", newDate);

        // Neue Monats-Daten laden
        const year = newDate.getFullYear();
        const month = newDate.getMonth();
        await this.loadHistoricalData(year, month);

        // View aktualisieren
        if (this._viewInstance._loadTabWithSkeleton) {
          await this._viewInstance._loadTabWithSkeleton();
        }
      });

      // Bei Tab-Wechsel: View neu rendern
      this.state.subscribe("currentTab", async (newTab) => {
        if (!this._viewInstance) return;
        console.log("🔄 [HistoryController] Tab gewechselt zu:", newTab);

        // View aktualisieren
        if (this._viewInstance._loadTabWithSkeleton) {
          await this._viewInstance._loadTabWithSkeleton();
        }
      });

      // Bei Perioden-Änderung: Neue Daten laden
      this.state.subscribe("currentPeriod", async (newPeriod) => {
        if (!this._viewInstance) return;
        console.log("📊 [HistoryController] Periode geändert zu:", newPeriod);

        // Daten werden in der View geladen, aber wir triggern den Refresh
        if (this._viewInstance._loadTabWithSkeleton) {
          await this._viewInstance._loadTabWithSkeleton();
        }
      });

      // Bei Location-Änderung: Neue Daten laden
      this.state.subscribe("currentLocation", async (newLocation) => {
        if (!this._viewInstance || !newLocation) return;
        console.log(
          "📍 [HistoryController] Standort geändert zu:",
          newLocation.name,
        );

        // Cache leeren für neuen Standort
        this.dataPipeline.clearCache();

        // View aktualisieren
        if (this._viewInstance._loadTabWithSkeleton) {
          await this._viewInstance._loadTabWithSkeleton();
        }
      });
    }

    /**
     * Render the History page - CENTRAL ORCHESTRATION METHOD
     * Called when user navigates to History tab.
     *
     * Flow:
     * 1. Ensure initialization
     * 2. Render base layout with skeletons
     * 3. Load historical data
     * 4. Update UI with real data
     *
     * @param {Array} historyData - Optional preloaded history data
     */
    async render(historyData = []) {
      console.log("🎬 [HistoryController] Render-Zyklus gestartet");

      // NOTFALL-DEBUG: DOM-Check
      console.error(
        "TARGET CONTAINER EXISTS:",
        !!document.getElementById("history-container"),
      );
      console.error("CONTAINER ELEMENT:", this.container);
      console.error(
        "CONTAINER IN DOM:",
        this.container ? document.body.contains(this.container) : false,
      );

      // NOTFALL: Geister-Overlays killen bevor wir rendern
      if (window.MasterUIController?.forceClearOverlays) {
        window.MasterUIController.forceClearOverlays();
      }

      // Step 1: Ensure initialization
      if (!this.state.get("isInitialized")) {
        await this.init();
      }

      // Step 2: Render initial skeletons via Stats component
      const stats = getStatsManager();
      if (stats?.renderInitialSkeletons) {
        stats.renderInitialSkeletons(this.container);
        console.log("⏳ [HistoryController] Skeleton-Platzhalter angezeigt");
      }

      // Step 3: Render the view shell (triggers skeleton inside tabs)
      if (this._viewInstance) {
        await this._viewInstance.render(historyData);
        console.log("✅ [HistoryController] View gerendert");
      }

      // Step 4: If no preloaded data, load current month
      if (!historyData || historyData.length === 0) {
        const now = new Date();
        console.log("📊 [HistoryController] Lade historische Daten...");
        const data = await this.loadHistoricalData(
          now.getFullYear(),
          now.getMonth(),
        );

        if (data && data.length > 0) {
          console.log(`✅ [HistoryController] ${data.length} Tage geladen`);
        } else {
          console.warn("⚠️ [HistoryController] Keine Daten - Fallback aktiv");
        }
      } else {
        // Use preloaded data
        this.state.set("currentData", historyData);
        await this._distributeDataToComponents(historyData);
        console.log(
          `✅ [HistoryController] ${historyData.length} vorgeladene Tage verwendet`,
        );
      }
    }

    /**
     * Load data for a specific year/month and update components
     * This is the CENTRAL DATA PIPELINE method
     *
     * @param {number} year - Full year (e.g., 2025)
     * @param {number} month - Zero-indexed month (0-11)
     * @returns {Promise<Array>} - The loaded data
     */
    async loadHistoricalData(year, month) {
      const location = this.state.get("currentLocation");

      this.state.set("isLoading", true);
      console.log(`📊 [HistoryController] Loading data: ${year}-${month + 1}`);

      try {
        const data = await this.dataPipeline.loadHistoricalData(
          year,
          month,
          location,
        );

        // Store and distribute to components
        this.state.set("currentData", data);
        await this._distributeDataToComponents(data);

        console.log(`✅ [HistoryController] Loaded ${data.length} days`);
        return data;
      } catch (error) {
        console.error("[HistoryController] Load failed:", error);
        this.state.set("lastError", error.message);
        return [];
      } finally {
        this.state.set("isLoading", false);
      }
    }

    /**
     * Load data for a custom date range
     */
    async loadDateRange(startDate, endDate) {
      const location = this.state.get("currentLocation");

      this.state.set("isLoading", true);
      this.state.batch({
        customStartDate: startDate,
        customEndDate: endDate,
      });

      try {
        const data = await this.dataPipeline.loadDateRange(
          startDate,
          endDate,
          location,
        );
        this.state.set("currentData", data);
        await this._distributeDataToComponents(data);
        return data;
      } catch (error) {
        console.error("[HistoryController] Range load failed:", error);
        this.state.set("lastError", error.message);
        return [];
      } finally {
        this.state.set("isLoading", false);
      }
    }

    /**
     * Load comparison data for two periods
     */
    async loadComparisonData(periodDataA, periodDataB) {
      const location = this.state.get("currentLocation");

      this.state.set("isLoading", true);

      try {
        console.log("[HistoryController] Loading comparison data:", {
          periodDataA,
          periodDataB,
        });

        // Use periodData objects with startDate/endDate or fall back to old period strings
        const [dataA, dataB] = await Promise.all([
          this._loadPeriodData(periodDataA, location),
          this._loadPeriodData(periodDataB, location),
        ]);

        this.state.batch({
          comparisonDataA: dataA,
          comparisonDataB: dataB,
          periodDataA: periodDataA,
          periodDataB: periodDataB,
        });

        return { dataA, dataB };
      } catch (error) {
        console.error("[HistoryController] Comparison load failed:", error);
        return { dataA: [], dataB: [] };
      } finally {
        this.state.set("isLoading", false);
      }
    }

    async _loadPeriodData(periodData, location) {
      // New format: periodData object with startDate/endDate
      if (
        periodData &&
        typeof periodData === "object" &&
        periodData.startDate
      ) {
        console.log("[HistoryController] Loading date range:", {
          startDate: periodData.startDate,
          endDate: periodData.endDate,
          granularity: periodData.granularity,
        });

        // Check if we should load hourly data (for day comparisons or single day analysis)
        const start = new Date(periodData.startDate);
        const end = new Date(periodData.endDate || periodData.startDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        // Use hourly data for 1-3 day comparisons
        if (daysDiff <= 3) {
          console.log(
            `[HistoryController] Using hourly data for ${daysDiff} day(s)`,
          );
          const hourlyData = await this.dataPipeline.loadHourlyDateRange(
            periodData.startDate,
            periodData.endDate || periodData.startDate,
            location,
          );

          if (hourlyData && hourlyData.length > 0) {
            console.log("[HistoryController] Loaded hourly data:", {
              length: hourlyData.length,
              firstTimestamp: hourlyData[0]?.timestamp,
              lastTimestamp: hourlyData[hourlyData.length - 1]?.timestamp,
              firstTemp: hourlyData[0]?.temp_avg,
              isDailyFallback: hourlyData[0]?._dailyFallback,
            });

            return hourlyData;
          }
        }

        // Use daily data for longer periods
        const data = await this.dataPipeline.loadDateRange(
          periodData.startDate,
          periodData.endDate || periodData.startDate,
          location,
        );

        console.log("[HistoryController] Loaded data:", {
          length: data?.length,
          firstDate: data?.[0]?.date,
          lastDate: data?.[data.length - 1]?.date,
          firstTemp: data?.[0]?.temp_avg,
        });

        return data;
      }

      // Legacy format: period string like "januar2025"
      if (typeof periodData === "string") {
        const parsed = this._parsePeriodString(periodData);
        return await this.dataPipeline.loadHistoricalData(
          parsed.year,
          parsed.month,
          location,
        );
      }

      console.warn("[HistoryController] Invalid period data:", periodData);
      return [];
    }

    _parsePeriodString(periodStr) {
      const monthNames = [
        "januar",
        "februar",
        "märz",
        "april",
        "mai",
        "juni",
        "juli",
        "august",
        "september",
        "oktober",
        "november",
        "dezember",
      ];

      // Match "januar2025" or similar
      const match = periodStr.match(/^([a-zäöü]+)(\d{4})$/i);
      if (match) {
        const monthIndex = monthNames.indexOf(match[1].toLowerCase());
        return {
          month: monthIndex >= 0 ? monthIndex : 0,
          year: parseInt(match[2], 10),
        };
      }

      // Default to current month
      const now = new Date();
      return { month: now.getMonth(), year: now.getFullYear() };
    }

    /**
     * Distribute data to HistoryCharts and HistoryStats
     * Nutzt async-Berechnung für große Datenmengen (>100 Tage)
     */
    async _distributeDataToComponents(data) {
      const stats = getStatsManager();
      const charts = getChartManager();

      if (!data || data.length === 0) return;

      // Calculate statistics (non-blocking für große Datenmengen)
      let calculatedStats = null;

      // Schwellwert: ab 100 Tagen async berechnen
      const ASYNC_THRESHOLD = 100;

      if (data.length > ASYNC_THRESHOLD && stats?.calculateStatsAsync) {
        // Async-Berechnung mit Progress-Indikator
        console.log(
          `📊 [HistoryController] Large dataset (${data.length} days), using async calculation...`,
        );

        try {
          calculatedStats = await stats.calculateStatsAsync(
            data,
            (progress) => {
              // Optional: Progress-Update für UI
              this._updateCalculationProgress?.(progress);
            },
          );
        } catch (err) {
          console.error(
            "[HistoryController] Async stats calculation failed:",
            err,
          );
          // Fallback auf synchrone Berechnung
          calculatedStats = stats?.calculateStats?.(data) ?? null;
        }
      } else if (stats?.calculateStats) {
        // Synchrone Berechnung für kleine Datenmengen
        calculatedStats = stats.calculateStats(data);
      }

      if (calculatedStats) {
        this.state.set("currentStats", calculatedStats);

        // Log Trend-Daten wenn vorhanden
        if (calculatedStats.trends) {
          console.log("📈 [HistoryController] Trends calculated:", {
            temperature: calculatedStats.trends.temperature,
            precipitation: calculatedStats.trends.precipitation,
          });
        }
      }

      // Find extremes
      if (stats?.findExtremes) {
        const extremes = stats.findExtremes(data);
        this.state.set("extremes", extremes);
      }

      // Generate insights with historical data for record detection
      const month = new Date(data[0]?.date || Date.now()).getMonth();
      const monthLabel = stats?.CONFIG?.MONTH_LABELS_DE?.[month] || "";
      const year = new Date(data[0]?.date || Date.now()).getFullYear();
      const periodLabel = `${monthLabel} ${year}`;

      let insights = [];
      if (stats?.generateInsights && calculatedStats) {
        const previousStats = this.state.get("previousStats") || null;
        // Pass full historical data for record detection
        const historicalData = this.state.get("allHistoricalData") || data;
        insights = stats.generateInsights(
          calculatedStats,
          previousStats,
          month,
          historicalData,
        );
        this.state.set("insights", insights);
      }

      // HYDRATE: Replace skeletons with real MetricCards
      if (stats?.hydrateStatsContainer && calculatedStats) {
        const container =
          this.container || document.getElementById(CONFIG.containerId);
        if (container) {
          // Get comparison data for trends (previous period)
          const comparisonStats = this.state.get("previousStats") || null;
          stats.hydrateStatsContainer(
            container,
            calculatedStats,
            comparisonStats,
            month,
          );
        }
      }

      // HYDRATE INSIGHTS: Async after stats are visible
      requestAnimationFrame(() => {
        this._hydrateInsightsAsync(stats, insights, periodLabel);
      });

      console.log("📦 [HistoryController] Data distributed to components");
    }

    /**
     * Asynchronously hydrate insights panel after stats are visible
     * @private
     */
    _hydrateInsightsAsync(stats, insights, periodLabel) {
      if (!stats?.hydrateInsightsContainer) {
        console.warn(
          "[HistoryController] hydrateInsightsContainer not available",
        );
        return;
      }

      // Find or create insights container
      let insightsContainer = document.querySelector(
        ".history-insights-container",
      );

      if (!insightsContainer) {
        // Create container if it doesn't exist
        const mainContainer =
          this.container || document.getElementById(CONFIG.containerId);
        if (mainContainer) {
          insightsContainer = document.createElement("div");
          insightsContainer.className = "history-insights-container";

          // Insert after stats grid
          const statsGrid = mainContainer.querySelector(".history-stats-grid");
          if (statsGrid && statsGrid.parentNode) {
            statsGrid.parentNode.insertBefore(
              insightsContainer,
              statsGrid.nextSibling,
            );
          } else {
            mainContainer.appendChild(insightsContainer);
          }
        }
      }

      if (insightsContainer) {
        // Show skeleton first if insights are loading
        if (stats.renderInsightsSkeleton) {
          insightsContainer.innerHTML = stats.renderInsightsSkeleton();
        }

        // Delay actual hydration slightly for visual effect
        setTimeout(() => {
          stats.hydrateInsightsContainer(
            insightsContainer,
            insights,
            periodLabel,
          );
        }, 200);
      }
    }

    /**
     * Cleanup when leaving History page
     */
    destroy() {
      console.log("[HistoryController] Cleanup...");

      // Close any open modals
      this.closeAllModals();

      // Destroy all charts to prevent memory leaks
      const charts = getChartManager();
      if (charts?.destroyAll) {
        charts.destroyAll();
      }

      // Clear data stores (memory management)
      this.state.clearDataStores();

      // Reset state
      this.state.reset();

      // Clear bound handlers
      this._boundHandlers.clear();
    }

    // ========================================
    // MODAL MANAGEMENT via MasterUIController
    // ========================================

    /**
     * Toggle modal state with body scroll lock.
     * ZENTRALE METHODE für alle Modal-Interaktionen.
     * Nutzt .is-visible Klasse für Animation (opacity/pointer-events)
     *
     * @param {string} id - Modal ID (z.B. 'history-modal-extreme')
     * @param {boolean} isOpen - true = öffnen, false = schließen
     */
    toggleModal(id, isOpen) {
      // Lifecycle-Check: Nur wenn initialisiert
      if (!this.state.get("isInitialized")) {
        console.warn(
          "[HistoryController] toggleModal blocked - not initialized",
        );
        return;
      }

      const modalElement = document.getElementById(id);
      const overlay = document.querySelector(
        ".modal-overlay, .glass-modal-overlay",
      );
      const masterUI = getMasterUI();

      if (isOpen) {
        // State setzen
        this.state.set("activeModal", id);

        // Body-Scroll sperren NUR wenn Modal wirklich existiert
        if (modalElement || masterUI) {
          document.body.classList.add("modal-open");
        }

        // Overlay sichtbar machen (is-visible Klasse)
        if (overlay) {
          overlay.classList.add("is-visible");
        }

        // Modal via MasterUI oder direkt öffnen
        if (masterUI?.openModal) {
          masterUI.openModal(id);
        } else if (modalElement) {
          // Nutze is-visible für Animation
          modalElement.classList.add("is-visible", "modal--open");
        }

        console.log("[HistoryController] Modal opened:", id);
      } else {
        // State zurücksetzen
        this.state.set("activeModal", null);

        // Body-Scroll IMMER wiederherstellen beim Schließen
        document.body.classList.remove("modal-open");

        // Overlay verstecken
        if (overlay) {
          overlay.classList.remove("is-visible");
        }

        // Modal schließen
        if (masterUI?.closeActiveModal) {
          masterUI.closeActiveModal();
        } else if (modalElement) {
          modalElement.classList.remove("is-visible", "modal--open");
        }

        console.log("[HistoryController] Modal closed:", id);
      }
    }

    /**
     * Open a modal using MasterUIController
     * This is the ONLY way modals should be opened in History.
     *
     * @param {string} modalType - Type of modal ('dayDetail', 'extreme', 'location', 'period', 'info', 'customDate')
     * @param {Object} data - Data to pass to the modal
     */
    openModal(modalType, data = {}) {
      // Lifecycle-Check
      if (!this.state.get("isInitialized")) {
        console.warn(
          "[HistoryController] openModal blocked - not initialized. Call init() first.",
        );
        return;
      }

      const masterUI = getMasterUI();
      if (!masterUI) {
        console.error("[HistoryController] MasterUIController not available");
        return;
      }

      // WICHTIG: Für "location" nutzen wir das globale Sheet
      if (modalType === "location") {
        if (masterUI.openSheet) {
          masterUI.openSheet("location-picker");
        } else if (masterUI.openModal) {
          masterUI.openModal("location-picker");
        }
        console.log(
          "[HistoryController] Globales Location-Picker-Sheet geöffnet",
        );
        return;
      }

      // Get modal content from HistoryStats component
      const modalContent = this._getModalContent(modalType, data);
      if (!modalContent) {
        console.warn(
          "[HistoryController] No modal content for type:",
          modalType,
        );
        return;
      }

      // Use MasterUIController.openModal with HTML content
      const modalId = `history-modal-${modalType}`;
      const modalElement = this._createOrGetModal(modalId, modalContent);

      if (modalElement) {
        // Remove all active tooltips before opening modal
        const chartManager = getChartManager();
        if (chartManager?.removeAllTooltips) {
          chartManager.removeAllTooltips();
        }

        // Nutze toggleModal für konsistentes State-Management
        this.toggleModal(modalId, true);

        console.log(
          "[HistoryController] Modal opened via MasterUIController:",
          modalType,
        );

        // Bind modal-specific events after opening
        requestAnimationFrame(() => {
          this._bindModalEvents(modalType, modalElement, data);
        });
      }
    }

    /**
     * Close the currently open history modal
     */
    closeModal() {
      const activeModal = this.state.get("activeModal");
      if (activeModal) {
        this.toggleModal(activeModal, false);
      } else {
        // Fallback für Modals ohne State
        const masterUI = getMasterUI();
        if (masterUI?.closeActiveModal) {
          masterUI.closeActiveModal();
        }
      }
      // IMMER Body-Scroll wiederherstellen beim Schließen
      document.body.classList.remove("modal-open");
    }

    /**
     * Close all history modals
     */
    closeAllModals() {
      const masterUI = getMasterUI();
      if (masterUI?.closeAll) {
        masterUI.closeAll();
      }

      // Body-Scroll wiederherstellen
      document.body.classList.remove("modal-open");
      this.state.set("activeModal", null);

      // Also clean up any legacy modal containers
      const modalContainer = document.getElementById(CONFIG.modalContainerId);
      if (modalContainer) {
        modalContainer.innerHTML = "";
      }
    }

    // ========================================
    // MODAL CONTENT GENERATION
    // ========================================

    _getModalContent(modalType, data) {
      const stats = getStatsManager();

      switch (modalType) {
        case "dayDetail":
          return (
            stats?.renderDayDetailModal?.(data.day, data.metric) ||
            this._renderFallbackDayModal(data)
          );

        case "comparisonDay":
          // Vergleichs-Modal für Tag mit Daten aus beiden Zeiträumen
          return (
            stats?.renderComparisonDayModal?.(
              data.dayA,
              data.dayB,
              data.labelA,
              data.labelB,
              data.metric,
            ) || this._renderFallbackComparisonModal(data)
          );

        case "calendarDay":
          // Kalender-Tag Modal
          return (
            stats?.renderCalendarDayModal?.(data.day, data.metric) ||
            this._renderFallbackCalendarModal(data)
          );

        case "extreme":
          // Versuche zuerst das erweiterte Modal
          return (
            stats?.renderExtremeDetailModalEnhanced?.(
              data.extreme,
              data.location,
            ) ||
            stats?.renderExtremeDetailModal?.(data.extreme, data.location) ||
            this._renderFallbackExtremeModal(data)
          );

        case "location":
          return (
            stats?.renderLocationModal?.(
              data.locations,
              data.currentLocation,
            ) || this._renderFallbackLocationModal(data)
          );

        case "period":
          // Try advanced modal first (with TimeRangeSystem), fallback to basic
          const granularity = data.granularity || "month";
          const lockedGranularity = data.lockedGranularity || null;
          return (
            stats?.renderAdvancedPeriodModal?.(
              data.periodType,
              data.currentPeriod,
              granularity,
              data.periods,
              lockedGranularity,
              null, // currentViewDate (navigation)
              data.currentPeriodData, // vollständige Period-Daten für Highlighting
            ) ||
            stats?.renderPeriodSelectorModal?.(
              data.periods,
              data.currentPeriod,
              data.periodType,
            ) ||
            this._renderFallbackPeriodModal(data)
          );

        case "info":
          return stats?.renderInfoModal?.() || this._renderFallbackInfoModal();

        case "customDate":
          return (
            stats?.renderCustomDateModal?.(data.startDate, data.endDate) ||
            this._renderFallbackCustomDateModal(data)
          );

        default:
          console.warn("[HistoryController] Unknown modal type:", modalType);
          return null;
      }
    }

    /**
     * Attach event listeners for period selector modals
     * Handles all granularity-specific UI components
     */
    _attachPeriodSelectorListeners(modalElement, data) {
      // Helper function to extract period data and call onSelect
      const handlePeriodSelection = async (element) => {
        const periodId = element.dataset.periodId;

        console.log("[HistoryController] Period selected:", {
          periodId,
          startDate: element.dataset.startDate,
          endDate: element.dataset.endDate,
          granularity: element.dataset.granularity,
          hasOnSelect: !!data.onSelect,
        });

        if (data.onSelect) {
          const periodData = {
            id: periodId,
            startDate: element.dataset.startDate,
            endDate: element.dataset.endDate,
            granularity: element.dataset.granularity,
          };

          console.log("[HistoryController] Calling onSelect with:", periodData);
          try {
            await data.onSelect(periodId, periodData);
            console.log(
              "[HistoryController] onSelect completed, closing modal",
            );
            this.closeModal();
          } catch (error) {
            console.error("[HistoryController] onSelect failed:", error);
            // Don't close modal on error
          }
        } else {
          console.warn(
            "[HistoryController] No onSelect callback provided - not closing modal",
          );
          return; // Don't close modal if no callback
        }
      };

      // Standard period items
      modalElement.querySelectorAll(".period-item").forEach((item) => {
        item.addEventListener("click", () => handlePeriodSelection(item));
      });

      // Time Picker Items (Hours)
      modalElement.querySelectorAll(".time-picker__item").forEach((item) => {
        item.addEventListener("click", () => handlePeriodSelection(item));
      });

      // Day Calendar Cells
      modalElement
        .querySelectorAll(".day-calendar__cell:not(.day-calendar__cell--empty)")
        .forEach((cell) => {
          cell.addEventListener("click", () => handlePeriodSelection(cell));
        });

      // Week Calendar Weeks
      modalElement.querySelectorAll(".week-calendar__week").forEach((week) => {
        week.addEventListener("click", () => handlePeriodSelection(week));
      });

      // Month Grid Items
      modalElement.querySelectorAll(".month-grid__item").forEach((item) => {
        item.addEventListener("click", () => handlePeriodSelection(item));
      });

      // Year Picker Items
      modalElement.querySelectorAll(".year-picker__item").forEach((item) => {
        item.addEventListener("click", () => handlePeriodSelection(item));
      });

      // Decade List Items
      modalElement.querySelectorAll(".decade-list__item").forEach((item) => {
        item.addEventListener("click", () => handlePeriodSelection(item));
      });

      // Century List Items
      modalElement.querySelectorAll(".century-list__item").forEach((item) => {
        item.addEventListener("click", () => handlePeriodSelection(item));
      });

      // Granularity tab clicks
      modalElement.querySelectorAll(".granularity-tab").forEach((tab) => {
        tab.addEventListener("click", async () => {
          const granularity = tab.dataset.granularity;
          const periodType = tab.dataset.periodType;

          if (data.onGranularityChange) {
            await data.onGranularityChange(granularity, periodType);
          }

          // Reload modal content with synchronized granularity
          // WICHTIG: Beide Perioden haben jetzt die gleiche Granularität
          this._reloadPeriodModal(modalElement, {
            ...data,
            granularity: granularity,
            lockedGranularity: granularity, // Beide synchronisiert
          });
        });
      });

      // Navigation buttons for calendars (prev/next month/year)
      this._attachNavigationHandlers(modalElement, data);

      // Preset buttons (if any)
      modalElement.querySelectorAll(".period-preset-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const presetId = btn.dataset.presetId;
          const startDate = btn.dataset.startDate;
          const endDate = btn.dataset.endDate;
          const periodType = btn.dataset.periodType;

          if (data.onPresetSelect) {
            await data.onPresetSelect({
              presetId,
              startDate,
              endDate,
              periodType,
            });
          }
          this.closeModal();
        });
      });

      // Custom range button
      const customRangeBtn = modalElement.querySelector(
        '[data-action="custom-range"]',
      );
      if (customRangeBtn) {
        customRangeBtn.addEventListener("click", () => {
          const periodType = customRangeBtn.dataset.periodType;
          this.closeModal();
          setTimeout(() => {
            this.openCustomDateModal(periodType);
          }, 150);
        });
      }
    }

    /**
     * Attach navigation handlers for calendar views (prev/next month/year)
     */
    _attachNavigationHandlers(modalElement, data) {
      // Initialize current view state if not exists
      if (!this._calendarViewState) {
        this._calendarViewState = {
          currentYear: new Date().getFullYear(),
          currentMonth: new Date().getMonth(),
        };
      }

      // Day Calendar: prev/next month
      const dayPrevBtn = modalElement.querySelector(
        '.day-calendar__nav[data-action="prev-month"]',
      );
      const dayNextBtn = modalElement.querySelector(
        '.day-calendar__nav[data-action="next-month"]',
      );

      if (dayPrevBtn) {
        dayPrevBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent triggering parent handlers
          this._calendarViewState.currentMonth--;
          if (this._calendarViewState.currentMonth < 0) {
            this._calendarViewState.currentMonth = 11;
            this._calendarViewState.currentYear--;
          }
          this._reloadPeriodModalWithDate(modalElement, data);
        });
      }

      if (dayNextBtn) {
        dayNextBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent triggering parent handlers
          this._calendarViewState.currentMonth++;
          if (this._calendarViewState.currentMonth > 11) {
            this._calendarViewState.currentMonth = 0;
            this._calendarViewState.currentYear++;
          }
          this._reloadPeriodModalWithDate(modalElement, data);
        });
      }

      // Week Calendar: prev/next month
      const weekPrevBtn = modalElement.querySelector(
        '.week-calendar__nav[data-action="prev-month"]',
      );
      const weekNextBtn = modalElement.querySelector(
        '.week-calendar__nav[data-action="next-month"]',
      );

      if (weekPrevBtn) {
        weekPrevBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent triggering parent handlers
          this._calendarViewState.currentMonth--;
          if (this._calendarViewState.currentMonth < 0) {
            this._calendarViewState.currentMonth = 11;
            this._calendarViewState.currentYear--;
          }
          this._reloadPeriodModalWithDate(modalElement, data);
        });
      }

      if (weekNextBtn) {
        weekNextBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent triggering parent handlers
          this._calendarViewState.currentMonth++;
          if (this._calendarViewState.currentMonth > 11) {
            this._calendarViewState.currentMonth = 0;
            this._calendarViewState.currentYear++;
          }
          this._reloadPeriodModalWithDate(modalElement, data);
        });
      }

      // Month Grid: prev/next year
      const monthPrevBtn = modalElement.querySelector(
        '.month-grid__nav[data-action="prev-year"]',
      );
      const monthNextBtn = modalElement.querySelector(
        '.month-grid__nav[data-action="next-year"]',
      );

      if (monthPrevBtn) {
        monthPrevBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent triggering parent handlers
          this._calendarViewState.currentYear--;
          this._reloadPeriodModalWithDate(modalElement, data);
        });
      }

      if (monthNextBtn) {
        monthNextBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent triggering parent handlers
          this._calendarViewState.currentYear++;
          this._reloadPeriodModalWithDate(modalElement, data);
        });
      }
    }

    /**
     * Reload modal with updated calendar date
     */
    _reloadPeriodModalWithDate(modalElement, data) {
      // Update availableDataRange to reflect current view
      const viewDate = new Date(
        this._calendarViewState.currentYear,
        this._calendarViewState.currentMonth,
        1,
      );
      const updatedData = {
        ...data,
        currentViewDate: viewDate.toISOString(),
      };
      this._reloadPeriodModal(modalElement, updatedData);
    }

    /**
     * Reload period modal content without closing
     * Verwendet beim Wechsel der Granularität
     */
    _reloadPeriodModal(modalElement, data) {
      const stats = window.HistoryStats;
      if (!stats) {
        console.error("[HistoryController] HistoryStats nicht verfügbar");
        return;
      }

      const granularity = data.granularity || "month";
      const lockedGranularity = data.lockedGranularity || null;
      const currentViewDate = data.currentViewDate || null;
      const currentPeriodData = data.currentPeriodData || null;

      // Render new content
      const newContent =
        stats.renderAdvancedPeriodModal?.(
          data.periodType,
          data.currentPeriod,
          granularity,
          data.periods,
          lockedGranularity,
          currentViewDate,
          currentPeriodData,
        ) ||
        stats.renderPeriodSelectorModal?.(
          data.periods,
          data.currentPeriod,
          data.periodType,
        ) ||
        this._renderFallbackPeriodModal(data);

      if (!newContent) return;

      // Parse HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = newContent;
      const newContentElement = tempDiv.firstElementChild;

      // Replace modal content
      const modalContent = modalElement.querySelector(
        ".history-modal__content",
      );
      if (modalContent && newContentElement) {
        modalContent.replaceWith(newContentElement);

        // Re-attach event listeners
        this._attachPeriodSelectorListeners(modalElement, data);

        // Re-attach close button listener
        const closeBtn = modalElement.querySelector('[data-action="close"]');
        if (closeBtn) {
          closeBtn.addEventListener("click", () => this.closeModal());
        }
      }
    }

    // Fallback modal renderers (used if HistoryStats not loaded)
    _renderFallbackDayModal(data) {
      const day = data.day || {};
      return `
        <div class="history-modal__content history-modal__content--day-detail">
          <div class="swipe-handle"></div>
          <header class="history-modal__header">
            <h3>${day.date || "Tag Details"}</h3>
            <button class="history-modal__close" data-action="close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="history-modal__body">
            <p>Temperatur: ${day.temp_avg?.toFixed(1) || "–"}°C</p>
            <p>Niederschlag: ${day.precip?.toFixed(1) || "0"} mm</p>
          </div>
        </div>
      `;
    }

    _renderFallbackComparisonModal(data) {
      const dayA = data.dayA || {};
      const dayB = data.dayB || {};
      return `
        <div class="history-modal__content history-modal__content--comparison">
          <div class="swipe-handle"></div>
          <header class="history-modal__header">
            <h3>Vergleich</h3>
            <button class="history-modal__close" data-action="close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="history-modal__body">
            <p>${data.labelA || "Zeitraum A"}: ${dayA.temp_avg?.toFixed(1) || "–"}°C</p>
            <p>${data.labelB || "Zeitraum B"}: ${dayB.temp_avg?.toFixed(1) || "–"}°C</p>
          </div>
        </div>
      `;
    }

    _renderFallbackCalendarModal(data) {
      const day = data.day || {};
      return `
        <div class="history-modal__content history-modal__content--calendar">
          <div class="swipe-handle"></div>
          <header class="history-modal__header">
            <h3>${day.date || "Kalender-Tag"}</h3>
            <button class="history-modal__close" data-action="close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="history-modal__body">
            <p>Temperatur: ${day.temp_avg?.toFixed(1) || "–"}°C</p>
            <p>Niederschlag: ${day.precip?.toFixed(1) || "0"} mm</p>
            <p>Sonne: ${day.sunshine?.toFixed(1) || "0"} h</p>
          </div>
        </div>
      `;
    }

    _renderFallbackExtremeModal(data) {
      const ext = data.extreme || {};
      return `
        <div class="history-modal__content history-modal__content--extreme">
          <div class="swipe-handle"></div>
          <header class="history-modal__header">
            <h3>${ext.title || "Extrem-Ereignis"}</h3>
            <button class="history-modal__close" data-action="close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="history-modal__body">
            <p>${ext.value || ""}</p>
            <p>${ext.dateFormatted || ""}</p>
          </div>
        </div>
      `;
    }

    _renderFallbackLocationModal(data) {
      const locations = data.locations || [];
      return `
        <div class="history-modal__content history-modal__content--location">
          <div class="swipe-handle"></div>
          <header class="history-modal__header">
            <h3>Standort wählen</h3>
          </header>
          <div class="history-modal__body">
            <div class="location-list">
              ${locations
                .map(
                  (loc) => `
                <button class="location-item" data-location-id="${loc.id}">
                  <span class="material-symbols-outlined">location_on</span>
                  <span>${loc.name}</span>
                </button>
              `,
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    }

    _renderFallbackPeriodModal(data) {
      const periods = data.periods || [];
      return `
        <div class="history-modal__content history-modal__content--period">
          <div class="swipe-handle"></div>
          <header class="history-modal__header">
            <h3>Zeitraum wählen</h3>
          </header>
          <div class="history-modal__body">
            <div class="period-list">
              ${periods
                .map(
                  (p) => `
                <button class="period-item" data-period-id="${p.id}">
                  <span class="material-symbols-outlined">calendar_month</span>
                  <span>${p.label}</span>
                </button>
              `,
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    }

    _renderFallbackInfoModal() {
      return `
        <div class="history-modal__content history-modal__content--info">
          <div class="swipe-handle"></div>
          <header class="history-modal__header">
            <h3>Begriffserklärungen</h3>
            <button class="history-modal__close" data-action="close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="history-modal__body">
            <dl class="info-definitions">
              <dt>Durchschnittstemperatur</dt>
              <dd>Mittelwert aller Tages-Durchschnitte im gewählten Zeitraum.</dd>
              <dt>Klimamittel</dt>
              <dd>Langjähriger Durchschnitt (30 Jahre) für den Standort.</dd>
              <dt>Frosttage</dt>
              <dd>Tage, an denen die Tiefsttemperatur unter 0°C lag.</dd>
            </dl>
          </div>
        </div>
      `;
    }

    _renderFallbackCustomDateModal(data) {
      const today = new Date().toISOString().split("T")[0];
      return `
        <div class="history-modal__content history-modal__content--custom-date">
          <div class="swipe-handle"></div>
          <header class="history-modal__header">
            <h3>Zeitraum wählen</h3>
            <button class="history-modal__close" data-action="close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="history-modal__body">
            <div class="date-picker-form">
              <div class="date-input-group">
                <label for="history-start-date">Von</label>
                <input type="date" id="history-start-date" value="${data.startDate || "2025-01-01"}" max="${today}">
              </div>
              <div class="date-input-group">
                <label for="history-end-date">Bis</label>
                <input type="date" id="history-end-date" value="${data.endDate || today}" max="${today}">
              </div>
              <button class="date-picker-submit" data-action="apply-date">
                <span class="material-symbols-outlined">check</span>
                Anwenden
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // ========================================
    // MODAL DOM MANAGEMENT
    // ========================================

    _ensureModalContainer() {
      let container = document.getElementById(CONFIG.modalContainerId);
      if (!container) {
        container = document.createElement("div");
        container.id = CONFIG.modalContainerId;
        container.className = "history-modal-container";
        document.body.appendChild(container);
      }
      return container;
    }

    _createOrGetModal(modalId, content) {
      let modal = document.getElementById(modalId);

      if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "standard-modal bottom-sheet history-modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.style.display = "none";
        document.body.appendChild(modal);
      }

      // Update content
      modal.innerHTML = content;
      return modal;
    }

    _bindModalEvents(modalType, modalElement, data) {
      // Close buttons
      modalElement.querySelectorAll('[data-action="close"]').forEach((btn) => {
        btn.addEventListener("click", () => this.closeModal());
      });

      // Type-specific event binding
      switch (modalType) {
        case "location":
          modalElement.querySelectorAll(".location-item").forEach((item) => {
            item.addEventListener("click", async () => {
              const locId = item.dataset.locationId;
              if (data.onSelect) {
                await data.onSelect(locId);
              }
              this.closeModal();
            });
          });
          break;

        case "period":
          // Zentrale Funktion für alle Period-Selector Event-Handler
          this._attachPeriodSelectorListeners(modalElement, data);
          break;

        case "customDate":
          const applyBtn = modalElement.querySelector(
            '[data-action="apply-date"]',
          );
          if (applyBtn) {
            applyBtn.addEventListener("click", async () => {
              const startDate = modalElement.querySelector(
                "#history-start-date",
              )?.value;
              const endDate =
                modalElement.querySelector("#history-end-date")?.value;
              if (startDate && endDate && data.onApply) {
                await data.onApply(startDate, endDate);
              }
              this.closeModal();
            });
          }
          break;

        case "info":
          // Accordion toggle functionality
          modalElement
            .querySelectorAll("[data-accordion-toggle]")
            .forEach((button) => {
              button.addEventListener("click", () => {
                // Find the parent accordion item
                const targetItem = button.closest(".info-accordion__item");

                if (targetItem) {
                  const isOpen = targetItem.classList.contains("is-open");

                  // Optional: Close other accordions (single-open mode)
                  // modalElement.querySelectorAll(".info-accordion__item.is-open").forEach((item) => {
                  //   if (item !== targetItem) item.classList.remove("is-open");
                  // });

                  // Toggle current accordion
                  targetItem.classList.toggle("is-open", !isOpen);
                }
              });
            });

          // Beaufort detail table toggle
          const beaufortToggle = modalElement.querySelector(
            ".beaufort-detail-toggle",
          );
          if (beaufortToggle) {
            beaufortToggle.addEventListener("click", () => {
              const detailTable = modalElement.querySelector(
                ".beaufort-detail-table",
              );
              if (detailTable) {
                const isHidden =
                  detailTable.style.display === "none" ||
                  !detailTable.style.display;
                detailTable.style.display = isHidden ? "block" : "none";

                // Update toggle button text
                const chevron = beaufortToggle.querySelector(
                  ".material-symbols-outlined",
                );
                if (chevron) {
                  chevron.textContent = isHidden
                    ? "expand_less"
                    : "expand_more";
                }
              }
            });
          }
          break;
      }
    }

    // ========================================
    // PUBLIC API FOR VIEW COMPONENTS
    // ========================================

    /**
     * Get current state value
     */
    getState(key) {
      return this.state.get(key);
    }

    /**
     * Update state value
     */
    setState(key, value) {
      this.state.set(key, value);
    }

    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
      return this.state.subscribe(key, callback);
    }

    /**
     * TODES-CHECK: Explizite updateView Methode
     * MUSS this._viewInstance.render() aufrufen
     */
    async updateView() {
      console.error("UPDATE VIEW CALLED"); // DEBUG-BEWEIS
      if (this._viewInstance) {
        // Container leeren als ERSTER Befehl
        if (this.container) {
          this.container.innerHTML = "";
        }
        await this._viewInstance.render();
      }
    }

    /**
     * Trigger a tab reload
     */
    async reloadCurrentTab() {
      console.error("RELOAD CURRENT TAB"); // DEBUG-BEWEIS
      if (this._viewInstance?._loadTabWithSkeleton) {
        await this._viewInstance._loadTabWithSkeleton();
      }
    }
  }

  // ============================================
  // SINGLETON INSTANCE
  // ============================================
  const historyController = new HistoryController();

  // ============================================
  // GLOBAL EXPORT
  // ============================================
  global.HistoryController = historyController;

  // Expose class for testing
  global.HistoryControllerClass = HistoryController;
})(typeof window !== "undefined" ? window : this);
