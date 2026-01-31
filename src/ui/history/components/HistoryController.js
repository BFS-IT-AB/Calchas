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
  // STATE MANAGEMENT
  // ============================================
  class HistoryState {
    constructor() {
      this._state = {
        currentTab: "analyse",
        currentMetric: "temperature",
        currentPeriod: "30",
        currentLocation: {
          id: "current",
          name: "Aktueller Standort",
          lat: 52.52,
          lon: 13.41,
        },
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
     * @private
     */
    async _handleExtremeCardClick(extremeInfo) {
      const { id, type, date } = extremeInfo;

      // Extreme-Daten aus State holen
      const extremes = this.state.get("extremes");
      const currentData = this.state.get("currentData") || [];

      // Finde das passende Extreme
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

      if (!extremeData) {
        console.warn(
          "[HistoryController] Extreme data not found for:",
          extremeInfo,
        );
        return;
      }

      // State für selectedExtreme setzen
      this.state.set("selectedExtreme", {
        id,
        type,
        date,
        data: extremeData,
      });

      // Modal öffnen
      this.openModal("extreme", {
        extreme: extremeData,
        type,
        date,
      });
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
    async loadComparisonData(periodA, periodB) {
      const location = this.state.get("currentLocation");

      this.state.set("isLoading", true);

      try {
        // Parse period strings (e.g., "januar2025" -> { year: 2025, month: 0 })
        const parseA = this._parsePeriodString(periodA);
        const parseB = this._parsePeriodString(periodB);

        const [dataA, dataB] = await Promise.all([
          this.dataPipeline.loadHistoricalData(
            parseA.year,
            parseA.month,
            location,
          ),
          this.dataPipeline.loadHistoricalData(
            parseB.year,
            parseB.month,
            location,
          ),
        ]);

        this.state.batch({
          comparisonDataA: dataA,
          comparisonDataB: dataB,
          comparisonPeriodA: periodA,
          comparisonPeriodB: periodB,
        });

        return { dataA, dataB };
      } catch (error) {
        console.error("[HistoryController] Comparison load failed:", error);
        return { dataA: [], dataB: [] };
      } finally {
        this.state.set("isLoading", false);
      }
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
      const masterUI = getMasterUI();

      if (isOpen) {
        // State setzen
        this.state.set("activeModal", id);

        // Body-Scroll sperren NUR wenn Modal wirklich existiert
        if (modalElement || masterUI) {
          document.body.classList.add("modal-open");
        }

        // Modal via MasterUI oder direkt öffnen
        if (masterUI?.openModal) {
          masterUI.openModal(id);
        } else if (modalElement) {
          modalElement.style.display = "flex";
          modalElement.classList.add("modal--open");
        }

        console.log("[HistoryController] Modal opened:", id);
      } else {
        // State zurücksetzen
        this.state.set("activeModal", null);

        // Body-Scroll IMMER wiederherstellen beim Schließen
        document.body.classList.remove("modal-open");

        // Modal schließen
        if (masterUI?.closeActiveModal) {
          masterUI.closeActiveModal();
        } else if (modalElement) {
          modalElement.style.display = "none";
          modalElement.classList.remove("modal--open");
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

        case "extreme":
          return (
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
          return (
            stats?.renderPeriodSelectorModal?.(
              data.periods,
              data.currentPeriod,
              data.periodType,
            ) || this._renderFallbackPeriodModal(data)
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
          modalElement.querySelectorAll(".period-item").forEach((item) => {
            item.addEventListener("click", async () => {
              const periodId = item.dataset.periodId;
              if (data.onSelect) {
                await data.onSelect(periodId);
              }
              this.closeModal();
            });
          });
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
