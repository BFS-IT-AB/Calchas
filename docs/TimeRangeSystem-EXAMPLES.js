/**
 * TimeRangeSystem - Quick Start Examples
 *
 * Praktische Code-Beispiele für häufige Use-Cases
 */

// ============================================
// BEISPIEL 1: Period Modal mit Granularität öffnen
// ============================================

function openWeeklyComparisonModal() {
  const controller = getHistoryController();

  controller.openModal("period", {
    periodType: "A",
    currentPeriod: null,
    granularity: "week", // Wochen-Ansicht
    onSelect: async (periodId) => {
      console.log("Gewählte Periode:", periodId);
      // Daten laden und Vergleich starten
      await loadAndCompareData(periodId);
    },
  });
}

// ============================================
// BEISPIEL 2: Daten aggregieren und Chart rendern
// ============================================

async function renderMonthlyComparisonChart() {
  const TRS = window.TimeRangeSystem;

  // Rohdaten von API holen
  const rawDataA = await fetchHistoricalData("2024-01-01", "2024-12-31");
  const rawDataB = await fetchHistoricalData("2023-01-01", "2023-12-31");

  // Nach Monaten aggregieren
  const monthlyDataA = TRS.aggregateDataByGranularity(rawDataA, "month");
  const monthlyDataB = TRS.aggregateDataByGranularity(rawDataB, "month");

  // Chart-Config erstellen
  const charts = getCharts();
  const config = charts.getComparisonChartConfig(
    monthlyDataA,
    monthlyDataB,
    "2024",
    "2023",
    "month",
  );

  // Chart rendern
  const chart = charts.chartManager.create("comparison-chart", config);
}

// ============================================
// BEISPIEL 3: Optimale Granularität automatisch wählen
// ============================================

function autoSelectGranularity(startDate, endDate) {
  const TRS = window.TimeRangeSystem;

  // Zeitraum analysieren
  const start = new Date(startDate);
  const end = new Date(endDate);
  const optimal = TRS.detectOptimalGranularity(start, end);

  console.log(
    `Optimale Granularität für ${startDate} - ${endDate}: ${optimal}`,
  );

  return optimal;
}

// ============================================
// BEISPIEL 4: Preset-basierte Auswahl
// ============================================

function loadPresetComparison(presetId) {
  const TRS = window.TimeRangeSystem;
  const presets = TRS.generateTimeRangePresets();

  // Finde gewähltes Preset
  const preset = presets.find((p) => p.id === presetId);
  if (!preset) return;

  // Lade Daten für Preset-Zeitraum
  fetchHistoricalData(
    preset.startDate.toISOString(),
    preset.endDate.toISOString(),
  ).then((data) => {
    // Aggregiere mit Preset-Granularität
    const aggregated = TRS.aggregateDataByGranularity(data, preset.granularity);
    renderChart(aggregated, preset.granularity);
  });
}

// ============================================
// BEISPIEL 5: Custom Date Range mit Granularität
// ============================================

function compareCustomRange(startA, endA, startB, endB, granularity = "day") {
  const TRS = window.TimeRangeSystem;

  Promise.all([
    fetchHistoricalData(startA, endA),
    fetchHistoricalData(startB, endB),
  ]).then(([dataA, dataB]) => {
    // Aggregiere beide Datensätze
    const aggA = TRS.aggregateDataByGranularity(dataA, granularity);
    const aggB = TRS.aggregateDataByGranularity(dataB, granularity);

    // Labels generieren
    const config = TRS.GRANULARITY_CONFIG[granularity];
    const labelA = TRS.generateTimeRangeLabel(
      new Date(startA),
      new Date(endA),
      granularity,
    );
    const labelB = TRS.generateTimeRangeLabel(
      new Date(startB),
      new Date(endB),
      granularity,
    );

    // Chart rendern
    const charts = getCharts();
    const chartConfig = charts.getComparisonChartConfig(
      aggA,
      aggB,
      labelA,
      labelB,
      granularity,
    );
    charts.chartManager.create("comparison-chart", chartConfig);
  });
}

// ============================================
// BEISPIEL 6: Perioden-Liste dynamisch generieren
// ============================================

function generatePeriodsUI(granularity, container) {
  const TRS = window.TimeRangeSystem;
  const config = TRS.GRANULARITY_CONFIG[granularity];
  const now = new Date();
  const periods = [];

  // Letzte 12 Perioden generieren
  for (let i = 0; i < 12; i++) {
    const date =
      i === 0 ? now : config.getPrevious(new Date(periods[i - 1].startDate));
    const endDate = config.getNext(date);

    periods.push({
      id: `${granularity}-${i}`,
      label: config.formatFull(date),
      subtitle: TRS.generateTimeRangeLabel(date, endDate, granularity),
      startDate: date.toISOString(),
      endDate: endDate.toISOString(),
    });
  }

  // UI rendern
  container.innerHTML = periods
    .map(
      (p) => `
    <button class="period-item" data-period-id="${p.id}">
      <div class="period-item__content">
        <span class="period-item__name">${p.label}</span>
        <span class="period-item__subtitle">${p.subtitle}</span>
      </div>
    </button>
  `,
    )
    .join("");
}

// ============================================
// BEISPIEL 7: Multi-Granularitäts-Dashboard
// ============================================

function createMultiGranularityDashboard() {
  const TRS = window.TimeRangeSystem;
  const granularities = ["day", "week", "month", "year"];
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Lade Daten
  fetchHistoricalData(oneYearAgo.toISOString(), now.toISOString()).then(
    (rawData) => {
      // Erstelle Chart für jede Granularität
      granularities.forEach((gran) => {
        const aggregated = TRS.aggregateDataByGranularity(rawData, gran);
        const canvasId = `chart-${gran}`;
        renderChartInContainer(canvasId, aggregated, gran);
      });
    },
  );
}

