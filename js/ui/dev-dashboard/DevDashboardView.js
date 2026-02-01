/**
 * Developer Dashboard View Controller
 * Strukturiert gemäß der Architektur-Spezifikation (dev-dashboard-goal.md)
 *
 * Tab-Struktur:
 * 1. Overview - Schneller Überblick über Gesamtzustand
 * 2. Runtime & State - App-State, Lifecycle, Feature-States
 * 3. Service Worker - PWA Offline-Funktionalität
 * 4. Capabilities - Geräte- und Browserfähigkeiten
 * 5. Data & APIs - Wetterdaten-Quellen und Qualität
 * 6. Cache & Storage - Persistente Daten
 * 7. Errors & Logs - Fehlerhistorie und Logs
 * 8. Simulation - Testen von Grenz- und Fehlerfällen (Dev-only)
 * 9. Config & Build - Aktuelle Konfiguration (Read-only)
 * 10. Roadmap - Produktvision
 */

(function (global) {
  "use strict";

  console.log("🔧 [DevDashboardView] Loading...");

  function renderDevDashboard() {
    const container = document.getElementById("dev-dashboard-container");
    if (!container) {
      console.error("[DevDashboardView] Container not found");
      return;
    }

    container.innerHTML = `
      <!-- Top Navigation Bar -->
      <nav class="dev-nav">
        <button class="dev-nav__tab dev-nav__tab--active" data-tab="overview">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">dashboard</span>
          <span class="dev-nav__label">Übersicht</span>
        </button>
        <button class="dev-nav__tab" data-tab="runtime">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">memory</span>
          <span class="dev-nav__label">Runtime</span>
        </button>
        <button class="dev-nav__tab" data-tab="serviceworker">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">offline_bolt</span>
          <span class="dev-nav__label">SW</span>
        </button>
        <button class="dev-nav__tab" data-tab="capabilities">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">devices</span>
          <span class="dev-nav__label">Capabilities</span>
        </button>
        <button class="dev-nav__tab" data-tab="apis">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">cloud</span>
          <span class="dev-nav__label">APIs</span>
        </button>
        <button class="dev-nav__tab" data-tab="cache">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">storage</span>
          <span class="dev-nav__label">Cache</span>
        </button>
        <button class="dev-nav__tab" data-tab="errors">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">bug_report</span>
          <span class="dev-nav__label">Errors</span>
        </button>
        <button class="dev-nav__tab" data-tab="simulation">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">science</span>
          <span class="dev-nav__label">Simulation</span>
        </button>
        <button class="dev-nav__tab" data-tab="config">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">settings</span>
          <span class="dev-nav__label">Config</span>
        </button>
        <button class="dev-nav__tab" data-tab="roadmap">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">map</span>
          <span class="dev-nav__label">Roadmap</span>
        </button>
      </nav>

      <!-- Tab Content Container -->
      <div class="dev-tabs-content">

        <!-- ==================== TAB 1: OVERVIEW ==================== -->
        <div class="dev-tab-panel dev-tab-panel--active" data-panel="overview">
          <section class="dashboard-card">
            <div class="dev-dashboard-header">
              <div>
                <h2>🔧 Developer Dashboard</h2>
                <p class="dev-subtitle">Schneller Überblick über den aktuellen Gesamtzustand</p>
              </div>
              <div class="system-status-badge" id="systemStatusBadge">
                <span class="status-dot"></span>
                <span>Checking...</span>
              </div>
            </div>
          </section>

          <!-- Globaler Systemstatus Banner -->
          <div class="dev-status-banner" id="globalSystemStatus">
            <span class="dev-status-icon">⏳</span>
            <div class="dev-status-content">
              <strong>Systemstatus wird ermittelt...</strong>
              <span>Prüfe alle Komponenten</span>
            </div>
          </div>

          <!-- System Info Grid -->
          <div class="dev-info-grid">
            <div class="dev-info-card">
              <div class="dev-info-header">
                <span class="dev-info-icon">📱</span>
                <h3>App Info</h3>
              </div>
              <div class="dev-info-content">
                <div class="dev-info-row">
                  <span>Version:</span>
                  <strong id="appVersion">-</strong>
                </div>
                <div class="dev-info-row">
                  <span>Build ID:</span>
                  <strong id="buildId">-</strong>
                </div>
                <div class="dev-info-row">
                  <span>Commit:</span>
                  <strong id="commitHash">-</strong>
                </div>
              </div>
            </div>

            <div class="dev-info-card">
              <div class="dev-info-header">
                <span class="dev-info-icon">🔄</span>
                <h3>App State</h3>
              </div>
              <div class="dev-info-content">
                <div class="dev-info-row">
                  <span>Status:</span>
                  <strong id="appState" class="dev-state-badge">idle</strong>
                </div>
                <div class="dev-info-row">
                  <span>Datenmodus:</span>
                  <strong id="dataMode">-</strong>
                </div>
              </div>
            </div>

            <div class="dev-info-card">
              <div class="dev-info-header">
                <span class="dev-info-icon">🌐</span>
                <h3>Network</h3>
              </div>
              <div class="dev-info-content">
                <div class="dev-info-row">
                  <span>Status:</span>
                  <strong id="networkStatus">-</strong>
                </div>
                <div class="dev-info-row">
                  <span>Type:</span>
                  <strong id="networkType">-</strong>
                </div>
                <div class="dev-info-row">
                  <span>Speed:</span>
                  <strong id="networkSpeed">-</strong>
                </div>
              </div>
            </div>

            <div class="dev-info-card">
              <div class="dev-info-header">
                <span class="dev-info-icon">⚡</span>
                <h3>Performance</h3>
              </div>
              <div class="dev-info-content">
                <div class="dev-info-row">
                  <span>FPS:</span>
                  <strong id="fpsCounter">-</strong>
                </div>
                <div class="dev-info-row">
                  <span>Memory:</span>
                  <strong id="memoryUsage">-</strong>
                </div>
                <div class="dev-info-row">
                  <span>Page Load:</span>
                  <strong id="pageLoadTime">-</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Sichere Quick Actions (nur Read-only / Export) -->
          <section class="dashboard-card">
            <h3>📤 Quick Actions</h3>
            <p class="dev-subtitle">Sichere, nicht-destruktive Aktionen</p>
            <div class="dev-actions-grid dev-actions-grid--safe">
              <button class="dev-action-btn dev-action-btn--success" onclick="window.DevDashboard?.exportDebugInfo()">
                <span class="dev-action-icon">📥</span>
                <span class="dev-action-text">Logs exportieren</span>
              </button>
              <button class="dev-action-btn dev-action-btn--info" onclick="window.DevDashboard?.openDiagnostics()">
                <span class="dev-action-icon">🔍</span>
                <span class="dev-action-text">Diagnostics öffnen</span>
              </button>
              <button class="dev-action-btn dev-action-btn--primary" onclick="window.DevDashboard?.refreshAllData()">
                <span class="dev-action-icon">🔄</span>
                <span class="dev-action-text">Daten aktualisieren</span>
              </button>
            </div>
          </section>
        </div>

        <!-- ==================== TAB 2: RUNTIME & STATE ==================== -->
        <div class="dev-tab-panel" data-panel="runtime">
          <section class="dashboard-card">
            <h2>🧠 Runtime & State</h2>
            <p class="dev-subtitle">Verstehen, wie die App intern denkt und in welchem logischen Zustand sie sich befindet</p>
          </section>

          <!-- App Lifecycle -->
          <section class="dashboard-card">
            <h3>⏱️ App Lifecycle</h3>
            <div class="dev-info-content">
              <div class="dev-info-row">
                <span>Laufzeit seit Start:</span>
                <strong id="runtimeDuration">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Letzter Reload:</span>
                <strong id="lastReload">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Session ID:</span>
                <strong id="sessionId">-</strong>
              </div>
            </div>
          </section>

          <!-- Global App State Machine -->
          <section class="dashboard-card">
            <h3>🎯 Global App State</h3>
            <div class="dev-state-machine" id="stateMachine">
              <div class="dev-state-item dev-state-item--active" data-state="idle">
                <span class="dev-state-dot"></span>
                <span class="dev-state-label">Idle</span>
              </div>
              <div class="dev-state-item" data-state="fetching">
                <span class="dev-state-dot"></span>
                <span class="dev-state-label">Fetching</span>
              </div>
              <div class="dev-state-item" data-state="offline">
                <span class="dev-state-dot"></span>
                <span class="dev-state-label">Offline</span>
              </div>
              <div class="dev-state-item" data-state="fallback">
                <span class="dev-state-dot"></span>
                <span class="dev-state-label">Fallback</span>
              </div>
              <div class="dev-state-item" data-state="error">
                <span class="dev-state-dot"></span>
                <span class="dev-state-label">Error</span>
              </div>
            </div>
          </section>

          <!-- Feature States -->
          <section class="dashboard-card">
            <h3>🧩 Feature States</h3>
            <div class="dev-feature-grid" id="featureStates">
              <div class="dev-feature-item">
                <span class="dev-feature-icon">🌤️</span>
                <span class="dev-feature-name">Forecast</span>
                <span class="dev-feature-status" id="featureForecast">-</span>
              </div>
              <div class="dev-feature-item">
                <span class="dev-feature-icon">🗺️</span>
                <span class="dev-feature-name">Radar</span>
                <span class="dev-feature-status" id="featureRadar">-</span>
              </div>
              <div class="dev-feature-item">
                <span class="dev-feature-icon">❤️</span>
                <span class="dev-feature-name">Health</span>
                <span class="dev-feature-status" id="featureHealth">-</span>
              </div>
              <div class="dev-feature-item">
                <span class="dev-feature-icon">📊</span>
                <span class="dev-feature-name">History</span>
                <span class="dev-feature-status" id="featureHistory">-</span>
              </div>
              <div class="dev-feature-item">
                <span class="dev-feature-icon">📍</span>
                <span class="dev-feature-name">Geolocation</span>
                <span class="dev-feature-status" id="featureGeo">-</span>
              </div>
              <div class="dev-feature-item">
                <span class="dev-feature-icon">🔔</span>
                <span class="dev-feature-name">Notifications</span>
                <span class="dev-feature-status" id="featureNotif">-</span>
              </div>
            </div>
          </section>

          <!-- Error States -->
          <section class="dashboard-card">
            <h3>⚠️ Error States</h3>
            <div class="dev-info-content">
              <div class="dev-info-row">
                <span>Aktive Fehler:</span>
                <strong id="activeErrors">0</strong>
              </div>
              <div class="dev-info-row">
                <span>Stille Fehler:</span>
                <strong id="silentErrors">0</strong>
              </div>
              <div class="dev-info-row">
                <span>Auto-Recoveries:</span>
                <strong id="recoveries">0</strong>
              </div>
            </div>
            <div id="derivedState" class="dev-derived-state"></div>
          </section>

          <!-- Loaded Modules -->
          <section class="dashboard-card">
            <h3>📦 Loaded Modules</h3>
            <div id="modulesList" class="dev-modules-list">
              <div class="dev-loading">Checking modules...</div>
            </div>
          </section>
        </div>

        <!-- ==================== TAB 3: SERVICE WORKER ==================== -->
        <div class="dev-tab-panel" data-panel="serviceworker">
          <section class="dashboard-card">
            <h2>⚙️ Service Worker</h2>
            <p class="dev-subtitle">Zentrales Kontrollzentrum für Offline-Funktionalität, Updates und Caching</p>
          </section>

          <!-- SW Status -->
          <section class="dashboard-card">
            <h3>📊 Status</h3>
            <div id="swStatus" class="dev-sw-status">
              <div class="dev-loading">Checking Service Worker...</div>
            </div>
          </section>

          <!-- SW Details -->
          <section class="dashboard-card">
            <h3>📋 Details</h3>
            <div class="dev-info-content">
              <div class="dev-info-row">
                <span>SW Version:</span>
                <strong id="swVersion">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Build ID:</span>
                <strong id="swBuildId">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Scope:</span>
                <strong id="swScope">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Verbundene Clients:</span>
                <strong id="swClients">-</strong>
              </div>
              <div class="dev-info-row">
                <span>skipWaiting aktiv:</span>
                <strong id="swSkipWaiting">-</strong>
              </div>
            </div>
          </section>

          <!-- SW Actions -->
          <section class="dashboard-card">
            <h3>🎮 Aktionen</h3>
            <div class="dev-actions-grid">
              <button class="dev-action-btn dev-action-btn--warning" onclick="window.DevDashboard?.triggerSkipWaiting()">
                <span class="dev-action-icon">⏭️</span>
                <span class="dev-action-text">Skip Waiting</span>
              </button>
              <button class="dev-action-btn dev-action-btn--primary" onclick="window.DevDashboard?.validateSwCache()">
                <span class="dev-action-icon">✅</span>
                <span class="dev-action-text">Cache validieren</span>
              </button>
              <button class="dev-action-btn dev-action-btn--primary" onclick="window.DevDashboard?.getSwDiagnostics()">
                <span class="dev-action-icon">📊</span>
                <span class="dev-action-text">Diagnostics</span>
              </button>
              <button class="dev-action-btn dev-action-btn--danger" onclick="window.DevDashboard?.clearSwCaches()">
                <span class="dev-action-icon">🗑️</span>
                <span class="dev-action-text">SW Caches löschen</span>
              </button>
            </div>
            <div id="swDiagnosticsOutput" class="dev-output-panel"></div>
          </section>

          <!-- SW Event Historie -->
          <section class="dashboard-card">
            <h3>📝 Event Historie</h3>
            <div id="swEvents" class="dev-event-log">
              <div class="dev-info-message">Events werden hier angezeigt, wenn sie auftreten</div>
            </div>
          </section>
        </div>

        <!-- ==================== TAB 4: CAPABILITIES ==================== -->
        <div class="dev-tab-panel" data-panel="capabilities">
          <section class="dashboard-card">
            <h2>📱 Capabilities</h2>
            <p class="dev-subtitle">Transparenz über tatsächliche Geräte- und Browserfähigkeiten</p>
          </section>

          <!-- Feature Matrix -->
          <section class="dashboard-card">
            <h3>🔧 Feature Matrix</h3>
            <div class="dev-capability-grid" id="featureMatrix">
              <div class="dev-capability-item">
                <span class="dev-capability-name">Service Worker</span>
                <span class="dev-capability-status" id="capSW">-</span>
              </div>
              <div class="dev-capability-item">
                <span class="dev-capability-name">Background Sync</span>
                <span class="dev-capability-status" id="capBgSync">-</span>
              </div>
              <div class="dev-capability-item">
                <span class="dev-capability-name">Periodic Sync</span>
                <span class="dev-capability-status" id="capPeriodicSync">-</span>
              </div>
              <div class="dev-capability-item">
                <span class="dev-capability-name">Push API</span>
                <span class="dev-capability-status" id="capPush">-</span>
              </div>
              <div class="dev-capability-item">
                <span class="dev-capability-name">Geolocation</span>
                <span class="dev-capability-status" id="capGeo">-</span>
              </div>
              <div class="dev-capability-item">
                <span class="dev-capability-name">Notifications</span>
                <span class="dev-capability-status" id="capNotif">-</span>
              </div>
              <div class="dev-capability-item">
                <span class="dev-capability-name">IndexedDB</span>
                <span class="dev-capability-status" id="capIDB">-</span>
              </div>
              <div class="dev-capability-item">
                <span class="dev-capability-name">Cache API</span>
                <span class="dev-capability-status" id="capCache">-</span>
              </div>
            </div>
          </section>

          <!-- Permission Status -->
          <section class="dashboard-card">
            <h3>🔐 Permission Status</h3>
            <div class="dev-permission-grid" id="permissionStatus">
              <div class="dev-permission-item">
                <span class="dev-permission-name">Geolocation</span>
                <span class="dev-permission-status" id="permGeo">-</span>
              </div>
              <div class="dev-permission-item">
                <span class="dev-permission-name">Notifications</span>
                <span class="dev-permission-status" id="permNotif">-</span>
              </div>
              <div class="dev-permission-item">
                <span class="dev-permission-name">Persistent Storage</span>
                <span class="dev-permission-status" id="permStorage">-</span>
              </div>
            </div>
          </section>

          <!-- Storage Info -->
          <section class="dashboard-card">
            <h3>💾 Storage</h3>
            <div class="dev-info-content">
              <div class="dev-info-row">
                <span>Persistent Storage:</span>
                <strong id="persistentStorage">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Storage Quota:</span>
                <strong id="storageQuota">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Storage Used:</span>
                <strong id="storageUsed">-</strong>
              </div>
            </div>
          </section>

          <!-- Platform Restrictions -->
          <section class="dashboard-card">
            <h3>⚠️ Plattform-Einschränkungen</h3>
            <div id="platformRestrictions" class="dev-restrictions-list">
              <div class="dev-loading">Prüfe Einschränkungen...</div>
            </div>
          </section>

          <!-- Browser Info -->
          <section class="dashboard-card">
            <h3>💻 Browser Info</h3>
            <div class="dev-info-content">
              <div class="dev-info-row">
                <span>User Agent:</span>
                <strong id="userAgent">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Viewport:</span>
                <strong id="viewport">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Language:</span>
                <strong id="browserLang">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Platform:</span>
                <strong id="platform">-</strong>
              </div>
            </div>
          </section>
        </div>

        <!-- ==================== TAB 5: DATA & APIs ==================== -->
        <div class="dev-tab-panel" data-panel="apis">
          <section class="dashboard-card">
            <h2>🌐 Data & APIs</h2>
            <p class="dev-subtitle">Verstehen, wo Wetterdaten herkommen und wie vertrauenswürdig sie sind</p>
          </section>

          <!-- API Status Grid -->
          <div id="apiStatus" class="dev-api-grid">
            <div class="dev-loading">Lade API Status...</div>
          </div>

          <!-- Data Freshness -->
          <section class="dashboard-card">
            <h3>📊 Datenpfad & Frische</h3>
            <div class="dev-data-path">
              <div class="dev-path-step">
                <span class="dev-path-icon">🌐</span>
                <span class="dev-path-label">API</span>
              </div>
              <span class="dev-path-arrow">→</span>
              <div class="dev-path-step">
                <span class="dev-path-icon">💾</span>
                <span class="dev-path-label">Cache</span>
              </div>
              <span class="dev-path-arrow">→</span>
              <div class="dev-path-step">
                <span class="dev-path-icon">📱</span>
                <span class="dev-path-label">UI</span>
              </div>
            </div>
            <div id="dataFreshness" class="dev-data-freshness">
              <div class="dev-freshness-item">
                <span class="dev-freshness-source">Wetterdaten</span>
                <span class="dev-freshness-age" id="weatherDataAge">-</span>
                <span class="dev-freshness-status" id="weatherDataStatus">-</span>
              </div>
              <div class="dev-freshness-item">
                <span class="dev-freshness-source">Standort</span>
                <span class="dev-freshness-age" id="locationAge">-</span>
                <span class="dev-freshness-status" id="locationStatus">-</span>
              </div>
            </div>
          </section>

          <!-- API Error Rates -->
          <section class="dashboard-card">
            <h3>📈 API Error Rates (24h)</h3>
            <div id="apiErrorRates" class="dev-error-rates">
              <div class="dev-info-message">Keine Fehler in den letzten 24 Stunden</div>
            </div>
          </section>

          <!-- API Test Tool -->
          <section class="dashboard-card">
            <h3>🧪 API Test Tool</h3>
            <div class="dev-api-test-form">
              <div class="dev-form-row">
                <label>Test Location:</label>
                <input type="text" id="testLat" value="52.52" placeholder="Latitude">
                <input type="text" id="testLon" value="13.405" placeholder="Longitude">
              </div>
              <div class="dev-form-row">
                <label>API auswählen:</label>
                <select id="testApiSelect">
                  <option value="all">Alle APIs</option>
                  <option value="openmeteo">Open-Meteo</option>
                  <option value="brightsky">BrightSky</option>
                  <option value="openweathermap">OpenWeatherMap</option>
                  <option value="visualcrossing">Visual Crossing</option>
                </select>
              </div>
              <button class="dev-action-btn dev-action-btn--primary" onclick="window.DevDashboard?.testAPIsWithCoords()">
                <span class="dev-action-icon">🧪</span>
                <span class="dev-action-text">API Tests ausführen</span>
              </button>
            </div>
            <div id="apiTestResults" class="dev-output-panel"></div>
          </section>
        </div>

        <!-- ==================== TAB 6: CACHE & STORAGE ==================== -->
        <div class="dev-tab-panel" data-panel="cache">
          <section class="dashboard-card">
            <div class="dev-dashboard-header">
              <div>
                <h2>💾 Cache & Storage</h2>
                <p class="dev-subtitle">Analyse und Kontrolle aller persistenten Daten</p>
              </div>
              <button class="dev-action-btn dev-action-btn--primary" onclick="window.DevDashboard?.refreshCacheView(); window.DevDashboard?.refreshStorage();">
                <span class="dev-action-icon">🔄</span>
                <span class="dev-action-text">Aktualisieren</span>
              </button>
            </div>
          </section>

          <!-- Cache Overview -->
          <section class="dashboard-card">
            <h3>🗃️ Cache Übersicht</h3>
            <div id="cacheOverview" class="dev-cache-overview">
              <div class="dev-loading">Lade Cache-Informationen...</div>
            </div>
          </section>

          <!-- Cache Inspector -->
          <section class="dashboard-card">
            <h3>🔍 Cache Inspektor</h3>
            <div id="cacheContents" class="dev-cache-contents">
              <div class="dev-info-message">Cache oben auswählen, um Inhalte anzuzeigen</div>
            </div>
          </section>

          <!-- LocalStorage -->
          <section class="dashboard-card">
            <h3>📦 LocalStorage</h3>
            <div class="dev-storage-stats" id="localStorageStats"></div>
            <div id="localStorageTable" class="dev-storage-table"></div>
          </section>

          <!-- SessionStorage -->
          <section class="dashboard-card">
            <h3>🔒 SessionStorage</h3>
            <div id="sessionStorageTable" class="dev-storage-table"></div>
          </section>

          <!-- Cookies -->
          <section class="dashboard-card">
            <h3>🍪 Cookies</h3>
            <div id="cookiesTable" class="dev-storage-table"></div>
          </section>

          <!-- Storage Size Summary -->
          <section class="dashboard-card">
            <h3>📊 Speicherverbrauch</h3>
            <div id="storageSummary" class="dev-storage-summary">
              <div class="dev-storage-bar">
                <div class="dev-storage-bar-fill" id="storageBarFill" style="width: 0%"></div>
              </div>
              <div class="dev-storage-details">
                <span id="storageUsedText">0 KB</span>
                <span id="storageQuotaText">von 0 KB</span>
              </div>
            </div>
          </section>

          <!-- Destructive Actions (nur hier, nicht im Overview) -->
          <section class="dashboard-card">
            <h3>🗑️ Destruktive Aktionen</h3>
            <p class="dev-subtitle dev-warning-text">⚠️ Diese Aktionen löschen Daten unwiderruflich</p>
            <div class="dev-actions-grid">
              <button class="dev-action-btn dev-action-btn--danger" onclick="window.DevDashboard?.clearAllCaches()">
                <span class="dev-action-icon">🗑️</span>
                <span class="dev-action-text">Alle Caches löschen</span>
              </button>
              <button class="dev-action-btn dev-action-btn--danger" onclick="window.DevDashboard?.clearLocalStorage()">
                <span class="dev-action-icon">🧹</span>
                <span class="dev-action-text">LocalStorage löschen</span>
              </button>
              <button class="dev-action-btn dev-action-btn--warning" onclick="window.DevDashboard?.unregisterServiceWorker()">
                <span class="dev-action-icon">⚙️</span>
                <span class="dev-action-text">SW deregistrieren</span>
              </button>
            </div>
          </section>
        </div>

        <!-- ==================== TAB 7: ERRORS & LOGS ==================== -->
        <div class="dev-tab-panel" data-panel="errors">
          <section class="dashboard-card">
            <div class="dev-dashboard-header">
              <div>
                <h2>🐛 Errors & Logs</h2>
                <p class="dev-subtitle">Fehler nicht nur sehen, sondern verstehen</p>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="dev-action-btn dev-action-btn--secondary" onclick="window.DevDashboard?.clearConsole()">
                  <span class="dev-action-icon">🧹</span>
                  <span class="dev-action-text">Löschen</span>
                </button>
                <button class="dev-action-btn dev-action-btn--primary" onclick="window.DevDashboard?.exportConsoleLogs()">
                  <span class="dev-action-icon">📥</span>
                  <span class="dev-action-text">Export TXT</span>
                </button>
                <button class="dev-action-btn dev-action-btn--success" onclick="window.DevDashboard?.exportDebugInfo()">
                  <span class="dev-action-icon">📥</span>
                  <span class="dev-action-text">Export JSON</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Error Timeline -->
          <section class="dashboard-card">
            <h3>⏱️ Error Timeline</h3>
            <div id="errorTimeline" class="dev-error-timeline">
              <div class="dev-info-message">Keine Fehler aufgezeichnet</div>
            </div>
          </section>

          <!-- Error Stats -->
          <section class="dashboard-card">
            <h3>📊 Error Statistik</h3>
            <div class="dev-error-stats" id="errorStats">
              <div class="dev-stat-box">
                <span class="dev-stat-label">JS Errors</span>
                <span class="dev-stat-value" id="jsErrorCount">0</span>
              </div>
              <div class="dev-stat-box">
                <span class="dev-stat-label">API Errors</span>
                <span class="dev-stat-value" id="apiErrorCount">0</span>
              </div>
              <div class="dev-stat-box">
                <span class="dev-stat-label">Network Errors</span>
                <span class="dev-stat-value" id="networkErrorCount">0</span>
              </div>
              <div class="dev-stat-box">
                <span class="dev-stat-label">SW Errors</span>
                <span class="dev-stat-value" id="swErrorCount">0</span>
              </div>
            </div>
          </section>

          <!-- Live Console -->
          <section class="dashboard-card">
            <h3>🖥️ Live Console</h3>
            <div class="dev-console-filters">
              <label><input type="checkbox" id="filterLog" checked onchange="window.DevDashboard?.updateConsoleOutput()"> Logs</label>
              <label><input type="checkbox" id="filterWarn" checked onchange="window.DevDashboard?.updateConsoleOutput()"> Warnings</label>
              <label><input type="checkbox" id="filterError" checked onchange="window.DevDashboard?.updateConsoleOutput()"> Errors</label>
              <label><input type="checkbox" id="filterInfo" checked onchange="window.DevDashboard?.updateConsoleOutput()"> Info</label>
            </div>
            <div id="consoleOutput" class="dev-console-output"></div>
          </section>
        </div>

        <!-- ==================== TAB 8: SIMULATION (Dev-only) ==================== -->
        <div class="dev-tab-panel" data-panel="simulation">
          <section class="dashboard-card">
            <h2>🧪 Simulation</h2>
            <p class="dev-subtitle">Testen von Grenz- und Fehlerfällen</p>
            <div class="dev-warning-banner">
              <span class="dev-warning-icon">⚠️</span>
              <span>Dieser Tab ist nur für Entwickler. Aktionen können die App temporär beeinträchtigen.</span>
            </div>
          </section>

          <!-- Network Simulation -->
          <section class="dashboard-card">
            <h3>🌐 Netzwerk Simulation</h3>
            <div class="dev-simulation-grid">
              <div class="dev-sim-card">
                <div class="dev-sim-card__header">
                  <span class="dev-sim-card__icon">📴</span>
                  <span class="dev-sim-card__title">Offline</span>
                </div>
                <p class="dev-sim-card__desc">Netzwerk komplett trennen</p>
                <button class="dev-sim-btn" onclick="window.DevDashboard?.simulateOffline()" id="simOfflineBtn">
                  <span id="simOfflineStatus">Aktivieren</span>
                </button>
              </div>
              <div class="dev-sim-card">
                <div class="dev-sim-card__header">
                  <span class="dev-sim-card__icon">🐌</span>
                  <span class="dev-sim-card__title">Slow Network</span>
                </div>
                <p class="dev-sim-card__desc">3s Delay bei allen Requests</p>
                <button class="dev-sim-btn" onclick="window.DevDashboard?.simulateSlowNetwork()" id="simSlowBtn">
                  <span id="simSlowStatus">Aktivieren</span>
                </button>
              </div>
            </div>
          </section>

          <!-- API Simulation -->
          <section class="dashboard-card">
            <h3>🔌 API Simulation</h3>
            <div class="dev-simulation-grid">
              <div class="dev-sim-card">
                <div class="dev-sim-card__header">
                  <span class="dev-sim-card__icon">💥</span>
                  <span class="dev-sim-card__title">API Komplettausfall</span>
                </div>
                <p class="dev-sim-card__desc">Alle APIs schlagen fehl</p>
                <button class="dev-sim-btn dev-sim-btn--danger" onclick="window.DevDashboard?.simulateApiFailure('all')">
                  Aktivieren
                </button>
              </div>
              <div class="dev-sim-card">
                <div class="dev-sim-card__header">
                  <span class="dev-sim-card__icon">⚡</span>
                  <span class="dev-sim-card__title">Primär-API Ausfall</span>
                </div>
                <p class="dev-sim-card__desc">Nur Open-Meteo ausschalten</p>
                <button class="dev-sim-btn dev-sim-btn--danger" onclick="window.DevDashboard?.simulateApiFailure('primary')">
                  Aktivieren
                </button>
              </div>
              <div class="dev-sim-card">
                <div class="dev-sim-card__header">
                  <span class="dev-sim-card__icon">⏰</span>
                  <span class="dev-sim-card__title">API Timeout</span>
                </div>
                <p class="dev-sim-card__desc">30s Verzögerung bei API-Calls</p>
                <button class="dev-sim-btn" onclick="window.DevDashboard?.simulateApiTimeout()">
                  Aktivieren
                </button>
              </div>
            </div>
          </section>

          <!-- Cache Simulation -->
          <section class="dashboard-card">
            <h3>💾 Cache Simulation</h3>
            <div class="dev-simulation-grid">
              <div class="dev-sim-card">
                <div class="dev-sim-card__header">
                  <span class="dev-sim-card__icon">🔥</span>
                  <span class="dev-sim-card__title">Cache-Korruption</span>
                </div>
                <p class="dev-sim-card__desc">Fügt ungültige Test-Daten ein</p>
                <button class="dev-sim-btn dev-sim-btn--danger" onclick="window.DevDashboard?.simulateCacheCorruption()">
                  Ausführen
                </button>
              </div>
              <div class="dev-sim-card">
                <div class="dev-sim-card__header">
                  <span class="dev-sim-card__icon">🕐</span>
                  <span class="dev-sim-card__title">Stale Cache</span>
                </div>
                <p class="dev-sim-card__desc">Setzt Cache-Datum auf gestern</p>
                <button class="dev-sim-btn" onclick="window.DevDashboard?.simulateStaleCache()">
                  Ausführen
                </button>
              </div>
            </div>
          </section>

          <!-- Feature Deactivation -->
          <section class="dashboard-card">
            <h3>🔧 Feature-Deaktivierung</h3>
            <div id="featureToggles" class="dev-feature-toggles">
              <div class="dev-toggle-item">
                <span class="dev-toggle-label">Radar</span>
                <label class="dev-toggle">
                  <input type="checkbox" id="toggleRadar" checked onchange="window.DevDashboard?.toggleFeature('radar')">
                  <span class="dev-toggle-slider"></span>
                </label>
              </div>
              <div class="dev-toggle-item">
                <span class="dev-toggle-label">Health</span>
                <label class="dev-toggle">
                  <input type="checkbox" id="toggleHealth" checked onchange="window.DevDashboard?.toggleFeature('health')">
                  <span class="dev-toggle-slider"></span>
                </label>
              </div>
              <div class="dev-toggle-item">
                <span class="dev-toggle-label">History</span>
                <label class="dev-toggle">
                  <input type="checkbox" id="toggleHistory" checked onchange="window.DevDashboard?.toggleFeature('history')">
                  <span class="dev-toggle-slider"></span>
                </label>
              </div>
              <div class="dev-toggle-item">
                <span class="dev-toggle-label">Notifications</span>
                <label class="dev-toggle">
                  <input type="checkbox" id="toggleNotifications" checked onchange="window.DevDashboard?.toggleFeature('notifications')">
                  <span class="dev-toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>

          <!-- Reset -->
          <section class="dashboard-card">
            <h3>🔄 Reset</h3>
            <button class="dev-action-btn dev-action-btn--success" onclick="window.DevDashboard?.resetAllSimulations()">
              <span class="dev-action-icon">✨</span>
              <span class="dev-action-text">Alle Simulationen zurücksetzen</span>
            </button>
          </section>
        </div>

        <!-- ==================== TAB 9: CONFIG & BUILD ==================== -->
        <div class="dev-tab-panel" data-panel="config">
          <section class="dashboard-card">
            <h2>⚙️ Config & Build</h2>
            <p class="dev-subtitle">Transparenz über die aktuell laufende Konfiguration (Read-only)</p>
          </section>

          <!-- Build Info -->
          <section class="dashboard-card">
            <h3>🏗️ Build Information</h3>
            <div class="dev-info-content">
              <div class="dev-info-row">
                <span>App Version:</span>
                <strong id="configAppVersion">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Build ID:</span>
                <strong id="configBuildId">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Build Datum:</span>
                <strong id="configBuildDate">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Environment:</span>
                <strong id="configEnv">-</strong>
              </div>
              <div class="dev-info-row">
                <span>Base URL:</span>
                <strong id="configBaseUrl">-</strong>
              </div>
            </div>
          </section>

          <!-- Feature Flags -->
          <section class="dashboard-card">
            <h3>🚩 Feature Flags</h3>
            <div id="featureFlagsList" class="dev-feature-flags">
              <div class="dev-flag-item">
                <span class="dev-flag-name">PWA Mode</span>
                <span class="dev-flag-status" id="flagPWA">-</span>
              </div>
              <div class="dev-flag-item">
                <span class="dev-flag-name">Debug Mode</span>
                <span class="dev-flag-status" id="flagDebug">-</span>
              </div>
              <div class="dev-flag-item">
                <span class="dev-flag-name">Analytics</span>
                <span class="dev-flag-status" id="flagAnalytics">-</span>
              </div>
              <div class="dev-flag-item">
                <span class="dev-flag-name">Beta Features</span>
                <span class="dev-flag-status" id="flagBeta">-</span>
              </div>
            </div>
          </section>

          <!-- API Endpoints -->
          <section class="dashboard-card">
            <h3>🔗 API Endpoints</h3>
            <div id="apiEndpoints" class="dev-endpoints-list">
              <div class="dev-endpoint-item">
                <span class="dev-endpoint-name">Open-Meteo</span>
                <code class="dev-endpoint-url">api.open-meteo.com</code>
              </div>
              <div class="dev-endpoint-item">
                <span class="dev-endpoint-name">BrightSky</span>
                <code class="dev-endpoint-url">api.brightsky.dev</code>
              </div>
              <div class="dev-endpoint-item">
                <span class="dev-endpoint-name">OpenWeatherMap</span>
                <code class="dev-endpoint-url">api.openweathermap.org</code>
              </div>
              <div class="dev-endpoint-item">
                <span class="dev-endpoint-name">Visual Crossing</span>
                <code class="dev-endpoint-url">api.visualcrossing.com</code>
              </div>
              <div class="dev-endpoint-item">
                <span class="dev-endpoint-name">WAQI (Air Quality)</span>
                <code class="dev-endpoint-url">api.waqi.info</code>
              </div>
            </div>
          </section>

          <!-- Cache Strategies -->
          <section class="dashboard-card">
            <h3>📋 Cache Strategien</h3>
            <div id="cacheStrategies" class="dev-cache-strategies">
              <div class="dev-strategy-item">
                <span class="dev-strategy-name">App Shell</span>
                <span class="dev-strategy-type">Cache First</span>
              </div>
              <div class="dev-strategy-item">
                <span class="dev-strategy-name">API Responses</span>
                <span class="dev-strategy-type">Network First</span>
              </div>
              <div class="dev-strategy-item">
                <span class="dev-strategy-name">Images</span>
                <span class="dev-strategy-type">Stale While Revalidate</span>
              </div>
              <div class="dev-strategy-item">
                <span class="dev-strategy-name">Fonts</span>
                <span class="dev-strategy-type">Cache First</span>
              </div>
            </div>
          </section>
        </div>

        <!-- ==================== TAB 10: ROADMAP ==================== -->
        <div class="dev-tab-panel" data-panel="roadmap">
          <section class="dashboard-card">
            <h2>🗺️ Produkt-Roadmap</h2>
            <p class="dev-subtitle">Produktvision und Entwicklungsrichtung für Contributors</p>
            <p class="dev-roadmap-note">ℹ️ Dieser Tab zeigt keine Live-Daten. Er dient zur Orientierung über Ist-Zustand und Vision.</p>
          </section>

          <!-- Version Timeline -->
          <div class="collapsible-list">
            <!-- Version 0.1.1-alpha -->
            <div class="collapsible-item collapsible-item--live">
              <button class="collapsible-header" data-collapsible="v1">
                <div class="collapsible-header__left">
                  <span class="collapsible-icon">✅</span>
                  <div>
                    <h3>v0.1.1-alpha</h3>
                    <span class="collapsible-subtitle">LIVE HEUTE</span>
                  </div>
                </div>
                <span class="collapsible-chevron">▶</span>
              </button>
              <div class="collapsible-content">
                <p><strong>Status:</strong> Alle Core-Features verfügbar und nutzbar</p>
                <div class="feature-chips-wrap">
                  <span class="chip chip--success">✓ Multi-API-Backbone</span>
                  <span class="chip chip--success">✓ PWA (Offline-fähig)</span>
                  <span class="chip chip--success">✓ Health-Intelligence</span>
                  <span class="chip chip--success">✓ Radar & Karte</span>
                  <span class="chip chip--success">✓ Historische Daten</span>
                  <span class="chip chip--success">✓ Developer Dashboard</span>
                </div>
              </div>
            </div>

            <!-- Version 0.10.0-beta -->
            <div class="collapsible-item collapsible-item--planned">
              <button class="collapsible-header" data-collapsible="v2">
                <div class="collapsible-header__left">
                  <span class="collapsible-icon">🔮</span>
                  <div>
                    <h3>v0.10.0-beta</h3>
                    <span class="collapsible-subtitle">3-6 Monate</span>
                  </div>
                </div>
                <span class="collapsible-chevron">▶</span>
              </button>
              <div class="collapsible-content">
                <div class="feature-box">
                  <h4>🤖 KI-gestützte Prognosen</h4>
                  <ul>
                    <li>TensorFlow.js Integration für ML-basierte Vorhersagen</li>
                    <li>Historische Präzisionsanalyse pro Standort</li>
                    <li>Dynamische API-Gewichtung in Echtzeit</li>
                  </ul>
                </div>
                <div class="feature-box">
                  <h4>🌍 Erweiterte Internationalisierung</h4>
                  <ul>
                    <li>100% Deutsch & Englisch Abdeckung</li>
                    <li>🇫🇷 Französisch, 🇪🇸 Spanisch, 🇹🇷 Türkisch</li>
                  </ul>
                </div>
                <div class="feature-box">
                  <h4>⚕️ Health-Personalisierung</h4>
                  <ul>
                    <li>Hauttyp-Einstellung (Fitzpatrick-Skala 1-6)</li>
                    <li>Migräne-Sensitivität konfigurieren</li>
                    <li>Personalisierte UV- & Vitamin-D-Berechnungen</li>
                    <li>Individuelle Health-Score-Gewichtung</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Version 1.0.0-stable -->
            <div class="collapsible-item collapsible-item--vision">
              <button class="collapsible-header" data-collapsible="v3">
                <div class="collapsible-header__left">
                  <span class="collapsible-icon">⭐</span>
                  <div>
                    <h3>v1.0.0-stable</h3>
                    <span class="collapsible-subtitle">VISION</span>
                  </div>
                </div>
                <span class="collapsible-chevron">▶</span>
              </button>
              <div class="collapsible-content">
                <div class="feature-box">
                  <h4>🏠 Smart-Home-Integration</h4>
                  <ul>
                    <li>Direkte Kommunikation mit Gebäudesteuerung</li>
                    <li>Automatische Jalousien-Steuerung basierend auf Prognosen</li>
                    <li>Integration: Home Assistant, MQTT, Zigbee</li>
                  </ul>
                </div>
                <div class="feature-box">
                  <h4>👥 Community-Features</h4>
                  <ul>
                    <li>Nutzer teilen lokale Wetter-Beobachtungen</li>
                    <li>Crowdsourced Hyper-Local Weather Intelligence</li>
                    <li>Echtzeit-Validierung durch Community-Daten</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Known Issues & Bug Backlog -->
            <div class="collapsible-item collapsible-item--issues">
              <button class="collapsible-header" data-collapsible="v-bugs">
                <div class="collapsible-header__left">
                  <span class="collapsible-icon">🐛</span>
                  <div>
                    <h3>Known Issues & Backlog</h3>
                    <span class="collapsible-subtitle">AKTUELLE BUGS & VERBESSERUNGEN</span>
                  </div>
                </div>
                <span class="collapsible-chevron">▶</span>
              </button>
              <div class="collapsible-content">
                <div class="feature-box">
                  <h4>🚨 Kritische Probleme (High Priority)</h4>
                  <ul>
                    <li><strong>Sprachen-Mix:</strong> Tabs sind inkonsistent benannt (Home, Karten, Health, Historie & Settings)</li>
                    <li><strong>Countdown-Timer:</strong> Ständige Erinnerung "Bitte warte noch 5 Minuten" (zählt runter) - Ursache unklar</li>
                    <li><strong>Pull-to-Refresh:</strong> "Zum Aktualisieren ziehen" erscheint unerwartet - Browser-Konflikt?</li>
                    <li><strong>API Rate Limit:</strong> VisualCrossing API-Warnung wird dauerhaft angezeigt</li>
                  </ul>
                </div>

                <div class="feature-box">
                  <h4>🏠 Startseite - Datenqualität</h4>
                  <ul>
                    <li><strong>Falsche Einsichten:</strong> Kategorie "Einsichten" zeigt inkorrekte Werte (z.B. 98% Luftfeuchtigkeit)</li>
                    <li><strong>Inkonsistente Regenwahrscheinlichkeit:</strong>
                      <ul>
                        <li>Oben: 35%</li>
                        <li>Tagesübersicht: bis zu 60%</li>
                        <li>Stündliche Vorhersage: nur 3%</li>
                      </ul>
                    </li>
                    <li><strong>Darstellungsfehler:</strong> Regenwahrscheinlichkeit bei "Stündliche Vorhersage" + "Die nächsten Tage" zeigt nur niedrige Werte (3%, 8%)</li>
                  </ul>
                </div>

                <div class="feature-box">
                  <h4>🏠 Startseite - UI/UX</h4>
                  <ul>
                    <li><strong>Wetterbild-Optimierung:</strong> Visualisierungs-Container nimmt zu viel Platz ein - als Hintergrund für Overview kombinieren?</li>
                    <li><strong>Inkonsistente Abstände:</strong> Spacing zwischen Containern variiert</li>
                    <li><strong>Tageslänge-Label:</strong> "Tageslänge" sollte "Sonnenstunden" heißen</li>
                  </ul>
                </div>

                <div class="feature-box">
                  <h4>🗺️ Karten</h4>
                  <ul>
                    <li><strong>Target-Button defekt:</strong> Das Ziel-Symbol (🎯) hat keine Funktion - Geolocation funktioniert nicht</li>
                  </ul>
                </div>

                <div class="feature-box">
                  <h4>⚕️ Health</h4>
                  <ul>
                    <li><strong>Zu sensitive Menüs:</strong> Detail-Menüs öffnen sich beim Scrollen statt nur bei Click</li>
                  </ul>
                </div>

                <div class="feature-box">
                  <h4>⚙️ Einstellungen</h4>
                  <ul>
                    <li><strong>Heimatort-Anzeige:</strong> "Nicht gesetzt" wird dauerhaft angezeigt, obwohl Ort gespeichert wurde</li>
                    <li><strong>Hintergrundaktualisierung-Buttons:</strong> Button-Styling ist "cursed" / fehlerhaft</li>
                    <li><strong>PWA-Hinweis verwirrend:</strong> "Als Web-App kann Calchas..." - Welche App soll installiert werden?</li>
                    <li><strong>API-Keys unklar:</strong> Bei Wettermodellen kann man Codes eingeben - Funktion nicht erklärt</li>
                    <li><strong>Layout "Die nächsten Tage":</strong> Sehr gequetscht, mögliche Anzeigefehler</li>
                    <li><strong>"Was ist neu"-Button:</strong> Komische Platzierung unter "Über Calchas"</li>
                  </ul>
                </div>

                <div class="feature-box">
                  <h4>💡 Feature Requests & Verbesserungen</h4>
                  <ul>
                    <li><strong>Mehr Stunden:</strong> Bei "Stündliche Vorhersage" mehr als aktuell anzeigen</li>
                    <li><strong>PWA-Installation Guide:</strong> Auf calchas.dev Anleitung für "Zum Home-Screen hinzufügen" (besonders iOS)</li>
                    <li><strong>Einheiten-System:</strong> Alle Einheiten konsistent einführen und dokumentieren</li>
                    <li><strong>Roadmap-Konfiguration:</strong> Roadmap sollte einfach per Presets/Config anpassbar sein (ohne im Code rumpfuschen zu müssen)</li>
                  </ul>
                </div>

                <div class="feature-box">
                  <h4>📱 iOS PWA Installation</h4>
                  <p><strong>Anleitung für iOS:</strong></p>
                  <ol>
                    <li>calchas.dev in Safari öffnen</li>
                    <li>Auf Teilen-Symbol (□↑) tippen</li>
                    <li>Runterscrollen zu "Zum Home-Bildschirm hinzufügen"</li>
                    <li>Bestätigen</li>
                  </ol>
                  <p><em>→ Diese Anleitung sollte auf der Landing-Page erscheinen</em></p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    // Add tab switching functionality
    setupTabNavigation();

    // Initialize the dev dashboard functionality
    setTimeout(() => {
      if (global.DevDashboard && global.DevDashboard.init) {
        global.DevDashboard.init();
      }
    }, 100);
  }

  function setupTabNavigation() {
    setTimeout(() => {
      const tabButtons = document.querySelectorAll(".dev-nav__tab");
      const tabPanels = document.querySelectorAll(".dev-tab-panel");

      // Ripple effect function
      function createRipple(event, button) {
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        const rect = button.getBoundingClientRect();

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        circle.classList.add("ripple");

        // Remove existing ripples
        const existingRipple = button.querySelector(".ripple");
        if (existingRipple) {
          existingRipple.remove();
        }

        button.appendChild(circle);

        // Remove ripple after animation
        setTimeout(() => circle.remove(), 600);
      }

      tabButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
          const targetTab = button.dataset.tab;

          // Create ripple effect
          createRipple(event, button);

          // Update active tab
          tabButtons.forEach((btn) =>
            btn.classList.remove("dev-nav__tab--active"),
          );
          button.classList.add("dev-nav__tab--active");

          // Show target panel
          tabPanels.forEach((panel) => {
            panel.classList.remove("dev-tab-panel--active");
            if (panel.dataset.panel === targetTab) {
              panel.classList.add("dev-tab-panel--active");
            }
          });

          // Trigger tab-specific updates
          if (global.DevDashboard) {
            switch (targetTab) {
              case "overview":
                global.DevDashboard.updateOverviewTab?.();
                break;
              case "runtime":
                global.DevDashboard.updateRuntimeTab?.();
                break;
              case "serviceworker":
                global.DevDashboard.checkServiceWorkerStatus?.();
                break;
              case "capabilities":
                global.DevDashboard.updateCapabilitiesTab?.();
                break;
              case "apis":
                global.DevDashboard.updateAPIStatus?.();
                break;
              case "cache":
                global.DevDashboard.refreshCacheView?.();
                global.DevDashboard.refreshStorage?.();
                break;
              case "errors":
                global.DevDashboard.updateConsoleOutput?.();
                break;
              case "simulation":
                global.DevDashboard.updateSimulationTab?.();
                break;
              case "config":
                global.DevDashboard.updateConfigTab?.();
                break;
            }
          }
        });
      });

      // Add collapsible functionality for roadmap
      const collapsibleHeaders = document.querySelectorAll(
        ".collapsible-header",
      );
      collapsibleHeaders.forEach((header) => {
        header.addEventListener("click", () => {
          const item = header.closest(".collapsible-item");
          item.classList.toggle("collapsible-item--expanded");
        });
      });
    }, 100);
  }

  // Expose the render function globally
  global.DevDashboardView = {
    render: renderDevDashboard,
  };

  console.log("✅ [DevDashboardView] Loaded");
})(window);
