/* Wetter-Anzeige Component */

class WeatherDisplayComponent {
  constructor(currentContainerId, forecastContainerId) {
    this.currentContainer = document.getElementById(currentContainerId);
    this.forecastContainer = document.getElementById(forecastContainerId);
    try {
      this._iconMapper =
        window?.weatherIconMapper || window?.iconMapper || window?.IconMapper;
    } catch (e) {
      this._iconMapper = null;
    }
    this.currentData = null;
    this.timeIntervalId = null;
    this._forecastDetailHandlers = null;
    this._detailEscapeHandler = null;
    this._forecastCarouselCleanup = null;
    this._forecastCarouselFrame = null;
  }

  displayCurrent(weatherData, city = "Standort") {
    if (!this.currentContainer) return;

    try {
      if (!weatherData) {
        this.showEmpty();
        return;
      }

      const open = weatherData.openMeteo || {};
      const bright = weatherData.brightSky || {};
      const openHourly = Array.isArray(open.hourly) ? open.hourly : [];
      const brightHourly = Array.isArray(bright.hourly) ? bright.hourly : [];
      const primarySeries = openHourly.length ? openHourly : brightHourly;
      const currentHour = primarySeries[0];

      if (!currentHour) {
        this.showError("Keine aktuellen Wetterdaten gefunden.");
        return;
      }

      const daySnapshot = Array.isArray(open.dayInsights)
        ? open.dayInsights[0]
        : null;
      const description =
        daySnapshot?.summary?.condition ||
        currentHour.description ||
        "Aktuelle Bedingungen";
      const feelsLike =
        typeof currentHour.feelsLike === "number"
          ? currentHour.feelsLike
          : currentHour.apparentTemperature;
      const dewPoint =
        typeof currentHour.dewPoint === "number"
          ? currentHour.dewPoint
          : daySnapshot?.summary?.dewPointAvg;
      const humidity =
        typeof currentHour.humidity === "number"
          ? currentHour.humidity
          : daySnapshot?.summary?.humidityAvg;
      const precipitationSum = daySnapshot?.summary?.precipitationSum;
      const precipitationProb = Array.isArray(
        daySnapshot?.precipitationTimeline
      )
        ? daySnapshot.precipitationTimeline.reduce((acc, slot) => {
            if (typeof slot?.probability !== "number") return acc;
            return Math.max(acc, slot.probability);
          }, 0)
        : currentHour.precipitationProbability || 0;
      const uvIndex =
        typeof daySnapshot?.summary?.uvIndexMax === "number"
          ? daySnapshot.summary.uvIndexMax
          : currentHour.uvIndex;
      const windCardinal = daySnapshot?.summary?.wind?.cardinal;
      const windDirection =
        windCardinal ||
        (typeof currentHour.windDirection === "number"
          ? `${Math.round(currentHour.windDirection)}°`
          : null);
      const airQuality = weatherData.airQuality;

      const highlightMetrics = [
        {
          label: "Taupunkt",
          value: this._formatTempValue(dewPoint),
          hint: "Tagesmittel",
        },
        {
          label: "Luftfeuchte",
          value: this._formatPercentValue(humidity),
          hint: "gemessen jetzt",
        },
        {
          label: "Niederschlag",
          value:
            typeof precipitationSum === "number"
              ? `${precipitationSum.toFixed(1)} mm`
              : this._formatMetricValue(currentHour.precipitation, " mm", 1),
          hint: `${Math.round(precipitationProb || 0)}% Wahrscheinlichkeit`,
        },
        {
          label: "Wind",
          value: this._formatWindValue(currentHour.windSpeed),
          hint: windDirection || "--",
        },
        {
          label: "UV Index",
          value:
            typeof uvIndex === "number" && !Number.isNaN(uvIndex)
              ? uvIndex.toFixed(1)
              : "--",
          hint: "Peak heute",
        },
        {
          label: "Luftdruck",
          value: this._formatMetricValue(currentHour.pressure, " hPa", 0),
          hint: "Meeresspiegeldruck",
        },
      ];

      const sunriseSunset = this._renderSunTrack(daySnapshot?.sun);
      const astroPanel = this._renderLocationAstro(
        weatherData.locationDetails,
        weatherData.sunEvents,
        weatherData.moonPhase
      );

      const heroBadges = [];
      if (typeof daySnapshot?.summary?.tempMax === "number") {
        heroBadges.push(
          `⬆️ Max ${this._formatTempValue(daySnapshot.summary.tempMax)}`
        );
      }
      if (typeof daySnapshot?.summary?.tempMin === "number") {
        heroBadges.push(
          `⬇️ Min ${this._formatTempValue(daySnapshot.summary.tempMin)}`
        );
      }
      if (typeof precipitationProb === "number" && precipitationProb > 0) {
        heroBadges.push(`☔ ${Math.round(precipitationProb)}% Regenchance`);
      }
      if (humidity && typeof humidity === "number") {
        heroBadges.push(`💧 ${Math.round(humidity)}% rel. Feuchte`);
      }
      if (airQuality?.european?.value) {
        heroBadges.push(
          `🫧 AQI ${Math.round(airQuality.european.value)} · ${
            airQuality.european.label || ""
          }`
        );
      } else if (airQuality?.us?.value) {
        heroBadges.push(
          `🫧 AQI ${Math.round(airQuality.us.value)} · ${
            airQuality.us.label || ""
          }`
        );
      }

      const heroBadgesHtml = heroBadges.length
        ? `<div class="hero-badges">${heroBadges
            .map((badge) => `<span class="tonal-pill">${badge}</span>`)
            .join("")}</div>`
        : "";

      const statsHtml = highlightMetrics
        .map(
          (metric) => `
            <article class="stat-pill">
              <span>${metric.label}</span>
              <strong>${metric.value || "--"}</strong>
              <small>${metric.hint || ""}</small>
            </article>
          `
        )
        .join("");

      const heroIcon = this._renderIcon(currentHour, {
        className: "current-icon",
        fallbackEmoji: currentHour.emoji,
        fallbackLabel: description,
      });
      const frogStage = this._renderFrogStage(description);

      const precipitationLabel =
        typeof precipitationSum === "number"
          ? `${precipitationSum.toFixed(1)} mm`
          : this._formatMetricValue(currentHour.precipitation, " mm", 1);

      const heroHtml = `
        <div class="hero-top">
          <div class="hero-copy">
            <p class="eyebrow">Jetzt in</p>
            <div class="location-header">
              <h2 class="location-name">${this._escapeHtml(city)}</h2>
              <button id="favoriteToggle" class="btn-icon favorite-toggle" data-city="${this._escapeHtml(
                city
              )}" aria-label="Favorit setzen">☆</button>
            </div>
            <p class="hero-temperature" id="current-temp">${this._formatTempValue(
              currentHour.temperature
            )}</p>
            <div class="hero-meta">
              <span id="current-desc">${this._escapeHtml(description)}</span>
              <small id="feels-like">Gefühlt ${
                typeof feelsLike === "number"
                  ? this._formatTempValue(feelsLike)
                  : "--"
              }</small>
              <small id="current-time"></small>
            </div>
          </div>
          <div class="hero-visual">
            <div class="hero-icon" id="current-emoji">${heroIcon}</div>
          </div>
        </div>
        ${frogStage}
        ${heroBadgesHtml}
        <div class="weather-details hero-details">
          <div class="detail-item">
            <span class="detail-label">💨 Wind</span>
            <span class="detail-value" id="wind-speed">${this._formatWindValue(
              currentHour.windSpeed
            )}${windDirection ? ` · ${windDirection}` : ""}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">💧 Luftfeuchte</span>
            <span class="detail-value" id="humidity">${this._formatPercentValue(
              humidity
            )}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">☔ Regen</span>
            <span class="detail-value">${precipitationLabel}</span>
          </div>
        </div>
        <div class="hero-stats">${statsHtml}</div>
        ${sunriseSunset || ""}
        ${astroPanel || ""}
      `;

      this.currentContainer.innerHTML = heroHtml;
      this.currentData = weatherData;

      try {
        this._renderDailyOverviewPanel(daySnapshot, currentHour, airQuality);
      } catch (panelError) {
        console.warn(
          "Tagesübersicht konnte nicht gerendert werden",
          panelError
        );
      }

      try {
        this._renderClimatePanels(currentHour, daySnapshot, airQuality);
      } catch (climateError) {
        console.warn(
          "Klima-Panels konnten nicht gerendert werden",
          climateError
        );
      }

      try {
        if (daySnapshot) {
          this._renderDailyInsightsPanel(daySnapshot);
        } else if (
          !Array.isArray(open.dayInsights) ||
          !open.dayInsights.length
        ) {
          this._renderDailyInsightsPanel(null);
        }
      } catch (insightError) {
        console.warn(
          "Daily Insights Panel konnte nicht gerendert werden",
          insightError
        );
      }
      this._updateCurrentTime();
      if (typeof window !== "undefined" && window.updateTopbarStatus) {
        window.updateTopbarStatus(city);
      }

      if (this.timeIntervalId) {
        clearInterval(this.timeIntervalId);
      }
      this.timeIntervalId = setInterval(() => this._updateCurrentTime(), 1000);

      const favBtn = document.getElementById("favoriteToggle");
      if (favBtn) {
        favBtn.dataset.city = city;
      }
      if (typeof window !== "undefined" && window.syncFavoriteToggleState) {
        window.syncFavoriteToggleState(city);
      }
    } catch (error) {
      console.error("Fehler beim Anzeigen der aktuellen Wetter:", error);
      this.currentContainer.innerHTML =
        "<p>Fehler beim Laden der Wetterdaten</p>";
    }
  }

