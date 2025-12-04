(function (global) {
  /**
   * Wetter-Icon basierend auf Code
   */
  function getWeatherIcon(code, isDay = true) {
    const icons = {
      0: isDay ? "☀️" : "🌙",
      1: isDay ? "🌤️" : "🌙",
      2: "⛅",
      3: "☁️",
      45: "🌫️",
      48: "🌫️",
      51: "🌦️",
      53: "🌦️",
      55: "🌧️",
      61: "🌧️",
      63: "🌧️",
      65: "🌧️",
      71: "🌨️",
      73: "🌨️",
      75: "❄️",
      80: "🌦️",
      81: "🌧️",
      82: "⛈️",
      95: "⛈️",
      96: "⛈️",
      99: "⛈️",
    };
    return icons[code] || "☁️";
  }

  /**
   * Wetter-Beschreibung basierend auf Code
   */
  function getWeatherDescription(code) {
    const descriptions = {
      0: "Klar",
      1: "Überwiegend klar",
      2: "Teilweise bewölkt",
      3: "Bedeckt",
      45: "Nebelig",
      48: "Nebel mit Reif",
      51: "Leichter Nieselregen",
      53: "Nieselregen",
      55: "Dichter Nieselregen",
      61: "Leichter Regen",
      63: "Regen",
      65: "Starker Regen",
      71: "Leichter Schneefall",
      73: "Schneefall",
      75: "Starker Schneefall",
      80: "Regenschauer",
      81: "Starke Regenschauer",
      82: "Heftige Regenschauer",
      95: "Gewitter",
      96: "Gewitter mit Hagel",
      99: "Starkes Gewitter mit Hagel",
    };
    return descriptions[code] || "Wechselhaft";
  }

  /**
   * Einsichten-Karte
   */
  function renderInsightsCard(appState) {
    const el = document.getElementById("insights-card");
    if (!el) return;

    const daily = (appState.daily && appState.daily[0]) || {};
    const current = appState.current || {};
    const tempDelta =
      daily.temperatureMax != null && daily.temperatureMin != null
        ? Math.round(daily.temperatureMax - daily.temperatureMin)
        : null;

    let insightText =
      "Heute sind keine größeren Wetterüberraschungen zu erwarten.";

    if (tempDelta != null && tempDelta >= 8) {
      insightText = `Heute sind große Temperaturschwankungen zu erwarten — Zieh dich im Zwiebel-Look an! (Δ ${tempDelta}°)`;
    } else if (current.humidity >= 80) {
      insightText = `Später werden schwüle Bedingungen mit einer Luftfeuchtigkeit von etwa ${Math.round(
        current.humidity
      )}% erwartet.`;
    }

    el.innerHTML = `
      <div class="insight-card">
        <div class="insight-card__header">
          <span class="insight-card__icon">🅰</span>
          <h2 class="insight-card__title">Einsichten</h2>
        </div>
        <p class="insight-card__text">${insightText}</p>
      </div>
    `;
  }

  /**
   * Tagesübersicht - aufklappbar
   */
  function renderDaySummaryCard(appState, healthState) {
    const el = document.getElementById("day-summary-card");
    if (!el) return;

    const daily = (appState.daily && appState.daily[0]) || {};
    const current = appState.current || {};
    const hourly = appState.hourly || [];

    // Finde Stunde mit höchster Luftfeuchtigkeit
    let maxHumidityHour = null;
    let maxHumidity = 0;
    hourly.forEach((h) => {
      if (h.humidity > maxHumidity) {
        maxHumidity = h.humidity;
        maxHumidityHour = h.time || h.timeLabel;
      }
    });

    const humidityTime = maxHumidityHour
      ? new Date(maxHumidityHour).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "später";

    // Bestimme Morgen-Beschreibung
    const morningTemp = current.temperature;
    let morningDesc = "Milder Start in den Tag.";
    if (morningTemp != null) {
      if (morningTemp < 5) morningDesc = "Kühler Start in den Tag.";
      else if (morningTemp < 10) morningDesc = "Frischer Start in den Tag.";
      else if (morningTemp > 20) morningDesc = "Warmer Start in den Tag.";
    }

    // Luftqualität
    const aqiLabel =
      healthState?.aqiLabel || "Heute ist die Luft im Freien angenehm.";

    // Temperaturbereich
    const min =
      daily.temperatureMin != null ? Math.round(daily.temperatureMin) : null;
    const max =
      daily.temperatureMax != null ? Math.round(daily.temperatureMax) : null;
    const tempRange =
      min != null && max != null
        ? `Erwarte einen Temperaturbereich von ${
            min < 0 ? min : min
          }° bis ${max}°.`
        : "";

    // Tageslänge
    const sunrise = daily.sunrise ? new Date(daily.sunrise) : null;
    const sunset = daily.sunset ? new Date(daily.sunset) : null;
    let daylightStr = "";
    if (sunrise && sunset) {
      const diffMs = sunset - sunrise;
      const hours = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      daylightStr = `Tageslänge: ${hours} Std ${mins} Min`;
    }

    el.innerHTML = `
      <div class="summary-card" data-expanded="true">
        <button class="summary-card__header" type="button" aria-expanded="true" aria-controls="summary-content">
          <div class="summary-card__title-row">
            <span class="summary-card__icon">📊</span>
            <h2 class="summary-card__title">Tagesübersicht</h2>
          </div>
          <span class="summary-card__chevron material-symbols-outlined">expand_less</span>
        </button>
        <div class="summary-card__content" id="summary-content">
          <p class="summary-card__intro">${morningDesc}</p>
          <ul class="summary-card__list">
            ${
              maxHumidity >= 80
                ? `<li>Um ${humidityTime} werden schwüle Bedingungen mit einer Luftfeuchtigkeit von ${Math.round(
                    maxHumidity
                  )}% erwartet.</li>`
                : ""
            }
            <li>${aqiLabel}</li>
            ${tempRange ? `<li>${tempRange}</li>` : ""}
            ${daylightStr ? `<li>${daylightStr}</li>` : ""}
          </ul>
        </div>
      </div>
    `;

    // Toggle-Logik
    const header = el.querySelector(".summary-card__header");
    const card = el.querySelector(".summary-card");
    if (header && card) {
      header.addEventListener("click", () => {
        const expanded = card.dataset.expanded === "true";
        card.dataset.expanded = (!expanded).toString();
        header.setAttribute("aria-expanded", (!expanded).toString());
      });
    }
  }

  /**
   * Stündliche Vorhersage - horizontal scrollbar
   */
  function renderHourlyForecastCard(appState) {
    const el = document.getElementById("hourly-forecast-card");
    if (!el) return;

    const hourly = appState.hourly || [];

    const items = hourly
      .slice(0, 24)
      .map((h, index) => {
        const time = h.time ? new Date(h.time) : null;
        const hourLabel = time
          ? time.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : h.timeLabel || "";
        const temp = h.temperature != null ? Math.round(h.temperature) : "–";
        const iconHtml =
          h.iconHtml || getWeatherIcon(h.weatherCode, h.isDay !== false);
        const isNow = index === 0;
        const precipProb =
          h.precipProb != null
            ? Math.round(h.precipProb)
            : h.precipitationProbability != null
            ? Math.round(h.precipitationProbability)
            : null;
        const showPrecip = precipProb != null;

        return `
        <div class="hourly-item ${isNow ? "hourly-item--now" : ""}">
          <span class="hourly-item__temp ${
            isNow ? "hourly-item__temp--highlight" : ""
          }">${temp}°</span>
          ${
            showPrecip
              ? `<span class="hourly-item__precip">💧${precipProb}%</span>`
              : ""
          }
          <span class="hourly-item__icon">${iconHtml}</span>
          <span class="hourly-item__time">${hourLabel}</span>
        </div>
      `;
      })
      .join("");

    el.innerHTML = `
      <div class="hourly-card">
        <div class="hourly-card__header">
          <span class="hourly-card__icon">🕐</span>
          <h2 class="hourly-card__title">Stündliche Vorhersage</h2>
        </div>
        <div class="hourly-card__scroll">
          ${items}
        </div>
      </div>
    `;
  }

  /**
   * Mehrtägige Vorhersage - klickbare Tage
   */
  function renderDailyForecastCard(appState) {
    const el = document.getElementById("daily-forecast-card");
    if (!el) return;

    const days = appState.daily || [];
    const locale = appState.locale || "de-DE";

    const formatDate = (isoDate) => {
      if (!isoDate) return { weekday: "", date: "" };
      const d = new Date(isoDate);
      return {
        weekday: d
          .toLocaleDateString(locale, { weekday: "short" })
          .toLowerCase(),
        date: d.toLocaleDateString(locale, {
          day: "2-digit",
          month: "2-digit",
        }),
      };
    };

    const items = days
      .slice(0, 7)
      .map((day, index) => {
        const { weekday, date } = formatDate(day.date || day.time);
        const isToday = index === 0;
        const max =
          day.temperatureMax != null ? Math.round(day.temperatureMax) : "–";
        const min =
          day.temperatureMin != null ? Math.round(day.temperatureMin) : "–";
        const precip =
          day.precipProbMax != null ? Math.round(day.precipProbMax) : 0;
        const iconHtml = day.iconHtml || getWeatherIcon(day.weatherCode, true);

        let precipClass = "daily-item__precip--low";
        if (precip >= 50) precipClass = "daily-item__precip--high";
        else if (precip >= 20) precipClass = "daily-item__precip--medium";

        return `
        <button class="daily-item" type="button" data-day-index="${index}" aria-label="Details für ${
          isToday ? "Heute" : weekday
        }">
          <span class="daily-item__max">${max}°</span>
          <span class="daily-item__min">${min}°</span>
          <span class="daily-item__icon">${iconHtml}</span>
          <span class="daily-item__precip ${precipClass}">💧${precip}%</span>
          <span class="daily-item__weekday">${
            isToday ? "Heute" : weekday
          }</span>
          <span class="daily-item__date">${date}</span>
        </button>
      `;
      })
      .join("");

    el.innerHTML = `
      <div class="daily-card">
        <div class="daily-card__header">
          <span class="daily-card__icon">📅</span>
          <h2 class="daily-card__title">Die nächsten Tage</h2>
        </div>
        <div class="daily-card__grid">
          ${items}
        </div>
      </div>
    `;

    // Click-Handler für Tage
    el.querySelectorAll(".daily-item").forEach((item) => {
      item.addEventListener("click", () => {
        const dayIndex = parseInt(item.dataset.dayIndex, 10);
        openDayDetailModal(appState, dayIndex);
      });
    });
  }

  /**
   * Öffnet das Detail-Modal für einen Tag
   */
  function openDayDetailModal(appState, dayIndex) {
    const day = appState.daily?.[dayIndex];
    if (!day) return;

    const hourly = appState.hourly || [];
    const locale = appState.locale || "de-DE";

    const dayDate = day.date || day.time;
    const targetDate = dayDate ? new Date(dayDate).toDateString() : null;
    const dayHours = targetDate
      ? hourly.filter((h) => new Date(h.time).toDateString() === targetDate)
      : [];

    const dateLabel = dayDate
      ? new Date(dayDate).toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : "Tag";

    const max =
      day.temperatureMax != null ? Math.round(day.temperatureMax) : "–";
    const min =
      day.temperatureMin != null ? Math.round(day.temperatureMin) : "–";
    const precip =
      day.precipProbMax != null ? Math.round(day.precipProbMax) : 0;
    const precipSum =
      day.precipitationSum != null ? day.precipitationSum.toFixed(1) : "0";
    const iconHtml = day.iconHtml || getWeatherIcon(day.weatherCode, true);
    const description =
      day.description || getWeatherDescription(day.weatherCode);

    const sunrise = day.sunrise
      ? new Date(day.sunrise).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "–";
    const sunset = day.sunset
      ? new Date(day.sunset).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "–";

    const hoursHtml = dayHours
      .slice(0, 12)
      .map((h) => {
        const time = new Date(h.time).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        });
        const temp = h.temperature != null ? Math.round(h.temperature) : "–";
        const icon =
          h.iconHtml || getWeatherIcon(h.weatherCode, h.isDay !== false);
        return `
        <div class="day-detail__hour">
          <span class="day-detail__hour-time">${time}</span>
          <span class="day-detail__hour-icon">${icon}</span>
          <span class="day-detail__hour-temp">${temp}°</span>
        </div>
      `;
      })
      .join("");

    const sheetId = "sheet-day-detail";
    let sheet = document.getElementById(sheetId);

    if (!sheet) {
      sheet = document.createElement("section");
      sheet.id = sheetId;
      sheet.className = "bottom-sheet bottom-sheet--full";
      sheet.setAttribute("aria-label", "Tagesdetails");
      document.getElementById("bottom-sheet-overlay")?.appendChild(sheet);
    }

    sheet.innerHTML = `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">📅</span>
        <div>
          <h2 class="bottom-sheet__title">${dateLabel}</h2>
          <p class="bottom-sheet__subtitle">${description}</p>
        </div>
        <button class="bottom-sheet__close" type="button" data-close-sheet aria-label="Schließen">
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="day-detail__hero">
          <div class="day-detail__main-icon">${iconHtml}</div>
          <div class="day-detail__temps">
            <span class="day-detail__max">↑ ${max}°</span>
            <span class="day-detail__min">↓ ${min}°</span>
          </div>
        </div>

        <div class="day-detail__stats">
          <div class="day-detail__stat">
            <span class="day-detail__stat-icon">🌧️</span>
            <span class="day-detail__stat-label">Niederschlag</span>
            <span class="day-detail__stat-value">${precip}% / ${precipSum} mm</span>
          </div>
          <div class="day-detail__stat">
            <span class="day-detail__stat-icon">🌅</span>
            <span class="day-detail__stat-label">Sonnenaufgang</span>
            <span class="day-detail__stat-value">${sunrise}</span>
          </div>
          <div class="day-detail__stat">
            <span class="day-detail__stat-icon">🌇</span>
            <span class="day-detail__stat-label">Sonnenuntergang</span>
            <span class="day-detail__stat-value">${sunset}</span>
          </div>
        </div>

        ${
          dayHours.length > 0
            ? `
          <div class="day-detail__hours-section">
            <h3 class="day-detail__section-title">Stündlich</h3>
            <div class="day-detail__hours-scroll">
              ${hoursHtml}
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    if (window.ModalController) {
      window.ModalController.openSheet(sheetId);
    }
  }

  /**
   * Metric Grid
   */
  function buildMetricCards(appState) {
    const current = appState.current || {};
    const hourly = appState.hourly || [];
    const today = (appState.daily && appState.daily[0]) || {};
    const windUnit = appState.windUnit || "km/h";
    const firstHour = hourly[0] || {};

    const cards = [];

    if (current.windSpeed != null) {
      cards.push({
        id: "wind",
        icon: "💨",
        label: "Wind",
        value: `${Math.round(current.windSpeed)} ${windUnit}`,
        subtitle: current.windDirectionLabel || "",
      });
    }

    const precipProb =
      current.precipProb ?? today.precipProbMax ?? firstHour.precipProb;
    if (precipProb != null) {
      cards.push({
        id: "precipitation",
        icon: "🌧️",
        label: "Niederschlag",
        value: `${Math.round(precipProb)}%`,
        subtitle: "Wahrscheinlichkeit",
      });
    }

    if (current.uvIndex != null) {
      let uvCategory = "Niedrig";
      if (current.uvIndex >= 3 && current.uvIndex <= 5) uvCategory = "Moderat";
      else if (current.uvIndex >= 6 && current.uvIndex <= 7)
        uvCategory = "Hoch";
      else if (current.uvIndex >= 8) uvCategory = "Sehr hoch";
      cards.push({
        id: "uv",
        icon: "☀️",
        label: "UV-Index",
        value: `${current.uvIndex}`,
        subtitle: uvCategory,
      });
    }

    const visibility = current.visibility ?? firstHour.visibility;
    if (visibility != null) {
      cards.push({
        id: "visibility",
        icon: "👁️",
        label: "Sichtweite",
        value: `${Math.round(visibility)} km`,
        subtitle:
          visibility > 10
            ? "Sehr gut"
            : visibility >= 5
            ? "Gut"
            : "Eingeschränkt",
      });
    }

    return cards;
  }

  function handleMetricClick(event, metricId) {
    if (window.ModalController?.open) {
      window.ModalController.open(metricId);
    }
  }

  function renderMetricGrid(appState) {
    const container = document.getElementById("metrics-grid");
    if (!container || !window.MetricCard) return;

    const cards = buildMetricCards(appState);
    window.MetricCard.renderMetricCards(
      container,
      cards.map((card) => ({ ...card, onClick: handleMetricClick }))
    );
  }

  function renderHomeCards(appState, healthState) {
    renderInsightsCard(appState);
    renderDaySummaryCard(appState, healthState);
    renderHourlyForecastCard(appState);
    renderDailyForecastCard(appState);
    renderMetricGrid(appState);
  }

  global.HomeCards = { renderHomeCards, openDayDetailModal };
})(window);
