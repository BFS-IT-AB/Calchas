/**
 * Developer Dashboard Controller
 * Strukturiert gemäß der Architektur-Spezifikation (dev-dashboard-goal.md)
 *
 * Verantwortlichkeiten:
 * - Tab 1 (Overview): Systemstatus, App-Info, Performance
 * - Tab 2 (Runtime): App-State, Lifecycle, Feature-States
 * - Tab 3 (Service Worker): SW-Status, Events, Aktionen
 * - Tab 4 (Capabilities): Feature-Matrix, Permissions
 * - Tab 5 (Data & APIs): API-Status, Datenpfade
 * - Tab 6 (Cache & Storage): Cache-Analyse, Storage
 * - Tab 7 (Errors & Logs): Error Timeline, Live Console
 * - Tab 8 (Simulation): Grenz- und Fehlerfälle testen
 * - Tab 9 (Config): Build-Info, Feature Flags
 */

(function (global) {
  "use strict";

  console.log("🔧 [DevDashboard] Initializing...");

  // ===============================================
  // STATE & CONFIGURATION
  // ===============================================
  const consoleLogs = [];
  const MAX_CONSOLE_LOGS = 1000;
  const errorTracking = { app: 0, sw: 0, api: 0, network: 0 };
  const swEvents = [];
  const appStartTime = Date.now();
  const sessionId = Math.random().toString(36).substring(2, 10);

  // Simulation state
  const simulationState = {
    offline: false,
    slowNetwork: false,
    apiFailure: null,
    cacheCorruption: false,
  };

  // ===============================================
  // INITIALIZATION
  // ===============================================
  function init() {
    captureConsoleLogs();
    updateOverviewTab();
    setupServiceWorkerMonitoring();
    setupPerformanceMonitoring();
    setupErrorTracking();
    console.log("✅ [DevDashboard] Ready");
  }

  // ===============================================
  // TAB 1: OVERVIEW
  // ===============================================
  function updateOverviewTab() {
    // Version info
    getVersionInfo().then((versionInfo) => {
      document.getElementById("appVersion").textContent =
        versionInfo.appVersion || "-";
      document.getElementById("buildId").textContent =
        versionInfo.buildId || "-";
      document.getElementById("commitHash").textContent =
        versionInfo.commitHash || "-";
    });

    // Network status
    updateNetworkInfo();

    // App state
    updateAppState();

    // Performance
    if (performance && performance.timing) {
      const loadTime =
        performance.timing.loadEventEnd - performance.timing.navigationStart;
      document.getElementById("pageLoadTime").textContent = `${loadTime}ms`;
    }

    if (performance.memory) {
      const memoryMB = (
        performance.memory.usedJSHeapSize /
        1024 /
        1024
      ).toFixed(2);
      document.getElementById("memoryUsage").textContent = `${memoryMB} MB`;
    }

    startFPSCounter();
    updateSystemStatusBadge();
    updateGlobalSystemStatus();
  }

  function updateAppState() {
    const appStateEl = document.getElementById("appState");
    const dataModeEl = document.getElementById("dataMode");

    if (appStateEl) {
      // Determine current app state
      let state = "idle";
      if (!navigator.onLine) state = "offline";
      else if (window.weatherDataService?.isFetching) state = "fetching";

      appStateEl.textContent = state;
      appStateEl.className = `dev-state-badge dev-state-badge--${state}`;
    }

    if (dataModeEl) {
      // Determine data mode
      let mode = "live";
      if (!navigator.onLine) mode = "cached";
      dataModeEl.textContent = mode;
    }
  }

  function updateGlobalSystemStatus() {
    const banner = document.getElementById("globalSystemStatus");
    if (!banner) return;

    const swOK = "serviceWorker" in navigator;
    const modulesOK =
      !!window.weatherDataService && !!window.historyCacheService;
    const networkOK = navigator.onLine;

    let status, icon, text, subtext;

    if (swOK && modulesOK && networkOK) {
      status = "healthy";
      icon = "✅";
      text = "Alle Systeme operational";
      subtext = "App funktioniert normal";
    } else if (!networkOK && swOK) {
      status = "offline";
      icon = "📴";
      text = "Offline-Modus aktiv";
      subtext = "Daten werden aus Cache geladen";
    } else if (!modulesOK) {
      status = "degraded";
      icon = "⚠️";
      text = "Eingeschränkte Funktionalität";
      subtext = "Einige Module nicht verfügbar";
    } else {
      status = "error";
      icon = "❌";
      text = "Systemfehler";
      subtext = "Kritische Komponenten fehlen";
    }

    banner.className = `dev-status-banner dev-status-banner--${status}`;
    banner.innerHTML = `
      <span class="dev-status-icon">${icon}</span>
      <div class="dev-status-content">
        <strong>${text}</strong>
        <span>${subtext}</span>
      </div>
    `;
  }

  function updateNetworkInfo() {
    const online = navigator.onLine;
    document.getElementById("networkStatus").textContent = online
      ? "✅ Online"
      : "❌ Offline";
    document.getElementById("networkStatus").style.color = online
      ? "#10b981"
      : "#ef4444";

    if (navigator.connection) {
      const conn = navigator.connection;
      document.getElementById("networkType").textContent =
        conn.effectiveType || "Unknown";
      document.getElementById("networkSpeed").textContent = conn.downlink
        ? `${conn.downlink} Mbps`
        : "Unknown";
    } else {
      document.getElementById("networkType").textContent = "N/A";
      document.getElementById("networkSpeed").textContent = "N/A";
    }
  }

  function startFPSCounter() {
    let lastTime = performance.now();
    let frames = 0;

    function countFPS() {
      frames++;
      const currentTime = performance.now();
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        const fpsEl = document.getElementById("fpsCounter");
        if (fpsEl) {
          fpsEl.textContent = `${fps} FPS`;
          fpsEl.style.color =
            fps >= 55 ? "#10b981" : fps >= 30 ? "#fbbf24" : "#ef4444";
        }
        frames = 0;
        lastTime = currentTime;
      }
      requestAnimationFrame(countFPS);
    }
    countFPS();
  }

  function updateSystemStatusBadge() {
    const badge = document.getElementById("systemStatusBadge");
    if (!badge) return;

    const swOK = "serviceWorker" in navigator;
    const modulesOK =
      !!window.weatherDataService && !!window.historyCacheService;
    const networkOK = navigator.onLine;

    const dot = badge.querySelector(".status-dot");
    const text = badge.querySelector("span:last-child");

    if (swOK && modulesOK && networkOK) {
      dot.style.background = "#10b981";
      text.textContent = "Healthy";
    } else if (!networkOK && swOK) {
      dot.style.background = "#fbbf24";
      text.textContent = "Offline";
    } else if (swOK || modulesOK) {
      dot.style.background = "#fbbf24";
      text.textContent = "Degraded";
    } else {
      dot.style.background = "#ef4444";
      text.textContent = "Error";
    }
  }

  function openDiagnostics() {
    // Switch to Errors tab
    document.querySelector('[data-tab="errors"]')?.click();
  }

  function refreshAllData() {
    updateOverviewTab();
    if (window.weatherDataService?.refresh) {
      window.weatherDataService.refresh();
    }
    console.log("✅ [DevDashboard] Alle Daten aktualisiert");
  }

  // ===============================================
  // TAB 2: RUNTIME & STATE
  // ===============================================
  function updateRuntimeTab() {
    // Runtime duration
    const durationEl = document.getElementById("runtimeDuration");
    if (durationEl) {
      const duration = Date.now() - appStartTime;
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      durationEl.textContent = `${minutes}m ${seconds}s`;
    }

    // Last reload
    const reloadEl = document.getElementById("lastReload");
    if (reloadEl) {
      reloadEl.textContent = new Date(appStartTime).toLocaleTimeString();
    }

    // Session ID
    const sessionEl = document.getElementById("sessionId");
    if (sessionEl) {
      sessionEl.textContent = sessionId;
    }

    // Update state machine visualization
    updateStateMachine();

    // Update feature states
    updateFeatureStates();

    // Update modules list
    updateModulesList();

    // Update error states
    updateErrorStates();
  }

  function updateStateMachine() {
    const states = document.querySelectorAll(".dev-state-item");
    let currentState = "idle";

    if (!navigator.onLine) currentState = "offline";
    else if (window.weatherDataService?.isFetching) currentState = "fetching";
    else if (window.weatherDataService?.hasError) currentState = "error";
    else if (window.weatherDataService?.usingFallback)
      currentState = "fallback";

    states.forEach((stateEl) => {
      stateEl.classList.remove("dev-state-item--active");
      if (stateEl.dataset.state === currentState) {
        stateEl.classList.add("dev-state-item--active");
      }
    });
  }

  function updateFeatureStates() {
    const features = {
      featureForecast: !!window.weatherDataService,
      featureRadar: !!window.MapController,
      featureHealth: !!window.HealthComponent,
      featureHistory: !!window.HistoryController,
      featureGeo: "geolocation" in navigator,
      featureNotif: "Notification" in window,
    };

    Object.entries(features).forEach(([id, loaded]) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = loaded ? "✅ Aktiv" : "❌ Inaktiv";
        el.style.color = loaded ? "#10b981" : "#ef4444";
      }
    });
  }

  function updateModulesList() {
    const modules = [
      { name: "WeatherDataService", key: "weatherDataService" },
      { name: "HistoryCacheService", key: "historyCacheService" },
      { name: "APIKeyManager", key: "apiKeyManager" },
      { name: "MasterUIController", key: "MasterUIController" },
      { name: "HistoryController", key: "HistoryController" },
      { name: "HealthComponent", key: "HealthComponent" },
      { name: "MapController", key: "MapController" },
      { name: "BottomNav", key: "BottomNav" },
      { name: "DevDashboard", key: "DevDashboard" },
    ];

    const modulesList = document.getElementById("modulesList");
    if (!modulesList) return;

    let html = '<div class="dev-modules-grid">';
    modules.forEach((mod) => {
      const loaded = !!window[mod.key];
      const status = loaded ? "✅" : "❌";
      const statusClass = loaded ? "success" : "error";
      html += `
        <div class="dev-module-item dev-module-item--${statusClass}">
          <span class="dev-module-status">${status}</span>
          <span class="dev-module-name">${mod.name}</span>
        </div>
      `;
    });
    html += "</div>";
    modulesList.innerHTML = html;
  }

  function updateErrorStates() {
    const activeEl = document.getElementById("activeErrors");
    const silentEl = document.getElementById("silentErrors");
    const recoveriesEl = document.getElementById("recoveries");
    const derivedEl = document.getElementById("derivedState");

    if (activeEl) activeEl.textContent = errorTracking.app;
    if (silentEl) silentEl.textContent = errorTracking.sw;
    if (recoveriesEl) recoveriesEl.textContent = "0"; // TODO: Track recoveries

    if (derivedEl) {
      if (!navigator.onLine && "serviceWorker" in navigator) {
        derivedEl.innerHTML =
          '<div class="dev-derived-info">📴 Offline, aber funktional (SW aktiv)</div>';
      } else if (errorTracking.app > 0) {
        derivedEl.innerHTML =
          '<div class="dev-derived-warning">⚠️ Fehler vorhanden, App möglicherweise instabil</div>';
      } else {
        derivedEl.innerHTML =
          '<div class="dev-derived-ok">✅ Keine bekannten Probleme</div>';
      }
    }
  }

  // ===============================================
  // TAB 3: SERVICE WORKER
  // ===============================================
  function setupServiceWorkerMonitoring() {
    checkServiceWorkerStatus();

    // Listen for SW events
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        logSwEvent("controllerchange", "Service Worker Controller changed");
      });

      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) {
          logSwEvent("waiting", "New Service Worker waiting");
        }
      });
    }
  }

  function logSwEvent(type, message) {
    swEvents.push({
      type,
      message,
      timestamp: Date.now(),
    });
    updateSwEventsDisplay();
  }

  function updateSwEventsDisplay() {
    const container = document.getElementById("swEvents");
    if (!container) return;

    if (swEvents.length === 0) {
      container.innerHTML =
        '<div class="dev-info-message">Events werden hier angezeigt, wenn sie auftreten</div>';
      return;
    }

    let html = "";
    swEvents
      .slice(-20)
      .reverse()
      .forEach((event) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        html += `<div class="dev-event-entry">
        <span class="dev-event-time">${time}</span>
        <span class="dev-event-type">[${event.type}]</span>
        <span class="dev-event-message">${event.message}</span>
      </div>`;
      });
    container.innerHTML = html;
  }

  async function checkServiceWorkerStatus() {
    const container = document.getElementById("swStatus");
    if (!container) return;

    if (!("serviceWorker" in navigator)) {
      container.innerHTML =
        '<div class="dev-error">Service Worker nicht unterstützt</div>';
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        container.innerHTML =
          '<div class="dev-warning">Kein Service Worker registriert</div>';
        return;
      }

      const sw =
        registration.active || registration.installing || registration.waiting;

      let statusText = "Unbekannt";
      let statusColor = "#fbbf24";

      if (registration.active) {
        statusText = "✅ Active";
        statusColor = "#10b981";
      } else if (registration.installing) {
        statusText = "⏳ Installing";
        statusColor = "#fbbf24";
      } else if (registration.waiting) {
        statusText = "⏸️ Waiting";
        statusColor = "#fbbf24";
      }

      let html = '<div class="dev-sw-info">';
      html += `<div class="dev-info-row"><span>State:</span><strong style="color:${statusColor}">${statusText}</strong></div>`;
      html += `<div class="dev-info-row"><span>Script:</span><strong>${sw?.scriptURL?.split("/").pop() || "N/A"}</strong></div>`;
      html += "</div>";
      container.innerHTML = html;

      // Update details section
      document.getElementById("swScope").textContent =
        registration.scope || "-";
      document.getElementById("swSkipWaiting").textContent =
        registration.waiting ? "Ja (wartend)" : "Nein";

      // Get client count
      if (sw) {
        try {
          const mc = new MessageChannel();
          const clientInfo = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => resolve({ clients: "N/A" }), 2000);
            mc.port1.onmessage = (event) => {
              clearTimeout(timeout);
              resolve(event.data);
            };
            navigator.serviceWorker.controller?.postMessage(
              { type: "GET_CLIENT_COUNT" },
              [mc.port2],
            );
          });
          document.getElementById("swClients").textContent =
            clientInfo.clients || "1";
        } catch {
          document.getElementById("swClients").textContent = "1";
        }
      }
    } catch (error) {
      container.innerHTML =
        '<div class="dev-error">Fehler: ' + error.message + "</div>";
    }
  }

  async function triggerSkipWaiting() {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        logSwEvent("skipWaiting", "Skip Waiting triggered");
        alert("Skip Waiting ausgelöst. Seite wird neu geladen...");
        setTimeout(() => window.location.reload(), 500);
      } else {
        alert("Kein wartender Service Worker vorhanden.");
      }
    } catch (error) {
      alert("Fehler: " + error.message);
    }
  }

  async function getSwDiagnostics() {
    const output = document.getElementById("swDiagnosticsOutput");
    if (!output) return;

    output.innerHTML = '<div class="dev-loading">Getting diagnostics...</div>';

    try {
      if (!navigator.serviceWorker.controller) {
        output.innerHTML =
          '<div class="dev-warning">Kein Service Worker Controller verfügbar</div>';
        return;
      }

      const mc = new MessageChannel();
      const diagnostics = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);

        mc.port1.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event.data);
        };

        navigator.serviceWorker.controller.postMessage(
          { type: "GET_DIAGNOSTICS" },
          [mc.port2],
        );
      });

      let html = '<div class="dev-output-success">';
      html += "<h4>✅ Service Worker Diagnostics</h4>";
      html += "<pre>" + JSON.stringify(diagnostics, null, 2) + "</pre>";
      html += "</div>";
      output.innerHTML = html;
    } catch (error) {
      output.innerHTML =
        '<div class="dev-error">Error: ' + error.message + "</div>";
    }
  }

  async function validateSwCache() {
    const output = document.getElementById("swDiagnosticsOutput");
    if (!output) return;

    output.innerHTML = '<div class="dev-loading">Validating cache...</div>';

    try {
      if (!navigator.serviceWorker.controller) {
        output.innerHTML =
          '<div class="dev-warning">Kein Service Worker Controller verfügbar</div>';
        return;
      }

      const mc = new MessageChannel();
      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout")), 10000);

        mc.port1.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event.data);
        };

        navigator.serviceWorker.controller.postMessage(
          { type: "VALIDATE_CACHE" },
          [mc.port2],
        );
      });

      let html = '<div class="dev-output-success">';
      html += "<h4>✅ Cache Validation Results</h4>";
      html += "<pre>" + JSON.stringify(result, null, 2) + "</pre>";
      html += "</div>";
      output.innerHTML = html;
    } catch (error) {
      output.innerHTML =
        '<div class="dev-error">Error: ' + error.message + "</div>";
    }
  }

  async function clearSwCaches() {
    if (
      !confirm(
        "Alle Service Worker Caches löschen? Die Seite wird neu geladen.",
      )
    )
      return;

    try {
      if (navigator.serviceWorker.controller) {
        const mc = new MessageChannel();
        navigator.serviceWorker.controller.postMessage(
          { type: "CLEAR_ALL_CACHES" },
          [mc.port2],
        );
      }

      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }

      logSwEvent("cacheCleared", "All caches cleared");
      alert("Caches gelöscht! Seite wird neu geladen...");
      window.location.reload();
    } catch (error) {
      alert("Fehler: " + error.message);
    }
  }

  // ===============================================
  // TAB 4: CAPABILITIES
  // ===============================================
  function updateCapabilitiesTab() {
    // Feature Matrix
    const capabilities = {
      capSW: "serviceWorker" in navigator,
      capBgSync: "SyncManager" in window,
      capPeriodicSync: "periodicSync" in (navigator.serviceWorker || {}),
      capPush: "PushManager" in window,
      capGeo: "geolocation" in navigator,
      capNotif: "Notification" in window,
      capIDB: "indexedDB" in window,
      capCache: "caches" in window,
    };

    Object.entries(capabilities).forEach(([id, supported]) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = supported ? "✅ Verfügbar" : "❌ Nicht verfügbar";
        el.style.color = supported ? "#10b981" : "#ef4444";
      }
    });

    // Permission Status
    updatePermissionStatus();

    // Storage Info
    updateStorageInfo();

    // Platform Restrictions
    updatePlatformRestrictions();

    // Browser Info
    const ua = navigator.userAgent;
    const browser =
      ua.match(/(Chrome|Firefox|Safari|Edge)\/[\d\.]+/)?.[0] || "Unknown";
    document.getElementById("userAgent").textContent = browser;
    document.getElementById("viewport").textContent =
      `${window.innerWidth}x${window.innerHeight}`;
    document.getElementById("browserLang").textContent = navigator.language;
    document.getElementById("platform").textContent =
      navigator.platform || navigator.userAgentData?.platform || "Unknown";
  }

  async function updatePermissionStatus() {
    const permissions = [
      { id: "permGeo", name: "geolocation" },
      { id: "permNotif", name: "notifications" },
      { id: "permStorage", name: "persistent-storage" },
    ];

    for (const perm of permissions) {
      const el = document.getElementById(perm.id);
      if (!el) continue;

      try {
        const result = await navigator.permissions.query({ name: perm.name });
        const statusMap = {
          granted: { text: "✅ Granted", color: "#10b981" },
          denied: { text: "❌ Denied", color: "#ef4444" },
          prompt: { text: "❓ Prompt", color: "#fbbf24" },
        };
        const status = statusMap[result.state] || {
          text: result.state,
          color: "#64748b",
        };
        el.textContent = status.text;
        el.style.color = status.color;
      } catch {
        el.textContent = "N/A";
        el.style.color = "#64748b";
      }
    }
  }

  async function updateStorageInfo() {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage / 1024 / 1024).toFixed(2);
      const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);

      document.getElementById("storageUsed").textContent = `${usedMB} MB`;
      document.getElementById("storageQuota").textContent = `${quotaMB} MB`;
    }

    if (navigator.storage?.persisted) {
      const persisted = await navigator.storage.persisted();
      document.getElementById("persistentStorage").textContent = persisted
        ? "✅ Ja"
        : "❌ Nein";
    }
  }

  function updatePlatformRestrictions() {
    const container = document.getElementById("platformRestrictions");
    if (!container) return;

    const restrictions = [];

    // Check for iOS restrictions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      restrictions.push("📱 iOS: Push Notifications nur in PWA");
      restrictions.push("📱 iOS: Service Worker Limits (7 Tage ohne Nutzung)");
    }

    // Check for private mode
    try {
      localStorage.setItem("test", "test");
      localStorage.removeItem("test");
    } catch {
      restrictions.push("🔒 Private Mode: LocalStorage eingeschränkt");
    }

    // Check for Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      restrictions.push("🧭 Safari: Web Push API eingeschränkt");
    }

    if (restrictions.length === 0) {
      container.innerHTML =
        '<div class="dev-info-message">✅ Keine bekannten Einschränkungen</div>';
    } else {
      container.innerHTML = restrictions
        .map((r) => `<div class="dev-restriction-item">${r}</div>`)
        .join("");
    }
  }

  // ===============================================
  // TAB 5: DATA & APIs
  // ===============================================
  function updateAPIStatus() {
    const container = document.getElementById("apiStatus");
    if (!container) return;

    const apis = [
      { name: "Open-Meteo", url: "api.open-meteo.com", icon: "🌤️" },
      { name: "BrightSky", url: "api.brightsky.dev", icon: "☀️" },
      { name: "OpenWeatherMap", url: "api.openweathermap.org", icon: "🌦️" },
      { name: "Visual Crossing", url: "api.visualcrossing.com", icon: "🌈" },
      { name: "WAQI (Air Quality)", url: "api.waqi.info", icon: "💨" },
    ];

    let html = "";
    apis.forEach((api) => {
      html += `
        <div class="dev-api-card">
          <div class="dev-api-icon">${api.icon}</div>
          <div class="dev-api-info">
            <div class="dev-api-name">${api.name}</div>
            <div class="dev-api-url">${api.url}</div>
          </div>
          <div class="dev-api-status" id="api-${api.url}">⏳</div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Test each API
    apis.forEach((api) => testAPIEndpoint(api));

    // Update data freshness
    updateDataFreshness();
  }

  async function testAPIEndpoint(api) {
    const statusEl = document.getElementById(`api-${api.url}`);
    if (!statusEl) return;

    try {
      const response = await fetch(`https://${api.url}/`, {
        method: "HEAD",
        mode: "no-cors",
      });
      statusEl.textContent = "✅";
      statusEl.style.color = "#10b981";
    } catch (error) {
      statusEl.textContent = "❌";
      statusEl.style.color = "#ef4444";
      errorTracking.api++;
    }
  }

  function updateDataFreshness() {
    // Weather data age
    const weatherAgeEl = document.getElementById("weatherDataAge");
    const weatherStatusEl = document.getElementById("weatherDataStatus");

    if (weatherAgeEl && weatherStatusEl) {
      const lastFetch = localStorage.getItem("weather_last_fetch");
      if (lastFetch) {
        const age = Date.now() - parseInt(lastFetch);
        const minutes = Math.floor(age / 60000);
        weatherAgeEl.textContent = `${minutes} min`;

        if (minutes < 15) {
          weatherStatusEl.textContent = "🟢 Fresh";
          weatherStatusEl.style.color = "#10b981";
        } else if (minutes < 60) {
          weatherStatusEl.textContent = "🟡 Stale";
          weatherStatusEl.style.color = "#fbbf24";
        } else {
          weatherStatusEl.textContent = "🔴 Expired";
          weatherStatusEl.style.color = "#ef4444";
        }
      } else {
        weatherAgeEl.textContent = "N/A";
        weatherStatusEl.textContent = "❓ Unknown";
      }
    }
  }

  async function testAPIsWithCoords() {
    const output = document.getElementById("apiTestResults");
    if (!output) return;

    const lat = document.getElementById("testLat")?.value || "52.52";
    const lon = document.getElementById("testLon")?.value || "13.405";
    const selectedApi =
      document.getElementById("testApiSelect")?.value || "all";

    output.innerHTML = '<div class="dev-loading">Running API tests...</div>';

    const results = [];

    // Test WeatherDataService
    if (
      window.weatherDataService &&
      (selectedApi === "all" || selectedApi === "weatherservice")
    ) {
      try {
        const start = performance.now();
        const data = await window.weatherDataService.loadCurrentWeather(
          parseFloat(lat),
          parseFloat(lon),
        );
        const duration = performance.now() - start;
        results.push({
          api: "WeatherDataService",
          status: "✅",
          duration: duration.toFixed(0) + "ms",
          dataSize: JSON.stringify(data).length + " bytes",
        });
      } catch (error) {
        results.push({
          api: "WeatherDataService",
          status: "❌",
          error: error.message,
        });
        errorTracking.api++;
      }
    }

    let html = '<div class="dev-output-success"><h4>API Test Results</h4>';
    results.forEach((result) => {
      html += '<div class="dev-test-result">';
      html += `<strong>${result.status} ${result.api}</strong>`;
      if (result.duration) html += ` - ${result.duration}`;
      if (result.dataSize) html += ` (${result.dataSize})`;
      if (result.error) html += ` - Error: ${result.error}`;
      html += "</div>";
    });

    if (results.length === 0) {
      html += '<div class="dev-info-message">Keine Tests ausgeführt</div>';
    }

    html += "</div>";
    output.innerHTML = html;
  }

  // ===============================================
  // TAB 6: CACHE & STORAGE
  // ===============================================
  async function refreshCacheView() {
    const container = document.getElementById("cacheOverview");
    if (!container) return;

    container.innerHTML = '<div class="dev-loading">Lade Caches...</div>';

    try {
      if (!("caches" in window)) {
        container.innerHTML =
          '<div class="dev-warning">Cache API nicht unterstützt</div>';
        return;
      }

      const cacheNames = await caches.keys();

      if (cacheNames.length === 0) {
        container.innerHTML =
          '<div class="dev-info-message">Keine Caches gefunden</div>';
        return;
      }

      let html = '<div class="dev-cache-grid">';

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        const size = keys.length;

        html += `
          <div class="dev-cache-card" onclick="window.DevDashboard.showCacheContents('${cacheName}')">
            <div class="dev-cache-name">${cacheName}</div>
            <div class="dev-cache-size">${size} Einträge</div>
            <button class="dev-cache-delete" onclick="event.stopPropagation(); window.DevDashboard.deleteCache('${cacheName}')">🗑️</button>
          </div>
        `;
      }

      html += "</div>";
      container.innerHTML = html;

      // Update storage summary
      updateStorageSummary();
    } catch (error) {
      container.innerHTML =
        '<div class="dev-error">Fehler: ' + error.message + "</div>";
    }
  }

  async function showCacheContents(cacheName) {
    const container = document.getElementById("cacheContents");
    if (!container) return;

    container.innerHTML =
      '<div class="dev-loading">Lade Cache-Inhalte...</div>';

    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      let html = '<div class="dev-cache-list">';
      html += '<div class="dev-cache-list-header">';
      html += "<h4>📁 " + cacheName + "</h4>";
      html += "<span>" + requests.length + " Einträge</span>";
      html += "</div>";

      for (const request of requests.slice(0, 50)) {
        const url = new URL(request.url);
        html += '<div class="dev-cache-entry">' + url.pathname + "</div>";
      }

      if (requests.length > 50) {
        html +=
          '<div class="dev-info-message">... und ' +
          (requests.length - 50) +
          " weitere</div>";
      }

      html += "</div>";
      container.innerHTML = html;
    } catch (error) {
      container.innerHTML =
        '<div class="dev-error">Fehler: ' + error.message + "</div>";
    }
  }

  async function deleteCache(cacheName) {
    if (!confirm(`Cache "${cacheName}" löschen?`)) return;

    try {
      await caches.delete(cacheName);
      refreshCacheView();
      alert("Cache gelöscht!");
    } catch (error) {
      alert("Fehler: " + error.message);
    }
  }

  async function updateStorageSummary() {
    if (!navigator.storage?.estimate) return;

    const estimate = await navigator.storage.estimate();
    const usedPercent = ((estimate.usage / estimate.quota) * 100).toFixed(1);

    const barFill = document.getElementById("storageBarFill");
    const usedText = document.getElementById("storageUsedText");
    const quotaText = document.getElementById("storageQuotaText");

    if (barFill) barFill.style.width = `${Math.min(usedPercent, 100)}%`;
    if (usedText)
      usedText.textContent = `${(estimate.usage / 1024 / 1024).toFixed(2)} MB`;
    if (quotaText)
      quotaText.textContent = `von ${(estimate.quota / 1024 / 1024).toFixed(0)} MB`;
  }

  function refreshStorage() {
    updateLocalStorage();
    updateSessionStorage();
    updateCookies();
  }

  function updateLocalStorage() {
    const statsEl = document.getElementById("localStorageStats");
    const tableEl = document.getElementById("localStorageTable");
    if (!statsEl || !tableEl) return;

    const items = [];
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const size = new Blob([value]).size;
      totalSize += size;
      items.push({ key, value, size });
    }

    statsEl.innerHTML = `
      <div class="dev-storage-stat">
        <strong>${items.length}</strong> Einträge
      </div>
      <div class="dev-storage-stat">
        <strong>${(totalSize / 1024).toFixed(2)} KB</strong> Gesamtgröße
      </div>
    `;

    if (items.length === 0) {
      tableEl.innerHTML =
        '<div class="dev-info-message">LocalStorage ist leer</div>';
      return;
    }

    let html =
      '<table class="dev-table"><thead><tr><th>Key</th><th>Wert</th><th>Größe</th><th>Aktion</th></tr></thead><tbody>';
    items.forEach((item) => {
      const displayValue =
        item.value.length > 100
          ? item.value.substring(0, 100) + "..."
          : item.value;
      html += `<tr>
        <td><code>${item.key}</code></td>
        <td><span class="dev-storage-value">${displayValue}</span></td>
        <td>${(item.size / 1024).toFixed(2)} KB</td>
        <td><button class="dev-btn-small" onclick="localStorage.removeItem('${item.key}'); window.DevDashboard.refreshStorage()">Löschen</button></td>
      </tr>`;
    });
    html += "</tbody></table>";
    tableEl.innerHTML = html;
  }

  function updateSessionStorage() {
    const tableEl = document.getElementById("sessionStorageTable");
    if (!tableEl) return;

    const items = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
      items.push({ key, value });
    }

    if (items.length === 0) {
      tableEl.innerHTML =
        '<div class="dev-info-message">SessionStorage ist leer</div>';
      return;
    }

    let html =
      '<table class="dev-table"><thead><tr><th>Key</th><th>Wert</th><th>Aktion</th></tr></thead><tbody>';
    items.forEach((item) => {
      const displayValue =
        item.value.length > 100
          ? item.value.substring(0, 100) + "..."
          : item.value;
      html += `<tr>
        <td><code>${item.key}</code></td>
        <td><span class="dev-storage-value">${displayValue}</span></td>
        <td><button class="dev-btn-small" onclick="sessionStorage.removeItem('${item.key}'); window.DevDashboard.refreshStorage()">Löschen</button></td>
      </tr>`;
    });
    html += "</tbody></table>";
    tableEl.innerHTML = html;
  }

  function updateCookies() {
    const tableEl = document.getElementById("cookiesTable");
    if (!tableEl) return;

    const cookies = document.cookie.split(";").filter((c) => c.trim());

    if (cookies.length === 0) {
      tableEl.innerHTML =
        '<div class="dev-info-message">Keine Cookies gefunden</div>';
      return;
    }

    let html =
      '<table class="dev-table"><thead><tr><th>Name</th><th>Wert</th></tr></thead><tbody>';
    cookies.forEach((cookie) => {
      const [name, value] = cookie.split("=").map((s) => s.trim());
      html += `<tr><td><code>${name}</code></td><td>${value}</td></tr>`;
    });
    html += "</tbody></table>";
    tableEl.innerHTML = html;
  }

  // ===============================================
  // TAB 7: ERRORS & LOGS
  // ===============================================
  function captureConsoleLogs() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    console.log = function (...args) {
      consoleLogs.push({
        type: "log",
        message: args.join(" "),
        timestamp: Date.now(),
      });
      if (consoleLogs.length > MAX_CONSOLE_LOGS) consoleLogs.shift();
      updateConsoleOutput();
      originalLog.apply(console, args);
    };

    console.warn = function (...args) {
      consoleLogs.push({
        type: "warn",
        message: args.join(" "),
        timestamp: Date.now(),
      });
      if (consoleLogs.length > MAX_CONSOLE_LOGS) consoleLogs.shift();
      updateConsoleOutput();
      originalWarn.apply(console, args);
    };

    console.error = function (...args) {
      consoleLogs.push({
        type: "error",
        message: args.join(" "),
        timestamp: Date.now(),
      });
      if (consoleLogs.length > MAX_CONSOLE_LOGS) consoleLogs.shift();
      updateConsoleOutput();
      originalError.apply(console, args);
    };

    console.info = function (...args) {
      consoleLogs.push({
        type: "info",
        message: args.join(" "),
        timestamp: Date.now(),
      });
      if (consoleLogs.length > MAX_CONSOLE_LOGS) consoleLogs.shift();
      updateConsoleOutput();
      originalInfo.apply(console, args);
    };
  }

  function updateConsoleOutput() {
    const output = document.getElementById("consoleOutput");
    if (!output) return;

    const filterLog = document.getElementById("filterLog")?.checked ?? true;
    const filterWarn = document.getElementById("filterWarn")?.checked ?? true;
    const filterError = document.getElementById("filterError")?.checked ?? true;
    const filterInfo = document.getElementById("filterInfo")?.checked ?? true;

    const filtered = consoleLogs.filter((log) => {
      if (log.type === "log" && !filterLog) return false;
      if (log.type === "warn" && !filterWarn) return false;
      if (log.type === "error" && !filterError) return false;
      if (log.type === "info" && !filterInfo) return false;
      return true;
    });

    let html = "";
    filtered.slice(-100).forEach((log) => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      html += `<div class="dev-console-entry dev-console-entry--${log.type}">
        <span class="dev-console-time">${time}</span>
        <span class="dev-console-type">[${log.type.toUpperCase()}]</span>
        <span class="dev-console-message">${log.message}</span>
      </div>`;
    });

    output.innerHTML =
      html || '<div class="dev-info-message">No logs captured yet</div>';
    output.scrollTop = output.scrollHeight;
  }

  function clearConsole() {
    consoleLogs.length = 0;
    updateConsoleOutput();
  }

  function exportConsoleLogs() {
    const text = consoleLogs
      .map((log) => {
        const time = new Date(log.timestamp).toISOString();
        return `[${time}] [${log.type.toUpperCase()}] ${log.message}`;
      })
      .join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `console-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  //===============================================
  // UTILITY FUNCTIONS
  //===============================================
  async function getVersionInfo() {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      try {
        return await new Promise((resolve, reject) => {
          const mc = new MessageChannel();
          const timeout = setTimeout(() => reject(new Error("Timeout")), 2000);

          mc.port1.onmessage = (event) => {
            clearTimeout(timeout);
            resolve(event.data);
          };

          navigator.serviceWorker.controller.postMessage(
            { type: "GET_VERSION" },
            [mc.port2],
          );
        });
      } catch (error) {
        console.warn("[DevDashboard] SW not reachable:", error);
      }
    }

    try {
      const manifest = await fetch("/manifest.json").then((r) => r.json());
      let buildId = "unknown";

      try {
        const cacheNames = await caches.keys();
        const calchasCache = cacheNames.find((name) =>
          name.startsWith("calchas-"),
        );
        if (calchasCache) {
          buildId = calchasCache.replace("calchas-", "");
        }
      } catch (e) {
        console.warn("[DevDashboard] Could not extract BUILD_ID:", e);
      }

      return {
        appVersion: manifest.version || "unknown",
        buildId: buildId,
        cacheVersion: buildId !== "unknown" ? `calchas-${buildId}` : "none",
        commitHash: buildId.substring(0, 8) || "unknown",
      };
    } catch (error) {
      return {
        appVersion: "unknown",
        buildId: "unknown",
        cacheVersion: "none",
        commitHash: "unknown",
      };
    }
  }

  function setupPerformanceMonitoring() {
    if (navigator.connection) {
      navigator.connection.addEventListener("change", updateNetworkInfo);
    }

    window.addEventListener("online", updateNetworkInfo);
    window.addEventListener("offline", updateNetworkInfo);
  }

  function setupErrorTracking() {
    // Track global errors
    window.addEventListener("error", (event) => {
      errorTracking.app++;
      console.error("[DevDashboard] Global error:", event.error);
      updateErrorStats();
    });

    // Track unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      errorTracking.app++;
      console.error("[DevDashboard] Unhandled rejection:", event.reason);
      updateErrorStats();
    });
  }

  function updateErrorStats() {
    // Error breakdown by type
    const errorCounts = {
      js: consoleLogs.filter((l) => l.type === "error").length,
      api: errorTracking.api,
      network: errorTracking.network,
      sw: errorTracking.sw,
    };

    document.getElementById("jsErrorCount").textContent = errorCounts.js;
    document.getElementById("apiErrorCount").textContent = errorCounts.api;
    document.getElementById("networkErrorCount").textContent =
      errorCounts.network;
    document.getElementById("swErrorCount").textContent = errorCounts.sw;

    // Total errors for badge
    const total = Object.values(errorCounts).reduce((a, b) => a + b, 0);
    const badge = document.getElementById("errorsTabBadge");
    if (badge) {
      badge.textContent = total;
      badge.style.display = total > 0 ? "inline" : "none";
    }

    // Update error timeline
    updateErrorTimeline();
  }

  function updateErrorTimeline() {
    const container = document.getElementById("errorTimeline");
    if (!container) return;

    const errors = consoleLogs
      .filter((l) => l.type === "error" || l.type === "warn")
      .slice(-20);

    if (errors.length === 0) {
      container.innerHTML =
        '<div class="dev-info-message">Keine Fehler aufgezeichnet ✅</div>';
      return;
    }

    let html = '<div class="dev-timeline">';
    errors.forEach((err) => {
      const time = new Date(err.timestamp).toLocaleTimeString();
      const icon = err.type === "error" ? "❌" : "⚠️";
      html += `
        <div class="dev-timeline-item dev-timeline-item--${err.type}">
          <span class="dev-timeline-time">${time}</span>
          <span class="dev-timeline-icon">${icon}</span>
          <span class="dev-timeline-message">${err.message.substring(0, 100)}</span>
        </div>
      `;
    });
    html += "</div>";
    container.innerHTML = html;
  }

  // ===============================================
  // TAB 8: SIMULATION
  // ===============================================
  function updateSimulationTab() {
    // Update button states
    const offlineBtn = document.getElementById("simOfflineBtn");
    const slowBtn = document.getElementById("simSlowBtn");

    if (offlineBtn) {
      offlineBtn.classList.toggle(
        "dev-sim-btn--active",
        simulationState.offline,
      );
      const status = offlineBtn.querySelector(".dev-sim-status");
      if (status)
        status.textContent = simulationState.offline ? "Aktiv" : "Inaktiv";
    }

    if (slowBtn) {
      slowBtn.classList.toggle(
        "dev-sim-btn--active",
        simulationState.slowNetwork,
      );
      const status = slowBtn.querySelector(".dev-sim-status");
      if (status)
        status.textContent = simulationState.slowNetwork ? "Aktiv" : "Inaktiv";
    }
  }

  function simulateOffline() {
    simulationState.offline = !simulationState.offline;

    if (simulationState.offline) {
      // Intercept fetch requests
      window._originalFetch = window.fetch;
      window.fetch = async () => {
        throw new Error("[SIMULATION] Network offline");
      };
      console.warn("[DevDashboard] Offline-Modus simuliert");
    } else {
      if (window._originalFetch) {
        window.fetch = window._originalFetch;
      }
      console.log("[DevDashboard] Offline-Modus beendet");
    }

    updateSimulationTab();
    updateNetworkInfo();
  }

  function simulateSlowNetwork() {
    simulationState.slowNetwork = !simulationState.slowNetwork;

    if (simulationState.slowNetwork) {
      window._originalFetch = window._originalFetch || window.fetch;
      window.fetch = async (...args) => {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // 3s delay
        return window._originalFetch(...args);
      };
      console.warn("[DevDashboard] Slow Network simuliert (3s Delay)");
    } else {
      if (window._originalFetch) {
        window.fetch = window._originalFetch;
      }
      console.log("[DevDashboard] Slow Network beendet");
    }

    updateSimulationTab();
  }

  function simulateApiFailure(mode) {
    mode = mode || "all";
    const wasActive = simulationState.apiFailure === mode;
    simulationState.apiFailure = wasActive ? null : mode;

    if (simulationState.apiFailure) {
      window._originalFetch = window._originalFetch || window.fetch;
      const apiUrls =
        mode === "all"
          ? ["open-meteo", "brightsky", "openweather", "visualcrossing", "waqi"]
          : ["open-meteo"]; // primary API

      window.fetch = async (url, ...args) => {
        const urlStr = url.toString();
        if (apiUrls.some((api) => urlStr.includes(api))) {
          errorTracking.api++;
          throw new Error(`[SIMULATION] API ${mode} failure`);
        }
        return window._originalFetch(url, ...args);
      };
      console.warn(`[DevDashboard] API Failure simuliert (${mode})`);
    } else {
      if (window._originalFetch) {
        window.fetch = window._originalFetch;
      }
      console.log("[DevDashboard] API Failure beendet");
    }

    updateSimulationTab();
  }

  async function simulateApiTimeout() {
    if (
      !confirm(
        "API Timeout simulieren? Alle API-Calls werden um 30s verzögert.",
      )
    )
      return;

    window._originalFetch = window._originalFetch || window.fetch;
    window.fetch = async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, 30000)); // 30s timeout
      return window._originalFetch(...args);
    };

    console.warn("[DevDashboard] API Timeout simuliert (30s)");
    alert("API Timeout aktiviert. Alle API-Calls werden um 30s verzögert.");
  }

  async function simulateCacheCorruption() {
    if (
      !confirm(
        "Cache-Korruption simulieren? Dies fügt ungültige Daten in den Cache ein.",
      )
    )
      return;

    try {
      const cache = await caches.open("calchas-test-corruption");
      await cache.put(
        "/test-corrupt",
        new Response("CORRUPTED_DATA_FOR_TESTING"),
      );
      console.warn("[DevDashboard] Cache Corruption simuliert");
      alert("Korrupte Cache-Daten wurden eingefügt.");
    } catch (error) {
      alert("Fehler: " + error.message);
    }
  }

  async function simulateStaleCache() {
    if (
      !confirm(
        "Stale Cache simulieren? Dies setzt das Cache-Datum auf vor 24 Stunden.",
      )
    )
      return;

    try {
      // Set weather fetch time to 24 hours ago
      const staleTime = Date.now() - 24 * 60 * 60 * 1000;
      localStorage.setItem("weather_last_fetch", staleTime.toString());
      console.warn("[DevDashboard] Stale Cache simuliert");
      alert("Cache wurde als veraltet markiert.");
      updateDataFreshness();
    } catch (error) {
      alert("Fehler: " + error.message);
    }
  }

  function toggleFeature(featureName) {
    const currentState =
      localStorage.getItem(`feature_${featureName}`) === "true";
    localStorage.setItem(`feature_${featureName}`, (!currentState).toString());
    console.log(
      `[DevDashboard] Feature '${featureName}' ${!currentState ? "aktiviert" : "deaktiviert"}`,
    );
    updateSimulationTab();
  }

  function resetAllSimulations() {
    // Reset simulation state
    simulationState.offline = false;
    simulationState.slowNetwork = false;
    simulationState.apiFailure = false;

    // Restore original fetch
    if (window._originalFetch) {
      window.fetch = window._originalFetch;
      delete window._originalFetch;
    }

    console.log("[DevDashboard] Alle Simulationen zurückgesetzt");
    updateSimulationTab();
    alert("Alle Simulationen wurden zurückgesetzt.");
  }

  // ===============================================
  // TAB 9: CONFIG & BUILD
  // ===============================================
  async function updateConfigTab() {
    // Build Info
    const versionInfo = await getVersionInfo();
    document.getElementById("configAppVersion").textContent =
      versionInfo.appVersion;
    document.getElementById("configBuildId").textContent = versionInfo.buildId;
    document.getElementById("configBuildDate").textContent =
      new Date().toLocaleDateString("de-DE");

    // Environment
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    document.getElementById("configEnv").textContent = isLocal
      ? "🔧 Development"
      : "🚀 Production";
    document.getElementById("configBaseUrl").textContent =
      window.location.origin;

    // Feature Flags
    updateFeatureFlags();

    // API Endpoints
    updateEndpointsList();

    // Cache Strategies
    updateCacheStrategies();
  }

  function updateFeatureFlags() {
    const container = document.getElementById("featureFlagsList");
    if (!container) return;

    const flags = [
      {
        name: "health_enabled",
        label: "Health-Komponente",
        desc: "Gesundheitsindex basierend auf Wetter",
      },
      {
        name: "alerts_enabled",
        label: "Wetterwarnungen",
        desc: "Wetteralarme anzeigen",
      },
      {
        name: "history_enabled",
        label: "Verlaufsdaten",
        desc: "Historische Wetterdaten",
      },
      {
        name: "analytics_enabled",
        label: "Analytics",
        desc: "Nutzungsstatistiken erfassen",
      },
      {
        name: "offline_first",
        label: "Offline-First",
        desc: "Cache-First Strategie",
      },
    ];

    let html = '<div class="dev-feature-flags">';
    flags.forEach((flag) => {
      const enabled = localStorage.getItem(`feature_${flag.name}`) !== "false";
      html += `
        <div class="dev-flag-item">
          <div class="dev-flag-info">
            <div class="dev-flag-name">${flag.label}</div>
            <div class="dev-flag-desc">${flag.desc}</div>
          </div>
          <label class="dev-toggle">
            <input type="checkbox" ${enabled ? "checked" : ""} onchange="window.DevDashboard.toggleFeature('${flag.name}')">
            <span class="dev-toggle-slider"></span>
          </label>
        </div>
      `;
    });
    html += "</div>";
    container.innerHTML = html;
  }

  function updateEndpointsList() {
    const container = document.getElementById("apiEndpoints");
    if (!container) return;

    const endpoints = [
      {
        name: "Open-Meteo",
        url: "https://api.open-meteo.com/v1/",
        type: "Weather",
      },
      {
        name: "BrightSky (DWD)",
        url: "https://api.brightsky.dev/",
        type: "Weather DE",
      },
      {
        name: "OpenWeatherMap",
        url: "https://api.openweathermap.org/data/2.5/",
        type: "Weather",
      },
      {
        name: "Visual Crossing",
        url: "https://weather.visualcrossing.com/VisualCrossingWebServices/",
        type: "Historical",
      },
      { name: "WAQI", url: "https://api.waqi.info/", type: "Air Quality" },
      {
        name: "BigDataCloud",
        url: "https://api.bigdatacloud.net/data/",
        type: "Geocoding",
      },
    ];

    let html =
      '<table class="dev-table"><thead><tr><th>Name</th><th>URL</th><th>Typ</th></tr></thead><tbody>';
    endpoints.forEach((ep) => {
      html += `<tr>
        <td>${ep.name}</td>
        <td><code>${ep.url}</code></td>
        <td><span class="dev-badge">${ep.type}</span></td>
      </tr>`;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  function updateCacheStrategies() {
    const container = document.getElementById("cacheStrategies");
    if (!container) return;

    const strategies = [
      { pattern: "App Shell", strategy: "Cache First", ttl: "∞" },
      { pattern: "API Responses", strategy: "Network First", ttl: "15min" },
      { pattern: "Images", strategy: "Cache First", ttl: "24h" },
      { pattern: "Fonts", strategy: "Cache First", ttl: "∞" },
      {
        pattern: "Historical Data",
        strategy: "Stale While Revalidate",
        ttl: "1h",
      },
    ];

    let html =
      '<table class="dev-table"><thead><tr><th>Pattern</th><th>Strategie</th><th>TTL</th></tr></thead><tbody>';
    strategies.forEach((s) => {
      html += `<tr>
        <td>${s.pattern}</td>
        <td><span class="dev-badge dev-badge--strategy">${s.strategy}</span></td>
        <td>${s.ttl}</td>
      </tr>`;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  //===============================================
  // QUICK ACTIONS
  //===============================================
  async function clearAllCaches() {
    if (!confirm("Alle Caches löschen? Seite wird neu geladen.")) return;

    try {
      // Clear Service Worker caches
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
        console.log(`✅ ${names.length} Service Worker Caches gelöscht`);
      }

      // Clear historyCacheService
      if (window.historyCacheService?.clear) {
        window.historyCacheService.clear();
        console.log("✅ historyCacheService gelöscht");
      }

      // Clear localStorage cache entries
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("cache_") ||
            key.startsWith("weather_") ||
            key.startsWith("history_"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      console.log(`✅ ${keysToRemove.length} localStorage Einträge gelöscht`);

      alert("Alle Caches gelöscht! Seite wird neu geladen...");
      window.location.reload();
    } catch (error) {
      alert("Fehler: " + error.message);
    }
  }

  async function unregisterServiceWorker() {
    if (!confirm("Service Worker deregistrieren? Seite wird neu geladen."))
      return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        alert("Service Worker deregistriert! Seite wird neu geladen...");
        window.location.reload();
      } else {
        alert("Kein Service Worker registriert");
      }
    } catch (error) {
      alert("Fehler: " + error.message);
    }
  }

  function clearLocalStorage() {
    if (!confirm("Alle LocalStorage Daten löschen?")) return;

    try {
      localStorage.clear();
      alert("LocalStorage gelöscht!");
      refreshStorage();
    } catch (error) {
      alert("Fehler: " + error.message);
    }
  }

  async function testAllAPIs() {
    console.log("[DevDashboard] Öffne API-Tests...");
    document.querySelector('[data-tab="apis"]')?.click();
    setTimeout(() => {
      updateAPIStatus();
      testAPIsWithCoords();
    }, 100);
  }

  function exportDebugInfo() {
    try {
      const info = {
        timestamp: new Date().toISOString(),
        appVersion:
          document.getElementById("appVersion")?.textContent || "unknown",
        buildId: document.getElementById("buildId")?.textContent || "unknown",
        sessionId,
        uptime: formatUptime(Date.now() - appStartTime),
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        online: navigator.onLine,
        simulationState,
        errorTracking,
        modules: {},
        localStorage: {},
        consoleLogs: consoleLogs.slice(-50),
      };

      // Add modules status
      [
        "weatherDataService",
        "historyCacheService",
        "apiKeyManager",
        "HealthEngine",
        "MasterUIController",
      ].forEach((mod) => {
        info.modules[mod] = !!window[mod];
      });

      // Add localStorage (sanitized)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          info.localStorage[key] =
            value.length > 200 ? value.substring(0, 200) + "..." : value;
        }
      }

      const blob = new Blob([JSON.stringify(info, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calchas-debug-${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("Debug-Info exportiert!");
    } catch (error) {
      alert("Fehler: " + error.message);
    }
  }

  function openDiagnostics() {
    document.querySelector('[data-tab="sw"]')?.click();
    setTimeout(() => getSwDiagnostics(), 100);
  }

  function refreshAllData() {
    console.log("[DevDashboard] Aktualisiere alle Daten...");
    updateOverviewTab();
  }

  //===============================================
  // EXPOSE PUBLIC API
  //===============================================
  global.DevDashboard = {
    // Lifecycle
    init,

    // Tab 1: Overview
    updateOverviewTab,
    updateSystemStatusBadge,
    openDiagnostics,
    refreshAllData,

    // Tab 2: Runtime & State
    updateRuntimeTab,
    updateStateMachine,
    updateFeatureStates,
    updateModulesList,
    updateErrorStates,

    // Tab 3: Service Worker
    checkServiceWorkerStatus,
    triggerSkipWaiting,
    getSwDiagnostics,
    validateSwCache,
    clearSwCaches,

    // Tab 4: Capabilities
    updateCapabilitiesTab,
    updatePermissionStatus,

    // Tab 5: Data & APIs
    updateAPIStatus,
    updateDataFreshness,
    testAPIsWithCoords,
    testAllAPIs,

    // Tab 6: Cache & Storage
    refreshCacheView,
    showCacheContents,
    deleteCache,
    updateStorageSummary,
    refreshStorage,

    // Tab 7: Errors & Logs
    updateConsoleOutput,
    updateErrorStats,
    clearConsole,
    exportConsoleLogs,

    // Tab 8: Simulation
    updateSimulationTab,
    simulateOffline,
    simulateSlowNetwork,
    simulateApiFailure,
    simulateApiTimeout,
    simulateCacheCorruption,
    simulateStaleCache,
    toggleFeature,
    resetAllSimulations,

    // Tab 9: Config & Build
    updateConfigTab,
    updateFeatureFlags,

    // Quick Actions
    clearAllCaches,
    unregisterServiceWorker,
    clearLocalStorage,
    exportDebugInfo,
  };

  console.log("✅ [DevDashboard] Controller geladen");
})(window);
