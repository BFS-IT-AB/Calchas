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
      console.warn(
        "[HealthSafetyView] HealthEngine or HealthComponent not loaded, using fallback",
      );
      const fallbackHtml = renderFallbackHealth(appState, healthState);
      insertIntoContainer(fallbackHtml);
      return fallbackHtml;
    }

    // Initialize engine and component
    const language = appState.settings?.language || "de";
    let engine, component;

    try {
      engine = getEngine(language);
      component = getComponent(language);
    } catch (initError) {
      console.error("[HealthSafetyView] Init error:", initError);
      const fallbackHtml = renderFallbackHealth(appState, healthState);
      insertIntoContainer(fallbackHtml);
      return fallbackHtml;
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
      const fallbackHtml = renderFallbackHealth(appState, healthState);
      insertIntoContainer(fallbackHtml);
      return fallbackHtml;
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

  /**
   * Fallback render when new modules are not available
   * Uses the old healthSafetyEngine if available
   */
  function renderFallbackHealth(appState, healthState) {
    // Try to use old healthSafetyEngine
    const engine = global.healthSafetyEngine;
    const data = healthState || (engine ? engine(appState) : null);

    if (!data) {
      return renderEmptyState();
    }

    // Simple fallback UI
    const outdoorScore =
      data.outdoorQuality?.score || data.overall?.score || 70;
    const scoreColor = getScoreColor(outdoorScore);
    const scoreLabel = labelForScore(outdoorScore);

    return `
      <div class="health-view" data-health-view>
        <section class="health-card health-card--outdoor">
          <div class="health-card__header">
            <span class="health-card__icon">🌤️</span>
            <span class="health-card__title">Outdoor-Qualität</span>
          </div>
          <div class="health-card__score" style="text-align: center; padding: 20px;">
            <span class="score-number" style="font-size: 48px; font-weight: bold; color: ${scoreColor};">${outdoorScore}</span>
            <span class="score-label" style="display: block; color: ${scoreColor};">${scoreLabel}</span>
          </div>
        </section>

        <section class="quick-check-section">
          <h3 class="health-section__header">Quick-Checks</h3>
          <div class="quick-check-grid">
            ${renderFallbackQuickChecks(data)}
          </div>
        </section>
      </div>
    `;
  }

  function renderFallbackQuickChecks(data) {
    const checks = [
      {
        key: "umbrella",
        icon: "☂️",
        label: "Regenschirm",
        answer: data.umbrella?.needed ? "Ja" : "Nein",
      },
      {
        key: "uv",
        icon: "☀️",
        label: "UV-Schutz",
        answer: data.uv?.level || "Niedrig",
      },
      {
        key: "jacket",
        icon: "🧥",
        label: "Jacke",
        answer: data.jacket?.type || "Leicht",
      },
      {
        key: "sleep",
        icon: "😴",
        label: "Schlafqualität",
        answer: data.sleep?.quality || "Gut",
      },
    ];

    return checks
      .map(
        (c) => `
      <div class="quick-check-card health-card" data-card-type="${c.key}">
        <span class="quick-check-card__icon">${c.icon}</span>
        <div class="quick-check-card__content">
          <span class="quick-check-card__label">${c.label}</span>
          <span class="quick-check-card__answer">${c.answer}</span>
        </div>
      </div>
    `,
      )
      .join("");
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
  // MODAL SYSTEM
  // ========================================

  /**
   * Open health modal with detailed information
   */
  function openHealthModal(cardType, appState, healthState) {
    const modalContent = getModalContent(cardType, appState, healthState);

    // Use existing modal system if available
    if (global.ModalController?.openBottomSheet) {
      global.ModalController.openBottomSheet(modalContent, {
        allowSwipeClose: true,
      });
    } else if (global.showBottomSheet) {
      global.showBottomSheet(modalContent);
    } else {
      // Fallback: create modal
      showFallbackModal(modalContent);
    }
  }

  function showFallbackModal(content) {
    const existing = document.querySelector(".health-modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "health-modal-overlay";
    overlay.innerHTML = `
      <div class="health-modal-sheet">
        ${content}
      </div>
    `;

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add("health-modal-overlay--visible");
    });
  }

  /**
   * Get modal content for a specific card type
   */
  function getModalContent(cardType, appState, healthState) {
    const current = appState?.current || {};
    const hourly = appState?.hourly || [];
    const analysis = currentAnalysis || healthState || {};

    // Use existing detailed modal content or generate from analysis
    const templates = {
      outdoor: () => renderOutdoorDetailModal(analysis, hourly),
      umbrella: () => renderUmbrellaDetailModal(analysis, hourly),
      uv: () => renderUVDetailModal(analysis, hourly, current),
      jacket: () => renderJacketDetailModal(analysis, current),
      sleep: () => renderSleepDetailModal(analysis, current),
      headache: () => renderHeadacheDetailModal(analysis),
      vitaminD: () => renderVitaminDDetailModal(analysis, current),
      alerts: () => renderAlertsDetailModal(analysis, appState),
    };

    const generator = templates[cardType];
    if (generator) {
      return generator();
    }

    // Default modal
    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">ℹ️</span>
        <h2 class="bottom-sheet__title">Details</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <p>Detailinformationen werden geladen...</p>
      </div>
    `;
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

    const timelineRows = timeline
      .slice(0, 12)
      .map(
        (slot) => `
      <div class="health-chart-row">
        <span class="health-chart-row__time">${formatTime(slot.time)}</span>
        <span class="health-chart-row__score" style="color:${slot.color}">${slot.score}</span>
        <div class="health-chart-bar">
          <div class="health-chart-bar__fill" style="width:${slot.score}%;background:${slot.color}"></div>
        </div>
      </div>
    `,
      )
      .join("");

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">🌤️</span>
        <h2 class="bottom-sheet__title">Outdoor-Score Details</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>Aktueller Score</h3>
          <div class="detail-card__hero">
            <span class="detail-card__value" style="color:${score.color}">${score.score}</span>
            <span class="detail-card__label" style="color:${score.color}">${score.label}</span>
          </div>
          ${
            score.capped
              ? `
            <div class="detail-card__warning">
              ⚠️ Score limitiert durch: ${score.cappedBy === "precipitation" ? "Hohe Regenwahrscheinlichkeit" : "Starker Wind"}
            </div>
          `
              : ""
          }
          ${
            bestWindow
              ? `
            <div class="detail-card__row" style="margin-top:12px;background:rgba(74,222,128,0.15);padding:8px 12px;border-radius:8px">
              <span>✨ ${bestWindow.label}:</span>
              <span style="font-weight:600">${bestWindow.displayText} (Score: ${bestWindow.avgScore})</span>
            </div>
          `
              : ""
          }
        </div>

        <div class="detail-card">
          <h3>Faktor-Analyse</h3>
          <p class="detail-text--muted" style="font-size:0.8rem;margin-bottom:12px">
            Der Score berechnet sich aus gewichteten Umweltfaktoren. Kritische Faktoren können den Score auf max. 30 begrenzen.
          </p>
          <div class="factor-detail-list">${factorRows}</div>
        </div>

        <div class="detail-card">
          <h3>Stündlicher Verlauf</h3>
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

    const hourlyBars = hourly
      .slice(0, 12)
      .map((h) => {
        const prob = h.precipitationProbability || h.precipProb || 0;
        const color =
          prob >= 70 ? "#F44336" : prob >= 40 ? "#FF9800" : "#4CAF50";
        return `
        <div class="hourly-bar">
          <div class="hourly-bar__fill" style="--bar-height:${prob}%;background:${color}"></div>
          <span class="hourly-bar__value">${Math.round(prob)}%</span>
          <span class="hourly-bar__time">${formatTime(h.time)}</span>
        </div>
      `;
      })
      .join("");

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">🌂</span>
        <h2 class="bottom-sheet__title">Regenschirm</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>Empfehlung</h3>
          <div class="detail-card__hero">
            <span class="detail-card__value" style="color:${umbrellaCheck?.color || "#4CAF50"}">
              ${umbrellaCheck?.icon || "☀️"} ${umbrellaCheck?.answer || "Nicht nötig"}
            </span>
          </div>
          <div class="detail-card__row" style="margin-top:12px">
            <span>Regenwahrscheinlichkeit:</span>
            <span style="font-weight:600">${precipProb}%</span>
          </div>
        </div>
        <div class="detail-card">
          <h3>Stündliche Vorhersage</h3>
          <div class="hourly-bars">${hourlyBars}</div>
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
      if (uv <= 2) return "#4CAF50";
      if (uv <= 5) return "#FFEB3B";
      if (uv <= 7) return "#FF9800";
      if (uv <= 10) return "#F44336";
      return "#9C27B0";
    };

    const hourlyUv = hourly
      .slice(0, 12)
      .map((h) => {
        const uv = h.uvIndex || h.uv || 0;
        return `
        <div class="hourly-bar">
          <div class="hourly-bar__fill" style="--bar-height:${(uv / 11) * 100}%;background:${getUvColor(uv)}"></div>
          <span class="hourly-bar__value">${Math.round(uv)}</span>
          <span class="hourly-bar__time">${formatTime(h.time)}</span>
        </div>
      `;
      })
      .join("");

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">☀️</span>
        <h2 class="bottom-sheet__title">UV-Schutz</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>UV-Index heute</h3>
          <div class="detail-card__hero">
            <span class="detail-card__value" style="color:${getUvColor(maxUv)}">${Math.round(maxUv)}</span>
          </div>
          <div class="detail-card__row">
            <span>Aktuell:</span><span style="font-weight:600">${Math.round(currentUv)}</span>
          </div>
          ${
            vitaminD.available
              ? `
            <div class="detail-card__row" style="background:rgba(74,222,128,0.1);padding:8px 12px;border-radius:8px;margin-top:8px">
              <span>☀️ Vitamin D in:</span>
              <span style="font-weight:600">${vitaminD.minutes} Minuten</span>
            </div>
            <div class="detail-card__row">
              <span>⚠️ Sonnenbrand nach:</span>
              <span style="font-weight:600">${vitaminD.sunburnTime} Minuten</span>
            </div>
          `
              : ""
          }
        </div>
        <div class="detail-card">
          <h3>Stündlicher UV-Verlauf</h3>
          <div class="hourly-bars">${hourlyUv}</div>
        </div>
      </div>
    `;
  }

  function renderJacketDetailModal(analysis, current) {
    const checks = analysis.quickChecks || [];
    const jacketCheck = checks.find(
      (c) => c.id === "jacket" || c.type === "clothing",
    );
    const feels =
      current.apparentTemperature ||
      current.feelsLike ||
      current.temperature ||
      15;

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">🧥</span>
        <h2 class="bottom-sheet__title">Kleidungsempfehlung</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>Empfehlung</h3>
          <div class="detail-card__hero">
            <span class="detail-card__value" style="color:${jacketCheck?.color || "#4CAF50"}">
              ${jacketCheck?.icon || "🧥"} ${jacketCheck?.answer || "Leichte Jacke"}
            </span>
          </div>
          <div class="detail-card__row" style="margin-top:12px">
            <span>Gefühlte Temperatur:</span>
            <span style="font-weight:600">${Math.round(feels)}°C</span>
          </div>
        </div>
        <div class="detail-card">
          <h3>Temperatur-Guide</h3>
          <ul class="detail-card__list" style="font-size:0.85rem">
            <li>❄️ &lt;5°C – Dicke Winterjacke, Handschuhe</li>
            <li>🧤 5-12°C – Warme Jacke</li>
            <li>🧥 12-18°C – Leichte Jacke oder Pullover</li>
            <li>👕 &gt;18°C – Keine Jacke nötig</li>
          </ul>
        </div>
      </div>
    `;
  }

  function renderSleepDetailModal(analysis, current) {
    const checks = analysis.quickChecks || [];
    const sleepCheck = checks.find(
      (c) => c.id === "sleep" || c.type === "sleep",
    );
    const temp = current.temperature || 18;
    const humidity = current.humidity || 50;

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">😴</span>
        <h2 class="bottom-sheet__title">Schlafqualität</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>Prognose</h3>
          <div class="detail-card__hero">
            <span class="detail-card__value" style="color:${sleepCheck?.color || "#4CAF50"}">
              ${sleepCheck?.icon || "🛏️"} ${sleepCheck?.answer || "Gut"}
            </span>
          </div>
          <div class="detail-card__row" style="margin-top:12px">
            <span>Temperatur:</span><span style="font-weight:600">${Math.round(temp)}°C</span>
          </div>
          <div class="detail-card__row">
            <span>Luftfeuchtigkeit:</span><span style="font-weight:600">${Math.round(humidity)}%</span>
          </div>
        </div>
        <div class="detail-card">
          <h3>Optimale Schlafbedingungen</h3>
          <ul class="detail-card__list" style="font-size:0.85rem">
            <li>🌡️ Temperatur: 16-19°C</li>
            <li>💧 Luftfeuchtigkeit: 40-60%</li>
            <li>🌙 Verdunkeln und lüften vor dem Schlafen</li>
          </ul>
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
          <h3>Aktuelles Risiko</h3>
          <div class="detail-card__hero">
            <span class="detail-card__value" style="color:${headache.color || "#4CAF50"}">
              ${headache.advice || "Niedriges Risiko"}
            </span>
          </div>
          <div class="detail-card__row" style="margin-top:12px">
            <span>Luftdruckänderung:</span>
            <span style="font-weight:600">${headache.change > 0 ? "+" : ""}${headache.change || 0} hPa</span>
          </div>
          <div class="detail-card__row">
            <span>Trend:</span>
            <span style="font-weight:600">${headache.trendAdvice || "Stabil"}</span>
          </div>
        </div>
        <div class="detail-card">
          <h3>Bio-Wetter Info</h3>
          <p class="detail-text--muted" style="font-size:0.85rem">
            Schnelle Luftdruckänderungen (&gt;5 hPa in 3 Stunden) können bei empfindlichen Personen
            Kopfschmerzen oder Migräne auslösen.
          </p>
          <ul class="detail-card__list" style="font-size:0.85rem;margin-top:12px">
            <li>💧 Viel Wasser trinken</li>
            <li>😴 Ausreichend schlafen</li>
            <li>🚶 Moderate Bewegung</li>
          </ul>
        </div>
      </div>
    `;
  }

  function renderVitaminDDetailModal(analysis, current) {
    const vitaminD = analysis.vitaminDTimer || {};
    const uvIndex = current.uvIndex || 0;

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">☀️</span>
        <h2 class="bottom-sheet__title">Vitamin-D Timer</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="detail-card">
          <h3>Heute</h3>
          ${
            vitaminD.available
              ? `
            <div class="detail-card__hero">
              <span class="detail-card__value" style="color:#4ade80">${vitaminD.minutes} min</span>
              <span class="detail-card__label">für ausreichend Vitamin D</span>
            </div>
            <div class="detail-card__row" style="margin-top:12px">
              <span>UV-Index:</span><span style="font-weight:600">${Math.round(uvIndex)}</span>
            </div>
            <div class="detail-card__row">
              <span>Sichere Expositionszeit:</span>
              <span style="font-weight:600">${vitaminD.safeExposure || vitaminD.minutes} min</span>
            </div>
            <div class="detail-card__row" style="color:#FF9800">
              <span>⚠️ Sonnenbrand ab:</span>
              <span style="font-weight:600">${vitaminD.sunburnTime} min</span>
            </div>
          `
              : `
            <div class="detail-card__hero">
              <span class="detail-card__value" style="color:#9E9E9E">–</span>
              <span class="detail-card__label">${vitaminD.advice || "UV-Index zu niedrig"}</span>
            </div>
          `
          }
        </div>
        <div class="detail-card">
          <h3>Vitamin D Wissen</h3>
          <ul class="detail-card__list" style="font-size:0.85rem">
            <li>☀️ UV-Index &gt;3 für Vitamin-D-Synthese nötig</li>
            <li>🧴 Nach der Vitamin-D-Zeit: Sonnenschutz nutzen</li>
            <li>⏰ Beste Zeit: 10-14 Uhr (höchster UV-Index)</li>
            <li>👕 25% der Haut exponieren (Arme, Beine)</li>
          </ul>
        </div>
      </div>
    `;
  }

  function renderAlertsDetailModal(analysis, appState) {
    const alerts = fetchHealthAlerts(appState);
    const safetyAlerts = analysis.safetyAlerts || [];
    const allAlerts = [
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
          <h2 class="bottom-sheet__title">Wetter-Status</h2>
          <button class="bottom-sheet__close" type="button" data-close-sheet>
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        <div class="bottom-sheet__body">
          <div class="detail-card">
            <div class="alerts-modal-empty">
              <span class="alerts-modal-empty__icon">🌤️</span>
              <h3>Keine Warnungen</h3>
              <p>In den nächsten 24 Stunden sind keine besonderen Wetterereignisse zu erwarten.</p>
            </div>
          </div>
        </div>
      `;
    }

    const alertCards = allAlerts
      .map((alert) => {
        const info = getAlertCategoryInfo(alert.type);
        const severityColor =
          alert.severity === "red"
            ? "#F44336"
            : alert.severity === "orange"
              ? "#FF9800"
              : "#FFEB3B";
        return `
        <div class="alert-detail-card" style="border-left: 4px solid ${severityColor}">
          <div class="alert-detail-header">
            <span class="alert-detail-icon">${info.icon}</span>
            <span class="alert-detail-title">${alert.title}</span>
          </div>
          <p class="alert-detail-text">${alert.description || alert.message}</p>
          ${alert.time ? `<span class="alert-detail-time">${formatTime(alert.time)}</span>` : ""}
        </div>
      `;
      })
      .join("");

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">⚠️</span>
        <h2 class="bottom-sheet__title">Wetter-Warnungen</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        ${alertCards}
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

  function getFactorLabel(key) {
    const labels = {
      temperature: "Temperatur",
      precipitation: "Niederschlag",
      wind: "Wind",
      humidity: "Feuchtigkeit",
      uv: "UV-Index",
      airQuality: "Luftqualität",
      visibility: "Sichtweite",
      pollen: "Pollenflug",
    };
    return labels[key] || key;
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
      let detailType = trigger.dataset.detailType || trigger.dataset.checkType;

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
        }
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