  _renderIcon(entry, options = {}) {
    const fallbackEmoji =
      options.fallbackEmoji || entry?.emoji || options.fallbackLabel || "❓";
    const descriptor = this._resolveIconDescriptor(entry, options);
    const classes = ["wx-icon"];
    if (options.className) {
      classes.push(options.className);
    }

    if (!descriptor) {
      return `
        <span class="${classes.join(
          " "
        )}" role="img" aria-label="${this._escapeHtml(
        options.fallbackLabel || "Wetter Symbol"
      )}">
          ${this._escapeHtml(fallbackEmoji)}
        </span>
      `;
    }

    const ariaLabel =
      descriptor.label || options.fallbackLabel || "Wetter Icon";
    const theme =
      (options.forceTheme ||
        document.documentElement?.dataset?.theme ||
        "light") === "dark"
        ? "dark"
        : "light";

    if (descriptor.lottie) {
      return `
        <span class="${classes.join(
          " "
        )}" role="img" aria-label="${this._escapeHtml(ariaLabel)}">
          <lottie-player
            src="${descriptor.lottie[theme] || descriptor.lottie.light}"
            background="transparent"
            speed="1"
            loop
            autoplay
          ></lottie-player>
        </span>
      `;
    }

    if (descriptor.img) {
      return `
        <img
          src="${descriptor.img[theme] || descriptor.img.light}"
          class="${classes.join(" ")}"
          alt="${this._escapeHtml(ariaLabel)}"
          loading="lazy"
        />
      `;
    }

    return `
      <span class="${classes.join(
        " "
      )}" role="img" aria-label="${this._escapeHtml(ariaLabel)}">
        ${this._escapeHtml(fallbackEmoji)}
      </span>
    `;
  }

  _resolveIconDescriptor(entry, options = {}) {
    try {
      const explicitDescriptor =
        options.iconDescriptor || entry?.iconDescriptor;
      if (
        explicitDescriptor &&
        (explicitDescriptor.lottie || explicitDescriptor.img)
      ) {
        return explicitDescriptor;
      }

      const mapper =
        this._iconMapper ||
        window?.weatherIconMapper ||
        window?.iconMapper ||
        window?.IconMapper ||
        null;

      const directPath = this._extractIconPath(entry, options);
      if (directPath) {
        return this._buildStaticIconDescriptor(directPath, options);
      }

      if (!mapper) return null;

      const isDay = this._resolveDayFlag(entry, options);
      const weatherCode = this._resolveWeatherCode(entry);
      let resolved = null;

      if (
        typeof weatherCode === "number" &&
        typeof mapper.resolveIconByCode === "function"
      ) {
        resolved = mapper.resolveIconByCode(weatherCode, isDay);
      }

      if (!resolved && typeof mapper.resolveIconByKeyword === "function") {
        const keyword = this._resolveIconKeyword(entry, options);
        resolved = mapper.resolveIconByKeyword(keyword, isDay);
      }

      if (resolved && (resolved.path || resolved.img)) {
        if (resolved.img) {
          return resolved;
        }
        const label = resolved.alt || resolved.label || options.fallbackLabel;
        return this._buildStaticIconDescriptor(resolved.path, {
          ...options,
          fallbackLabel: label,
        });
      }

      return null;
    } catch (err) {
      console.warn("Icon Descriptor konnte nicht bestimmt werden", err);
      return null;
    }
  }

  _extractIconPath(entry, options = {}) {
    const direct = options.iconPath || entry?.iconPath;
    if (typeof direct === "string" && direct.trim()) {
      return direct.trim();
    }
    if (typeof entry?.icon === "string" && entry.icon.includes("/")) {
      return entry.icon;
    }
    if (typeof entry?.iconUrl === "string") {
      return entry.iconUrl;
    }
    return null;
  }

  _buildStaticIconDescriptor(path, options = {}) {
    if (!path) return null;
    const label = options.fallbackLabel || options.fallbackEmoji || "Wetter";
    const normalized = path.trim();
    const darkVariant = normalized.includes("/light/")
      ? normalized.replace("/light/", "/dark/")
      : normalized;
    return {
      label,
      img: {
        light: normalized,
        dark: darkVariant,
      },
    };
  }

  _resolveDayFlag(entry, options = {}) {
    const candidates = [
      options.isDay,
      entry?.isDay,
      entry?.is_day,
      entry?.isday,
      entry?.is_night !== undefined ? (entry.is_night ? 0 : 1) : undefined,
    ];
    for (const value of candidates) {
      if (typeof value === "number" && !Number.isNaN(value)) {
        return value;
      }
      if (typeof value === "boolean") {
        return value ? 1 : 0;
      }
    }

    const timeInput = entry?.time || entry?.date || entry?.timestamp;
    if (timeInput) {
      const parsed = new Date(timeInput);
      if (!Number.isNaN(parsed.getTime())) {
        const hour = parsed.getHours();
        return hour >= 6 && hour <= 20 ? 1 : 0;
      }
    }

    return undefined;
  }

