/**
 * TimeRangeSystem.js - Flexibles Zeitraum-Vergleichssystem
 *
 * Unterstützt dynamische Vergleiche von:
 * - Stunden
 * - Tagen
 * - Wochen
 * - Monaten
 * - Jahren
 * - Jahrzehnten
 * - Jahrhunderten
 *
 * @module ui/history/components/TimeRangeSystem
 * @version 2.0.0
 */

(function (global) {
  "use strict";

  // ============================================
  // ZEITRAUM-GRANULARITÄTEN
  // ============================================

  const GRANULARITY = {
    HOUR: "hour",
    DAY: "day",
    WEEK: "week",
    MONTH: "month",
    YEAR: "year",
    DECADE: "decade",
    CENTURY: "century",
  };

  const GRANULARITY_CONFIG = {
    [GRANULARITY.HOUR]: {
      label: "Stunden",
      singular: "Stunde",
      icon: "schedule",
      minDataPoints: 24,
      maxDataPoints: 168, // 1 Woche
      unit: "h",
      formatLabel: (date) => {
        return date.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });
      },
      formatFull: (date) => {
        return date.toLocaleString("de-DE", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
      getNext: (date) => {
        const next = new Date(date);
        next.setHours(next.getHours() + 1);
        return next;
      },
      getPrevious: (date) => {
        const prev = new Date(date);
        prev.setHours(prev.getHours() - 1);
        return prev;
      },
    },
    [GRANULARITY.DAY]: {
      label: "Tage",
      singular: "Tag",
      icon: "today",
      minDataPoints: 7,
      maxDataPoints: 365,
      unit: "d",
      formatLabel: (date) => {
        return date.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "short",
        });
      },
      formatFull: (date) => {
        return date.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      },
      getNext: (date) => {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        return next;
      },
      getPrevious: (date) => {
        const prev = new Date(date);
        prev.setDate(prev.getDate() - 1);
        return prev;
      },
    },
    [GRANULARITY.WEEK]: {
      label: "Wochen",
      singular: "Woche",
      icon: "date_range",
      minDataPoints: 4,
      maxDataPoints: 52,
      unit: "W",
      formatLabel: (date) => {
        const weekNum = getWeekNumber(date);
        return `KW ${weekNum}`;
      },
      formatFull: (date) => {
        const weekNum = getWeekNumber(date);
        const year = date.getFullYear();
        return `KW ${weekNum}, ${year}`;
      },
      getNext: (date) => {
        const next = new Date(date);
        next.setDate(next.getDate() + 7);
        return next;
      },
      getPrevious: (date) => {
        const prev = new Date(date);
        prev.setDate(prev.getDate() - 7);
        return prev;
      },
    },
    [GRANULARITY.MONTH]: {
      label: "Monate",
      singular: "Monat",
      icon: "calendar_month",
      minDataPoints: 3,
      maxDataPoints: 120, // 10 Jahre
      unit: "M",
      formatLabel: (date) => {
        return date.toLocaleDateString("de-DE", {
          month: "short",
          year: "2-digit",
        });
      },
      formatFull: (date) => {
        return date.toLocaleDateString("de-DE", {
          month: "long",
          year: "numeric",
        });
      },
      getNext: (date) => {
        const next = new Date(date);
        next.setMonth(next.getMonth() + 1);
        return next;
      },
      getPrevious: (date) => {
        const prev = new Date(date);
        prev.setMonth(prev.getMonth() - 1);
        return prev;
      },
    },
    [GRANULARITY.YEAR]: {
      label: "Jahre",
      singular: "Jahr",
      icon: "event",
      minDataPoints: 2,
      maxDataPoints: 100,
      unit: "J",
      formatLabel: (date) => {
        return date.getFullYear().toString();
      },
      formatFull: (date) => {
        return `Jahr ${date.getFullYear()}`;
      },
      getNext: (date) => {
        const next = new Date(date);
        next.setFullYear(next.getFullYear() + 1);
        return next;
      },
      getPrevious: (date) => {
        const prev = new Date(date);
        prev.setFullYear(prev.getFullYear() - 1);
        return prev;
      },
    },
    [GRANULARITY.DECADE]: {
      label: "Jahrzehnte",
      singular: "Jahrzehnt",
      icon: "event_available",
      minDataPoints: 2,
      maxDataPoints: 20,
      unit: "Dek",
      formatLabel: (date) => {
        const year = date.getFullYear();
        const decade = Math.floor(year / 10) * 10;
        return `${decade}er`;
      },
      formatFull: (date) => {
        const year = date.getFullYear();
        const decade = Math.floor(year / 10) * 10;
        return `${decade}–${decade + 9}`;
      },
      getNext: (date) => {
        const next = new Date(date);
        next.setFullYear(next.getFullYear() + 10);
        return next;
      },
      getPrevious: (date) => {
        const prev = new Date(date);
        prev.setFullYear(prev.getFullYear() - 10);
        return prev;
      },
    },
    [GRANULARITY.CENTURY]: {
      label: "Jahrhunderte",
      singular: "Jahrhundert",
      icon: "history",
      minDataPoints: 2,
      maxDataPoints: 10,
      unit: "Jh",
      formatLabel: (date) => {
        const year = date.getFullYear();
        const century = Math.ceil(year / 100);
        return `${century}. Jh.`;
      },
      formatFull: (date) => {
        const year = date.getFullYear();
        const century = Math.ceil(year / 100);
        const centuryStart = (century - 1) * 100;
        return `${century}. Jahrhundert (${centuryStart}–${centuryStart + 99})`;
      },
      getNext: (date) => {
        const next = new Date(date);
        next.setFullYear(next.getFullYear() + 100);
        return next;
      },
      getPrevious: (date) => {
        const prev = new Date(date);
        prev.setFullYear(prev.getFullYear() - 100);
        return prev;
      },
    },
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Berechnet die ISO-Kalenderwoche
   */
  function getWeekNumber(date) {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  /**
   * Generiert Zeitraum-Labels basierend auf Granularität
   */
  function generateTimeRangeLabel(startDate, endDate, granularity) {
    const config = GRANULARITY_CONFIG[granularity];
    if (!config) return `${startDate.getFullYear()} - ${endDate.getFullYear()}`;

    // Für kurze Zeiträume: Start - Ende
    if (granularity === GRANULARITY.HOUR || granularity === GRANULARITY.DAY) {
      if (isSameDay(startDate, endDate)) {
        return config.formatFull(startDate);
      }
      return `${config.formatLabel(startDate)} – ${config.formatLabel(endDate)}`;
    }

    // Für mittlere Zeiträume: Monat Jahr
    if (granularity === GRANULARITY.WEEK || granularity === GRANULARITY.MONTH) {
      if (startDate.getFullYear() === endDate.getFullYear()) {
        return `${config.formatLabel(startDate)} – ${config.formatLabel(endDate)}`;
      }
      return `${config.formatFull(startDate)} – ${config.formatFull(endDate)}`;
    }

    // Für lange Zeiträume: Jahr/Jahrzehnt/Jahrhundert
    return `${config.formatFull(startDate)} – ${config.formatFull(endDate)}`;
  }

  /**
   * Prüft ob zwei Daten am gleichen Tag sind
   */
  function isSameDay(date1, date2) {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  /**
   * Berechnet die optimale Granularität basierend auf Zeitspanne
   */
  function detectOptimalGranularity(startDate, endDate) {
    const diffMs = endDate - startDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 7) return GRANULARITY.HOUR;
    if (diffDays <= 31) return GRANULARITY.DAY;
    if (diffDays <= 90) return GRANULARITY.WEEK;
    if (diffDays <= 730) return GRANULARITY.MONTH;
    if (diffDays <= 3650) return GRANULARITY.YEAR;
    if (diffDays <= 36500) return GRANULARITY.DECADE;
    return GRANULARITY.CENTURY;
  }

  /**
   * Aggregiert Daten basierend auf Granularität
   */
  function aggregateDataByGranularity(data, granularity) {
    if (!data || data.length === 0) return [];

    const config = GRANULARITY_CONFIG[granularity];
    if (!config) return data;

    // Gruppierung nach Zeiteinheit
    const groups = new Map();

    data.forEach((item) => {
      const date = new Date(item.date);
      let key;

      switch (granularity) {
        case GRANULARITY.HOUR:
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case GRANULARITY.DAY:
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case GRANULARITY.WEEK:
          key = `${date.getFullYear()}-W${getWeekNumber(date)}`;
          break;
        case GRANULARITY.MONTH:
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
        case GRANULARITY.YEAR:
          key = `${date.getFullYear()}`;
          break;
        case GRANULARITY.DECADE:
          key = `${Math.floor(date.getFullYear() / 10) * 10}`;
          break;
        case GRANULARITY.CENTURY:
          key = `${Math.floor(date.getFullYear() / 100) * 100}`;
          break;
        default:
          key = item.date;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });

    // Aggregation der Gruppen
    const aggregated = [];
    groups.forEach((items, key) => {
      const aggregatedItem = {
        date: items[0].date,
        temp_avg: average(
          items.map((i) => i.temp_avg).filter((v) => v != null),
        ),
        temp_min: Math.min(
          ...items.map((i) => i.temp_min).filter((v) => v != null),
        ),
        temp_max: Math.max(
          ...items.map((i) => i.temp_max).filter((v) => v != null),
        ),
        precip: sum(items.map((i) => i.precip).filter((v) => v != null)),
        wind_speed: average(
          items.map((i) => i.wind_speed).filter((v) => v != null),
        ),
        humidity: average(
          items.map((i) => i.humidity).filter((v) => v != null),
        ),
        sunshine: sum(items.map((i) => i.sunshine).filter((v) => v != null)),
        count: items.length,
      };
      aggregated.push(aggregatedItem);
    });

    return aggregated.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function average(values) {
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  function sum(values) {
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0);
  }

  // ============================================
  // ZEITRAUM-PRESETS
  // ============================================

  function generateTimeRangePresets() {
    const now = new Date();
    const presets = [];

    // Letzte 24 Stunden
    presets.push({
      id: "last-24h",
      label: "Letzte 24 Stunden",
      granularity: GRANULARITY.HOUR,
      startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      endDate: now,
    });

    // Letzte 7 Tage
    presets.push({
      id: "last-7d",
      label: "Letzte 7 Tage",
      granularity: GRANULARITY.DAY,
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: now,
    });

    // Letzter Monat
    presets.push({
      id: "last-month",
      label: "Letzter Monat",
      granularity: GRANULARITY.DAY,
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDate: new Date(now.getFullYear(), now.getMonth(), 0),
    });

    // Letztes Jahr
    presets.push({
      id: "last-year",
      label: "Letztes Jahr",
      granularity: GRANULARITY.MONTH,
      startDate: new Date(now.getFullYear() - 1, 0, 1),
      endDate: new Date(now.getFullYear() - 1, 11, 31),
    });

    // Letzte 10 Jahre
    presets.push({
      id: "last-decade",
      label: "Letzte 10 Jahre",
      granularity: GRANULARITY.YEAR,
      startDate: new Date(now.getFullYear() - 10, 0, 1),
      endDate: now,
    });

    return presets;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  const TimeRangeSystem = {
    GRANULARITY,
    GRANULARITY_CONFIG,
    generateTimeRangeLabel,
    detectOptimalGranularity,
    aggregateDataByGranularity,
    generateTimeRangePresets,
    getWeekNumber,
  };

  // Export
  if (typeof module !== "undefined" && module.exports) {
    module.exports = TimeRangeSystem;
  } else {
    global.TimeRangeSystem = TimeRangeSystem;
  }
})(typeof window !== "undefined" ? window : global);
