/**
 * HistoryStats.js - Statistics & Modal Templates for History Page
 *
 * Handles all statistics calculations, insights generation,
 * and modal content rendering for the history feature.
 *
 * MetricCard Design: Matches Health-Page styling for visual consistency.
 * GOLDENE REGEL: All modals use Glass-Tokens und Swift-Easing.
 *
 * @module ui/history/components/HistoryStats
 * @version 1.1.0
 */
(function (global) {
  "use strict";

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
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
    MONTH_LABELS_DE: [
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
    ],
  };

  // ============================================
  // METRIC CARD TEMPLATES (Health-Page Parity)
  // ============================================

  /**
   * Generate a MetricCard matching the Health-Page design
   * @param {Object} options - Card configuration
   * @returns {string} - HTML string
   */
  function renderMetricCard(options) {
    const {
      icon,
      label,
      value,
      unit = "",
      trend = null, // 'up', 'down', or null
      trendValue = null, // e.g., '+2.3°'
      subtitle = null,
      colorClass = "", // e.g., 'metric-card--warm', 'metric-card--cold'
      onClick = null, // data attribute for click handler
    } = options;

    const trendHTML = trend
      ? `
      <span class="metric-card__trend metric-card__trend--${trend}">
        <span class="material-symbols-outlined">${trend === "up" ? "trending_up" : "trending_down"}</span>
        ${trendValue || ""}
      </span>
    `
      : "";

    const subtitleHTML = subtitle
      ? `
      <span class="metric-card__subtitle">${subtitle}</span>
    `
      : "";

    const clickAttr = onClick ? `data-action="${onClick}"` : "";
    const clickableClass = onClick ? "metric-card--clickable" : "";

    return `
      <div class="metric-card history-metric-card ${colorClass} ${clickableClass}" ${clickAttr}>
        <div class="metric-card__icon-wrap">
          <span class="material-symbols-outlined">${icon}</span>
        </div>
        <div class="metric-card__content">
          <span class="metric-card__label">${label}</span>
          <span class="metric-card__value">${value}<span class="metric-card__unit">${unit}</span></span>
          ${subtitleHTML}
          ${trendHTML}
        </div>
      </div>
    `;
  }

  /**
   * Generate a grid of statistics cards from calculated stats
   * Uses MetricCard design from Health-Page
   * Nutzt integrierte Trend-Daten wenn vorhanden
   */
  function renderStatsGrid(stats, comparisonStats = null, month = 0) {
    if (!stats)
      return '<div class="stats-grid--empty">Keine Daten verfügbar</div>';

    const normals =
      CONFIG.CLIMATE_NORMALS[CONFIG.MONTH_NAMES[month]] ||
      CONFIG.CLIMATE_NORMALS.january;

    // Trend-Formatierung: Nutze integrierte Trends (Vorwoche) oder Vergleichsperiode
    const formatTrendFromStats = (trendObj, unit = "") => {
      if (!trendObj?.percent && trendObj?.percent !== 0) {
        return { trend: null, value: null };
      }
      const prefix = trendObj.percent > 0 ? "+" : "";
      return {
        trend:
          trendObj.direction === "up"
            ? "up"
            : trendObj.direction === "down"
              ? "down"
              : null,
        value: `${prefix}${trendObj.percent}%`,
      };
    };

    // Fallback: Berechne Trend aus Vergleichsperiode (legacy)
    const calcTrend = (current, previous) => {
      if (previous === null || current === null)
        return { trend: null, value: null };
      const diff = current - previous;
      return {
        trend: diff > 0 ? "up" : diff < 0 ? "down" : null,
        value: diff !== 0 ? (diff > 0 ? "+" : "") + diff.toFixed(1) : null,
      };
    };

    // Priorisiere integrierte Trends (Vorwoche), fallback auf comparisonStats
    const tempTrend = stats.trends?.temperature
      ? formatTrendFromStats(stats.trends.temperature)
      : comparisonStats
        ? calcTrend(stats.avgTemp, comparisonStats.avgTemp)
        : {};

    const precipTrend = stats.trends?.precipitation
      ? formatTrendFromStats(stats.trends.precipitation)
      : comparisonStats
        ? calcTrend(stats.totalPrecip, comparisonStats.totalPrecip)
        : {};

    const windTrend = stats.trends?.wind
      ? formatTrendFromStats(stats.trends.wind)
      : {};

    const sunshineTrend = stats.trends?.sunshine
      ? formatTrendFromStats(stats.trends.sunshine)
      : {};

    // Temperature anomaly color
    const tempAnomaly =
      stats.avgTemp !== null ? stats.avgTemp - normals.avgTemp : 0;
    const tempColorClass =
      tempAnomaly > 2
        ? "metric-card--warm"
        : tempAnomaly < -2
          ? "metric-card--cold"
          : "";

    // Trend-Subtitle: Zeige Vorwochen-Vergleich wenn verfügbar
    const getTrendSubtitle = (trendObj, baseSubtitle) => {
      if (!trendObj?.raw && trendObj?.raw !== 0) return baseSubtitle;
      const prefix = trendObj.raw > 0 ? "+" : "";
      return `${baseSubtitle} (${prefix}${trendObj.raw.toFixed(1)} vs. Vorwoche)`;
    };

    const cards = [
      renderMetricCard({
        icon: "device_thermostat",
        label: "Durchschnitt",
        value: stats.avgTemp?.toFixed(1) ?? "–",
        unit: "°C",
        colorClass: tempColorClass,
        trend: tempTrend.trend,
        trendValue: tempTrend.value,
        subtitle: getTrendSubtitle(
          stats.trends?.temperature,
          `Klimamittel: ${normals.avgTemp.toFixed(1)}°`,
        ),
      }),
      renderMetricCard({
        icon: "thermostat_auto",
        label: "Max / Min",
        value: `${stats.maxTemp?.toFixed(1) ?? "–"} / ${stats.minTemp?.toFixed(1) ?? "–"}`,
        unit: "°C",
        subtitle: `Spanne: ${stats.tempRange?.toFixed(1) ?? "–"}°`,
      }),
      renderMetricCard({
        icon: "water_drop",
        label: "Niederschlag",
        value: stats.totalPrecip?.toFixed(1) ?? "0",
        unit: " mm",
        trend: precipTrend.trend,
        trendValue: precipTrend.value,
        subtitle: `${stats.rainDays} Regentage`,
      }),
      renderMetricCard({
        icon: "air",
        label: "Windspitze",
        value: stats.maxWind?.toFixed(0) ?? "–",
        unit: " km/h",
        trend: windTrend.trend,
        trendValue: windTrend.value,
        subtitle: `Ø ${stats.avgWind?.toFixed(1) ?? "–"} km/h`,
      }),
      renderMetricCard({
        icon: "wb_sunny",
        label: "Sonnenstunden",
        value: stats.totalSunshine?.toFixed(0) ?? "0",
        unit: " h",
        trend: sunshineTrend.trend,
        trendValue: sunshineTrend.value,
        subtitle: `${stats.sunnyDays} sonnige Tage`,
      }),
      renderMetricCard({
        icon: "ac_unit",
        label: "Frosttage",
        value: stats.frostDays,
        unit: "",
        colorClass: stats.frostDays > 10 ? "metric-card--cold" : "",
        subtitle: `${stats.iceDays} Eistage`,
      }),
    ];

    return `
      <div class="history-stats-grid">
        ${cards.join("")}
      </div>
    `;
  }

  /**
   * Render extremes timeline with clickable cards
   */
  function renderExtremesTimeline(extremes, onClick = "open-extreme") {
    if (!extremes)
      return '<div class="extremes-timeline--empty">Keine Extremwerte gefunden</div>';

    const formatExtreme = (data, type, icon, title, valueExtractor) => {
      if (!data) return null;
      const date = new Date(data.date);
      const value = valueExtractor(data);

      return {
        type,
        icon,
        title,
        value,
        date: data.date,
        dateFormatted: date.toLocaleDateString("de-DE", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        data,
      };
    };

    const items = [
      formatExtreme(
        extremes.hottestDay,
        "hot",
        "local_fire_department",
        "Heißester Tag",
        (d) => `${d.temp_max?.toFixed(1) ?? "–"}°C`,
      ),
      formatExtreme(
        extremes.coldestDay,
        "cold",
        "ac_unit",
        "Kältester Tag",
        (d) => `${d.temp_min?.toFixed(1) ?? "–"}°C`,
      ),
      formatExtreme(
        extremes.wettestDay,
        "rain",
        "rainy",
        "Nassester Tag",
        (d) => `${d.precip?.toFixed(1) ?? "0"} mm`,
      ),
      formatExtreme(
        extremes.windiestDay,
        "wind",
        "storm",
        "Stürmischster Tag",
        (d) => `${d.wind_speed?.toFixed(0) ?? "–"} km/h`,
      ),
    ].filter(Boolean);

    return `
      <div class="history-extremes-timeline">
        ${items
          .map(
            (item, index) => `
          <button class="extreme-card" data-action="${onClick}" data-extreme-type="${item.type}" data-extreme-date="${item.date}">
            <div class="extreme-card__timeline">
              <div class="extreme-card__dot extreme-card__dot--${item.type}">
                <span class="material-symbols-outlined">${item.icon}</span>
              </div>
              ${index < items.length - 1 ? '<div class="extreme-card__line"></div>' : ""}
            </div>
            <div class="extreme-card__content">
              <span class="extreme-card__title">${item.title}</span>
              <span class="extreme-card__value">${item.value}</span>
              <span class="extreme-card__date">${item.dateFormatted}</span>
            </div>
            <span class="extreme-card__arrow material-symbols-outlined">chevron_right</span>
          </button>
        `,
          )
          .join("")}
      </div>
    `;
  }

  // ============================================
  // STATISTICS CALCULATIONS (Non-Blocking)
  // ============================================

  /**
   * Partitionierte Berechnung für große Datenmengen.
   * Verarbeitet Chunks via requestIdleCallback / setTimeout-Fallback.
   * @private
   */
  const CHUNK_SIZE = 100; // Datenpunkte pro Iteration
  const IDLE_TIMEOUT = 16; // ~60fps Budget

  /**
   * Scheduler für non-blocking Operationen
   * Nutzt requestIdleCallback wenn verfügbar, sonst setTimeout
   * @private
   */
  function scheduleTask(callback) {
    if (typeof requestIdleCallback === "function") {
      return requestIdleCallback(callback, { timeout: 50 });
    }
    return setTimeout(callback, 0);
  }

  /**
   * Berechnet Summe/Avg partitioniert über Chunks
   * @private
   */
  function processChunked(arr, extractor, operation = "sum") {
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < arr.length; i++) {
      const val = extractor(arr[i]);
      if (val !== null && val !== undefined && !Number.isNaN(val)) {
        sum += val;
        count++;
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }

    if (count === 0)
      return { sum: 0, avg: null, min: null, max: null, count: 0 };

    return {
      sum,
      avg: sum / count,
      min: min === Infinity ? null : min,
      max: max === -Infinity ? null : max,
      count,
    };
  }

  /**
   * Zählt Einträge die Prädikat erfüllen
   * @private
   */
  function countMatching(arr, predicate) {
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i])) count++;
    }
    return count;
  }

  /**
   * Splittet Daten in aktuelle Woche und Vorwoche
   * @private
   */
  function splitByWeek(data) {
    if (!data?.length) return { current: [], previous: [] };

    // Sortiere nach Datum (neueste zuerst)
    const sorted = [...data].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );

    const now = new Date(sorted[0]?.date || Date.now());
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const current = [];
    const previous = [];

    for (const entry of sorted) {
      const entryDate = new Date(entry.date);
      if (entryDate >= oneWeekAgo) {
        current.push(entry);
      } else if (entryDate >= twoWeeksAgo) {
        previous.push(entry);
      }
    }

    return { current, previous };
  }

  /**
   * Berechnet Trend in Prozent (Vgl. Vorwoche)
   * @param {number|null} current - Aktueller Wert
   * @param {number|null} previous - Vorwochenwert
   * @returns {Object} Trend-Objekt mit percent, direction, raw
   */
  function calculateTrend(current, previous) {
    if (current === null || previous === null || previous === 0) {
      return { percent: null, direction: "stable", raw: null };
    }

    const diff = current - previous;
    const percent = (diff / Math.abs(previous)) * 100;

    return {
      percent: Number(percent.toFixed(1)),
      direction: diff > 0.5 ? "up" : diff < -0.5 ? "down" : "stable",
      raw: Number(diff.toFixed(2)),
    };
  }

  /**
   * Calculate comprehensive statistics from weather data
   * Synchrone Version für kleine Datenmengen (<100 Einträge)
   */
  function calculateStats(data) {
    if (!data || data.length === 0) return getEmptyStats();

    // Für große Datenmengen async verwenden
    if (data.length > 365) {
      console.warn(
        "[HistoryStats] Large dataset detected. Consider using calculateStatsAsync().",
      );
    }

    // Validierung in einem Durchlauf (Single-Pass)
    const temps = processChunked(data, (d) => d?.temp_avg);
    const minTemps = processChunked(data, (d) => d?.temp_min);
    const maxTemps = processChunked(data, (d) => d?.temp_max);
    const precip = processChunked(data, (d) => d?.precip);
    const wind = processChunked(data, (d) => d?.wind_speed);
    const humidity = processChunked(data, (d) => d?.humidity);
    const sunshine = processChunked(data, (d) => d?.sunshine);

    // Trend-Berechnung (Vorwoche vs. aktuelle Woche)
    const { current: currentWeek, previous: prevWeek } = splitByWeek(data);
    const currentWeekStats =
      currentWeek.length > 0 ? calculateWeekStats(currentWeek) : null;
    const prevWeekStats =
      prevWeek.length > 0 ? calculateWeekStats(prevWeek) : null;

    const trends = {
      temperature: calculateTrend(
        currentWeekStats?.avgTemp,
        prevWeekStats?.avgTemp,
      ),
      precipitation: calculateTrend(
        currentWeekStats?.totalPrecip,
        prevWeekStats?.totalPrecip,
      ),
      wind: calculateTrend(currentWeekStats?.avgWind, prevWeekStats?.avgWind),
      sunshine: calculateTrend(
        currentWeekStats?.totalSunshine,
        prevWeekStats?.totalSunshine,
      ),
      humidity: calculateTrend(
        currentWeekStats?.avgHumidity,
        prevWeekStats?.avgHumidity,
      ),
    };

    return {
      // Temperature stats
      avgTemp: temps.avg,
      maxTemp: maxTemps.max,
      minTemp: minTemps.min,
      tempRange:
        maxTemps.max !== null && minTemps.min !== null
          ? maxTemps.max - minTemps.min
          : null,

      // Frost analysis (Single-Pass Counting)
      frostDays: countMatching(
        data,
        (d) => d?.temp_min !== null && d.temp_min < 0,
      ),
      iceDays: countMatching(
        data,
        (d) => d?.temp_max !== null && d.temp_max < 0,
      ),
      tropicalNights: countMatching(
        data,
        (d) => d?.temp_min !== null && d.temp_min >= 20,
      ),
      hotDays: countMatching(
        data,
        (d) => d?.temp_max !== null && d.temp_max >= 30,
      ),
      summerDays: countMatching(
        data,
        (d) => d?.temp_max !== null && d.temp_max >= 25,
      ),

      // Precipitation stats
      totalPrecip: precip.sum,
      avgPrecip: precip.avg ?? 0,
      maxPrecip: precip.max ?? 0,
      rainDays: countMatching(
        data,
        (d) => d?.precip !== null && d.precip >= 0.1,
      ),
      heavyRainDays: countMatching(
        data,
        (d) => d?.precip !== null && d.precip >= 10,
      ),
      dryDays: countMatching(data, (d) => d?.precip === null || d.precip < 0.1),

      // Wind stats
      avgWind: wind.avg ?? 0,
      maxWind: wind.max ?? 0,
      stormDays: countMatching(
        data,
        (d) => d?.wind_speed !== null && d.wind_speed >= 62,
      ),
      windyDays: countMatching(
        data,
        (d) => d?.wind_speed !== null && d.wind_speed >= 39,
      ),
      calmDays: countMatching(
        data,
        (d) => d?.wind_speed !== null && d.wind_speed < 12,
      ),

      // Humidity stats
      avgHumidity: humidity.avg,
      maxHumidity: humidity.max,
      minHumidity: humidity.min,
      humidDays: countMatching(
        data,
        (d) => d?.humidity !== null && d.humidity >= 85,
      ),

      // Sunshine stats
      totalSunshine: sunshine.sum,
      avgSunshine: sunshine.avg ?? 0,
      maxSunshine: sunshine.max ?? 0,
      cloudyDays: countMatching(
        data,
        (d) => d?.sunshine !== null && d.sunshine < 1,
      ),
      sunnyDays: countMatching(
        data,
        (d) => d?.sunshine !== null && d.sunshine >= 8,
      ),

      // Meta
      totalDays: data.length,
      dataQuality: temps.count / data.length,

      // === NEU: Trends (Vgl. Vorwoche) ===
      trends,
      weekComparison: {
        currentWeek: currentWeekStats,
        previousWeek: prevWeekStats,
        daysInCurrentWeek: currentWeek.length,
        daysInPreviousWeek: prevWeek.length,
      },
    };
  }

  /**
   * Schnelle Wochen-Statistik für Trend-Berechnung
   * @private
   */
  function calculateWeekStats(weekData) {
    if (!weekData?.length) return null;

    const temps = processChunked(weekData, (d) => d?.temp_avg);
    const precip = processChunked(weekData, (d) => d?.precip);
    const wind = processChunked(weekData, (d) => d?.wind_speed);
    const sunshine = processChunked(weekData, (d) => d?.sunshine);
    const humidity = processChunked(weekData, (d) => d?.humidity);

    return {
      avgTemp: temps.avg,
      totalPrecip: precip.sum,
      avgWind: wind.avg,
      totalSunshine: sunshine.sum,
      avgHumidity: humidity.avg,
      days: weekData.length,
    };
  }

  /**
   * Asynchrone Statistik-Berechnung für große Datenmengen (>100 Tage).
   * Nutzt partitionierte Verarbeitung um UI nicht zu blockieren.
   *
   * @param {Array} data - Wetterdaten-Array
   * @param {Function} onProgress - Optional: Progress-Callback (0-100)
   * @returns {Promise<Object>} Stats-Objekt
   */
  function calculateStatsAsync(data, onProgress = null) {
    return new Promise((resolve) => {
      if (!data || data.length === 0) {
        resolve(getEmptyStats());
        return;
      }

      // Für kleine Datenmengen synchron berechnen
      if (data.length <= CHUNK_SIZE) {
        resolve(calculateStats(data));
        return;
      }

      // Partitionierte Berechnung
      const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
      let processedChunks = 0;

      // Akkumulatoren für Single-Pass
      const accum = {
        tempSum: 0,
        tempCount: 0,
        tempMin: Infinity,
        tempMax: -Infinity,
        minTempMin: Infinity,
        maxTempMax: -Infinity,
        precipSum: 0,
        precipMax: 0,
        windSum: 0,
        windCount: 0,
        windMax: 0,
        humiditySum: 0,
        humidityCount: 0,
        humidityMin: Infinity,
        humidityMax: -Infinity,
        sunshineSum: 0,
        sunshineCount: 0,
        sunshineMax: 0,
        // Counters
        frostDays: 0,
        iceDays: 0,
        tropicalNights: 0,
        hotDays: 0,
        summerDays: 0,
        rainDays: 0,
        heavyRainDays: 0,
        dryDays: 0,
        stormDays: 0,
        windyDays: 0,
        calmDays: 0,
        humidDays: 0,
        cloudyDays: 0,
        sunnyDays: 0,
      };

      function processChunk(startIdx) {
        const endIdx = Math.min(startIdx + CHUNK_SIZE, data.length);

        for (let i = startIdx; i < endIdx; i++) {
          const d = data[i];
          if (!d) continue;

          // Temperature
          if (d.temp_avg !== null && d.temp_avg !== undefined) {
            accum.tempSum += d.temp_avg;
            accum.tempCount++;
          }
          if (d.temp_min !== null && d.temp_min !== undefined) {
            if (d.temp_min < accum.minTempMin) accum.minTempMin = d.temp_min;
            if (d.temp_min < 0) accum.frostDays++;
            if (d.temp_min >= 20) accum.tropicalNights++;
          }
          if (d.temp_max !== null && d.temp_max !== undefined) {
            if (d.temp_max > accum.maxTempMax) accum.maxTempMax = d.temp_max;
            if (d.temp_max < 0) accum.iceDays++;
            if (d.temp_max >= 30) accum.hotDays++;
            if (d.temp_max >= 25) accum.summerDays++;
          }

          // Precipitation
          if (d.precip !== null && d.precip !== undefined) {
            accum.precipSum += d.precip;
            if (d.precip > accum.precipMax) accum.precipMax = d.precip;
            if (d.precip >= 0.1) accum.rainDays++;
            if (d.precip >= 10) accum.heavyRainDays++;
            if (d.precip < 0.1) accum.dryDays++;
          } else {
            accum.dryDays++;
          }

          // Wind
          if (d.wind_speed !== null && d.wind_speed !== undefined) {
            accum.windSum += d.wind_speed;
            accum.windCount++;
            if (d.wind_speed > accum.windMax) accum.windMax = d.wind_speed;
            if (d.wind_speed >= 62) accum.stormDays++;
            if (d.wind_speed >= 39) accum.windyDays++;
            if (d.wind_speed < 12) accum.calmDays++;
          }

          // Humidity
          if (d.humidity !== null && d.humidity !== undefined) {
            accum.humiditySum += d.humidity;
            accum.humidityCount++;
            if (d.humidity < accum.humidityMin) accum.humidityMin = d.humidity;
            if (d.humidity > accum.humidityMax) accum.humidityMax = d.humidity;
            if (d.humidity >= 85) accum.humidDays++;
          }

          // Sunshine
          if (d.sunshine !== null && d.sunshine !== undefined) {
            accum.sunshineSum += d.sunshine;
            accum.sunshineCount++;
            if (d.sunshine > accum.sunshineMax) accum.sunshineMax = d.sunshine;
            if (d.sunshine < 1) accum.cloudyDays++;
            if (d.sunshine >= 8) accum.sunnyDays++;
          }
        }

        processedChunks++;

        // Progress callback
        if (typeof onProgress === "function") {
          onProgress(Math.round((processedChunks / totalChunks) * 100));
        }

        // Nächsten Chunk schedulen oder Ergebnis zurückgeben
        if (endIdx < data.length) {
          scheduleTask(() => processChunk(endIdx));
        } else {
          // Fertig - Ergebnis zusammenstellen
          const { current: currentWeek, previous: prevWeek } =
            splitByWeek(data);
          const currentWeekStats =
            currentWeek.length > 0 ? calculateWeekStats(currentWeek) : null;
          const prevWeekStats =
            prevWeek.length > 0 ? calculateWeekStats(prevWeek) : null;

          const trends = {
            temperature: calculateTrend(
              currentWeekStats?.avgTemp,
              prevWeekStats?.avgTemp,
            ),
            precipitation: calculateTrend(
              currentWeekStats?.totalPrecip,
              prevWeekStats?.totalPrecip,
            ),
            wind: calculateTrend(
              currentWeekStats?.avgWind,
              prevWeekStats?.avgWind,
            ),
            sunshine: calculateTrend(
              currentWeekStats?.totalSunshine,
              prevWeekStats?.totalSunshine,
            ),
            humidity: calculateTrend(
              currentWeekStats?.avgHumidity,
              prevWeekStats?.avgHumidity,
            ),
          };

          resolve({
            avgTemp:
              accum.tempCount > 0 ? accum.tempSum / accum.tempCount : null,
            maxTemp: accum.maxTempMax === -Infinity ? null : accum.maxTempMax,
            minTemp: accum.minTempMin === Infinity ? null : accum.minTempMin,
            tempRange:
              accum.maxTempMax !== -Infinity && accum.minTempMin !== Infinity
                ? accum.maxTempMax - accum.minTempMin
                : null,
            frostDays: accum.frostDays,
            iceDays: accum.iceDays,
            tropicalNights: accum.tropicalNights,
            hotDays: accum.hotDays,
            summerDays: accum.summerDays,
            totalPrecip: accum.precipSum,
            avgPrecip: accum.rainDays > 0 ? accum.precipSum / data.length : 0,
            maxPrecip: accum.precipMax,
            rainDays: accum.rainDays,
            heavyRainDays: accum.heavyRainDays,
            dryDays: accum.dryDays,
            avgWind: accum.windCount > 0 ? accum.windSum / accum.windCount : 0,
            maxWind: accum.windMax,
            stormDays: accum.stormDays,
            windyDays: accum.windyDays,
            calmDays: accum.calmDays,
            avgHumidity:
              accum.humidityCount > 0
                ? accum.humiditySum / accum.humidityCount
                : null,
            maxHumidity:
              accum.humidityMax === -Infinity ? null : accum.humidityMax,
            minHumidity:
              accum.humidityMin === Infinity ? null : accum.humidityMin,
            humidDays: accum.humidDays,
            totalSunshine: accum.sunshineSum,
            avgSunshine:
              accum.sunshineCount > 0
                ? accum.sunshineSum / accum.sunshineCount
                : 0,
            maxSunshine: accum.sunshineMax,
            cloudyDays: accum.cloudyDays,
            sunnyDays: accum.sunnyDays,
            totalDays: data.length,
            dataQuality: accum.tempCount / data.length,
            trends,
            weekComparison: {
              currentWeek: currentWeekStats,
              previousWeek: prevWeekStats,
              daysInCurrentWeek: currentWeek.length,
              daysInPreviousWeek: prevWeek.length,
            },
          });
        }
      }

      // Start processing
      scheduleTask(() => processChunk(0));
    });
  }

  /**
   * Web Worker Code als Blob-URL (für echtes Offloading)
   * Wird nur bei Bedarf initialisiert
   * @private
   */
  let _statsWorker = null;

  function getStatsWorker() {
    if (_statsWorker) return _statsWorker;

    const workerCode = `
      self.onmessage = function(e) {
        const { data, id } = e.data;
        if (!data || !Array.isArray(data)) {
          self.postMessage({ id, error: 'Invalid data' });
          return;
        }

        try {
          const stats = calculateStatsSync(data);
          self.postMessage({ id, stats });
        } catch (err) {
          self.postMessage({ id, error: err.message });
        }
      };

      function calculateStatsSync(data) {
        // Inline-Version der Statistik-Berechnung
        const accum = {
          tempSum: 0, tempCount: 0, minTempMin: Infinity, maxTempMax: -Infinity,
          precipSum: 0, precipMax: 0, windSum: 0, windCount: 0, windMax: 0,
          humiditySum: 0, humidityCount: 0, humidityMin: Infinity, humidityMax: -Infinity,
          sunshineSum: 0, sunshineCount: 0, sunshineMax: 0,
          frostDays: 0, iceDays: 0, tropicalNights: 0, hotDays: 0, summerDays: 0,
          rainDays: 0, heavyRainDays: 0, dryDays: 0, stormDays: 0, windyDays: 0,
          calmDays: 0, humidDays: 0, cloudyDays: 0, sunnyDays: 0,
        };

        for (const d of data) {
          if (!d) continue;
          if (d.temp_avg != null) { accum.tempSum += d.temp_avg; accum.tempCount++; }
          if (d.temp_min != null) {
            if (d.temp_min < accum.minTempMin) accum.minTempMin = d.temp_min;
            if (d.temp_min < 0) accum.frostDays++;
            if (d.temp_min >= 20) accum.tropicalNights++;
          }
          if (d.temp_max != null) {
            if (d.temp_max > accum.maxTempMax) accum.maxTempMax = d.temp_max;
            if (d.temp_max < 0) accum.iceDays++;
            if (d.temp_max >= 30) accum.hotDays++;
            if (d.temp_max >= 25) accum.summerDays++;
          }
          if (d.precip != null) {
            accum.precipSum += d.precip;
            if (d.precip > accum.precipMax) accum.precipMax = d.precip;
            if (d.precip >= 0.1) accum.rainDays++;
            if (d.precip >= 10) accum.heavyRainDays++;
            if (d.precip < 0.1) accum.dryDays++;
          } else { accum.dryDays++; }
          if (d.wind_speed != null) {
            accum.windSum += d.wind_speed; accum.windCount++;
            if (d.wind_speed > accum.windMax) accum.windMax = d.wind_speed;
            if (d.wind_speed >= 62) accum.stormDays++;
            if (d.wind_speed >= 39) accum.windyDays++;
            if (d.wind_speed < 12) accum.calmDays++;
          }
          if (d.humidity != null) {
            accum.humiditySum += d.humidity; accum.humidityCount++;
            if (d.humidity < accum.humidityMin) accum.humidityMin = d.humidity;
            if (d.humidity > accum.humidityMax) accum.humidityMax = d.humidity;
            if (d.humidity >= 85) accum.humidDays++;
          }
          if (d.sunshine != null) {
            accum.sunshineSum += d.sunshine; accum.sunshineCount++;
            if (d.sunshine > accum.sunshineMax) accum.sunshineMax = d.sunshine;
            if (d.sunshine < 1) accum.cloudyDays++;
            if (d.sunshine >= 8) accum.sunnyDays++;
          }
        }

        return {
          avgTemp: accum.tempCount > 0 ? accum.tempSum / accum.tempCount : null,
          maxTemp: accum.maxTempMax === -Infinity ? null : accum.maxTempMax,
          minTemp: accum.minTempMin === Infinity ? null : accum.minTempMin,
          tempRange: accum.maxTempMax !== -Infinity && accum.minTempMin !== Infinity
            ? accum.maxTempMax - accum.minTempMin : null,
          frostDays: accum.frostDays, iceDays: accum.iceDays,
          tropicalNights: accum.tropicalNights, hotDays: accum.hotDays,
          summerDays: accum.summerDays, totalPrecip: accum.precipSum,
          avgPrecip: data.length > 0 ? accum.precipSum / data.length : 0,
          maxPrecip: accum.precipMax, rainDays: accum.rainDays,
          heavyRainDays: accum.heavyRainDays, dryDays: accum.dryDays,
          avgWind: accum.windCount > 0 ? accum.windSum / accum.windCount : 0,
          maxWind: accum.windMax, stormDays: accum.stormDays,
          windyDays: accum.windyDays, calmDays: accum.calmDays,
          avgHumidity: accum.humidityCount > 0 ? accum.humiditySum / accum.humidityCount : null,
          maxHumidity: accum.humidityMax === -Infinity ? null : accum.humidityMax,
          minHumidity: accum.humidityMin === Infinity ? null : accum.humidityMin,
          humidDays: accum.humidDays, totalSunshine: accum.sunshineSum,
          avgSunshine: accum.sunshineCount > 0 ? accum.sunshineSum / accum.sunshineCount : 0,
          maxSunshine: accum.sunshineMax, cloudyDays: accum.cloudyDays,
          sunnyDays: accum.sunnyDays, totalDays: data.length,
          dataQuality: accum.tempCount / data.length,
        };
      }
    `;

    try {
      const blob = new Blob([workerCode], { type: "application/javascript" });
      _statsWorker = new Worker(URL.createObjectURL(blob));
    } catch (e) {
      console.warn("[HistoryStats] Web Worker not supported:", e);
      _statsWorker = null;
    }

    return _statsWorker;
  }

  /**
   * Berechnet Statistiken im Web Worker (echtes Offloading)
   * Fallback auf calculateStatsAsync wenn Worker nicht verfügbar
   *
   * @param {Array} data - Wetterdaten
   * @returns {Promise<Object>} Stats-Objekt
   */
  function calculateStatsInWorker(data) {
    return new Promise((resolve, reject) => {
      const worker = getStatsWorker();

      if (!worker) {
        // Fallback auf async Berechnung
        calculateStatsAsync(data).then(resolve).catch(reject);
        return;
      }

      const id = Date.now() + Math.random();

      const handler = (e) => {
        if (e.data?.id !== id) return;
        worker.removeEventListener("message", handler);

        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          // Trend-Berechnung im Main-Thread (braucht Date-Objekte)
          const stats = e.data.stats;
          const { current: currentWeek, previous: prevWeek } =
            splitByWeek(data);
          const currentWeekStats =
            currentWeek.length > 0 ? calculateWeekStats(currentWeek) : null;
          const prevWeekStats =
            prevWeek.length > 0 ? calculateWeekStats(prevWeek) : null;

          stats.trends = {
            temperature: calculateTrend(
              currentWeekStats?.avgTemp,
              prevWeekStats?.avgTemp,
            ),
            precipitation: calculateTrend(
              currentWeekStats?.totalPrecip,
              prevWeekStats?.totalPrecip,
            ),
            wind: calculateTrend(
              currentWeekStats?.avgWind,
              prevWeekStats?.avgWind,
            ),
            sunshine: calculateTrend(
              currentWeekStats?.totalSunshine,
              prevWeekStats?.totalSunshine,
            ),
            humidity: calculateTrend(
              currentWeekStats?.avgHumidity,
              prevWeekStats?.avgHumidity,
            ),
          };
          stats.weekComparison = {
            currentWeek: currentWeekStats,
            previousWeek: prevWeekStats,
            daysInCurrentWeek: currentWeek.length,
            daysInPreviousWeek: prevWeek.length,
          };

          resolve(stats);
        }
      };

      worker.addEventListener("message", handler);
      worker.postMessage({ data, id });

      // Timeout nach 5 Sekunden
      setTimeout(() => {
        worker.removeEventListener("message", handler);
        calculateStatsAsync(data).then(resolve).catch(reject);
      }, 5000);
    });
  }

  /**
   * Get empty stats object
   */
  function getEmptyStats() {
    return {
      avgTemp: null,
      maxTemp: null,
      minTemp: null,
      tempRange: null,
      frostDays: 0,
      iceDays: 0,
      tropicalNights: 0,
      hotDays: 0,
      summerDays: 0,
      totalPrecip: 0,
      avgPrecip: 0,
      maxPrecip: 0,
      rainDays: 0,
      heavyRainDays: 0,
      dryDays: 0,
      avgWind: 0,
      maxWind: 0,
      stormDays: 0,
      windyDays: 0,
      calmDays: 0,
      avgHumidity: null,
      maxHumidity: null,
      minHumidity: null,
      humidDays: 0,
      totalSunshine: 0,
      avgSunshine: 0,
      maxSunshine: 0,
      cloudyDays: 0,
      sunnyDays: 0,
      totalDays: 0,
      dataQuality: 0,
    };
  }

  /**
   * Compare two periods and return detailed comparison
   */
  function comparePeriods(statsA, statsB) {
    const compare = (a, b, unit = "", decimals = 1) => {
      const diff = a !== null && b !== null ? a - b : null;
      const pct = b !== 0 && b !== null ? ((a - b) / Math.abs(b)) * 100 : null;
      return {
        valueA: a,
        valueB: b,
        diff: diff !== null ? Number(diff.toFixed(decimals)) : null,
        percentDiff: pct !== null ? Number(pct.toFixed(1)) : null,
        trend: diff > 0 ? "up" : diff < 0 ? "down" : "stable",
        unit,
      };
    };

    return {
      temperature: {
        avg: compare(statsA.avgTemp, statsB.avgTemp, "°C"),
        max: compare(statsA.maxTemp, statsB.maxTemp, "°C"),
        min: compare(statsA.minTemp, statsB.minTemp, "°C"),
        frostDays: compare(statsA.frostDays, statsB.frostDays, "Tage", 0),
      },
      precipitation: {
        total: compare(statsA.totalPrecip, statsB.totalPrecip, "mm"),
        rainDays: compare(statsA.rainDays, statsB.rainDays, "Tage", 0),
        maxDaily: compare(statsA.maxPrecip, statsB.maxPrecip, "mm"),
      },
      wind: {
        avg: compare(statsA.avgWind, statsB.avgWind, "km/h"),
        max: compare(statsA.maxWind, statsB.maxWind, "km/h"),
        stormDays: compare(statsA.stormDays, statsB.stormDays, "Tage", 0),
      },
      sunshine: {
        total: compare(statsA.totalSunshine, statsB.totalSunshine, "h", 0),
        avg: compare(statsA.avgSunshine, statsB.avgSunshine, "h"),
        sunnyDays: compare(statsA.sunnyDays, statsB.sunnyDays, "Tage", 0),
      },
    };
  }

  // ============================================
  // CLIMATE INSIGHTS ENGINE
  // ============================================

  /**
   * INSIGHT SEVERITY LEVELS
   * Used for card styling and prioritization
   */
  const INSIGHT_SEVERITY = {
    RECORD: 0, // Rekorde (höchste Priorität)
    EXTREME: 1, // Extreme Anomalien (>3°C oder >75%)
    SIGNIFICANT: 2, // Signifikante Anomalien (>2°C oder >50%)
    MODERATE: 3, // Moderate Anomalien (>1.5°C oder >30%)
    NOTABLE: 4, // Bemerkenswerte Muster
    INFO: 5, // Allgemeine Informationen
  };

  /**
   * INSIGHT CATEGORIES
   * For filtering and grouping insights
   */
  const INSIGHT_CATEGORIES = {
    TEMPERATURE: "temperature",
    PRECIPITATION: "precipitation",
    SUNSHINE: "sunshine",
    WIND: "wind",
    RECORD: "record",
    COMPARISON: "comparison",
  };

  /**
   * Generate dynamic insights based on stats and climate normals
   * KASTRIERT: Gibt immer leeres Array zurück
   * NUR NACKTE ZAHLEN - KEIN TEXT-MÜLL
   *
   * @returns {Array} IMMER LEER
   */
  /**
   * KASTRIERT: generateInsights gibt IMMER leeres Array zurück
   * NUR NACKTE ZAHLEN - KEIN TEXT-MÜLL
   */
  function generateInsights(stats, previousStats, month, historicalData) {
    return []; // KOMPLETT ELIMINIERT
  }

  /**
   * KASTRIERT: detectRecords gibt IMMER leeres Array zurück
   */
  function detectRecords(currentStats, historicalData, monthLabel) {
    return []; // KOMPLETT ELIMINIERT
  }

  // ============================================
  // INSIGHT CARD RENDERING - KASTRIERT
  // ============================================

  /**
   * KASTRIERT: renderInsightCard gibt leeren String zurück
   */
  function renderInsightCard(insight, index = 0) {
    return ""; // ELIMINIERT
  }

  /**
   * KASTRIERT: renderInsightsPanel gibt leeren String zurück
   */
  function renderInsightsPanel(insights, periodLabel = "") {
    return ""; // ELIMINIERT - NUR ZAHLEN
  }

  /**
   * KASTRIERT: renderInsightsSkeleton gibt leeren String zurück
   */
  function renderInsightsSkeleton() {
    return ""; // ELIMINIERT
  }

  /**
   * KASTRIERT: hydrateInsights tut nichts
   */
  function hydrateInsights(insights, periodLabel) {
    // ELIMINIERT
  }

  /**
   * Get human-readable label for insight category
   * @private
   */
  function getCategoryLabel(category) {
    const labels = {
      temperature: "Temperatur",
      precipitation: "Niederschlag",
      sunshine: "Sonne",
      wind: "Wind",
      comparison: "Vergleich",
      record: "Rekorde",
    };
    return labels[category] || category;
  }

  /**
   * KASTRIERT: hydrateInsightsContainer tut nichts
   */
  function hydrateInsightsContainer(container, insights, periodLabel) {
    // ELIMINIERT - NUR ZAHLEN
  }

  /**
   * Get human-readable label for insight category
   * @private
   */
  function getCategoryLabel(category) {
    const labels = {
      temperature: "Temperatur",
      precipitation: "Niederschlag",
      sunshine: "Sonnenschein",
      wind: "Wind",
      record: "Rekorde",
      comparison: "Vergleich",
    };
    return labels[category] || category;
  }

  /**
   * Find extremes from dataset
   */
  function findExtremes(data) {
    if (!data || data.length === 0) return null;

    const validTemp = data.filter(
      (d) => d.temp_max !== null && d.temp_min !== null,
    );
    const validPrecip = data.filter((d) => d.precip !== null);
    const validWind = data.filter((d) => d.wind_speed !== null);

    return {
      hottestDay: validTemp.length
        ? validTemp.reduce((max, d) => (d.temp_max > max.temp_max ? d : max))
        : null,
      coldestDay: validTemp.length
        ? validTemp.reduce((min, d) => (d.temp_min < min.temp_min ? d : min))
        : null,
      wettestDay: validPrecip.length
        ? validPrecip.reduce((max, d) => (d.precip > max.precip ? d : max))
        : null,
      windiestDay: validWind.length
        ? validWind.reduce((max, d) =>
            d.wind_speed > max.wind_speed ? d : max,
          )
        : null,
    };
  }

  // ============================================
  // MODAL TEMPLATES
  // ============================================

  /**
   * Render day detail modal content
   * Uses health-glass-bg and health-swift-easing CSS variables
   */
  function renderDayDetailModal(day, metric = "temperature") {
    if (!day) return "";

    const date = new Date(day.date);
    const formattedDate = `${date.getDate()}. ${CONFIG.MONTH_LABELS_DE[date.getMonth()]} ${date.getFullYear()}`;
    const weatherDesc = getWeatherDescription(day);

    return `
      <div class="history-modal__content history-modal__content--day-detail">
        <div class="swipe-handle"></div>
        <button class="history-modal__close" data-action="close" aria-label="Schließen">
          <span class="material-symbols-outlined">close</span>
        </button>

        <header class="day-detail__header">
          <h3>${formattedDate}</h3>
          <p class="day-detail__weather">${weatherDesc}</p>
        </header>

        <div class="day-detail__chart">
          <canvas id="history-day-detail-chart"></canvas>
        </div>

        <div class="day-detail__metrics">
          <div class="day-detail__metric">
            <span class="material-symbols-outlined">device_thermostat</span>
            <div>
              <span class="day-detail__metric-label">Temperatur</span>
              <span class="day-detail__metric-value">${day.temp_min?.toFixed(1) ?? "–"}° / ${day.temp_max?.toFixed(1) ?? "–"}°</span>
            </div>
          </div>
          <div class="day-detail__metric">
            <span class="material-symbols-outlined">water_drop</span>
            <div>
              <span class="day-detail__metric-label">Niederschlag</span>
              <span class="day-detail__metric-value">${day.precip?.toFixed(1) ?? "0"} mm</span>
            </div>
          </div>
          <div class="day-detail__metric">
            <span class="material-symbols-outlined">air</span>
            <div>
              <span class="day-detail__metric-label">Wind</span>
              <span class="day-detail__metric-value">${day.wind_speed ?? "–"} km/h</span>
            </div>
          </div>
          <div class="day-detail__metric">
            <span class="material-symbols-outlined">humidity_percentage</span>
            <div>
              <span class="day-detail__metric-label">Feuchtigkeit</span>
              <span class="day-detail__metric-value">${day.humidity ?? "–"}%</span>
            </div>
          </div>
        </div>

        <div class="day-detail__note">
          <span class="material-symbols-outlined">info</span>
          <p>${getSeasonalNote(day)}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render extreme detail modal content
   */
  function renderExtremeDetailModal(extreme, location) {
    if (!extreme) return "";

    const tempMin = extreme.data?.temp_min?.toFixed?.(1) ?? "–";
    const tempMax = extreme.data?.temp_max?.toFixed?.(1) ?? "–";
    const precip = extreme.data?.precip?.toFixed?.(1) ?? "0";
    const windSpeed = extreme.data?.wind_speed?.toFixed?.(0) ?? "–";
    const humidity = extreme.data?.humidity ?? "–";
    const sunshine = extreme.data?.sunshine?.toFixed?.(1) ?? "–";

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

        <div class="extreme-detail__chart">
          <canvas id="history-extreme-mini-chart"></canvas>
        </div>

        <div class="extreme-detail__metrics">
          <div class="extreme-detail__metric">
            <span class="material-symbols-outlined">device_thermostat</span>
            <div class="extreme-detail__metric-data">
              <span class="extreme-detail__metric-label">Temperatur</span>
              <span class="extreme-detail__metric-value">${tempMin}° / ${tempMax}°C</span>
            </div>
          </div>
          <div class="extreme-detail__metric">
            <span class="material-symbols-outlined">water_drop</span>
            <div class="extreme-detail__metric-data">
              <span class="extreme-detail__metric-label">Niederschlag</span>
              <span class="extreme-detail__metric-value">${precip} mm</span>
            </div>
          </div>
          <div class="extreme-detail__metric">
            <span class="material-symbols-outlined">air</span>
            <div class="extreme-detail__metric-data">
              <span class="extreme-detail__metric-label">Wind</span>
              <span class="extreme-detail__metric-value">${windSpeed} km/h</span>
            </div>
          </div>
          <div class="extreme-detail__metric">
            <span class="material-symbols-outlined">humidity_percentage</span>
            <div class="extreme-detail__metric-data">
              <span class="extreme-detail__metric-label">Feuchtigkeit</span>
              <span class="extreme-detail__metric-value">${humidity}%</span>
            </div>
          </div>
          <div class="extreme-detail__metric">
            <span class="material-symbols-outlined">wb_sunny</span>
            <div class="extreme-detail__metric-data">
              <span class="extreme-detail__metric-label">Sonnenstunden</span>
              <span class="extreme-detail__metric-value">${sunshine} h</span>
            </div>
          </div>
        </div>

        <div class="extreme-detail__note">
          <span class="material-symbols-outlined">info</span>
          <p>${getExtremeNote(extreme)}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render location picker modal
   */
  function renderLocationModal(locations, currentLocation) {
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
              <button class="location-item ${loc.id === currentLocation?.id ? "location-item--active" : ""}" data-location-id="${loc.id}">
                <span class="material-symbols-outlined">${loc.id === "current" ? "my_location" : "location_on"}</span>
                <span class="location-item__name">${loc.name}</span>
                ${loc.id === currentLocation?.id ? '<span class="material-symbols-outlined">check</span>' : ""}
              </button>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render period selector modal
   */
  function renderPeriodSelectorModal(periods, currentPeriod, periodType) {
    return `
      <div class="history-modal__content history-modal__content--period">
        <div class="swipe-handle"></div>
        <header class="history-modal__header">
          <h3>Zeitraum ${periodType} wählen</h3>
        </header>
        <div class="history-modal__body">
          <div class="period-list">
            ${periods
              .map(
                (p) => `
              <button class="period-item ${p.id === currentPeriod ? "period-item--active" : ""}" data-period-id="${p.id}">
                <span class="material-symbols-outlined">calendar_month</span>
                <span class="period-item__name">${p.label}</span>
                ${p.id === currentPeriod ? '<span class="material-symbols-outlined">check</span>' : ""}
              </button>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render info/glossary modal
   */
  function renderInfoModal() {
    return `
      <div class="history-modal__content history-modal__content--info">
        <div class="swipe-handle"></div>
        <button class="history-modal__close" data-action="close" aria-label="Schließen">
          <span class="material-symbols-outlined">close</span>
        </button>
        <header class="history-modal__header">
          <h3>Begriffserklärungen</h3>
        </header>
        <div class="history-modal__body">
          <dl class="info-definitions">
            <dt>Durchschnittstemperatur</dt>
            <dd>Mittelwert aller Tages-Durchschnitte im gewählten Zeitraum.</dd>

            <dt>Klimamittel</dt>
            <dd>Langjähriger Durchschnitt (30 Jahre) für den Standort.</dd>

            <dt>Frosttage</dt>
            <dd>Tage, an denen die Tiefsttemperatur unter 0°C lag.</dd>

            <dt>Eistage</dt>
            <dd>Tage, an denen die Höchsttemperatur unter 0°C blieb.</dd>

            <dt>Hitzewelle</dt>
            <dd>Mindestens 3 aufeinanderfolgende Tage mit Temperaturen über 30°C.</dd>

            <dt>Niederschlag</dt>
            <dd>Gemessene Wassermenge in Millimetern (1mm = 1 Liter/m²).</dd>

            <dt>Sturmtag</dt>
            <dd>Tag mit Windböen über 62 km/h (Beaufort 8+).</dd>
          </dl>
        </div>
      </div>
    `;
  }

  /**
   * Render custom date picker modal
   */
  function renderCustomDateModal(startDate, endDate) {
    const today = new Date().toISOString().split("T")[0];
    return `
      <div class="history-modal__content history-modal__content--custom-date">
        <div class="swipe-handle"></div>
        <button class="history-modal__close" data-action="close" aria-label="Schließen">
          <span class="material-symbols-outlined">close</span>
        </button>
        <header class="history-modal__header">
          <h3>Zeitraum wählen</h3>
        </header>
        <div class="history-modal__body">
          <div class="date-picker-form">
            <div class="date-input-group">
              <label for="history-start-date">Von</label>
              <input type="date" id="history-start-date" value="${startDate || "2025-01-01"}" max="${today}">
            </div>
            <div class="date-input-group">
              <label for="history-end-date">Bis</label>
              <input type="date" id="history-end-date" value="${endDate || today}" max="${today}">
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

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function getWeatherDescription(day) {
    const parts = [];

    if (day.temp_avg < -8) parts.push("Eisig");
    else if (day.temp_avg < -3) parts.push("Sehr kalt");
    else if (day.temp_avg < 2) parts.push("Kalt");
    else if (day.temp_avg < 8) parts.push("Kühl");
    else if (day.temp_avg < 15) parts.push("Mild");
    else if (day.temp_avg < 25) parts.push("Warm");
    else parts.push("Heiß");

    if (day.precip > 5) parts.push("starker Regen");
    else if (day.precip > 2) parts.push("Regen");
    else if (day.precip > 0) parts.push("leichter Niederschlag");

    if (day.wind_speed > 40) parts.push("stürmisch");
    else if (day.wind_speed > 25) parts.push("windig");

    if (day.sunshine > 8) parts.push("sonnig");
    else if (day.sunshine < 1) parts.push("bedeckt");

    return parts.join(", ");
  }

  function getSeasonalNote(day) {
    const month = new Date(day.date).getMonth();
    const temp = day.temp_avg;

    if (month >= 11 || month <= 1) {
      if (temp < -10)
        return "Außergewöhnlich kalter Wintertag – etwa 3°C unter dem saisonalen Durchschnitt.";
      if (temp > 8)
        return "Ungewöhnlich milder Wintertag – deutlich über dem Klimamittel.";
      return "Typische Winterbedingungen für diese Region.";
    }
    if (month >= 5 && month <= 7) {
      if (temp > 35)
        return "Extreme Hitze – Vorsicht vor Dehydrierung und Sonnenstich.";
      if (temp < 18)
        return "Kühler Sommertag – unter dem saisonalen Durchschnitt.";
      return "Normale Sommerverhältnisse.";
    }
    return "Saisonale Verhältnisse.";
  }

  function getExtremeNote(extreme) {
    const notes = {
      hot: "Dieser Tag markiert den heißesten gemessenen Wert im Analysezeitraum. Solche Temperaturen treten statistisch nur an wenigen Tagen pro Jahr auf.",
      cold: "An diesem Tag wurde die niedrigste Temperatur gemessen. Strenger Frost dieser Art ist für mitteleuropäische Winter ungewöhnlich.",
      rain: "Dieser Tag verzeichnete die höchste Niederschlagsmenge. Solche Ereignisse können zu lokalen Überschwemmungen führen.",
      wind: "Die an diesem Tag gemessene Windgeschwindigkeit entspricht Sturmstärke. Schäden an Bäumen und Gebäuden sind möglich.",
    };
    return notes[extreme?.type] || "";
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ============================================
  // SKELETON / PLACEHOLDER RENDERING
  // ============================================

  /**
   * Render initial skeleton placeholders for History page
   * Shows loading state before real data arrives
   *
   * @param {HTMLElement} container - History container element
   */
  function renderInitialSkeletons(container) {
    if (!container) return;

    // Only render if container is empty (first render)
    if (container.innerHTML.trim() !== "") return;

    container.innerHTML = `
      <div class="history-skeleton" role="status" aria-label="Lädt historische Daten...">
        <!-- Header Skeleton -->
        <div class="history-skeleton__header">
          <div class="history-skeleton__location shimmer"></div>
          <div class="history-skeleton__icon shimmer"></div>
        </div>

        <!-- Tab Skeleton -->
        <div class="history-skeleton__tabs">
          <div class="history-skeleton__tab shimmer"></div>
          <div class="history-skeleton__tab shimmer"></div>
          <div class="history-skeleton__tab shimmer"></div>
          <div class="history-skeleton__tab shimmer"></div>
        </div>

        <!-- Stats Cards Skeleton -->
        <div class="history-skeleton__stats-grid">
          ${renderSkeletonCard()}
          ${renderSkeletonCard()}
          ${renderSkeletonCard()}
          ${renderSkeletonCard()}
          ${renderSkeletonCard()}
          ${renderSkeletonCard()}
        </div>

        <!-- Chart Skeleton -->
        <div class="history-skeleton__chart-section">
          <div class="history-skeleton__chart-title shimmer"></div>
          <div class="history-skeleton__chart shimmer"></div>
        </div>

        <!-- Insights Skeleton -->
        <div class="history-skeleton__insights">
          <div class="history-skeleton__insight shimmer"></div>
          <div class="history-skeleton__insight shimmer"></div>
          <div class="history-skeleton__insight shimmer"></div>
        </div>
      </div>
    `;
    console.log("⏳ [HistoryStats] Skeleton-Platzhalter gerendert");
  }

  /**
   * Generate a single skeleton card HTML
   */
  function renderSkeletonCard() {
    return `
      <div class="history-skeleton__card">
        <div class="history-skeleton__card-icon shimmer"></div>
        <div class="history-skeleton__card-content">
          <div class="history-skeleton__card-label shimmer"></div>
          <div class="history-skeleton__card-value shimmer"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render placeholder/fallback cards with dummy data
   * Used when API fails or no data available
   */
  function renderFallbackStats() {
    const dummyStats = {
      avgTemp: 2.3,
      maxTemp: 7.5,
      minTemp: -4.2,
      tempRange: 11.7,
      totalPrecip: 38.5,
      rainDays: 12,
      maxWind: 62,
      avgWind: 18.5,
      totalSunshine: 45,
      sunnyDays: 5,
      frostDays: 15,
      iceDays: 3,
    };

    return renderStatsGrid(dummyStats, null, new Date().getMonth());
  }

  // ============================================
  // DATA HYDRATION - Replace Skeletons with Real Data
  // ============================================

  /**
   * Hydrate the stats container - replace skeletons with real MetricCards
   * Called when loadHistoricalData() completes
   *
   * @param {HTMLElement} container - Stats container element
   * @param {Object} stats - Calculated statistics
   * @param {Object} comparisonStats - Previous period stats for trends
   * @param {number} month - Current month (0-11)
   */
  function hydrateStatsContainer(
    container,
    stats,
    comparisonStats = null,
    month = 0,
  ) {
    if (!container || !stats) return;

    const gridContainer =
      container.querySelector(".history-stats-grid") ||
      container.querySelector(".history-skeleton__stats-grid");

    if (!gridContainer) {
      console.warn("[HistoryStats] No stats grid container found");
      return;
    }

    // Get climate normals for anomaly calculation
    const normals =
      CONFIG.CLIMATE_NORMALS[CONFIG.MONTH_NAMES[month]] ||
      CONFIG.CLIMATE_NORMALS.january;

    // Calculate trends vs previous period OR vs climate normals
    const calcTrend = (current, reference, isTemp = false) => {
      if (reference === null || current === null)
        return { trend: null, value: null };
      const diff = current - reference;
      const threshold = isTemp ? 1.0 : 5; // 1°C for temp, 5 for others

      if (Math.abs(diff) < threshold) return { trend: null, value: null };

      return {
        trend: diff > 0 ? "up" : "down",
        value: (diff > 0 ? "+" : "") + diff.toFixed(1),
      };
    };

    // Temperature anomaly (vs climate normal)
    const tempAnomaly =
      stats.avgTemp !== null ? stats.avgTemp - normals.avgTemp : 0;
    const tempTrend = comparisonStats
      ? calcTrend(stats.avgTemp, comparisonStats.avgTemp, true)
      : calcTrend(stats.avgTemp, normals.avgTemp, true);

    // Precipitation trend
    const precipTrend = comparisonStats
      ? calcTrend(stats.totalPrecip, comparisonStats.totalPrecip)
      : calcTrend(stats.totalPrecip, normals.precip);

    // Temperature color classes based on anomaly
    const getTempColorClass = (anomaly) => {
      if (anomaly >= 5) return "metric-card--extreme-warm";
      if (anomaly >= 2) return "metric-card--warm";
      if (anomaly <= -5) return "metric-card--extreme-cold";
      if (anomaly <= -2) return "metric-card--cold";
      return "";
    };

    const tempColorClass = getTempColorClass(tempAnomaly);

    // Build the hydrated cards
    const cards = [
      renderMetricCard({
        icon: "device_thermostat",
        label: "Durchschnitt",
        value: stats.avgTemp?.toFixed(1) ?? "–",
        unit: "°C",
        colorClass: tempColorClass,
        trend: tempTrend.trend,
        trendValue: tempTrend.value ? tempTrend.value + "°" : null,
        subtitle: `Klimamittel: ${normals.avgTemp.toFixed(1)}°`,
        onClick: "show-temp-detail",
      }),
      renderMetricCard({
        icon: "thermostat_auto",
        label: "Max / Min",
        value: `${stats.maxTemp?.toFixed(1) ?? "–"} / ${stats.minTemp?.toFixed(1) ?? "–"}`,
        unit: "°C",
        subtitle: `Spanne: ${stats.tempRange?.toFixed(1) ?? "–"}°`,
        colorClass: stats.tempRange > 20 ? "metric-card--volatile" : "",
      }),
      renderMetricCard({
        icon: "water_drop",
        label: "Niederschlag",
        value: stats.totalPrecip?.toFixed(1) ?? "0",
        unit: " mm",
        trend: precipTrend.trend,
        trendValue: precipTrend.value ? precipTrend.value + " mm" : null,
        subtitle: `${stats.rainDays} Regentage`,
        colorClass:
          stats.totalPrecip > normals.precip * 1.5 ? "metric-card--wet" : "",
      }),
      renderMetricCard({
        icon: "air",
        label: "Windspitze",
        value: stats.maxWind?.toFixed(0) ?? "–",
        unit: " km/h",
        subtitle: `Ø ${stats.avgWind?.toFixed(1) ?? "–"} km/h`,
        colorClass: stats.maxWind >= 62 ? "metric-card--storm" : "",
      }),
      renderMetricCard({
        icon: "wb_sunny",
        label: "Sonnenstunden",
        value: stats.totalSunshine?.toFixed(0) ?? "0",
        unit: " h",
        subtitle: `${stats.sunnyDays} sonnige Tage`,
      }),
      renderMetricCard({
        icon: "ac_unit",
        label: "Frosttage",
        value: stats.frostDays ?? 0,
        unit: "",
        colorClass: stats.frostDays > 10 ? "metric-card--cold" : "",
        subtitle: `${stats.iceDays ?? 0} Eistage`,
      }),
    ];

    // Hydrate with smooth transition
    gridContainer.classList.add("history-stats-grid--hydrating");

    requestAnimationFrame(() => {
      gridContainer.innerHTML = cards.join("");
      gridContainer.className = "history-stats-grid"; // Remove skeleton class

      // Trigger fade-in animation
      requestAnimationFrame(() => {
        gridContainer.classList.add("history-stats-grid--hydrated");
      });
    });

    console.log("✅ [HistoryStats] Stats hydrated with real data");
  }

  // ============================================
  // PUBLIC API
  // ============================================
  global.HistoryStats = {
    // Statistics (synchron für kleine Datenmengen)
    calculateStats,
    getEmptyStats,
    comparePeriods,
    generateInsights,
    findExtremes,

    // Statistics (async für große Datenmengen - non-blocking)
    calculateStatsAsync,
    calculateStatsInWorker,

    // Trend-Utilities
    calculateTrend,
    splitByWeek,

    // MetricCard Templates (Health-Page Parity)
    renderMetricCard,
    renderStatsGrid,
    renderExtremesTimeline,

    // Climate Insights Engine
    renderInsightCard,
    renderInsightsPanel,
    renderInsightsSkeleton,
    hydrateInsightsContainer,
    INSIGHT_SEVERITY,
    INSIGHT_CATEGORIES,

    // Skeleton / Placeholders
    renderInitialSkeletons,
    renderSkeletonCard,
    renderFallbackStats,

    // Data Hydration
    hydrateStatsContainer,

    // Modal templates
    renderDayDetailModal,
    renderExtremeDetailModal,
    renderLocationModal,
    renderPeriodSelectorModal,
    renderInfoModal,
    renderCustomDateModal,

    // Utilities
    getWeatherDescription,
    getSeasonalNote,
    getExtremeNote,
    formatDate,

    // Configuration
    CONFIG,
  };
})(typeof window !== "undefined" ? window : this);