  _resolveWeatherCode(entry) {
    const keys = [
      "weatherCode",
      "weather_code",
      "weathercode",
      "code",
      "iconCode",
      "icon_id",
      "iconId",
      "symbol",
    ];
    for (const key of keys) {
      const value = entry?.[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string" && value.trim()) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }
      if (value && typeof value === "object") {
        const nested = value.code ?? value.id;
        if (typeof nested === "number" && Number.isFinite(nested)) {
          return nested;
        }
        if (typeof nested === "string" && nested.trim()) {
          const numeric = Number(nested);
          if (Number.isFinite(numeric)) {
            return numeric;
          }
        }
      }
    }
    return undefined;
  }

  _resolveIconKeyword(entry, options = {}) {
    const keywordSources = [
      entry?.icon,
      entry?.condition,
      entry?.description,
      entry?.summary?.condition,
      options.fallbackLabel,
    ];
    const found = keywordSources.find(
      (value) => typeof value === "string" && value.trim().length
    );
    return found ? found.trim() : "";
  }

  /**
   * Aktualisiert aktuelle Zeit-Anzeige
   * @private
   */
  _updateCurrentTime() {
    const timeEl = document.getElementById("current-time");
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
  }

  _renderFrogStage(conditionText) {
    const message = conditionText
      ? `Wetterfrosch meint: ${this._escapeHtml(conditionText)}.`
      : "Wetterfrosch wartet auf frische Daten.";
    const stars = Array.from({ length: 5 })
      .map((_, idx) => `<span class="frog-star" data-star="${idx + 1}"></span>`)
      .join("");
    return `
      <section class="frog-stage" aria-hidden="true">
        <div class="frog-pond">
          <div class="frog-stars">${stars}</div>
          <div class="frog-sway" role="presentation">
            <span class="frog-rope left"></span>
            <span class="frog-rope right"></span>
            <div class="frog-seat"></div>
            <div class="frog-body">
              <span class="frog-eye left"><span class="frog-pupil"></span></span>
              <span class="frog-eye right"><span class="frog-pupil"></span></span>
              <span class="frog-mouth"></span>
              <span class="frog-cheek left"></span>
              <span class="frog-cheek right"></span>
              <span class="frog-hand left"></span>
              <span class="frog-hand right"></span>
              <span class="frog-feet"></span>
            </div>
          </div>
          <div class="frog-ground">
            <span class="frog-bush left"></span>
            <span class="frog-bush right"></span>
          </div>
        </div>
        <p class="frog-caption">${message}</p>
      </section>
    `;
  }

  /**
   * Zeigt Stundendaten an (horizontal scrollbar)
   * @param {array} hourlyData - Array von Stunden-Objekten
   * @param {string} source - API-Quelle
   */
  displayHourly(hourlyData, source = "") {
    const target =
      document.getElementById("hourly-section") || this.currentContainer;
    if (!target) return;

    try {
      if (!Array.isArray(hourlyData) || !hourlyData.length) {
        if (!target.dataset.hourlyInitialized) {
          target.innerHTML =
            '<div class="hourly-empty">Keine Stundendaten verfügbar.</div>';
          target.dataset.hourlyInitialized = "true";
        }
        return;
      }

      if (!target.dataset.hourlyInitialized) {
        target.innerHTML = "";
        target.dataset.hourlyInitialized = "true";
      }

      const hourlyHtml = `
        <article class="hourly-block" data-hourly-source="${
          source || "primär"
        }">
          <h3>⏰ Stundenvorhersage${
            source ? ` · ${this._escapeHtml(source)}` : ""
          }</h3>
          <div class="hourly-scroll">
            ${hourlyData
              .map((hour, idx) => {
                const date = new Date(hour.time);
                const hourStr = date.getHours().toString().padStart(2, "0");
                // Temperatur und Wind basierend auf eingestellten Einheiten formatieren
                const tempRaw =
                  typeof hour.temperature === "number"
                    ? hour.temperature
                    : null;
                const windRaw =
                  typeof hour.windSpeed === "number" ? hour.windSpeed : null; // assume m/s input

                const formatTemp = (c) => {
                  const unit = window.appState?.units?.temperature || "C";
                  if (c === null) return "--";
                  if (unit === "F") return `${((c * 9) / 5 + 32).toFixed(1)}°F`;
                  return `${c.toFixed(1)}°C`;
                };

                const formatWind = (mps) => {
                  const unit = window.appState?.units?.wind || "km/h";
                  if (mps === null) return "";
                  if (unit === "m/s") return `${mps.toFixed(1)} m/s`;
                  // default show km/h
                  return `${(mps * 3.6).toFixed(0)} km/h`;
                };

                const tempDisplay =
                  tempRaw === null ? "--" : formatTemp(tempRaw);
                const windDisplay =
                  windRaw === null
                    ? ""
                    : `<small>${formatWind(windRaw)}</small>`;

                return `
                <div class="hourly-item" data-hour="${idx}">
                  <div class="hour-time">${hourStr}:00</div>
                  <div class="hour-emoji">${this._renderIcon(hour, {
                    className: "hour-icon",
                    fallbackEmoji: hour.emoji,
                    fallbackLabel: hour.description,
                  })}</div>
                  <div class="hour-temp">${tempDisplay}</div>
                  ${windDisplay}
                </div>
              `;
              })
              .join("")}
          </div>
        </article>
      `;

      const existingBlock = target.querySelector(
        `[data-hourly-source="${source || "primär"}"]`
      );
      if (existingBlock) {
        existingBlock.outerHTML = hourlyHtml;
      } else {
        target.insertAdjacentHTML("beforeend", hourlyHtml);
      }

      const updatedBlock = target.querySelector(
        `[data-hourly-source="${source || "primär"}"]`
      );
      this._setupHourlyScroll(updatedBlock || target);
    } catch (error) {
      console.error("Fehler beim Anzeigen der Stundendaten:", error);
    }
  }

  /**
   * Zeigt mehrtägige Vorhersage an
   * @param {array} dailyData - Array von Tages-Objekten
   */
  displayForecast(dailyData) {
    if (!this.forecastContainer) return;

    this._teardownForecastCarousel();

    try {
      const insights = window.appState?.renderData?.openMeteo?.dayInsights;
      if (Array.isArray(insights) && insights.length) {
        this._renderDailyInsightsPanel(insights[0]);
      } else {
        this._renderDailyInsightsPanel(null);
      }

      const rawDays = this._collectForecastDays(dailyData);
      const normalizedDays = rawDays
        .slice(0, 7)
        .map((day) => this._coerceDayDetailStructure(day))
        .filter(Boolean);

      if (!normalizedDays.length) {
        this.forecastContainer.innerHTML =
          '<p class="empty-state">Keine Vorhersagedaten verfügbar.</p>';
        return;
      }

      const todayIndex = this._findCurrentDayIndex(normalizedDays);

      const cardsMarkup = normalizedDays
        .map((day, index) =>
          this._renderForecastPill(day, {
            index,
            isActive: index === todayIndex,
          })
        )
        .join("");

      this.forecastContainer.innerHTML = `
        <section class="forecast-pill-section" aria-label="Die nächsten Tage">
          <div class="forecast-pill-headline">
            <div>
              <p class="eyebrow">Prognose</p>
              <h2>Die nächsten Tage</h2>
            </div>
            <div class="forecast-pill-meta">${this._buildForecastMeta(
              normalizedDays.length
            )}</div>
          </div>
          <div class="forecast-pill-list" role="list">
            ${cardsMarkup}
          </div>
        </section>
      `;

      this._bindDayDetailHandlers(normalizedDays, {
        selector: ".forecast-pill",
      });
    } catch (error) {
      console.error("Fehler beim Anzeigen der Vorhersage:", error);
      this.forecastContainer.innerHTML =
        "<p>Fehler beim Laden der Vorhersage</p>";
    }
  }

  _collectForecastDays(dailyData = []) {
    const insights = window.appState?.renderData?.openMeteo?.dayInsights;
    if (Array.isArray(insights) && insights.length) {
      return insights;
    }
    const byDay = window.appState?.renderData?.openMeteo?.byDay;
    if (Array.isArray(byDay) && byDay.length) {
      return byDay;
    }
    return Array.isArray(dailyData) ? dailyData : [];
  }

  _coerceDayDetailStructure(day) {
    if (!day) return null;
    const hasSummary = Boolean(day.summary);
    const hasGrid = Array.isArray(day.hourGrid) && day.hourGrid.length;
    if (hasSummary && hasGrid) {
      return day;
    }
    const isoDate = day.date || (day.time ? day.time.split("T")[0] : null);
    const hours = Array.isArray(day.hours) ? day.hours : [];
    const hourGrid = hasGrid
      ? day.hourGrid
      : hours.map((slot) => {
          const dt = slot.time ? new Date(slot.time) : null;
          const hour =
            typeof slot.hour === "number"
              ? slot.hour
              : dt && !Number.isNaN(dt.getTime())
              ? dt.getHours()
              : null;
          const precipProb =
            slot.precipitationProbability ?? slot.precipProb ?? null;
          return {
            hour,
            temperature: slot.temperature,
            emoji: slot.emoji,
            precipitation: slot.precipitation,
            precipitationProbability: precipProb,
            precipProb: precipProb,
            windSpeed: slot.windSpeed,
            windDirection: slot.windDirection,
            humidity: slot.humidity,
            isDay: slot.isDay ?? 1,
            weathercode: slot.weathercode ?? slot.weatherCode,
            description: slot.description,
          };
        });

    const temps = hourGrid
      .map((slot) =>
        typeof slot.temperature === "number" ? slot.temperature : null
      )
      .filter((value) => value !== null);
    const summaryBase = {
      tempMax:
        typeof day.tempMax === "number"
          ? day.tempMax
          : temps.length
          ? Math.max(...temps)
          : null,
      tempMin:
        typeof day.tempMin === "number"
          ? day.tempMin
          : temps.length
          ? Math.min(...temps)
          : null,
      humidityAvg: this._averageField(hourGrid, "humidity"),
      precipitationSum:
        typeof day.precipitationSum === "number"
          ? day.precipitationSum
          : hourGrid.reduce((sum, slot) => sum + (slot.precipitation || 0), 0),
      wind: {
        avgSpeed: this._averageField(hourGrid, "windSpeed"),
        cardinal: day.summary?.wind?.cardinal || null,
      },
      condition:
        day.summary?.condition || day.condition || hours[0]?.description || "",
    };

    return {
      ...day,
      date: isoDate || day.date,
      label: day.label || this._formatDayName(isoDate || day.date),
      summary: {
        ...summaryBase,
        ...(day.summary || {}),
      },
      hourGrid,
      precipitationTimeline:
        day.precipitationTimeline ||
        hourGrid.map((slot) => ({
          hour: slot.hour,
          amount: slot.precipitation ?? 0,
          probability: slot.precipitationProbability ?? null,
          isDay: slot.isDay,
        })),
    };
  }

  _averageField(entries = [], key) {
    const values = entries
      .map((entry) => (typeof entry?.[key] === "number" ? entry[key] : null))
      .filter((value) => value !== null);
    if (!values.length) return null;
    const sum = values.reduce((acc, value) => acc + value, 0);
    return sum / values.length;
  }

  _findCurrentDayIndex(days) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const index = days.findIndex((entry) => {
      if (!entry?.date) return false;
      const dt = new Date(entry.date);
      if (Number.isNaN(dt.getTime())) return false;
      dt.setHours(0, 0, 0, 0);
      return dt.getTime() === todayMs;
    });
    return index === -1 ? 0 : index;
  }

  _renderForecastPill(day, options = {}) {
    const temps = {
      max: this._formatTempValue(day?.summary?.tempMax),
      min: this._formatTempValue(day?.summary?.tempMin),
    };
    const representative = this._pickRepresentativeHour(day);
    const description =
      representative?.description || day?.summary?.condition || "–";
    const icon = this._renderIcon(representative || day, {
      className: "forecast-pill-icon",
      fallbackEmoji: representative?.emoji || day.emoji,
      fallbackLabel: description,
    });
    const label = this._formatDayName(day?.date);
    const dateLabel = this._formatShortDate(day?.date);
    const precipChance = this._resolvePrecipChance(day);
    const classes = ["forecast-pill"];
    if (options.isActive) {
      classes.push("is-active");
    }
    return `
      <button type="button" class="${classes.join(" ")}" data-day-index="${
      options.index
    }" data-day-id="${day?.date || ""}" role="listitem">
        <div class="forecast-pill-temps">
          <strong>${temps.max}</strong>
          <span>${temps.min}</span>
        </div>
        <div class="forecast-pill-icon-wrap">${icon}</div>
        <div class="forecast-pill-precip">
          <strong>${precipChance}</strong>
          <span>${this._escapeHtml(description)}</span>
        </div>
        <div class="forecast-pill-label">
          <span class="day-name">${this._escapeHtml(label)}</span>
          <span class="day-date">${this._escapeHtml(dateLabel)}</span>
        </div>
      </button>
    `;
  }

