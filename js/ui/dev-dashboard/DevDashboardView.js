/**
 * Developer Dashboard View Controller
 * Renders the developer dashboard as an embedded view
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
        <button class="dev-nav__tab" data-tab="roadmap">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">map</span>
          <span class="dev-nav__label">Roadmap</span>
        </button>
        <button class="dev-nav__tab" data-tab="tools">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">construction</span>
          <span class="dev-nav__label">Tools</span>
        </button>
        <button class="dev-nav__tab" data-tab="status">
          <span class="dev-nav__icon material-symbols-outlined" aria-hidden="true">sensors</span>
          <span class="dev-nav__label">Status</span>
        </button>
      </nav>

      <!-- Tab Content Container -->
      <div class="dev-tabs-content">

        <!-- OVERVIEW TAB -->
        <div class="dev-tab-panel dev-tab-panel--active" data-panel="overview">
          <section class="dashboard-card hero-card">
            <div class="dev-dashboard-view-header">
              <h2>🔧 Developer Dashboard</h2>
              <div class="status-indicator">
                <span class="status-dot" id="systemStatus"></span>
                <span id="statusText">System OK</span>
              </div>
            </div>
            <div class="hero-content">
              <p class="hero-quote">"Calchas ist nicht fertig – es ist der Anfang"</p>
              <p class="hero-description">
                Technische Einblicke, Debug-Tools und Produkt-Roadmap auf einen Blick.
              </p>
            </div>
          </section>

          <!-- Quick Stats Grid -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-card__icon">🚀</div>
              <div class="stat-card__value">v0.7.0-alpha</div>
              <div class="stat-card__label">Aktuelle Version</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__icon">✅</div>
              <div class="stat-card__value">5/5</div>
              <div class="stat-card__label">Core Features</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__icon">📊</div>
              <div class="stat-card__value" id="moduleCount">-</div>
              <div class="stat-card__label">Module geladen</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__icon">⚡</div>
              <div class="stat-card__value" id="cacheStatus">-</div>
              <div class="stat-card__label">Cache Status</div>
            </div>
          </div>

          <!-- Quick Actions Compact -->
          <section class="dashboard-card">
            <h3>⚡ Quick Actions</h3>
            <div class="quick-actions-compact">
              <button class="action-btn action-btn--danger" onclick="window.DevDashboard?.clearAllCaches()">
                <span>🗑️</span> Cache leeren
              </button>
              <button class="action-btn action-btn--primary" onclick="window.DevDashboard?.testAllAPIs()">
                <span>🧪</span> APIs testen
              </button>
              <button class="action-btn action-btn--secondary" onclick="window.DevDashboard?.exportLogs()">
                <span>📥</span> Logs exportieren
              </button>
            </div>
          </section>
        </div>

        <!-- ROADMAP TAB -->
        <div class="dev-tab-panel" data-panel="roadmap">
          <section class="dashboard-card">
            <h2>🗺️ Produkt-Roadmap</h2>
            <p class="card-description">Unsere Vision in drei Versionen</p>
          </section>

          <!-- Collapsible Version Items -->
          <div class="collapsible-list">
            <!-- Version 0.7.0-alpha -->
            <div class="collapsible-item collapsible-item--live">
              <button class="collapsible-header" data-collapsible="v1">
                <div class="collapsible-header__left">
                  <span class="collapsible-icon">🚀</span>
                  <div>
                    <h3>v0.7.0-alpha</h3>
                    <span class="collapsible-subtitle">LIVE HEUTE</span>
                  </div>
                </div>
                <span class="collapsible-chevron">›</span>
              </button>
              <div class="collapsible-content">
                <p><strong>Status:</strong> Alle Core-Features verfügbar und nutzbar</p>
                <div class="feature-chips-wrap">
                  <span class="chip chip--success">✅ Multi-API-Backbone</span>
                  <span class="chip chip--success">✅ PWA (Offline-fähig)</span>
                  <span class="chip chip--success">✅ Health-Intelligence</span>
                  <span class="chip chip--success">✅ Radar & Karte</span>
                  <span class="chip chip--success">✅ Historische Daten</span>
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
                <span class="collapsible-chevron">›</span>
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
                  <span class="collapsible-icon">✨</span>
                  <div>
                    <h3>v1.0.0-stable</h3>
                    <span class="collapsible-subtitle">VISION</span>
                  </div>
                </div>
                <span class="collapsible-chevron">›</span>
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
          </div>
        </div>

        <!-- TOOLS TAB -->
        <div class="dev-tab-panel" data-panel="tools">
          <section class="dashboard-card">
            <h2>🛠️ Developer Tools</h2>
            <p class="card-description">Debugging, Monitoring und Entwickler-Funktionen</p>
          </section>

          <!-- Tool Cards Grid -->
          <div class="tool-cards">
            <div class="tool-card">
              <div class="tool-card__header">
                <span class="tool-card__icon">🌐</span>
                <h3>WeatherDataService</h3>
              </div>
              <div class="tool-card__status">
                <div class="tool-status-item">
                  <span>Home-Seite Migration</span>
                  <span class="chip chip--warning">Geplant</span>
                </div>
                <div class="tool-status-item">
                  <span>Health-Seite WDS</span>
                  <span class="chip chip--warning">Geplant</span>
                </div>
                <div class="tool-status-item">
                  <span>Map Popups</span>
                  <span class="chip chip--success">✅ Fertig</span>
                </div>
                <div class="tool-status-item">
                  <span>Historical Data</span>
                  <span class="chip chip--success">✅ Fertig</span>
                </div>
              </div>
            </div>

            <div class="tool-card">
              <div class="tool-card__header">
                <span class="tool-card__icon">📊</span>
                <h3>API Monitoring</h3>
              </div>
              <ul class="tool-card__list">
                <li>Live-Status aller Datenquellen</li>
                <li>Response-Zeiten & Fehlerquoten</li>
                <li>Cache-Hit-Ratio Visualisierung</li>
                <li>API-Quota-Tracking</li>
              </ul>
            </div>

            <div class="tool-card">
              <div class="tool-card__header">
                <span class="tool-card__icon">🔍</span>
                <h3>Debug Tools</h3>
              </div>
              <ul class="tool-card__list">
                <li>Console Log Viewer (Live)</li>
                <li>API Request Inspector</li>
                <li>LocalStorage/Cache Manager</li>
                <li>Performance Profiler</li>
              </ul>
            </div>

            <div class="tool-card">
              <div class="tool-card__header">
                <span class="tool-card__icon">🧪</span>
                <h3>Testing Suite</h3>
              </div>
              <ul class="tool-card__list">
                <li>WeatherDataService Unit Tests</li>
                <li>API Fallback-Ketten testen</li>
                <li>UI Component Tests</li>
                <li>E2E Test-Runner</li>
              </ul>
            </div>
          </div>

          <!-- Developer Actions -->
          <section class="dashboard-card">
            <h3>⚡ Developer Actions</h3>
            <div class="actions-grid">
              <button class="action-btn action-btn--danger" onclick="window.DevDashboard?.clearAllCaches()">
                <span>🗑️</span> Cache leeren
              </button>
              <button class="action-btn action-btn--primary" onclick="window.DevDashboard?.testAllAPIs()">
                <span>🧪</span> APIs testen
              </button>
              <button class="action-btn action-btn--secondary" onclick="window.DevDashboard?.exportLogs()">
                <span>📥</span> Logs exportieren
              </button>
              <button class="action-btn action-btn--warning" onclick="window.DevDashboard?.resetSettings()">
                <span>🔄</span> Settings zurücksetzen
              </button>
            </div>
          </section>
        </div>

        <!-- STATUS TAB -->
        <div class="dev-tab-panel" data-panel="status">
          <section class="dashboard-card">
            <h2>📡 System Status</h2>
            <p class="card-description">Live-Monitoring aller Services und Module</p>
          </section>

          <!-- Status Cards -->
          <div class="status-cards">
            <div class="status-card status-card--ok">
              <div class="status-card__header">
                <span class="status-card__icon">🌐</span>
                <h3>WeatherDataService</h3>
              </div>
              <div class="status-card__value" id="wdsStatus">Laden...</div>
            </div>

            <div class="status-card status-card--ok">
              <div class="status-card__header">
                <span class="status-card__icon">💾</span>
                <h3>Cache Service</h3>
              </div>
              <div class="status-card__value" id="cacheStatusDetail">Laden...</div>
            </div>

            <div class="status-card status-card--ok">
              <div class="status-card__header">
                <span class="status-card__icon">🔑</span>
                <h3>API Key Manager</h3>
              </div>
              <div class="status-card__value" id="apiKeyStatus">Laden...</div>
            </div>

            <div class="status-card status-card--ok">
              <div class="status-card__header">
                <span class="status-card__icon">📦</span>
                <h3>Module Loader</h3>
              </div>
              <div class="status-card__value" id="moduleCountDetail">Laden...</div>
            </div>
          </div>

          <!-- API Status List -->
          <section class="dashboard-card">
            <h3>🌐 API Status</h3>
            <div class="api-status-list" id="apiStatusList">
              <div class="api-status-item">
                <span class="api-status-dot api-status-dot--loading"></span>
                <span>Lade Status...</span>
              </div>
            </div>
          </section>
        </div>

      </div>
    `;

    // Add tab switching functionality
    setTimeout(() => {
      const tabButtons = document.querySelectorAll(".dev-nav__tab");
      const tabPanels = document.querySelectorAll(".dev-tab-panel");

      // Ripple effect function (same as BottomNav)
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
        });
      });

      // Add collapsible functionality
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

    // Initialize the dev dashboard functionality
    if (global.DevDashboard && global.DevDashboard.init) {
      global.DevDashboard.init();
    }
  }

  // Expose the render function globally
  global.DevDashboardView = {
    render: renderDevDashboard,
  };

  console.log("✅ [DevDashboardView] Loaded");
})(window);
