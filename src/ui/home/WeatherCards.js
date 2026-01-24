(function (global) {
  /**
   * Weather Cards - Visuelle Wetter-Karten wie in den Screenshots
   * Mit SVG-Grafiken, Gauges und klickbaren Detail-Modalen
   */

  // === HELPER FUNCTIONS ===

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

  function createArcPath(cx, cy, radius, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  function polarToCartesian(cx, cy, radius, angleDeg) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad),
    };
  }

  function createGaugeSVG(value, max, color, size = 80) {
    const percentage = Math.min(value / max, 1);
    const angle = percentage * 270; // 270 degree arc
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 8;

    const bgPath = createArcPath(cx, cy, radius, -135, 135);
    const valuePath = createArcPath(cx, cy, radius, -135, -135 + angle);

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="weather-svg">
        <path d="${bgPath}" fill="none" stroke="var(--svg-stroke-bg, rgba(255,255,255,0.15))" stroke-width="6" stroke-linecap="round"/>
        <path d="${valuePath}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
      </svg>
    `;
  }

  function createCircularProgressSVG(value, max, color, size = 70) {
    const percentage = Math.min(value / max, 1);
    const circumference = 2 * Math.PI * 28;
    const offset = circumference * (1 - percentage);

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 70 70" class="weather-svg">
        <circle cx="35" cy="35" r="28" fill="none" stroke="var(--svg-stroke-bg, rgba(255,255,255,0.1))" stroke-width="5"/>
        <circle cx="35" cy="35" r="28" fill="none" stroke="${color}" stroke-width="5"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                stroke-linecap="round" transform="rotate(-90 35 35)"/>
      </svg>
    `;
  }

  function createWaveSVG(color = "#7B9FD4") {
    return `
      <svg width="100%" height="60" viewBox="0 0 200 60" preserveAspectRatio="none" class="weather-svg">
        <path d="M0 40 Q50 20 100 40 T200 40 L200 60 L0 60 Z" fill="${color}" opacity="0.6"/>
        <path d="M0 45 Q50 30 100 45 T200 45 L200 60 L0 60 Z" fill="${color}" opacity="0.8"/>
      </svg>
    `;
  }

  function createSunPathSVG(sunrise, sunset, currentTime) {
    const sunriseTime = new Date(sunrise).getTime();
    const sunsetTime = new Date(sunset).getTime();
    const now = currentTime || Date.now();

    let progress = 0;
    if (now >= sunriseTime && now <= sunsetTime) {
      progress = (now - sunriseTime) / (sunsetTime - sunriseTime);
    } else if (now > sunsetTime) {
      progress = 1;
    }

    const angle = -180 + progress * 180;
    const sunX = 100 + 80 * Math.cos((angle * Math.PI) / 180);
    const sunY = 70 + 50 * Math.sin((angle * Math.PI) / 180);

    return `
      <svg width="100%" height="80" viewBox="0 0 200 80" class="weather-svg">
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#4A6FA5;stop-opacity:0.3"/>
            <stop offset="100%" style="stop-color:#7B9FD4;stop-opacity:0.6"/>
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="70" rx="80" ry="50" fill="none" stroke="var(--svg-stroke-muted, rgba(255,255,255,0.2))" stroke-width="2" stroke-dasharray="4,4"/>
        <path d="M20 70 Q100 20 180 70" fill="url(#skyGrad)"/>
        <circle cx="${sunX}" cy="${sunY}" r="8" fill="#FFD700"/>
        <line x1="20" y1="70" x2="180" y2="70" stroke="var(--svg-stroke-muted, rgba(255,255,255,0.3))" stroke-width="2"/>
      </svg>
    `;
  }

  // === CARD RENDERING ===

  function renderHumidityCard(container, data) {
    const humidity = data.humidity ?? 0;
    const dewPoint = data.dewPoint ?? 0;

    // Komfort-Bewertung
    const getComfortLabel = (h) => {
      if (h < 30) return "Sehr trocken";
      if (h < 40) return "Trocken";
      if (h < 60) return "Angenehm";
      if (h < 70) return "Feucht";
      return "Sehr feucht";
    };

    container.innerHTML = `
      <button class="weather-card weather-card--humidity" data-card="humidity" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">💧</span>
          <span class="weather-card__label">Luftfeuchtigkeit</span>
        </div>
        <div class="weather-card__visual weather-card__visual--gradient">
          <span class="weather-card__value-large">${Math.round(
            humidity,
          )}%</span>
        </div>
        <div class="weather-card__footer">
          <span class="weather-card__sublabel">${getComfortLabel(
            humidity,
          )} • ${Math.round(dewPoint)}° Taupunkt</span>
        </div>
      </button>
    `;
  }

  function renderSunCard(container, data) {
    const sunrise = data.sunrise;
    const sunset = data.sunset;
    const sunriseLabel = sunrise
      ? new Date(sunrise).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";
    const sunsetLabel = sunset
      ? new Date(sunset).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";

    // Tageslänge berechnen
    let daylightStr = "";
    if (sunrise && sunset) {
      const diffMs = new Date(sunset) - new Date(sunrise);
      const hours = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      daylightStr = `${hours}h ${mins}min`;
    }

    container.innerHTML = `
      <button class="weather-card weather-card--sun" data-card="sun" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">🌅</span>
          <span class="weather-card__label">Sonne</span>
        </div>
        <div class="weather-card__visual weather-card__visual--sun">
          ${createSunPathSVG(sunrise, sunset)}
        </div>
        <div class="weather-card__sun-times">
          <span>↑ ${sunriseLabel}</span>
          <span>↓ ${sunsetLabel}</span>
        </div>
        <div class="weather-card__footer">
          <span class="weather-card__sublabel">☀️ ${daylightStr} Tageslicht</span>
        </div>
      </button>
    `;
  }

  function renderPressureCard(container, data) {
    const pressure = data.pressure ?? 1013;
    const normalized = (pressure - 950) / 100; // 950-1050 hPa range

    // Bewertung des Luftdrucks
    const getPressureLabel = (hPa) => {
      if (hPa >= 1025) return "Hochdruck";
      if (hPa >= 1015) return "Leicht erhöht";
      if (hPa >= 1005) return "Normal";
      if (hPa >= 995) return "Leicht tief";
      return "Tiefdruck";
    };

    container.innerHTML = `
      <button class="weather-card weather-card--pressure" data-card="pressure" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">🌡️</span>
          <span class="weather-card__label">Luftdruck</span>
        </div>
        <div class="weather-card__gauge">
          ${createGaugeSVG(normalized * 100, 100, "#7FBADC", 100)}
          <div class="weather-card__gauge-value">
            <span class="weather-card__value-large">${Math.round(
              pressure,
            )}</span>
            <span class="weather-card__unit">hPa</span>
          </div>
        </div>
        <div class="weather-card__footer">
          <span class="weather-card__sublabel">${getPressureLabel(
            pressure,
          )}</span>
        </div>
      </button>
    `;
  }

  function renderVisibilityCard(container, data) {
    const visibility = data.visibility ?? 10;

    // Bewertung der Sichtweite
    const getVisLabel = (km) => {
      if (km >= 50) return "Ausgezeichnet";
      if (km >= 20) return "Sehr gut";
      if (km >= 10) return "Gut";
      if (km >= 4) return "Mäßig";
      if (km >= 1) return "Schlecht";
      return "Sehr schlecht";
    };

    container.innerHTML = `
      <button class="weather-card weather-card--visibility" data-card="visibility" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">👁️</span>
          <span class="weather-card__label">Sichtweite</span>
        </div>
        <div class="weather-card__blob">
          <span class="weather-card__value-large">${Math.round(
            visibility,
          )}</span>
          <span class="weather-card__unit">km</span>
        </div>
        <div class="weather-card__footer">
          <span class="weather-card__sublabel">${getVisLabel(visibility)}</span>
        </div>
      </button>
    `;
  }

  function renderWindCard(container, data) {
    const windSpeed = data.windSpeed ?? 0;
    const windGust = data.windGust ?? windSpeed;
    const windDirection = data.windDirection ?? 0;

    // Windrichtung als Text
    const getWindDir = (deg) => {
      const dirs = [
        "N",
        "NNO",
        "NO",
        "ONO",
        "O",
        "OSO",
        "SO",
        "SSO",
        "S",
        "SSW",
        "SW",
        "WSW",
        "W",
        "WNW",
        "NW",
        "NNW",
      ];
      return dirs[Math.round(deg / 22.5) % 16];
    };
    const windDirLabel = getWindDir(windDirection);

    // Create wind direction indicator
    const windPath = `
      <svg width="80" height="80" viewBox="0 0 80 80">
        <defs>
          <linearGradient id="windGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4A6FA5"/>
            <stop offset="100%" style="stop-color:#7B9FD4"/>
          </linearGradient>
        </defs>
        <path d="M40 10 Q60 30 50 50 Q45 60 40 70 Q35 60 30 50 Q20 30 40 10"
              fill="url(#windGrad)" transform="rotate(${windDirection}, 40, 40)"/>
      </svg>
    `;

    container.innerHTML = `
      <button class="weather-card weather-card--wind" data-card="wind" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">💨</span>
          <span class="weather-card__label">Wind</span>
        </div>
        <div class="weather-card__wind-visual">
          ${windPath}
          <div class="weather-card__wind-value">
            <span class="weather-card__value-large">${Math.round(
              windSpeed,
            )}</span>
          </div>
        </div>
        <div class="weather-card__footer">
          <span class="weather-card__sublabel">${windDirLabel} • Böen ${Math.round(
            windGust,
          )} km/h</span>
        </div>
      </button>
    `;
  }

  function renderUVCard(container, data) {
    const uvIndex = Math.round(data.uvIndex ?? 0);
    const uvLevels = [
      { max: 2, label: "Wenig", color: "#4CAF50" },
      { max: 5, label: "Moderat", color: "#FFEB3B" },
      { max: 7, label: "Hoch", color: "#FF9800" },
      { max: 10, label: "Sehr hoch", color: "#F44336" },
      { max: 15, label: "Extrem", color: "#9C27B0" },
    ];

    const level =
      uvLevels.find((l) => uvIndex <= l.max) || uvLevels[uvLevels.length - 1];

    // Create UV scale dots
    const dots = uvLevels
      .map((l, i) => {
        const isActive =
          uvIndex > (i > 0 ? uvLevels[i - 1].max : 0) && uvIndex <= l.max;
        return `<span class="uv-dot" style="background:${l.color};opacity:${
          isActive ? 1 : 0.3
        }"></span>`;
      })
      .join("");

    container.innerHTML = `
      <button class="weather-card weather-card--uv" data-card="uv" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">☀️</span>
          <span class="weather-card__label">UV-Index</span>
        </div>
        <div class="weather-card__blob weather-card__blob--purple">
          <span class="weather-card__value-large">${uvIndex}</span>
        </div>
        <div class="weather-card__uv-indicator">
          <span class="weather-card__uv-dot" style="background:${level.color}"></span>
          <span class="weather-card__sublabel">${level.label}</span>
        </div>
        <div class="weather-card__uv-scale">${dots}</div>
      </button>
    `;
  }

  function renderAQICard(container, data) {
    const aqi = data.aqi ?? data.europeanAqi ?? 0;
    const aqiLevels = [
      { max: 25, label: "Gut", color: "#4CAF50" },
      { max: 50, label: "OK", color: "#8BC34A" },
      { max: 75, label: "Moderat", color: "#FFEB3B" },
      { max: 100, label: "Schlecht", color: "#FF9800" },
      { max: 150, label: "Sehr schlecht", color: "#F44336" },
    ];

    const level =
      aqiLevels.find((l) => aqi <= l.max) || aqiLevels[aqiLevels.length - 1];

    // Create gradient bar
    const gradientBar = `
      <div class="aqi-gradient">
        <div class="aqi-gradient__bar"></div>
        <div class="aqi-gradient__marker" style="left:${Math.min(
          (aqi / 150) * 100,
          100,
        )}%"></div>
      </div>
    `;

    container.innerHTML = `
      <button class="weather-card weather-card--aqi" data-card="aqi" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">≋</span>
          <span class="weather-card__label">AQI</span>
        </div>
        <div class="weather-card__aqi-value">
          <span class="weather-card__value-large">${Math.round(aqi)}</span>
        </div>
        ${gradientBar}
        <div class="weather-card__footer">
          <span class="weather-card__sublabel">${level.label}</span>
        </div>
      </button>
    `;
  }

  function renderPrecipitationCard(container, data) {
    const precipSum = data.precipitationSum ?? 0;
    const precipProb = data.precipProbMax ?? 0;

    container.innerHTML = `
      <button class="weather-card weather-card--precipitation" data-card="precipitation" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">🌧️</span>
          <span class="weather-card__label">Niederschlag</span>
        </div>
        <div class="weather-card__precip-value">
          <span class="weather-card__value-large">${precipSum.toFixed(1)}</span>
          <span class="weather-card__unit">mm</span>
        </div>
        <div class="weather-card__footer">
          <span class="weather-card__sublabel">${Math.round(
            precipProb,
          )}% Wahrsch.</span>
          <span class="weather-card__precip-icon">💧</span>
        </div>
      </button>
    `;
  }

  function renderMoonCard(container, data) {
    const moonrise = data.moonrise;
    const moonset = data.moonset;
    const moonPhase = data.moonPhase;
    const moonIllumination = data.moonIllumination;
    const moonEmoji = data.moonEmoji || "🌙";

    const moonriseLabel = moonrise
      ? new Date(moonrise).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";
    const moonsetLabel = moonset
      ? new Date(moonset).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";

    // Übersetze englische Phasennamen
    const phaseTranslations = {
      "New Moon": "Neumond",
      "Waxing Crescent": "Zunehmende Sichel",
      "First Quarter": "Erstes Viertel",
      "Waxing Gibbous": "Zunehmender Mond",
      "Full Moon": "Vollmond",
      "Waning Gibbous": "Abnehmender Mond",
      "Last Quarter": "Letztes Viertel",
      "Waning Crescent": "Abnehmende Sichel",
    };
    const phaseLabel = moonPhase
      ? phaseTranslations[moonPhase] || moonPhase
      : "Mondphase";

    // Beleuchtung anzeigen wenn verfügbar
    const illuminationStr =
      typeof moonIllumination === "number"
        ? `${Math.round(moonIllumination)}%`
        : "";

    container.innerHTML = `
      <button class="weather-card weather-card--moon" data-card="moon" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">${moonEmoji}</span>
          <span class="weather-card__label">Mond</span>
        </div>
        <div class="weather-card__moon-info">
          <span class="weather-card__moon-phase">${phaseLabel}</span>
          ${
            illuminationStr
              ? `<span class="weather-card__moon-illumination">${illuminationStr} beleuchtet</span>`
              : ""
          }
        </div>
        <div class="weather-card__sun-times">
          <span>↑ ${moonriseLabel}</span>
          <span>↓ ${moonsetLabel}</span>
        </div>
      </button>
    `;
  }

  function renderCloudCoverCard(container, data) {
    const cloudCover = data.cloudCover ?? 0;

    container.innerHTML = `
      <button class="weather-card weather-card--clouds" data-card="clouds" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">☁️</span>
          <span class="weather-card__label">Bedeckungsgrad</span>
        </div>
        <div class="weather-card__blob weather-card__blob--purple">
          <span class="weather-card__value-large">${Math.round(
            cloudCover,
          )}</span>
          <span class="weather-card__unit">%</span>
        </div>
      </button>
    `;
  }

  function renderPollenCard(container, data) {
    const pollenData = data.pollen || { trees: 1, grass: 1, weeds: 1 };

    const createPollenGauge = (value, label, icon) => {
      const color =
        value <= 1
          ? "#4CAF50"
          : value <= 2
            ? "#FFEB3B"
            : value <= 3
              ? "#FF9800"
              : "#F44336";
      return `
        <div class="pollen-gauge">
          ${createCircularProgressSVG(value, 4, color, 50)}
          <div class="pollen-gauge__content">
            <span class="pollen-gauge__icon">${icon}</span>
            <span class="pollen-gauge__label">${label}</span>
            <span class="pollen-gauge__value">${value}/4</span>
            <span class="pollen-gauge__level">${
              value <= 1
                ? "Wenig"
                : value <= 2
                  ? "Moderat"
                  : value <= 3
                    ? "Hoch"
                    : "Sehr hoch"
            }</span>
          </div>
        </div>
      `;
    };

    container.innerHTML = `
      <button class="weather-card weather-card--pollen weather-card--wide" data-card="pollen" type="button">
        <div class="weather-card__header">
          <span class="weather-card__icon">🌿</span>
          <span class="weather-card__label">Pollenflug</span>
        </div>
        <div class="weather-card__pollen-grid">
          ${createPollenGauge(pollenData.trees || 1, "Bäume", "🌳")}
          ${createPollenGauge(pollenData.grass || 1, "Gräser", "🌾")}
          ${createPollenGauge(pollenData.weeds || 1, "Kräuter", "🌱")}
        </div>
      </button>
    `;
  }

  // === DETAIL MODALS ===

  function openCardDetailModal(cardType, appState) {
    console.log(
      `[openCardDetailModal] Called with cardType="${cardType}"`,
      appState,
    );

    const current = appState.current || {};
    const daily = (appState.daily && appState.daily[0]) || {};
    const hourly = appState.hourly || [];
    const aqi = appState.aqi || {};
    const pollen = appState.pollen || { trees: 1, grass: 1, weeds: 1 };
    const moonPhase = appState.moonPhase || {};

    const modalContent = getModalContent(cardType, {
      current,
      daily,
      hourly,
      aqi,
      pollen,
      moonPhase,
    });

    const sheetId = `sheet-${cardType}-detail`;
    let sheet = document.getElementById(sheetId);

    console.log(
      `[openCardDetailModal] Looking for sheet "${sheetId}": ${!!sheet}`,
    );

    if (!sheet) {
      console.log(`[openCardDetailModal] Creating new sheet "${sheetId}"`);
      sheet = document.createElement("section");
      sheet.id = sheetId;
      sheet.className = "bottom-sheet bottom-sheet--full";

      const overlay = document.getElementById("bottom-sheet-overlay");
      console.log(`[openCardDetailModal] Overlay element:`, overlay);

      if (overlay) {
        overlay.appendChild(sheet);
        console.log(`[openCardDetailModal] Sheet appended to overlay`);
      } else {
        console.error(`[openCardDetailModal] bottom-sheet-overlay not found!`);
        return;
      }
    }

    sheet.innerHTML = modalContent;
    console.log(`[openCardDetailModal] Sheet content set`);

    // AQI Tab-Umschaltlogik initialisieren
    if (cardType === "aqi") {
      initAqiTabs(sheet);
    }

    console.log(
      `[openCardDetailModal] ModalController available:`,
      !!window.ModalController,
    );
    if (window.ModalController) {
      console.log(
        `[openCardDetailModal] Calling ModalController.openSheet("${sheetId}")`,
      );
      window.ModalController.openSheet(sheetId);
    } else {
      console.error(`[openCardDetailModal] ModalController not available!`);
    }
  }

  /**
   * Initialisiert die AQI Tab-Umschaltung
   */
  function initAqiTabs(container) {
    const tabs = container.querySelectorAll("[data-aqi-type]");
    const euContent = container.querySelector("#aqi-content-eu");
    const usContent = container.querySelector("#aqi-content-us");

    if (!tabs.length || !euContent || !usContent) return;

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        // Aktiven Tab wechseln
        tabs.forEach((t) => t.classList.remove("detail-card__tab--active"));
        tab.classList.add("detail-card__tab--active");

        // Inhalt umschalten
        const type = tab.dataset.aqiType;
        if (type === "eu") {
          euContent.style.display = "block";
          usContent.style.display = "none";
        } else {
          euContent.style.display = "none";
          usContent.style.display = "block";
        }
      });
    });
  }

  function getModalContent(type, data) {
    const { current, daily, hourly, aqi, pollen, moonPhase } = data;

    const templates = {
      humidity: () => {
        const humidity = current.humidity ?? 0;
        const dewPoint = current.dewPoint ?? 0;
        const temperature = current.temperature ?? 20;

        // Komfort-Bewertung
        const getHumidityInfo = (h) => {
          if (h < 25)
            return {
              label: "Sehr trocken",
              color: "#FF9800",
              desc: "Kann Haut und Atemwege reizen",
              icon: "🌵",
            };
          if (h < 40)
            return {
              label: "Trocken",
              color: "#FFEB3B",
              desc: "Leicht unter dem Idealbereich",
              icon: "🌤️",
            };
          if (h < 60)
            return {
              label: "Angenehm",
              color: "#4CAF50",
              desc: "Idealer Komfortbereich",
              icon: "😊",
            };
          if (h < 70)
            return {
              label: "Feucht",
              color: "#64B5F6",
              desc: "Leicht über dem Idealbereich",
              icon: "💧",
            };
          if (h < 85)
            return {
              label: "Sehr feucht",
              color: "#42A5F5",
              desc: "Kann sich schwül anfühlen",
              icon: "💦",
            };
          return {
            label: "Extrem feucht",
            color: "#1E88E5",
            desc: "Schwül, unangenehm",
            icon: "🌫️",
          };
        };

        const humidityInfo = getHumidityInfo(humidity);

        // Schwüle-Berechnung basierend auf Taupunkt
        const getSwelterInfo = (dp) => {
          if (dp < 10) return { label: "Trocken", color: "#4CAF50" };
          if (dp < 16) return { label: "Angenehm", color: "#8BC34A" };
          if (dp < 18) return { label: "Leicht feucht", color: "#CDDC39" };
          if (dp < 21) return { label: "Feucht", color: "#FFEB3B" };
          if (dp < 24) return { label: "Schwül", color: "#FF9800" };
          return { label: "Sehr schwül", color: "#F44336" };
        };

        const swelterInfo = getSwelterInfo(dewPoint);

        // Stündliche Luftfeuchtigkeit-Vorhersage
        const hourlyHumidity = hourly
          .slice(0, 12)
          .map((h) => {
            const hHumidity = h.humidity ?? 50;
            const hInfo = getHumidityInfo(hHumidity);
            return `
          <div class="hourly-bar">
            <div class="hourly-bar__fill hourly-bar__fill--humidity" style="--bar-height:${hHumidity}%;--humidity-color:${
              hInfo.color
            }"></div>
            <span class="hourly-bar__value">${Math.round(hHumidity)}%</span>
            <span class="hourly-bar__time">${new Date(
              h.time,
            ).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}</span>
          </div>
        `;
          })
          .join("");

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">💧</span>
            <h2 class="bottom-sheet__title">Luftfeuchtigkeit</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktuelle Bedingungen</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${
                  humidityInfo.color
                }">${Math.round(humidity)}%</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Komfort:</span>
                <span style="font-weight:600;color:${humidityInfo.color}">${
                  humidityInfo.icon
                } ${humidityInfo.label}</span>
              </div>
              <div class="detail-card__row">
                <span>Taupunkt:</span>
                <span style="font-weight:600">${Math.round(dewPoint)}°C</span>
              </div>
              <div class="detail-card__row">
                <span>Schwüle-Gefühl:</span>
                <span style="font-weight:600;color:${swelterInfo.color}">${
                  swelterInfo.label
                }</span>
              </div>
              <p class="detail-text" style="margin-top:8px;font-size:0.9rem">${
                humidityInfo.desc
              }</p>
            </div>
            <div class="detail-card">
              <h3>Stündliche Vorhersage</h3>
              <p class="detail-text--muted" style="font-size:0.85rem;margin-bottom:8px">
                Luftfeuchtigkeit in %
              </p>
              <div class="hourly-bars">${hourlyHumidity}</div>
            </div>
            <div class="detail-card">
              <h3>Komfort-Skala</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li><span style="color:#FF9800">●</span> 0-25% – Sehr trocken (Hautreizungen möglich)</li>
                <li><span style="color:#FFEB3B">●</span> 25-40% – Trocken</li>
                <li><span style="color:#4CAF50">●</span> 40-60% – Angenehm (Idealbereich)</li>
                <li><span style="color:#64B5F6">●</span> 60-70% – Feucht</li>
                <li><span style="color:#42A5F5">●</span> 70-85% – Sehr feucht (schwül)</li>
                <li><span style="color:#1E88E5">●</span> 85%+ – Extrem feucht</li>
              </ul>
            </div>
            <div class="detail-card">
              <p class="detail-text">Die <strong>Luftfeuchtigkeit</strong> gibt an, wie viel Wasserdampf in der Luft enthalten ist.</p>
              <p class="detail-text">Der <strong>Taupunkt</strong> ist die Temperatur, bei der die Luft gesättigt ist. Je höher der Taupunkt, desto schwüler fühlt es sich an.</p>
            </div>
          </div>
        `;
      },

      aqi: () => {
        const usAqi = aqi.usAqi ?? 0;
        const euAqi = aqi.europeanAqi ?? 0;

        // EU AQI Labels und Farben
        const getEuAqiInfo = (value) => {
          if (value <= 20)
            return {
              label: "Gut",
              color: "#50C878",
              desc: "Die Luftqualität ist zufriedenstellend und stellt kein oder nur ein geringes Gesundheitsrisiko dar.",
            };
          if (value <= 40)
            return {
              label: "Akzeptabel",
              color: "#9ACD32",
              desc: "Die Luftqualität ist insgesamt akzeptabel. Empfindliche Personen können jedoch leichte Auswirkungen spüren.",
            };
          if (value <= 60)
            return {
              label: "Mäßig",
              color: "#FFD700",
              desc: "Mitglieder empfindlicher Gruppen können gesundheitliche Auswirkungen erfahren.",
            };
          if (value <= 80)
            return {
              label: "Schlecht",
              color: "#FF8C00",
              desc: "Jeder kann gesundheitliche Auswirkungen erfahren; empfindliche Gruppen können ernsthafte Auswirkungen erleben.",
            };
          if (value <= 100)
            return {
              label: "Sehr schlecht",
              color: "#FF4500",
              desc: "Gesundheitswarnungen für Notfallbedingungen. Die gesamte Bevölkerung ist wahrscheinlich betroffen.",
            };
          return {
            label: "Extrem schlecht",
            color: "#8B0000",
            desc: "Gesundheitswarnung: Jeder kann ernsthafte gesundheitliche Auswirkungen erfahren.",
          };
        };

        // US AQI Labels und Farben
        const getUsAqiInfo = (value) => {
          if (value <= 50)
            return {
              label: "Gut",
              color: "#00E400",
              desc: "Die Luftqualität ist zufriedenstellend und die Luftverschmutzung stellt wenig oder kein Risiko dar.",
            };
          if (value <= 100)
            return {
              label: "Mäßig",
              color: "#FFFF00",
              desc: "Die Luftqualität ist akzeptabel. Bei manchen Schadstoffen kann es jedoch für eine kleine Anzahl von Personen ein mäßiges Gesundheitsrisiko geben.",
            };
          if (value <= 150)
            return {
              label: "Ungesund für empfindliche Gruppen",
              color: "#FF7E00",
              desc: "Mitglieder empfindlicher Gruppen können gesundheitliche Auswirkungen erfahren. Die allgemeine Öffentlichkeit ist wahrscheinlich nicht betroffen.",
            };
          if (value <= 200)
            return {
              label: "Ungesund",
              color: "#FF0000",
              desc: "Jeder kann beginnen, gesundheitliche Auswirkungen zu erfahren; empfindliche Gruppen können ernstere Auswirkungen erleben.",
            };
          if (value <= 300)
            return {
              label: "Sehr ungesund",
              color: "#8F3F97",
              desc: "Gesundheitswarnungen für erhöhte Exposition. Die gesamte Bevölkerung ist wahrscheinlich betroffen.",
            };
          return {
            label: "Gefährlich",
            color: "#7E0023",
            desc: "Gesundheitswarnung: Jeder kann ernsthafte gesundheitliche Auswirkungen erfahren.",
          };
        };

        const euInfo = getEuAqiInfo(euAqi);
        const usInfo = getUsAqiInfo(usAqi);

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">≋</span>
            <h2 class="bottom-sheet__title">Luftqualität</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card__tabs" id="aqi-tabs">
              <button class="detail-card__tab detail-card__tab--active" data-aqi-type="eu">EU AQI</button>
              <button class="detail-card__tab" data-aqi-type="us">US AQI</button>
            </div>

            <!-- EU AQI Content -->
            <div class="aqi-content" id="aqi-content-eu" style="display: block;">
              <div class="detail-card">
                <h3>Europäischer Luftqualitätsindex</h3>
                <div class="detail-card__hero">
                  <span class="detail-card__value" style="color: ${
                    euInfo.color
                  }">${Math.round(euAqi)}</span>
                  <span class="detail-card__label" style="color: ${
                    euInfo.color
                  }">${euInfo.label}</span>
                </div>
                <div class="aqi-gradient aqi-gradient--eu">
                  <div class="aqi-gradient__bar aqi-gradient__bar--eu"></div>
                  <div class="aqi-gradient__marker" style="left:${Math.min(
                    (euAqi / 100) * 100,
                    100,
                  )}%"></div>
                </div>
                <p class="detail-text" style="margin-top: 12px; font-size: 0.9rem;">${
                  euInfo.desc
                }</p>
              </div>
              <div class="detail-card">
                <h3>EU AQI Skala</h3>
                <ul class="detail-card__list aqi-scale-list">
                  <li><span class="aqi-dot" style="background:#50C878"></span><strong>0-20 Gut:</strong> Ideale Luftqualität für Outdoor-Aktivitäten.</li>
                  <li><span class="aqi-dot" style="background:#9ACD32"></span><strong>21-40 Akzeptabel:</strong> Luftqualität ist insgesamt akzeptabel.</li>
                  <li><span class="aqi-dot" style="background:#FFD700"></span><strong>41-60 Mäßig:</strong> Empfindliche Personen sollten vorsichtig sein.</li>
                  <li><span class="aqi-dot" style="background:#FF8C00"></span><strong>61-80 Schlecht:</strong> Gesundheitliche Auswirkungen möglich.</li>
                  <li><span class="aqi-dot" style="background:#FF4500"></span><strong>81-100 Sehr schlecht:</strong> Outdoor-Aktivitäten einschränken.</li>
                  <li><span class="aqi-dot" style="background:#8B0000"></span><strong>>100 Extrem:</strong> Outdoor-Aufenthalt vermeiden.</li>
                </ul>
              </div>
            </div>

            <!-- US AQI Content -->
            <div class="aqi-content" id="aqi-content-us" style="display: none;">
              <div class="detail-card">
                <h3>US Luftqualitätsindex</h3>
                <div class="detail-card__hero">
                  <span class="detail-card__value" style="color: ${
                    usInfo.color
                  }">${Math.round(usAqi)}</span>
                  <span class="detail-card__label" style="color: ${
                    usInfo.color
                  }">${usInfo.label}</span>
                </div>
                <div class="aqi-gradient aqi-gradient--us">
                  <div class="aqi-gradient__bar aqi-gradient__bar--us"></div>
                  <div class="aqi-gradient__marker" style="left:${Math.min(
                    (usAqi / 300) * 100,
                    100,
                  )}%"></div>
                </div>
                <p class="detail-text" style="margin-top: 12px; font-size: 0.9rem;">${
                  usInfo.desc
                }</p>
              </div>
              <div class="detail-card">
                <h3>US AQI Skala</h3>
                <ul class="detail-card__list aqi-scale-list">
                  <li><span class="aqi-dot" style="background:#00E400"></span><strong>0-50 Gut:</strong> Die Luftqualität ist zufriedenstellend.</li>
                  <li><span class="aqi-dot" style="background:#FFFF00"></span><strong>51-100 Mäßig:</strong> Akzeptable Luftqualität.</li>
                  <li><span class="aqi-dot" style="background:#FF7E00"></span><strong>101-150 USG:</strong> Ungesund für empfindliche Gruppen.</li>
                  <li><span class="aqi-dot" style="background:#FF0000"></span><strong>151-200 Ungesund:</strong> Jeder kann Auswirkungen spüren.</li>
                  <li><span class="aqi-dot" style="background:#8F3F97"></span><strong>201-300 Sehr ungesund:</strong> Gesundheitswarnungen.</li>
                  <li><span class="aqi-dot" style="background:#7E0023"></span><strong>>300 Gefährlich:</strong> Ernste Gesundheitsgefahr.</li>
                </ul>
              </div>
            </div>

            <div class="detail-card">
              <h3>💡 Vergleich der Werte</h3>
              <div class="detail-card__row">
                <span>Europäischer AQI:</span>
                <span class="detail-card__badge" style="background: ${
                  euInfo.color
                }20; color: ${euInfo.color}">${Math.round(euAqi)} (${
                  euInfo.label
                })</span>
              </div>
              <div class="detail-card__row">
                <span>US AQI:</span>
                <span class="detail-card__badge" style="background: ${
                  usInfo.color
                }20; color: ${usInfo.color}">${Math.round(usAqi)} (${
                  usInfo.label
                })</span>
              </div>
              <p class="detail-text--secondary" style="font-size: 0.8rem; margin-top: 8px;">
                Der EU AQI verwendet eine Skala von 0-100+, während der US AQI eine Skala von 0-500 verwendet.
                Die Schwellenwerte für Gesundheitswarnungen unterscheiden sich ebenfalls.
              </p>
            </div>
          </div>
        `;
      },

      uv: () => {
        const uvCurrent = Math.round(current.uvIndex ?? 0);
        const uvMax = Math.round(daily.uvIndexMax ?? uvCurrent);

        // UV-Level Funktion
        const getUVInfo = (uv) => {
          if (uv <= 2)
            return {
              label: "Niedrig",
              color: "#4CAF50",
              desc: "Kein Schutz erforderlich",
            };
          if (uv <= 5)
            return {
              label: "Moderat",
              color: "#FFEB3B",
              desc: "Schutz empfohlen",
            };
          if (uv <= 7)
            return {
              label: "Hoch",
              color: "#FF9800",
              desc: "Schutz erforderlich",
            };
          if (uv <= 10)
            return {
              label: "Sehr hoch",
              color: "#F44336",
              desc: "Zusätzlicher Schutz nötig",
            };
          return {
            label: "Extrem",
            color: "#9C27B0",
            desc: "Alle Vorsichtsmaßnahmen treffen",
          };
        };

        const uvInfo = getUVInfo(uvCurrent);
        const uvMaxInfo = getUVInfo(uvMax);

        // Farbe basierend auf UV-Wert für Balken
        const getBarColor = (uv) => {
          if (uv <= 2) return "#4CAF50";
          if (uv <= 5) return "#FFEB3B";
          if (uv <= 7) return "#FF9800";
          if (uv <= 10) return "#F44336";
          return "#9C27B0";
        };

        // Create hourly UV data
        const hourlyUV = hourly
          .slice(0, 12)
          .map((h) => {
            const hUV = Math.round(h.uvIndex || 0);
            const barColor = getBarColor(hUV);
            return `
          <div class="hourly-bar">
            <div class="hourly-bar__fill hourly-bar__fill--uv" style="--bar-height:${
              (hUV / 11) * 100
            }%;--uv-color:${barColor}"></div>
            <span class="hourly-bar__value">${hUV}</span>
            <span class="hourly-bar__time">${new Date(
              h.time,
            ).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}</span>
          </div>
        `;
          })
          .join("");

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">☀️</span>
            <h2 class="bottom-sheet__title">UV-Index</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktueller UV-Index</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${uvInfo.color}">${uvCurrent}</span>
                <span class="detail-card__label" style="color:${uvInfo.color}">${uvInfo.label}</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Tagesmaximum:</span>
                <span style="font-weight:600;color:${uvMaxInfo.color}">${uvMax} (${uvMaxInfo.label})</span>
              </div>
              <div class="detail-card__row">
                <span>Empfehlung:</span>
                <span style="font-weight:600">${uvInfo.desc}</span>
              </div>
            </div>
            <div class="detail-card">
              <h3>Stündliche Vorhersage</h3>
              <p class="detail-text--muted" style="font-size:0.85rem;margin-bottom:8px">
                Balkenfarbe zeigt UV-Intensität (grün=niedrig → lila=extrem)
              </p>
              <div class="hourly-bars">${hourlyUV}</div>
            </div>
            <div class="detail-card">
              <h3>UV-Index Skala</h3>
              <ul class="detail-card__list" style="font-size:0.9rem">
                <li><span style="color:#4CAF50">●</span> 0-2 Niedrig – Kein Schutz erforderlich</li>
                <li><span style="color:#FFEB3B">●</span> 3-5 Moderat – Sonnenschutz empfohlen</li>
                <li><span style="color:#FF9800">●</span> 6-7 Hoch – Schutz erforderlich, Schatten suchen</li>
                <li><span style="color:#F44336">●</span> 8-10 Sehr hoch – Mittagssonne meiden</li>
                <li><span style="color:#9C27B0">●</span> 11+ Extrem – Alle Vorsichtsmaßnahmen treffen</li>
              </ul>
            </div>
            <div class="detail-card">
              <p>Der <strong>UV-Index</strong> gibt die Stärke der ultravioletten Strahlung der Sonne an. Höhere Werte bedeuten mehr Sonnenbrandrisiko.</p>
              <p>Die Werte sind am höchsten um die Mittagszeit und im Sommer. Bei hohem UV-Index: Sonnencreme (LSF 30+), Kopfbedeckung und Sonnenbrille tragen.</p>
            </div>
          </div>
        `;
      },

      precipitation: () => {
        const precipSum = daily.precipitationSum ?? 0;
        const precipProb = daily.precipProbMax ?? 0;
        const precipHours = daily.precipitationHours ?? 0;

        // Bewertung der Niederschlagsintensität
        const getPrecipInfo = (mm) => {
          if (mm === 0)
            return { label: "Kein Niederschlag", icon: "☀️", color: "#4CAF50" };
          if (mm < 2.5)
            return {
              label: "Leichter Niederschlag",
              icon: "🌧️",
              color: "#64B5F6",
            };
          if (mm < 7.5)
            return {
              label: "Mäßiger Niederschlag",
              icon: "🌧️",
              color: "#42A5F5",
            };
          if (mm < 25)
            return {
              label: "Starker Niederschlag",
              icon: "⛈️",
              color: "#1E88E5",
            };
          return {
            label: "Sehr starker Niederschlag",
            icon: "⛈️",
            color: "#1565C0",
          };
        };

        const precipInfo = getPrecipInfo(precipSum);

        const hourlyPrecip = hourly
          .slice(0, 12)
          .map(
            (h) => `
          <div class="hourly-bar">
            <div class="hourly-bar__fill hourly-bar__fill--precip" style="--bar-height:${
              h.precipProb || 0
            }%"></div>
            <span class="hourly-bar__value">${h.precipProb || 0}%</span>
            <span class="hourly-bar__amount">${(h.precipitation || 0).toFixed(
              1,
            )}</span>
            <span class="hourly-bar__time">${new Date(
              h.time,
            ).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}</span>
          </div>
        `,
          )
          .join("");

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">🌧️</span>
            <h2 class="bottom-sheet__title">Niederschlag</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Niederschlagsmenge</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value">${precipSum.toFixed(1)}</span>
                <span class="detail-card__label">mm • heute</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Max. Wahrscheinlichkeit:</span>
                <span style="font-weight:600">${Math.round(precipProb)}%</span>
              </div>
              <div class="detail-card__row">
                <span>Niederschlagsstunden:</span>
                <span style="font-weight:600">${precipHours.toFixed(1)} h</span>
              </div>
              <div class="detail-card__row">
                <span>Bewertung:</span>
                <span style="font-weight:600;color:${precipInfo.color}">${
                  precipInfo.icon
                } ${precipInfo.label}</span>
              </div>
            </div>
            <div class="detail-card">
              <h3>Stündliche Vorhersage</h3>
              <p class="detail-text--muted" style="font-size:0.85rem;margin-bottom:8px">
                Balken = Wahrscheinlichkeit (%) • Wert unter Balken = Menge (mm)
              </p>
              <div class="hourly-bars">${hourlyPrecip}</div>
            </div>
            <div class="detail-card">
              <h3>Intensitätsskala</h3>
              <ul class="detail-card__list" style="font-size:0.9rem">
                <li><span style="color:#4CAF50">☀️</span> 0 mm – Kein Niederschlag</li>
                <li><span style="color:#64B5F6">🌧️</span> 0.1-2.5 mm – Leicht (Nieselregen)</li>
                <li><span style="color:#42A5F5">🌧️</span> 2.5-7.5 mm – Mäßig</li>
                <li><span style="color:#1E88E5">⛈️</span> 7.5-25 mm – Stark</li>
                <li><span style="color:#1565C0">⛈️</span> >25 mm – Sehr stark (Starkregen)</li>
              </ul>
            </div>
            <div class="detail-card">
              <p class="detail-text">Die <strong>Niederschlagsmenge</strong> gibt an, wie viel Regen/Schnee zu erwarten ist, gemessen in Millimetern (1 mm = 1 Liter pro m²).</p>
              <p class="detail-text">Die <strong>Niederschlagswahrscheinlichkeit</strong> bezeichnet die Wahrscheinlichkeit, dass es in einem bestimmten
              Zeitraum zu Niederschlägen kommt.</p>
            </div>
          </div>
        `;
      },

      wind: () => {
        const windSpeed = current.windSpeed ?? 0;
        const windGust = current.windGust ?? 0;
        const windDir = current.windDirection ?? 0;
        const windDirLabel = getWindDirectionLabel(windDir);
        const windSpeedMax = daily.windSpeedMax ?? windSpeed;

        // Beaufort-Skala für Windstärke
        const getWindInfo = (speed) => {
          if (speed < 1)
            return { bft: 0, label: "Windstille", color: "#90CAF9" };
          if (speed < 6)
            return { bft: 1, label: "Leiser Zug", color: "#64B5F6" };
          if (speed < 12)
            return { bft: 2, label: "Leichte Brise", color: "#42A5F5" };
          if (speed < 20)
            return { bft: 3, label: "Schwache Brise", color: "#2196F3" };
          if (speed < 29)
            return { bft: 4, label: "Mäßige Brise", color: "#1E88E5" };
          if (speed < 39)
            return { bft: 5, label: "Frische Brise", color: "#1976D2" };
          if (speed < 50)
            return { bft: 6, label: "Starker Wind", color: "#FFA726" };
          if (speed < 62)
            return { bft: 7, label: "Steifer Wind", color: "#FF9800" };
          if (speed < 75)
            return { bft: 8, label: "Stürmischer Wind", color: "#FF7043" };
          if (speed < 89) return { bft: 9, label: "Sturm", color: "#FF5722" };
          if (speed < 103)
            return { bft: 10, label: "Schwerer Sturm", color: "#F44336" };
          if (speed < 118)
            return { bft: 11, label: "Orkanartiger Sturm", color: "#E53935" };
          return { bft: 12, label: "Orkan", color: "#B71C1C" };
        };

        const windInfo = getWindInfo(windSpeed);

        // Stündliche Windvorhersage
        const hourlyWind = hourly
          .slice(0, 12)
          .map((h) => {
            const hSpeed = Math.round(h.windSpeed || 0);
            const hInfo = getWindInfo(hSpeed);
            return `
          <div class="hourly-bar">
            <div class="hourly-bar__fill hourly-bar__fill--wind" style="--bar-height:${Math.min(
              (hSpeed / 100) * 100,
              100,
            )}%;--wind-color:${hInfo.color}"></div>
            <span class="hourly-bar__value">${hSpeed}</span>
            <span class="hourly-bar__time">${new Date(
              h.time,
            ).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}</span>
          </div>
        `;
          })
          .join("");

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">💨</span>
            <h2 class="bottom-sheet__title">Wind</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktueller Wind</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${
                  windInfo.color
                }">${Math.round(windSpeed)}</span>
                <span class="detail-card__label">km/h • Bft ${
                  windInfo.bft
                }</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Windstärke:</span>
                <span style="font-weight:600;color:${windInfo.color}">${
                  windInfo.label
                }</span>
              </div>
              <div class="detail-card__row">
                <span>Böen:</span>
                <span style="font-weight:600">${Math.round(
                  windGust,
                )} km/h</span>
              </div>
              <div class="detail-card__row">
                <span>Richtung:</span>
                <span style="font-weight:600">${windDirLabel} (${Math.round(
                  windDir,
                )}°)</span>
              </div>
              <div class="detail-card__row">
                <span>Tagesmaximum:</span>
                <span style="font-weight:600">${Math.round(
                  windSpeedMax,
                )} km/h</span>
              </div>
            </div>
            <div class="detail-card">
              <h3>Stündliche Vorhersage</h3>
              <p class="detail-text--muted" style="font-size:0.85rem;margin-bottom:8px">
                Windgeschwindigkeit in km/h
              </p>
              <div class="hourly-bars">${hourlyWind}</div>
            </div>
            <div class="detail-card">
              <h3>Beaufort-Skala</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li><span style="color:#90CAF9">●</span> Bft 0-1: Windstille bis leiser Zug (0-5 km/h)</li>
                <li><span style="color:#42A5F5">●</span> Bft 2-3: Leichte bis schwache Brise (6-19 km/h)</li>
                <li><span style="color:#1976D2">●</span> Bft 4-5: Mäßige bis frische Brise (20-38 km/h)</li>
                <li><span style="color:#FF9800">●</span> Bft 6-7: Starker bis steifer Wind (39-61 km/h)</li>
                <li><span style="color:#FF5722">●</span> Bft 8-9: Stürmisch bis Sturm (62-88 km/h)</li>
                <li><span style="color:#F44336">●</span> Bft 10-12: Schwerer Sturm bis Orkan (89+ km/h)</li>
              </ul>
            </div>
            <div class="detail-card">
              <p class="detail-text">Die <strong>Windgeschwindigkeit</strong> wird in 10m Höhe über dem Boden gemessen.</p>
              <p class="detail-text"><strong>Böen</strong> sind kurzzeitige Windspitzen, die deutlich stärker sein können als der Durchschnittswind.</p>
            </div>
          </div>
        `;
      },

      visibility: () => {
        const visibility = current.visibility ?? 10;

        // Bewertung der Sichtweite
        const getVisInfo = (km) => {
          if (km >= 50)
            return {
              label: "Ausgezeichnet",
              color: "#4CAF50",
              desc: "Kristallklare Sicht, perfekt für Outdoor-Aktivitäten",
            };
          if (km >= 20)
            return {
              label: "Sehr gut",
              color: "#8BC34A",
              desc: "Sehr gute Sichtverhältnisse",
            };
          if (km >= 10)
            return {
              label: "Gut",
              color: "#CDDC39",
              desc: "Gute Sichtverhältnisse für die meisten Aktivitäten",
            };
          if (km >= 4)
            return {
              label: "Mäßig",
              color: "#FFEB3B",
              desc: "Leicht eingeschränkte Sicht, möglicherweise durch Dunst oder leichten Nebel",
            };
          if (km >= 1)
            return {
              label: "Schlecht",
              color: "#FF9800",
              desc: "Eingeschränkte Sicht, Vorsicht im Straßenverkehr",
            };
          return {
            label: "Sehr schlecht",
            color: "#F44336",
            desc: "Stark eingeschränkte Sicht durch Nebel, erhöhte Unfallgefahr",
          };
        };

        const visInfo = getVisInfo(visibility);

        // Stündliche Sichtweite-Vorhersage
        const hourlyVis = hourly
          .slice(0, 12)
          .map((h) => {
            const hVis = h.visibility ?? 10;
            const hInfo = getVisInfo(hVis);
            // Normalisiere auf 0-100% (max 50km = 100%)
            const barHeight = Math.min((hVis / 50) * 100, 100);
            return `
          <div class="hourly-bar">
            <div class="hourly-bar__fill hourly-bar__fill--visibility" style="--bar-height:${barHeight}%;--vis-color:${
              hInfo.color
            }"></div>
            <span class="hourly-bar__value">${Math.round(hVis)}</span>
            <span class="hourly-bar__time">${new Date(
              h.time,
            ).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}</span>
          </div>
        `;
          })
          .join("");

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">👁️</span>
            <h2 class="bottom-sheet__title">Sichtweite</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktuelle Sichtweite</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${
                  visInfo.color
                }">${Math.round(visibility)}</span>
                <span class="detail-card__label">km</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Bewertung:</span>
                <span style="font-weight:600;color:${visInfo.color}">${
                  visInfo.label
                }</span>
              </div>
              <p class="detail-text" style="margin-top:8px;font-size:0.9rem">${
                visInfo.desc
              }</p>
            </div>
            <div class="detail-card">
              <h3>Stündliche Vorhersage</h3>
              <p class="detail-text--muted" style="font-size:0.85rem;margin-bottom:8px">
                Sichtweite in km
              </p>
              <div class="hourly-bars">${hourlyVis}</div>
            </div>
            <div class="detail-card">
              <h3>Sichtweite-Skala</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li><span style="color:#4CAF50">●</span> 50+ km – Ausgezeichnet (kristallklar)</li>
                <li><span style="color:#8BC34A">●</span> 20-50 km – Sehr gut</li>
                <li><span style="color:#CDDC39">●</span> 10-20 km – Gut</li>
                <li><span style="color:#FFEB3B">●</span> 4-10 km – Mäßig (Dunst)</li>
                <li><span style="color:#FF9800">●</span> 1-4 km – Schlecht (leichter Nebel)</li>
                <li><span style="color:#F44336">●</span> <1 km – Sehr schlecht (dichter Nebel)</li>
              </ul>
            </div>
            <div class="detail-card">
              <p class="detail-text">Die <strong>Sichtweite</strong> gibt an, wie weit man unter den aktuellen atmosphärischen Bedingungen sehen kann.</p>
              <p>Sie wird beeinflusst durch Nebel, Dunst, Regen, Schnee und Luftverschmutzung.</p>
            </div>
          </div>
        `;
      },

      pressure: () => {
        const pressure = current.pressure ?? 1013;

        // Bewertung des Luftdrucks
        const getPressureInfo = (hPa) => {
          if (hPa >= 1030)
            return {
              label: "Sehr hoch",
              color: "#4CAF50",
              desc: "Sehr stabiles, sonniges Wetter",
              icon: "☀️",
            };
          if (hPa >= 1020)
            return {
              label: "Hoch",
              color: "#8BC34A",
              desc: "Stabiles, meist sonniges Wetter",
              icon: "🌤️",
            };
          if (hPa >= 1010)
            return {
              label: "Normal",
              color: "#CDDC39",
              desc: "Durchschnittlicher Luftdruck",
              icon: "⛅",
            };
          if (hPa >= 1000)
            return {
              label: "Leicht tief",
              color: "#FFEB3B",
              desc: "Möglicherweise bewölkt oder wechselhaft",
              icon: "🌥️",
            };
          if (hPa >= 990)
            return {
              label: "Tief",
              color: "#FF9800",
              desc: "Wechselhaftes Wetter, Regen möglich",
              icon: "🌧️",
            };
          return {
            label: "Sehr tief",
            color: "#F44336",
            desc: "Sturmgefahr, starke Niederschläge möglich",
            icon: "⛈️",
          };
        };

        const pressureInfo = getPressureInfo(pressure);

        // Berechne Trend aus den letzten Stunden (wenn hourly verfügbar)
        let trend = "stabil";
        let trendIcon = "↔️";
        let trendColor = "#CDDC39";
        if (hourly.length >= 3) {
          const recent = hourly
            .slice(0, 3)
            .map((h) => h.pressure || h.surfacePressure || 1013);
          const diff = recent[0] - recent[2]; // Aktuell vs. vor 2 Stunden
          if (diff > 2) {
            trend = "steigend";
            trendIcon = "↗️";
            trendColor = "#4CAF50";
          } else if (diff < -2) {
            trend = "fallend";
            trendIcon = "↘️";
            trendColor = "#FF9800";
          }
        }

        // Stündliche Luftdruck-Vorhersage
        const hourlyPressure = hourly
          .slice(0, 12)
          .map((h) => {
            const hPressure = h.pressure || h.surfacePressure || 1013;
            const hInfo = getPressureInfo(hPressure);
            // Normalisiere auf 0-100% (950-1050 hPa)
            const barHeight = Math.min(
              Math.max(((hPressure - 950) / 100) * 100, 0),
              100,
            );
            return `
          <div class="hourly-bar">
            <div class="hourly-bar__fill hourly-bar__fill--pressure" style="--bar-height:${barHeight}%;--pressure-color:${
              hInfo.color
            }"></div>
            <span class="hourly-bar__value">${Math.round(hPressure)}</span>
            <span class="hourly-bar__time">${new Date(
              h.time,
            ).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}</span>
          </div>
        `;
          })
          .join("");

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">🌡️</span>
            <h2 class="bottom-sheet__title">Luftdruck</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktueller Luftdruck</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${
                  pressureInfo.color
                }">${Math.round(pressure)}</span>
                <span class="detail-card__label">hPa</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Bewertung:</span>
                <span style="font-weight:600;color:${pressureInfo.color}">${
                  pressureInfo.icon
                } ${pressureInfo.label}</span>
              </div>
              <div class="detail-card__row">
                <span>Trend:</span>
                <span style="font-weight:600;color:${trendColor}">${trendIcon} ${trend}</span>
              </div>
              <p class="detail-text" style="margin-top:8px;font-size:0.9rem">${
                pressureInfo.desc
              }</p>
            </div>
            <div class="detail-card">
              <h3>Stündliche Vorhersage</h3>
              <p class="detail-text--muted" style="font-size:0.85rem;margin-bottom:8px">
                Luftdruck in hPa
              </p>
              <div class="hourly-bars">${hourlyPressure}</div>
            </div>
            <div class="detail-card">
              <h3>Luftdruck-Skala</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li><span style="color:#4CAF50">●</span> 1030+ hPa – Sehr hoch (stabiles Hochdruckwetter)</li>
                <li><span style="color:#8BC34A">●</span> 1020-1030 hPa – Hoch (sonnig, trocken)</li>
                <li><span style="color:#CDDC39">●</span> 1010-1020 hPa – Normal</li>
                <li><span style="color:#FFEB3B">●</span> 1000-1010 hPa – Leicht tief (wechselhaft)</li>
                <li><span style="color:#FF9800">●</span> 990-1000 hPa – Tief (Regen wahrscheinlich)</li>
                <li><span style="color:#F44336">●</span> <990 hPa – Sehr tief (Sturmgefahr)</li>
              </ul>
            </div>
            <div class="detail-card">
              <p class="detail-text">Der <strong>Luftdruck</strong> ist das Gewicht der Luftsäule über uns. Er wird auf Meereshöhe gemessen (MSL).</p>
              <p class="detail-text"><strong>Steigender</strong> Druck deutet auf besseres Wetter hin, <strong>fallender</strong> Druck auf Verschlechterung.</p>
            </div>
          </div>
        `;
      },

      sun: () => {
        const sunrise = daily.sunrise;
        const sunset = daily.sunset;
        const now = Date.now();
        const sunriseTime = sunrise ? new Date(sunrise).getTime() : null;
        const sunsetTime = sunset ? new Date(sunset).getTime() : null;

        const sunriseLabel = sunrise
          ? new Date(sunrise).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--";
        const sunsetLabel = sunset
          ? new Date(sunset).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--";

        let daylightStr = "";
        let daylightMinutes = 0;
        if (sunrise && sunset) {
          const diffMs = new Date(sunset) - new Date(sunrise);
          daylightMinutes = Math.floor(diffMs / 60000);
          const hours = Math.floor(diffMs / 3600000);
          const mins = Math.floor((diffMs % 3600000) / 60000);
          daylightStr = `${hours} Std ${mins} Min`;
        }

        // Aktueller Sonnenstand
        let sunStatus = { label: "Nacht", icon: "🌙", color: "#5C6BC0" };
        let timeToNext = "";
        if (sunriseTime && sunsetTime) {
          if (now < sunriseTime) {
            const diffMs = sunriseTime - now;
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            timeToNext = `Sonnenaufgang in ${h}h ${m}min`;
            sunStatus = {
              label: "Vor Sonnenaufgang",
              icon: "🌅",
              color: "#FF7043",
            };
          } else if (now >= sunriseTime && now <= sunsetTime) {
            const progress =
              ((now - sunriseTime) / (sunsetTime - sunriseTime)) * 100;
            const diffMs = sunsetTime - now;
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            timeToNext = `Sonnenuntergang in ${h}h ${m}min`;
            if (progress < 15) {
              sunStatus = {
                label: "Morgendämmerung",
                icon: "🌅",
                color: "#FF7043",
              };
            } else if (progress < 40) {
              sunStatus = { label: "Vormittag", icon: "☀️", color: "#FFB300" };
            } else if (progress < 60) {
              sunStatus = { label: "Mittag", icon: "☀️", color: "#FFD600" };
            } else if (progress < 85) {
              sunStatus = { label: "Nachmittag", icon: "🌤️", color: "#FFA726" };
            } else {
              sunStatus = {
                label: "Abenddämmerung",
                icon: "🌇",
                color: "#FF7043",
              };
            }
          } else {
            const tomorrowSunrise = sunriseTime + 86400000; // +24h
            const diffMs = tomorrowSunrise - now;
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            timeToNext = `Sonnenaufgang in ${h}h ${m}min`;
            sunStatus = {
              label: "Nach Sonnenuntergang",
              icon: "🌙",
              color: "#5C6BC0",
            };
          }
        }

        // Goldene Stunde Berechnung (ca. 1 Stunde nach Sonnenaufgang und vor Sonnenuntergang)
        let goldenHourMorning = "";
        let goldenHourEvening = "";
        if (sunriseTime && sunsetTime) {
          const goldenMorningEnd = new Date(sunriseTime + 3600000);
          const goldenEveningStart = new Date(sunsetTime - 3600000);
          goldenHourMorning = `${new Date(sunriseTime).toLocaleTimeString(
            "de-DE",
            { hour: "2-digit", minute: "2-digit" },
          )} - ${goldenMorningEnd.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
          goldenHourEvening = `${goldenEveningStart.toLocaleTimeString(
            "de-DE",
            { hour: "2-digit", minute: "2-digit" },
          )} - ${sunsetLabel}`;
        }

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">🌅</span>
            <h2 class="bottom-sheet__title">Sonne</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktueller Sonnenstand</h3>
              <div class="detail-card__sun-visual">
                ${createSunPathSVG(sunrise, sunset)}
              </div>
              <div class="detail-card__hero" style="margin-top:8px">
                <span class="detail-card__value" style="font-size:1.5rem;color:${
                  sunStatus.color
                }">${sunStatus.icon} ${sunStatus.label}</span>
              </div>
              <p class="detail-text" style="text-align:center;font-size:0.9rem">${timeToNext}</p>
            </div>
            <div class="detail-card">
              <h3>Zeiten</h3>
              <div class="detail-card__row">
                <span>🌅 Sonnenaufgang:</span>
                <span style="font-weight:600">${sunriseLabel}</span>
              </div>
              <div class="detail-card__row">
                <span>🌇 Sonnenuntergang:</span>
                <span style="font-weight:600">${sunsetLabel}</span>
              </div>
              <div class="detail-card__row">
                <span>☀️ Tageslänge:</span>
                <span style="font-weight:600">${daylightStr}</span>
              </div>
            </div>
            <div class="detail-card">
              <h3>Goldene Stunde</h3>
              <p class="detail-text--muted" style="font-size:0.85rem;margin-bottom:8px">
                Ideales Licht für Fotografie
              </p>
              <div class="detail-card__row">
                <span>🌅 Morgens:</span>
                <span style="font-weight:600">${goldenHourMorning}</span>
              </div>
              <div class="detail-card__row">
                <span>🌇 Abends:</span>
                <span style="font-weight:600">${goldenHourEvening}</span>
              </div>
            </div>
            <div class="detail-card">
              <p class="detail-text">Die <strong>Tageslänge</strong> beträgt heute ${daylightStr}.</p>
              <p class="detail-text">Die <strong>goldene Stunde</strong> bezeichnet die Zeit kurz nach Sonnenaufgang und vor Sonnenuntergang, wenn das Licht besonders warm und weich ist.</p>
            </div>
          </div>
        `;
      },

      moon: () => {
        const moonrise = moonPhase.moonrise || daily.moonrise;
        const moonset = moonPhase.moonset || daily.moonset;
        const phase = moonPhase.phase;
        const illumination = moonPhase.illumination;
        const emoji = moonPhase.emoji || "🌙";
        const description = moonPhase.description;
        const daysSinceNew = moonPhase.daysSinceNew;
        const zodiac = moonPhase.zodiac;

        const moonriseLabel = moonrise
          ? new Date(moonrise).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Nicht verfügbar";
        const moonsetLabel = moonset
          ? new Date(moonset).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Nicht verfügbar";

        // Übersetze englische Phasennamen
        const phaseTranslations = {
          "New Moon": "Neumond",
          "Waxing Crescent": "Zunehmende Sichel",
          "First Quarter": "Erstes Viertel",
          "Waxing Gibbous": "Zunehmender Mond",
          "Full Moon": "Vollmond",
          "Waning Gibbous": "Abnehmender Mond",
          "Last Quarter": "Letztes Viertel",
          "Waning Crescent": "Abnehmende Sichel",
        };
        const phaseLabel = phase
          ? phaseTranslations[phase] || phase
          : "Unbekannt";

        const illuminationStr =
          typeof illumination === "number"
            ? `${illumination.toFixed(1)}%`
            : "–";

        const ageStr =
          typeof daysSinceNew === "number"
            ? `${daysSinceNew.toFixed(1)} Tage`
            : "–";

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">${emoji}</span>
            <h2 class="bottom-sheet__title">Mond</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktuelle Mondphase</h3>
              <div class="detail-card__hero">
                <span class="detail-card__moon-emoji">${emoji}</span>
                <span class="detail-card__value">${phaseLabel}</span>
              </div>
              ${
                description
                  ? `<p class="detail-card__description">${description}</p>`
                  : ""
              }
            </div>
            <div class="detail-card">
              <h3>Details</h3>
              <div class="detail-card__row">
                <span>💡 Beleuchtung:</span>
                <span>${illuminationStr}</span>
              </div>
              <div class="detail-card__row">
                <span>🌒 Mondalter:</span>
                <span>${ageStr}</span>
              </div>
              <div class="detail-card__row">
                <span>🌙 Mondaufgang:</span>
                <span>${moonriseLabel}</span>
              </div>
              <div class="detail-card__row">
                <span>🌑 Monduntergang:</span>
                <span>${moonsetLabel}</span>
              </div>
              ${
                zodiac
                  ? `<div class="detail-card__row"><span>🔭 Sternzeichen:</span><span>${zodiac}</span></div>`
                  : ""
              }
            </div>
            <div class="detail-card">
              <h3>🌕 Mondphasen-Zyklus</h3>
              <p class="detail-text--muted" style="font-size: 0.85rem;">
                Der Mondzyklus dauert etwa 29,5 Tage. Während dieser Zeit durchläuft der Mond
                acht verschiedene Phasen: Neumond → Zunehmende Sichel → Erstes Viertel →
                Zunehmender Mond → Vollmond → Abnehmender Mond → Letztes Viertel → Abnehmende Sichel.
              </p>
            </div>
          </div>
        `;
      },

      clouds: () => {
        const cloudCover = current.cloudCover ?? 0;

        // Create hourly cloud data
        const hourlyCloudData = hourly
          .slice(0, 12)
          .map(
            (h) => `
          <div class="hourly-bar">
            <div class="hourly-bar__fill hourly-bar__fill--clouds" style="--bar-height:${
              h.cloudCover || 0
            }%"></div>
            <span class="hourly-bar__value">${Math.round(
              h.cloudCover || 0,
            )}%</span>
            <span class="hourly-bar__time">${new Date(
              h.time,
            ).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}</span>
          </div>
        `,
          )
          .join("");

        const getCloudDescription = (cover) => {
          if (cover < 10) return "Wolkenlos - Blauer Himmel";
          if (cover < 25) return "Überwiegend klar - Vereinzelte Wolken";
          if (cover < 50) return "Leicht bewölkt - Sonnige Abschnitte";
          if (cover < 75) return "Bewölkt - Wechselhafter Himmel";
          if (cover < 90) return "Stark bewölkt - Meist bedeckt";
          return "Bedeckt - Geschlossene Wolkendecke";
        };

        const getCloudEmoji = (cover) => {
          if (cover < 10) return "☀️";
          if (cover < 25) return "🌤️";
          if (cover < 50) return "⛅";
          if (cover < 75) return "🌥️";
          return "☁️";
        };

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">${getCloudEmoji(cloudCover)}</span>
            <h2 class="bottom-sheet__title">Bewölkung</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktueller Bedeckungsgrad</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value">${Math.round(
                  cloudCover,
                )}%</span>
              </div>
              <p class="detail-text" style="margin-top: 8px;">${getCloudDescription(
                cloudCover,
              )}</p>
            </div>

            ${
              hourlyCloudData
                ? `
            <div class="detail-card">
              <h3>Nächste 12 Stunden</h3>
              <div class="hourly-bars">${hourlyCloudData}</div>
            </div>
            `
                : ""
            }

            <div class="detail-card">
              <h3>☁️ Bewölkungsstufen</h3>
              <ul class="detail-card__list">
                <li><strong>0-10%:</strong> Wolkenlos - Beste Bedingungen für Sonnenanbeter</li>
                <li><strong>10-25%:</strong> Überwiegend klar - Ideal für Outdoor-Aktivitäten</li>
                <li><strong>25-50%:</strong> Leicht bewölkt - Angenehme Temperaturen</li>
                <li><strong>50-75%:</strong> Bewölkt - Milde, gedämpfte Sonne</li>
                <li><strong>75-100%:</strong> Stark bewölkt - Kaum direkte Sonneneinstrahlung</li>
              </ul>
            </div>

            <div class="detail-card">
              <h3>💡 Gut zu wissen</h3>
              <p class="detail-text--muted" style="font-size: 0.85rem;">
                Der Bedeckungsgrad gibt an, wie viel Prozent des Himmels von Wolken bedeckt ist.
                Bei hoher Bewölkung kann die Sonneneinstrahlung um bis zu 80% reduziert sein,
                was die gefühlte Temperatur beeinflusst.
              </p>
            </div>
          </div>
        `;
      },

      pollen: () => {
        const pollenData = pollen || { trees: 1, grass: 1, weeds: 1 };
        const treesLevel = pollenData.trees || 1;
        const grassLevel = pollenData.grass || 1;
        const weedsLevel = pollenData.weeds || 1;
        const rawData = pollenData.raw || null;
        const pollenSource = pollenData.source || null;

        const getLevelText = (level) => {
          if (level <= 1) return "Niedrig";
          if (level <= 2) return "Moderat";
          if (level <= 3) return "Hoch";
          return "Sehr hoch";
        };

        const getLevelColor = (level) => {
          if (level <= 1) return "#4CAF50";
          if (level <= 2) return "#FFEB3B";
          if (level <= 3) return "#FF9800";
          return "#F44336";
        };

        const overallLevel = Math.max(treesLevel, grassLevel, weedsLevel);

        // Build raw data details if available
        const rawDataSection = rawData
          ? `
            <div class="detail-card">
              <h3>📊 Detailwerte (Körner/m³)</h3>
              <div class="detail-card__row">
                <span>🌳 Erle</span>
                <span>${rawData.alder || 0}</span>
              </div>
              <div class="detail-card__row">
                <span>🌳 Birke</span>
                <span>${rawData.birch || 0}</span>
              </div>
              <div class="detail-card__row">
                <span>🫒 Olive</span>
                <span>${rawData.olive || 0}</span>
              </div>
              <div class="detail-card__row">
                <span>🌾 Gras</span>
                <span>${rawData.grass || 0}</span>
              </div>
              <div class="detail-card__row">
                <span>🌿 Beifuß</span>
                <span>${rawData.mugwort || 0}</span>
              </div>
              <div class="detail-card__row">
                <span>🌱 Ambrosia</span>
                <span>${rawData.ragweed || 0}</span>
              </div>
              ${
                pollenSource
                  ? `<p class="detail-text--secondary" style="font-size: 0.75rem; margin-top: 12px;">Quelle: ${pollenSource}</p>`
                  : ""
              }
            </div>
          `
          : "";

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">🌿</span>
            <div>
              <h2 class="bottom-sheet__title">Pollenflug</h2>
              <p class="bottom-sheet__subtitle">Aktuelle Pollenbelastung</p>
            </div>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color: ${getLevelColor(
                  overallLevel,
                )}">${getLevelText(overallLevel)}</span>
              </div>
              <p class="detail-text--muted" style="margin-bottom: 16px;">Gesamtbelastung heute</p>
            </div>

            <div class="detail-card">
              <h3>🌳 Baumpollen</h3>
              <div class="detail-card__row">
                <span>Belastung</span>
                <span class="detail-card__badge" style="background: ${getLevelColor(
                  treesLevel,
                )}40; color: ${getLevelColor(treesLevel)}">${getLevelText(
                  treesLevel,
                )} (${treesLevel}/4)</span>
              </div>
              <p class="detail-text--secondary" style="font-size: 0.85rem; margin-top: 8px;">
                ${
                  treesLevel <= 1
                    ? "Kaum Belastung durch Baumpollen. Gute Bedingungen für Allergiker."
                    : treesLevel <= 2
                      ? "Leichte Belastung möglich. Empfindliche Personen sollten Vorsicht walten lassen."
                      : treesLevel <= 3
                        ? "Erhöhte Belastung. Allergiker sollten längere Aufenthalte im Freien meiden."
                        : "Sehr hohe Belastung! Allergiker sollten drinnen bleiben und Fenster geschlossen halten."
                }
              </p>
            </div>

            <div class="detail-card">
              <h3>🌾 Gräserpollen</h3>
              <div class="detail-card__row">
                <span>Belastung</span>
                <span class="detail-card__badge" style="background: ${getLevelColor(
                  grassLevel,
                )}40; color: ${getLevelColor(grassLevel)}">${getLevelText(
                  grassLevel,
                )} (${grassLevel}/4)</span>
              </div>
              <p class="detail-text--secondary" style="font-size: 0.85rem; margin-top: 8px;">
                ${
                  grassLevel <= 1
                    ? "Minimale Gräserpollenbelastung. Ideal für Outdoor-Aktivitäten."
                    : grassLevel <= 2
                      ? "Moderate Gräserpollenbelastung. Bei Empfindlichkeit Antihistaminika bereithalten."
                      : grassLevel <= 3
                        ? "Starke Gräserpollenbelastung. Aktivitäten im Freien reduzieren."
                        : "Extreme Gräserpollenbelastung! Aufenthalt im Freien vermeiden."
                }
              </p>
            </div>

            <div class="detail-card">
              <h3>🌱 Kräuterpollen</h3>
              <div class="detail-card__row">
                <span>Belastung</span>
                <span class="detail-card__badge" style="background: ${getLevelColor(
                  weedsLevel,
                )}40; color: ${getLevelColor(weedsLevel)}">${getLevelText(
                  weedsLevel,
                )} (${weedsLevel}/4)</span>
              </div>
              <p class="detail-text--secondary" style="font-size: 0.85rem; margin-top: 8px;">
                ${
                  weedsLevel <= 1
                    ? "Geringe Kräuterpollenbelastung. Keine besonderen Vorsichtsmaßnahmen nötig."
                    : weedsLevel <= 2
                      ? "Leichte Kräuterpollenbelastung. Bei Allergien auf Symptome achten."
                      : weedsLevel <= 3
                        ? "Hohe Kräuterpollenbelastung. Medikamente griffbereit halten."
                        : "Sehr hohe Kräuterpollenbelastung! Allergiker sollten besondere Vorsicht walten lassen."
                }
              </p>
            </div>

            ${rawDataSection}

            <div class="detail-card">
              <h3>💡 Tipps für Allergiker</h3>
              <ul class="detail-card__list detail-text--muted" style="font-size: 0.85rem;">
                <li>Wäsche nicht im Freien trocknen</li>
                <li>Abends duschen und Haare waschen</li>
                <li>Fenster morgens geschlossen halten</li>
                <li>Pollenfilter im Auto aktivieren</li>
                <li>Sonnenbrille tragen zum Augenschutz</li>
              </ul>
            </div>
          </div>
        `;
      },
    };

    return templates[type]
      ? templates[type]()
      : `<div class="detail-card"><p>Details nicht verfügbar</p></div>`;
  }

  function getWindDirectionLabel(deg) {
    const directions = [
      "N",
      "NNO",
      "NO",
      "ONO",
      "O",
      "OSO",
      "SO",
      "SSO",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    const index = Math.round(deg / 22.5) % 16;
    return directions[index];
  }

  // === MAIN RENDER FUNCTION ===

  function renderWeatherCards(appState) {
    const container = document.getElementById("weather-cards-grid");
    if (!container) return;

    const current = appState.current || {};
    const daily = (appState.daily && appState.daily[0]) || {};
    const aqi = appState.aqi || {};
    const moonPhaseData = appState.moonPhase || {};

    // Prepare data
    const cardData = {
      humidity: current.humidity ?? 0,
      dewPoint:
        current.dewPoint ?? (current.temperature ? current.temperature - 5 : 0),
      sunrise: daily.sunrise,
      sunset: daily.sunset,
      pressure: current.pressure ?? current.surfacePressure ?? 1013,
      visibility: current.visibility ?? 10,
      windSpeed: current.windSpeed ?? 0,
      windGust: current.windGust ?? current.windSpeed ?? 0,
      windDirection: current.windDirection ?? 0,
      uvIndex: current.uvIndex ?? 0,
      aqi: aqi.europeanAqi ?? aqi.usAqi ?? 0,
      europeanAqi: aqi.europeanAqi ?? 0,
      usAqi: aqi.usAqi ?? 0,
      precipitationSum: daily.precipitationSum ?? 0,
      precipProbMax: daily.precipProbMax ?? 0,
      cloudCover: current.cloudCover ?? 0,
      // Mondphasen-Daten aus dem richtigen Objekt
      moonrise: moonPhaseData.moonrise || daily.moonrise,
      moonset: moonPhaseData.moonset || daily.moonset,
      moonPhase: moonPhaseData.phase || daily.moonPhase,
      moonIllumination: moonPhaseData.illumination,
      moonEmoji: moonPhaseData.emoji,
      moonDescription: moonPhaseData.description,
      pollen: appState.pollen || { trees: 1, grass: 1, weeds: 1 },
    };

    // Clear and render cards
    container.innerHTML = `
      <div id="card-humidity" class="weather-card-wrapper"></div>
      <div id="card-sun" class="weather-card-wrapper"></div>
      <div id="card-pressure" class="weather-card-wrapper"></div>
      <div id="card-visibility" class="weather-card-wrapper"></div>
      <div id="card-wind" class="weather-card-wrapper"></div>
      <div id="card-uv" class="weather-card-wrapper"></div>
      <div id="card-aqi" class="weather-card-wrapper"></div>
      <div id="card-precipitation" class="weather-card-wrapper"></div>
      <div id="card-moon" class="weather-card-wrapper"></div>
      <div id="card-clouds" class="weather-card-wrapper"></div>
      <div id="card-pollen" class="weather-card-wrapper weather-card-wrapper--wide"></div>
    `;

    // Render each card
    renderHumidityCard(document.getElementById("card-humidity"), cardData);
    renderSunCard(document.getElementById("card-sun"), cardData);
    renderPressureCard(document.getElementById("card-pressure"), cardData);
    renderVisibilityCard(document.getElementById("card-visibility"), cardData);
    renderWindCard(document.getElementById("card-wind"), cardData);
    renderUVCard(document.getElementById("card-uv"), cardData);
    renderAQICard(document.getElementById("card-aqi"), cardData);
    renderPrecipitationCard(
      document.getElementById("card-precipitation"),
      cardData,
    );
    renderMoonCard(document.getElementById("card-moon"), cardData);
    renderCloudCoverCard(document.getElementById("card-clouds"), cardData);
    renderPollenCard(document.getElementById("card-pollen"), cardData);

    // Add click handlers using event delegation on container
    // This is more robust than individual listeners
    const cards = container.querySelectorAll(".weather-card");
    console.log(
      `[WeatherCards] Found ${cards.length} cards to attach listeners`,
    );

    // Remove old listener if exists
    if (container._weatherCardClickHandler) {
      container.removeEventListener(
        "click",
        container._weatherCardClickHandler,
      );
    }

    // Create new handler with current appState closure
    container._weatherCardClickHandler = function (event) {
      // Find the clicked card (might be child element)
      const card = event.target.closest(".weather-card");

      if (card) {
        const cardType = card.dataset.card;
        console.log(`[WeatherCards] Card clicked: ${cardType}`, event);
        console.log(
          `[WeatherCards] ModalController available:`,
          !!window.ModalController,
        );
        console.log(`[WeatherCards] appState:`, appState);

        // Stop propagation to prevent conflicts
        event.stopPropagation();
        event.preventDefault();

        if (cardType) {
          openCardDetailModal(cardType, appState);
        }
      }
    };

    // Attach delegated listener to container
    container.addEventListener(
      "click",
      container._weatherCardClickHandler,
      true,
    );
    console.log(
      `[WeatherCards] Event delegation listener attached to container`,
    );
  }

  // Export
  global.WeatherCards = {
    renderWeatherCards,
    openCardDetailModal,
  };
})(window);