  _buildForecastMeta(count = 0) {
    const updatedAt = window.appState?.renderData?.generatedAt || Date.now();
    const timestamp = new Date(updatedAt);
    const timeLabel = Number.isNaN(timestamp.getTime())
      ? ""
      : timestamp.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });
    if (!timeLabel) {
      return `<span>${count} Tage</span>`;
    }
    return `<span>${count} Tage · Stand ${timeLabel}</span>`;
  }

  _formatDayName(dateIso) {
    if (!dateIso) return "";
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) return "";
    const today = new Date();
    const tomorrow = new Date();
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(today.getDate() + 1);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    if (target.getTime() === today.getTime()) {
      return "Heute";
    }
    if (target.getTime() === tomorrow.getTime()) {
      return "Morgen";
    }
    return date.toLocaleDateString("de-DE", { weekday: "short" }).toLowerCase();
  }

  _formatShortDate(dateIso) {
    if (!dateIso) return "";
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  _resolvePrecipChance(day) {
    const timeline = Array.isArray(day?.precipitationTimeline)
      ? day.precipitationTimeline
      : [];
    const maxProb = timeline.reduce((acc, slot) => {
      if (typeof slot?.probability === "number") {
        return Math.max(acc, slot.probability);
      }
      return acc;
    }, 0);
    if (maxProb > 0) {
      return `${Math.round(maxProb)}%`;
    }
    const fallback = day?.summary?.precipitationProbability;
    if (typeof fallback === "number") {
      return `${Math.round(fallback)}%`;
    }
    return "0%";
  }

  _pickRepresentativeHour(day) {
    if (Array.isArray(day?.hourGrid) && day.hourGrid.length) {
      const midday = day.hourGrid.find((slot) => slot.hour === 12);
      return (
        midday || day.hourGrid.find((slot) => slot.isDay) || day.hourGrid[0]
      );
    }
    if (Array.isArray(day?.hours) && day.hours.length) {
      const midday = day.hours.find((slot) => {
        const dt = slot.time ? new Date(slot.time) : null;
        return dt && !Number.isNaN(dt.getTime()) && dt.getHours() === 12;
      });
      return midday || day.hours[0];
    }
    return day || null;
  }

  _setupForecastCarousel(totalCards = 0) {
    if (!this.forecastContainer) return;
    const track = this.forecastContainer.querySelector(".forecast-track");
    const prevBtn = this.forecastContainer.querySelector(".forecast-nav-prev");
    const nextBtn = this.forecastContainer.querySelector(".forecast-nav-next");
    const indicator = this.forecastContainer.querySelector(
      ".forecast-carousel-indicator"
    );

    if (!track || !prevBtn || !nextBtn) {
      this._forecastCarouselCleanup = null;
      return;
    }

    if (totalCards <= 1) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      if (indicator) {
        indicator.textContent = `1 / ${Math.max(totalCards, 1)}`;
      }
      this._forecastCarouselCleanup = null;
      return;
    }

    const cards = Array.from(track.querySelectorAll(".forecast-card"));
    if (!cards.length) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      this._forecastCarouselCleanup = null;
      return;
    }

    const updateIndicator = () => {
      if (!indicator) return;
      const viewportCenter = track.scrollLeft + track.clientWidth / 2;
      let activeIndex = 0;
      let minDelta = Number.POSITIVE_INFINITY;
      cards.forEach((card, idx) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const delta = Math.abs(cardCenter - viewportCenter);
        if (delta < minDelta) {
          minDelta = delta;
          activeIndex = idx;
        }
      });
      // Zählung um 1 erhöht (2/7 wird zu 3/7, etc.)
      indicator.textContent = `${activeIndex + 1} / ${cards.length}`;
    };

    const updateNavState = () => {
      const maxScroll = Math.max(track.scrollWidth - track.clientWidth, 0);
      const atStart = track.scrollLeft <= 2;
      const atEnd = track.scrollLeft >= maxScroll - 2;
      prevBtn.disabled = atStart;
      nextBtn.disabled = atEnd || maxScroll <= 2;
    };

    const updateAll = () => {
      updateNavState();
      updateIndicator();
    };

    const scrollByPage = (direction) => {
      if (!cards.length) return;

      // Finde die aktuell angezeigte Karte (die in der Mitte ist)
      const viewportCenter = track.scrollLeft + track.clientWidth / 2;
      let currentIndex = 0;
      let minDelta = Number.POSITIVE_INFINITY;

      cards.forEach((card, idx) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const delta = Math.abs(cardCenter - viewportCenter);
        if (delta < minDelta) {
          minDelta = delta;
          currentIndex = idx;
        }
      });

      // Berechne nächste Karte basierend auf Richtung
      const nextIndex = currentIndex + direction;

      if (nextIndex >= 0 && nextIndex < cards.length) {
        const nextCard = cards[nextIndex];
        const cardStart = nextCard.offsetLeft;
        const cardWidth = nextCard.offsetWidth;
        const cardEnd = cardStart + cardWidth;
        const viewportWidth = track.clientWidth;
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        const gapSize = 24; // var(--spacing-lg) in pixels

        // Für die letzte Karte: Stelle sicher, dass sie vollständig mit Padding sichtbar ist
        if (nextIndex === cards.length - 1) {
          // Scrolle so, dass die letzte Karte mit etwas Padding von links sichtbar ist
          const targetScroll = Math.max(0, cardEnd - viewportWidth + gapSize);
          track.scrollLeft = Math.min(targetScroll, maxScroll);
        } else {
          // Für andere Karten: Zentriere sie
          const cardCenter = cardStart + cardWidth / 2;
          const targetScroll = Math.max(0, cardCenter - viewportWidth / 2);
          track.scrollLeft = targetScroll;
        }
      }
    };

    const onPrev = () => scrollByPage(-1);
    const onNext = () => scrollByPage(1);
    const onScroll = () => {
      if (this._forecastCarouselFrame) {
        cancelAnimationFrame(this._forecastCarouselFrame);
      }
      this._forecastCarouselFrame = window.requestAnimationFrame(updateAll);
    };
    const onResize = () => updateAll();

    prevBtn.addEventListener("click", onPrev);
    nextBtn.addEventListener("click", onNext);
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    updateAll();

    // Initiales Scrollen auf die erste Karte
    setTimeout(() => {
      if (cards.length > 0) {
        const firstCard = cards[0];
        // Berechne die exakte Position für die erste Karte
        const cardStart = firstCard.offsetLeft;
        const cardWidth = firstCard.offsetWidth;
        const cardCenter = cardStart + cardWidth / 2;
        const viewportWidth = track.clientWidth;
        const targetScroll = Math.max(0, cardCenter - viewportWidth / 2);
        track.scrollLeft = targetScroll;
        setTimeout(() => updateAll(), 10);
      }
    }, 0);

    this._forecastCarouselCleanup = () => {
      prevBtn.removeEventListener("click", onPrev);
      nextBtn.removeEventListener("click", onNext);
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (this._forecastCarouselFrame) {
        cancelAnimationFrame(this._forecastCarouselFrame);
        this._forecastCarouselFrame = null;
      }
    };
  }

  _teardownForecastCarousel() {
    if (typeof this._forecastCarouselCleanup === "function") {
      this._forecastCarouselCleanup();
      this._forecastCarouselCleanup = null;
    }
  }

  _renderAdvancedForecastCard(day, idx) {
    const tempHigh = this._formatTempValue(day?.summary?.tempMax);
    const tempLow = this._formatTempValue(day?.summary?.tempMin);
    const dewPoint = this._formatTempValue(day?.summary?.dewPointAvg);
    const humidity = this._formatPercentValue(day?.summary?.humidityAvg);
    const precipSum =
      typeof day?.summary?.precipitationSum === "number"
        ? `${day.summary.precipitationSum.toFixed(1)} mm`
        : "--";
    const windSpeed = this._formatWindValue(day?.summary?.wind?.avgSpeed);
    const condition = day?.summary?.condition || "Tagestrend";
    const uvChip = this._renderUvChip(day?.summary?.uvIndexMax);
    const sunTrack = this._renderSunTrack(day?.sun);
    const precipBars = this._renderPrecipBars(day?.precipitationTimeline);
    const windCompass = this._renderWindCompass(
      day?.summary?.wind?.directionDeg,
      day?.summary?.wind?.cardinal
    );
    const hourlyPreview = this._renderInlineHourGrid(day?.hourGrid);

    return `
      <article class="forecast-card advanced" data-day-index="${idx}" tabindex="0" aria-label="Vorhersage für ${
      day?.label
    }">
        <header class="forecast-card-header">
          <div>
            <p class="forecast-date">${day?.label || ""}</p>
            <small class="forecast-meta">${condition}</small>
          </div>
          <div class="forecast-emoji">${this._renderIcon(day, {
            className: "forecast-icon",
            fallbackEmoji: day?.emoji,
            fallbackLabel: condition,
          })}</div>
        </header>
        <div class="forecast-temps advanced">
          <div><span class="label">Max</span><span class="value">${tempHigh}</span></div>
          <div><span class="label">Min</span><span class="value">${tempLow}</span></div>
          <div><span class="label">Taupunkt</span><span class="value">${dewPoint}</span></div>
        </div>
        <div class="forecast-metrics">
          <div class="metric-block">
            <span class="metric-label">Wind</span>
            ${windCompass}
            <span class="metric-value">${windSpeed}</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">Feuchtigkeit</span>
            <span class="metric-value">${humidity}</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">Niederschlag</span>
            <span class="metric-value">${precipSum}</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">UV</span>
            ${uvChip}
          </div>
        </div>
        ${sunTrack}
        <div class="precip-timeline" aria-label="Niederschlag pro Stunde">
          ${precipBars}
        </div>
        ${hourlyPreview}
        <button type="button" class="forecast-card-action">Tagesdetails</button>
      </article>
    `;
  }

  _renderWindCompass(directionDeg, cardinal) {
    if (typeof directionDeg !== "number" || Number.isNaN(directionDeg)) {
      return '<div class="wind-compass is-empty">--</div>';
    }
    const label = cardinal || `${Math.round(directionDeg)}°`;
    return `
      <div class="wind-compass" aria-label="Windrichtung ${label}">
        <span class="wind-compass-rose"></span>
        <span class="wind-compass-arrow" style="transform: rotate(${directionDeg}deg);"></span>
        <span class="wind-compass-label">${label}</span>
      </div>
    `;
  }

  _renderSunTrack(sun) {
    if (!sun || (!sun.sunrise && !sun.sunset)) return "";
    const sunrise = this._formatTimeLabel(sun.sunrise) || "--:--";
    const sunset = this._formatTimeLabel(sun.sunset) || "--:--";
    const start =
      typeof sun.sunrisePercent === "number" ? sun.sunrisePercent : 0;
    const end = typeof sun.sunsetPercent === "number" ? sun.sunsetPercent : 100;
    const daylight =
      typeof sun.daylightMinutes === "number"
        ? `${Math.floor(sun.daylightMinutes / 60)}h ${
            sun.daylightMinutes % 60
          }m Licht`
        : "";
    return `
      <div class="sun-track">
        <div class="sun-track-times">
          <span>🌅 ${sunrise}</span>
          <span>🌇 ${sunset}</span>
        </div>
        <div class="sun-track-bar">
          <span class="sun-track-daylight" style="--sunrise:${start}%; --sunset:${end}%;"></span>
        </div>
        ${daylight ? `<small class="sun-track-label">${daylight}</small>` : ""}
      </div>
    `;
  }

  _renderLocationAstro(locationDetails, sunEvents, moonPhase) {
    const locationBlock = this._buildLocationCard(locationDetails);
    const timeZone = locationDetails?.timezone || null;
    const astroBlock = this._buildAstronomyCard(sunEvents, moonPhase, timeZone);
    if (!locationBlock && !astroBlock) return "";
    return `
      <div class="location-astro-panel">
        ${locationBlock || ""}
        ${astroBlock || ""}
      </div>
    `;
  }

  _buildLocationCard(details) {
    if (!details) return "";
    const cityLabel =
      details.city || details.locality || "Koordinaten (Lat/Lon)";
    const regionParts = [details.region, details.country]
      .filter(Boolean)
      .map((part) => this._escapeHtml(part));
    const regionLine = regionParts.join(" · ");
    const subdivisions = Array.isArray(details.subdivisions)
      ? details.subdivisions.filter(Boolean).slice(0, 2)
      : [];
    const infoItems = [];
    if (details.timezone) {
      infoItems.push(`🕓 ${this._escapeHtml(details.timezone)}`);
    }
    if (subdivisions.length) {
      infoItems.push(`🗺️ ${this._escapeHtml(subdivisions.join(" · "))}`);
    }
    if (details.plusCode) {
      infoItems.push(`➕ ${this._escapeHtml(details.plusCode)}`);
    }
    if (
      typeof details.latitude === "number" &&
      typeof details.longitude === "number"
    ) {
      const coords = `${details.latitude.toFixed(
        2
      )}°, ${details.longitude.toFixed(2)}°`;
      infoItems.push(`📌 ${this._escapeHtml(coords)}`);
    }
    return `
      <article class="location-card" aria-label="Standortdetails">
        <h3>📍 Standort</h3>
        <strong>${
          details.countryFlag ? `${details.countryFlag} ` : ""
        }${this._escapeHtml(cityLabel)}</strong>
        ${regionLine ? `<p class="location-card-meta">${regionLine}</p>` : ""}
        ${
          infoItems.length
            ? `<ul class="location-card-list">${infoItems
                .map((entry) => `<li>${entry}</li>`)
                .join("")}</ul>`
            : ""
        }
      </article>
    `;
  }

  _buildAstronomyCard(sunEvents, moonPhase, timeZone) {
    const rows = [];
    if (sunEvents) {
      const daylight = this._formatDurationLabel(sunEvents.dayLengthSeconds);
      const sunrise =
        this._formatTimeLabel(sunEvents.sunrise, timeZone) || "--:--";
      const sunset =
        this._formatTimeLabel(sunEvents.sunset, timeZone) || "--:--";
      if (daylight || sunEvents.sunrise || sunEvents.sunset) {
        rows.push(`
          <div class="astro-row">
            <span class="astro-label">🌞 Tageslicht</span>
            <div class="astro-value">
              <strong>${daylight || "--"}</strong>
              <small>${sunrise} · ${sunset}</small>
            </div>
          </div>
        `);
      }
      const civilDawn = this._formatTimeLabel(sunEvents.civil?.dawn, timeZone);
      const civilDusk = this._formatTimeLabel(sunEvents.civil?.dusk, timeZone);
      if (civilDawn || civilDusk) {
        rows.push(`
          <div class="astro-row">
            <span class="astro-label">🌅 Zivil</span>
            <div class="astro-value">
              <small>${civilDawn || "--:--"} · ${civilDusk || "--:--"}</small>
            </div>
          </div>
        `);
      }
      const nauticalDawn = this._formatTimeLabel(
        sunEvents.nautical?.dawn,
        timeZone
      );
      const nauticalDusk = this._formatTimeLabel(
        sunEvents.nautical?.dusk,
        timeZone
      );
      if (nauticalDawn || nauticalDusk) {
        rows.push(`
          <div class="astro-row">
            <span class="astro-label">🌊 Nautisch</span>
            <div class="astro-value">
              <small>${nauticalDawn || "--:--"} · ${
          nauticalDusk || "--:--"
        }</small>
            </div>
          </div>
        `);
      }
    }

    if (moonPhase) {
      const illumination = this._formatIllumination(moonPhase.illumination);
      const moonrise = this._formatTimeLabel(moonPhase.moonrise, timeZone);
      const moonset = this._formatTimeLabel(moonPhase.moonset, timeZone);
      const detailParts = [];
      if (moonPhase.description) {
        detailParts.push(this._escapeHtml(moonPhase.description));
      }
      if (moonPhase.zodiac) {
        detailParts.push(`🔭 ${this._escapeHtml(moonPhase.zodiac)}`);
      }
      rows.push(`
        <div class="astro-row">
          <span class="astro-label">🌙 ${this._escapeHtml(
            moonPhase.phase || "Mondphase"
          )}</span>
          <div class="astro-value">
            <strong>${illumination || "--"}</strong>
            ${
              moonrise || moonset
                ? `<small>${moonrise || "--:--"} · ${
                    moonset || "--:--"
                  }</small>`
                : ""
            }
            ${
              detailParts.length
                ? `<small>${detailParts.join(" · ")}</small>`
                : ""
            }
          </div>
        </div>
      `);
    }

    if (!rows.length) return "";
    return `
      <article class="astro-card" aria-label="Astronomische Daten">
        <h3>🌌 Astronomie</h3>
        ${rows.join("")}
      </article>
    `;
  }

  _renderPrecipBars(timeline = []) {
    if (!Array.isArray(timeline) || !timeline.length) {
      return '<div class="precip-bars empty">Keine Daten</div>';
    }
    return `
      <div class="precip-bars">
        ${timeline
          .slice(0, 24)
          .map((slot) => {
            const amount = typeof slot.amount === "number" ? slot.amount : 0;
            const prob =
              typeof slot.probability === "number"
                ? `${slot.probability}%`
                : "";
            const capped = Math.min(amount, 5);
            const height = (capped / 5) * 100;
            const classes = ["precip-bar"];
            if (slot.isDay === 0) classes.push("is-night");
            return `<span class="${classes.join(
              " "
            )}" style="--precip-height:${height}%;" title="${
              slot.hour
            }:00 · ${amount.toFixed(1)}mm ${prob}"></span>`;
          })
          .join("")}
      </div>
    `;
  }

  _renderInlineHourGrid(hourGrid = []) {
    if (!Array.isArray(hourGrid) || !hourGrid.length) {
      return "";
    }
    const cells = hourGrid
      .slice(0, 24)
      .map((slot) => {
        const hourLabel = (slot?.hour ?? 0).toString().padStart(2, "0");
        const temp =
          typeof slot?.temperature === "number"
            ? `${Math.round(slot.temperature)}°`
            : "–";
        const classes = ["inline-hour-cell"];
        if (slot?.isDay === 0) classes.push("is-night");
        const icon = this._renderIcon(slot, {
          className: "inline-hour-icon",
          fallbackEmoji: slot?.emoji,
          fallbackLabel: slot?.description,
        });
        return `<span class="${classes.join(
          " "
        )}"><strong>${hourLabel}</strong>${icon}<span>${temp}</span></span>`;
      })
      .join("");
    return `<div class="inline-hour-grid">${cells}</div>`;
  }

  _renderUvChip(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return '<span class="uv-chip uv-unknown">--</span>';
    }
    let severity = "low";
    let label = "niedrig";
    if (value >= 8) {
      severity = "extreme";
      label = "sehr hoch";
    } else if (value >= 6) {
      severity = "high";
      label = "hoch";
    } else if (value >= 3) {
      severity = "moderate";
      label = "mittel";
    }
    return `<span class="uv-chip uv-${severity}">UV ${value.toFixed(
      1
    )} · ${label}</span>`;
  }

  _renderHourlyMatrix(days, options = {}) {
    if (!Array.isArray(days) || !days.length) return "";
    const title =
      typeof options.title === "string"
        ? options.title
        : "🕒 7×24 Stundenraster";
    const sectionClasses = ["hourly-matrix"];
    if (options.compact) sectionClasses.push("is-compact");
    const headerCells = Array.from({ length: 24 }, (_, hour) => {
      const label = hour.toString().padStart(2, "0");
      return `<span class="matrix-cell matrix-header-cell">${label}</span>`;
    }).join("");
    const rows = days.map((day) => this._renderHourlyMatrixRow(day)).join("");
    return `
      <section class="${sectionClasses.join(" ")}">
        ${title ? `<h3>${title}</h3>` : ""}
        <div class="hourly-matrix-grid">
          <div class="hourly-matrix-row matrix-header">
            <div class="matrix-day-label">Tag</div>
            <div class="matrix-hour-cells">${headerCells}</div>
          </div>
          ${rows}
        </div>
      </section>
    `;
  }

  _renderHourlyMatrixRow(day) {
    const cells = (
      day?.hourGrid ||
      Array.from({ length: 24 }, (_, idx) => ({
        hour: idx,
      }))
    )
      .map((slot) => {
        const temp =
          typeof slot.temperature === "number"
            ? `${Math.round(slot.temperature)}°`
            : "–";
        const prob =
          typeof slot.precipitationProbability === "number"
            ? `<small>${slot.precipitationProbability}%</small>`
            : "";
        const classes = ["matrix-cell"];
        if (slot.isDay === 0) classes.push("is-night");
        if (typeof slot.precipitation === "number" && slot.precipitation > 0) {
          classes.push("has-rain");
        }
        const iconMarkup = this._renderIcon(slot, {
          className: "matrix-icon",
          fallbackEmoji: slot.emoji || "·",
          fallbackLabel: slot.description,
          isDay: typeof slot.isDay === "number" ? slot.isDay : undefined,
        });
        return `<span class="${classes.join(" ")}" title="${day?.label || ""} ${
          slot.hour
        }:00 · ${temp}">
            <span class="matrix-emoji">${iconMarkup}</span>
            <span class="matrix-temp">${temp}</span>
            ${prob}
          </span>`;
      })
      .join("");

    return `
      <div class="hourly-matrix-row">
        <div class="matrix-day-label">${day?.label || ""}</div>
        <div class="matrix-hour-cells">${cells}</div>
      </div>
    `;
  }

  _renderDailyOverviewPanel(day, currentHour, airQuality) {
    const container = document.getElementById("daily-overview");
    if (!container) return;
    if (!day || !currentHour) {
      container.innerHTML = `
        <div class="overview-shell">
          <div class="overview-header">
            <h2>🧠 Tagesübersicht (AI)</h2>
            <span>Individuelle Stichpunkte nach Ortssuche</span>
          </div>
          <ul class="overview-list"><li>Suche einen Ort, um automatische Highlights zu erhalten.</li></ul>
        </div>`;
      return;
    }
    const bullets = this._buildDailyOverviewBullets(
      day,
      currentHour,
      airQuality
    );
    container.innerHTML = `
      <div class="overview-shell">
        <div class="overview-header">
          <h2>🧠 Tagesübersicht</h2>
          <span>${day.summary?.condition || ""}</span>
        </div>
        <ul class="overview-list">
          ${bullets.map((entry) => `<li>${entry}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  _buildDailyOverviewBullets(day, currentHour, airQuality) {
    const bullets = [];
    const humidity = Math.round(
      day.summary?.humidityAvg ?? currentHour?.humidity ?? 0
    );
    const dewPoint =
      typeof day.summary?.dewPointAvg === "number"
        ? day.summary.dewPointAvg
        : currentHour?.dewPoint;
    if (humidity > 0) {
      const dewText =
        typeof dewPoint === "number"
          ? ` mit Taupunkt bei ${this._formatTempValue(dewPoint)}`
          : "";
      bullets.push(`${humidity}% Luftfeuchtigkeit${dewText}.`);
    }
    if (
      typeof day.summary?.tempMin === "number" &&
      typeof day.summary?.tempMax === "number"
    ) {
      bullets.push(
        `Erwarte einen Temperaturbereich von ${this._formatTempValue(
          day.summary.tempMin
        )} bis ${this._formatTempValue(day.summary.tempMax)}.`
      );
    }
    const precipSum = day.summary?.precipitationSum;
    const precipProb = Array.isArray(day.precipitationTimeline)
      ? day.precipitationTimeline.reduce((acc, slot) => {
          if (typeof slot?.probability !== "number") return acc;
          return Math.max(acc, slot.probability);
        }, 0)
      : null;
    if (typeof precipSum === "number") {
      const probText =
        typeof precipProb === "number" && precipProb > 0
          ? ` · ${Math.round(precipProb)}% Wahrscheinlichkeit`
          : "";
      bullets.push(
        `${precipSum.toFixed(1)} mm Niederschlag im Tagesverlauf${probText}.`
      );
    }
    const daylightMinutes = day.sun?.daylightMinutes;
    if (typeof daylightMinutes === "number" && daylightMinutes > 0) {
      const hours = Math.floor(daylightMinutes / 60);
      const minutes = daylightMinutes % 60;
      bullets.push(
        `Tageslänge: ${hours} Std ${minutes.toString().padStart(2, "0")} Min.`
      );
    }
    const airQualityLabel = this._resolveAirQualityLabel(airQuality);
    if (airQualityLabel) {
      bullets.push(airQualityLabel);
    }
    if (!bullets.length) {
      bullets.push("Aktuelle Bedingungen stabil – keine Auffälligkeiten.");
    }
    return bullets.slice(0, 4);
  }

  _resolveAirQualityLabel(airQuality) {
    if (!airQuality) return null;
    if (airQuality.european?.value !== null && airQuality.european?.label) {
      return `Luftqualität: ${airQuality.european.label} (EU AQI ${Math.round(
        airQuality.european.value
      )}).`;
    }
    if (airQuality.us?.value !== null && airQuality.us?.label) {
      const map = {
        Good: "Gut",
        Moderate: "Mäßig",
        USG: "Sensitiv kritisch",
        Unhealthy: "Ungesund",
        "Very Unhealthy": "Sehr ungesund",
        Hazardous: "Gefährlich",
      };
      const translated = map[airQuality.us.label] || airQuality.us.label;
      return `US AQI ${Math.round(airQuality.us.value)} · ${translated}.`;
    }
    return null;
  }

  _renderClimatePanels(currentHour, day, airQuality) {
    const container = document.getElementById("climate-panels");
    if (!container) return;
    if (!currentHour) {
      container.innerHTML =
        '<div class="insights-empty"><p>🌐 Detailkarten folgen nach einer Ortssuche.</p></div>';
      return;
    }
    const sunLabel =
      day && day.sun
        ? `${this._formatTimeLabel(day.sun.sunrise) || "--"} · ${
            this._formatTimeLabel(day.sun.sunset) || "--"
          }`
        : "--";
    const daylightMinutes = day?.sun?.daylightMinutes;
    const daylightText =
      typeof daylightMinutes === "number"
        ? `${Math.floor(daylightMinutes / 60)}h ${(daylightMinutes % 60)
            .toString()
            .padStart(2, "0")}`
        : "";
    const cards = [
      {
        title: "Luftfeuchtigkeit",
        value: this._formatPercentValue(currentHour.humidity),
        detail:
          typeof day?.summary?.dewPointAvg === "number"
            ? `Taupunkt ${this._formatTempValue(day.summary.dewPointAvg)}`
            : "",
        accent: "plum",
        icon: "💧",
      },
      {
        title: "Sonnenlauf",
        value: sunLabel,
        detail: daylightText ? `Tageslicht ${daylightText}` : "",
        accent: "ocean",
        icon: "🌞",
      },
      {
        title: "Wind",
        value: this._formatWindValue(currentHour.windSpeed),
        detail:
          day?.summary?.wind?.cardinal ||
          (typeof currentHour.windDirection === "number"
            ? `${Math.round(currentHour.windDirection)}°`
            : ""),
        accent: "ocean",
        icon: "🌀",
      },
      {
        title: "Luftdruck",
        value: this._formatMetricValue(currentHour.pressure, " hPa", 0),
        detail: "Meeresspiegel",
        accent: "slate",
        icon: "🧭",
      },
      {
        title: "UV-Index",
        value:
          typeof day?.summary?.uvIndexMax === "number"
            ? day.summary.uvIndexMax.toFixed(1)
            : typeof currentHour.uvIndex === "number"
            ? currentHour.uvIndex.toFixed(1)
            : "--",
        detail: "Peak heute",
        accent: "amber",
        icon: "☀️",
      },
      {
        title: "Luftqualität",
        value:
          airQuality?.european?.value !== null &&
          airQuality?.european?.value !== undefined
            ? airQuality.european.value.toFixed(0)
            : airQuality?.us?.value !== null &&
              airQuality?.us?.value !== undefined
            ? airQuality.us.value.toFixed(0)
            : "--",
        detail:
          airQuality?.european?.label || airQuality?.us?.label || "Keine Daten",
        accent: "plum",
        icon: "🌫️",
      },
    ];

    container.innerHTML = `
      <div class="climate-grid">
        ${cards
          .map(
            (card) => `
            <article class="climate-card" data-accent="${card.accent || ""}">
              <span class="climate-icon">${card.icon || ""}</span>
              <strong>${card.value || "--"}</strong>
              <small>${card.title}</small>
              ${card.detail ? `<small>${card.detail}</small>` : ""}
            </article>`
          )
          .join("")}
      </div>
    `;
  }

  _formatDistanceValue(value, unitLabel = " km") {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    const normalized = value >= 10 ? value.toFixed(0) : value.toFixed(1);
    return `${normalized}${unitLabel}`;
  }

  _renderDailyInsightsPanel(day) {
    const container = document.getElementById("daily-insights");
    if (!container) return;
    if (!day) {
      container.innerHTML = `
        <div class="insights-empty">
          <p>📈 Tagesverlauf steht nach einer Ortssuche bereit.</p>
        </div>`;
      return;
    }

    const hourGrid = Array.isArray(day.hourGrid) ? day.hourGrid : [];
    const dewSeries = hourGrid.map((slot) =>
      typeof slot?.dewPoint === "number" ? slot.dewPoint : null
    );
    const humiditySeries = hourGrid.map((slot) =>
      typeof slot?.humidity === "number" ? slot.humidity : null
    );
    const windDirectionSeries = hourGrid.map((slot) =>
      typeof slot?.windDirection === "number" ? slot.windDirection : null
    );
    const precipSeries = (day.precipitationTimeline || []).map((slot) =>
      typeof slot?.amount === "number" ? slot.amount : 0
    );
    const precipProbabilities = (day.precipitationTimeline || []).map((slot) =>
      typeof slot?.probability === "number" ? slot.probability : 0
    );
    const uvSeries = (day.uvTimeline || []).map((slot) =>
      typeof slot?.value === "number" ? slot.value : null
    );
    const sunSeries = hourGrid.map((slot) =>
      typeof slot?.isDay === "number" ? slot.isDay : slot?.isDay ? 1 : 0
    );
    const daylightMinutes = day.sun?.daylightMinutes ?? null;
    const daylightLabel =
      typeof daylightMinutes === "number"
        ? `${Math.floor(daylightMinutes / 60)}h ${daylightMinutes % 60}m Licht`
        : "";

    const peakProbability = precipProbabilities.length
      ? Math.max(...precipProbabilities)
      : 0;

    const cards = [
      this._renderInsightCard({
        title: "Sonnenpfad",
        primary: `${this._formatTimeLabel(day.sun?.sunrise) || "–"} · ${
          this._formatTimeLabel(day.sun?.sunset) || "–"
        }`,
        secondary: daylightLabel,
        sparkline: this._buildSparkline(sunSeries, {
          min: 0,
          max: 1,
          area: true,
        }),
        metaStart: "Tag",
        metaEnd:
          typeof day.sun?.sunrisePercent === "number"
            ? `${Math.round(day.sun.sunrisePercent)}%`
            : "",
      }),
      this._renderInsightCard({
        title: "Taupunkt",
        primary: this._formatTempValue(day.summary?.dewPointAvg),
        secondary: "Ø Tagesmittel",
        sparkline: this._buildSparkline(dewSeries, { area: true }),
        metaStart: "Max",
        metaEnd: this._formatTempValue(
          dewSeries.reduce(
            (acc, value) =>
              typeof value === "number" && (acc === null || value > acc)
                ? value
                : acc,
            null
          )
        ),
      }),
      this._renderInsightCard({
        title: "Wind",
        primary: this._formatWindValue(day.summary?.wind?.avgSpeed),
        secondary: day.summary?.wind?.cardinal || "-",
        sparkline: this._buildSparkline(windDirectionSeries, {
          min: 0,
          max: 360,
        }),
        metaStart: "Max",
        metaEnd: this._formatWindValue(day.summary?.wind?.maxSpeed),
      }),
      this._renderInsightCard({
        title: "Luftfeuchtigkeit",
        primary: this._formatPercentValue(day.summary?.humidityAvg),
        sparkline: this._buildSparkline(humiditySeries, { area: true }),
        metaStart: "Min",
        metaEnd: this._formatPercentValue(
          humiditySeries.reduce(
            (acc, value) =>
              typeof value === "number" && (acc === null || value < acc)
                ? value
                : acc,
            null
          )
        ),
      }),
      this._renderInsightCard({
        title: "Niederschlag",
        primary:
          typeof day.summary?.precipitationSum === "number"
            ? `${day.summary.precipitationSum.toFixed(1)} mm`
            : "–",
        sparkline: this._buildSparkline(precipSeries, { area: true }),
        metaStart: "Wahrsch.",
        metaEnd: `${Math.round(peakProbability)}%`,
      }),
      this._renderInsightCard({
        title: "UV Index",
        primary:
          typeof day.summary?.uvIndexMax === "number"
            ? day.summary.uvIndexMax.toFixed(1)
            : "–",
        sparkline: this._buildSparkline(uvSeries, { area: true }),
        metaStart: "Mitte",
        metaEnd: day.summary?.condition || "",
      }),
    ].filter(Boolean);

    container.innerHTML = `
      <div class="section-title">
        <h3>🔎 Tagesinsights · ${day.label || ""}</h3>
        <small>${day.summary?.condition || ""}</small>
      </div>
      <div class="insights-grid">
        ${cards.join("")}
      </div>
    `;
  }

  _renderInsightCard({
    title,
    primary,
    secondary,
    sparkline,
    metaStart,
    metaEnd,
  }) {
    return `
      <article class="insight-card">
        <h4>${title || ""}</h4>
        <strong>${primary || "–"}</strong>
        ${secondary ? `<small>${secondary}</small>` : ""}
        ${sparkline || ""}
        ${
          metaStart || metaEnd
            ? `<div class="insight-meta"><span>${metaStart || ""}</span><span>${
                metaEnd || ""
              }</span></div>`
            : ""
        }
      </article>
    `;
  }

  _buildSparkline(series = [], options = {}) {
    const sanitized = series
      .map((value, index) => ({ value, index }))
      .filter((entry) => typeof entry.value === "number");
    if (!sanitized.length) {
      return '<svg class="sparkline" viewBox="0 0 100 40"></svg>';
    }
    const minValue =
      typeof options.min === "number"
        ? options.min
        : Math.min(...sanitized.map((entry) => entry.value));
    let maxValue =
      typeof options.max === "number"
        ? options.max
        : Math.max(...sanitized.map((entry) => entry.value));
    if (maxValue === minValue) {
      maxValue += 1;
    }
    const width = 100;
    const height = 40;
    const totalSteps = Math.max(series.length - 1, 1);
    const points = sanitized
      .map((entry) => {
        const x = (entry.index / totalSteps) * width;
        const normalized = (entry.value - minValue) / (maxValue - minValue);
        const y = height - normalized * height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
    const areaPath = options.area
      ? `<polygon points="0,${height} ${points} ${width},${height}" fill="currentColor" opacity="0.2"></polygon>`
      : "";
    return `
      <svg class="sparkline${
        options.area ? " sparkline--area" : ""
      }" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        ${areaPath}
        <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    `;
  }

  _bindDayDetailHandlers(days, options = {}) {
    if (!this.forecastContainer) return;
    if (this._forecastDetailHandlers) {
      this.forecastContainer.removeEventListener(
        "click",
        this._forecastDetailHandlers.click
      );
      this._forecastDetailHandlers = null;
    }
    if (!Array.isArray(days) || !days.length) return;

    const selector = options.selector || ".forecast-pill[data-day-index]";
    const cards = this.forecastContainer.querySelectorAll(selector);
    cards.forEach((card, index) => {
      card.dataset.dayIndex = String(index);
    });

    const handleOpen = (event) => {
      const card = event.target.closest(selector);
      if (!card) return;
      const index = Number(card.dataset.dayIndex);
      if (Number.isNaN(index)) return;
      event.preventDefault();
      this._openDayDetail(days[index]);
    };
    this.forecastContainer.addEventListener("click", handleOpen);
    this._forecastDetailHandlers = { click: handleOpen };
  }

  _buildDayDetailPayload(day) {
    if (!day) return null;
    const isoDate = day.date || new Date().toISOString().split("T")[0];
    return {
      id: isoDate,
      label: day.label || this._formatDayName(isoDate),
      city: window.appState?.currentCity || "Dein Ort",
      generatedAt: Date.now(),
      units: window.appState?.units || { temperature: "C", wind: "km/h" },
      day,
      airQuality: window.appState?.weatherData?.airQuality || null,
      moonPhase: window.appState?.weatherData?.moonPhase || null,
    };
  }

  _openDayDetail(day) {
    if (!day) return;
    const modal = document.getElementById("day-detail-modal");
    if (!modal) return;
    const normalized = this._coerceDayDetailStructure(day);
    if (!normalized) return;
    const payload = this._buildDayDetailPayload(normalized);
    const detailMarkup = this._renderDayDetailBody(payload);
    if (!detailMarkup) return;
    modal.innerHTML = `
      <div class="day-detail-panel">
        <button type="button" class="day-detail-close" aria-label="Tagesdetails schließen">&times;</button>
        <div class="day-detail-body detail-theme detail-shell">${detailMarkup}</div>
      </div>
    `;
    modal.classList.add("is-visible");
    const closeBtn = modal.querySelector(".day-detail-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this._closeDayDetail());
      setTimeout(() => closeBtn.focus(), 0);
    }
    const inlineClose = modal.querySelector("[data-detail-close]");
    if (inlineClose) {
      inlineClose.addEventListener("click", () => this._closeDayDetail());
    }
    const dismiss = (event) => {
      if (event.target === modal) {
        this._closeDayDetail();
      }
    };
    modal.addEventListener("click", dismiss, { once: true });
    this._detailEscapeHandler = (event) => {
      if (event.key === "Escape") {
        this._closeDayDetail();
      }
    };
    document.addEventListener("keydown", this._detailEscapeHandler);
  }

  _closeDayDetail() {
    const modal = document.getElementById("day-detail-modal");
    if (modal) {
      modal.classList.remove("is-visible");
      modal.innerHTML = "";
    }
    if (this._detailEscapeHandler) {
      document.removeEventListener("keydown", this._detailEscapeHandler);
      this._detailEscapeHandler = null;
    }
  }

  _renderDayDetailBody(payload) {
    const templateBuilder = window.dayDetailTemplate?.build;
    if (typeof templateBuilder === "function") {
      return templateBuilder({ ...payload, backButton: false });
    }

    const day = payload?.day;
    if (!day) return "";
    const stats = [
      { label: "Max", value: this._formatTempValue(day?.summary?.tempMax) },
      { label: "Min", value: this._formatTempValue(day?.summary?.tempMin) },
      {
        label: "Taupunkt",
        value: this._formatTempValue(day?.summary?.dewPointAvg),
      },
      {
        label: "Feuchte",
        value: this._formatPercentValue(day?.summary?.humidityAvg),
      },
      {
        label: "Wind",
        value: this._formatWindValue(day?.summary?.wind?.avgSpeed),
      },
      {
        label: "UV",
        value:
          typeof day?.summary?.uvIndexMax === "number"
            ? day.summary.uvIndexMax.toFixed(1)
            : "--",
      },
    ];

    const statsHtml = stats
      .map(
        (entry) => `
          <article>
            <span>${entry.label}</span>
            <strong>${entry.value}</strong>
          </article>
        `
      )
      .join("");

    const detailInsights = [
      this._renderInsightCard({
        title: "Luftfeuchtigkeit",
        primary: this._formatPercentValue(day?.summary?.humidityAvg),
        sparkline: this._buildSparkline(
          (day.hourGrid || []).map((slot) => slot?.humidity ?? null),
          { area: true }
        ),
      }),
      this._renderInsightCard({
        title: "Niederschlag",
        primary:
          typeof day.summary?.precipitationSum === "number"
            ? `${day.summary.precipitationSum.toFixed(1)} mm`
            : "--",
        sparkline: this._buildSparkline(
          (day.precipitationTimeline || []).map((slot) => slot?.amount ?? 0),
          { area: true }
        ),
      }),
      this._renderInsightCard({
        title: "Wind",
        primary: `${this._formatWindValue(day?.summary?.wind?.avgSpeed)} · ${
          day?.summary?.wind?.cardinal || "-"
        }`,
        sparkline: this._buildSparkline(
          (day.hourGrid || []).map((slot) => slot?.windDirection ?? null),
          { min: 0, max: 360 }
        ),
      }),
      this._renderInsightCard({
        title: "UV Index",
        primary:
          typeof day.summary?.uvIndexMax === "number"
            ? day.summary.uvIndexMax.toFixed(1)
            : "--",
        sparkline: this._buildSparkline(
          (day.uvTimeline || []).map((slot) => slot?.value ?? null),
          { area: true }
        ),
      }),
    ].join("");

    const matrix = this._renderHourlyMatrix([day], {
      title: "",
      compact: true,
    });

    return `
      <header class="day-detail-header">
        <p class="forecast-date">${day?.label || ""}</p>
        <h3>${day?.summary?.condition || "Tagesdetails"}</h3>
        ${
          day?.sun
            ? `<small>🌅 ${
                this._formatTimeLabel(day.sun.sunrise) || "–"
              } · 🌇 ${this._formatTimeLabel(day.sun.sunset) || "–"}</small>`
            : ""
        }
      </header>
      <div class="day-detail-body">
        <div class="day-detail-stats">${statsHtml}</div>
        <div class="insights-grid">${detailInsights}</div>
        ${matrix}
      </div>
    `;
  }

  _formatTempValue(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    const unit = window.appState?.units?.temperature || "C";
    return `${Math.round(value)}°${unit}`;
  }

  _formatWindValue(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    const unit = window.appState?.units?.wind || "km/h";
    const formatted = unit === "m/s" ? value.toFixed(1) : Math.round(value);
    const suffix = unit === "mph" ? " mph" : unit === "m/s" ? " m/s" : " km/h";
    return `${formatted}${suffix}`;
  }

  _formatPercentValue(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    return `${Math.round(value)}%`;
  }

  _formatMetricValue(value, suffix = "", digits = 1) {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    return `${value.toFixed(digits)}${suffix}`;
  }

  _formatDurationLabel(value) {
    const seconds =
      typeof value === "number" ? value : Number.parseFloat(value);
    if (!Number.isFinite(seconds)) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  _formatIllumination(value) {
    if (value === null || value === undefined) return "";
    let percent = Number(value);
    if (!Number.isFinite(percent)) return "";
    if (percent <= 1) percent *= 100;
    return `${Math.round(percent)}%`;
  }

  _formatTimeLabel(iso, timeZone = null) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const options = {
      hour: "2-digit",
      minute: "2-digit",
    };
    if (timeZone) {
      options.timeZone = timeZone;
    }
    return date.toLocaleTimeString("de-DE", options);
  }

  /**
   * Zeigt detaillierten Vergleich zwischen zwei API-Quellen
   * @param {object|null} openData - Open-Meteo aktuelle Data (first hour) or null
   * @param {object|null} brightData - BrightSky aktuelle Data (first hour) or null
   * @param {array} sources - sources metadata
   */
  showSourcesComparison(openData, brightData, sources = []) {
    try {
      const container = document.getElementById("settings-source-comparison");
      if (!container) return;

      const sourceMeta = Array.isArray(sources) ? sources : [];
      const tempUnit = window.appState?.units?.temperature || "C";
      const windUnit = window.appState?.units?.wind || "km/h";
      const tempSuffix = tempUnit === "F" ? "°F" : "°C";
      const windSuffix =
        windUnit === "m/s" ? " m/s" : windUnit === "mph" ? " mph" : " km/h";

      const lastUpdatedTs = sourceMeta.reduce((latest, entry) => {
        if (!entry?.updatedAt) return latest;
        const ts = new Date(entry.updatedAt).getTime();
        return Number.isFinite(ts) ? Math.max(latest, ts) : latest;
      }, 0);

      const lastUpdatedLabel = lastUpdatedTs
        ? new Date(lastUpdatedTs).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      const normalizeMeta = (label) => {
        return (
          sourceMeta.find(
            (entry) =>
              typeof entry?.name === "string" &&
              entry.name.toLowerCase().includes(label.toLowerCase())
          ) || null
        );
      };

      const formatValue = (value, suffix = "") =>
        value === null || value === undefined || Number.isNaN(value)
          ? "–"
          : `${Number(value).toFixed(1)}${suffix}`;

      const formatHumidity = (value) =>
        value === null || value === undefined || Number.isNaN(value)
          ? "–"
          : `${Math.round(value)}%`;

      const extract = (data, label) => {
        const result = {
          hasData: false,
          temp: null,
          wind: null,
          humidity: null,
          emoji: "",
          icon: "",
          statusText: "–",
          statusSlug: "unknown",
          duration: "",
        };

        const meta = normalizeMeta(label);
        if (meta) {
          result.statusText = meta.success ? "OK" : "Fehler";
          result.statusSlug = meta.success ? "ok" : "error";
          result.duration = meta.duration ? `${meta.duration}ms` : "";
        }

        if (!data) {
          return result;
        }

        let sourceSample = null;
        if (Array.isArray(data.hourly) && data.hourly.length) {
          sourceSample = data.hourly[0];
        } else if (Array.isArray(data) && data.length) {
          sourceSample = data[0];
        } else {
          sourceSample = data;
        }

        if (sourceSample) {
          result.temp =
            typeof sourceSample.temperature === "number"
              ? sourceSample.temperature
              : typeof sourceSample.temp === "number"
              ? sourceSample.temp
              : null;
          result.wind =
            typeof sourceSample.windSpeed === "number"
              ? sourceSample.windSpeed
              : typeof sourceSample.wind === "number"
              ? sourceSample.wind
              : null;
          result.humidity =
            typeof sourceSample.humidity === "number"
              ? sourceSample.humidity
              : typeof sourceSample.relativeHumidity === "number"
              ? sourceSample.relativeHumidity
              : null;
          result.emoji = sourceSample.emoji || "";
          result.icon = this._renderIcon(sourceSample, {
            className: "source-icon",
            fallbackEmoji: result.emoji,
            fallbackLabel: label,
          });
          result.hasData =
            result.temp !== null ||
            result.wind !== null ||
            result.humidity !== null;
        }

        return result;
      };

      const openPayload = extract(openData, "Open-Meteo");
      const brightPayload = extract(brightData, "BrightSky");

      if (!openPayload.hasData && !brightPayload.hasData) {
        container.innerHTML =
          '<p class="source-comparison-empty">Noch keine Vergleichsdaten geladen.</p>';
        return;
      }

      const renderCard = (label, payload, providerId) => {
        const headerMeta = [payload.duration].filter(Boolean).join(" · ");
        const iconMarkup = payload.icon || payload.emoji || "";
        const statusClass = `status-${payload.statusSlug || "unknown"}`;
        const cardBody = payload.hasData
          ? `
            <div class="source-card-headline">
              <div class="source-icon-shell">${iconMarkup}</div>
              <div>
                <strong>${formatValue(payload.temp, tempSuffix)}</strong>
                <small>Aktuell</small>
              </div>
            </div>
            <dl class="source-compare-metrics">
              <div>
                <dt>Wind</dt>
                <dd>${formatValue(payload.wind, windSuffix)}</dd>
              </div>
              <div>
                <dt>Luftfeuchte</dt>
                <dd>${formatHumidity(payload.humidity)}</dd>
              </div>
            </dl>
          `
          : '<p class="source-comparison-empty">Keine Live-Daten.</p>';

        return `
          <article class="source-compare-card" data-provider="${
            providerId || ""
          }">
            <header>
              <div>
                <p class="source-label">${label}</p>
                ${headerMeta ? `<small>${headerMeta}</small>` : ""}
              </div>
              <span class="source-status ${statusClass}">${
          payload.statusText
        }</span>
            </header>
            ${cardBody}
          </article>
        `;
      };

      const cards = [
        renderCard("Open-Meteo", openPayload, "openmeteo"),
        renderCard("BrightSky", brightPayload, "brightsky"),
      ].join("\n");

      const deltaParts = [];
      if (
        typeof openPayload.temp === "number" &&
        typeof brightPayload.temp === "number"
      ) {
        const diff = Math.abs(openPayload.temp - brightPayload.temp);
        if (diff >= 0.1) {
          deltaParts.push(`Temperatur ${diff.toFixed(1)}${tempSuffix}`);
        }
      }
      if (
        typeof openPayload.wind === "number" &&
        typeof brightPayload.wind === "number"
      ) {
        const diff = Math.abs(openPayload.wind - brightPayload.wind);
        if (diff >= 0.1) {
          deltaParts.push(`Wind ${diff.toFixed(1)}${windSuffix}`);
        }
      }
      if (
        typeof openPayload.humidity === "number" &&
        typeof brightPayload.humidity === "number"
      ) {
        const diff = Math.abs(openPayload.humidity - brightPayload.humidity);
        if (diff >= 1) {
          deltaParts.push(`Feuchte ${Math.round(diff)}%`);
        }
      }

      const summary = deltaParts.length
        ? `<div class="source-comparison-summary">Δ ${deltaParts.join(
            " · "
          )}</div>`
        : "";

      const metaLabel = lastUpdatedLabel
        ? `<p class="source-comparison-meta">Zuletzt aktualisiert: ${lastUpdatedLabel}</p>`
        : "";

      container.innerHTML = `
        ${metaLabel}
        <div class="source-comparison-grid">
          ${cards}
        </div>
        ${summary}
      `;
    } catch (e) {
      console.warn("showSourcesComparison failed", e);
    }
  }

  /**
   * Aktualisiert aktuelle Wetter-Werte
   * @param {object} data - {temp, windSpeed, humidity, feelsLike, emoji, description}
   */
  updateCurrentValues(data) {
    // Temperatur formatieren (angenommen input in °C)
    if (data.temp !== undefined) {
      const tempEl = document.getElementById("current-temp");
      if (tempEl) {
        const unit = window.appState?.units?.temperature || "C";
        const t = data.temp;
        tempEl.textContent =
          unit === "F"
            ? `${((t * 9) / 5 + 32).toFixed(1)}°F`
            : `${t.toFixed(1)}°C`;
      }
    }

    // Wind formatieren (eingehend angenommen in m/s)
    if (data.windSpeed !== undefined) {
      const windEl = document.getElementById("wind-speed");
      if (windEl) {
        const unit = window.appState?.units?.wind || "km/h";
        const mps = data.windSpeed;
        if (unit === "m/s") windEl.textContent = `${mps.toFixed(1)} m/s`;
        else windEl.textContent = `${(mps * 3.6).toFixed(0)} km/h`;
      }
    }

    if (data.humidity !== undefined) {
      const humidityEl = document.getElementById("humidity");
      if (humidityEl) humidityEl.textContent = `${data.humidity}%`;
    }

    if (data.feelsLike !== undefined) {
      const feelsEl = document.getElementById("feels-like");
      if (feelsEl) feelsEl.textContent = `${data.feelsLike.toFixed(1)}°C`;
    }

    if (data.emoji) {
      const emojiEl = document.getElementById("current-emoji");
      if (emojiEl) emojiEl.textContent = data.emoji;
    }

    if (data.description) {
      const descEl = document.getElementById("current-desc");
      if (descEl) descEl.textContent = data.description;
    }
  }

  /**
   * Zeigt Loading-State
   */
  showLoading() {
    if (this.currentContainer) {
      this.currentContainer.innerHTML = `
        <div class="loading-state">
          <div class="spinner">🔄</div>
          <p>Wetterdaten werden geladen...</p>
        </div>
      `;
    }
  }

  /**
   * Setup Horizontales Scrolling für Stundendaten
   * @private
   */
  _setupHourlyScroll(scope) {
    const root = scope || this.currentContainer;
    const scrollContainer = root?.querySelector(".hourly-scroll");
    if (!scrollContainer) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    scrollContainer.addEventListener("mousedown", (e) => {
      isDown = true;
      startX = e.pageX - scrollContainer.offsetLeft;
      scrollLeft = scrollContainer.scrollLeft;
    });

    scrollContainer.addEventListener("mouseleave", () => {
      isDown = false;
    });

    scrollContainer.addEventListener("mouseup", () => {
      isDown = false;
    });

    scrollContainer.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - scrollContainer.offsetLeft;
      const walk = (x - startX) * 1;
      scrollContainer.scrollLeft = scrollLeft - walk;
    });
  }

  /**
   * HTML-Escape für Sicherheit
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Zeigt Empty-State
   */
  showEmpty() {
    if (this.currentContainer) {
      this.currentContainer.innerHTML = `
        <div class="empty-state">
          <p>🔍 Geben Sie einen Ort ein um Wetterdaten zu sehen</p>
        </div>
      `;
    }
  }

  /**
   * Zeigt Error-State
   */
  showError(errorMessage) {
    if (this.currentContainer) {
      this.currentContainer.innerHTML = `
        <div class="error-state">
          <p>❌ ${this._escapeHtml(errorMessage)}</p>
        </div>
      `;
    }
  }
}
