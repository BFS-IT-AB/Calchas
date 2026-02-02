/**
 * HistoryCharts.js - Chart Templates & Management for History Page
 *
 * Handles all chart creation, destruction, and configuration.
 * Uses Chart.js with memory-safe lifecycle management.
 *
 * GOLDENE REGEL: All detailed popups open via MasterUIController.openModal()
 *
 * TOOLTIP SYSTEM v2.1 - KOMPAKT & EFFIZIENT:
 * ✓ Intelligente Datenextraktion aus mehreren Quellen
 * ✓ Metrik-spezifische Renderer ohne Redundanzen:
 *   - Temperature: Ø mit Min-Max Bereich (1-2 Items)
 *   - Precipitation: Niederschlag mit Intensität inline (1-2 Items)
 *   - Wind: Geschwindigkeit + Richtung/Beaufort kombiniert (1 Item)
 *   - Humidity: Feuchtigkeit mit Komfort inline (1-2 Items)
 *   - Sunshine: Sonnenstunden mit Prozent inline (1-2 Items)
 *   - Comparison: Beide Zeiträume, Differenz im Wert (2 Items)
 *   - Day Detail: Temp + Regen nur wenn > 0 (1-2 Items)
 *   - Extreme: Temp mit Rekord-Bereich (1-2 Items)
 * ✓ Keine redundanten Informationen (Footer/afterBody nur wenn nötig)
 * ✓ Kompaktes Design: 160-240px Breite, enge Abstände
 * ✓ Optimierte Positionierung mit Kollisionserkennung
 * ✓ Dynamischer Arrow-Offset für präzise Cursor-Zuordnung
 *
 * @module ui/history/components/HistoryCharts
 * @version 2.1.0 - Kompakte Tooltips ohne Redundanzen
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
      this._scrollListenersSetup = false;
      this._setupScrollListener();
    }

    /**
     * Setup scroll listener to hide tooltips when scrolling OUTSIDE the chart container
     * FIXES: Tooltip bleibt nicht im Chart-Block wenn außerhalb gescrollt wird
     */
    _setupScrollListener() {
      if (this._scrollListenersSetup) return;
      this._scrollListenersSetup = true;

      const hideTooltips = () => {
        const tooltips = document.querySelectorAll(".chart-popup-tooltip");
        tooltips.forEach((tooltip) => {
          tooltip.style.opacity = "0";
          tooltip.style.pointerEvents = "none";
        });
      };

      // Handler für Scroll-Events AUSSERHALB des Chart-Containers
      const scrollHandler = (event) => {
        // Prüfe ob der Scroll innerhalb eines Chart-Containers stattfindet
        const chartContainers = document.querySelectorAll(
          "#history-chart-container, .chart-canvas-wrapper, .extreme-modal__chart",
        );

        let isInsideChart = false;
        for (const container of chartContainers) {
          if (container.contains(event.target)) {
            isInsideChart = true;
            break;
          }
        }

        // Wenn NICHT innerhalb eines Chart-Containers gescrollt wird → Tooltip verstecken
        if (!isInsideChart) {
          hideTooltips();
        }
      };

      // Listener auf mehreren Ebenen für vollständige Abdeckung
      // 1. Haupt-Scroll-Container der App
      const appMainViews = document.querySelector(".app-main-views");
      if (appMainViews) {
        appMainViews.addEventListener("scroll", scrollHandler, {
          passive: true,
        });
      }

      // 2. History-View spezifisch
      const historyView = document.querySelector(".history-view");
      if (historyView) {
        historyView.addEventListener("scroll", scrollHandler, {
          passive: true,
        });
      }

      // 3. Window/Document für alle anderen Scroll-Events
      window.addEventListener("scroll", scrollHandler, {
        passive: true,
        capture: true,
      });
      document.addEventListener("scroll", scrollHandler, {
        passive: true,
        capture: true,
      });

      // 4. Touch-Move Events für mobiles Scrolling
      document.addEventListener(
        "touchmove",
        (event) => {
          // Bei Touch-Scroll außerhalb des Charts: Tooltip verstecken
          const chartContainers = document.querySelectorAll(
            "#history-chart-container, .chart-canvas-wrapper",
          );

          let isInsideChart = false;
          for (const container of chartContainers) {
            if (container.contains(event.target)) {
              isInsideChart = true;
              break;
            }
          }

          if (!isInsideChart) {
            hideTooltips();
          }
        },
        { passive: true },
      );

      // 5. Intersection Observer: Verstecke Tooltip wenn Chart-Container aus Viewport scrollt
      this._setupChartVisibilityObserver(hideTooltips);

      console.log(
        "📜 [HistoryCharts] Enhanced scroll listeners attached to contain tooltips within chart",
      );
    }

    /**
     * IntersectionObserver: Versteckt Tooltip wenn Chart-Container nicht mehr sichtbar ist
     */
    _setupChartVisibilityObserver(hideTooltipsCallback) {
      if (typeof IntersectionObserver === "undefined") return;

      const observerOptions = {
        root: null, // Viewport
        rootMargin: "0px",
        threshold: 0.1, // Tooltip verstecken wenn weniger als 10% sichtbar
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          // Wenn Chart-Container weniger als 10% sichtbar → Tooltip verstecken
          if (!entry.isIntersecting || entry.intersectionRatio < 0.1) {
            hideTooltipsCallback();
          }
        });
      }, observerOptions);

      // Beobachte alle Chart-Container (auch zukünftige via MutationObserver)
      const observeChartContainers = () => {
        const containers = document.querySelectorAll(
          "#history-chart-container, .chart-canvas-wrapper, .extreme-modal__chart",
        );
        containers.forEach((container) => {
          if (!container.dataset.tooltipObserved) {
            observer.observe(container);
            container.dataset.tooltipObserved = "true";
          }
        });
      };

      // Initial beobachten
      observeChartContainers();

      // MutationObserver für dynamisch hinzugefügte Chart-Container
      const mutationObserver = new MutationObserver(() => {
        observeChartContainers();
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
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
      // WICHTIG: Prüfe nicht nur auf Länge, sondern auch ob ALLE Werte null/undefined sind
      if (!config?.data?.datasets?.length) {
        console.warn("[HistoryCharts] No datasets - aborting chart creation");
        return null;
      }

      const hasAnyData = config.data.datasets.some((ds) => {
        if (!ds.data || !ds.data.length) return false;
        // Prüfe ob mindestens ein Wert nicht null/undefined ist
        return ds.data.some((val) => val !== null && val !== undefined);
      });

      if (!hasAnyData) {
        console.warn(
          "[HistoryCharts] All data values are null/undefined - chart may appear empty",
        );
        console.warn("[HistoryCharts] Creating chart anyway for consistent UI");
        // Erstelle Chart trotzdem, damit UI konsistent bleibt (zeigt "Keine Daten")
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

        // Store source data in chart object for tooltip callbacks
        if (sourceData) {
          this._dataStore.set(canvasId, sourceData);
          chart.$sourceData = sourceData; // Attach to chart for tooltip access
        }

        // FIX: Tooltip verstecken wenn Maus den Canvas verlässt
        this._setupCanvasMouseLeaveHandler(canvas);

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
     * Setup mouseleave handler to hide tooltip when mouse leaves the chart canvas
     */
    _setupCanvasMouseLeaveHandler(canvas) {
      if (!canvas || canvas.dataset.tooltipMouseLeaveSetup) return;
      canvas.dataset.tooltipMouseLeaveSetup = "true";

      const hideTooltips = () => {
        const tooltips = document.querySelectorAll(".chart-popup-tooltip");
        tooltips.forEach((tooltip) => {
          tooltip.style.opacity = "0";
          tooltip.style.pointerEvents = "none";
        });
      };

      // Verstecke Tooltip wenn Maus den Canvas verlässt
      canvas.addEventListener("mouseleave", hideTooltips);

      // Auch bei touch-end auf mobilen Geräten
      canvas.addEventListener("touchend", () => {
        // Kurze Verzögerung, damit Touch-Events noch verarbeitet werden können
        setTimeout(hideTooltips, 300);
      });
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
     * OPTIMIERT: Metrik wird korrekt aus Chart-ID inferiert und übergeben
     */
    _openDayDetailModal(dayData, sourceChartId) {
      // Remove all active tooltips before opening modal
      this.removeAllTooltips();

      const controller = getHistoryController();
      const metric = this._inferMetricFromChartId(sourceChartId);

      console.log(
        `[HistoryCharts] Opening day detail modal for metric: ${metric}`,
        dayData,
      );

      if (controller?.openModal) {
        controller.openModal("dayDetail", {
          day: dayData,
          metric: metric,
        });
      } else {
        // Fallback: Nutze HistoryStats für metrik-spezifisches Rendering
        const masterUI = getMasterUI();
        const stats = global.HistoryStats;

        if (masterUI?.openModal && stats?.renderDayDetailModal) {
          const modalContent = stats.renderDayDetailModal(dayData, metric);
          this._openDirectModal(
            `history-day-detail-${metric}`,
            modalContent,
            masterUI,
          );
        } else if (masterUI?.openModal) {
          // Legacy Fallback
          const modalContent = this._createDayDetailContent(dayData, metric);
          this._openDirectModal(
            "history-chart-day-detail",
            modalContent,
            masterUI,
          );
        }
      }
    }

    /**
     * Inferiert die Metrik aus der Chart-ID
     * KRITISCH: Für generische Charts (analyse-chart, comparison-chart)
     * IMMER die aktuelle Metrik aus dem State lesen!
     */
    _inferMetricFromChartId(chartId) {
      const id = (chartId || "").toLowerCase();

      // PRIORITÄT 1: Für generische Charts (analyse-chart, comparison-chart)
      // IMMER die aktuelle Metrik aus dem Controller-State lesen!
      if (id.includes("analyse-chart") || id.includes("comparison-chart")) {
        const controller = getHistoryController();
        if (controller?.getState) {
          const currentMetric = controller.getState("currentMetric");
          if (currentMetric) {
            console.log(
              `[HistoryCharts] Using currentMetric from controller state: ${currentMetric}`,
            );
            return currentMetric;
          }
        }
        // Fallback: Aus View-Instanz über Controller lesen
        if (controller?._viewInstance?.currentMetric) {
          console.log(
            `[HistoryCharts] Using currentMetric from HistoryView instance: ${controller._viewInstance.currentMetric}`,
          );
          return controller._viewInstance.currentMetric;
        }
      }

      // PRIORITÄT 2: Explizite Chart-ID Patterns
      // Temperatur-Patterns (spezifische Chart-IDs)
      if (id.includes("temp-chart") || id.includes("temperature-")) {
        return "temperature";
      }
      // Niederschlag-Patterns
      if (
        id.includes("precip") ||
        id.includes("rain") ||
        id.includes("niederschlag")
      ) {
        return "precipitation";
      }
      // Wind-Patterns
      if (id.includes("wind") || id.includes("sturm") || id.includes("böe")) {
        return "wind";
      }
      // Feuchtigkeits-Patterns
      if (id.includes("humid") || id.includes("feucht")) {
        return "humidity";
      }
      // Sonnenschein-Patterns
      if (
        id.includes("sun") ||
        id.includes("sonne") ||
        id.includes("sunshine")
      ) {
        return "sunshine";
      }

      // PRIORITÄT 3: Fallback auf State
      const controller = getHistoryController();
      if (controller?.getState) {
        const currentMetric = controller.getState("currentMetric");
        if (currentMetric) {
          return currentMetric;
        }
      }

      return "temperature";
    }

    /**
     * Legacy Fallback für Day Detail Content
     * Wird nur genutzt wenn HistoryStats nicht verfügbar ist
     */
    _createDayDetailContent(day, metric = "temperature") {
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

      // Metrik-spezifischer primärer Wert
      const getPrimaryDisplay = () => {
        switch (metric) {
          case "precipitation":
            return {
              icon: "water_drop",
              label: "Niederschlag",
              value: `${day.precip?.toFixed(1) ?? "0"} mm`,
              range: `${day.precip > 0 ? "Regentag" : "Trocken"}`,
            };
          case "wind":
            return {
              icon: "air",
              label: "Wind",
              value: `${day.wind_speed?.toFixed(0) ?? "–"} km/h`,
              range:
                day.wind_speed >= 62
                  ? "Sturm"
                  : day.wind_speed >= 39
                    ? "Starker Wind"
                    : "Mäßig",
            };
          case "humidity":
            return {
              icon: "humidity_percentage",
              label: "Feuchtigkeit",
              value: `${day.humidity ?? "–"}%`,
              range:
                day.humidity >= 70
                  ? "Feucht"
                  : day.humidity <= 30
                    ? "Trocken"
                    : "Normal",
            };
          case "sunshine":
            return {
              icon: "wb_sunny",
              label: "Sonnenstunden",
              value: `${day.sunshine?.toFixed(1) ?? "0"} h`,
              range:
                day.sunshine >= 8
                  ? "Sonnig"
                  : day.sunshine < 1
                    ? "Bedeckt"
                    : "Wechselhaft",
            };
          default:
            return {
              icon: "device_thermostat",
              label: "Temperatur",
              value: `${day.temp_avg?.toFixed(1) ?? "–"}°C`,
              range: `${day.temp_min?.toFixed(1) ?? "–"}° / ${day.temp_max?.toFixed(1) ?? "–"}°`,
            };
        }
      };

      const primary = getPrimaryDisplay();

      // GOLDENE REGEL: swipe-handle + design-system konform
      return `
        <div class="standard-modal__content history-day-detail history-day-detail--${metric} ${anomalyClass}">
          <div class="swipe-handle"></div>
          <button class="history-modal__close" data-action="close" aria-label="Schließen">
            <span class="material-symbols-outlined">close</span>
          </button>
          <header class="day-detail__header">
            <h3 class="day-detail__title">${formatted}</h3>
            ${anomalyText ? `<span class="day-detail__anomaly">${anomalyText}</span>` : ""}
          </header>
          <div class="day-detail__metrics-grid">
            <div class="day-detail__metric day-detail__metric--primary">
              <span class="material-symbols-outlined">${primary.icon}</span>
              <div class="day-detail__metric-content">
                <span class="day-detail__label">${primary.label}</span>
                <span class="day-detail__value">${primary.value}</span>
                <span class="day-detail__range">${primary.range}</span>
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
      // Remove all active tooltips before opening modal
      this.removeAllTooltips();

      let modal = document.getElementById(modalId);
      if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        // WICHTIG: bottom-sheet Klasse für korrekte Positionierung und Swipe
        modal.className = "standard-modal bottom-sheet history-modal";
        document.body.appendChild(modal);
      }
      modal.innerHTML = content;

      // Modal via MasterUI öffnen - body.modal-open wird dort gesetzt
      masterUI.openModal(modalId);

      // Body-Class nur setzen wenn Modal wirklich sichtbar
      if (modal.style.display !== "none") {
        document.body.classList.add("modal-open");
      }

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

      // Remove all tooltips from DOM
      this.removeAllTooltips();

      if (count > 0) {
        console.log(`🗑️ [HistoryCharts] Destroyed all ${count} charts`);
      }
    }

    /**
     * Remove all chart tooltips from DOM
     */
    removeAllTooltips() {
      const tooltips = document.querySelectorAll(".chart-popup-tooltip");
      tooltips.forEach((tooltip) => {
        tooltip.remove();
      });
      if (tooltips.length > 0) {
        console.log(`🗑️ [HistoryCharts] Removed ${tooltips.length} tooltips`);
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
   * External HTML Tooltip (Map-Popup-Style)
   * Entspricht dem "Wetter an Position" Popup-Design
   */
  function getOrCreateTooltip(chart) {
    // Store tooltip ID on chart to track which tooltip belongs to which chart
    if (!chart.$tooltipId) {
      chart.$tooltipId =
        "chart-tooltip-" + Math.random().toString(36).substr(2, 9);
    }

    let tooltipEl = document.body.querySelector(
      `.chart-popup-tooltip[data-chart-id="${chart.$tooltipId}"]`,
    );

    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "chart-popup-tooltip";
      tooltipEl.setAttribute("data-chart-id", chart.$tooltipId);
      document.body.appendChild(tooltipEl);
    }

    return tooltipEl;
  }

  /**
   * INTELLIGENTE DATENEXTRAKTION
   * Holt alle verfügbaren Daten aus verschiedenen Quellen
   */
  function extractTooltipData(chart, dataIndex, tooltip) {
    const data = {};

    // 1. Versuche aus sourceData (vollständige Rohdaten)
    const sourceData = chart.$sourceData || [];
    if (sourceData[dataIndex]) {
      Object.assign(data, sourceData[dataIndex]);
    }

    // 2. Für Vergleichscharts: Hole beide Datensätze
    const dataA = chart.$comparisonDataA?.[dataIndex];
    const dataB = chart.$comparisonDataB?.[dataIndex];
    if (dataA || dataB) {
      data.comparisonA = dataA;
      data.comparisonB = dataB;
    }

    // 3. Für Day-Detail-Charts
    if (chart.$dayData) {
      Object.assign(data, chart.$dayData);
    }

    // 4. Für Extreme Charts
    if (chart.$extremeData) {
      Object.assign(data, chart.$extremeData);
    }

    // 5. Fallback: Versuche aus dataPoints
    if (Object.keys(data).length === 0 && tooltip.dataPoints) {
      tooltip.dataPoints.forEach((point) => {
        const label = point.dataset.label?.toLowerCase() || "";
        const value = point.raw;

        if (label.includes("temp") || label.includes("durchschnitt")) {
          data.temp_avg = value;
        } else if (label.includes("niederschlag") || label.includes("precip")) {
          data.precip = value;
        } else if (label.includes("wind")) {
          data.wind_speed = value;
        } else if (
          label.includes("feuchtigkeit") ||
          label.includes("humidity")
        ) {
          data.humidity = value;
        } else if (label.includes("sonne") || label.includes("sunshine")) {
          data.sunshine = value;
        } else if (label.includes("max")) {
          data.temp_max = value;
        } else if (label.includes("min")) {
          data.temp_min = value;
        }
      });
    }

    return data;
  }

  /**
   * METRIK-SPEZIFISCHE TOOLTIP-RENDERER
   */

  // Helper: Detect if data is hourly (has timestamp/hour) or daily
  function isHourlyData(data) {
    return data && (data.timestamp || data.hour !== undefined);
  }

  // Temperature Tooltip - KOMPAKT
  function renderTemperatureTooltip(data, tooltip) {
    let items = [];
    const isHourly = isHourlyData(data);

    if (data.temp_avg != null || data.temp != null) {
      const temp =
        data.temp_avg !== null && data.temp_avg !== undefined
          ? data.temp_avg
          : data.temp;
      items.push({
        label: isHourly ? "TEMP" : "Ø TEMP",
        value: `${temp.toFixed(1)}°C`,
        highlight: true,
      });
    }

    if (!isHourly && data.temp_max != null && data.temp_min != null) {
      items.push({
        label: "MIN-MAX",
        value: `${data.temp_min.toFixed(1)}° - ${data.temp_max.toFixed(1)}°`,
      });
    } else if (!isHourly && data.temp_max != null) {
      items.push({ label: "MAX TEMP", value: `${data.temp_max.toFixed(1)}°C` });
    } else if (!isHourly && data.temp_min != null) {
      items.push({ label: "MIN TEMP", value: `${data.temp_min.toFixed(1)}°C` });
    }

    // Add hour indicator for hourly data
    if (isHourly && data.hour !== undefined) {
      items.push({
        label: "UHRZEIT",
        value: `${String(data.hour).padStart(2, "0")}:00`,
        muted: true,
      });
    }

    return { items };
  }

  // Precipitation Tooltip - KOMPAKT
  function renderPrecipitationTooltip(data, tooltip) {
    let items = [];
    const isHourly = isHourlyData(data);

    if (data.precip != null) {
      // Intensität direkt im Wert
      let intensity = "";
      if (isHourly) {
        // Hourly precipitation intensity
        if (data.precip === 0) intensity = " (Trocken)";
        else if (data.precip < 0.5) intensity = " (Leicht)";
        else if (data.precip < 2) intensity = " (Mäßig)";
        else if (data.precip < 5) intensity = " (Stark)";
        else intensity = " (Sehr stark)";
      } else {
        // Daily precipitation intensity
        if (data.precip === 0) intensity = " (Trocken)";
        else if (data.precip < 2.5) intensity = " (Leicht)";
        else if (data.precip < 10) intensity = " (Mäßig)";
        else if (data.precip < 50) intensity = " (Stark)";
        else intensity = " (Sehr stark)";
      }

      items.push({
        label: isHourly ? "REGEN" : "Σ REGEN",
        value: `${data.precip.toFixed(1)} mm${intensity}`,
        highlight: true,
      });
    }

    if (data.temp_avg != null || data.temp != null) {
      const temp =
        data.temp_avg !== null && data.temp_avg !== undefined
          ? data.temp_avg
          : data.temp;
      items.push({
        label: isHourly ? "TEMP" : "Ø TEMP",
        value: `${temp.toFixed(1)}°C`,
      });
    }

    return { items };
  }

  // Wind Tooltip - KOMPAKT
  function renderWindTooltip(data, tooltip) {
    let items = [];

    if (data.wind_speed != null) {
      // Beaufort-Klassifikation
      let beaufort = "";
      if (data.wind_speed < 2) beaufort = "Windstille";
      else if (data.wind_speed < 12) beaufort = "Leichte Brise";
      else if (data.wind_speed < 30) beaufort = "Mäßig";
      else if (data.wind_speed < 50) beaufort = "Stark";
      else beaufort = "Sturm";

      let windValue = `${data.wind_speed.toFixed(0)} km/h (${beaufort})`;

      if (data.wind_direction != null) {
        const directions = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
        const index = Math.round((data.wind_direction % 360) / 45) % 8;
        windValue = `${directions[index]} ${data.wind_speed.toFixed(0)} km/h`;
      }

      items.push({
        label: "Ø WIND",
        value: windValue,
        highlight: true,
      });
    }

    return { items };
  }

  // Humidity Tooltip - KOMPAKT
  function renderHumidityTooltip(data, tooltip) {
    let items = [];

    if (data.humidity != null) {
      // Komfort-Bewertung direkt im Wert
      let comfort = "";
      if (data.humidity < 30) comfort = " (Sehr trocken)";
      else if (data.humidity < 40) comfort = " (Trocken)";
      else if (data.humidity < 60) comfort = " (Angenehm)";
      else if (data.humidity < 80) comfort = " (Feucht)";
      else comfort = " (Sehr feucht)";

      items.push({
        label: "Ø LUFTFEUCHTE",
        value: `${data.humidity.toFixed(0)}%${comfort}`,
        highlight: true,
      });
    }

    if (data.temp_avg != null) {
      items.push({ label: "Ø TEMP", value: `${data.temp_avg.toFixed(1)}°C` });
    }

    return { items };
  }

  // Sunshine Tooltip - KOMPAKT
  function renderSunshineTooltip(data, tooltip) {
    let items = [];

    if (data.sunshine != null) {
      // Prozent vom Tag + Bewertung
      const percent = ((data.sunshine / 24) * 100).toFixed(0);
      let rating = "";
      if (data.sunshine < 2) rating = "Sehr bewölkt";
      else if (data.sunshine < 4) rating = "Bewölkt";
      else if (data.sunshine < 8) rating = "Wechselhaft";
      else if (data.sunshine < 10) rating = "Heiter";
      else rating = "Sonnig";

      items.push({
        label: "Σ SONNENSTD.",
        value: `${data.sunshine.toFixed(1)} h (${percent}%)`,
        highlight: true,
      });
    }

    if (data.temp_avg != null) {
      items.push({ label: "Ø TEMP", value: `${data.temp_avg.toFixed(1)}°C` });
    }

    return { items };
  }

  // Comparison Tooltip - KOMPAKT & INTELLIGENT
  function renderComparisonTooltip(data, tooltip, labelA, labelB, chart) {
    let items = [];
    const isHourly = isHourlyData(data.comparisonA || data.comparisonB);

    // Berechne Differenz einmal
    let diffStr = "";
    let diffValue = null;
    if (
      data.comparisonA?.temp_avg != null &&
      data.comparisonB?.temp_avg != null
    ) {
      diffValue = data.comparisonB.temp_avg - data.comparisonA.temp_avg;
      const sign = diffValue > 0 ? "+" : "";
      diffStr = ` (${sign}${diffValue.toFixed(1)}°)`;
    } else if (
      data.comparisonA?.temp != null &&
      data.comparisonB?.temp != null
    ) {
      diffValue = data.comparisonB.temp - data.comparisonA.temp;
      const sign = diffValue > 0 ? "+" : "";
      diffStr = ` (${sign}${diffValue.toFixed(1)}°)`;
    }

    // Hole aggregierte Info (z.B. "Dekade 4", "Jahr 10", "Stunde 15")
    const dataIndex = tooltip.dataPoints?.[0]?.dataIndex;
    const aggregatedLabel = chart?.data?.labels?.[dataIndex];

    const tempA =
      data.comparisonA?.temp_avg !== null &&
      data.comparisonA?.temp_avg !== undefined
        ? data.comparisonA.temp_avg
        : data.comparisonA?.temp;
    const tempB =
      data.comparisonB?.temp_avg !== null &&
      data.comparisonB?.temp_avg !== undefined
        ? data.comparisonB.temp_avg
        : data.comparisonB?.temp;

    if (tempA != null) {
      items.push({
        label: `${isHourly ? "" : "Ø "}${labelA || "ZEITRAUM A"}`,
        value: `${tempA.toFixed(1)}°C`,
        highlight: true,
      });
    }

    if (tempB != null) {
      items.push({
        label: `${isHourly ? "" : "Ø "}${labelB || "ZEITRAUM B"}`,
        value: `${tempB.toFixed(1)}°C${diffStr}`,
        highlight: true,
      });
    }

    // Füge Differenz-Info als separate Item hinzu wenn vorhanden
    if (diffValue !== null && Math.abs(diffValue) > 0.05) {
      const diffColor = diffValue > 0 ? "wärmer" : "kälter";
      items.push({
        label: "Δ TEMP",
        value: `${Math.abs(diffValue).toFixed(1)}° ${diffColor}`,
        muted: true,
      });
    }

    return {
      items,
      hiddenFooter: true,
      customHeader: aggregatedLabel, // Verwende aggregierten Label statt Datum
    };
  }

  // Day Detail Tooltip - KOMPAKT
  function renderDayDetailTooltip(data, tooltip) {
    let items = [];

    // Hole die Temperatur und Niederschlag aus den dataPoints
    const tempPoint = tooltip.dataPoints?.find((p) =>
      p.dataset.label?.toLowerCase().includes("temp"),
    );
    const precipPoint = tooltip.dataPoints?.find((p) =>
      p.dataset.label?.toLowerCase().includes("niederschlag"),
    );

    if (tempPoint?.raw != null) {
      items.push({
        label: "Ø TEMP",
        value: `${tempPoint.raw.toFixed(1)}°C`,
        highlight: true,
      });
    }

    if (precipPoint?.raw != null && precipPoint.raw > 0) {
      items.push({
        label: "Σ REGEN",
        value: `${precipPoint.raw.toFixed(1)} mm`,
      });
    }

    return { items };
  }

  // Extreme Tooltip - KOMPAKT
  function renderExtremeTooltip(data, tooltip) {
    let items = [];

    if (tooltip.dataPoints?.[0]?.raw != null) {
      items.push({
        label: "EXTREMWERT",
        value: `${tooltip.dataPoints[0].raw.toFixed(1)}°C`,
        highlight: true,
      });
    }

    if (data.temp_max != null && data.temp_min != null) {
      items.push({
        label: "REKORD-BEREICH",
        value: `${data.temp_min.toFixed(1)}° - ${data.temp_max.toFixed(1)}°`,
      });
    }

    return { items };
  }

  /**
   * External Tooltip Handler - VOLLSTÄNDIG ÜBERARBEITET
   * Intelligente Datenextraktion und metrik-spezifisches Rendering
   * FIX: Tooltip bleibt innerhalb des Chart-Containers
   */
  function externalTooltipHandler(context, metricType = "temperature") {
    const { chart, tooltip } = context;
    const tooltipEl = getOrCreateTooltip(chart);

    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = "0";
      tooltipEl.style.pointerEvents = "none";
      return;
    }

    // VISIBILITY CHECK: Prüfe ob Chart-Container noch im sichtbaren Bereich ist
    const canvasRect = chart.canvas.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Wenn Chart fast vollständig aus dem Viewport gescrollt ist → Tooltip verstecken
    const chartVisibleHeight =
      Math.min(canvasRect.bottom, viewportHeight) - Math.max(canvasRect.top, 0);
    const chartVisibleWidth =
      Math.min(canvasRect.right, viewportWidth) - Math.max(canvasRect.left, 0);
    const chartHeight = canvasRect.height;
    const chartWidth = canvasRect.width;

    // Verstecke Tooltip wenn weniger als 20% des Charts sichtbar ist
    const visibilityThreshold = 0.2;
    const isChartSufficientlyVisible =
      chartVisibleHeight > chartHeight * visibilityThreshold &&
      chartVisibleWidth > chartWidth * visibilityThreshold &&
      canvasRect.bottom > 0 &&
      canvasRect.top < viewportHeight;

    if (!isChartSufficientlyVisible) {
      tooltipEl.style.opacity = "0";
      tooltipEl.style.pointerEvents = "none";
      return;
    }

    // Set content
    if (tooltip.body) {
      const titleLines = tooltip.title || [];
      const dataIndex = tooltip.dataPoints[0]?.dataIndex;

      // INTELLIGENTE DATENEXTRAKTION
      const extractedData = extractTooltipData(chart, dataIndex, tooltip);

      // METRIK-SPEZIFISCHES RENDERING
      let renderResult;
      switch (metricType) {
        case "temperature":
          renderResult = renderTemperatureTooltip(extractedData, tooltip);
          break;
        case "precipitation":
          renderResult = renderPrecipitationTooltip(extractedData, tooltip);
          break;
        case "wind":
          renderResult = renderWindTooltip(extractedData, tooltip);
          break;
        case "humidity":
          renderResult = renderHumidityTooltip(extractedData, tooltip);
          break;
        case "sunshine":
          renderResult = renderSunshineTooltip(extractedData, tooltip);
          break;
        case "comparison":
          const labelA = chart.data.datasets[0]?.label || "Zeitraum A";
          const labelB = chart.data.datasets[1]?.label || "Zeitraum B";
          renderResult = renderComparisonTooltip(
            extractedData,
            tooltip,
            labelA,
            labelB,
            chart,
          );
          break;
        case "daydetail":
          renderResult = renderDayDetailTooltip(extractedData, tooltip);
          break;
        case "extreme":
          renderResult = renderExtremeTooltip(extractedData, tooltip);
          break;
        default:
          renderResult = renderTemperatureTooltip(extractedData, tooltip);
      }

      // HTML GENERIERUNG
      let innerHtml = '<div class="weather-popup-content">';

      // Header - Verwende customHeader falls vorhanden (für Vergleichs-Charts)
      const headerText = renderResult.customHeader || titleLines[0];
      if (headerText) {
        innerHtml += `
          <div class="popup-header">
            <strong>${headerText}</strong>
          </div>`;
      }

      // Items Grid
      if (renderResult.items && renderResult.items.length > 0) {
        innerHtml += '<div class="popup-grid">';

        renderResult.items.forEach((item) => {
          const itemClass = item.highlight
            ? "popup-item popup-item--highlight"
            : item.muted
              ? "popup-item popup-item--muted"
              : "popup-item";

          innerHtml += `
            <div class="${itemClass}">
              <span class="popup-label">${item.label}</span>
              <span class="popup-value">${item.value}</span>
            </div>`;
        });

        innerHtml += "</div>";
      }

      // Footer nur wenn nicht vom Renderer unterdrückt
      if (
        !renderResult.hiddenFooter &&
        tooltip.afterBody &&
        tooltip.afterBody.length > 0
      ) {
        const footerText = tooltip.afterBody.join("").trim();
        if (footerText) {
          innerHtml += `
            <div class="popup-footer">
              <small>${footerText}</small>
            </div>`;
        }
      }

      innerHtml += "</div>";

      tooltipEl.innerHTML = innerHtml;
    }

    // INTELLIGENTE RAND-POSITIONIERUNG - Vermeide Chart-Überlagerung
    // Hinweis: canvasRect, viewportWidth, viewportHeight wurden bereits oben im visibility check definiert

    // Get tooltip dimensions (must be visible to measure)
    tooltipEl.style.opacity = "0";
    tooltipEl.style.display = "block";
    tooltipEl.style.visibility = "hidden";
    const tooltipWidth = tooltipEl.offsetWidth;
    const tooltipHeight = tooltipEl.offsetHeight;
    tooltipEl.style.visibility = "visible";

    // Calculate cursor position
    const cursorX = canvasRect.left + tooltip.caretX;
    const cursorY = canvasRect.top + tooltip.caretY;

    // Weitere Berechnungen mit bereits definierten viewport-Werten
    const padding = 15;
    const gap = 30; // ERHÖHTER Abstand zum Cursor für bessere Lesbarkeit

    // Chart-Bereich definieren
    const chartLeft = canvasRect.left;
    const chartRight = canvasRect.right;
    const chartTop = canvasRect.top;
    const chartBottom = canvasRect.bottom;
    const chartCenterX = (chartLeft + chartRight) / 2;

    let tooltipX, tooltipY;

    // --- STRATEGIE: Positioniere am Rand, vermeide Chart-Mitte ---

    // 1. Versuche LINKS vom Chart (wenn Cursor rechts der Mitte ist)
    const spaceLeft = chartLeft - padding;
    const spaceRight = viewportWidth - chartRight - padding;
    const spaceAbove = chartTop - padding;
    const spaceBelow = viewportHeight - chartBottom - padding;

    // Bestimme ob Cursor in linker oder rechter Chart-Hälfte ist
    const isInLeftHalf = cursorX < chartCenterX;

    // Prüfe horizontale Optionen
    const canFitLeft = spaceLeft >= tooltipWidth + gap;
    const canFitRight = spaceRight >= tooltipWidth + gap;

    // --- HORIZONTALE POSITIONIERUNG ---
    if (!isInLeftHalf && canFitLeft) {
      // Cursor ist rechts, zeige Tooltip links vom Chart
      tooltipX = chartLeft - tooltipWidth - gap;
    } else if (isInLeftHalf && canFitRight) {
      // Cursor ist links, zeige Tooltip rechts vom Chart
      tooltipX = chartRight + gap;
    } else if (canFitLeft) {
      // Fallback: Links wenn möglich
      tooltipX = chartLeft - tooltipWidth - gap;
    } else if (canFitRight) {
      // Fallback: Rechts wenn möglich
      tooltipX = chartRight + gap;
    } else {
      // Kein Platz außerhalb: Positioniere innerhalb, aber mit Mindestabstand vom Cursor
      const minDistanceToCursor = 40; // Mindestabstand zum Cursor
      if (cursorX < chartCenterX) {
        // Cursor links -> Tooltip rechts mit Abstand
        tooltipX = Math.min(
          cursorX + minDistanceToCursor,
          chartRight - tooltipWidth - padding,
        );
      } else {
        // Cursor rechts -> Tooltip links mit Abstand
        tooltipX = Math.max(
          cursorX - tooltipWidth - minDistanceToCursor,
          chartLeft + padding,
        );
      }
    }

    // --- VERTIKALE POSITIONIERUNG ---
    // Versuche zunächst vertikal zentriert, aber mit Mindestabstand zum Cursor
    const minVerticalDistance = 25; // Vertikaler Mindestabstand
    const idealY = cursorY - tooltipHeight / 2;

    // Prüfe ob Tooltip zu nah am Cursor wäre
    const cursorInTooltipVerticalRange =
      cursorY >= idealY && cursorY <= idealY + tooltipHeight;

    if (cursorInTooltipVerticalRange) {
      // Tooltip würde Cursor überlagern - positioniere ober- oder unterhalb
      const spaceAboveCursor = cursorY - chartTop;
      const spaceBelowCursor = chartBottom - cursorY;

      if (
        spaceAboveCursor > spaceBelowCursor &&
        spaceAboveCursor >= tooltipHeight + minVerticalDistance
      ) {
        // Platziere oberhalb mit Abstand
        tooltipY = cursorY - tooltipHeight - minVerticalDistance;
      } else if (spaceBelowCursor >= tooltipHeight + minVerticalDistance) {
        // Platziere unterhalb mit Abstand
        tooltipY = cursorY + minVerticalDistance;
      } else {
        // Nicht genug Platz - nutze idealY
        tooltipY = idealY;
      }
    } else {
      tooltipY = idealY;
    }

    // Clamp zu Viewport UND zum sichtbaren Chart-Bereich
    // WICHTIG: Tooltip darf nicht außerhalb des sichtbaren Chart-Bereichs erscheinen
    const visibleChartTop = Math.max(canvasRect.top, 0);
    const visibleChartBottom = Math.min(canvasRect.bottom, viewportHeight);
    const visibleChartLeft = Math.max(canvasRect.left, 0);
    const visibleChartRight = Math.min(canvasRect.right, viewportWidth);

    // Vertikal: Clamp zum Viewport, aber bevorzuge den sichtbaren Chart-Bereich
    tooltipY = Math.max(
      padding,
      Math.min(tooltipY, viewportHeight - tooltipHeight - padding),
    );

    // Wenn Tooltip außerhalb des sichtbaren Chart-Bereichs wäre, korrigiere Position
    // oder verstecke wenn keine gute Position möglich
    if (
      tooltipY + tooltipHeight < visibleChartTop ||
      tooltipY > visibleChartBottom
    ) {
      // Tooltip wäre komplett außerhalb des sichtbaren Chart-Bereichs
      // Versuche innerhalb zu positionieren
      if (visibleChartBottom - visibleChartTop >= tooltipHeight + 2 * padding) {
        // Genug Platz innerhalb des sichtbaren Bereichs
        tooltipY = Math.max(
          visibleChartTop + padding,
          Math.min(tooltipY, visibleChartBottom - tooltipHeight - padding),
        );
      }
    }

    // Final clamp horizontal (Sicherheit)
    tooltipX = Math.max(
      padding,
      Math.min(tooltipX, viewportWidth - tooltipWidth - padding),
    );

    // Finaler Visibility-Check: Wenn Tooltip-Position außerhalb des sinnvollen Bereichs liegt, verstecken
    const tooltipCenterY = tooltipY + tooltipHeight / 2;
    const isTooltipInReasonablePosition =
      tooltipCenterY >= visibleChartTop - 50 &&
      tooltipCenterY <= visibleChartBottom + 50;

    if (!isTooltipInReasonablePosition) {
      tooltipEl.style.opacity = "0";
      tooltipEl.style.pointerEvents = "none";
      return;
    }

    // Apply final position
    tooltipEl.style.opacity = "1";
    tooltipEl.style.pointerEvents = "none";
    tooltipEl.style.position = "fixed";
    tooltipEl.style.left = tooltipX + "px";
    tooltipEl.style.top = tooltipY + "px";

    // Smooth transition
    tooltipEl.style.transition =
      "opacity 0.15s ease, top 0.12s ease-out, left 0.12s ease-out";
  }

  /**
   * Format date for tooltip display (e.g., "15. Januar 2026")
   */
  function formatDateForTooltip(dateStr) {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const monthNames = [
        "Januar",
        "Februar",
        "März",
        "April",
        "Mai",
        "Juni",
        "Juli",
        "August",
        "September",
        "Oktober",
        "November",
        "Dezember",
      ];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${day}. ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Compact date format for comparison tooltips: "03. 2025: Di, 20."
   */
  function formatCompactDate(dateStr) {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const weekdayShort = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][
        date.getDay()
      ];
      return `${month}. ${year}: ${weekdayShort}, ${day}.`;
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Compact date format for comparison tooltips: "03. 2025: Di, 20."
   */
  function formatCompactDate(dateStr) {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const weekdayShort = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][
        date.getDay()
      ];
      return `${month}. ${year}: ${weekdayShort}, ${day}.`;
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Get base chart options with consistent styling
   * Chart-Style wie Vergleichs-Tab mit Map-Popup-Tooltips
   */
  function getBaseOptions(metric = "temperature") {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
        axis: "x",
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false, // Disable default tooltip
          external: (context) => externalTooltipHandler(context, metric),
          callbacks: {
            title: function (context) {
              return context[0].label || "";
            },
            label: function (context) {
              let label = context.dataset.label || "";
              if (context.parsed.y !== null) {
                if (metric === "temperature") {
                  return `${label}: ${context.parsed.y.toFixed(1)}°C`;
                } else if (metric === "precipitation") {
                  return `${label}: ${context.parsed.y.toFixed(1)} mm`;
                } else if (metric === "wind") {
                  return `${label}: ${context.parsed.y.toFixed(0)} km/h`;
                } else if (metric === "humidity") {
                  return `${label}: ${context.parsed.y.toFixed(0)}%`;
                } else if (metric === "sunshine") {
                  return `${label}: ${context.parsed.y.toFixed(1)} h`;
                }
              }
              return `${label}: ${context.parsed.y?.toFixed(1) || 0}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255,255,255,0.03)",
            drawBorder: false,
            lineWidth: 1,
          },
          ticks: {
            color: "#6b7280",
            font: { size: 11, weight: 500 },
            maxTicksLimit: 10,
            maxRotation: 0,
            padding: 8,
          },
        },
        y: {
          grid: {
            color: "rgba(255,255,255,0.03)",
            drawBorder: false,
            lineWidth: 1,
          },
          ticks: {
            color: "#6b7280",
            font: { size: 11 },
            padding: 8,
            callback: (val) => {
              if (metric === "temperature") return val + "°";
              if (metric === "precipitation") return val + "mm";
              if (metric === "wind") return val + "km/h";
              if (metric === "humidity") return val + "%";
              if (metric === "sunshine") return val + "h";
              return val;
            },
          },
        },
      },
      // Smooth animations
      animation: {
        duration: 400,
        easing: "easeOutQuart",
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
            enabled: false,
            external: (context) =>
              externalTooltipHandler(context, "temperature"),
            callbacks: {
              title: (items) => {
                // Get full date from chart's data store
                const chart = items[0].chart;
                const index = items[0].dataIndex;
                const sourceData = chart.$sourceData || [];
                if (sourceData[index]?.date) {
                  return formatDateForTooltip(sourceData[index].date);
                }
                return items[0].label;
              },
              label: (item) => {
                const value =
                  typeof item.raw === "number" ? item.raw.toFixed(1) : item.raw;
                const label = item.dataset.label;

                if (label === "Klimamittel") {
                  return `${label}: ${value}°C`;
                } else if (label === "Max") {
                  return `Maximum: ${value}°C`;
                } else if (label === "Min") {
                  return `Minimum: ${value}°C`;
                } else if (label === "Durchschnitt") {
                  return `${label}: ${value}°C`;
                }
                return `${label}: ${value}°C`;
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
    const baseOptions = getBaseOptions("precipitation");
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
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            enabled: false,
            external: (context) =>
              externalTooltipHandler(context, "precipitation"),
            callbacks: {
              title: (items) => {
                const chart = items[0].chart;
                const index = items[0].dataIndex;
                const sourceData = chart.$sourceData || [];
                if (sourceData[index]?.date) {
                  return formatDateForTooltip(sourceData[index].date);
                }
                return items[0].label;
              },
              label: (item) => {
                const value =
                  typeof item.raw === "number" ? item.raw.toFixed(1) : item.raw;
                return `Niederschlag: ${value} mm`;
              },
            },
          },
        },
      },
    };
  }

  /**
   * Generate wind chart config
   */
  function getWindChartConfig(data, labels) {
    const baseOptions = getBaseOptions("wind");
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
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            enabled: false,
            external: (context) => externalTooltipHandler(context, "wind"),
            callbacks: {
              title: (items) => {
                const chart = items[0].chart;
                const index = items[0].dataIndex;
                const sourceData = chart.$sourceData || [];
                if (sourceData[index]?.date) {
                  return formatDateForTooltip(sourceData[index].date);
                }
                return items[0].label;
              },
              label: (item) => {
                const value =
                  typeof item.raw === "number" ? item.raw.toFixed(1) : item.raw;
                return `Wind: ${value} km/h`;
              },
            },
          },
        },
      },
    };
  }

  /**
   * Generate humidity chart config
   */
  function getHumidityChartConfig(data, labels) {
    const baseOptions = getBaseOptions("humidity");

    // DEBUG: Log humidity data
    const humidityValues = data.map((d) => d.humidity);
    console.log("📊 [HumidityChart] Data points:", data.length);
    console.log("📊 [HumidityChart] Humidity values:", humidityValues);
    const validHumidityCount = humidityValues.filter(
      (v) => v !== null && v !== undefined,
    ).length;
    console.log("📊 [HumidityChart] Non-null values:", validHumidityCount);
    console.log("📊 [HumidityChart] Sample data:", data.slice(0, 3));

    // SAFETY: Falls keine echten humidity-Daten vorhanden, zeige Warnung
    if (validHumidityCount === 0) {
      console.warn(
        "⚠️ [HumidityChart] No valid humidity data found in dataset!",
      );
      console.warn("⚠️ [HumidityChart] Chart may appear empty or show zeros");
    }

    return {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Feuchtigkeit",
            data: humidityValues,
            borderColor: CONFIG.CHART_COLORS.humidity,
            backgroundColor: "rgba(100, 181, 246, 0.15)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            spanGaps: true, // WICHTIG: Verbinde Punkte auch wenn Daten fehlen
          },
        ],
      },
      options: {
        ...baseOptions,
        scales: {
          ...baseOptions.scales,
          y: {
            ...baseOptions.scales.y,
            min: 0,
            max: 100,
            ticks: {
              ...baseOptions.scales.y.ticks,
              stepSize: 20,
            },
          },
        },
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            enabled: false,
            external: (context) => externalTooltipHandler(context, "humidity"),
            callbacks: {
              title: (items) => {
                const chart = items[0].chart;
                const index = items[0].dataIndex;
                const sourceData = chart.$sourceData || [];
                if (sourceData[index]?.date) {
                  return formatDateForTooltip(sourceData[index].date);
                }
                return items[0].label;
              },
              label: (item) => {
                const value =
                  typeof item.raw === "number" ? item.raw.toFixed(0) : item.raw;
                return `Feuchtigkeit: ${value}%`;
              },
            },
          },
        },
      },
    };
  }

  /**
   * Generate sunshine chart config
   */
  function getSunshineChartConfig(data, labels) {
    const baseOptions = getBaseOptions("sunshine");
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
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            enabled: false,
            external: (context) => externalTooltipHandler(context, "sunshine"),
            callbacks: {
              title: (items) => {
                const chart = items[0].chart;
                const index = items[0].dataIndex;
                const sourceData = chart.$sourceData || [];
                if (sourceData[index]?.date) {
                  return formatDateForTooltip(sourceData[index].date);
                }
                return items[0].label;
              },
              label: (item) => {
                const value =
                  typeof item.raw === "number" ? item.raw.toFixed(1) : item.raw;
                return `Sonne: ${value} h`;
              },
            },
          },
        },
      },
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
   * ENHANCED: Click-Handler für Vergleichs-Modals hinzugefügt
   */
  /**
   * Get comparison chart config with granularity support
   * @param {Array} dataA - Dataset A (raw or aggregated)
   * @param {Array} dataB - Dataset B (raw or aggregated)
   * @param {string} labelA - Label for dataset A
   * @param {string} labelB - Label for dataset B
   * @param {string} [granularity="day"] - Time granularity (hour, day, week, month, year, decade, century)
   */
  function getComparisonChartConfig(
    dataA,
    dataB,
    labelA,
    labelB,
    granularity = "day",
  ) {
    const TRS = window.TimeRangeSystem;

    let processedDataA = dataA || [];
    let processedDataB = dataB || [];

    console.log("[HistoryCharts] Comparison config input:", {
      granularity,
      rawDataALength: dataA?.length,
      rawDataBLength: dataB?.length,
      firstDateA: dataA?.[0]?.date,
      lastDateA: dataA?.[dataA?.length - 1]?.date,
      firstDateB: dataB?.[0]?.date,
      lastDateB: dataB?.[dataB?.length - 1]?.date,
    });

    // Intelligente Aggregation basierend auf Datenmenge
    let aggregationGranularity = null;
    let labelConfig = null;

    if (TRS) {
      const dataLength = Math.max(dataA?.length || 0, dataB?.length || 0);

      // Entscheide über Aggregation basierend auf Datenmenge:
      // Jahrhundert (36500 Tage) → Aggregiere zu Dekaden (10 Punkte)
      // Jahrzehnt (3650 Tage) → Aggregiere zu Jahren (10 Punkte)
      // Mehrere Jahre (730+ Tage) → Aggregiere zu Monaten (~24-120 Punkte)
      // Jahr (365 Tage) → Aggregiere zu Wochen (~52 Punkte)
      // Monat/Wochen (7-60 Tage) → Zeige Tage
      // Einzelner Tag (1 Tag) → Zeige als Tag (stündliche Daten nicht verfügbar in API)

      if (dataLength > 10000) {
        // Jahrhundert → Aggregiere zu Dekaden
        aggregationGranularity = "decade";
        labelConfig = TRS.GRANULARITY_CONFIG["decade"];
        console.log(
          `[HistoryCharts] Very large dataset (${dataLength} days) - aggregating to decades`,
        );
      } else if (dataLength > 2000) {
        // Mehrere Jahrzehnte → Aggregiere zu Jahren
        aggregationGranularity = "year";
        labelConfig = TRS.GRANULARITY_CONFIG["year"];
        console.log(
          `[HistoryCharts] Large dataset (${dataLength} days) - aggregating to years`,
        );
      } else if (dataLength > 730) {
        // Mehrere Jahre → Aggregiere zu Monaten
        aggregationGranularity = "month";
        labelConfig = TRS.GRANULARITY_CONFIG["month"];
        console.log(
          `[HistoryCharts] Medium-large dataset (${dataLength} days) - aggregating to months`,
        );
      } else if (dataLength >= 180) {
        // Halbes Jahr+ → Aggregiere zu Wochen
        aggregationGranularity = "week";
        labelConfig = TRS.GRANULARITY_CONFIG["week"];
        console.log(
          `[HistoryCharts] Medium dataset (${dataLength} days) - aggregating to weeks`,
        );
      } else if (dataLength >= 2) {
        // Monat/Wochen/mehrere Tage → Zeige Tage
        aggregationGranularity = null; // Keine Aggregation
        labelConfig = TRS.GRANULARITY_CONFIG["day"];
        console.log(
          `[HistoryCharts] Small dataset (${dataLength} days) - showing daily data`,
        );
      } else if (dataLength === 1) {
        // Einzelner Tag → Zeige als Tag (keine stündlichen Daten verfügbar)
        aggregationGranularity = null;
        labelConfig = TRS.GRANULARITY_CONFIG["day"];
        console.log(
          "[HistoryCharts] Single day - showing as daily data (hourly not available from API)",
        );
      } else {
        // Kein Datenpunkt
        labelConfig = TRS.GRANULARITY_CONFIG["day"];
      }

      // Führe Aggregation durch falls nötig
      if (aggregationGranularity && dataLength > 0) {
        processedDataA = TRS.aggregateDataByGranularity(
          dataA,
          aggregationGranularity,
        );
        processedDataB = TRS.aggregateDataByGranularity(
          dataB,
          aggregationGranularity,
        );
      }
    } else {
      labelConfig = { formatLabel: (d) => d.toLocaleDateString("de-DE") };
    }

    console.log("[HistoryCharts] Processed data:", {
      processedALength: processedDataA.length,
      processedBLength: processedDataB.length,
      aggregationUsed: aggregationGranularity || "none",
    });

    // Labels: Verwende GENERISCHE Labels für Vergleiche
    // Statt "1. Jan" vs "15. Jun" → "Tag 1", "Tag 2" etc.
    // Damit beide Zeiträume vergleichbar sind
    const maxLength = Math.max(processedDataA.length, processedDataB.length);

    // Detect if data is hourly
    const isHourlyA =
      processedDataA.length > 0 &&
      (processedDataA[0].timestamp || processedDataA[0].hour !== undefined);
    const isHourlyB =
      processedDataB.length > 0 &&
      (processedDataB[0].timestamp || processedDataB[0].hour !== undefined);
    const isHourly = isHourlyA || isHourlyB;

    const labels = Array.from({ length: maxLength }, (_, i) => {
      const index = i + 1;

      // Hourly labels
      if (isHourly) {
        // If we have hourly data, show hour numbers
        const hour =
          processedDataA[i]?.hour !== undefined
            ? processedDataA[i].hour
            : processedDataB[i]?.hour !== undefined
              ? processedDataB[i].hour
              : i;
        return `${String(hour).padStart(2, "0")}:00`;
      }

      // Generische Labels basierend auf Aggregation (tägliche/längere Zeiträume)
      if (aggregationGranularity === "decade") {
        return `Dekade ${index}`;
      } else if (aggregationGranularity === "year") {
        return `Jahr ${index}`;
      } else if (aggregationGranularity === "month") {
        return `Monat ${index}`;
      } else if (aggregationGranularity === "week") {
        return `Woche ${index}`;
      } else {
        // Tage
        return `Tag ${index}`;
      }
    });

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
            data: processedDataA.map((d) =>
              d.temp_avg !== null && d.temp_avg !== undefined
                ? d.temp_avg
                : d.temp,
            ),
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
            data: processedDataB.map((d) =>
              d.temp_avg !== null && d.temp_avg !== undefined
                ? d.temp_avg
                : d.temp,
            ),
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
            enabled: false,
            external: (context) =>
              externalTooltipHandler(context, "comparison"),
            callbacks: {
              title: (items) => {
                // Vergleichschart: Zeige BEIDE Datumsangaben kompakt
                const chart = items[0].chart;
                const index = items[0].dataIndex;
                const dataA = chart.$comparisonDataA || processedDataA;
                const dataB = chart.$comparisonDataB || processedDataB;

                // Baue kompakten Titel: "03. 2025: Di, 20. | 03. 2024: Mi, 20."
                const parts = [];

                if (dataA[index]?.date) {
                  parts.push(formatCompactDate(dataA[index].date));
                }

                if (dataB[index]?.date) {
                  parts.push(formatCompactDate(dataB[index].date));
                }

                return parts.length > 0 ? parts.join(" | ") : items[0].label;
              },
              label: (item) =>
                `${item.dataset.label}: ${item.raw?.toFixed(1) || "N/A"}°C`,
            },
          },
        },
        // Click-Handler für Vergleichs-Tag-Modal
        onClick: (event, elements, chart) => {
          if (elements.length > 0) {
            const dataIndex = elements[0].dataIndex;
            const dayA = processedDataA[dataIndex];
            const dayB = processedDataB[dataIndex];

            // Validierung: Mindestens ein Datensatz muss vorhanden sein
            if (!dayA && !dayB) {
              console.warn(
                "[HistoryCharts] Keine Daten für Index",
                dataIndex + 1,
              );
              return;
            }

            // Modal über Controller öffnen
            const controller = getHistoryController();
            const metric =
              controller?.getState?.("currentMetric") || "temperature";

            if (controller?.openModal) {
              controller.openModal("comparisonDay", {
                dayA: dayA,
                dayB: dayB,
                labelA: labelA,
                labelB: labelB,
                metric: metric,
                granularity: aggregationGranularity || granularity,
              });
            }
          }
        },
        // Cursor ändern beim Hover
        onHover: (event, elements) => {
          event.native.target.style.cursor =
            elements.length > 0 ? "pointer" : "default";
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
            enabled: false,
            external: (context) => externalTooltipHandler(context, "daydetail"),
            callbacks: {
              title: (items) => {
                // For day detail chart, show the date if available in dayData
                const chart = items[0].chart;
                if (chart.$dayData?.date) {
                  return (
                    formatDateForTooltip(chart.$dayData.date) +
                    ` - ${items[0].label}`
                  );
                }
                return `⏰ ${items[0].label}`;
              },
              label: (item) => {
                if (item.dataset.label === "Temperatur") {
                  return `Temperatur: ${item.raw.toFixed(1)}°C`;
                }
                return `Niederschlag: ${item.raw.toFixed(1)} mm`;
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
            enabled: false,
            external: (context) => externalTooltipHandler(context, "extreme"),
            callbacks: {
              title: (items) => {
                const chart = items[0].chart;
                if (chart.$extremeData?.date) {
                  return (
                    formatDateForTooltip(chart.$extremeData.date) +
                    ` - ${items[0].label}`
                  );
                }
                return `⏰ ${items[0].label}`;
              },
              label: (item) => `Temperatur: ${item.raw.toFixed(1)}°C`,
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
  // CLEANUP EVENT LISTENERS
  // ============================================
  // Remove tooltips when navigating away or losing focus
  function setupTooltipCleanupListeners() {
    // Clean tooltips on visibility change (tab switch, minimize)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        chartManager.removeAllTooltips();
      }
    });

    // Clean tooltips on page navigation (before unload)
    window.addEventListener("beforeunload", () => {
      chartManager.removeAllTooltips();
    });

    // Clean tooltips when switching away from history tab
    // This catches custom tab switching in the app
    document.addEventListener("tabchange", (e) => {
      if (e.detail?.from === "history" || e.detail?.previousTab === "history") {
        chartManager.removeAllTooltips();
      }
    });
  }

  // Initialize cleanup listeners once
  setupTooltipCleanupListeners();

  // ============================================
  // PUBLIC API
  // ============================================
  global.HistoryCharts = {
    // Chart Manager methods
    create: (canvasId, config, sourceData) =>
      chartManager.create(canvasId, config, sourceData),
    destroy: (canvasId) => chartManager.destroy(canvasId),
    destroyAll: () => chartManager.destroyAll(),
    removeAllTooltips: () => chartManager.removeAllTooltips(),
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