function renderChartInContainer(canvasId, data, granularity) {
  const TRS = window.TimeRangeSystem;
  const config = TRS.GRANULARITY_CONFIG[granularity];
  const labels = data.map((d) => config.formatLabel(new Date(d.date)));

  // Simplified chart config
  const chartConfig = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `Temperatur (${config.label})`,
          data: data.map((d) => d.temp_avg),
          borderColor: "#3b82f6",
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  };

  const charts = getCharts();
  charts.chartManager.create(canvasId, chartConfig);
}

// ============================================
// BEISPIEL 8: State-Management mit Granularität
// ============================================

class GranularityStateManager {
  constructor() {
    this.state = {
      periodA: {
        granularity: "month",
        startDate: null,
        endDate: null,
        data: null,
      },
      periodB: {
        granularity: "month",
        startDate: null,
        endDate: null,
        data: null,
      },
    };
  }

  async setGranularity(period, granularity) {
    this.state[period].granularity = granularity;

    // Re-aggregate wenn Daten vorhanden
    if (this.state[period].data) {
      const TRS = window.TimeRangeSystem;
      this.state[period].data = TRS.aggregateDataByGranularity(
        this.state[period].rawData,
        granularity,
      );
      await this.updateChart();
    }
  }

  async loadPeriodData(period, startDate, endDate) {
    const rawData = await fetchHistoricalData(startDate, endDate);
    const TRS = window.TimeRangeSystem;
    const granularity = this.state[period].granularity;

    this.state[period] = {
      ...this.state[period],
      startDate,
      endDate,
      rawData,
      data: TRS.aggregateDataByGranularity(rawData, granularity),
    };

    await this.updateChart();
  }

  async updateChart() {
    if (!this.state.periodA.data || !this.state.periodB.data) return;

    // Wähle niedrigste Granularität für faireren Vergleich
    const granularityA = this.state.periodA.granularity;
    const granularityB = this.state.periodB.granularity;
    const granularity = this._lowerGranularity(granularityA, granularityB);

    const charts = getCharts();
    const config = charts.getComparisonChartConfig(
      this.state.periodA.data,
      this.state.periodB.data,
      this.state.periodA.label || "Periode A",
      this.state.periodB.label || "Periode B",
      granularity,
    );

    charts.chartManager.create("comparison-chart", config);
  }

  _lowerGranularity(a, b) {
    const order = ["hour", "day", "week", "month", "year", "decade", "century"];
    return order.indexOf(a) < order.indexOf(b) ? a : b;
  }
}

// Usage:
const stateManager = new GranularityStateManager();
stateManager.loadPeriodData("periodA", "2024-01-01", "2024-12-31");
stateManager.loadPeriodData("periodB", "2023-01-01", "2023-12-31");
stateManager.setGranularity("periodA", "week");

// ============================================
// BEISPIEL 9: Export für Berichte
// ============================================

function exportComparisonReport(dataA, dataB, granularity) {
  const TRS = window.TimeRangeSystem;
  const config = TRS.GRANULARITY_CONFIG[granularity];

  const aggA = TRS.aggregateDataByGranularity(dataA, granularity);
  const aggB = TRS.aggregateDataByGranularity(dataB, granularity);

  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      granularity: granularity,
      granularityLabel: config.label,
    },
    periodA: aggA.map((d) => ({
      date: d.date,
      label: config.formatFull(new Date(d.date)),
      temp_avg: d.temp_avg,
      temp_max: d.temp_max,
      temp_min: d.temp_min,
      precipitation: d.precip_sum,
    })),
    periodB: aggB.map((d) => ({
      date: d.date,
      label: config.formatFull(new Date(d.date)),
      temp_avg: d.temp_avg,
      temp_max: d.temp_max,
      temp_min: d.temp_min,
      precipitation: d.precip_sum,
    })),
    comparison: aggA.map((a, i) => {
      const b = aggB[i];
      return {
        index: i,
        date: a.date,
        temp_diff: b ? (a.temp_avg - b.temp_avg).toFixed(1) : null,
        precip_diff: b ? (a.precip_sum - b.precip_sum).toFixed(1) : null,
      };
    }),
  };

  // Als JSON exportieren
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `weather-comparison-${granularity}-${Date.now()}.json`;
  a.click();
}

// ============================================
// BEISPIEL 10: Real-Time Granularity Switch
// ============================================

function setupRealTimeGranularitySwitcher() {
  const tabs = document.querySelectorAll(".granularity-tab");
  const chart = document.getElementById("comparison-chart");
  let currentData = { dataA: null, dataB: null, labelA: "", labelB: "" };

  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      const granularity = tab.dataset.granularity;

      // Update active state
      tabs.forEach((t) => t.classList.remove("granularity-tab--active"));
      tab.classList.add("granularity-tab--active");

      // Re-render chart with new granularity
      if (currentData.dataA && currentData.dataB) {
        const TRS = window.TimeRangeSystem;
        const aggA = TRS.aggregateDataByGranularity(
          currentData.dataA,
          granularity,
        );
        const aggB = TRS.aggregateDataByGranularity(
          currentData.dataB,
          granularity,
        );

        const charts = getCharts();
        const config = charts.getComparisonChartConfig(
          aggA,
          aggB,
          currentData.labelA,
          currentData.labelB,
          granularity,
        );

        // Destroy old chart
        charts.chartManager.destroy("comparison-chart");

        // Create new one
        charts.chartManager.create("comparison-chart", config);
      }
    });
  });

  // Store data for later use
  window.setComparisonData = (dataA, dataB, labelA, labelB) => {
    currentData = { dataA, dataB, labelA, labelB };
  };
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  setupRealTimeGranularitySwitcher();
});
