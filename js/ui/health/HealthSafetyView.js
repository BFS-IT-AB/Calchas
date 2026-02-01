/**
 * HealthSafetyView.js - Integrated Health View Controller
 *
 * Connects HealthEngine (logic) with HealthComponent (UI) and manages
 * the complete health section lifecycle including:
 * - Data binding with Service Worker cache
 * - Dynamic updates on new data
 * - Modal interactions
 * - Skeleton/loading states
 *
 * @module ui/health/HealthSafetyView
 */

(function (global) {
  "use strict";

  // Dependencies
  const HealthEngine = global.HealthEngine;
  const HealthComponent = global.HealthComponent;
  const HealthTemplates = global.HealthTemplates;
  const HealthDataTransformer = global.HealthDataTransformer;

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  let currentEngine = null;
  let currentComponent = null;
  let currentAnalysis = null;
  let isLoading = false;
  let lastAppState = null;

  /**
   * Initialize or get the HealthEngine instance
   */
  function getEngine(language = "de") {
    if (!currentEngine || currentEngine.language !== language) {
      currentEngine = new HealthEngine({ language });
    }
    return currentEngine;
  }

  /**
   * Initialize or get the HealthComponent instance
   */
  function getComponent(language = "de") {
    if (!currentComponent || currentComponent.language !== language) {
      currentComponent = new HealthComponent({ language });
    }
    return currentComponent;
  }

  // ========================================
  // HELPER FUNCTIONS (kept for compatibility)
  // ========================================

  function getScoreColor(score) {
    if (score >= 80) return "#4ade80";
    if (score >= 60) return "#a3e635";
    if (score >= 40) return "#fbbf24";
    if (score >= 20) return "#fb923c";
    return "#ef4444";
  }

  function labelForScore(score) {
    if (score >= 80) return "Ausgezeichnet";
    if (score >= 60) return "Gut";
    if (score >= 40) return "Mäßig";
    if (score >= 20) return "Schlecht";
    return "Kritisch";
  }

  function formatTime(timeInput) {
    if (!timeInput) return "";
    try {
      if (typeof timeInput === "string" && /^\d{1,2}:\d{2}$/.test(timeInput)) {
        return timeInput;
      }
      const date = new Date(timeInput);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      const match = String(timeInput).match(/(\d{1,2}):(\d{2})/);
      if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
      return String(timeInput).substring(0, 5);
    } catch {
      return String(timeInput).substring(0, 5);
    }
  }

  /**
   * Calculate Windchill (kept for backwards compatibility)
   */
  function calculateWindchill(temp, windSpeed) {
    if (temp === null || windSpeed === null) return null;
    if (temp > 10 || windSpeed < 4.8) return temp;
    const v016 = Math.pow(windSpeed, 0.16);
    return (
      Math.round(
        (13.12 + 0.6215 * temp - 11.37 * v016 + 0.3965 * temp * v016) * 10,
      ) / 10
    );
  }

  function getWindchillInfo(windchill) {
    if (windchill === null)
      return { label: "–", color: "#9E9E9E", risk: "unbekannt", icon: "🌡️" };
    if (windchill >= 10)
      return {
        label: "Angenehm",
        color: "#4CAF50",
        risk: "Kein Risiko",
        icon: "😊",
      };
    if (windchill >= 0)
      return { label: "Kühl", color: "#8BC34A", risk: "Gering", icon: "🧥" };
    if (windchill >= -10)
      return { label: "Kalt", color: "#FFEB3B", risk: "Moderat", icon: "🥶" };
    if (windchill >= -25)
      return {
        label: "Sehr kalt",
        color: "#FF9800",
        risk: "Erhöht",
        icon: "❄️",
      };
    if (windchill >= -40)
      return {
        label: "Gefährlich kalt",
        color: "#F44336",
        risk: "Hoch",
        icon: "⚠️",
      };
    return {
      label: "Extrem gefährlich",
      color: "#9C27B0",
      risk: "Sehr hoch",
      icon: "🚨",
    };
  }

  // ========================================
  // MAIN RENDER FUNCTION
  // ========================================

  /**
   * Main render function - entry point for the health section
   * @param {object} appState - Full application state
   * @param {object} healthState - Previous health state (optional)
   * @returns {string} Complete HTML for health section
   */
  function render(appState, healthState) {
    // Store for updates
    lastAppState = appState;

    // Check if we have data
    if (!appState || (!appState.current && !appState.hourly)) {
      const emptyHtml =
        HealthTemplates?.healthEmptyState?.() || renderEmptyState();
      insertIntoContainer(emptyHtml);
      return emptyHtml;
    }

    // Check if new modules are available
    if (!HealthEngine || !HealthComponent) {
      console.error(
        "[HealthSafetyView] HealthEngine or HealthComponent not loaded",
      );
      const errorHtml = renderErrorState();
      insertIntoContainer(errorHtml);
      return errorHtml;
    }

    // Initialize engine and component
    const language = appState.settings?.language || "de";
    let engine, component;

    try {
      engine = getEngine(language);
      component = getComponent(language);
    } catch (initError) {
      console.error("[HealthSafetyView] Init error:", initError);
      const errorHtml = renderErrorState();
      insertIntoContainer(errorHtml);
      return errorHtml;
    }

    // Run complete analysis
    try {
      currentAnalysis = engine.analyze(appState);
    } catch (error) {
      console.error("[HealthSafetyView] Analysis error:", error);
      const errorHtml =
        HealthTemplates?.healthErrorState?.(error.message) ||
        renderErrorState();
      insertIntoContainer(errorHtml);
      return errorHtml;
    }

    // Check for offline data
    const isOffline = navigator && !navigator.onLine;
    if (isOffline) {
      currentAnalysis.isOffline = true;
    }

    // Use the new component to render
    let healthHtml;
    try {
      healthHtml = component.render(currentAnalysis);
    } catch (renderError) {
      console.error("[HealthSafetyView] Component render error:", renderError);
      const errorHtml = renderErrorState();
      insertIntoContainer(errorHtml);
      return errorHtml;
    }

    // NOTE: Weather alerts section removed to avoid duplicate rendering
    // The HealthComponent.renderSafetyAlerts() now handles all safety/alert display
    // The old renderAlertsSection was causing duplicate "Wetter-Hinweise" at page bottom

    // Combine into final layout with glass container
    const finalHtml = `
      <div class="health-view" data-health-view>
        ${isOffline ? HealthTemplates?.offlineBanner?.() || "" : ""}
        ${healthHtml}
      </div>
    `;

    // Store appState for modal access
    HealthSafetyView._lastAppState = appState;

    insertIntoContainer(finalHtml);
    return finalHtml;
  }

  /**
   * Insert HTML into the health container
   */
  function insertIntoContainer(html) {
    const container =
      document.querySelector('[data-view="health"]') ||
      document.querySelector(".health-section") ||
      document.getElementById("health-content");
    if (container) {
      container.innerHTML = html;
      // Attach click handlers after inserting - use container and lastAppState
      setTimeout(() => attachClickHandlers(container, lastAppState), 0);
    }
  }

  /**
   * Show skeleton loading state
   */
  function renderSkeleton() {
    return (
      HealthTemplates?.healthSectionSkeleton?.() ||
      `
      <div class="health-view health-view--loading">
        <div class="health-loading-state">
          <div class="health-loading-spinner"></div>
          <span>Analysiere Wetterdaten...</span>
        </div>
      </div>
    `
    );
  }

  /**
   * Render empty state
   */
  function renderEmptyState() {
    return `
      <div class="health-view health-view--empty">
        <div class="health-empty-state">
          <span class="health-empty-icon">📊</span>
          <h3>Keine Gesundheitsdaten</h3>
          <p>Bitte wähle einen Standort aus.</p>
        </div>
      </div>
    `;
  }

  /**
   * Render error state
   */
  function renderErrorState() {
    return `
      <div class="health-view health-view--error">
        <div class="health-error-state">
          <span class="health-error-icon">⚠️</span>
          <h3>Fehler beim Laden</h3>
          <p>Gesundheitsdaten konnten nicht analysiert werden.</p>
        </div>
      </div>
    `;
  }

  // ========================================
  // WEATHER ALERTS SECTION
  // ========================================

  function getAlertCategoryInfo(type) {
    const categories = {
      wind: { icon: "💨", label: "Wind", color: "#64B5F6" },
      heat: { icon: "🌡️", label: "Hitze", color: "#FF7043" },
      cold: { icon: "❄️", label: "Kälte", color: "#4FC3F7" },
      rain: { icon: "🌧️", label: "Niederschlag", color: "#42A5F5" },
      storm: { icon: "⛈️", label: "Gewitter", color: "#7E57C2" },
      fog: { icon: "🌫️", label: "Nebel", color: "#90A4AE" },
      uv: { icon: "☀️", label: "UV-Strahlung", color: "#FFA726" },
      bio: { icon: "🧠", label: "Bio-Wetter", color: "#FF9800" },
      aqi: { icon: "😷", label: "Luftqualität", color: "#795548" },
    };
    return (
      categories[type] || { icon: "⚠️", label: "Warnung", color: "#FF9800" }
    );
  }

  function processAlerts(rawAlerts) {
    if (!rawAlerts || rawAlerts.length === 0) {
      return { hasAlerts: false, summary: null, grouped: {} };
    }

    const grouped = {};
    rawAlerts.forEach((alert) => {
      const type = alert.type || "other";
      if (!grouped[type]) {
        grouped[type] = {
          alerts: [],
          maxSeverity: "yellow",
          ...getAlertCategoryInfo(type),
        };
      }
      grouped[type].alerts.push(alert);
      if (alert.severity === "red") grouped[type].maxSeverity = "red";
      else if (
        alert.severity === "orange" &&
        grouped[type].maxSeverity !== "red"
      ) {
        grouped[type].maxSeverity = "orange";
      }
    });

    const hasRed = rawAlerts.some(
      (a) => a.severity === "red" || a.severity === "critical",
    );
    const hasOrange = rawAlerts.some(
      (a) => a.severity === "orange" || a.severity === "warning",
    );

    const summary = {
      level: hasRed ? "critical" : hasOrange ? "warning" : "info",
      color: hasRed ? "#F44336" : hasOrange ? "#FF9800" : "#FFEB3B",
      text: hasRed
        ? "Wetterwarnungen aktiv"
        : hasOrange
          ? "Hinweise beachten"
          : "Leichte Hinweise",
      icon: hasRed ? "🚨" : hasOrange ? "⚠️" : "💡",
    };

    return { hasAlerts: true, summary, grouped, totalCount: rawAlerts.length };
  }

  function renderAlertsSection(alerts) {
    const { hasAlerts, summary, grouped, totalCount } = processAlerts(alerts);

    if (!hasAlerts) {
      return `
        <section class="weather-alerts-section health-card" data-clickable-alerts>
          <div class="weather-alerts-header">
            <span class="weather-alerts-icon">✅</span>
            <div class="weather-alerts-title">
              <h3>Wetter-Status</h3>
              <span class="weather-alerts-subtitle">Nächste 24 Stunden</span>
            </div>
          </div>
          <div class="weather-alerts-status weather-alerts-status--good">
            <span class="weather-alerts-status__icon">👍</span>
            <div class="weather-alerts-status__text">
              <strong>Alles im grünen Bereich</strong>
              <p>Keine besonderen Wetterereignisse erwartet</p>
            </div>
          </div>
        </section>
      `;
    }

    const categoryPills = Object.entries(grouped)
      .sort((a, b) => {
        const order = { red: 0, orange: 1, yellow: 2 };
        return (order[a[1].maxSeverity] || 3) - (order[b[1].maxSeverity] || 3);
      })
      .slice(0, 4)
      .map(([type, data]) => {
        const severityColor =
          data.maxSeverity === "red"
            ? "#F44336"
            : data.maxSeverity === "orange"
              ? "#FF9800"
              : "#FFEB3B";
        return `
          <div class="weather-alert-pill" style="--pill-color: ${severityColor}">
            <span class="weather-alert-pill__icon">${data.icon}</span>
            <span class="weather-alert-pill__label">${data.label}</span>
            ${data.alerts.length > 1 ? `<span class="weather-alert-pill__count">${data.alerts.length}</span>` : ""}
          </div>
        `;
      })
      .join("");

    const topAlert = alerts.sort((a, b) => {
      const order = {
        red: 0,
        critical: 0,
        orange: 1,
        warning: 1,
        yellow: 2,
        info: 2,
      };
      return (order[a.severity] || 3) - (order[b.severity] || 3);
    })[0];

    return `
      <section class="weather-alerts-section health-card" data-clickable-alerts>
        <div class="weather-alerts-header">
          <span class="weather-alerts-icon">${summary.icon}</span>
          <div class="weather-alerts-title">
            <h3>Wetter-Hinweise</h3>
            <span class="weather-alerts-subtitle">${summary.text}</span>
          </div>
          <span class="weather-alerts-badge" style="background:${summary.color}">${totalCount}</span>
        </div>
        <div class="weather-alerts-pills">${categoryPills}</div>
        ${
          topAlert
            ? `
          <div class="weather-alert-preview" style="border-color:${summary.color}">
            <div class="weather-alert-preview__content">
              <strong>${topAlert.title}</strong>
              <p>${topAlert.description || topAlert.message}</p>
            </div>
            ${topAlert.time ? `<span class="weather-alert-preview__time">${formatTime(topAlert.time)}</span>` : ""}
          </div>
        `
            : ""
        }
        <div class="weather-alerts-footer">
          <span class="weather-alerts-more">Tippen für Details →</span>
        </div>
      </section>
    `;
  }

  // ========================================
  // FETCH HEALTH ALERTS FROM WEATHER DATA
  // ========================================

  // Cache for alerts fetched via lat/lon
  let cachedAlerts = [];

  /**
   * Fetch health alerts - supports two call signatures:
   * 1. fetchHealthAlerts(lat, lon) - Returns Promise, fetches weather data first (for app.js compatibility)
   * 2. fetchHealthAlerts(appState) - Returns Array directly (for internal use)
   */
  function fetchHealthAlerts(latOrAppState, lon) {
    // Check if called with lat/lon (from app.js) - returns Promise
    if (typeof latOrAppState === "number" && typeof lon === "number") {
      return fetchHealthAlertsAsync(latOrAppState, lon);
    }

    // Called with appState object - returns array directly
    const appState = latOrAppState;
    return generateAlertsFromAppState(appState);
  }

  /**
   * Async version for lat/lon calls (app.js compatibility)
   */
  async function fetchHealthAlertsAsync(lat, lon) {
    try {
      // Use existing weather data if available
      if (global.appState?.hourly) {
        cachedAlerts = generateAlertsFromAppState(global.appState);
        return cachedAlerts;
      }

      // Fetch weather data if needed
      const weatherApi = global.WeatherAPI || global.BrightSkyAPI;
      if (weatherApi?.fetchWeather) {
        const data = await weatherApi.fetchWeather(lat, lon);
        cachedAlerts = generateAlertsFromAppState(data);
        return cachedAlerts;
      }

      // Fallback: return empty
      cachedAlerts = [];
      return cachedAlerts;
    } catch (error) {
      console.warn("[HealthSafetyView] fetchHealthAlerts error:", error);
      cachedAlerts = [];
      return cachedAlerts;
    }
  }

  /**
   * Generate alerts from appState object
   */
  function generateAlertsFromAppState(appState) {
    if (!appState?.hourly) return [];

    const alerts = [];
    const hourly = appState.hourly;
    const hours = hourly.map(
      (h, i) => h.time || new Date(Date.now() + i * 3600000).toISOString(),
    );

    // Helper to safely access array data
    const grab = (arr, idx, def = null) => arr?.[idx] ?? def;

    // Analyze conditions
    const conditions = {
      wind: { severe: [], moderate: [] },
      heat: { severe: [], moderate: [] },
      cold: { severe: [], moderate: [] },
      rain: { severe: [], moderate: [] },
      storm: { severe: [] },
    };

    hourly.slice(0, 24).forEach((h, idx) => {
      const temp = h.temperature;
      const feels = h.apparentTemperature || h.feelsLike || temp;
      const prob = h.precipitationProbability || h.precipProb || 0;
      const rain = h.precipitation || 0;
      const wind = h.windSpeed || 0;
      const code = h.weatherCode || h.weathercode;
      const iso = hours[idx];

      // Wind
      if (wind >= 75) conditions.wind.severe.push({ time: iso, value: wind });
      else if (wind >= 50)
        conditions.wind.moderate.push({ time: iso, value: wind });

      // Heat
      if (temp >= 35) conditions.heat.severe.push({ time: iso, value: temp });
      else if (temp >= 30)
        conditions.heat.moderate.push({ time: iso, value: temp });

      // Cold
      if (feels <= -15)
        conditions.cold.severe.push({ time: iso, value: feels });
      else if (feels <= -5)
        conditions.cold.moderate.push({ time: iso, value: feels });

      // Rain
      if (rain >= 10 && prob >= 70)
        conditions.rain.severe.push({ time: iso, value: rain, prob });
      else if (rain >= 3 && prob >= 50)
        conditions.rain.moderate.push({ time: iso, value: rain, prob });

      // Storm
      if ([95, 96, 99].includes(code))
        conditions.storm.severe.push({ time: iso, code });
    });

    // Generate alerts from conditions
    if (conditions.wind.severe.length > 0) {
      const maxWind = Math.max(...conditions.wind.severe.map((w) => w.value));
      alerts.push({
        id: "wind-severe",
        type: "wind",
        severity: "red",
        title: "Sturmwarnung",
        description: `Windspitzen bis ${maxWind.toFixed(0)} km/h erwartet.`,
        time: conditions.wind.severe[0].time,
      });
    } else if (conditions.wind.moderate.length > 0) {
      const maxWind = Math.max(...conditions.wind.moderate.map((w) => w.value));
      alerts.push({
        id: "wind-moderate",
        type: "wind",
        severity: "orange",
        title: "Starker Wind",
        description: `Böen bis ${maxWind.toFixed(0)} km/h möglich.`,
        time: conditions.wind.moderate[0].time,
      });
    }

    if (conditions.heat.severe.length > 0) {
      const maxTemp = Math.max(...conditions.heat.severe.map((h) => h.value));
      alerts.push({
        id: "heat-severe",
        type: "heat",
        severity: "red",
        title: "Hitzewarnung",
        description: `Bis zu ${maxTemp.toFixed(0)}°C erwartet. Hitzeschutz dringend empfohlen!`,
        time: conditions.heat.severe[0].time,
      });
    } else if (conditions.heat.moderate.length > 0) {
      const maxTemp = Math.max(...conditions.heat.moderate.map((h) => h.value));
      alerts.push({
        id: "heat-moderate",
        type: "heat",
        severity: "orange",
        title: "Hohe Temperaturen",
        description: `Temperaturen um ${maxTemp.toFixed(0)}°C. Ausreichend trinken!`,
        time: conditions.heat.moderate[0].time,
      });
    }

    if (conditions.cold.severe.length > 0) {
      const minTemp = Math.min(...conditions.cold.severe.map((c) => c.value));
      alerts.push({
        id: "cold-severe",
        type: "cold",
        severity: "red",
        title: "Extreme Kälte",
        description: `Gefühlte Temperatur bis ${minTemp.toFixed(0)}°C. Erfrierungsgefahr!`,
        time: conditions.cold.severe[0].time,
      });
    } else if (conditions.cold.moderate.length > 0) {
      const minTemp = Math.min(...conditions.cold.moderate.map((c) => c.value));
      alerts.push({
        id: "cold-moderate",
        type: "cold",
        severity: "orange",
        title: "Frost",
        description: `Gefühlte Temperatur um ${minTemp.toFixed(0)}°C.`,
        time: conditions.cold.moderate[0].time,
      });
    }

    if (conditions.rain.severe.length > 0) {
      const totalRain = conditions.rain.severe.reduce(
        (sum, r) => sum + r.value,
        0,
      );
      alerts.push({
        id: "rain-severe",
        type: "rain",
        severity: "orange",
        title: "Starkregen",
        description: `Bis zu ${totalRain.toFixed(0)} mm Niederschlag.`,
        time: conditions.rain.severe[0].time,
      });
    }

    if (conditions.storm.severe.length > 0) {
      alerts.push({
        id: "storm-severe",
        type: "storm",
        severity: "red",
        title: "Gewitterwarnung",
        description: "Gewitter mit Hagel oder Starkregen möglich.",
        time: conditions.storm.severe[0].time,
      });
    }

    // Sort by severity
    const severityOrder = { red: 0, orange: 1, yellow: 2 };
    alerts.sort(
      (a, b) =>
        (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3),
    );

    return alerts;
  }

  // ========================================
  // MODAL SYSTEM (Phase 4 - MasterUIController Delegation)
  // ========================================

  /**
   * Open health modal with detailed information
   * PHASE 4: Delegates to MasterUIController for backdrop/scroll management
   */
  function openHealthModal(cardType, appState, healthState) {
    const modalContent = getModalContent(cardType, appState, healthState);

    // PHASE 4: Use MasterUIController as primary, ModalController as fallback
    if (global.MasterUIController?.openModal) {
      // Create/update a temporary modal sheet for health content
      showHealthContentInMasterModal(modalContent);
    } else if (global.ModalController?.openBottomSheet) {
      global.ModalController.openBottomSheet(modalContent, {
        allowSwipeClose: true,
      });
    } else if (global.showBottomSheet) {
      global.showBottomSheet(modalContent);
    } else {
      // LEGACY FALLBACK: Create modal using MasterUIController backdrop
      showFallbackModal(modalContent);
    }
  }

  /**
   * Show health content using MasterUIController's single backdrop
   * PHASE 4: No duplicate overlays created
   */
  function showHealthContentInMasterModal(content) {
    // Find or create a dedicated health modal container
    let healthSheet = document.getElementById("sheet-health-detail");

    if (!healthSheet) {
      healthSheet = document.createElement("div");
      healthSheet.id = "sheet-health-detail";
      healthSheet.className = "bottom-sheet health-modal-sheet";
      healthSheet.setAttribute("aria-modal", "true");
      healthSheet.setAttribute("role", "dialog");
      healthSheet.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-height: 90vh;
        background: var(--modal-backdrop-bg, rgba(22, 22, 24, 0.96));
        backdrop-filter: var(--modal-backdrop-blur, blur(20px)) var(--modal-backdrop-saturate, saturate(180%));
        -webkit-backdrop-filter: var(--modal-backdrop-blur, blur(20px)) var(--modal-backdrop-saturate, saturate(180%));
        border-radius: var(--health-border-radius, 12px) var(--health-border-radius, 12px) 0 0;
        transform: translateY(100%);
        transition: transform var(--modal-transition-duration, 300ms) var(--modal-transition-easing, cubic-bezier(0.05, 0.7, 0.1, 1));
        z-index: var(--z-modal-base, 1000);
        overflow-y: auto;
        overscroll-behavior: contain;
      `;

      // Add to overlay or body
      const overlay =
        document.getElementById("bottom-sheet-overlay") ||
        document.getElementById("master-backdrop");
      if (overlay) {
        overlay.appendChild(healthSheet);
      } else {
        document.body.appendChild(healthSheet);
      }
    }

    // Update content
    healthSheet.innerHTML = content;

    // Open via MasterUIController (handles backdrop, scroll lock, z-index)
    global.MasterUIController.openModal("sheet-health-detail");
  }

  /**
   * Fallback modal - DELEGATES to MasterUIController's backdrop
   * PHASE 4: Does NOT create its own overlay!
   */
  function showFallbackModal(content) {
    // Remove any legacy standalone overlays
    document
      .querySelectorAll(".health-modal-overlay")
      .forEach((el) => el.remove());

    // Use showHealthContentInMasterModal instead
    showHealthContentInMasterModal(content);
  }

  /**
   * Get modal content for a specific card type
   */
  function getModalContent(cardType, appState, healthState) {
    const current = appState?.current || {};
    const hourly = appState?.hourly || [];
    const analysis = currentAnalysis || healthState || {};
    const hourIndex = window._healthModalHourIndex;

    // Use existing detailed modal content or generate from analysis
    const templates = {
      outdoor: () => renderOutdoorDetailModal(analysis, hourly),
      umbrella: () => renderUmbrellaDetailModal(analysis, hourly),
      uv: () => renderUVDetailModal(analysis, hourly, current),
      jacket: () => renderJacketDetailModal(analysis, current, hourly),
      clothing: () => renderJacketDetailModal(analysis, current, hourly),
      sleep: () => renderSleepDetailModal(analysis, current),
      headache: () => renderHeadacheDetailModal(analysis),
      vitaminD: () => renderVitaminDDetailModal(analysis, current),
      alerts: () => renderAlertsDetailModal(analysis, appState),
      "official-alerts": () => renderAlertsDetailModal(analysis, appState),
      "timeline-hour": () =>
        renderTimelineHourModal(analysis, hourly, hourIndex),
      bio: () => renderHeadacheDetailModal(analysis), // Bio defaults to headache modal
    };

    const generator = templates[cardType];
    if (generator) {
      return generator();
    }

    // Smart Fallback - show weather summary instead of "Loading"
    return renderFallbackModal(cardType, current, analysis);
  }

  // ========================================
  // DETAIL MODAL TEMPLATES
  // ========================================

  function renderOutdoorDetailModal(analysis, hourly) {
    const score = analysis.outdoorScore || { score: 50, factors: {} };
    const timeline = analysis.timeline || [];
    const bestWindow = analysis.bestTimeWindow;

    const factorRows = Object.entries(score.factors || {})
      .sort((a, b) => (a[1].weight || 0) - (b[1].weight || 0))
      .reverse()
      .map(([key, data]) => {
        const icon = getFactorIcon(key);
        const label = getFactorLabel(key);
        const color = getScoreColor(data.score);
        // Calculate point impact for expert breakdown
        const impact = Math.round((100 - data.score) * (data.weight || 0.1));
        return `
          <div class="factor-detail-row">
            <span class="factor-detail-icon">${icon}</span>
            <span class="factor-detail-label">${label}</span>
            <div class="factor-detail-bar">
              <div class="factor-detail-bar__fill" style="width:${data.score}%;background:${color}"></div>
            </div>
            <span class="factor-detail-score" style="color:${color}">${data.score}</span>
          </div>
        `;
      })
      .join("");

    // Generate expert breakdown - why is the score low?
    const lowFactors = Object.entries(score.factors || {})
      .filter(([_, data]) => data.score < 50)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 3);

    const expertBreakdown =
      lowFactors.length > 0
        ? `
      <div class="detail-card__expert-breakdown">
        <h4 style="margin:0 0 8px;font-size:13px;color:var(--health-text-secondary)">
          ${tm("whyLow", "Warum ist der Score niedrig?")}
        </h4>
        ${lowFactors
          .map(([key, data]) => {
            const impact = Math.round(
              (100 - data.score) * (data.weight || 0.15),
            );
            return `<div class="expert-factor" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
            <span>${getFactorIcon(key)}</span>
            <span style="flex:1">${getFactorLabel(key)}</span>
            <span style="color:#fb923c;font-weight:600">−${impact} Punkte</span>
          </div>`;
          })
          .join("")}
      </div>
    `
        : "";

    const timelineRows = timeline
      .slice(0, 12)
      .map((slot) => {
        const slotColor = getScoreColor(slot.score);
        return `
      <div class="health-chart-row">
        <span class="health-chart-row__time">${formatTime(slot.time)}</span>
        <span class="health-chart-row__score" style="color:${slotColor}">${slot.score}</span>
        <div class="health-chart-bar">
          <div class="health-chart-bar__fill" style="width:${slot.score}%;background:${slotColor}"></div>
        </div>
      </div>
    `;
      })
      .join("");

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">🌤️</span>
        <h2 class="bottom-sheet__title">${tm("outdoorDetails", "Outdoor-Score Details")}</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>${tm("currentScore", "Aktueller Score")}</h3>
          <div class="detail-card__hero">
            <span class="detail-card__value" style="color:${score.color};font-size:56px">${score.score}</span>
            <span class="detail-card__label" style="color:${score.color}">${score.label}</span>
          </div>
          ${
            score.capped
              ? `
            <div class="detail-card__warning" style="background:rgba(251,146,60,0.15);border-left:3px solid #fb923c;padding:10px 12px;border-radius:0 8px 8px 0;margin-top:12px">
              <span style="font-size:16px">⚠️</span>
              <span>${tm("scoreLimitedBy", "Score limitiert durch")}: ${score.cappedBy === "precipitation" ? tm("highPrecipitation", "Hohe Regenwahrscheinlichkeit") : tm("strongWind", "Starker Wind")}</span>
            </div>
          `
              : ""
          }
          ${
            bestWindow
              ? `
            <div class="detail-card__row" style="margin-top:12px;background:rgba(74,222,128,0.15);padding:10px 12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
              <span>✨ ${tm("bestTimeSlot", "Bestes Zeitfenster")}:</span>
              <span style="font-weight:600">${bestWindow.displayText} (Score: ${bestWindow.avgScore})</span>
            </div>
          `
              : ""
          }
        </div>

        <div class="detail-card">
          <h3>${tm("factorAnalysis", "Faktor-Analyse")}</h3>
          <p class="detail-text--muted" style="font-size:0.8rem;margin-bottom:12px;color:var(--health-text-secondary)">
            ${tm("factorExplanation", "Der Score berechnet sich aus gewichteten Umweltfaktoren. Kritische Faktoren können den Score auf max. 30 begrenzen.")}
          </p>
          <div class="factor-detail-list">${factorRows}</div>
          ${expertBreakdown}
        </div>

        <div class="detail-card">
          <h3>${tm("hourlyForecast", "Stündliche Vorhersage")}</h3>
          <div class="health-chart-barlist">${timelineRows}</div>
        </div>
      </div>
    `;
  }

  function renderUmbrellaDetailModal(analysis, hourly) {
    const checks = analysis.quickChecks || [];
    const umbrellaCheck = checks.find(
      (c) => c.id === "umbrella" || c.type === "umbrella",
    );
    const precipProb = umbrellaCheck?.detail?.match(/(\d+)%/)?.[1] || 0;
    const precipNum = parseInt(precipProb) || 0;

    // Expert recommendation based on probability
    let recommendation, recColor, recIcon;
    if (precipNum >= 70) {
      recommendation = tm("umbrellaYes", "Ja, unbedingt!");
      recColor = "#ef4444";
      recIcon = "🌧️☔";
    } else if (precipNum >= 40) {
      recommendation = tm("umbrellaMaybe", "Sicherheitshalber einpacken");
      recColor = "#fb923c";
      recIcon = "🌦️🌂";
    } else {
      recommendation = tm("umbrellaNo", "Nicht nötig");
      recColor = "#4ade80";
      recIcon = "☀️";
    }

    // Use Contextual Color Engine for rain bars
    const hourlyBars = hourly
      .slice(0, 12)
      .map((h) => {
        const prob = h.precipitationProbability || h.precipProb || 0;
        const colorEngine = global.WeatherMath?.getHealthColorByValue;
        const barColors = colorEngine
          ? colorEngine("rain", prob)
          : {
              color:
                prob >= 70 ? "#ef4444" : prob >= 40 ? "#fb923c" : "#4ade80",
              gradient: "linear-gradient(to top, #3b82f6, #60a5fa)",
              glow: "rgba(96, 165, 250, 0.4)",
            };
        return `
        <div class="hourly-bar">
          <div class="hourly-bar__fill hourly-bar__fill--precip" style="--bar-height:${prob}%;--precip-gradient:${barColors.gradient};--precip-glow:${barColors.glow}"></div>
          <span class="hourly-bar__value">${Math.round(prob)}%</span>
          <span class="hourly-bar__time">${formatTime(h.time)}</span>
        </div>
      `;
      })
      .join("");

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">🌂</span>
        <h2 class="bottom-sheet__title">${tm("umbrella", "Regenschirm")}</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>${tm("recommendation", "Empfehlung")}</h3>
          <div class="detail-card__hero" style="text-align:center;padding:16px 0">
            <span style="font-size:28px;display:block;margin-bottom:8px">${recIcon}</span>
            <span class="detail-card__value" style="color:${recColor};font-size:24px;font-weight:600">
              ${recommendation}
            </span>
          </div>
          <div class="detail-card__row" style="margin-top:12px;display:flex;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:8px;border:0.5px solid rgba(255,255,255,0.04)">
            <span style="color:rgba(255,255,255,0.6)">${tm("precipProbability", "Regenwahrscheinlichkeit")}:</span>
            <span style="font-weight:500;color:${precipNum >= 50 ? "#fb923c" : "#4ade80"}">${precipProb}%</span>
          </div>
        </div>
        <div class="detail-card">
          <h3>${tm("hourlyForecast", "Stündliche Vorhersage")}</h3>
          <div class="chart-wrapper"><div class="hourly-bars">${hourlyBars}</div></div>
        </div>
      </div>
    `;
  }

  function renderUVDetailModal(analysis, hourly, current) {
    const vitaminD = analysis.vitaminDTimer || {};
    const currentUv = current.uvIndex || 0;
    const maxUv = hourly
      .slice(0, 12)
      .reduce((max, h) => Math.max(max, h.uvIndex || h.uv || 0), currentUv);

    const getUvColor = (uv) => {
      if (uv <= 2) return "#4ade80";
      if (uv <= 5) return "#fbbf24";
      if (uv <= 7) return "#fb923c";
      if (uv <= 10) return "#ef4444";
      return "#9333ea";
    };

    // Calculate self-protection time based on UV and skin type (assuming Type II - fair)
    const getSelfProtectionTime = (uv) => {
      if (uv <= 0) return null;
      // Base time for skin type II is approximately 200/UV minutes
      return Math.round(200 / uv);
    };

    const selfProtectionTime = getSelfProtectionTime(maxUv);
    const recommendedSPF =
      maxUv >= 8 ? 50 : maxUv >= 5 ? 30 : maxUv >= 3 ? 15 : 0;

    // Use Contextual Color Engine for UV bars
    const hourlyUv = hourly
      .slice(0, 12)
      .map((h) => {
        const uv = h.uvIndex || h.uv || 0;
        const colorEngine = global.WeatherMath?.getHealthColorByValue;
        const barColors = colorEngine
          ? colorEngine("uv", uv)
          : {
              color: getUvColor(uv),
              gradient: `linear-gradient(to top, ${getUvColor(uv)}cc, ${getUvColor(uv)})`,
              glow: "rgba(251, 191, 36, 0.4)",
            };
        return `
        <div class="hourly-bar">
          <div class="hourly-bar__fill hourly-bar__fill--uv" style="--bar-height:${(uv / 11) * 100}%;--uv-gradient:${barColors.gradient};--uv-glow:${barColors.glow}"></div>
          <span class="hourly-bar__value">${Math.round(uv)}</span>
          <span class="hourly-bar__time">${formatTime(h.time)}</span>
        </div>
      `;
      })
      .join("");

    // UV Tips based on level
    const uvTips = [];
    if (maxUv >= 3)
      uvTips.push({
        icon: "🕶️",
        text: tm("tipSunglasses", "Sonnenbrille tragen"),
      });
    if (maxUv >= 5)
      uvTips.push({
        icon: "🧴",
        text: `${tm("tipSunscreen", "Sonnencreme verwenden")} (LSF ${recommendedSPF})`,
      });
    if (maxUv >= 6)
      uvTips.push({
        icon: "🧢",
        text: tm("tipHat", "Hut oder Kappe aufsetzen"),
      });
    if (maxUv >= 7)
      uvTips.push({ icon: "🌳", text: tm("tipShade", "Schatten bevorzugen") });
    if (maxUv >= 8)
      uvTips.push({
        icon: "⏰",
        text: tm("tipAvoidMidday", "Mittagssonne meiden (11-15 Uhr)"),
      });

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">☀️</span>
        <h2 class="bottom-sheet__title">${tm("uvProtection", "UV-Schutz")}</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>UV-Index heute</h3>
          <div class="detail-card__hero" style="text-align:center">
            <span class="detail-card__value" style="color:${getUvColor(maxUv)};font-size:56px">${Math.round(maxUv)}</span>
            <span style="display:block;color:${getUvColor(maxUv)};font-size:14px;margin-top:4px">
              ${maxUv <= 2 ? "Niedrig" : maxUv <= 5 ? "Mäßig" : maxUv <= 7 ? "Hoch" : maxUv <= 10 ? "Sehr hoch" : "Extrem"}
            </span>
          </div>

          ${
            selfProtectionTime
              ? `
          <div class="detail-card__info-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px">
            <div style="background:rgba(251,191,36,0.1);padding:12px;border-radius:8px;text-align:center">
              <span style="font-size:20px;display:block">⏱️</span>
              <span style="font-size:11px;color:var(--health-text-secondary);display:block">${tm("selfProtectionTime", "Eigenschutzzeit")}</span>
              <span style="font-size:18px;font-weight:600">${selfProtectionTime} Min.</span>
            </div>
            <div style="background:rgba(251,191,36,0.1);padding:12px;border-radius:8px;text-align:center">
              <span style="font-size:20px;display:block">🧴</span>
              <span style="font-size:11px;color:var(--health-text-secondary);display:block">${tm("recommendedSPF", "Empfohlener LSF")}</span>
              <span style="font-size:18px;font-weight:600">${recommendedSPF > 0 ? "LSF " + recommendedSPF : "–"}</span>
            </div>
          </div>
          `
              : ""
          }

          ${
            vitaminD.available
              ? `
            <div class="detail-card__row" style="background:rgba(74,222,128,0.1);padding:10px 12px;border-radius:8px;margin-top:12px;display:flex;justify-content:space-between">
              <span>☀️ Vitamin D in:</span>
              <span style="font-weight:600;color:#4ade80">${vitaminD.minutes} Minuten</span>
            </div>
          `
              : ""
          }
        </div>

        ${
          uvTips.length > 0
            ? `
        <div class="detail-card">
          <h3>${tm("uvTips", "UV-Tipps")}</h3>
          <div class="tips-list">
            ${uvTips
              .map(
                (tip) => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
                <span style="font-size:18px">${tip.icon}</span>
                <span>${tip.text}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
        `
            : ""
        }

        <div class="detail-card">
          <h3>${tm("hourlyForecast", "Stündlicher UV-Verlauf")}</h3>
          <div class="chart-wrapper"><div class="hourly-bars">${hourlyUv}</div></div>
        </div>

        <!-- Skin Type Info -->
        <div class="detail-card" style="background:rgba(138,180,255,0.05);border-left:3px solid #8ab4ff">
          <h3 style="color:#8ab4ff;font-size:13px;margin:0 0 6px">ℹ️ Hauttyp-Berechnung</h3>
          <p style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.5;margin:0">
            Die Eigenschutzzeit basiert auf <strong style="color:#8ab4ff">Hauttyp 2 (Hell)</strong>.
            Für präzisere UV-Berechnungen kannst du in Zukunft deinen individuellen
            Hauttyp in den Einstellungen hinterlegen (Fitzpatrick-Skala 1-6).
          </p>
        </div>
      </div>
    `;
  }

  function renderJacketDetailModal(analysis, current, hourly = []) {
    const feels =
      current.apparentTemperature ||
      current.feelsLike ||
      current.temperature ||
      15;
    const wind = current.windSpeed || 0;
    const uv = current.uvIndex || 0;
    const rain = current.precipitationProbability || 0;
    const humidity = current.humidity || 50;

    // Layer system based on conditions
    const getLayers = (temp, wind, rain) => {
      const layers = { base: null, mid: null, outer: null };

      // Base layer
      if (temp <= 10) {
        layers.base = { icon: "👕", name: "Thermoshirt", active: true };
      } else {
        layers.base = { icon: "👕", name: "T-Shirt", active: true };
      }

      // Mid layer
      if (temp <= 5) {
        layers.mid = { icon: "🧶", name: "Fleece/Pullover", active: true };
      } else if (temp <= 15) {
        layers.mid = { icon: "🧶", name: "Leichter Pulli", active: true };
      } else {
        layers.mid = { icon: "🧶", name: "Optional", active: false };
      }

      // Outer layer
      if (temp <= 0) {
        layers.outer = {
          icon: "🧥",
          name: "Winterjacke",
          active: true,
          color: "#60a5fa",
        };
      } else if (temp <= 10 || wind > 25) {
        layers.outer = {
          icon: "🧥",
          name: "Warme Jacke",
          active: true,
          color: "#a3e635",
        };
      } else if (temp <= 18 || rain > 30) {
        layers.outer = {
          icon: "🧥",
          name: "Leichte Jacke",
          active: true,
          color: "#fbbf24",
        };
      } else {
        layers.outer = {
          icon: "🧥",
          name: "Keine nötig",
          active: false,
          color: "#4ade80",
        };
      }

      return layers;
    };

    const layers = getLayers(feels, wind, rain);

    // Determine protection focus
    const protectionFocus = [];
    if (wind > 20) protectionFocus.push("Windchill");
    if (rain > 30) protectionFocus.push("Feuchtigkeit");
    if (feels <= 5) protectionFocus.push("Kälte");
    if (uv > 5) protectionFocus.push("UV-Strahlung");

    const protectionText =
      protectionFocus.length > 0
        ? `Optimiert für: ${protectionFocus.join(" & ")}`
        : "Leichte Bedingungen – flexibel bleiben";

    // Permanent accessories grid - always show all 3 core items
    const umbrellaActive = rain > 20;
    const sunglassesActive = uv > 3;
    const sunscreenActive = uv > 5;
    const glovesActive = feels < 5;

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">🧥</span>
        <h2 class="bottom-sheet__title">${tm("outfitTitle", "Outfit für heute")}</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <!-- Layer System -->
        <div class="detail-card">
          <h3>LAYER-SYSTEM</h3>
          <div style="display:flex;justify-content:space-around;padding:12px 0;gap:8px">
            <!-- Base Layer -->
            <div style="flex:1;text-align:center;padding:12px 6px;background:${layers.base.active ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.02)"};border-radius:10px;border:0.5px solid ${layers.base.active ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.04)"};opacity:${layers.base.active ? 1 : 0.35}">
              <span style="font-size:24px;display:block">${layers.base.icon}</span>
              <span style="font-size:8px;color:rgba(255,255,255,0.4);display:block;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Base</span>
              <span style="font-size:11px;color:rgba(255,255,255,0.7);display:block;margin-top:3px;font-weight:400">${layers.base.name}</span>
            </div>
            <!-- Mid Layer -->
            <div style="flex:1;text-align:center;padding:12px 6px;background:${layers.mid.active ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.02)"};border-radius:10px;border:0.5px solid ${layers.mid.active ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.04)"};opacity:${layers.mid.active ? 1 : 0.35}">
              <span style="font-size:24px;display:block">${layers.mid.icon}</span>
              <span style="font-size:8px;color:rgba(255,255,255,0.4);display:block;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Mid</span>
              <span style="font-size:11px;color:rgba(255,255,255,0.7);display:block;margin-top:3px;font-weight:400">${layers.mid.name}</span>
            </div>
            <!-- Outer Layer -->
            <div style="flex:1;text-align:center;padding:12px 6px;background:${layers.outer.active ? `${layers.outer.color}12` : "rgba(255,255,255,0.02)"};border-radius:10px;border:0.5px solid ${layers.outer.active ? `${layers.outer.color}30` : "rgba(255,255,255,0.04)"};opacity:${layers.outer.active ? 1 : 0.35}">
              <span style="font-size:24px;display:block">${layers.outer.icon}</span>
              <span style="font-size:8px;color:rgba(255,255,255,0.4);display:block;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Outer</span>
              <span style="font-size:11px;color:${layers.outer.active ? layers.outer.color : "rgba(255,255,255,0.7)"};display:block;margin-top:3px;font-weight:${layers.outer.active ? "500" : "400"}">${layers.outer.name}</span>
            </div>
          </div>
          <div style="text-align:center;padding:10px 14px;background:rgba(255,255,255,0.025);border-radius:8px;margin-top:12px;border:0.5px solid rgba(255,255,255,0.04)">
            <span style="font-size:11px;color:rgba(255,255,255,0.55);font-weight:400">${protectionText}</span>
          </div>
        </div>

        <!-- Current Conditions Mini -->
        <div class="detail-card" style="padding:14px">
          <div style="display:flex;gap:8px">
            <div style="flex:1;padding:12px 8px;background:rgba(255,255,255,0.025);border-radius:8px;text-align:center;border:0.5px solid rgba(255,255,255,0.04)">
              <span style="font-size:8px;color:rgba(255,255,255,0.4);display:block;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Gefühlt</span>
              <span style="font-size:18px;font-weight:600;color:${layers.outer.color || "rgba(255,255,255,0.9)"}">${Math.round(feels)}°</span>
            </div>
            <div style="flex:1;padding:12px 8px;background:rgba(255,255,255,0.025);border-radius:8px;text-align:center;border:0.5px solid rgba(255,255,255,0.04)">
              <span style="font-size:8px;color:rgba(255,255,255,0.4);display:block;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Wind</span>
              <span style="font-size:18px;font-weight:600;color:rgba(255,255,255,0.9)">${Math.round(wind)}<span style="font-size:10px;font-weight:400;color:rgba(255,255,255,0.5)"> km/h</span></span>
            </div>
            <div style="flex:1;padding:12px 8px;background:rgba(255,255,255,0.025);border-radius:8px;text-align:center;border:0.5px solid rgba(255,255,255,0.04)">
              <span style="font-size:8px;color:rgba(255,255,255,0.4);display:block;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Regen</span>
              <span style="font-size:18px;font-weight:600;color:${rain > 30 ? "#60a5fa" : "rgba(255,255,255,0.9)"}">${rain}<span style="font-size:10px;font-weight:400;color:rgba(255,255,255,0.5)">%</span></span>
            </div>
          </div>
        </div>

        <!-- Permanent Accessories Grid - Always visible -->
        <div class="detail-card" style="padding:16px">
          <div style="display:flex;justify-content:center;gap:16px">
            <!-- Umbrella -->
            <div style="text-align:center;padding:10px 14px;border-radius:10px;background:${umbrellaActive ? "rgba(96,165,250,0.1)" : "rgba(255,255,255,0.02)"};border:0.5px solid ${umbrellaActive ? "rgba(96,165,250,0.25)" : "rgba(255,255,255,0.04)"};opacity:${umbrellaActive ? 1 : 0.25};transition:all 0.2s ease;${umbrellaActive ? "box-shadow:0 0 16px rgba(96,165,250,0.2);" : ""}">
              <span style="font-size:22px;display:block">☔</span>
              <span style="font-size:9px;color:${umbrellaActive ? "#60a5fa" : "rgba(255,255,255,0.4)"};display:block;margin-top:4px;font-weight:${umbrellaActive ? "500" : "400"}">Schirm</span>
            </div>
            <!-- Sunglasses -->
            <div style="text-align:center;padding:10px 14px;border-radius:10px;background:${sunglassesActive ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.02)"};border:0.5px solid ${sunglassesActive ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.04)"};opacity:${sunglassesActive ? 1 : 0.25};transition:all 0.2s ease;${sunglassesActive ? "box-shadow:0 0 16px rgba(251,191,36,0.2);" : ""}">
              <span style="font-size:22px;display:block">🕶️</span>
              <span style="font-size:9px;color:${sunglassesActive ? "#fbbf24" : "rgba(255,255,255,0.4)"};display:block;margin-top:4px;font-weight:${sunglassesActive ? "500" : "400"}">Brille</span>
            </div>
            <!-- Gloves (for cold) -->
            <div style="text-align:center;padding:10px 14px;border-radius:10px;background:${glovesActive ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.02)"};border:0.5px solid ${glovesActive ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.04)"};opacity:${glovesActive ? 1 : 0.25};transition:all 0.2s ease;${glovesActive ? "box-shadow:0 0 16px rgba(167,139,250,0.2);" : ""}">
              <span style="font-size:22px;display:block">🧤</span>
              <span style="font-size:9px;color:${glovesActive ? "#a78bfa" : "rgba(255,255,255,0.4)"};display:block;margin-top:4px;font-weight:${glovesActive ? "500" : "400"}">Handschuhe</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSleepDetailModal(analysis, current) {
    const checks = analysis.quickChecks || [];
    const sleepCheck = checks.find(
      (c) => c.id === "sleep" || c.type === "sleep",
    );
    const temp = current.temperature ?? 18;
    const humidity = current.humidity ?? 50;

    // Calculate sleep quality factors
    const tempOptimal = temp >= 16 && temp <= 19;
    const humidityOptimal = humidity >= 40 && humidity <= 60;
    const qualityFactors = [];

    if (temp < 16)
      qualityFactors.push({
        icon: "❄️",
        text: tm("sleepTooCold", "Zu kalt - Schlafqualität kann leiden"),
        bad: true,
      });
    else if (temp > 19)
      qualityFactors.push({
        icon: "🔥",
        text: tm("sleepTooWarm", "Zu warm - Schwieriges Einschlafen möglich"),
        bad: true,
      });
    else
      qualityFactors.push({
        icon: "✓",
        text: tm("sleepTempOptimal", "Temperatur im optimalen Bereich"),
        bad: false,
      });

    if (humidity < 40)
      qualityFactors.push({
        icon: "🏜️",
        text: tm("sleepTooDry", "Luft zu trocken - Atemwege gereizt"),
        bad: true,
      });
    else if (humidity > 60)
      qualityFactors.push({
        icon: "💦",
        text: tm("sleepTooHumid", "Zu feucht - Schimmelrisiko"),
        bad: true,
      });
    else
      qualityFactors.push({
        icon: "✓",
        text: tm("sleepHumidityOptimal", "Luftfeuchtigkeit optimal"),
        bad: false,
      });

    const factorsHtml = qualityFactors
      .map(
        (f) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${f.bad ? "rgba(251,146,60,0.1)" : "rgba(74,222,128,0.1)"};border-radius:8px;margin-bottom:6px">
        <span style="font-size:18px">${f.icon}</span>
        <span style="color:${f.bad ? "#fb923c" : "#4ade80"}">${f.text}</span>
      </div>
    `,
      )
      .join("");

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">😴</span>
        <h2 class="bottom-sheet__title">${tm("sleepQuality", "Schlafqualität")}</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>${tm("forecast", "Prognose")}</h3>
          <div class="detail-card__hero">
            <span class="detail-card__value" style="color:${sleepCheck?.color || "#4CAF50"}">
              ${sleepCheck?.icon || "🛏️"} ${sleepCheck?.answer || tm("good", "Gut")}
            </span>
          </div>
          <div class="detail-card__grid" style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="padding:12px;background:rgba(255,255,255,0.05);border-radius:10px;text-align:center">
              <span style="font-size:24px;display:block;margin-bottom:4px">🌡️</span>
              <span style="font-size:18px;font-weight:600;color:${tempOptimal ? "#4ade80" : "#fb923c"}">${Math.round(temp)}°C</span>
              <span style="display:block;font-size:11px;color:var(--health-text-muted);margin-top:2px">${tm("temperature", "Temperatur")}</span>
            </div>
            <div style="padding:12px;background:rgba(255,255,255,0.05);border-radius:10px;text-align:center">
              <span style="font-size:24px;display:block;margin-bottom:4px">💧</span>
              <span style="font-size:18px;font-weight:600;color:${humidityOptimal ? "#4ade80" : "#fb923c"}">${Math.round(humidity)}%</span>
              <span style="display:block;font-size:11px;color:var(--health-text-muted);margin-top:2px">${tm("humidity", "Feuchtigkeit")}</span>
            </div>
          </div>
        </div>

        <div class="detail-card">
          <h3>${tm("sleepAnalysis", "Analyse")}</h3>
          ${factorsHtml}
        </div>

        <div class="detail-card">
          <h3>${tm("sleepConditions", "Optimale Schlafbedingungen")}</h3>
          <div class="tips-list">
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:20px">🌡️</span>
              <span>${tm("sleepTipTemp", "Temperatur: 16-19°C")}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:20px">💧</span>
              <span>${tm("sleepTipHumidity", "Luftfeuchtigkeit: 40-60%")}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:20px">🌙</span>
              <span>${tm("sleepTipDarken", "Verdunkeln und lüften vor dem Schlafen")}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0">
              <span style="font-size:20px">📵</span>
              <span>${tm("sleepTipScreens", "Bildschirme 1h vor dem Schlafen meiden")}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderHeadacheDetailModal(analysis) {
    const headache = analysis.headacheRisk || {};

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">🧠</span>
        <h2 class="bottom-sheet__title">Kopfschmerz-Risiko</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>${tm("headacheInfo", "Aktuelles Risiko")}</h3>
          <div class="detail-card__hero" style="text-align:center;padding:16px 0">
            <span style="font-size:32px;display:block;margin-bottom:8px">${headache.risk === "high" ? "⚠️" : headache.risk === "moderate" ? "😐" : "😊"}</span>
            <span class="detail-card__value" style="color:${headache.color || "#4ade80"};font-size:20px;font-weight:600">
              ${headache.risk === "high" ? tm("highRisk", "Hohes Risiko") : headache.risk === "moderate" ? tm("moderateRisk", "Mittleres Risiko") : tm("lowRisk", "Niedriges Risiko")}
            </span>
          </div>
          <div class="detail-card__row" style="margin-top:12px;display:flex;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:8px;border:0.5px solid rgba(255,255,255,0.04)">
            <span style="color:rgba(255,255,255,0.6)">Luftdruckänderung:</span>
            <span style="font-weight:500;color:${Math.abs(headache.change || 0) > 5 ? "#fb923c" : "#4ade80"}">${headache.change > 0 ? "+" : ""}${headache.change || 0} hPa</span>
          </div>
          <div class="detail-card__row" style="display:flex;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:8px;margin-top:6px;border:0.5px solid rgba(255,255,255,0.04)">
            <span style="color:rgba(255,255,255,0.6)">Trend:</span>
            <span style="font-weight:500">${headache.change > 3 ? tm("pressureRisingFast", "Druck steigt schnell") : headache.change < -3 ? tm("pressureDropping", "Druck sinkt rapide") : tm("pressureStable", "Stabil")}</span>
          </div>
        </div>

        <div class="detail-card">
          <h3>${tm("headacheTips", "Tipps bei Wetterfühligkeit")}</h3>
          <div class="tips-list">
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:20px">💧</span>
              <span>${tm("tipDrinkWater", "Ausreichend Wasser trinken")}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:20px">💊</span>
              <span>${tm("tipMagnesium", "Magnesium einplanen")}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:20px">☕</span>
              <span>${tm("tipRest", "Pausen einlegen")}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0">
              <span style="font-size:20px">🌬️</span>
              <span>${tm("tipFreshAir", "Regelmäßig lüften")}</span>
            </div>
          </div>
        </div>

        <div class="detail-card" style="background:rgba(251,191,36,0.05);border-left:3px solid #fbbf24">
          <h3 style="color:#fbbf24">${tm("bioWeather", "Bio-Wetter Info")}</h3>
          <p style="font-size:13px;color:var(--health-text-secondary);line-height:1.5">
            Schnelle Luftdruckänderungen (>5 hPa in 3 Stunden) können bei empfindlichen Personen
            Kopfschmerzen, Migräne oder Gelenkbeschwerden auslösen.
          </p>
        </div>
      </div>
    `;
  }

  function renderVitaminDDetailModal(analysis, current) {
    const vitaminD = analysis.vitaminDTimer || {};
    const uvIndex = current.uvIndex || 0;
    const isAvailable = vitaminD.available && uvIndex >= 3;

    // Calculate progress percentage (assuming 15 min target for Vitamin D synthesis)
    const targetMinutes = 15;
    const currentMinutes = vitaminD.minutes || 0;
    const progressPercent = isAvailable
      ? Math.min(
          100,
          Math.round((targetMinutes / Math.max(currentMinutes, 1)) * 100),
        )
      : 0;
    const remainingMinutes = isAvailable ? Math.max(0, currentMinutes) : 0;

    // SVG Gauge parameters - ALWAYS rendered
    const radius = 60;
    const circumference = Math.PI * radius;
    const strokeDashoffset =
      circumference - (progressPercent / 100) * circumference;

    // Dynamic gauge color based on UV availability
    const gaugeColor = isAvailable ? "#4ade80" : "rgba(255,255,255,0.15)";
    const gaugeGradient = isAvailable
      ? '<linearGradient id="vitaminGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#4ade80"/></linearGradient>'
      : '<linearGradient id="vitaminGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255,255,255,0.1)"/><stop offset="100%" stop-color="rgba(255,255,255,0.15)"/></linearGradient>';

    // Status text based on UV level
    const statusText = isAvailable
      ? tm(
          "vitaminDNeeded",
          `Noch ${remainingMinutes} Min. bei UV ${Math.round(uvIndex)} nötig`,
        )
      : uvIndex > 0
        ? tm(
            "uvLow",
            `UV ${Math.round(uvIndex)} – zu niedrig für Synthese (min. UV 3 benötigt)`,
          )
        : tm(
            "uvNone",
            "Aktuell keine Vitamin-D-Synthese möglich (UV-Index zu niedrig)",
          );

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">☀️</span>
        <h2 class="bottom-sheet__title">${tm("vitaminDInfo", "Vitamin-D Timer")}</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <!-- Gauge Card - Always Visible -->
        <div class="detail-card">
          <div style="text-align:center;padding:12px 0">
            <!-- SVG Gauge - PERMANENT -->
            <div style="position:relative;width:140px;height:80px;margin:0 auto">
              <svg width="140" height="80" viewBox="0 0 140 80">
                <!-- Background arc -->
                <path d="M 10 70 A 60 60 0 0 1 130 70"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      stroke-width="8"
                      stroke-linecap="round"/>
                <!-- Progress arc -->
                <path d="M 10 70 A 60 60 0 0 1 130 70"
                      fill="none"
                      stroke="url(#vitaminGradient)"
                      stroke-width="8"
                      stroke-linecap="round"
                      stroke-dasharray="${circumference}"
                      stroke-dashoffset="${strokeDashoffset}"
                      style="transition: stroke-dashoffset 0.5s ease"/>
                <defs>
                  ${gaugeGradient}
                </defs>
              </svg>
              <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);text-align:center">
                <span style="font-size:26px;font-weight:600;color:${gaugeColor};display:block;line-height:1">${isAvailable ? remainingMinutes : "–"}</span>
                <span style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Min</span>
              </div>
            </div>
            <p style="font-size:12px;color:rgba(255,255,255,0.55);margin:14px 0 0;font-weight:400;line-height:1.4">
              ${statusText}
            </p>
          </div>
        </div>

        <!-- UV & Sunburn Stats -->
        <div class="detail-card" style="padding:14px">
          <div style="display:flex;gap:10px">
            <div style="flex:1;background:rgba(255,255,255,0.025);padding:12px 8px;border-radius:8px;text-align:center;border:0.5px solid rgba(255,255,255,0.04)">
              <span style="font-size:8px;color:rgba(255,255,255,0.4);display:block;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">UV-Index</span>
              <span style="font-size:18px;font-weight:600;color:${isAvailable ? "#fbbf24" : "rgba(255,255,255,0.4)"}">${Math.round(uvIndex)}</span>
            </div>
            <div style="flex:1;background:rgba(255,255,255,0.025);padding:12px 8px;border-radius:8px;text-align:center;border:0.5px solid rgba(255,255,255,0.04)">
              <span style="font-size:8px;color:rgba(255,255,255,0.4);display:block;text-transform:uppercase;letter-spacing:0.5px;font-weight:500">Sonnenbrand</span>
              <span style="font-size:18px;font-weight:600;color:${isAvailable ? "#fb923c" : "rgba(255,255,255,0.4)"}">${vitaminD.sunburnTime || "–"} Min</span>
            </div>
          </div>
        </div>

        <!-- Tips Grid -->
        <div class="detail-card">
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.025);border-radius:8px;border:0.5px solid rgba(255,255,255,0.04)">
              <span style="font-size:13px">🌞</span>
              <span style="font-size:11px;color:rgba(255,255,255,0.6);font-weight:400">UV >3 nötig</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.025);border-radius:8px;border:0.5px solid rgba(255,255,255,0.04)">
              <span style="font-size:13px">⏰</span>
              <span style="font-size:11px;color:rgba(255,255,255,0.6);font-weight:400">10-14 Uhr optimal</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.025);border-radius:8px;border:0.5px solid rgba(255,255,255,0.04)">
              <span style="font-size:13px">👕</span>
              <span style="font-size:11px;color:rgba(255,255,255,0.6);font-weight:400">25% Haut exponieren</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.025);border-radius:8px;border:0.5px solid rgba(255,255,255,0.04)">
              <span style="font-size:13px">🧴</span>
              <span style="font-size:11px;color:rgba(255,255,255,0.6);font-weight:400">Danach eincremen</span>
            </div>
          </div>
        </div>

        <!-- Skin Type Info -->
        <div class="detail-card" style="background:rgba(138,180,255,0.05);border-left:3px solid #8ab4ff">
          <h3 style="color:#8ab4ff;font-size:13px;margin:0 0 6px">ℹ️ Hauttyp-Berechnung</h3>
          <p style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.5;margin:0">
            Aktuell wird <strong style="color:#8ab4ff">Hauttyp 2 (Hell)</strong> als Standard verwendet.
            Für präzisere UV- und Vitamin-D-Berechnungen kannst du in Zukunft deinen individuellen
            Hauttyp in den Einstellungen hinterlegen (Fitzpatrick-Skala 1-6).
          </p>
        </div>
      </div>
    `;
  }

  function renderAlertsDetailModal(analysis, appState) {
    const alerts = fetchHealthAlerts(appState);
    const safetyAlerts = analysis.safetyAlerts || [];
    const officialAlerts = analysis.officialAlerts || [];
    const allAlerts = [
      ...officialAlerts.map((a) => ({
        ...a,
        isOfficial: true,
        severity:
          a.severity === "extreme" || a.severity === "severe"
            ? "red"
            : a.severity === "moderate"
              ? "orange"
              : "yellow",
      })),
      ...alerts,
      ...safetyAlerts.map((a) => ({
        ...a,
        severity:
          a.severity === "critical"
            ? "red"
            : a.severity === "warning"
              ? "orange"
              : "yellow",
        description: a.message,
      })),
    ];

    if (allAlerts.length === 0) {
      return `
        <header class="bottom-sheet__header">
          <span class="bottom-sheet__icon">✅</span>
          <h2 class="bottom-sheet__title">${tm("noWarningsTitle", "Wetter-Status")}</h2>
          <button class="bottom-sheet__close" type="button" data-close-sheet>
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        <div class="bottom-sheet__body">
          <div class="detail-card">
            <div class="alerts-modal-empty">
              <span class="alerts-modal-empty__icon">🌤️</span>
              <h3>${tm("noWarnings", "Keine Warnungen")}</h3>
              <p>${tm("noWarningsDesc", "In den nächsten 24 Stunden sind keine besonderen Wetterereignisse zu erwarten.")}</p>
            </div>
          </div>
        </div>
      `;
    }

    // Action recommendations based on alert type
    const getAlertActions = (alert) => {
      const actions = [];
      const type = (alert.type || alert.event || "").toLowerCase();

      if (
        type.includes("storm") ||
        type.includes("wind") ||
        type.includes("sturm")
      ) {
        actions.push({
          icon: "🪟",
          text: tm("actionCloseWindows", "Fenster und Türen schließen"),
        });
        actions.push({
          icon: "🚗",
          text: tm("actionSecureObjects", "Lose Gegenstände sichern"),
        });
        actions.push({
          icon: "🏠",
          text: tm("actionStayIndoors", "Möglichst im Gebäude bleiben"),
        });
      }
      if (
        type.includes("thunder") ||
        type.includes("gewitter") ||
        type.includes("lightning")
      ) {
        actions.push({
          icon: "🌳",
          text: tm("actionAvoidTrees", "Bäume und offene Flächen meiden"),
        });
        actions.push({
          icon: "🔌",
          text: tm("actionUnplugDevices", "Empfindliche Geräte ausstecken"),
        });
      }
      if (
        type.includes("rain") ||
        type.includes("flood") ||
        type.includes("regen") ||
        type.includes("hochwasser")
      ) {
        actions.push({
          icon: "🚗",
          text: tm("actionAvoidFlooded", "Überflutete Straßen meiden"),
        });
        actions.push({
          icon: "📦",
          text: tm("actionMoveValuables", "Wertgegenstände nach oben bringen"),
        });
      }
      if (type.includes("heat") || type.includes("hitze")) {
        actions.push({
          icon: "💧",
          text: tm("actionDrinkWater", "Viel Wasser trinken"),
        });
        actions.push({
          icon: "🌡️",
          text: tm("actionAvoidSun", "Mittagssonne meiden (11-16 Uhr)"),
        });
        actions.push({
          icon: "👴",
          text: tm("actionCheckElderly", "Nach älteren Nachbarn schauen"),
        });
      }
      if (
        type.includes("cold") ||
        type.includes("frost") ||
        type.includes("kälte") ||
        type.includes("ice") ||
        type.includes("eis")
      ) {
        actions.push({
          icon: "🧤",
          text: tm("actionWarmClothes", "Warme Kleidung tragen"),
        });
        actions.push({
          icon: "🚗",
          text: tm("actionCarefulDriving", "Vorsichtig fahren - Glättegefahr"),
        });
        actions.push({
          icon: "🚰",
          text: tm("actionProtectPipes", "Wasserleitungen schützen"),
        });
      }
      if (type.includes("fog") || type.includes("nebel")) {
        actions.push({
          icon: "🚗",
          text: tm("actionReduceSpeed", "Geschwindigkeit reduzieren"),
        });
        actions.push({
          icon: "💡",
          text: tm("actionUseLights", "Nebelscheinwerfer verwenden"),
        });
      }
      if (type.includes("uv") || type.includes("sun")) {
        actions.push({
          icon: "🧴",
          text: tm("actionSunscreen", "Sonnenschutz auftragen (LSF 30+)"),
        });
        actions.push({
          icon: "🕶️",
          text: tm("actionSunglasses", "Sonnenbrille tragen"),
        });
      }

      return actions;
    };

    const alertCards = allAlerts
      .map((alert) => {
        const info = getAlertCategoryInfo(alert.type || alert.event);
        const severityColor =
          alert.severity === "red"
            ? "#F44336"
            : alert.severity === "orange"
              ? "#FF9800"
              : "#FFEB3B";

        const actions = getAlertActions(alert);
        const actionsHtml =
          actions.length > 0
            ? `
          <div class="alert-actions">
            <h4 class="alert-actions__title">${tm("alertActions", "Empfohlene Maßnahmen")}</h4>
            <ul class="alert-actions__list">
              ${actions.map((a) => `<li><span class="alert-action-icon">${a.icon}</span> ${a.text}</li>`).join("")}
            </ul>
          </div>
        `
            : "";

        const officialBadge = alert.isOfficial
          ? `
          <span class="alert-official-badge">
            <span class="material-symbols-outlined" style="font-size: 12px">verified</span>
            ${tm("officialWarning", "Offizielle Warnung")}
          </span>
        `
          : "";

        const validTime =
          alert.onset || alert.effective
            ? `
          <div class="alert-time-range">
            <span class="material-symbols-outlined">schedule</span>
            ${alert.onset ? formatTime(new Date(alert.onset)) : ""}
            ${alert.expires ? `- ${formatTime(new Date(alert.expires))}` : ""}
          </div>
        `
            : "";

        return `
        <div class="alert-detail-card" style="border-left: 4px solid ${severityColor}">
          <div class="alert-detail-header">
            <span class="alert-detail-icon">${info.icon}</span>
            <span class="alert-detail-title">${alert.title || alert.headline || alert.event}</span>
            ${officialBadge}
          </div>
          <p class="alert-detail-text">${alert.description || alert.message || ""}</p>
          ${validTime}
          ${alert.time ? `<span class="alert-detail-time">${formatTime(alert.time)}</span>` : ""}
          ${actionsHtml}
        </div>
      `;
      })
      .join("");

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">⚠️</span>
        <h2 class="bottom-sheet__title">${tm("weatherWarnings", "Wetter-Warnungen")}</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <p class="alerts-modal-intro">${tm("alertsIntro", "Aktuelle Warnungen und Hinweise für Ihren Standort:")}</p>
        ${alertCards}
      </div>
    `;
  }

  // ========================================
  // TIMELINE HOUR DETAIL MODAL
  // ========================================

  function renderTimelineHourModal(analysis, hourly, hourIndex) {
    const timeline = analysis.timeline || [];
    const hour = hourly[hourIndex] || {};
    const timelineEntry = timeline[hourIndex] || {};

    // Get hour time
    const hourTime = hour.time ? new Date(hour.time) : new Date();
    const timeStr = hourTime.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Get score and color
    const score = timelineEntry.score ?? hour.outdoorScore ?? 50;
    const scoreColor = getScoreColor(score);

    // Weather data
    const temp = hour.temperature ?? hour.temp ?? "–";
    const wind = hour.windSpeed ?? hour.wind_speed ?? 0;
    const rain =
      hour.precipitationProbability ?? hour.precipitation_probability ?? 0;
    const humidity = hour.humidity ?? "–";
    const uv = hour.uvIndex ?? hour.uv ?? 0;
    const pollen = hour.pollenLevel ?? analysis.pollenLevel ?? 0;

    // Calculate causal factors for score
    const getCausalFactors = () => {
      const factors = [];

      // Calculate impact scores (negative = bad for outdoor)
      if (rain > 40)
        factors.push({
          icon: "🌧️",
          name: "Regen",
          impact: -Math.round(rain * 0.4),
          value: `${rain}%`,
        });
      if (wind > 25)
        factors.push({
          icon: "💨",
          name: "Böiger Wind",
          impact: -Math.round(wind * 0.3),
          value: `${Math.round(wind)} km/h`,
        });
      if (temp > 30)
        factors.push({
          icon: "🔥",
          name: "Hitze",
          impact: -Math.round((temp - 28) * 3),
          value: `${Math.round(temp)}°C`,
        });
      if (temp < 5)
        factors.push({
          icon: "❄️",
          name: "Kälte",
          impact: -Math.round((5 - temp) * 2),
          value: `${Math.round(temp)}°C`,
        });
      if (uv > 6)
        factors.push({
          icon: "☀️",
          name: "UV-Strahlung",
          impact: -Math.round(uv * 2),
          value: `UV ${uv}`,
        });
      if (pollen > 3)
        factors.push({
          icon: "🌸",
          name: "Pollenflug",
          impact: -Math.round(pollen * 4),
          value: `Level ${pollen}`,
        });
      if (humidity > 80)
        factors.push({
          icon: "💧",
          name: "Schwüle",
          impact: -Math.round((humidity - 75) * 0.3),
          value: `${humidity}%`,
        });

      // Sort by impact (most negative first)
      return factors.sort((a, b) => a.impact - b.impact).slice(0, 3);
    };

    const causalFactors = getCausalFactors();

    // Determine limiting factors text
    const getLimitingText = () => {
      if (causalFactors.length === 0) return "Optimale Bedingungen";
      const names = causalFactors.slice(0, 2).map((f) => f.name);
      return names.join(" & ");
    };

    // Activity recommendation (minimal)
    const getActivityIcon = () => {
      if (score >= 80) return { icon: "✅", text: "Ideal" };
      if (score >= 60) return { icon: "👍", text: "Gut" };
      if (score >= 40) return { icon: "⚡", text: "Eingeschränkt" };
      return { icon: "⚠️", text: "Ungünstig" };
    };
    const activity = getActivityIcon();

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">🕐</span>
        <h2 class="bottom-sheet__title">${timeStr} Uhr</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <!-- Score Hero with Causal Link -->
        <div class="detail-card" style="text-align:center;padding:16px">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px">
            <span style="font-size:48px;font-weight:800;color:${scoreColor}">${score}</span>
            <span style="font-size:11px;color:var(--health-text-muted);text-align:left;line-height:1.3">
              OUTDOOR<br>SCORE
            </span>
          </div>
          ${
            causalFactors.length > 0
              ? `
          <div style="margin-top:12px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:6px">
            <span style="font-size:10px;color:var(--health-text-muted);text-transform:uppercase;letter-spacing:0.5px">Verursacht durch</span>
            <span style="display:block;font-size:13px;color:${scoreColor};margin-top:3px;font-weight:500">${getLimitingText()}</span>
          </div>
          `
              : `
          <div style="margin-top:12px;padding:8px 12px;background:rgba(74,222,128,0.08);border-radius:6px">
            <span style="font-size:12px;color:#4ade80">✨ Optimale Bedingungen für Outdoor</span>
          </div>
          `
          }
        </div>

        ${
          causalFactors.length > 0
            ? `
        <!-- Causal Factor Breakdown -->
        <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">
          ${causalFactors
            .map(
              (f) => `
          <div style="display:flex;align-items:center;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:6px">
            <span style="font-size:16px;width:28px">${f.icon}</span>
            <span style="flex:1;font-size:12px;color:var(--health-text-secondary)">${f.name}</span>
            <span style="font-size:11px;color:var(--health-text-muted);margin-right:8px">${f.value}</span>
            <span style="font-size:11px;font-weight:600;color:#f87171;font-family:Consolas,monospace">${f.impact}</span>
          </div>
          `,
            )
            .join("")}
        </div>
        `
            : ""
        }

        <!-- Compact Weather Grid -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px">
          <div style="padding:10px 4px;background:rgba(255,255,255,0.03);border-radius:6px;text-align:center">
            <span style="font-size:16px;display:block">🌡️</span>
            <span style="font-size:15px;font-weight:600;display:block;margin-top:4px">${typeof temp === "number" ? Math.round(temp) : temp}°</span>
          </div>
          <div style="padding:10px 4px;background:rgba(255,255,255,0.03);border-radius:6px;text-align:center">
            <span style="font-size:16px;display:block">💨</span>
            <span style="font-size:15px;font-weight:600;display:block;margin-top:4px">${Math.round(wind)}</span>
          </div>
          <div style="padding:10px 4px;background:rgba(255,255,255,0.03);border-radius:6px;text-align:center">
            <span style="font-size:16px;display:block">🌧️</span>
            <span style="font-size:15px;font-weight:600;display:block;margin-top:4px;color:${rain > 30 ? "#60a5fa" : "#fff"}">${rain}%</span>
          </div>
          <div style="padding:10px 4px;background:rgba(255,255,255,0.03);border-radius:6px;text-align:center">
            <span style="font-size:16px;display:block">☀️</span>
            <span style="font-size:15px;font-weight:600;display:block;margin-top:4px;color:${uv > 5 ? "#fbbf24" : "#fff"}">${uv}</span>
          </div>
        </div>

        <!-- Quick Verdict -->
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;margin-top:12px;background:${scoreColor}12;border-radius:8px">
          <span style="font-size:18px">${activity.icon}</span>
          <span style="font-size:12px;color:${scoreColor};font-weight:500">${activity.text} für Outdoor-Aktivitäten</span>
        </div>
      </div>
    `;
  }

  // ========================================
  // FALLBACK MODAL (Smart Weather Summary)
  // ========================================

  function renderFallbackModal(cardType, current, analysis) {
    const temp = current.temperature ?? "–";
    const feels = current.apparentTemperature ?? current.feelsLike ?? temp;
    const humidity = current.humidity ?? "–";
    const wind = current.windSpeed ?? "–";
    const description =
      current.description || current.weather?.[0]?.description || "";
    const score = analysis.outdoorScore?.score ?? 50;
    const scoreColor = getScoreColor(score);

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">🌤️</span>
        <h2 class="bottom-sheet__title">${tm("weatherSummary", "Wetter-Zusammenfassung")}</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <div class="detail-card__hero" style="text-align:center;padding:20px 0">
            <span style="font-size:52px;display:block;margin-bottom:12px">
              ${temp > 25 ? "☀️" : temp > 15 ? "🌤️" : temp > 5 ? "🌥️" : "❄️"}
            </span>
            <span style="font-size:32px;font-weight:600;display:block;color:rgba(255,255,255,0.95)">${typeof temp === "number" ? Math.round(temp) : temp}°C</span>
            ${description ? `<span style="display:block;font-size:13px;color:rgba(255,255,255,0.55);margin-top:6px;text-transform:capitalize;font-weight:400">${description}</span>` : ""}
          </div>
        </div>

        <div class="detail-card">
          <h3>${tm("currentConditions", "Aktuelle Bedingungen")}</h3>
          <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;margin-top:10px">
            <div style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,0.04);border-radius:8px;border:0.5px solid rgba(255,255,255,0.04)">
              <span style="font-size:14px">🌡️</span>
              <div>
                <span style="display:block;font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.3px">${tm("feelsLike", "Gefühlt")}</span>
                <span style="font-weight:500;color:rgba(255,255,255,0.85)">${typeof feels === "number" ? Math.round(feels) : feels}°C</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px">
              <span>💧</span>
              <div>
                <span style="display:block;font-size:11px;color:var(--health-text-muted)">${tm("humidity", "Feuchtigkeit")}</span>
                <span style="font-weight:600">${humidity}%</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px">
              <span>💨</span>
              <div>
                <span style="display:block;font-size:11px;color:var(--health-text-muted)">${tm("wind", "Wind")}</span>
                <span style="font-weight:600">${typeof wind === "number" ? Math.round(wind) : wind} km/h</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px">
              <span>📊</span>
              <div>
                <span style="display:block;font-size:11px;color:var(--health-text-muted)">${tm("outdoorScore", "Outdoor-Score")}</span>
                <span style="font-weight:600;color:${scoreColor}">${score}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ========================================
  // HELPER FUNCTIONS FOR FACTORS
  // ========================================

  function getFactorIcon(key) {
    const icons = {
      temperature: "🌡️",
      precipitation: "🌧️",
      wind: "💨",
      humidity: "💧",
      uv: "☀️",
      airQuality: "🌫️",
      visibility: "👁️",
      pollen: "🌸",
    };
    return icons[key] || "📊";
  }

  function getFactorLabel(key, lang = "de") {
    const t = (k) => window.i18n?.t(`health.modal.${k}`) || k;
    const labels = {
      temperature: t("temperature"),
      precipitation: t("precipitation"),
      wind: t("wind"),
      humidity: t("humidity"),
      uv: "UV-Index",
      airQuality: t("airQuality"),
      visibility: t("visibility"),
      pollen: t("pollen"),
    };
    return labels[key] || key;
  }

  /**
   * Helper to get localized string with fallback
   */
  function tm(key, fallback = "") {
    const result = window.i18n?.t(`health.modal.${key}`);
    return result && result !== `health.modal.${key}` ? result : fallback;
  }

  /**
   * Format value or return "not available" text
   */
  function formatValue(val, unit = "", emptyText = null) {
    const noData = tm("noDataAvailable", "Daten nicht verfügbar");
    if (val === null || val === undefined || val === "")
      return emptyText || noData;
    if (typeof val === "number" && isNaN(val)) return emptyText || noData;
    return `${val}${unit}`;
  }

  // ========================================
  // SERVICE WORKER INTEGRATION
  // ========================================

  /**
   * Register for Service Worker health data updates
   */
  function registerForHealthUpdates(callback) {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "HEALTH_DATA_UPDATED") {
        console.log("[HealthSafetyView] Received health data update from SW");
        if (callback) callback(event.data.data);
      }
    });
  }

  /**
   * Request health data sync from Service Worker
   */
  async function requestHealthSync() {
    if (!("serviceWorker" in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        return new Promise((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => resolve(event.data);
          registration.active.postMessage({ type: "GET_CACHED_HEALTH_DATA" }, [
            channel.port2,
          ]);
        });
      }
    } catch (error) {
      console.warn("[HealthSafetyView] SW sync error:", error);
    }
    return null;
  }

  /**
   * Update the health view with new data (called by app on data change)
   */
  function update(appState) {
    const container =
      document.querySelector("[data-health-view]")?.parentElement;
    if (!container) return;

    // Re-render with new data
    container.innerHTML = render(appState, null);

    // Re-attach click handlers
    attachClickHandlers(container, appState);
  }

  /**
   * Attach click handlers using Event Delegation
   * Single listener on container handles all interactive elements
   * Supports both click and touch events for mobile compatibility
   */
  function attachClickHandlers(container, appState) {
    // Find the health view or section
    const healthView =
      container.querySelector("[data-health-view]") ||
      container.querySelector(".health-section") ||
      container;

    console.log("[HealthSafetyView] Attaching click handlers to:", healthView);

    // Remove existing delegated listener if any
    if (healthView._delegatedClickHandler) {
      healthView.removeEventListener(
        "click",
        healthView._delegatedClickHandler,
      );
      healthView.removeEventListener(
        "touchend",
        healthView._delegatedClickHandler,
      );
    }

    // Create delegated click handler with touch support
    healthView._delegatedClickHandler = (event) => {
      // DEBUG: Log every click to verify event binding
      console.log(
        "[HealthSafetyView] Click detected on:",
        event.target.tagName,
        event.target.className,
      );

      // Prevent double-firing on touch devices
      if (event.type === "touchend") {
        event.preventDefault();
      }

      // Find closest interactive element - expanded selector
      const trigger = event.target.closest(
        ".js-open-details, [data-detail-type], [data-clickable-alerts], " +
          ".health-card--outdoor, .outdoor-quality-card, .quick-check-card, " +
          ".bio-card, .safety-alert, .timeline-slot",
      );

      if (!trigger) {
        console.log("[HealthSafetyView] No matching trigger found for click");
        return;
      }

      // Determine the detail type
      let detailType =
        trigger.dataset.detailType ||
        trigger.dataset.checkType ||
        trigger.dataset.cardType;

      // Get hour index for timeline slots
      const hourIndex = trigger.dataset.hourIndex
        ? parseInt(trigger.dataset.hourIndex, 10)
        : null;

      // Fallback detection based on element class/content
      if (!detailType) {
        if (
          trigger.classList.contains("health-card--outdoor") ||
          trigger.classList.contains("outdoor-quality-card")
        ) {
          detailType = "outdoor";
        } else if (trigger.classList.contains("bio-card")) {
          const title =
            trigger.querySelector(".bio-card__title")?.textContent || "";
          detailType = title.includes("Kopfschmerz")
            ? "headache"
            : title.includes("Vitamin")
              ? "vitaminD"
              : "bio";
        } else if (
          trigger.hasAttribute("data-clickable-alerts") ||
          trigger.classList.contains("safety-alert")
        ) {
          detailType = "alerts";
        } else if (trigger.classList.contains("timeline-slot")) {
          detailType = "timeline-hour";
        } else if (trigger.classList.contains("quick-check-card")) {
          // Try to detect type from content
          const label =
            trigger.querySelector(".quick-check-card__label")?.textContent ||
            "";
          if (label.includes("Schirm") || label.includes("Umbrella"))
            detailType = "umbrella";
          else if (label.includes("Jacke") || label.includes("Jacket"))
            detailType = "jacket";
          else if (label.includes("UV") || label.includes("Sonne"))
            detailType = "uv";
          else if (label.includes("Schlaf") || label.includes("Sleep"))
            detailType = "sleep";
        }
      }

      // Store hour index for timeline modals
      if (hourIndex !== null) {
        window._healthModalHourIndex = hourIndex;
      }

      if (!detailType) return;

      // DEBUG: Log triggered modal
      console.log("[HealthSafetyView] Modal Triggered:", detailType, trigger);

      // Dispatch custom event for analytics/logging
      const customEvent = new CustomEvent("health:modal:open", {
        bubbles: true,
        detail: {
          type: detailType,
          source: "HealthSafetyView",
          timestamp: Date.now(),
        },
      });
      healthView.dispatchEvent(customEvent);

      // Open the modal
      openHealthModal(detailType, appState, currentAnalysis);
    };

    // Attach for both click and touch events for mobile compatibility
    healthView.addEventListener("click", healthView._delegatedClickHandler);
    healthView.addEventListener("touchend", healthView._delegatedClickHandler, {
      passive: false,
    });
  }

  // ========================================
  // EXPORTS
  // ========================================

  global.HealthSafetyView = {
    render,
    renderSkeleton,
    update,
    fetchHealthAlerts,
    openHealthModal,
    registerForHealthUpdates,
    requestHealthSync,
    attachClickHandlers,

    // Backwards compatibility
    calculateWindchill,
    getWindchillInfo,
    getScoreColor,
    labelForScore,

    // Access to current state
    getCurrentAnalysis: () => currentAnalysis,
    getEngine: () => currentEngine,
    getComponent: () => currentComponent,
  };
})(window);
