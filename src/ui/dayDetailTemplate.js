(function () {
  function buildDetailTemplate(payload) {
    const day = payload.day || {};
    const units = payload.units || { temperature: "C", wind: "km/h" };
    const representative = pickRepresentativeHour(day);
    const condition =
      day.summary?.condition || representative?.description || "Wetter";
    const precipChance = resolvePrecipChance(day);
    const heroMeta = buildHeroMeta(day);
    const icon = renderIcon(representative, condition);
    return `
      <section class="detail-hero">
        <div class="detail-hero-top">
          ${
            payload.backButton !== false
              ? '<button class="detail-back-btn" type="button" data-detail-close>← Übersicht</button>'
              : ""
          }
          <span class="detail-day-chip">${escapeHtml(day.label || "")}</span>
        </div>
        <div class="detail-hero-body">
          <div>
            <p class="detail-city">${escapeHtml(payload.city || "Dein Ort")}</p>
            <p class="detail-temp">${formatTemp(
              day.summary?.tempMax,
              units
            )}<span>${formatTemp(day.summary?.tempMin, units)}</span></p>
            <p class="detail-condition">${escapeHtml(condition)}</p>
            <p class="detail-hero-meta">${precipChance} · ${escapeHtml(
      heroMeta
    )}</p>
          </div>
          <div class="detail-hero-icon">${icon}</div>
        </div>
      </section>
      <section class="detail-hourly">
        <h2>Stündliche Vorhersage</h2>
        ${renderHourlyChips(day, units)}
      </section>
      <section class="detail-metrics">
        <h2>Messwerte & Hinweise</h2>
        <div class="detail-metrics-grid">
          ${renderMetricCards(payload)}
        </div>
      </section>
      <p class="detail-footer-note">Quellen: Open-Meteo · Google Wetter-Icons</p>
    `;
  }

  function renderHourlyChips(day, units) {
    const series =
      Array.isArray(day.hourGrid) && day.hourGrid.length
        ? day.hourGrid
        : Array.isArray(day.hours)
        ? day.hours
        : [];
    if (!series.length) {
      return '<p class="detail-error">Keine Stundenwerte verfügbar.</p>';
    }
    const subset = series
      .filter((slot) => slot && (typeof slot.hour === "number" || slot.time))
      .slice(0, 12);
    if (!subset.length) {
      return '<p class="detail-error">Keine Stundenwerte verfügbar.</p>';
    }
    // Debug: Log first slot to see if precipitationProbability exists
    console.log(
      "[DayDetail] First hourly slot keys:",
      Object.keys(subset[0] || {})
    );
    console.log(
      "[DayDetail] precipitationProbability:",
      subset[0]?.precipitationProbability
    );
    console.log("[DayDetail] precipProb:", subset[0]?.precipProb);
    return `
      <div class="hour-chip-row">
        ${subset
          .map((slot) => {
            const hourLabel = formatHour(slot);
            // Prüfe alle möglichen Feldnamen für Regenwahrscheinlichkeit
            let precipProb = null;
            if (typeof slot.precipitationProbability === "number") {
              precipProb = slot.precipitationProbability;
            } else if (typeof slot.precipProb === "number") {
              precipProb = slot.precipProb;
            } else if (typeof slot.precipitation_probability === "number") {
              precipProb = slot.precipitation_probability;
            }
            // Zeige immer an wenn ein gültiger Wert (auch 0) vorhanden ist
            const showPrecip = precipProb !== null;
            return `
              <article class="hour-chip">
                <strong>${hourLabel}</strong>
                ${renderIcon(slot, slot.description)}
                <span>${formatTemp(
                  typeof slot.temperature === "number"
                    ? slot.temperature
                    : slot.temp,
                  units
                )}</span>
                ${
                  showPrecip
                    ? `<span class="hour-chip__precip">💧${Math.round(
                        precipProb
                      )}%</span>`
                    : ""
                }
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderMetricCards(payload) {
    const day = payload.day || {};
    const units = payload.units || { temperature: "C", wind: "km/h" };
    const firstSlot = (day.hourGrid && day.hourGrid[0]) || day.hours?.[0] || {};
    const metrics = [
      {
        title: "Luftdruck",
        value: formatNumber(firstSlot.pressure, " hPa"),
        hint: "Meeresspiegeldruck",
      },
      {
        title: "Sichtweite",
        value: formatVisibility(firstSlot.visibility),
        hint: "geschätzt",
      },
      {
        title: "Wind",
        value: formatWind(firstSlot.windSpeed, units),
        hint: firstSlot.windDirection
          ? `${Math.round(firstSlot.windDirection)}°`
          : "",
      },
      {
        title: "UV-Index",
        value: formatNumber(day.summary?.uvIndexMax, "", 1),
        hint: "Tagesmaximum",
      },
      {
        title: "AQI",
        value: formatAqi(payload.airQuality),
        hint: "europäisch",
      },
      {
        title: "Niederschlag",
        value: formatNumber(day.summary?.precipitationSum, " mm", 1),
        hint: "Gesamtsumme",
      },
      {
        title: "Mond",
        value: formatMoon(payload.moonPhase),
        hint: formatMoonHint(payload.moonPhase),
      },
      {
        title: "Bedeckungsgrad",
        value: formatPercent(
          day.summary?.cloudCoverAvg ?? day.summary?.humidityAvg
        ),
        hint: "durchschnittlich",
      },
    ];

    return metrics
      .map(
        (metric) => `
        <article class="metric-card">
          <h3>${escapeHtml(metric.title)}</h3>
          <strong>${escapeHtml(metric.value)}</strong>
          ${metric.hint ? `<small>${escapeHtml(metric.hint)}</small>` : ""}
        </article>
      `
      )
      .join("");
  }

  function pickRepresentativeHour(day) {
    if (Array.isArray(day.hourGrid) && day.hourGrid.length) {
      return (
        day.hourGrid.find((slot) => slot.hour === 12) ||
        day.hourGrid.find((slot) => slot.isDay) ||
        day.hourGrid[0]
      );
    }
    if (Array.isArray(day.hours) && day.hours.length) {
      return day.hours[0];
    }
    return day;
  }

  function renderIcon(entry, label) {
    const mapper = window.weatherIconMapper;
    const code = entry?.weathercode ?? entry?.weatherCode;
    const isDay = entry?.isDay ?? entry?.is_day ?? 1;
    if (mapper && typeof mapper.resolveIconByCode === "function") {
      const descriptor = mapper.resolveIconByCode(code, isDay);
      if (descriptor?.path) {
        return `<img src="${descriptor.path}" alt="${escapeHtml(
          label || "Wetter"
        )}" />`;
      }
    }
    const emoji = entry?.emoji || "☁️";
    return `<span class="icon-fallback" role="img" aria-label="${escapeHtml(
      label || "Wetter"
    )}">${escapeHtml(emoji)}</span>`;
  }

  function resolvePrecipChance(day) {
    const timeline = Array.isArray(day.precipitationTimeline)
      ? day.precipitationTimeline
      : [];
    const maxProb = timeline.reduce((max, slot) => {
      if (typeof slot?.probability === "number") {
        return Math.max(max, slot.probability);
      }
      return max;
    }, 0);
    if (maxProb > 0) {
      return `${Math.round(maxProb)}% Regenchance`;
    }
    if (typeof day.summary?.precipitationProbability === "number") {
      return `${Math.round(day.summary.precipitationProbability)}% Regenchance`;
    }
    return `${formatNumber(
      day.summary?.precipitationSum,
      " mm",
      1
    )} Niederschlag`;
  }

  function buildHeroMeta(day) {
    const sunrise = formatTime(day.sun?.sunrise);
    const sunset = formatTime(day.sun?.sunset);
    if (sunrise || sunset) {
      return `${sunrise || "--"} · ${sunset || "--"}`;
    }
    return "Tagesverlauf";
  }

  function formatTemp(value, units) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return `--°${units.temperature || "C"}`;
    }
    return `${Math.round(value)}°${units.temperature || "C"}`;
  }

  function formatWind(value, units) {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    const suffix =
      units.wind === "mph" ? " mph" : units.wind === "m/s" ? " m/s" : " km/h";
    const numeric = units.wind === "m/s" ? value.toFixed(1) : Math.round(value);
    return `${numeric}${suffix}`;
  }

  function formatVisibility(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    const inKm = value > 100 ? value / 1000 : value;
    return `${Math.round(inKm)} km`;
  }

  function formatAqi(airQuality) {
    const value =
      airQuality?.european?.value || airQuality?.us?.value || airQuality?.value;
    if (!value) return "--";
    const label = airQuality?.european?.label || airQuality?.us?.label || "";
    return `${Math.round(value)}${label ? ` · ${label}` : ""}`;
  }

  function formatMoon(moonPhase) {
    if (!moonPhase) return "--";
    const phase = moonPhase.phase || "Mond";
    const illumination = formatPercent(moonPhase.illumination);
    return `${phase}${illumination ? ` · ${illumination}` : ""}`;
  }

  function formatMoonHint(moonPhase) {
    if (!moonPhase) return "";
    const rise = formatTime(moonPhase.moonrise);
    const set = formatTime(moonPhase.moonset);
    if (rise || set) {
      return `${rise || "--"} / ${set || "--"}`;
    }
    return "";
  }

  function formatPercent(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    const normalized = value <= 1 ? value * 100 : value;
    return `${Math.round(normalized)}%`;
  }

  function formatNumber(value, suffix = "", precision = 0) {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    return `${value.toFixed(precision)}${suffix}`;
  }

  function formatTime(isoLike) {
    if (!isoLike) return "";
    const date = new Date(isoLike);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatHour(slot) {
    if (typeof slot?.hour === "number") {
      return `${String(slot.hour).padStart(2, "0")}:00`;
    }
    return formatTime(slot?.time) || "--";
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.dayDetailTemplate = Object.freeze({
    build: buildDetailTemplate,
  });
})();
