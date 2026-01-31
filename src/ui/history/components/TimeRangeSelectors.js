/**
 * TimeRangeSelectors.js
 * Granularitäts-spezifische UI-Komponenten für Zeitraum-Auswahl
 *
 * - Stunden: Scrollrad/Time Picker
 * - Tage: Mini-Kalender
 * - Wochen: Kalender mit Wochen-Hervorhebung
 * - Monate: 12-Monats-Grid
 * - Jahre: Scrollrad mit Jahren
 * - Jahrzehnte: Liste
 * - Jahrhunderte: Liste
 */

(function (global) {
  "use strict";

  /**
   * Render Hour Picker (Scrollrad-Style)
   */
  function renderHourPicker(
    currentPeriod,
    periodType,
    availableDataRange = null,
  ) {
    const TRS = window.TimeRangeSystem;
    if (!TRS) return "";

    const now = new Date();
    const hours = [];

    // Verwende availableDataRange falls vorhanden, sonst letzte 48 Stunden
    const startLimit = availableDataRange?.startDate
      ? new Date(availableDataRange.startDate)
      : new Date(now.getTime() - 48 * 3600000);
    const endLimit = availableDataRange?.endDate
      ? new Date(availableDataRange.endDate)
      : now;

    // Generiere Stunden-Liste innerhalb verfügbarer Daten (max 48 Stunden)
    const hoursDiff = Math.min(
      48,
      Math.floor((endLimit - startLimit) / 3600000),
    );
    for (let i = 0; i < hoursDiff; i++) {
      const date = new Date(endLimit);
      date.setHours(date.getHours() - i);
      if (date >= startLimit) {
        hours.push(date);
      }
    }

    return `
      <div class="time-picker time-picker--hour">
        <div class="time-picker__container">
          ${hours
            .map((date, i) => {
              const hourLabel = date.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const dayLabel = date.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
              });
              const isActive = i === 0;

              return `
              <button class="time-picker__item ${isActive ? "time-picker__item--active" : ""}"
                      data-period-id="hour-${i}"
                      data-period-type="${periodType}"
                      data-start-date="${date.toISOString()}"
                      data-end-date="${new Date(date.getTime() + 3600000).toISOString()}"
                      data-granularity="hour">
                <span class="time-picker__time">${hourLabel}</span>
                <span class="time-picker__date">${dayLabel}</span>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Render Day Calendar (Mini-Kalender)
   */
  function renderDayCalendar(
    currentPeriod,
    periodType,
    availableDataRange = null,
  ) {
    // Bestimme aktuellen Monat basierend auf verfügbaren Daten oder jetzt
    // Verwende currentViewDate falls vorhanden (für Navigation)
    const viewDate = availableDataRange?.currentViewDate
      ? new Date(availableDataRange.currentViewDate)
      : availableDataRange?.endDate
        ? new Date(availableDataRange.endDate)
        : new Date();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mo=0, So=6

    const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const monthName = viewDate.toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
    });

    const calendar = [];

    // Padding für erste Woche
    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push(null);
    }

    // Tage des Monats
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(day);
    }

    return `
      <div class="day-calendar">
        <div class="day-calendar__header">
          <button class="day-calendar__nav" data-action="prev-month">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <h4 class="day-calendar__title">${monthName}</h4>
          <button class="day-calendar__nav" data-action="next-month">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div class="day-calendar__weekdays">
          ${weekDays.map((d) => `<div class="day-calendar__weekday">${d}</div>`).join("")}
        </div>

        <div class="day-calendar__grid">
          ${calendar
            .map((day, index) => {
              if (day === null) {
                return `<div class="day-calendar__cell day-calendar__cell--empty"></div>`;
              }

              const date = new Date(year, month, day);
              const isToday =
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();
              const endDate = new Date(date);
              endDate.setHours(23, 59, 59, 999);

              return `
              <button class="day-calendar__cell ${isToday ? "day-calendar__cell--today" : ""}"
                      data-period-id="day-${year}-${month + 1}-${day}"
                      data-period-type="${periodType}"
                      data-start-date="${date.toISOString()}"
                      data-end-date="${endDate.toISOString()}"
                      data-granularity="day">
                <span class="day-calendar__number">${day}</span>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Render Week Calendar (Kalender mit Wochen-Hervorhebung)
   */
  function renderWeekCalendar(
    currentPeriod,
    periodType,
    availableDataRange = null,
  ) {
    const TRS = window.TimeRangeSystem;
    if (!TRS) return "";

    // Verwende verfügbare Daten-Range oder aktuelles Datum
    // Verwende currentViewDate falls vorhanden (für Navigation)
    const viewDate = availableDataRange?.currentViewDate
      ? new Date(availableDataRange.currentViewDate)
      : availableDataRange?.endDate
        ? new Date(availableDataRange.endDate)
        : new Date();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const monthName = viewDate.toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
    });

    // Gruppiere Tage nach Wochen
    const weeks = [];
    let currentWeek = [];

    // Padding
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    }

    // Rest auffüllen
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return `
      <div class="week-calendar">
        <div class="week-calendar__header">
          <button class="week-calendar__nav" data-action="prev-month">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <h4 class="week-calendar__title">${monthName}</h4>
          <button class="week-calendar__nav" data-action="next-month">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div class="week-calendar__weekdays">
          ${weekDays.map((d) => `<div class="week-calendar__weekday">${d}</div>`).join("")}
        </div>

        <div class="week-calendar__weeks">
          ${weeks
            .map((week, weekIndex) => {
              const firstDayOfWeek = week.find((d) => d !== null);
              if (!firstDayOfWeek) return "";

              const weekDate = new Date(year, month, firstDayOfWeek);
              const weekNumber = TRS.getWeekNumber(weekDate);
              const weekStart = new Date(weekDate);
              weekStart.setDate(
                weekStart.getDate() -
                  weekStart.getDay() +
                  (weekStart.getDay() === 0 ? -6 : 1),
              );
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              weekEnd.setHours(23, 59, 59, 999);

              const today = new Date();

              return `
              <div class="week-calendar__week"
                   data-period-id="week-${weekNumber}-${year}"
                   data-period-type="${periodType}"
                   data-start-date="${weekStart.toISOString()}"
                   data-end-date="${weekEnd.toISOString()}"
                   data-granularity="week">
                <div class="week-calendar__week-number">KW ${weekNumber}</div>
                <div class="week-calendar__days">
                  ${week
                    .map((day) => {
                      if (day === null)
                        return `<div class="week-calendar__day week-calendar__day--empty"></div>`;
                      const isToday =
                        day === today.getDate() &&
                        month === today.getMonth() &&
                        year === today.getFullYear();
                      return `<div class="week-calendar__day ${isToday ? "week-calendar__day--today" : ""}">${day}</div>`;
                    })
                    .join("")}
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Render Month Grid (12 Monate)
   */
  function renderMonthGrid(
    currentPeriod,
    periodType,
    availableDataRange = null,
  ) {
    // Verwende letztes verfügbares Jahr oder aktuelles Jahr
    // Verwende currentViewDate falls vorhanden (für Navigation)
    const viewDate = availableDataRange?.currentViewDate
      ? new Date(availableDataRange.currentViewDate)
      : availableDataRange?.endDate
        ? new Date(availableDataRange.endDate)
        : new Date();
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const months = [
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

    return `
      <div class="month-grid">
        <div class="month-grid__year-selector">
          <button class="month-grid__nav" data-action="prev-year">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <h4 class="month-grid__year" data-year="${currentYear}">${currentYear}</h4>
          <button class="month-grid__nav" data-action="next-year">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div class="month-grid__container">
          ${months
            .map((monthName, index) => {
              const isCurrent =
                index === currentMonth &&
                currentYear === new Date().getFullYear();
              const monthStart = new Date(currentYear, index, 1);
              const monthEnd = new Date(
                currentYear,
                index + 1,
                0,
                23,
                59,
                59,
                999,
              );

              return `
              <button class="month-grid__item ${isCurrent ? "month-grid__item--current" : ""}"
                      data-period-id="month-${currentYear}-${index + 1}"
                      data-period-type="${periodType}"
                      data-start-date="${monthStart.toISOString()}"
                      data-end-date="${monthEnd.toISOString()}"
                      data-granularity="month">
                <span class="month-grid__name">${monthName}</span>
                <span class="month-grid__number">${index + 1}</span>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Render Year Picker (Scrollrad mit Jahren)
   */
  function renderYearPicker(
    currentPeriod,
    periodType,
    availableDataRange = null,
  ) {
    const currentYear = new Date().getFullYear();
    const years = [];

    // Bestimme Jahr-Range basierend auf verfügbaren Daten
    // Open-Meteo Archive API hat Daten ab 1940
    const startYear = availableDataRange?.startDate
      ? new Date(availableDataRange.startDate).getFullYear()
      : 1940;
    const endYear = availableDataRange?.endDate
      ? new Date(availableDataRange.endDate).getFullYear()
      : currentYear;

    // Generiere Jahr-Liste von endYear bis startYear
    for (let y = endYear; y >= startYear; y--) {
      years.push(y);
    }

    return `
      <div class="year-picker">
        <div class="year-picker__container">
          ${years
            .map((year, index) => {
              const isCurrent = year === currentYear;
              const yearStart = new Date(year, 0, 1);
              const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

              return `
              <button class="year-picker__item ${isCurrent ? "year-picker__item--current" : ""}"
                      data-period-id="year-${year}"
                      data-period-type="${periodType}"
                      data-start-date="${yearStart.toISOString()}"
                      data-end-date="${yearEnd.toISOString()}"
                      data-granularity="year">
                ${year}
              </button>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Render Decade List
   */
  function renderDecadeList(currentPeriod, periodType) {
    const currentYear = new Date().getFullYear();
    const currentDecade = Math.floor(currentYear / 10) * 10;
    const decades = [];

    // 20 Jahrzehnte: 10 zurück, aktuelles, 9 voraus
    for (let i = -10; i <= 9; i++) {
      decades.push(currentDecade + i * 10);
    }

    return `
      <div class="decade-list">
        <h4 class="decade-list__title">Jahrzehnte auswählen</h4>
        <div class="decade-list__container">
          ${decades
            .map((decade) => {
              const isCurrent = decade === currentDecade;
              const decadeStart = new Date(decade, 0, 1);
              const decadeEnd = new Date(decade + 9, 11, 31, 23, 59, 59, 999);

              return `
              <button class="decade-list__item ${isCurrent ? "decade-list__item--current" : ""}"
                      data-period-id="decade-${decade}"
                      data-period-type="${periodType}"
                      data-start-date="${decadeStart.toISOString()}"
                      data-end-date="${decadeEnd.toISOString()}"
                      data-granularity="decade">
                <span class="decade-list__label">${decade}er</span>
                <span class="decade-list__range">${decade} - ${decade + 9}</span>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Render Century List
   */
  function renderCenturyList(currentPeriod, periodType) {
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const centuries = [];

    // 10 Jahrhunderte: 5 zurück, aktuelles, 4 voraus
    for (let i = -5; i <= 4; i++) {
      centuries.push(currentCentury + i * 100);
    }

    return `
      <div class="century-list">
        <h4 class="century-list__title">Jahrhunderte auswählen</h4>
        <div class="century-list__container">
          ${centuries
            .map((century) => {
              const isCurrent = century === currentCentury;
              const centuryStart = new Date(century, 0, 1);
              const centuryEnd = new Date(
                century + 99,
                11,
                31,
                23,
                59,
                59,
                999,
              );
              const centuryLabel =
                century < 0
                  ? `${Math.abs(century)} v. Chr.`
                  : `${century + 1}. Jahrhundert`;

              return `
              <button class="century-list__item ${isCurrent ? "century-list__item--current" : ""}"
                      data-period-id="century-${century}"
                      data-period-type="${periodType}"
                      data-start-date="${centuryStart.toISOString()}"
                      data-end-date="${centuryEnd.toISOString()}"
                      data-granularity="century">
                <span class="century-list__label">${centuryLabel}</span>
                <span class="century-list__range">${century} - ${century + 99}</span>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Get selector for granularity
   * @param {string} granularity - hour/day/week/month/year/decade/century
   * @param {string} currentPeriod - Currently selected period ID
   * @param {string} periodType - 'A' or 'B'
   * @param {Object} availableDataRange - {startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD'}
   */
  function getSelectorForGranularity(
    granularity,
    currentPeriod,
    periodType,
    availableDataRange = null,
  ) {
    switch (granularity) {
      case "hour":
        return renderHourPicker(currentPeriod, periodType, availableDataRange);
      case "day":
        return renderDayCalendar(currentPeriod, periodType, availableDataRange);
      case "week":
        return renderWeekCalendar(
          currentPeriod,
          periodType,
          availableDataRange,
        );
      case "month":
        return renderMonthGrid(currentPeriod, periodType, availableDataRange);
      case "year":
        return renderYearPicker(currentPeriod, periodType, availableDataRange);
      case "decade":
        return renderDecadeList(currentPeriod, periodType, availableDataRange);
      case "century":
        return renderCenturyList(currentPeriod, periodType, availableDataRange);
      default:
        return "";
    }
  }

  // Export
  global.TimeRangeSelectors = {
    renderHourPicker,
    renderDayCalendar,
    renderWeekCalendar,
    renderMonthGrid,
    renderYearPicker,
    renderDecadeList,
    renderCenturyList,
    getSelectorForGranularity,
  };
})(typeof window !== "undefined" ? window : this);
