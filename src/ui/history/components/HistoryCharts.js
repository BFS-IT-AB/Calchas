/**
 * HistoryCharts.js - Chart Templates & Management for History Page
 *
 * Handles all chart creation, destruction, and configuration.
 * Uses Chart.js with memory-safe lifecycle management.
 *
 * GOLDENE REGEL: All detailed popups open via MasterUIController.openModal()
 *
 * @module ui/history/components/HistoryCharts
 * @version 1.1.0
 */
(function (global) {
  "use strict";

  // ============================================
  // IMPORTS
  // ============================================
  const getMasterUI = () => global.MasterUIController;
  const getHistoryController = () => global.HistoryController;

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Climate reference averages (Berlin)
    CLIMATE_NORMALS: {
      january: { avgTemp: 0.6, precip: 42.3, sunshine: 44.7 },
      february: { avgTemp: 1.4, precip: 33.3, sunshine: 73.5 },
      march: { avgTemp: 5.1, precip: 40.5, sunshine: 120.2 },
      april: { avgTemp: 9.6, precip: 37.1, sunshine: 159.3 },
      may: { avgTemp: 14.4, precip: 53.8, sunshine: 220.8 },
      june: { avgTemp: 17.4, precip: 68.7, sunshine: 222.6 },
      july: { avgTemp: 19.5, precip: 55.5, sunshine: 217.8 },
      august: { avgTemp: 19.0, precip: 58.2, sunshine: 205.8 },
      september: { avgTemp: 14.7, precip: 45.1, sunshine: 152.2 },
      october: { avgTemp: 9.8, precip: 37.3, sunshine: 108.3 },
      november: { avgTemp: 5.0, precip: 43.8, sunshine: 53.4 },
      december: { avgTemp: 1.5, precip: 55.3, sunshine: 37.7 },
    },
    MONTH_NAMES: [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ],
    // Chart styling using CSS variables
    CHART_COLORS: {
      primary: "#8ab4ff",
      secondary: "rgba(255, 255, 255, 0.6)",
      accent: "#ff9800",
      cold: "#3b82f6",
      warm: "#ef4444",
      precipitation: "rgba(59, 130, 246, 0.7)",
      sunshine: "rgba(255, 210, 111, 0.7)",
      wind: "#80cbc4",
      humidity: "#64b5f6",
    },
  };

  // ============================================
  // VISIBILITY OBSERVER - Wartet auf echte Sichtbarkeit
  // ============================================
  class VisibilityObserver {
    constructor() {
      this._pendingCreations = new Map();
      this._resizeObserver = null;
      this._mutationObserver = null;
      this._init();
    }

    _init() {
      // ResizeObserver für Canvas-Größenänderungen
      if (typeof ResizeObserver !== "undefined") {
        this._resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const canvas = entry.target;
            if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
              this._tryCreate(canvas.id);
            }
          }
        });
      }

      // MutationObserver für DOM-Änderungen (display: none → block)
      this._mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === "attributes" &&
            (mutation.attributeName === "style" ||
              mutation.attributeName === "class" ||
              mutation.attributeName === "hidden")
          ) {
            this._checkAllPending();
          }
        }
      });

      // Beobachte den Body für globale Style-Änderungen
      this._mutationObserver.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ["style", "class", "hidden"],
      });
    }

    /**
     * Registriert eine Chart-Erstellung die auf Sichtbarkeit wartet
     */
    waitForVisibility(canvasId, createFn, maxWaitMs = 5000) {
      return new Promise((resolve, reject) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
          reject(new Error(`Canvas ${canvasId} not found`));
          return;
        }

        // Speichere die Erstellungsfunktion
        this._pendingCreations.set(canvasId, { createFn, resolve, reject });

        // Beobachte Canvas mit ResizeObserver
        if (this._resizeObserver) {
          this._resizeObserver.observe(canvas);
        }

        // Prüfe sofort ob bereits sichtbar
        if (this._isVisible(canvas)) {
          console.log(
            `[VisibilityObserver] ${canvasId} already visible, creating immediately`,
          );
          this._tryCreate(canvasId);
          return;
        }

        // Timeout als Fallback
        setTimeout(() => {
          if (this._pendingCreations.has(canvasId)) {
            console.warn(
              `[VisibilityObserver] ${canvasId} timeout after ${maxWaitMs}ms, forcing creation`,
            );
            this._forceCreate(canvasId);
          }
        }, maxWaitMs);

        // requestAnimationFrame-Loop als zusätzlicher Mechanismus
        this._rafCheck(canvasId);
      });
    }

    _rafCheck(canvasId, attempts = 0) {
      if (!this._pendingCreations.has(canvasId)) return;
      if (attempts > 60) return; // Max ~1 Sekunde bei 60fps

      requestAnimationFrame(() => {
        const canvas = document.getElementById(canvasId);
        if (canvas && this._isVisible(canvas)) {
          this._tryCreate(canvasId);
        } else {
          this._rafCheck(canvasId, attempts + 1);
        }
      });
    }

    _isVisible(canvas) {
      if (!canvas) return false;

      // Prüfe offsetWidth/offsetHeight
      if (canvas.offsetWidth <= 0 || canvas.offsetHeight <= 0) return false;

      // Prüfe computed styles
      const style = window.getComputedStyle(canvas);
      if (style.display === "none" || style.visibility === "hidden")
        return false;

      // Prüfe Parent-Kette
      let parent = canvas.parentElement;
      while (parent && parent !== document.body) {
        const parentStyle = window.getComputedStyle(parent);
        if (
          parentStyle.display === "none" ||
          parentStyle.visibility === "hidden"
        ) {
          return false;
        }
        if (parent.hasAttribute("hidden")) return false;
        parent = parent.parentElement;
      }

      return true;
    }

    _checkAllPending() {
      for (const canvasId of this._pendingCreations.keys()) {
        const canvas = document.getElementById(canvasId);
        if (canvas && this._isVisible(canvas)) {
          this._tryCreate(canvasId);
        }
      }
    }

    _tryCreate(canvasId) {
      const pending = this._pendingCreations.get(canvasId);
      if (!pending) return;

      const canvas = document.getElementById(canvasId);
      if (!canvas || !this._isVisible(canvas)) return;

      console.log(
        `[VisibilityObserver] ${canvasId} now visible (${canvas.offsetWidth}x${canvas.offsetHeight}), creating chart`,
      );

      // Entferne Observer
      if (this._resizeObserver) {
        this._resizeObserver.unobserve(canvas);
      }
      this._pendingCreations.delete(canvasId);

      // Erstelle Chart
      try {
        const chart = pending.createFn();
        pending.resolve(chart);
      } catch (error) {
        pending.reject(error);
      }
    }

    _forceCreate(canvasId) {
      const pending = this._pendingCreations.get(canvasId);
      if (!pending) return;

      const canvas = document.getElementById(canvasId);
      if (this._resizeObserver && canvas) {
        this._resizeObserver.unobserve(canvas);
      }
      this._pendingCreations.delete(canvasId);

      try {
        const chart = pending.createFn();
        pending.resolve(chart);
      } catch (error) {
        pending.reject(error);
      }
    }

    cleanup(canvasId) {
      const canvas = document.getElementById(canvasId);
      if (this._resizeObserver && canvas) {
        this._resizeObserver.unobserve(canvas);
      }
      this._pendingCreations.delete(canvasId);
    }

    destroy() {
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
      }
      if (this._mutationObserver) {
        this._mutationObserver.disconnect();
      }
      this._pendingCreations.clear();
    }
  }

  // Singleton VisibilityObserver
  const visibilityObserver = new VisibilityObserver();

  // ============================================
  // CHART MANAGER CLASS
  // ============================================
  class ChartManager {
    constructor() {
      this.instances = new Map();
      this._dataStore = new Map(); // Store associated data for click handlers
    }

    /**
     * Create or update a chart, destroying existing instance first
     * VISIBILITY-SAFE: Wartet auf echte Sichtbarkeit des Canvas
     * @param {string} canvasId - Canvas element ID
     * @param {Object} config - Chart.js config
     * @param {Array} sourceData - Original data array for click handlers
     */
    create(canvasId, config, sourceData = null) {
      this.destroy(canvasId);

      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.warn("[HistoryCharts] Canvas not found:", canvasId);
        return null;
      }

      if (typeof Chart === "undefined") {
        console.warn("[HistoryCharts] Chart.js not loaded - aborting");
        return null;
      }

      // SAFETY: Leere Daten abfangen
      if (
        !config?.data?.datasets?.length ||
        config.data.datasets.every((ds) => !ds.data?.length)
      ) {
        console.warn("[HistoryCharts] Empty data - aborting chart creation");
        return null;
      }

      // VISIBILITY CHECK: Warte auf echte Sichtbarkeit
      const createChartFn = () =>
        this._createChartInternal(canvasId, config, sourceData);

      // Prüfe ob Canvas bereits sichtbar ist
      if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
        return createChartFn();
      }

      // Warte auf Sichtbarkeit
      console.log(
        `[HistoryCharts] Canvas ${canvasId} not visible yet, waiting...`,
      );
      visibilityObserver
        .waitForVisibility(canvasId, createChartFn)
        .catch((err) =>
          console.error(`[HistoryCharts] Deferred creation failed:`, err),
        );

      return null; // Async creation - Chart wird später erstellt
    }

    /**
     * Interner Chart-Erstellungscode
     */
    _createChartInternal(canvasId, config, sourceData) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return null;

      try {
        const ctx = canvas.getContext("2d");

        // Add click handler for detailed view via MasterUIController
        const enhancedConfig = this._enhanceWithClickHandler(
          config,
          canvasId,
          sourceData,
        );

        const chart = new Chart(ctx, enhancedConfig);
        this.instances.set(canvasId, chart);

        if (sourceData) {
          this._dataStore.set(canvasId, sourceData);
        }

        console.log(
          `📊 [HistoryCharts] Created: ${canvasId} (${canvas.offsetWidth}x${canvas.offsetHeight})`,
        );
        return chart;
      } catch (error) {
        console.error("[HistoryCharts] Creation failed:", error);
        return null;
      }
    }

    /**
     * Enhance chart config with click handler for day detail modal
     * GOLDENE REGEL: Opens detail via MasterUIController
     */
    _enhanceWithClickHandler(config, canvasId, sourceData) {
      if (!sourceData || sourceData.length === 0) return config;

      // Add onClick handler to show day detail
      const existingOnClick = config.options?.onClick;

      return {
        ...config,
        options: {
          ...config.options,
          onClick: (event, elements, chart) => {
            // Call existing handler first
            if (existingOnClick) {
              existingOnClick(event, elements, chart);
            }

            // If a data point was clicked, open day detail modal
            if (elements.length > 0) {
              const dataIndex = elements[0].index;
              const dayData = sourceData[dataIndex];

              if (dayData) {
                this._openDayDetailModal(dayData, canvasId);
              }
            }
          },
          // Change cursor on hover over data points
          onHover: (event, elements) => {
            event.native.target.style.cursor =
              elements.length > 0 ? "pointer" : "default";
          },
        },
      };
    }

    /**
     * Open day detail modal via MasterUIController
     * GOLDENE REGEL: Alle Detail-Popups über MasterUIController
     */
    _openDayDetailModal(dayData, sourceChartId) {
      const controller = getHistoryController();

      if (controller?.openModal) {
        controller.openModal("dayDetail", {
          day: dayData,
          metric: this._inferMetricFromChartId(sourceChartId),
        });
      } else {
        // Fallback: Direct MasterUIController call
        const masterUI = getMasterUI();
        if (masterUI?.openModal) {
          const modalContent = this._createDayDetailContent(dayData);
          this._openDirectModal(
            "history-chart-day-detail",
            modalContent,
            masterUI,
          );
        }
      }
    }

    _inferMetricFromChartId(chartId) {
      if (chartId.includes("temp")) return "temperature";
      if (chartId.includes("precip")) return "precipitation";
      if (chartId.includes("wind")) return "wind";
      if (chartId.includes("humid")) return "humidity";
      if (chartId.includes("sun")) return "sunshine";
      return "temperature";
    }

    _createDayDetailContent(day) {
      const date = new Date(day.date);
      const formatted = date.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // Get climate normal for comparison
      const monthIdx = date.getMonth();
      const monthName = CONFIG.MONTH_NAMES[monthIdx];
      const normals =
        CONFIG.CLIMATE_NORMALS[monthName] || CONFIG.CLIMATE_NORMALS.january;
      const tempAnomaly =
        day.temp_avg !== null ? day.temp_avg - normals.avgTemp : null;

      // Determine anomaly indicator
      let anomalyClass = "";
      let anomalyText = "";
      if (tempAnomaly !== null) {
        if (tempAnomaly >= 5) {
          anomalyClass = "day-detail--extreme-warm";
          anomalyText = `+${tempAnomaly.toFixed(1)}° über Klimamittel`;
        } else if (tempAnomaly >= 2) {
          anomalyClass = "day-detail--warm";
          anomalyText = `+${tempAnomaly.toFixed(1)}° über Klimamittel`;
        } else if (tempAnomaly <= -5) {
          anomalyClass = "day-detail--extreme-cold";
          anomalyText = `${tempAnomaly.toFixed(1)}° unter Klimamittel`;
        } else if (tempAnomaly <= -2) {
          anomalyClass = "day-detail--cold";
          anomalyText = `${tempAnomaly.toFixed(1)}° unter Klimamittel`;
        } else {
          anomalyText = "Im Normalbereich";
        }
      }

      // GOLDENE REGEL: swipe-handle statt close button
      return `
        <div class="standard-modal__content history-day-detail ${anomalyClass}">
          <div class="swipe-handle"></div>
          <header class="day-detail__header">
            <h3 class="day-detail__title">${formatted}</h3>
            ${anomalyText ? `<span class="day-detail__anomaly">${anomalyText}</span>` : ""}
          </header>
          <div class="day-detail__metrics-grid">
            <div class="day-detail__metric day-detail__metric--primary">
              <span class="material-symbols-outlined">device_thermostat</span>
              <div class="day-detail__metric-content">
                <span class="day-detail__label">Temperatur</span>
                <span class="day-detail__value">${day.temp_avg?.toFixed(1) ?? "–"}°C</span>
                <span class="day-detail__range">${day.temp_min?.toFixed(1) ?? "–"}° / ${day.temp_max?.toFixed(1) ?? "–"}°</span>
              </div>
            </div>
            <div class="day-detail__metric">
              <span class="material-symbols-outlined">water_drop</span>
              <div class="day-detail__metric-content">
                <span class="day-detail__label">Niederschlag</span>
                <span class="day-detail__value">${day.precip?.toFixed(1) ?? "0"} mm</span>
              </div>
            </div>
            <div class="day-detail__metric">
              <span class="material-symbols-outlined">air</span>
              <div class="day-detail__metric-content">
                <span class="day-detail__label">Wind</span>
                <span class="day-detail__value">${day.wind_speed?.toFixed(0) ?? "–"} km/h</span>
              </div>
            </div>
            <div class="day-detail__metric">
              <span class="material-symbols-outlined">humidity_percentage</span>
              <div class="day-detail__metric-content">
                <span class="day-detail__label">Feuchtigkeit</span>
                <span class="day-detail__value">${day.humidity ?? "–"}%</span>
              </div>
            </div>
            <div class="day-detail__metric">
              <span class="material-symbols-outlined">wb_sunny</span>
              <div class="day-detail__metric-content">
                <span class="day-detail__label">Sonnenstunden</span>
                <span class="day-detail__value">${day.sunshine?.toFixed(1) ?? "–"} h</span>
              </div>
            </div>
          </div>
          <footer class="day-detail__footer">
            <span class="day-detail__climate-ref">
              <span class="material-symbols-outlined">info</span>
              Klimamittel ${CONFIG.MONTH_NAMES[monthIdx]}: ${normals.avgTemp.toFixed(1)}°C
            </span>
          </footer>
        </div>
      `;
    }

    _openDirectModal(modalId, content, masterUI) {
      let modal = document.getElementById(modalId);
      if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        // WICHTIG: bottom-sheet Klasse für korrekte Positionierung und Swipe
        modal.className = "standard-modal bottom-sheet history-modal";
        document.body.appendChild(modal);
      }
      modal.innerHTML = content;

      // Add body class for modal-open state (triggers close button hiding)
      document.body.classList.add("modal-open");

      masterUI.openModal(modalId);

      // Setup swipe-to-close handler
      this._setupSwipeHandler(modal, masterUI);
    }

    /**
     * Setup swipe-to-close for the modal
     * GOLDENE REGEL: Nutze swift-easing für smooth Animation
     */
    _setupSwipeHandler(modal, masterUI) {
      const handle = modal.querySelector(".swipe-handle");
      if (!handle) return;

      let startY = 0;
      let currentY = 0;
      let isDragging = false;

      const onStart = (e) => {
        isDragging = true;
        startY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
        modal.classList.add("bottom-sheet--swiping");
      };

      const onMove = (e) => {
        if (!isDragging) return;
        currentY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
        const deltaY = Math.max(0, currentY - startY); // Only allow downward swipe
        modal.style.transform = `translateY(${deltaY}px)`;
      };

      const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        modal.classList.remove("bottom-sheet--swiping");

        const deltaY = currentY - startY;
        if (deltaY > 100) {
          // Close modal with swift animation
          modal.classList.add("bottom-sheet--snapping");
          modal.style.transform = "translateY(100%)";
          setTimeout(() => {
            masterUI.closeActiveModal();
            modal.style.transform = "";
            modal.classList.remove("bottom-sheet--snapping");
            document.body.classList.remove("modal-open");
          }, 300);
        } else {
          // Snap back
          modal.classList.add("bottom-sheet--snapping");
          modal.style.transform = "";
          setTimeout(() => {
            modal.classList.remove("bottom-sheet--snapping");
          }, 300);
        }
      };

      handle.addEventListener("touchstart", onStart, { passive: true });
      handle.addEventListener("mousedown", onStart);
      document.addEventListener("touchmove", onMove, { passive: true });
      document.addEventListener("mousemove", onMove);
      document.addEventListener("touchend", onEnd);
      document.addEventListener("mouseup", onEnd);
    }

    /**
     * Destroy a specific chart by canvas ID
     */
    destroy(canvasId) {
      const chart = this.instances.get(canvasId);
      if (chart) {
        try {
          chart.destroy();
          this.instances.delete(canvasId);
          this._dataStore.delete(canvasId);
          console.log(`🗑️ [HistoryCharts] Destroyed: ${canvasId}`);
        } catch (error) {
          console.error("[HistoryCharts] Destroy error:", error);
        }
      }
    }

    /**
     * Destroy all chart instances - IMPORTANT for memory management
     */
    destroyAll() {
      const count = this.instances.size;
      this.instances.forEach((chart, id) => {
        try {
          chart.destroy();
        } catch (e) {
          console.warn(`[HistoryCharts] Error destroying ${id}:`, e);
        }
      });
      this.instances.clear();
      this._dataStore.clear();
      if (count > 0) {
        console.log(`🗑️ [HistoryCharts] Destroyed all ${count} charts`);
      }
    }

    has(canvasId) {
      return this.instances.has(canvasId);
    }

    get(canvasId) {
      return this.instances.get(canvasId);
    }

    /**
     * Get the source data for a chart
     */
    getData(canvasId) {
      return this._dataStore.get(canvasId);
    }
  }

  // ============================================
  // CHART CONFIGURATIONS
  // ============================================

  /**
   * Get base chart options with consistent styling
   */
  function getBaseOptions(metric = "temperature") {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "var(--health-glass-bg, rgba(15, 20, 30, 0.95))",
          titleColor: "#fff",
          bodyColor: "#a7b1c6",
          borderColor: "rgba(138, 180, 255, 0.3)",
          borderWidth: 1,
          padding: 14,
          cornerRadius: 12,
          displayColors: true,
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
          ticks: {
            color: "#6b7280",
            font: { size: 11, weight: 500 },
            maxTicksLimit: 10,
            maxRotation: 0,
          },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
          ticks: {
            color: "#6b7280",
            font: { size: 11 },
            callback: (val) => (metric === "temperature" ? val + "°" : val),
          },
        },
      },
      // Use CSS variable for animation
      animation: {
        duration: 350,
        easing: "easeOutQuart", // Approximates --health-swift-easing
      },
    };
  }

  /**
   * Get climate average for current month
   */
  function getClimateAverage(monthIndex = new Date().getMonth()) {
    const monthName = CONFIG.MONTH_NAMES[monthIndex];
    return CONFIG.CLIMATE_NORMALS[monthName]?.avgTemp ?? 10;
  }

  /**
   * Generate temperature chart config
   */
  function getTemperatureChartConfig(data, labels) {
    const climateAvg = getClimateAverage();
    const baseOptions = getBaseOptions("temperature");

    return {
      type: "line",
      data: {
        labels,
        datasets: [
          // Max temperature band
          {
            label: "Max",
            data: data.map((d) => d.temp_max),
            borderColor: "rgba(255, 152, 0, 0.6)",
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: context, chartArea } = chart;
              if (!chartArea) return "rgba(138, 180, 255, 0.15)";
              const gradient = context.createLinearGradient(
                0,
                chartArea.bottom,
                0,
                chartArea.top,
              );
              gradient.addColorStop(0, "rgba(59, 130, 246, 0.15)");
              gradient.addColorStop(0.5, "rgba(138, 180, 255, 0.2)");
              gradient.addColorStop(1, "rgba(255, 152, 0, 0.15)");
              return gradient;
            },
            fill: "+1",
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 1.5,
          },
          // Min temperature
          {
            label: "Min",
            data: data.map((d) => d.temp_min),
            borderColor: "rgba(59, 130, 246, 0.6)",
            backgroundColor: "transparent",
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 1.5,
          },
          // Average temperature line
          {
            label: "Durchschnitt",
            data: data.map((d) => d.temp_avg),
            borderColor: CONFIG.CHART_COLORS.primary,
            backgroundColor: "transparent",
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: CONFIG.CHART_COLORS.primary,
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 2,
          },
          // Climate reference line
          {
            label: "Klimamittel",
            data: Array(data.length).fill(climateAvg),
            borderColor: "rgba(255, 255, 255, 0.4)",
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [8, 6],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              title: (items) => `Tag ${items[0].label}`,
              label: (item) => {
                if (item.dataset.label === "Klimamittel") {
                  return ` ${item.dataset.label}: ${climateAvg.toFixed(1)}°C (Referenz)`;
                }
                return ` ${item.dataset.label}: ${typeof item.raw === "number" ? item.raw.toFixed(1) : item.raw}°C`;
              },
            },
          },
        },
      },
    };
  }

  /**
   * Generate precipitation chart config
   */
  function getPrecipitationChartConfig(data, labels) {
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Niederschlag",
            data: data.map((d) => d.precip),
            backgroundColor: CONFIG.CHART_COLORS.precipitation,
            borderColor: CONFIG.CHART_COLORS.primary,
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: CONFIG.CHART_COLORS.primary,
          },
        ],
      },
      options: getBaseOptions("precipitation"),
    };
  }

  /**
   * Generate wind chart config
   */
  function getWindChartConfig(data, labels) {
    return {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Wind",
            data: data.map((d) => d.wind_speed),
            borderColor: CONFIG.CHART_COLORS.wind,
            backgroundColor: "rgba(128, 203, 196, 0.15)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
          },
        ],
      },
      options: getBaseOptions("wind"),
    };
  }

  /**
   * Generate humidity chart config
   */
  function getHumidityChartConfig(data, labels) {
    return {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Feuchtigkeit",
            data: data.map((d) => d.humidity),
            borderColor: CONFIG.CHART_COLORS.humidity,
            backgroundColor: "rgba(100, 181, 246, 0.15)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          },
        ],
      },
      options: getBaseOptions("humidity"),
    };
  }

  /**
   * Generate sunshine chart config
   */
  function getSunshineChartConfig(data, labels) {
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Sonnenschein",
            data: data.map((d) => d.sunshine),
            backgroundColor: CONFIG.CHART_COLORS.sunshine,
            borderColor: "#ffd26f",
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: getBaseOptions("sunshine"),
    };
  }

  /**
   * Get chart config for a specific metric
   */
  function getChartConfigForMetric(metric, data, labels) {
    switch (metric) {
      case "temperature":
        return getTemperatureChartConfig(data, labels);
      case "precipitation":
        return getPrecipitationChartConfig(data, labels);
      case "wind":
        return getWindChartConfig(data, labels);
      case "humidity":
        return getHumidityChartConfig(data, labels);
      case "sunshine":
        return getSunshineChartConfig(data, labels);
      default:
        return getTemperatureChartConfig(data, labels);
    }
  }

  /**
   * Generate comparison chart config (two periods)
   */
  function getComparisonChartConfig(dataA, dataB, labelA, labelB) {
    const maxLen = Math.max(dataA.length, dataB.length);
    const labels = Array.from({ length: maxLen }, (_, i) => i + 1);

    // Custom plugin for deviation area shading
    const deviationAreaPlugin = {
      id: "deviationArea",
      beforeDatasetsDraw: (chart) => {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;

        const datasetA = chart.data.datasets[0];
        const datasetB = chart.data.datasets[1];
        if (!datasetA?.data || !datasetB?.data) return;

        ctx.save();
        ctx.beginPath();

        const xScale = scales.x;
        const yScale = scales.y;

        // Forward path (datasetA)
        for (let i = 0; i < datasetA.data.length; i++) {
          const x = xScale.getPixelForValue(i);
          const y = yScale.getPixelForValue(datasetA.data[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Backward path (datasetB - reversed)
        for (let i = datasetB.data.length - 1; i >= 0; i--) {
          const x = xScale.getPixelForValue(i);
          const y = yScale.getPixelForValue(datasetB.data[i]);
          ctx.lineTo(x, y);
        }

        ctx.closePath();

        const gradient = ctx.createLinearGradient(
          0,
          chartArea.top,
          0,
          chartArea.bottom,
        );
        gradient.addColorStop(0, "rgba(248, 113, 113, 0.15)");
        gradient.addColorStop(0.5, "rgba(138, 180, 255, 0.08)");
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.15)");

        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
      },
    };

    return {
      type: "line",
      plugins: [deviationAreaPlugin],
      data: {
        labels,
        datasets: [
          {
            label: labelA,
            data: dataA.map((d) => d.temp_avg),
            borderColor: CONFIG.CHART_COLORS.secondary,
            backgroundColor: "transparent",
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "#fff",
          },
          {
            label: labelB,
            data: dataB.map((d) => d.temp_avg),
            borderColor: CONFIG.CHART_COLORS.primary,
            backgroundColor: "transparent",
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: CONFIG.CHART_COLORS.primary,
            pointHoverBorderColor: "#fff",
          },
        ],
      },
      options: {
        ...getBaseOptions("temperature"),
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "#a7b1c6",
              font: { size: 12, weight: 500 },
              usePointStyle: true,
              pointStyle: "line",
              padding: 20,
            },
          },
          tooltip: {
            ...getBaseOptions("temperature").plugins.tooltip,
            callbacks: {
              title: (items) => `Tag ${items[0].label}`,
              afterBody: (items) => {
                if (items.length >= 2) {
                  const diff = (items[1].raw - items[0].raw).toFixed(1);
                  const sign = diff > 0 ? "+" : "";
                  return `\nAbweichung: ${sign}${diff}°C`;
                }
                return "";
              },
              label: (item) =>
                ` ${item.dataset.label}: ${item.raw.toFixed(1)}°C`,
            },
          },
        },
      },
    };
  }

  /**
   * Generate day detail chart config (hourly temperature + precipitation)
   */
  function getDayDetailChartConfig(dayData) {
    const hours = [
      "00:00",
      "03:00",
      "06:00",
      "09:00",
      "12:00",
      "15:00",
      "18:00",
      "21:00",
    ];
    const tempRange = (dayData.temp_max || 10) - (dayData.temp_min || 0);

    // Generate realistic hourly temperature curve
    const temps = hours.map((_, i) => {
      const hourOfDay = i * 3;
      const factor = Math.sin(((hourOfDay - 5) * Math.PI) / 12);
      return (
        (dayData.temp_min || 0) + tempRange * 0.5 + tempRange * 0.5 * factor
      );
    });

    // Generate precipitation distribution
    const dailyPrecip = dayData.precip || 0;
    const precipDistribution =
      dailyPrecip > 0
        ? generatePrecipDistribution(dailyPrecip, hours.length)
        : Array(hours.length).fill(0);

    return {
      type: "bar",
      data: {
        labels: hours,
        datasets: [
          // Precipitation bars
          {
            type: "bar",
            label: "Niederschlag",
            data: precipDistribution,
            backgroundColor: (ctx) => {
              const value = ctx.raw;
              if (value === 0) return "rgba(59, 130, 246, 0.1)";
              if (value < 0.5) return "rgba(59, 130, 246, 0.3)";
              if (value < 1) return "rgba(59, 130, 246, 0.5)";
              return "rgba(59, 130, 246, 0.7)";
            },
            borderColor: "rgba(59, 130, 246, 0.8)",
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.8,
            yAxisID: "yPrecip",
            order: 2,
          },
          // Temperature line
          {
            type: "line",
            label: "Temperatur",
            data: temps,
            borderColor: CONFIG.CHART_COLORS.accent,
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: context, chartArea } = chart;
              if (!chartArea) return "rgba(255, 152, 0, 0.15)";
              const gradient = context.createLinearGradient(
                0,
                chartArea.bottom,
                0,
                chartArea.top,
              );
              gradient.addColorStop(0, "rgba(255, 152, 0, 0.05)");
              gradient.addColorStop(1, "rgba(255, 152, 0, 0.25)");
              return gradient;
            },
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: CONFIG.CHART_COLORS.accent,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            yAxisID: "yTemp",
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "#a7b1c6",
              font: { size: 11 },
              usePointStyle: true,
              padding: 12,
            },
          },
          tooltip: {
            backgroundColor: "var(--health-glass-bg, rgba(15, 20, 30, 0.95))",
            titleColor: "#fff",
            bodyColor: "#a7b1c6",
            borderColor: "rgba(138, 180, 255, 0.3)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (item) => {
                if (item.dataset.label === "Temperatur") {
                  return ` ${item.raw.toFixed(1)}°C`;
                }
                return ` ${item.raw.toFixed(1)} mm`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#6b7280", font: { size: 10 } },
          },
          yTemp: {
            type: "linear",
            position: "left",
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: {
              color: CONFIG.CHART_COLORS.accent,
              font: { size: 10 },
              callback: (v) => v.toFixed(0) + "°",
            },
          },
          yPrecip: {
            type: "linear",
            position: "right",
            min: 0,
            suggestedMax: Math.max(dailyPrecip * 0.6, 2),
            grid: { display: false },
            ticks: {
              color: "#3b82f6",
              font: { size: 10 },
              callback: (v) => v.toFixed(1) + "mm",
            },
          },
        },
        animation: {
          duration: 350,
          easing: "easeOutQuart",
        },
      },
    };
  }

  /**
   * Generate extreme mini chart config
   */
  function getExtremeMiniChartConfig(extremeData) {
    const hours = ["00:00", "06:00", "12:00", "18:00", "24:00"];
    const tempMin = extremeData.temp_min ?? 0;
    const tempMax = extremeData.temp_max ?? 10;
    const tempRange = tempMax - tempMin;

    const temps = [
      tempMin + tempRange * 0.2,
      tempMin + tempRange * 0.1,
      tempMax,
      tempMax - tempRange * 0.3,
      tempMin + tempRange * 0.3,
    ];

    const isHot = extremeData.temp_max >= 30;
    const isCold = extremeData.temp_min <= 0;
    const chartColor = isHot
      ? CONFIG.CHART_COLORS.warm
      : isCold
        ? CONFIG.CHART_COLORS.cold
        : CONFIG.CHART_COLORS.primary;

    return {
      type: "line",
      data: {
        labels: hours,
        datasets: [
          {
            label: "Temperatur",
            data: temps,
            borderColor: chartColor,
            backgroundColor: isHot
              ? "rgba(239, 68, 68, 0.1)"
              : isCold
                ? "rgba(59, 130, 246, 0.1)"
                : "rgba(138, 180, 255, 0.1)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#fff",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "var(--health-glass-bg, rgba(15, 20, 30, 0.95))",
            titleColor: "#fff",
            bodyColor: "#a7b1c6",
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (item) => ` ${item.raw.toFixed(1)}°C`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#6b7280", font: { size: 10 } },
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: {
              color: "#6b7280",
              font: { size: 10 },
              callback: (val) => val + "°",
            },
          },
        },
        animation: {
          duration: 350,
          easing: "easeOutQuart",
        },
      },
    };
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Generate realistic precipitation distribution
   */
  function generatePrecipDistribution(totalPrecip, hours) {
    const weights = Array(hours)
      .fill(0)
      .map(() => Math.random());
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return weights.map((w) => (w / totalWeight) * totalPrecip);
  }

  // ============================================
  // SINGLETON INSTANCE
  // ============================================
  const chartManager = new ChartManager();

  // ============================================
  // PUBLIC API
  // ============================================
  global.HistoryCharts = {
    // Chart Manager methods
    create: (canvasId, config, sourceData) =>
      chartManager.create(canvasId, config, sourceData),
    destroy: (canvasId) => chartManager.destroy(canvasId),
    destroyAll: () => chartManager.destroyAll(),
    has: (canvasId) => chartManager.has(canvasId),
    get: (canvasId) => chartManager.get(canvasId),
    getData: (canvasId) => chartManager.getData(canvasId),

    // Observer cleanup - WICHTIG beim Tab-Wechsel
    cleanupObservers: () => {
      if (visibilityObserver) {
        visibilityObserver.destroy();
      }
      console.log("[HistoryCharts] Observers cleaned up");
    },

    // Expose chartManager for direct access
    chartManager,

    // Config generators
    getChartConfigForMetric,
    getComparisonChartConfig,
    getDayDetailChartConfig,
    getExtremeMiniChartConfig,
    getTemperatureChartConfig,
    getPrecipitationChartConfig,
    getWindChartConfig,
    getHumidityChartConfig,
    getSunshineChartConfig,

    // Utilities
    getClimateAverage,
    getBaseOptions,
    generatePrecipDistribution,

    // Configuration
    CONFIG,
  };
})(typeof window !== "undefined" ? window : this);
