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
  // MODAL TEMPLATES - METRIK-SPEZIFISCH
  // Jede Metrik bekommt ein individuelles, wertvolles Modal
  // GOLDENE REGEL: design-system.css Variablen nutzen
  // ============================================

  /**
   * METRIK-SPEZIFISCHE MODAL-KONFIGURATIONEN
   * Definiert Farben, Icons, Einheiten und Kontextinformationen pro Metrik
   */
  const METRIC_MODAL_CONFIG = {
    temperature: {
      icon: "device_thermostat",
      title: "Temperaturdetails",
      accentColor: "--ui-accent-amber",
      gradient:
        "linear-gradient(135deg, rgba(251, 191, 36, 0.15), transparent)",
      unit: "°C",
      getContextInfo: (day, normals) => {
        const avg = day.temp_avg ?? (day.temp_min + day.temp_max) / 2;
        const anomaly = avg - (normals?.avgTemp ?? 5);
        if (anomaly > 5)
          return {
            type: "extreme-warm",
            text: `${anomaly.toFixed(1)}° über Klimamittel`,
            icon: "local_fire_department",
          };
        if (anomaly > 2)
          return {
            type: "warm",
            text: `${anomaly.toFixed(1)}° wärmer als normal`,
            icon: "trending_up",
          };
        if (anomaly < -5)
          return {
            type: "extreme-cold",
            text: `${Math.abs(anomaly).toFixed(1)}° unter Klimamittel`,
            icon: "severe_cold",
          };
        if (anomaly < -2)
          return {
            type: "cold",
            text: `${Math.abs(anomaly).toFixed(1)}° kälter als normal`,
            icon: "trending_down",
          };
        return {
          type: "normal",
          text: "Im Normalbereich",
          icon: "check_circle",
        };
      },
      getHealthTip: (day) => {
        if (day.temp_max >= 30)
          return "⚠️ Hitzewarnung: Viel trinken, Mittagshitze meiden";
        if (day.temp_min <= -10)
          return "⚠️ Frostgefahr: Wasserleitungen schützen, warm anziehen";
        if (day.temp_min < 0)
          return "❄️ Frost möglich: Pflanzen schützen, Glättegefahr";
        if (day.temp_max >= 25)
          return "☀️ Sommerlich: Sonnenschutz nicht vergessen";
        return null;
      },
    },
    precipitation: {
      icon: "water_drop",
      title: "Niederschlagsdetails",
      accentColor: "--ui-accent-blue",
      gradient:
        "linear-gradient(135deg, rgba(59, 130, 246, 0.15), transparent)",
      unit: "mm",
      getContextInfo: (day) => {
        const precip = day.precip ?? 0;
        if (precip >= 20)
          return { type: "heavy", text: "Starkregen", icon: "thunderstorm" };
        if (precip >= 10)
          return { type: "moderate", text: "Ergiebiger Regen", icon: "rainy" };
        if (precip >= 2)
          return { type: "light", text: "Leichter Regen", icon: "grain" };
        if (precip > 0)
          return { type: "trace", text: "Nieselregen", icon: "water_drop" };
        return { type: "dry", text: "Trocken", icon: "wb_sunny" };
      },
      getHealthTip: (day) => {
        const precip = day.precip ?? 0;
        if (precip >= 30)
          return "⚠️ Überflutungsgefahr: Keller prüfen, Abflüsse freihalten";
        if (precip >= 15)
          return "🌧️ Starkregen: Regenschirm empfohlen, Aquaplaning möglich";
        if (precip > 0) return "💧 Regenschauer: Jacke mitnehmen";
        return null;
      },
    },
    wind: {
      icon: "air",
      title: "Winddetails",
      accentColor: "--ui-accent-green",
      gradient:
        "linear-gradient(135deg, rgba(74, 222, 128, 0.15), transparent)",
      unit: "km/h",
      getContextInfo: (day) => {
        const wind = day.wind_speed ?? 0;
        if (wind >= 75)
          return { type: "hurricane", text: "Orkan", icon: "cyclone" };
        if (wind >= 62)
          return { type: "storm", text: "Sturm (Beaufort 8+)", icon: "storm" };
        if (wind >= 39)
          return {
            type: "strong",
            text: "Starker Wind (Beaufort 6)",
            icon: "air",
          };
        if (wind >= 20)
          return { type: "moderate", text: "Mäßiger Wind", icon: "air" };
        if (wind >= 12)
          return { type: "light", text: "Leichte Brise", icon: "waves" };
        return { type: "calm", text: "Windstill", icon: "filter_drama" };
      },
      getHealthTip: (day) => {
        const wind = day.wind_speed ?? 0;
        if (wind >= 62)
          return "⚠️ Sturmwarnung: Draußen meiden, Gegenstände sichern";
        if (wind >= 50)
          return "⚠️ Starker Wind: Vorsicht bei Brücken, Bäume meiden";
        if (wind >= 30) return "💨 Böig: Aufpassen beim Radfahren";
        return null;
      },
    },
    humidity: {
      icon: "humidity_percentage",
      title: "Feuchtigkeitsdetails",
      accentColor: "--ui-accent-purple",
      gradient:
        "linear-gradient(135deg, rgba(168, 85, 247, 0.15), transparent)",
      unit: "%",
      getContextInfo: (day) => {
        const humidity = day.humidity ?? 50;
        if (humidity >= 90)
          return { type: "very-humid", text: "Sehr schwül", icon: "water" };
        if (humidity >= 70)
          return { type: "humid", text: "Feucht", icon: "humidity_high" };
        if (humidity >= 40)
          return {
            type: "comfortable",
            text: "Angenehm",
            icon: "sentiment_satisfied",
          };
        if (humidity >= 25)
          return { type: "dry", text: "Trocken", icon: "humidity_low" };
        return { type: "very-dry", text: "Sehr trocken", icon: "warning" };
      },
      getHealthTip: (day) => {
        const humidity = day.humidity ?? 50;
        if (humidity >= 85)
          return "🌡️ Schwüle Luft: Kreislaufprobleme möglich, viel trinken";
        if (humidity < 30)
          return "💨 Trockene Luft: Haut eincremen, ausreichend trinken";
        return null;
      },
    },
    sunshine: {
      icon: "wb_sunny",
      title: "Sonnenscheindetails",
      accentColor: "--ui-accent-amber",
      gradient:
        "linear-gradient(135deg, rgba(255, 210, 111, 0.2), transparent)",
      unit: "h",
      getContextInfo: (day) => {
        const sunshine = day.sunshine ?? 0;
        const percent = (sunshine / 14) * 100; // Max ~14h im Sommer
        if (sunshine >= 10)
          return {
            type: "sunny",
            text: "Strahlend sonnig",
            icon: "light_mode",
          };
        if (sunshine >= 6)
          return {
            type: "partly-sunny",
            text: "Überwiegend sonnig",
            icon: "wb_sunny",
          };
        if (sunshine >= 2)
          return {
            type: "partly-cloudy",
            text: "Wechselhaft",
            icon: "partly_cloudy_day",
          };
        if (sunshine > 0)
          return {
            type: "mostly-cloudy",
            text: "Meist bewölkt",
            icon: "cloud",
          };
        return { type: "overcast", text: "Bedeckt", icon: "filter_drama" };
      },
      getHealthTip: (day) => {
        const sunshine = day.sunshine ?? 0;
        if (sunshine >= 8)
          return "☀️ Sonnig: Sonnenschutz LSF 30+ verwenden, Mittagssonne meiden";
        if (sunshine >= 4)
          return "🌤️ UV-Schutz empfohlen bei längerem Aufenthalt";
        if (sunshine < 1) return "☁️ Wenig Licht: Vitamin D beachten";
        return null;
      },
    },
  };

  /**
   * Render day detail modal content - METRIK-SPEZIFISCH
   * Zeigt kontextrelevante Informationen basierend auf der ausgewählten Metrik
   *
   * @param {Object} day - Tagesdaten (date, temp_min, temp_max, precip, etc.)
   * @param {string} metric - Aktuelle Metrik (temperature, precipitation, wind, humidity, sunshine)
   * @returns {string} HTML für das Modal
   */
  function renderDayDetailModal(day, metric = "temperature") {
    if (!day) return "";

    const date = new Date(day.date);
    const formattedDate = `${date.getDate()}. ${CONFIG.MONTH_LABELS_DE[date.getMonth()]} ${date.getFullYear()}`;
    const weekday = date.toLocaleDateString("de-DE", { weekday: "long" });

    // Hole metrik-spezifische Konfiguration
    const config =
      METRIC_MODAL_CONFIG[metric] || METRIC_MODAL_CONFIG.temperature;
    const monthIdx = date.getMonth();
    const normals =
      CONFIG.CLIMATE_NORMALS[CONFIG.MONTH_NAMES[monthIdx]] ||
      CONFIG.CLIMATE_NORMALS.january;

    // Berechne Kontext-Informationen
    const contextInfo = config.getContextInfo(day, normals);
    const healthTip = config.getHealthTip(day);

    // Primärwert basierend auf Metrik (mit sicheren Berechnungen)
    const getPrimaryValue = () => {
      switch (metric) {
        case "temperature":
          const tempAvg =
            day.temp_avg ??
            (day.temp_min != null && day.temp_max != null
              ? (day.temp_min + day.temp_max) / 2
              : null);
          return tempAvg != null ? `${tempAvg.toFixed(1)}°C` : "–°C";
        case "precipitation":
          return `${day.precip?.toFixed(1) ?? "0"} mm`;
        case "wind":
          return `${day.wind_speed?.toFixed(0) ?? "–"} km/h`;
        case "humidity":
          return `${day.humidity ?? "–"}%`;
        case "sunshine":
          return `${day.sunshine?.toFixed(1) ?? "0"} h`;
        default:
          return "–";
      }
    };

    // Metrik-spezifische Detail-Cards
    const getMetricSpecificCards = () => {
      switch (metric) {
        case "temperature":
          const tempAvgCalc =
            day.temp_avg ??
            (day.temp_min != null && day.temp_max != null
              ? (day.temp_min + day.temp_max) / 2
              : null);
          const tempSpan =
            day.temp_max != null && day.temp_min != null
              ? (day.temp_max - day.temp_min).toFixed(1)
              : "–";
          const anomaly =
            tempAvgCalc != null && normals?.avgTemp != null
              ? (tempAvgCalc - normals.avgTemp).toFixed(1)
              : null;
          return `
            <div class="detail-card">
              <h4 class="detail-card__title">Temperaturverlauf</h4>
              <div class="detail-card__hero">
                <span class="detail-card__value">${tempAvgCalc?.toFixed(1) ?? "–"}°C</span>
                <span class="detail-card__label">Tagesdurchschnitt</span>
              </div>
              <div class="detail-card__row">
                <span>🔺 Maximum</span>
                <span>${day.temp_max?.toFixed(1) ?? "–"}°C</span>
              </div>
              <div class="detail-card__row">
                <span>🔻 Minimum</span>
                <span>${day.temp_min?.toFixed(1) ?? "–"}°C</span>
              </div>
              <div class="detail-card__row">
                <span>📊 Tagesspanne</span>
                <span>${tempSpan}°C</span>
              </div>
              <div class="detail-card__row">
                <span>🌡️ Klimanormal</span>
                <span>${normals.avgTemp.toFixed(1)}°C</span>
              </div>
              ${
                anomaly !== null
                  ? `
              <div class="detail-card__row">
                <span>📈 Abweichung</span>
                <span style="color: ${parseFloat(anomaly) > 0 ? "#fca5a5" : parseFloat(anomaly) < 0 ? "#93c5fd" : "inherit"}">${anomaly > 0 ? "+" : ""}${anomaly}°C</span>
              </div>
              `
                  : ""
              }
            </div>
            ${
              day.temp_min !== null && day.temp_min < 0
                ? `
              <div class="detail-card detail-card--frost">
                <div class="detail-card__row">
                  <span class="material-symbols-outlined">ac_unit</span>
                  <span>Frosttag (Min unter 0°C)</span>
                </div>
              </div>
            `
                : ""
            }
            ${
              day.temp_max !== null && day.temp_max >= 25
                ? `
              <div class="detail-card detail-card--summer">
                <div class="detail-card__row">
                  <span class="material-symbols-outlined">wb_sunny</span>
                  <span>Sommertag (Max ≥ 25°C)</span>
                </div>
              </div>
            `
                : ""
            }
          `;

        case "precipitation":
          const precipIntensity =
            (day.precip ?? 0) > 0
              ? `${((day.precip ?? 0) / 24).toFixed(2)} mm/h Ø`
              : "Kein Niederschlag";
          const precipPercent = normals?.precip
            ? (((day.precip ?? 0) / normals.precip) * 100).toFixed(1)
            : "–";
          const precipPerDay = normals?.precip
            ? (normals.precip / 30).toFixed(1)
            : "–";
          return `
            <div class="detail-card">
              <h4 class="detail-card__title">Niederschlagsanalyse</h4>
              <div class="detail-card__hero">
                <span class="detail-card__value">${day.precip?.toFixed(1) ?? "0"} mm</span>
                <span class="detail-card__label">Tagesniederschlag</span>
              </div>
              <div class="detail-card__row">
                <span>⏱️ Intensität</span>
                <span>${precipIntensity}</span>
              </div>
              <div class="detail-card__row">
                <span>📅 Monatstag Ø</span>
                <span>${precipPerDay} mm/Tag</span>
              </div>
              <div class="detail-card__row">
                <span>💧 Monatssumme</span>
                <span>${normals.precip.toFixed(0)} mm/Monat</span>
              </div>
              <div class="detail-card__row">
                <span>📊 Anteil</span>
                <span>${precipPercent}% des Monats</span>
              </div>
            </div>
            ${
              (day.precip ?? 0) >= 10
                ? `
              <div class="detail-card detail-card--warning">
                <div class="detail-card__warning">
                  <span class="material-symbols-outlined">warning</span>
                  <span>Starkregen-Tag: Über 10 mm Niederschlag</span>
                </div>
              </div>
            `
                : ""
            }
          `;

        case "wind":
          const beaufort = getBeaufortScale(day.wind_speed ?? 0);
          const windPower = (day.wind_speed ?? 0) ** 3 / 100; // Vereinfachte Windenergie-Formel
          return `
            <div class="detail-card">
              <h4 class="detail-card__title">Windanalyse</h4>
              <div class="detail-card__hero">
                <span class="detail-card__value">${day.wind_speed?.toFixed(0) ?? "–"} km/h</span>
                <span class="detail-card__label">Windgeschwindigkeit</span>
              </div>
              <div class="detail-card__row">
                <span>🌬️ Beaufort-Skala</span>
                <span>Bft ${beaufort.scale} - ${beaufort.description}</span>
              </div>
              <div class="detail-card__row">
                <span>🎯 Auswirkung</span>
                <span>${beaufort.effect}</span>
              </div>
              <div class="detail-card__row">
                <span>⚡ Windenergie</span>
                <span>${windPower.toFixed(0)} W/m²</span>
              </div>
            </div>
            ${
              (day.wind_speed ?? 0) >= 62
                ? `
              <div class="detail-card detail-card--warning">
                <div class="detail-card__warning">
                  <span class="material-symbols-outlined">storm</span>
                  <span>Sturmwarnung: Windspitzen ≥ 62 km/h (Beaufort 8+)</span>
                </div>
              </div>
            `
                : (day.wind_speed ?? 0) >= 39
                  ? `
              <div class="detail-card detail-card--info">
                <div class="detail-card__row">
                  <span class="material-symbols-outlined">info</span>
                  <span>Starker Wind: Vorsicht im Freien empfohlen</span>
                </div>
              </div>
            `
                  : ""
            }
          `;

        case "humidity":
          const tempForComfort =
            day.temp_avg ??
            (day.temp_min != null && day.temp_max != null
              ? (day.temp_min + day.temp_max) / 2
              : 15);
          const comfortLevel = getComfortLevel(
            day.humidity ?? 50,
            tempForComfort,
          );
          const isOptimal =
            (day.humidity ?? 50) >= 40 && (day.humidity ?? 50) <= 60;
          return `
            <div class="detail-card">
              <h4 class="detail-card__title">Feuchtigkeitsanalyse</h4>
              <div class="detail-card__hero">
                <span class="detail-card__value">${day.humidity ?? "–"}%</span>
                <span class="detail-card__label">Relative Luftfeuchte</span>
              </div>
              <div class="detail-card__row">
                <span>😊 Komfortlevel</span>
                <span>${comfortLevel.label}${isOptimal ? " ✓" : ""}</span>
              </div>
              <div class="detail-card__row">
                <span>🌡️ Gefühlte Temp.</span>
                <span>${comfortLevel.feelsLike}°C</span>
              </div>
              <div class="detail-card__row">
                <span>💧 Taupunkt</span>
                <span>${comfortLevel.dewPoint.toFixed(1)}°C</span>
              </div>
              <div class="detail-card__row">
                <span>📊 Optimal</span>
                <span>40-60% (Wohn-/Arbeitsräume)</span>
              </div>
            </div>
            ${
              (day.humidity ?? 50) >= 85
                ? `
              <div class="detail-card detail-card--info">
                <div class="detail-card__row">
                  <span class="material-symbols-outlined">info</span>
                  <span>Hohe Luftfeuchtigkeit – Schimmelrisiko, gut lüften</span>
                </div>
              </div>
            `
                : (day.humidity ?? 50) < 30
                  ? `
              <div class="detail-card detail-card--info">
                <div class="detail-card__row">
                  <span class="material-symbols-outlined">info</span>
                  <span>Niedrige Luftfeuchtigkeit – Atemwege können gereizt werden</span>
                </div>
              </div>
            `
                  : ""
            }
          `;

        case "sunshine":
          const maxDaylight = getDaylightHours(date);
          const sunPercent =
            maxDaylight > 0
              ? (((day.sunshine ?? 0) / maxDaylight) * 100).toFixed(0)
              : 0;
          const cloudCover = maxDaylight > 0 ? 100 - parseInt(sunPercent) : 100;
          const monthAvgSun = normals?.sunshine
            ? (normals.sunshine / 30).toFixed(1)
            : "–";
          return `
            <div class="detail-card">
              <h4 class="detail-card__title">Sonnenscheinanalyse</h4>
              <div class="detail-card__hero">
                <span class="detail-card__value">${day.sunshine?.toFixed(1) ?? "0"} h</span>
                <span class="detail-card__label">Sonnenstunden</span>
              </div>
              <div class="detail-card__row">
                <span>🌅 Tageslichtdauer</span>
                <span>${maxDaylight.toFixed(1)} h</span>
              </div>
              <div class="detail-card__row">
                <span>☀️ Sonnenschein</span>
                <span>${sunPercent}% des Tageslichts</span>
              </div>
              <div class="detail-card__row">
                <span>☁️ Bewölkung</span>
                <span>~${cloudCover}%</span>
              </div>
              <div class="detail-card__row">
                <span>📅 Monatsmittel</span>
                <span>${monthAvgSun} h/Tag</span>
              </div>
            </div>
            ${
              (day.sunshine ?? 0) < 1
                ? `
              <div class="detail-card detail-card--cloudy">
                <div class="detail-card__row">
                  <span class="material-symbols-outlined">cloud</span>
                  <span>Bedeckter Tag: Unter 1 Stunde Sonnenschein</span>
                </div>
              </div>
            `
                : ""
            }
          `;

        default:
          return "";
      }
    };

    return `
      <div class="history-modal__content history-modal__content--day-detail history-modal__content--${metric}">
        <button class="history-modal__close" data-action="close" aria-label="Schließen">
          <span class="material-symbols-outlined">close</span>
        </button>

        <!-- Optimierter Header: Von ganz oben, alle Ecken abgerundet -->
        <header class="day-detail__header day-detail__header--${metric}">
          <div class="swipe-handle"></div>
          <div class="day-detail__header-top">
            <span class="material-symbols-outlined day-detail__icon">${config.icon}</span>
            <div class="day-detail__date-info">
              <span class="day-detail__weekday">${weekday}</span>
              <span class="day-detail__date">${formattedDate}</span>
            </div>
          </div>
          <div class="day-detail__context day-detail__context--${contextInfo.type}">
            <span class="material-symbols-outlined">${contextInfo.icon}</span>
            <span>${contextInfo.text}</span>
          </div>
        </header>

        <!-- Metrik-spezifische Detail-Cards -->
        <div class="day-detail__cards">
          ${getMetricSpecificCards()}
        </div>

        <!-- Gesundheitstipp (wenn vorhanden) -->
        ${
          healthTip
            ? `
          <div class="day-detail__health-tip">
            <span class="day-detail__health-tip-text">${healthTip}</span>
          </div>
        `
            : ""
        }

        <!-- Weitere Metriken (Kontext) -->
        <div class="day-detail__other-metrics">
          <h4>Weitere Werte</h4>
          <div class="day-detail__metrics-grid">
            ${
              metric !== "temperature"
                ? `
              <div class="day-detail__metric-item">
                <span class="material-symbols-outlined">device_thermostat</span>
                <div>
                  <span class="label">Temperatur</span>
                  <span class="value">${day.temp_min?.toFixed(1) ?? "–"}° / ${day.temp_max?.toFixed(1) ?? "–"}°</span>
                </div>
              </div>
            `
                : ""
            }
            ${
              metric !== "precipitation"
                ? `
              <div class="day-detail__metric-item">
                <span class="material-symbols-outlined">water_drop</span>
                <div>
                  <span class="label">Niederschlag</span>
                  <span class="value">${day.precip?.toFixed(1) ?? "0"} mm</span>
                </div>
              </div>
            `
                : ""
            }
            ${
              metric !== "wind"
                ? `
              <div class="day-detail__metric-item">
                <span class="material-symbols-outlined">air</span>
                <div>
                  <span class="label">Wind</span>
                  <span class="value">${day.wind_speed?.toFixed(0) ?? "–"} km/h</span>
                </div>
              </div>
            `
                : ""
            }
            ${
              metric !== "humidity"
                ? `
              <div class="day-detail__metric-item">
                <span class="material-symbols-outlined">humidity_percentage</span>
                <div>
                  <span class="label">Feuchtigkeit</span>
                  <span class="value">${day.humidity ?? "–"}%</span>
                </div>
              </div>
            `
                : ""
            }
            ${
              metric !== "sunshine"
                ? `
              <div class="day-detail__metric-item">
                <span class="material-symbols-outlined">wb_sunny</span>
                <div>
                  <span class="label">Sonne</span>
                  <span class="value">${day.sunshine?.toFixed(1) ?? "0"} h</span>
                </div>
              </div>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }

  // ============================================
  // VERGLEICHS-SEKTION MODAL
  // Zeigt Tag-Details mit Vergleich beider Zeiträume
  // ============================================

  /**
   * VERGLEICHS-MODAL KONFIGURATION
   * Für Klicks auf Vergleichs-Charts
   */
  const COMPARISON_MODAL_CONFIG = {
    temperature: {
      icon: "device_thermostat",
      title: "Temperatur-Vergleich",
      unit: "°C",
      gradient:
        "linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(59, 130, 246, 0.08))",
      getValue: (day) =>
        day?.temp_avg ??
        (day?.temp_min != null && day?.temp_max != null
          ? (day.temp_min + day.temp_max) / 2
          : null),
      format: (val) => (val != null ? `${val.toFixed(1)}°C` : "Keine Daten"),
    },
    precipitation: {
      icon: "water_drop",
      title: "Niederschlag-Vergleich",
      unit: "mm",
      gradient:
        "linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(96, 165, 250, 0.08))",
      getValue: (day) => day?.precip ?? null,
      format: (val) => (val != null ? `${val.toFixed(1)} mm` : "Keine Daten"),
    },
    wind: {
      icon: "air",
      title: "Wind-Vergleich",
      unit: "km/h",
      gradient:
        "linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(74, 222, 128, 0.08))",
      getValue: (day) => day?.wind_speed ?? null,
      format: (val) => (val != null ? `${val.toFixed(0)} km/h` : "Keine Daten"),
    },
    humidity: {
      icon: "humidity_percentage",
      title: "Feuchtigkeits-Vergleich",
      unit: "%",
      gradient:
        "linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(192, 132, 252, 0.08))",
      getValue: (day) => day?.humidity ?? null,
      format: (val) => (val != null ? `${val}%` : "Keine Daten"),
    },
    sunshine: {
      icon: "wb_sunny",
      title: "Sonnenschein-Vergleich",
      unit: "h",
      gradient:
        "linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(252, 211, 77, 0.08))",
      getValue: (day) => day?.sunshine ?? null,
      format: (val) => (val != null ? `${val.toFixed(1)} h` : "Keine Daten"),
    },
  };

  /**
   * Render Vergleichs-Modal für einen Tag mit Daten aus beiden Zeiträumen
   * @param {Object} dayA - Tagesdaten Zeitraum A
   * @param {Object} dayB - Tagesdaten Zeitraum B (gleicher Tag des Monats)
   * @param {string} labelA - Label für Zeitraum A (z.B. "Januar 2025")
   * @param {string} labelB - Label für Zeitraum B (z.B. "Januar 2026")
   * @param {string} metric - Aktuelle Metrik (temperature/precipitation)
   */
  function renderComparisonDayModal(
    dayA,
    dayB,
    labelA,
    labelB,
    metric = "temperature",
  ) {
    const config =
      COMPARISON_MODAL_CONFIG[metric] || COMPARISON_MODAL_CONFIG.temperature;

    const dateA = dayA?.date ? new Date(dayA.date) : null;
    const dateB = dayB?.date ? new Date(dayB.date) : null;
    const dayNum = dateA?.getDate() || dateB?.getDate() || "–";

    const valA = config.getValue(dayA);
    const valB = config.getValue(dayB);
    const diff = valA !== null && valB !== null ? valB - valA : null;

    // Bessere Diff-Formatierung
    let diffText = "–";
    if (diff !== null) {
      const absVal = Math.abs(diff);
      const formatted =
        metric === "humidity" ? absVal.toFixed(0) : absVal.toFixed(1);
      diffText = `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${formatted}${config.unit}`;
    }
    const diffClass = diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral";

    // Check ob überhaupt Daten vorhanden
    const hasData = valA !== null || valB !== null;

    return `
      <div class="history-modal__content history-modal__content--comparison">
        <div class="swipe-handle"></div>
        <button class="history-modal__close" data-action="close" aria-label="Schließen">
          <span class="material-symbols-outlined">close</span>
        </button>

        <header class="comparison-modal__header">
          <span class="material-symbols-outlined comparison-modal__icon">${config.icon}</span>
          <div class="comparison-modal__title">
            <h3>${config.title}</h3>
            <span class="comparison-modal__subtitle">Tag ${dayNum}</span>
          </div>
        </header>

        <!-- Vergleichs-Cards -->
        <div class="comparison-modal__cards">
          <div class="comparison-modal__card comparison-modal__card--a ${!dayA ? "comparison-modal__card--empty" : ""}">
            <span class="comparison-modal__card-label">${labelA}</span>
            <span class="comparison-modal__card-value">${config.format(valA)}</span>
            ${
              dayA && valA !== null
                ? `
              <div class="comparison-modal__card-details">
                <span><span class="material-symbols-outlined">device_thermostat</span> ${dayA.temp_min?.toFixed(1) ?? "–"}° / ${dayA.temp_max?.toFixed(1) ?? "–"}°</span>
                <span><span class="material-symbols-outlined">water_drop</span> ${dayA.precip?.toFixed(1) ?? "0"} mm</span>
              </div>
            `
                : '<span class="comparison-modal__no-data"><span class="material-symbols-outlined">calendar_month</span>Keine Daten</span>'
            }
          </div>

          <div class="comparison-modal__diff comparison-modal__diff--${diffClass} ${diff === null ? "comparison-modal__diff--unavailable" : ""}">
            <span class="material-symbols-outlined">${diff !== null ? (diff > 0 ? "arrow_upward" : diff < 0 ? "arrow_downward" : "remove") : "horizontal_rule"}</span>
            <span>${diffText}</span>
          </div>

          <div class="comparison-modal__card comparison-modal__card--b ${!dayB ? "comparison-modal__card--empty" : ""}">
            <span class="comparison-modal__card-label">${labelB}</span>
            <span class="comparison-modal__card-value">${config.format(valB)}</span>
            ${
              dayB && valB !== null
                ? `
              <div class="comparison-modal__card-details">
                <span><span class="material-symbols-outlined">device_thermostat</span> ${dayB.temp_min?.toFixed(1) ?? "–"}° / ${dayB.temp_max?.toFixed(1) ?? "–"}°</span>
                <span><span class="material-symbols-outlined">water_drop</span> ${dayB.precip?.toFixed(1) ?? "0"} mm</span>
              </div>
            `
                : '<span class="comparison-modal__no-data"><span class="material-symbols-outlined">calendar_month</span>Keine Daten</span>'
            }
          </div>
        </div>

        <!-- Interpretation -->
        <div class="comparison-modal__insight">
          <span class="material-symbols-outlined">lightbulb</span>
          <p>${getComparisonInsight(diff, metric, labelA, labelB)}</p>
        </div>

        <!-- Alle Metriken im Vergleich -->
        <div class="comparison-modal__metrics">
          <h4>Detailvergleich</h4>
          <div class="comparison-modal__metrics-table">
            <div class="comparison-modal__metrics-row comparison-modal__metrics-row--header">
              <span>Metrik</span>
              <span>${labelA.split(" ")[0]}</span>
              <span>${labelB.split(" ")[0]}</span>
            </div>
            <div class="comparison-modal__metrics-row">
              <span>Ø Temperatur</span>
              <span>${dayA?.temp_avg?.toFixed(1) ?? "–"}°C</span>
              <span>${dayB?.temp_avg?.toFixed(1) ?? "–"}°C</span>
            </div>
            <div class="comparison-modal__metrics-row">
              <span>Maximum</span>
              <span>${dayA?.temp_max?.toFixed(1) ?? "–"}°C</span>
              <span>${dayB?.temp_max?.toFixed(1) ?? "–"}°C</span>
            </div>
            <div class="comparison-modal__metrics-row">
              <span>Minimum</span>
              <span>${dayA?.temp_min?.toFixed(1) ?? "–"}°C</span>
              <span>${dayB?.temp_min?.toFixed(1) ?? "–"}°C</span>
            </div>
            <div class="comparison-modal__metrics-row">
              <span>Niederschlag</span>
              <span>${dayA?.precip?.toFixed(1) ?? "0"} mm</span>
              <span>${dayB?.precip?.toFixed(1) ?? "0"} mm</span>
            </div>
            <div class="comparison-modal__metrics-row">
              <span>Wind</span>
              <span>${dayA?.wind_speed?.toFixed(0) ?? "–"} km/h</span>
              <span>${dayB?.wind_speed?.toFixed(0) ?? "–"} km/h</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generiert einen Insight-Text für den Vergleich
   */
  function getComparisonInsight(diff, metric, labelA, labelB) {
    if (diff === null)
      return "Für diesen Tag liegen nicht beide Datensätze vor. Ein direkter Vergleich ist daher nicht möglich.";

    const yearA = labelA.match(/\d{4}/)?.[0] || "A";
    const yearB = labelB.match(/\d{4}/)?.[0] || "B";

    if (metric === "temperature") {
      if (Math.abs(diff) < 1)
        return `Die Temperaturen waren in beiden Jahren nahezu identisch.`;
      if (diff > 5)
        return `${yearB} war deutlich wärmer – ${diff.toFixed(1)}°C mehr als ${yearA}. Ein klarer Temperaturanstieg.`;
      if (diff > 2)
        return `${yearB} war spürbar wärmer als ${yearA}. Der Unterschied von ${diff.toFixed(1)}°C ist signifikant.`;
      if (diff < -5)
        return `${yearB} war deutlich kälter – ${Math.abs(diff).toFixed(1)}°C weniger als ${yearA}.`;
      if (diff < -2) return `${yearB} war merklich kühler als ${yearA}.`;
      return `Leichte Temperaturabweichung zwischen den Jahren.`;
    }

    if (metric === "precipitation") {
      if (Math.abs(diff) < 1)
        return `Der Niederschlag war in beiden Jahren sehr ähnlich.`;
      if (diff > 10)
        return `${yearB} war deutlich nasser – ${diff.toFixed(1)} mm mehr Niederschlag.`;
      if (diff > 5) return `${yearB} hatte mehr Regen als ${yearA}.`;
      if (diff < -10) return `${yearB} war deutlich trockener als ${yearA}.`;
      if (diff < -5) return `${yearB} hatte weniger Niederschlag.`;
      return `Geringe Niederschlagsunterschiede zwischen den Jahren.`;
    }

    return "Daten werden verglichen.";
  }

  // ============================================
  // KALENDER-SEKTION MODAL
  // Kompakte Tagesübersicht für Kalender-Klicks
  // ============================================

  /**
   * KALENDER-MODAL KONFIGURATION
   * Je nach aktiver Kalender-Metrik unterschiedliche Darstellung
   */
  const CALENDAR_MODAL_CONFIG = {
    temperature: {
      icon: "device_thermostat",
      title: "Temperatur",
      gradient:
        "linear-gradient(135deg, rgba(251, 191, 36, 0.15), transparent)",
      getHeroValue: (day) =>
        `${day.temp_avg?.toFixed(1) ?? ((day.temp_min + day.temp_max) / 2).toFixed(1)}°`,
      getHeroLabel: "Tagesdurchschnitt",
      getDetailCards: (day) => `
        <div class="calendar-modal__stat">
          <span class="calendar-modal__stat-icon">🔺</span>
          <span class="calendar-modal__stat-value">${day.temp_max?.toFixed(1) ?? "–"}°</span>
          <span class="calendar-modal__stat-label">Maximum</span>
        </div>
        <div class="calendar-modal__stat">
          <span class="calendar-modal__stat-icon">🔻</span>
          <span class="calendar-modal__stat-value">${day.temp_min?.toFixed(1) ?? "–"}°</span>
          <span class="calendar-modal__stat-label">Minimum</span>
        </div>
        <div class="calendar-modal__stat">
          <span class="calendar-modal__stat-icon">📊</span>
          <span class="calendar-modal__stat-value">${((day.temp_max ?? 0) - (day.temp_min ?? 0)).toFixed(1)}°</span>
          <span class="calendar-modal__stat-label">Spanne</span>
        </div>
      `,
      getConditionBadge: (day) => {
        if (day.temp_max >= 30)
          return { class: "hot", text: "Heißer Tag", icon: "🔥" };
        if (day.temp_max >= 25)
          return { class: "warm", text: "Sommertag", icon: "☀️" };
        if (day.temp_min < 0)
          return { class: "frost", text: "Frosttag", icon: "❄️" };
        if (day.temp_max < 10)
          return { class: "cold", text: "Kühler Tag", icon: "🌡️" };
        return { class: "mild", text: "Mild", icon: "🌤️" };
      },
    },
    precipitation: {
      icon: "water_drop",
      title: "Niederschlag",
      gradient:
        "linear-gradient(135deg, rgba(59, 130, 246, 0.15), transparent)",
      getHeroValue: (day) => `${day.precip?.toFixed(1) ?? "0"} mm`,
      getHeroLabel: "Gesamtniederschlag",
      getDetailCards: (day) => {
        const precip = day.precip ?? 0;
        const intensity =
          precip >= 20
            ? "Stark"
            : precip >= 5
              ? "Mäßig"
              : precip > 0
                ? "Leicht"
                : "Kein";
        return `
          <div class="calendar-modal__stat">
            <span class="calendar-modal__stat-icon">💧</span>
            <span class="calendar-modal__stat-value">${intensity}</span>
            <span class="calendar-modal__stat-label">Intensität</span>
          </div>
          <div class="calendar-modal__stat">
            <span class="calendar-modal__stat-icon">💦</span>
            <span class="calendar-modal__stat-value">${day.humidity ?? "–"}%</span>
            <span class="calendar-modal__stat-label">Feuchtigkeit</span>
          </div>
          <div class="calendar-modal__stat">
            <span class="calendar-modal__stat-icon">🌬️</span>
            <span class="calendar-modal__stat-value">${day.wind_speed?.toFixed(0) ?? "–"}</span>
            <span class="calendar-modal__stat-label">Wind km/h</span>
          </div>
        `;
      },
      getConditionBadge: (day) => {
        const precip = day.precip ?? 0;
        if (precip >= 20)
          return { class: "heavy", text: "Starkregen", icon: "⛈️" };
        if (precip >= 10)
          return { class: "moderate", text: "Regentag", icon: "🌧️" };
        if (precip >= 2) return { class: "light", text: "Schauer", icon: "🌦️" };
        if (precip > 0) return { class: "drizzle", text: "Niesel", icon: "💧" };
        return { class: "dry", text: "Trocken", icon: "☀️" };
      },
    },
    sunshine: {
      icon: "wb_sunny",
      title: "Sonnenschein",
      gradient:
        "linear-gradient(135deg, rgba(255, 210, 111, 0.18), transparent)",
      getHeroValue: (day) => `${day.sunshine?.toFixed(1) ?? "0"} h`,
      getHeroLabel: "Sonnenstunden",
      getDetailCards: (day) => {
        const date = new Date(day.date);
        const possibleHours = getDaylightHours(date);
        const percentage = day.sunshine
          ? Math.round((day.sunshine / possibleHours) * 100)
          : 0;
        return `
          <div class="calendar-modal__stat">
            <span class="calendar-modal__stat-icon">📊</span>
            <span class="calendar-modal__stat-value">${percentage}%</span>
            <span class="calendar-modal__stat-label">Ausnutzung</span>
          </div>
          <div class="calendar-modal__stat">
            <span class="calendar-modal__stat-icon">🌅</span>
            <span class="calendar-modal__stat-value">${possibleHours.toFixed(1)} h</span>
            <span class="calendar-modal__stat-label">Tageslicht</span>
          </div>
          <div class="calendar-modal__stat">
            <span class="calendar-modal__stat-icon">☁️</span>
            <span class="calendar-modal__stat-value">${(possibleHours - (day.sunshine ?? 0)).toFixed(1)} h</span>
            <span class="calendar-modal__stat-label">Bewölkt</span>
          </div>
        `;
      },
      getConditionBadge: (day) => {
        const date = new Date(day.date);
        const possibleHours = getDaylightHours(date);
        const percentage = day.sunshine
          ? (day.sunshine / possibleHours) * 100
          : 0;
        if (percentage >= 80)
          return { class: "sunny", text: "Sonnig", icon: "☀️" };
        if (percentage >= 50)
          return { class: "partly", text: "Teils sonnig", icon: "⛅" };
        if (percentage >= 20)
          return { class: "cloudy", text: "Bewölkt", icon: "🌥️" };
        return { class: "overcast", text: "Bedeckt", icon: "☁️" };
      },
    },
  };

  /**
   * Render Kalender-Tag-Modal
   * Kompakte, übersichtliche Darstellung des gewählten Tages
   * @param {Object} day - Tagesdaten
   * @param {string} metric - Aktive Kalender-Metrik (temperature/precipitation/sunshine)
   */
  function renderCalendarDayModal(day, metric = "temperature") {
    if (!day) return "";

    const config =
      CALENDAR_MODAL_CONFIG[metric] || CALENDAR_MODAL_CONFIG.temperature;
    const date = new Date(day.date);
    const weekday = date.toLocaleDateString("de-DE", { weekday: "long" });
    const formattedDate = `${date.getDate()}. ${CONFIG.MONTH_LABELS_DE[date.getMonth()]} ${date.getFullYear()}`;
    const condition = config.getConditionBadge(day);

    return `
      <div class="history-modal__content history-modal__content--calendar history-modal__content--calendar-${metric}">
        <div class="swipe-handle"></div>
        <button class="history-modal__close" data-action="close" aria-label="Schließen">
          <span class="material-symbols-outlined">close</span>
        </button>

        <header class="calendar-modal__header">
          <div class="calendar-modal__date">
            <span class="calendar-modal__weekday">${weekday}</span>
            <span class="calendar-modal__full-date">${formattedDate}</span>
          </div>
          <div class="calendar-modal__condition calendar-modal__condition--${condition.class}">
            <span>${condition.icon}</span>
            <span>${condition.text}</span>
          </div>
        </header>

        <div class="calendar-modal__hero">
          <span class="material-symbols-outlined calendar-modal__hero-icon">${config.icon}</span>
          <div class="calendar-modal__hero-value">${config.getHeroValue(day)}</div>
          <div class="calendar-modal__hero-label">${config.getHeroLabel}</div>
        </div>

        <div class="calendar-modal__stats">
          ${config.getDetailCards(day)}
        </div>

        <!-- Schnellübersicht andere Metriken -->
        <div class="calendar-modal__quick-stats">
          ${
            metric !== "temperature"
              ? `
            <div class="calendar-modal__quick-item">
              <span class="material-symbols-outlined">device_thermostat</span>
              <span>${day.temp_min?.toFixed(1) ?? "–"}° / ${day.temp_max?.toFixed(1) ?? "–"}°</span>
            </div>
          `
              : ""
          }
          ${
            metric !== "precipitation"
              ? `
            <div class="calendar-modal__quick-item">
              <span class="material-symbols-outlined">water_drop</span>
              <span>${day.precip?.toFixed(1) ?? "0"} mm</span>
            </div>
          `
              : ""
          }
          ${
            metric !== "sunshine"
              ? `
            <div class="calendar-modal__quick-item">
              <span class="material-symbols-outlined">wb_sunny</span>
              <span>${day.sunshine?.toFixed(1) ?? "0"} h</span>
            </div>
          `
              : ""
          }
        </div>

        <div class="calendar-modal__note">
          <span class="material-symbols-outlined">eco</span>
          <p>${getSeasonalNote(day)}</p>
        </div>
      </div>
    `;
  }

  // ============================================
  // EXTREME-SEKTION MODALS
  // Individuelle Modals für jeden Extrem-Typ
  // ============================================

  /**
   * EXTREME-MODAL KONFIGURATIONEN
   * Individuelle Darstellung je nach Extrem-Typ
   */
  const EXTREME_MODAL_CONFIG = {
    "hottest-day": {
      icon: "local_fire_department",
      title: "Heißester Tag",
      gradient:
        "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(251, 191, 36, 0.1))",
      accentClass: "hot",
      getHeroValue: (ext) => `${ext.data?.temp_max?.toFixed(1) ?? "–"}°C`,
      getHeroLabel: "Höchsttemperatur",
      getInsight: (ext, normals) => {
        const anomaly = (ext.data?.temp_max ?? 0) - (normals?.avgTemp ?? 15);
        if (anomaly > 15)
          return "Extremhitze – deutlich über dem saisonalen Durchschnitt. Solche Temperaturen können gesundheitsgefährdend sein.";
        if (anomaly > 10)
          return "Sehr heißer Tag – erheblich wärmer als üblich für diese Jahreszeit.";
        return "Der wärmste Tag im Analysezeitraum.";
      },
      getDetailCards: (ext) => `
        <div class="extreme-modal__stat extreme-modal__stat--primary">
          <span class="material-symbols-outlined">device_thermostat</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.temp_max?.toFixed(1) ?? "–"}°C</span>
            <span class="extreme-modal__stat-label">Maximum</span>
          </div>
        </div>
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">thermostat</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.temp_avg?.toFixed(1) ?? "–"}°C</span>
            <span class="extreme-modal__stat-label">Durchschnitt</span>
          </div>
        </div>
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">ac_unit</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.temp_min?.toFixed(1) ?? "–"}°C</span>
            <span class="extreme-modal__stat-label">Minimum</span>
          </div>
        </div>
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">wb_sunny</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.sunshine?.toFixed(1) ?? "–"} h</span>
            <span class="extreme-modal__stat-label">Sonnenstunden</span>
          </div>
        </div>
      `,
      getHealthTip: () =>
        "⚠️ Bei Hitze: Viel trinken, direkte Sonne meiden, körperliche Anstrengung reduzieren. Besonders gefährdet: Kinder, Ältere, chronisch Kranke.",
    },
    "coldest-day": {
      icon: "severe_cold",
      title: "Kältester Tag",
      gradient:
        "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 197, 253, 0.1))",
      accentClass: "cold",
      getHeroValue: (ext) => `${ext.data?.temp_min?.toFixed(1) ?? "–"}°C`,
      getHeroLabel: "Tiefsttemperatur",
      getInsight: (ext, normals) => {
        const temp = ext.data?.temp_min ?? 0;
        if (temp < -15)
          return "Extreme Kälte – gefährlich für Mensch und Infrastruktur. Wasserleitungen und Fahrzeuge schützen!";
        if (temp < -10)
          return "Strenger Frost – erhebliche Kälte, auch tagsüber frostig.";
        if (temp < 0)
          return "Frostnacht – Glättegefahr und Frostschäden möglich.";
        return "Der kälteste Tag im Analysezeitraum.";
      },
      getDetailCards: (ext) => `
        <div class="extreme-modal__stat extreme-modal__stat--primary">
          <span class="material-symbols-outlined">ac_unit</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.temp_min?.toFixed(1) ?? "–"}°C</span>
            <span class="extreme-modal__stat-label">Minimum</span>
          </div>
        </div>
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">thermostat</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.temp_avg?.toFixed(1) ?? "–"}°C</span>
            <span class="extreme-modal__stat-label">Durchschnitt</span>
          </div>
        </div>
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">device_thermostat</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.temp_max?.toFixed(1) ?? "–"}°C</span>
            <span class="extreme-modal__stat-label">Maximum</span>
          </div>
        </div>
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">air</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.wind_speed?.toFixed(0) ?? "–"} km/h</span>
            <span class="extreme-modal__stat-label">Wind</span>
          </div>
        </div>
      `,
      getHealthTip: () =>
        "❄️ Bei Kälte: Warm kleiden (Schichten), Extremitäten schützen, auf Glatteis achten. Wasserleitungen vor Frost schützen!",
    },
    "heaviest-rain": {
      icon: "thunderstorm",
      title: "Stärkster Niederschlag",
      gradient:
        "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.1))",
      accentClass: "rain",
      getHeroValue: (ext) => `${ext.data?.precip?.toFixed(1) ?? "0"} mm`,
      getHeroLabel: "Tagesniederschlag",
      getInsight: (ext) => {
        const precip = ext.data?.precip ?? 0;
        if (precip >= 50)
          return "Extremniederschlag – Überflutungsgefahr, lokale Unwetter möglich. Kellerräume und Abflüsse prüfen!";
        if (precip >= 30)
          return "Sehr starker Regen – erhöhte Gefahr von Überschwemmungen und Aquaplaning.";
        if (precip >= 20)
          return "Ergiebiger Niederschlag – deutlich mehr als ein normaler Regentag.";
        return "Der niederschlagsreichste Tag im Analysezeitraum.";
      },
      getDetailCards: (ext) => `
        <div class="extreme-modal__stat extreme-modal__stat--primary">
          <span class="material-symbols-outlined">water_drop</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.precip?.toFixed(1) ?? "0"} mm</span>
            <span class="extreme-modal__stat-label">Niederschlag</span>
          </div>
        </div>
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">humidity_percentage</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.humidity ?? "–"}%</span>
            <span class="extreme-modal__stat-label">Feuchtigkeit</span>
          </div>
        </div>
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">device_thermostat</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.temp_avg?.toFixed(1) ?? "–"}°C</span>
            <span class="extreme-modal__stat-label">Temperatur</span>
          </div>
        </div>
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">air</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.wind_speed?.toFixed(0) ?? "–"} km/h</span>
            <span class="extreme-modal__stat-label">Wind</span>
          </div>
        </div>
      `,
      getHealthTip: () =>
        "🌧️ Bei Starkregen: Keller auf Wassereintritt prüfen, Abflüsse freihalten, bei Gewitter nicht im Freien aufhalten.",
    },
    "strongest-wind": {
      icon: "storm",
      title: "Stärkster Wind",
      gradient:
        "linear-gradient(135deg, rgba(74, 222, 128, 0.15), rgba(34, 197, 94, 0.08))",
      accentClass: "wind",
      getHeroValue: (ext) => `${ext.data?.wind_speed?.toFixed(0) ?? "–"} km/h`,
      getHeroLabel: "Windgeschwindigkeit",
      getInsight: (ext) => {
        const wind = ext.data?.wind_speed ?? 0;
        const beaufort = getBeaufortScale(wind);
        if (wind >= 100)
          return `Orkan (Beaufort ${beaufort.scale}) – Lebensgefahr im Freien! Gebäude nicht verlassen.`;
        if (wind >= 75)
          return `Schwerer Sturm (Beaufort ${beaufort.scale}) – ${beaufort.effect}`;
        if (wind >= 50)
          return `Starker Wind (Beaufort ${beaufort.scale}) – ${beaufort.effect}`;
        return `Der windigste Tag im Analysezeitraum – ${beaufort.description}.`;
      },
      getDetailCards: (ext) => {
        const beaufort = getBeaufortScale(ext.data?.wind_speed ?? 0);
        return `
          <div class="extreme-modal__stat extreme-modal__stat--primary">
            <span class="material-symbols-outlined">air</span>
            <div>
              <span class="extreme-modal__stat-value">${ext.data?.wind_speed?.toFixed(0) ?? "–"} km/h</span>
              <span class="extreme-modal__stat-label">Windstärke</span>
            </div>
          </div>
          <div class="extreme-modal__stat">
            <span class="material-symbols-outlined">speed</span>
            <div>
              <span class="extreme-modal__stat-value">Bft ${beaufort.scale}</span>
              <span class="extreme-modal__stat-label">${beaufort.description}</span>
            </div>
          </div>
          <div class="extreme-modal__stat">
            <span class="material-symbols-outlined">device_thermostat</span>
            <div>
              <span class="extreme-modal__stat-value">${ext.data?.temp_avg?.toFixed(1) ?? "–"}°C</span>
              <span class="extreme-modal__stat-label">Temperatur</span>
            </div>
          </div>
          <div class="extreme-modal__stat">
            <span class="material-symbols-outlined">water_drop</span>
            <div>
              <span class="extreme-modal__stat-value">${ext.data?.precip?.toFixed(1) ?? "0"} mm</span>
              <span class="extreme-modal__stat-label">Niederschlag</span>
            </div>
          </div>
        `;
      },
      getHealthTip: () =>
        "💨 Bei Sturm: Fenster schließen, lose Gegenstände sichern, Aufenthalt unter Bäumen/Gerüsten meiden.",
    },
    // Generischer Fallback
    default: {
      icon: "info",
      title: "Wetterereignis",
      gradient:
        "linear-gradient(135deg, rgba(138, 180, 255, 0.12), transparent)",
      accentClass: "default",
      getHeroValue: (ext) => ext.value || "–",
      getHeroLabel: "Messwert",
      getInsight: () =>
        "Ein bemerkenswertes Wetterereignis im Analysezeitraum.",
      getDetailCards: (ext) => `
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">device_thermostat</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.temp_avg?.toFixed(1) ?? "–"}°C</span>
            <span class="extreme-modal__stat-label">Temperatur</span>
          </div>
        </div>
        <div class="extreme-modal__stat">
          <span class="material-symbols-outlined">water_drop</span>
          <div>
            <span class="extreme-modal__stat-value">${ext.data?.precip?.toFixed(1) ?? "0"} mm</span>
            <span class="extreme-modal__stat-label">Niederschlag</span>
          </div>
        </div>
      `,
      getHealthTip: () => null,
    },
  };

  /**
   * Render erweitertes Extreme-Modal
   * Individuell je nach Extrem-Typ (heißester Tag, kältester Tag, stärkster Niederschlag)
   * @param {Object} extreme - Extreme-Daten (id, type, data, icon, title, value, dateFormatted)
   * @param {Object} location - Aktueller Standort
   */
  function renderExtremeDetailModalEnhanced(extreme, location) {
    if (!extreme) return "";

    // Bestimme Konfiguration basierend auf Typ oder ID
    let configKey = "default";
    const id = (extreme.id || extreme.type || "").toLowerCase();
    if (id.includes("hot") || id.includes("heiss") || id.includes("heiß"))
      configKey = "hottest-day";
    else if (id.includes("cold") || id.includes("kalt") || id.includes("kält"))
      configKey = "coldest-day";
    else if (
      id.includes("rain") ||
      id.includes("precip") ||
      id.includes("niederschlag")
    )
      configKey = "heaviest-rain";
    else if (id.includes("wind") || id.includes("sturm"))
      configKey = "strongest-wind";

    const config =
      EXTREME_MODAL_CONFIG[configKey] || EXTREME_MODAL_CONFIG.default;

    // Klimanormale für Kontext
    const date = extreme.data?.date ? new Date(extreme.data.date) : new Date();
    const monthIdx = date.getMonth();
    const normals =
      CONFIG.CLIMATE_NORMALS[CONFIG.MONTH_NAMES[monthIdx]] ||
      CONFIG.CLIMATE_NORMALS.january;

    const healthTip = config.getHealthTip ? config.getHealthTip() : null;

    return `
      <div class="history-modal__content history-modal__content--extreme history-modal__content--extreme-${config.accentClass}" style="--modal-gradient: ${config.gradient}">
        <div class="swipe-handle"></div>
        <button class="history-modal__close" data-action="close" aria-label="Schließen">
          <span class="material-symbols-outlined">close</span>
        </button>

        <header class="extreme-modal__header extreme-modal__header--${config.accentClass}">
          <div class="extreme-modal__icon-wrapper">
            <span class="material-symbols-outlined extreme-modal__icon">${config.icon}</span>
          </div>
          <div class="extreme-modal__title-group">
            <h3 class="extreme-modal__title">${config.title}</h3>
            <span class="extreme-modal__hero-value">${config.getHeroValue(extreme)}</span>
            <span class="extreme-modal__hero-label">${config.getHeroLabel}</span>
          </div>
        </header>

        <div class="extreme-modal__meta">
          <div class="extreme-modal__meta-item">
            <span class="material-symbols-outlined">calendar_today</span>
            <span>${extreme.dateFormatted || "–"}</span>
          </div>
          <div class="extreme-modal__meta-item">
            <span class="material-symbols-outlined">location_on</span>
            <span>${location?.name || "Berlin"}</span>
          </div>
        </div>

        <div class="extreme-modal__insight">
          <span class="material-symbols-outlined">lightbulb</span>
          <p>${config.getInsight(extreme, normals)}</p>
        </div>

        <div class="extreme-modal__stats">
          ${config.getDetailCards(extreme)}
        </div>

        ${
          healthTip
            ? `
          <div class="extreme-modal__health-tip">
            <p>${healthTip}</p>
          </div>
        `
            : ""
        }

        <div class="extreme-modal__chart" id="extreme-modal-chart-container">
          <canvas id="history-extreme-mini-chart"></canvas>
        </div>
      </div>
    `;
  }

  // ============================================
  // HELPER FUNCTIONS für Metrik-Modals
  // ============================================

  /**
   * Beaufort-Skala Lookup
   */
  function getBeaufortScale(windSpeed) {
    if (windSpeed < 1)
      return {
        scale: 0,
        description: "Windstille",
        effect: "Rauch steigt senkrecht",
      };
    if (windSpeed < 6)
      return {
        scale: 1,
        description: "Leiser Zug",
        effect: "Rauch treibt leicht",
      };
    if (windSpeed < 12)
      return {
        scale: 2,
        description: "Leichte Brise",
        effect: "Blätter rascheln",
      };
    if (windSpeed < 20)
      return {
        scale: 3,
        description: "Schwache Brise",
        effect: "Blätter bewegen sich",
      };
    if (windSpeed < 29)
      return {
        scale: 4,
        description: "Mäßige Brise",
        effect: "Zweige bewegen sich",
      };
    if (windSpeed < 39)
      return {
        scale: 5,
        description: "Frische Brise",
        effect: "Kleine Bäume schwanken",
      };
    if (windSpeed < 50)
      return {
        scale: 6,
        description: "Starker Wind",
        effect: "Große Äste bewegen sich",
      };
    if (windSpeed < 62)
      return {
        scale: 7,
        description: "Steifer Wind",
        effect: "Ganze Bäume bewegen sich",
      };
    if (windSpeed < 75)
      return {
        scale: 8,
        description: "Stürmischer Wind",
        effect: "Zweige brechen",
      };
    if (windSpeed < 89)
      return {
        scale: 9,
        description: "Sturm",
        effect: "Dachziegel lösen sich",
      };
    if (windSpeed < 103)
      return {
        scale: 10,
        description: "Schwerer Sturm",
        effect: "Bäume entwurzelt",
      };
    if (windSpeed < 118)
      return {
        scale: 11,
        description: "Orkanartiger Sturm",
        effect: "Schwere Schäden",
      };
    return {
      scale: 12,
      description: "Orkan",
      effect: "Schwerste Verwüstungen",
    };
  }

  /**
   * Komfortlevel basierend auf Temperatur und Feuchtigkeit
   */
  function getComfortLevel(humidity, temp) {
    // Taupunkt berechnen (Magnus-Formel vereinfacht)
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * temp) / (b + temp) + Math.log(humidity / 100);
    const dewPoint = (b * alpha) / (a - alpha);

    // Gefühlte Temperatur (vereinfacht mit Hitzeindex)
    let feelsLike = temp;
    if (temp >= 27 && humidity >= 40) {
      // Vereinfachter Hitzeindex
      feelsLike = temp + (humidity - 40) * 0.1;
    }

    // Komfortlevel
    let label = "Angenehm";
    if (humidity < 30) label = "Zu trocken";
    else if (humidity > 70 && temp > 25) label = "Schwül";
    else if (humidity > 80) label = "Feucht";
    else if (humidity >= 40 && humidity <= 60) label = "Optimal";

    return {
      label,
      feelsLike: Math.round(feelsLike),
      dewPoint,
    };
  }

  /**
   * Geschätzte Tageslichtdauer basierend auf Datum (für Deutschland ~52°N)
   */
  function getDaylightHours(date) {
    const dayOfYear = Math.floor(
      (date - new Date(date.getFullYear(), 0, 0)) / 86400000,
    );
    // Vereinfachte Formel für ~52° nördlicher Breite
    const declination =
      -23.45 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);
    const hourAngle = Math.acos(
      -Math.tan((52 * Math.PI) / 180) * Math.tan((declination * Math.PI) / 180),
    );
    return (2 * hourAngle * 180) / Math.PI / 15;
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
   * Advanced period selector with granularity support
   */
  function renderAdvancedPeriodModal(
    periodType,
    currentPeriod,
    selectedGranularity = "month",
    periods = [],
  ) {
    const TRS = window.TimeRangeSystem;
    if (!TRS) {
      // Fallback auf alte Implementierung
      return renderPeriodSelectorModal(periods, currentPeriod, periodType);
    }

    const granularityConfig = TRS.GRANULARITY_CONFIG[selectedGranularity];
    const presets = TRS.generateTimeRangePresets();

    // Generiere Perioden basierend auf Granularität
    const generatedPeriods = generatePeriodsForGranularity(
      selectedGranularity,
      periodType,
    );

    return `
      <div class="history-modal__content history-modal__content--period history-modal__content--advanced">
        <div class="swipe-handle"></div>
        <button class="history-modal__close" data-action="close" aria-label="Schließen">
          <span class="material-symbols-outlined">close</span>
        </button>

        <header class="history-modal__header">
          <div class="period-modal__title-group">
            <span class="material-symbols-outlined">${granularityConfig?.icon || "calendar_month"}</span>
            <div>
              <h3>Zeitraum ${periodType} wählen</h3>
              <p class="history-modal__subtitle">${granularityConfig?.label || "Zeitraum"} vergleichen</p>
            </div>
          </div>
        </header>

        <!-- Granularitäts-Switcher -->
        <div class="granularity-selector">
          <div class="granularity-tabs">
            ${Object.keys(TRS.GRANULARITY_CONFIG)
              .map((key) => {
                const config = TRS.GRANULARITY_CONFIG[key];
                return `
                    <button class="granularity-tab ${key === selectedGranularity ? "granularity-tab--active" : ""}"
                            data-granularity="${key}"
                            data-period-type="${periodType}">
                      <span class="material-symbols-outlined">${config.icon}</span>
                      <span class="granularity-tab__label">${config.label}</span>
                    </button>
                  `;
              })
              .join("")}
          </div>
        </div>

        <!-- Schnellauswahl -->
        <div class="period-presets">
          <h4 class="period-section-title">Schnellauswahl</h4>
          <div class="period-preset-grid">
            ${presets
              .filter((p) => p.granularity === selectedGranularity)
              .slice(0, 4)
              .map(
                (preset) => `
              <button class="period-preset-btn"
                      data-preset-id="${preset.id}"
                      data-period-type="${periodType}"
                      data-start-date="${preset.startDate.toISOString()}"
                      data-end-date="${preset.endDate.toISOString()}">
                <span class="material-symbols-outlined">bolt</span>
                <span>${preset.label}</span>
              </button>
            `,
              )
              .join("")}
          </div>
        </div>

        <!-- Periodenliste -->
        <div class="history-modal__body">
          <h4 class="period-section-title">Verfügbare Zeiträume</h4>
          <div class="period-list period-list--advanced" id="period-list-container">
            ${generatedPeriods
              .map((p) => {
                const isActive = p.id === currentPeriod;
                return `
                  <button class="period-item period-item--enhanced ${isActive ? "period-item--active" : ""}"
                          data-period-id="${p.id}"
                          data-period-type="${periodType}"
                          data-granularity="${selectedGranularity}"
                          data-start-date="${p.startDate}"
                          data-end-date="${p.endDate}">
                    <div class="period-item__indicator"></div>
                    <div class="period-item__content">
                      <span class="period-item__name">${p.label}</span>
                      ${p.subtitle ? `<span class="period-item__subtitle">${p.subtitle}</span>` : ""}
                      ${p.dataPoints ? `<span class="period-item__meta">${p.dataPoints} ${granularityConfig.label}</span>` : ""}
                    </div>
                    ${isActive ? '<span class="material-symbols-outlined period-item__check">check_circle</span>' : ""}
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>

        <!-- Custom Range -->
        <div class="period-custom-section">
          <button class="period-custom-btn" data-action="custom-range" data-period-type="${periodType}">
            <span class="material-symbols-outlined">edit_calendar</span>
            <span>Benutzerdefinierter Zeitraum</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Helper: Generate periods for a specific granularity
   */
  function generatePeriodsForGranularity(granularity, periodType) {
    const TRS = window.TimeRangeSystem;
    if (!TRS) return [];

    const now = new Date();
    const periods = [];
    const config = TRS.GRANULARITY_CONFIG[granularity];

    if (!config) return [];

    // Generiere letzte N Perioden basierend auf Granularität
    const count = Math.min(config.maxDataPoints, 12); // Max 12 Einträge

    for (let i = 0; i < count; i++) {
      const date =
        i === 0 ? now : config.getPrevious(new Date(periods[i - 1].startDate));
      const endDate = config.getNext(date);

      periods.push({
        id: `${granularity}-${periodType}-${i}`,
        label: config.formatFull(date),
        subtitle: TRS.generateTimeRangeLabel(date, endDate, granularity),
        startDate: date.toISOString(),
        endDate: endDate.toISOString(),
        granularity: granularity,
        dataPoints: 1,
      });
    }

    return periods;
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
          <p class="history-modal__subtitle">Tippen Sie auf einen Begriff für Details</p>
        </header>
        <div class="history-modal__body">
          <div class="info-accordion">

            <!-- Temperatur-Begriffe -->
            <div class="info-accordion__item">
              <button class="info-accordion__header" data-accordion-toggle>
                <span class="info-accordion__icon material-symbols-outlined">device_thermostat</span>
                <span class="info-accordion__title">Temperatur-Begriffe</span>
                <span class="info-accordion__chevron material-symbols-outlined">expand_more</span>
              </button>
              <div class="info-accordion__content">
                <dl class="info-accordion__list">
                  <dt>Durchschnittstemperatur</dt>
                  <dd>Mittelwert aller Tages-Durchschnitte im gewählten Zeitraum.</dd>

                  <dt>Klimamittel</dt>
                  <dd>Langjähriger Durchschnitt (30 Jahre) für den Standort. Dient als Referenzwert zur Einordnung aktueller Temperaturen.</dd>

                  <dt>Frosttage</dt>
                  <dd>Tage, an denen die Tiefsttemperatur unter 0°C lag. Wichtig für Landwirtschaft und Straßenzustand.</dd>

                  <dt>Eistage</dt>
                  <dd>Tage, an denen die Höchsttemperatur unter 0°C blieb. An diesen Tagen bleibt es den ganzen Tag gefroren.</dd>

                  <dt>Hitzewelle</dt>
                  <dd>Mindestens 3 aufeinanderfolgende Tage mit Temperaturen über 30°C. Kann gesundheitliche Belastungen verursachen.</dd>
                </dl>
              </div>
            </div>

            <!-- Niederschlag -->
            <div class="info-accordion__item">
              <button class="info-accordion__header" data-accordion-toggle>
                <span class="info-accordion__icon material-symbols-outlined">water_drop</span>
                <span class="info-accordion__title">Niederschlag</span>
                <span class="info-accordion__chevron material-symbols-outlined">expand_more</span>
              </button>
              <div class="info-accordion__content">
                <dl class="info-accordion__list">
                  <dt>Niederschlagsmenge</dt>
                  <dd>Gemessene Wassermenge in Millimetern (mm). 1 mm entspricht 1 Liter Wasser pro Quadratmeter (1 L/m²).</dd>

                  <dt>Regentag</dt>
                  <dd>Tag mit mindestens 0,1 mm Niederschlag innerhalb von 24 Stunden.</dd>

                  <dt>Starkregen</dt>
                  <dd>Mehr als 10 mm Niederschlag in kurzer Zeit. Kann zu Überflutungen führen.</dd>

                  <dt>Niederschlagsintensität</dt>
                  <dd>Durchschnittliche Menge pro Stunde. Wichtig für Hochwasservorhersagen.</dd>
                </dl>
              </div>
            </div>

            <!-- Wind & Beaufort -->
            <div class="info-accordion__item">
              <button class="info-accordion__header" data-accordion-toggle>
                <span class="info-accordion__icon material-symbols-outlined">air</span>
                <span class="info-accordion__title">Wind & Beaufort-Skala</span>
                <span class="info-accordion__chevron material-symbols-outlined">expand_more</span>
              </button>
              <div class="info-accordion__content">
                <dl class="info-accordion__list">
                  <dt>Windgeschwindigkeit</dt>
                  <dd>Gemessen in Kilometer pro Stunde (km/h). Die Beaufort-Skala klassifiziert diese in 13 Stufen.</dd>

                  <dt>Sturmtag</dt>
                  <dd>Tag mit Windböen über 62 km/h (Beaufort 8+). Ab dieser Stärke spricht man von Sturmstärke.</dd>

                  <dt>Böen</dt>
                  <dd>Kurzzeitige, plötzliche Windspitzen. Können deutlich stärker sein als die durchschnittliche Windgeschwindigkeit.</dd>
                </dl>

                <div class="info-beaufort-compact">
                  <h5>Beaufort-Skala</h5>
                  <p class="info-beaufort-intro">Klassifizierung von Windgeschwindigkeiten (0-12)</p>
                  <div class="beaufort-grid">
                    <div class="beaufort-item beaufort-item--calm">
                      <span class="beaufort-num">0-3</span>
                      <span class="beaufort-label">Leicht</span>
                      <span class="beaufort-speed">&lt;20 km/h</span>
                    </div>
                    <div class="beaufort-item beaufort-item--moderate">
                      <span class="beaufort-num">4-5</span>
                      <span class="beaufort-label">Mäßig</span>
                      <span class="beaufort-speed">20-38 km/h</span>
                    </div>
                    <div class="beaufort-item beaufort-item--strong">
                      <span class="beaufort-num">6-7</span>
                      <span class="beaufort-label">Stark</span>
                      <span class="beaufort-speed">39-61 km/h</span>
                    </div>
                    <div class="beaufort-item beaufort-item--storm">
                      <span class="beaufort-num">8-9</span>
                      <span class="beaufort-label">Sturm</span>
                      <span class="beaufort-speed">62-88 km/h</span>
                    </div>
                    <div class="beaufort-item beaufort-item--hurricane">
                      <span class="beaufort-num">10-12</span>
                      <span class="beaufort-label">Orkan</span>
                      <span class="beaufort-speed">&gt;89 km/h</span>
                    </div>
                  </div>
                  <button class="beaufort-detail-toggle" data-action="toggle-beaufort-detail">
                    <span class="material-symbols-outlined">table_chart</span>
                    Detaillierte Tabelle anzeigen
                  </button>
                  <div class="beaufort-detail-table" style="display: none;">
                    <table>
                      <thead>
                        <tr>
                          <th>Bft</th>
                          <th>km/h</th>
                          <th>Bezeichnung</th>
                          <th>Auswirkungen</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td>0</td><td>&lt;1</td><td>Windstille</td><td>Rauch steigt senkrecht</td></tr>
                        <tr><td>1</td><td>1-5</td><td>Leiser Zug</td><td>Rauch treibt ab</td></tr>
                        <tr><td>2</td><td>6-11</td><td>Leichte Brise</td><td>Blätter rascheln</td></tr>
                        <tr><td>3</td><td>12-19</td><td>Schwache Brise</td><td>Blätter bewegen sich</td></tr>
                        <tr><td>4</td><td>20-28</td><td>Mäßige Brise</td><td>Zweige bewegen sich</td></tr>
                        <tr><td>5</td><td>29-38</td><td>Frische Brise</td><td>Kleine Bäume schwanken</td></tr>
                        <tr><td>6</td><td>39-49</td><td>Starker Wind</td><td>Große Äste bewegen sich</td></tr>
                        <tr><td>7</td><td>50-61</td><td>Steifer Wind</td><td>Bäume bewegen sich</td></tr>
                        <tr class="beaufort-warning"><td>8</td><td>62-74</td><td>Stürmisch</td><td>Zweige brechen</td></tr>
                        <tr class="beaufort-warning"><td>9</td><td>75-88</td><td>Sturm</td><td>Dachziegel lösen sich</td></tr>
                        <tr class="beaufort-danger"><td>10</td><td>89-102</td><td>Schwerer Sturm</td><td>Bäume entwurzelt</td></tr>
                        <tr class="beaufort-danger"><td>11</td><td>103-117</td><td>Orkanartig</td><td>Schwere Verwüstungen</td></tr>
                        <tr class="beaufort-danger"><td>12</td><td>&gt;117</td><td>Orkan</td><td>Schwerste Schäden</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Luftfeuchtigkeit -->
            <div class="info-accordion__item">
              <button class="info-accordion__header" data-accordion-toggle>
                <span class="info-accordion__icon material-symbols-outlined">humidity_percentage</span>
                <span class="info-accordion__title">Luftfeuchtigkeit</span>
                <span class="info-accordion__chevron material-symbols-outlined">expand_more</span>
              </button>
              <div class="info-accordion__content">
                <dl class="info-accordion__list">
                  <dt>Relative Luftfeuchtigkeit</dt>
                  <dd>Prozentuale Angabe der Wasserdampf-Sättigung der Luft. 100% bedeutet vollständige Sättigung (Nebel/Regen).</dd>

                  <dt>Optimale Luftfeuchtigkeit</dt>
                  <dd>40-60% gelten als angenehm für Wohn- und Arbeitsräume. Außerhalb dieses Bereichs kann es zu Unbehagen kommen.</dd>

                  <dt>Taupunkt</dt>
                  <dd>Temperatur, bei der Wasserdampf kondensiert. Wichtig für Nebelbildung und gefühlte Temperatur.</dd>

                  <dt>Schwüle</dt>
                  <dd>Kombination aus hoher Temperatur (>25°C) und hoher Luftfeuchtigkeit (>70%). Belastet den Kreislauf.</dd>
                </dl>
              </div>
            </div>

            <!-- Sonnenschein -->
            <div class="info-accordion__item">
              <button class="info-accordion__header" data-accordion-toggle>
                <span class="info-accordion__icon material-symbols-outlined">wb_sunny</span>
                <span class="info-accordion__title">Sonnenschein</span>
                <span class="info-accordion__chevron material-symbols-outlined">expand_more</span>
              </button>
              <div class="info-accordion__content">
                <dl class="info-accordion__list">
                  <dt>Sonnenstunden</dt>
                  <dd>Stunden mit direktem Sonnenschein pro Tag. Gemessen durch spezielle Sensoren.</dd>

                  <dt>Sonnigster Tag</dt>
                  <dd>Tag mit der höchsten Anzahl an Sonnenstunden im Zeitraum.</dd>

                  <dt>Bewölkung</dt>
                  <dd>Inverses Maß zum Sonnenschein. Hohe Bewölkung = wenige Sonnenstunden.</dd>

                  <dt>UV-Index</dt>
                  <dd>Bei viel Sonnenschein steigt die UV-Belastung. Sonnenschutz ab UV-Index 3 empfohlen.</dd>
                </dl>
              </div>
            </div>

          </div>
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
    renderComparisonDayModal,
    renderCalendarDayModal,
    renderExtremeDetailModal,
    renderExtremeDetailModalEnhanced,
    renderLocationModal,
    renderPeriodSelectorModal,
    renderAdvancedPeriodModal,
    generatePeriodsForGranularity,
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
