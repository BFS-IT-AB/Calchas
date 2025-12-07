(function (global) {
  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  function buildScoreBar(score) {
    const clamped = Math.max(0, Math.min(100, score || 0));
    const color = getScoreColor(score);
    return `
      <div class="score-bar">
        <div class="score-bar__fill" style="width:${clamped}%;background:${color}"></div>
      </div>
    `;
  }

  function getScoreColor(score) {
    if (score >= 80) return "#4CAF50";
    if (score >= 60) return "#8BC34A";
    if (score >= 40) return "#FFEB3B";
    if (score >= 20) return "#FF9800";
    return "#F44336";
  }

  function labelForScore(score) {
    if (score >= 80) return "sehr gut";
    if (score >= 60) return "gut";
    if (score >= 40) return "ok";
    if (score >= 20) return "mäßig";
    return "kritisch";
  }

  /**
   * Calculate Windchill (Gefühlte Kälte)
   * Formula: 13.12 + 0.6215*T - 11.37*V^0.16 + 0.3965*T*V^0.16
   * Valid for T <= 10°C and V >= 4.8 km/h
   */
  function calculateWindchill(temp, windSpeed) {
    if (
      temp === null ||
      temp === undefined ||
      windSpeed === null ||
      windSpeed === undefined
    ) {
      return null;
    }
    // Windchill formula only valid for low temps and some wind
    if (temp > 10 || windSpeed < 4.8) {
      return temp; // Return actual temp if outside valid range
    }
    const v016 = Math.pow(windSpeed, 0.16);
    const windchill =
      13.12 + 0.6215 * temp - 11.37 * v016 + 0.3965 * temp * v016;
    return Math.round(windchill * 10) / 10;
  }

  /**
   * Get windchill risk level and color
   */
  function getWindchillInfo(windchill) {
    if (windchill === null)
      return { label: "–", color: "#9E9E9E", risk: "unbekannt", icon: "🌡️" };
    if (windchill >= 10)
      return {
        label: "Angenehm",
        color: "#4CAF50",
        risk: "Kein Risiko",
        icon: "😊",
      };
    if (windchill >= 0)
      return { label: "Kühl", color: "#8BC34A", risk: "Gering", icon: "🧥" };
    if (windchill >= -10)
      return { label: "Kalt", color: "#FFEB3B", risk: "Moderat", icon: "🥶" };
    if (windchill >= -25)
      return {
        label: "Sehr kalt",
        color: "#FF9800",
        risk: "Erhöht",
        icon: "❄️",
      };
    if (windchill >= -40)
      return {
        label: "Gefährlich kalt",
        color: "#F44336",
        risk: "Hoch",
        icon: "⚠️",
      };
    return {
      label: "Extrem gefährlich",
      color: "#9C27B0",
      risk: "Sehr hoch",
      icon: "🚨",
    };
  }

  /**
   * Format time from ISO string or other formats
   */
  function formatTime(timeInput) {
    if (!timeInput) return "";
    try {
      // If it's already in HH:MM format, return it
      if (typeof timeInput === "string" && /^\d{1,2}:\d{2}$/.test(timeInput)) {
        return timeInput;
      }
      // If it's a timeLabel like "14:00", return it
      if (
        typeof timeInput === "string" &&
        timeInput.includes(":") &&
        timeInput.length <= 5
      ) {
        return timeInput;
      }
      // Try to parse as date
      const date = new Date(timeInput);
      if (isNaN(date.getTime())) {
        // If parsing fails, try to extract time from string
        const match = String(timeInput).match(/(\d{1,2}):(\d{2})/);
        if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
        return String(timeInput).substring(0, 5);
      }
      return date.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(timeInput).substring(0, 5);
    }
  }

  /**
   * Get severity colors for alerts
   */
  function getAlertSeverityStyle(severity) {
    const styles = {
      red: {
        bg: "rgba(244, 67, 54, 0.15)",
        border: "#F44336",
        icon: "🚨",
        label: "Warnung",
      },
      orange: {
        bg: "rgba(255, 152, 0, 0.15)",
        border: "#FF9800",
        icon: "⚠️",
        label: "Achtung",
      },
      yellow: {
        bg: "rgba(255, 235, 59, 0.15)",
        border: "#FFEB3B",
        icon: "⚡",
        label: "Hinweis",
      },
      green: {
        bg: "rgba(76, 175, 80, 0.15)",
        border: "#4CAF50",
        icon: "✅",
        label: "Info",
      },
    };
    return styles[severity] || styles.yellow;
  }

  // ========================================
  // CARD RENDERERS
  // ========================================

  function renderUmbrellaCard(state) {
    const needsUmbrella =
      state.umbrellaLabel?.includes("empfohlen") ||
      state.umbrellaLabel?.includes("dringend");
    const urgent = state.umbrellaLabel?.includes("dringend");
    const icon = urgent ? "☔" : needsUmbrella ? "🌂" : "☀️";
    const status = urgent
      ? "Dringend!"
      : needsUmbrella
      ? "Empfohlen"
      : "Nicht nötig";
    const color = urgent ? "#F44336" : needsUmbrella ? "#FF9800" : "#4CAF50";

    return `
      <button class="health-metric-card" data-health-card="umbrella" type="button">
        <div class="health-metric-card__header">
          <span class="health-metric-card__icon">${icon}</span>
          <span class="health-metric-card__label">Regenschirm</span>
        </div>
        <div class="health-metric-card__value" style="color:${color}">${status}</div>
        <div class="health-metric-card__sublabel">${
          state.raw?.precipProb || 0
        }% Regenwahrsch.</div>
      </button>
    `;
  }

  function renderOutdoorCard(state) {
    const timeline = state.outdoorScoreTimeline || [];
    const currentScore = timeline[0]?.score || 50;
    const color = getScoreColor(currentScore);
    const label = labelForScore(currentScore);

    return `
      <button class="health-metric-card" data-health-card="outdoor" type="button">
        <div class="health-metric-card__header">
          <span class="health-metric-card__icon">🏃</span>
          <span class="health-metric-card__label">Outdoor-Score</span>
        </div>
        <div class="health-metric-card__value" style="color:${color}">${currentScore}</div>
        <div class="health-metric-card__sublabel">${label}</div>
      </button>
    `;
  }

  function renderClothingCard(state) {
    const label = state.clothingLabel || "Kleidung: –";
    let icon = "👕";
    let recommendation = "Normale Kleidung";
    let color = "#4CAF50";

    if (label.includes("dicke Jacke")) {
      icon = "🧥";
      recommendation = "Dicke Jacke";
      color = "#2196F3";
    } else if (label.includes("leichte Jacke")) {
      icon = "🧤";
      recommendation = "Leichte Jacke";
      color = "#8BC34A";
    } else if (label.includes("Regenmantel")) {
      icon = "🧥";
      recommendation = "Regenmantel";
      color = "#FF9800";
    }

    return `
      <button class="health-metric-card" data-health-card="clothing" type="button">
        <div class="health-metric-card__header">
          <span class="health-metric-card__icon">${icon}</span>
          <span class="health-metric-card__label">Kleidung</span>
        </div>
        <div class="health-metric-card__value" style="color:${color}">${recommendation}</div>
        <div class="health-metric-card__sublabel">${Math.round(
          state.raw?.feels || state.raw?.temp || 0
        )}° gefühlt</div>
      </button>
    `;
  }

  function renderDrivingCard(state) {
    const label = state.drivingLabel || "Fahrsicherheit: –";
    let icon = "🚗";
    let status = "Gut";
    let color = "#4CAF50";

    if (label.includes("kritisch")) {
      icon = "⚠️";
      status = "Kritisch";
      color = "#F44336";
    } else if (label.includes("vorsichtig")) {
      icon = "⚡";
      status = "Vorsicht";
      color = "#FF9800";
    }

    return `
      <button class="health-metric-card" data-health-card="driving" type="button">
        <div class="health-metric-card__header">
          <span class="health-metric-card__icon">${icon}</span>
          <span class="health-metric-card__label">Fahrsicherheit</span>
        </div>
        <div class="health-metric-card__value" style="color:${color}">${status}</div>
        <div class="health-metric-card__sublabel">${Math.round(
          state.raw?.wind || 0
        )} km/h Wind</div>
      </button>
    `;
  }

  function renderHeatCard(state) {
    const label = state.heatLabel || "Hitzerisiko: –";
    let icon = "🌡️";
    let risk = "Gering";
    let color = "#4CAF50";

    if (label.includes("hoch")) {
      icon = "🔥";
      risk = "Hoch";
      color = "#F44336";
    } else if (label.includes("mittel")) {
      icon = "☀️";
      risk = "Mittel";
      color = "#FF9800";
    }

    return `
      <button class="health-metric-card" data-health-card="heat" type="button">
        <div class="health-metric-card__header">
          <span class="health-metric-card__icon">${icon}</span>
          <span class="health-metric-card__label">Hitzerisiko</span>
        </div>
        <div class="health-metric-card__value" style="color:${color}">${risk}</div>
        <div class="health-metric-card__sublabel">${Math.round(
          state.raw?.feels || state.raw?.temp || 0
        )}° gefühlt</div>
      </button>
    `;
  }

  function renderUVCard(state) {
    const label = state.uvProtectionLabel || "UV-Schutz: –";
    let icon = "☀️";
    let level = "Normal";
    let color = "#4CAF50";

    if (label.includes("sehr hoch")) {
      icon = "🔆";
      level = "Sehr hoch";
      color = "#F44336";
    } else if (label.includes("erhöht")) {
      icon = "🌤️";
      level = "Erhöht";
      color = "#FF9800";
    }

    return `
      <button class="health-metric-card" data-health-card="uv" type="button">
        <div class="health-metric-card__header">
          <span class="health-metric-card__icon">${icon}</span>
          <span class="health-metric-card__label">UV-Schutz</span>
        </div>
        <div class="health-metric-card__value" style="color:${color}">${level}</div>
        <div class="health-metric-card__sublabel">Sonnenschutz ${
          level === "Normal" ? "optional" : "empfohlen"
        }</div>
      </button>
    `;
  }

  function renderWindchillCard(appState, state) {
    const current = appState?.current || {};
    const temp = current.temperature;
    const windSpeed = current.windSpeed;
    const windchill = calculateWindchill(temp, windSpeed);
    const info = getWindchillInfo(windchill);

    return `
      <button class="health-metric-card" data-health-card="windchill" type="button">
        <div class="health-metric-card__header">
          <span class="health-metric-card__icon">${info.icon}</span>
          <span class="health-metric-card__label">Windchill</span>
        </div>
        <div class="health-metric-card__value" style="color:${info.color}">${
      windchill !== null ? Math.round(windchill) + "°" : "–"
    }</div>
        <div class="health-metric-card__sublabel">${info.label}</div>
      </button>
    `;
  }

  function renderAQICard(appState) {
    const aqi = appState?.aqi || {};
    const aqiValue = aqi.europeanAqi || aqi.usAqi || 0;

    let label = "Gut";
    let color = "#4CAF50";
    let icon = "😊";

    if (aqiValue > 100) {
      label = "Schlecht";
      color = "#F44336";
      icon = "😷";
    } else if (aqiValue > 75) {
      label = "Mäßig";
      color = "#FF9800";
      icon = "😐";
    } else if (aqiValue > 50) {
      label = "Akzeptabel";
      color = "#FFEB3B";
      icon = "🙂";
    }

    return `
      <button class="health-metric-card" data-health-card="aqi" type="button">
        <div class="health-metric-card__header">
          <span class="health-metric-card__icon">${icon}</span>
          <span class="health-metric-card__label">Luftqualität</span>
        </div>
        <div class="health-metric-card__value" style="color:${color}">${Math.round(
      aqiValue
    )}</div>
        <div class="health-metric-card__sublabel">${label}</div>
      </button>
    `;
  }

  // ========================================
  // WEATHER ALERTS SECTION
  // ========================================

  function renderAlertsSection(alerts) {
    if (!alerts || alerts.length === 0) {
      return `
        <section class="health-alerts-section">
          <div class="health-alerts-header">
            <span class="health-alerts-icon">🔔</span>
            <h3>Wettermeldungen</h3>
          </div>
          <div class="health-alerts-empty">
            <span class="health-alerts-empty__icon">✅</span>
            <p>Keine Wetterwarnungen aktiv</p>
          </div>
        </section>
      `;
    }

    const alertCards = alerts
      .slice(0, 5)
      .map((alert) => {
        const style = getAlertSeverityStyle(alert.severity);
        return `
        <article class="health-alert-card" style="background:${
          style.bg
        };border-left:3px solid ${style.border}">
          <div class="health-alert-card__icon">${style.icon}</div>
          <div class="health-alert-card__content">
            <div class="health-alert-card__header">
              <strong>${alert.title}</strong>
              <span class="health-alert-card__time">${formatTime(
                alert.time
              )}</span>
            </div>
            <p class="health-alert-card__description">${alert.description}</p>
          </div>
        </article>
      `;
      })
      .join("");

    return `
      <section class="health-alerts-section">
        <div class="health-alerts-header">
          <span class="health-alerts-icon">⚠️</span>
          <h3>Wettermeldungen</h3>
          <span class="health-alerts-badge">${alerts.length}</span>
        </div>
        <div class="health-alerts-list">
          ${alertCards}
        </div>
      </section>
    `;
  }

  // ========================================
  // OUTDOOR TIMELINE SECTION
  // ========================================

  function renderOutdoorTimeline(timeline) {
    const sliced = (timeline || []).slice(0, 12);

    if (sliced.length === 0) {
      return `
        <section class="health-timeline-section">
          <div class="health-timeline-header">
            <span class="health-timeline-icon">📊</span>
            <h3>Outdoor-Verlauf</h3>
          </div>
          <p class="health-empty-notice">Stundenweise Daten laden...</p>
        </section>
      `;
    }

    const bars = sliced
      .map((slot) => {
        const time = formatTime(slot.time) || slot.time || "";
        // Only show short time (HH:MM or just hour)
        const shortTime = time.length > 5 ? time.substring(0, 5) : time;
        const score = Math.round(slot.score || 0);
        const color = getScoreColor(score);
        // Calculate bar height in pixels (max height ~90px for score 100)
        const barHeight = Math.max(8, Math.round((score / 100) * 90));
        return `
        <div class="health-timeline-bar">
          <div class="health-timeline-bar__fill" style="height:${barHeight}px;background:${color}"></div>
          <span class="health-timeline-bar__value">${score}</span>
          <span class="health-timeline-bar__time">${shortTime}</span>
        </div>
      `;
      })
      .join("");

    return `
      <section class="health-timeline-section">
        <div class="health-timeline-header">
          <span class="health-timeline-icon">📊</span>
          <h3>Outdoor-Verlauf</h3>
          <span class="health-timeline-sublabel">Nächste 12h</span>
        </div>
        <div class="health-timeline-chart">
          ${bars}
        </div>
        <div class="health-timeline-legend">
          <span style="color:#4CAF50">●</span> Gut
          <span style="color:#FFEB3B">●</span> OK
          <span style="color:#F44336">●</span> Kritisch
        </div>
      </section>
    `;
  }

  // ========================================
  // MODAL CONTENT GENERATORS
  // ========================================

  function getModalContent(cardType, appState, healthState) {
    const current = appState?.current || {};
    const hourly = appState?.hourly || [];
    const state = healthState || {};
    const timeline = state.outdoorScoreTimeline || [];

    const templates = {
      umbrella: () => {
        const precipProb = state.raw?.precipProb || 0;
        const needsUmbrella = precipProb >= 60;
        const urgent = precipProb >= 85;

        // Stündliche Regenwahrscheinlichkeit
        const hourlyPrecip = hourly
          .slice(0, 12)
          .map((h) => {
            const prob = h.precipitationProbability || h.precipProb || 0;
            const color =
              prob >= 70 ? "#F44336" : prob >= 40 ? "#FF9800" : "#4CAF50";
            return `
            <div class="hourly-bar">
              <div class="hourly-bar__fill" style="--bar-height:${prob}%;background:${color}"></div>
              <span class="hourly-bar__value">${Math.round(prob)}%</span>
              <span class="hourly-bar__time">${formatTime(h.time)}</span>
            </div>
          `;
          })
          .join("");

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">🌂</span>
            <h2 class="bottom-sheet__title">Regenschirm</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktuelle Empfehlung</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${
                  urgent ? "#F44336" : needsUmbrella ? "#FF9800" : "#4CAF50"
                }">
                  ${
                    urgent
                      ? "☔ Dringend!"
                      : needsUmbrella
                      ? "🌂 Empfohlen"
                      : "☀️ Nicht nötig"
                  }
                </span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Regenwahrscheinlichkeit:</span>
                <span style="font-weight:600">${Math.round(precipProb)}%</span>
              </div>
              <p class="detail-text" style="margin-top:8px">
                ${
                  urgent
                    ? "Starker Niederschlag sehr wahrscheinlich. Regenschirm ist heute unverzichtbar!"
                    : needsUmbrella
                    ? "Mittlere bis hohe Regenwahrscheinlichkeit. Sicherheitshalber Regenschirm mitnehmen."
                    : "Geringe Regenwahrscheinlichkeit. Sie können den Regenschirm zuhause lassen."
                }
              </p>
            </div>
            <div class="detail-card">
              <h3>Stündliche Vorhersage</h3>
              <p class="detail-text--muted" style="font-size:0.85rem;margin-bottom:8px">Regenwahrscheinlichkeit in %</p>
              <div class="hourly-bars">${hourlyPrecip}</div>
            </div>
          </div>
        `;
      },

      outdoor: () => {
        const currentScore = timeline[0]?.score || 50;
        const scoreColor = getScoreColor(currentScore);
        const scoreLabel = labelForScore(currentScore);

        const timelineRows = timeline
          .slice(0, 12)
          .map(
            (slot) => `
          <div class="health-chart-row">
            <span class="health-chart-row__time">${formatTime(slot.time)}</span>
            <span class="health-chart-row__score" style="color:${getScoreColor(
              slot.score
            )}">${slot.score}</span>
            ${buildScoreBar(slot.score)}
            <span class="health-chart-row__label">${labelForScore(
              slot.score
            )}</span>
          </div>
        `
          )
          .join("");

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">🏃</span>
            <h2 class="bottom-sheet__title">Outdoor-Score</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktueller Score</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${scoreColor}">${currentScore}</span>
                <span class="detail-card__label" style="color:${scoreColor}">${scoreLabel}</span>
              </div>
              <p class="detail-text" style="margin-top:12px">
                Der Outdoor-Score kombiniert Temperatur, Wind und Niederschlag zu einem Gesamtwert für Outdoor-Aktivitäten.
              </p>
            </div>
            <div class="detail-card">
              <h3>Stündlicher Verlauf</h3>
              <div class="health-chart-barlist">${timelineRows}</div>
            </div>
            <div class="detail-card">
              <h3>Score-Erklärung</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li><span style="color:#4CAF50">●</span> 80-100 – Sehr gut für Outdoor-Aktivitäten</li>
                <li><span style="color:#8BC34A">●</span> 60-79 – Gut, leichte Einschränkungen möglich</li>
                <li><span style="color:#FFEB3B">●</span> 40-59 – OK, aber auf Wetter achten</li>
                <li><span style="color:#FF9800">●</span> 20-39 – Mäßig, Vorsicht empfohlen</li>
                <li><span style="color:#F44336">●</span> 0-19 – Kritisch, besser drinnen bleiben</li>
              </ul>
            </div>
          </div>
        `;
      },

      clothing: () => {
        const feels = state.raw?.feels || state.raw?.temp || 0;
        const precipProb = state.raw?.precipProb || 0;

        const getRecommendation = () => {
          if (precipProb >= 70)
            return {
              text: "Regenbekleidung",
              icon: "🧥",
              color: "#2196F3",
              items: [
                "Wasserdichte Jacke",
                "Regenschirm",
                "Wasserfeste Schuhe",
              ],
            };
          if (feels <= 4)
            return {
              text: "Winterkleidung",
              icon: "🧥",
              color: "#3F51B5",
              items: [
                "Dicke Winterjacke",
                "Mütze & Schal",
                "Handschuhe",
                "Warme Schuhe",
              ],
            };
          if (feels <= 12)
            return {
              text: "Übergangskleidung",
              icon: "🧤",
              color: "#4CAF50",
              items: ["Leichte Jacke", "Langarm-Shirt", "Geschlossene Schuhe"],
            };
          if (feels <= 20)
            return {
              text: "Leichte Kleidung",
              icon: "👕",
              color: "#8BC34A",
              items: ["T-Shirt oder Bluse", "Leichte Hose", "Bequeme Schuhe"],
            };
          return {
            text: "Sommerkleidung",
            icon: "☀️",
            color: "#FF9800",
            items: [
              "Leichte, luftige Kleidung",
              "Sonnenhut",
              "Sandalen",
              "Sonnenschutz",
            ],
          };
        };

        const rec = getRecommendation();

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">${rec.icon}</span>
            <h2 class="bottom-sheet__title">Kleidungsempfehlung</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Empfehlung für heute</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${rec.color}">${
          rec.text
        }</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Gefühlte Temperatur:</span>
                <span style="font-weight:600">${Math.round(feels)}°C</span>
              </div>
              <div class="detail-card__row">
                <span>Regenwahrscheinlichkeit:</span>
                <span style="font-weight:600">${Math.round(precipProb)}%</span>
              </div>
            </div>
            <div class="detail-card">
              <h3>Was anziehen?</h3>
              <ul class="detail-card__list">
                ${rec.items.map((item) => `<li>✓ ${item}</li>`).join("")}
              </ul>
            </div>
          </div>
        `;
      },

      driving: () => {
        const wind = state.raw?.wind || 0;
        const precipProb = state.raw?.precipProb || 0;
        const humidity = state.raw?.humidity || 0;
        const visibility = current.visibility || 10;

        let risk = "Gering";
        let color = "#4CAF50";
        let tips = ["Normale Fahrweise", "Keine besonderen Vorkehrungen"];

        if (wind >= 50 || precipProb >= 80 || humidity >= 95) {
          risk = "Hoch";
          color = "#F44336";
          tips = [
            "Geschwindigkeit deutlich reduzieren",
            "Größeren Abstand halten",
            "Bei Aquaplaning nicht bremsen",
            "Fahrten nach Möglichkeit verschieben",
          ];
        } else if (wind >= 35 || precipProb >= 60) {
          risk = "Mittel";
          color = "#FF9800";
          tips = [
            "Vorsichtig fahren",
            "Mehr Abstand halten",
            "Auf Seitenwind achten",
            "Bremsweg verlängert sich",
          ];
        }

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">🚗</span>
            <h2 class="bottom-sheet__title">Fahrsicherheit</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktuelles Risiko</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${color}">${risk}</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Windgeschwindigkeit:</span>
                <span style="font-weight:600">${Math.round(wind)} km/h</span>
              </div>
              <div class="detail-card__row">
                <span>Niederschlagsrisiko:</span>
                <span style="font-weight:600">${Math.round(precipProb)}%</span>
              </div>
              <div class="detail-card__row">
                <span>Sichtweite:</span>
                <span style="font-weight:600">${Math.round(
                  visibility
                )} km</span>
              </div>
            </div>
            <div class="detail-card">
              <h3>Tipps für heute</h3>
              <ul class="detail-card__list">
                ${tips.map((tip) => `<li>• ${tip}</li>`).join("")}
              </ul>
            </div>
          </div>
        `;
      },

      heat: () => {
        const feels = state.raw?.feels || state.raw?.temp || 0;
        const humidity = state.raw?.humidity || 0;

        let risk = "Gering";
        let color = "#4CAF50";
        let advice = [];

        if (feels >= 35) {
          risk = "Sehr hoch";
          color = "#9C27B0";
          advice = [
            "Mittagshitze meiden (11-16 Uhr)",
            "Viel trinken (3+ Liter)",
            "Leichte Kleidung tragen",
            "Klimatisierte Räume aufsuchen",
            "Anstrengende Aktivitäten vermeiden",
          ];
        } else if (feels >= 30) {
          risk = "Hoch";
          color = "#F44336";
          advice = [
            "Direkte Sonne meiden",
            "Regelmäßig trinken",
            "Leichte Mahlzeiten",
            "Pausen im Schatten",
          ];
        } else if (feels >= 25) {
          risk = "Mittel";
          color = "#FF9800";
          advice = [
            "Auf ausreichend Flüssigkeit achten",
            "Sonnenschutz verwenden",
            "Übermäßige Anstrengung vermeiden",
          ];
        } else {
          advice = [
            "Keine besonderen Vorkehrungen nötig",
            "Bei Sport auf Hydration achten",
          ];
        }

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">🔥</span>
            <h2 class="bottom-sheet__title">Hitzerisiko</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktuelles Risiko</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${color}">${risk}</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Gefühlte Temperatur:</span>
                <span style="font-weight:600">${Math.round(feels)}°C</span>
              </div>
              <div class="detail-card__row">
                <span>Luftfeuchtigkeit:</span>
                <span style="font-weight:600">${Math.round(humidity)}%</span>
              </div>
            </div>
            <div class="detail-card">
              <h3>Empfehlungen</h3>
              <ul class="detail-card__list">
                ${advice.map((a) => `<li>• ${a}</li>`).join("")}
              </ul>
            </div>
            <div class="detail-card">
              <h3>Warnsymptome Hitzschlag</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li>🚨 Kopfschmerzen, Schwindel</li>
                <li>🚨 Übelkeit, Erbrechen</li>
                <li>🚨 Krämpfe</li>
                <li>🚨 Bewusstseinseintrübung</li>
              </ul>
              <p class="detail-text--secondary" style="font-size:0.8rem;margin-top:8px">Bei diesen Symptomen: Sofort in den Schatten, Kühlung, Flüssigkeit. Bei Bewusstlosigkeit: Notruf 112!</p>
            </div>
          </div>
        `;
      },

      uv: () => {
        const maxUv = hourly.reduce(
          (max, h) => Math.max(max, h.uvIndex || h.uv || 0),
          0
        );
        const currentUv = current.uvIndex || 0;

        const getUvInfo = (uv) => {
          if (uv <= 2)
            return {
              label: "Niedrig",
              color: "#4CAF50",
              protection: "Kein Schutz erforderlich",
            };
          if (uv <= 5)
            return {
              label: "Moderat",
              color: "#FFEB3B",
              protection: "Sonnenschutz bei längerem Aufenthalt",
            };
          if (uv <= 7)
            return {
              label: "Hoch",
              color: "#FF9800",
              protection: "Sonnencreme, Hut und Sonnenbrille",
            };
          if (uv <= 10)
            return {
              label: "Sehr hoch",
              color: "#F44336",
              protection: "Mittags meiden, hoher Schutz",
            };
          return {
            label: "Extrem",
            color: "#9C27B0",
            protection: "Mittagssonne unbedingt meiden",
          };
        };

        const info = getUvInfo(maxUv);

        const hourlyUv = hourly
          .slice(0, 12)
          .map((h) => {
            const uv = h.uvIndex || h.uv || 0;
            const uvInfo = getUvInfo(uv);
            return `
            <div class="hourly-bar">
              <div class="hourly-bar__fill" style="--bar-height:${
                (uv / 11) * 100
              }%;background:${uvInfo.color}"></div>
              <span class="hourly-bar__value">${Math.round(uv)}</span>
              <span class="hourly-bar__time">${formatTime(h.time)}</span>
            </div>
          `;
          })
          .join("");

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">☀️</span>
            <h2 class="bottom-sheet__title">UV-Schutz</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>UV-Index heute</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${
                  info.color
                }">${Math.round(maxUv)}</span>
                <span class="detail-card__label" style="color:${info.color}">${
          info.label
        }</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Aktuell:</span>
                <span style="font-weight:600">${Math.round(currentUv)}</span>
              </div>
              <div class="detail-card__row">
                <span>Empfehlung:</span>
                <span style="font-weight:600">${info.protection}</span>
              </div>
            </div>
            <div class="detail-card">
              <h3>Stündlicher UV-Verlauf</h3>
              <div class="hourly-bars">${hourlyUv}</div>
            </div>
            <div class="detail-card">
              <h3>UV-Index Skala</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li><span style="color:#4CAF50">●</span> 0-2 – Niedrig</li>
                <li><span style="color:#FFEB3B">●</span> 3-5 – Moderat</li>
                <li><span style="color:#FF9800">●</span> 6-7 – Hoch</li>
                <li><span style="color:#F44336">●</span> 8-10 – Sehr hoch</li>
                <li><span style="color:#9C27B0">●</span> 11+ – Extrem</li>
              </ul>
            </div>
          </div>
        `;
      },

      windchill: () => {
        const temp = current.temperature;
        const windSpeed = current.windSpeed;
        const windchill = calculateWindchill(temp, windSpeed);
        const info = getWindchillInfo(windchill);

        // Stündlicher Windchill
        const hourlyWindchill = hourly
          .slice(0, 12)
          .map((h) => {
            const hTemp = h.temperature;
            const hWind = h.windSpeed;
            const hWindchill = calculateWindchill(hTemp, hWind);
            const hInfo = getWindchillInfo(hWindchill);
            return `
            <div class="hourly-bar">
              <div class="hourly-bar__fill" style="--bar-height:${Math.max(
                0,
                100 - Math.abs(hWindchill || 0) * 2
              )}%;background:${hInfo.color}"></div>
              <span class="hourly-bar__value">${
                hWindchill !== null ? Math.round(hWindchill) + "°" : "–"
              }</span>
              <span class="hourly-bar__time">${formatTime(h.time)}</span>
            </div>
          `;
          })
          .join("");

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">🌬️</span>
            <h2 class="bottom-sheet__title">Windchill</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Gefühlte Kälte</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${info.color}">${
          windchill !== null ? Math.round(windchill) + "°C" : "–"
        }</span>
                <span class="detail-card__label" style="color:${info.color}">${
          info.label
        }</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Aktuelle Temperatur:</span>
                <span style="font-weight:600">${
                  temp !== null ? Math.round(temp) + "°C" : "–"
                }</span>
              </div>
              <div class="detail-card__row">
                <span>Windgeschwindigkeit:</span>
                <span style="font-weight:600">${
                  windSpeed !== null ? Math.round(windSpeed) + " km/h" : "–"
                }</span>
              </div>
              <div class="detail-card__row">
                <span>Erfrierungsrisiko:</span>
                <span style="font-weight:600;color:${info.color}">${
          info.risk
        }</span>
              </div>
            </div>
            <div class="detail-card">
              <h3>Stündlicher Verlauf</h3>
              <div class="hourly-bars">${hourlyWindchill}</div>
            </div>
            <div class="detail-card">
              <h3>Was ist Windchill?</h3>
              <p class="detail-text">Der Windchill-Faktor beschreibt, wie kalt sich die Temperatur durch Wind anfühlt. Bei starkem Wind wird dem Körper schneller Wärme entzogen.</p>
              <h4 style="margin-top:12px;font-size:0.9rem">Risiko-Stufen</h4>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li><span style="color:#4CAF50">●</span> &gt;10°C – Kein Risiko</li>
                <li><span style="color:#8BC34A">●</span> 0-10°C – Gering</li>
                <li><span style="color:#FFEB3B">●</span> -10-0°C – Moderat</li>
                <li><span style="color:#FF9800">●</span> -25 bis -10°C – Erhöht</li>
                <li><span style="color:#F44336">●</span> -40 bis -25°C – Hoch</li>
                <li><span style="color:#9C27B0">●</span> &lt;-40°C – Sehr hoch</li>
              </ul>
            </div>
          </div>
        `;
      },

      aqi: () => {
        const aqi = appState?.aqi || {};
        const euAqi = aqi.europeanAqi || 0;
        const usAqi = aqi.usAqi || 0;

        const getEuInfo = (value) => {
          if (value <= 20) return { label: "Gut", color: "#4CAF50" };
          if (value <= 40) return { label: "Akzeptabel", color: "#8BC34A" };
          if (value <= 60) return { label: "Mäßig", color: "#FFEB3B" };
          if (value <= 80) return { label: "Schlecht", color: "#FF9800" };
          if (value <= 100) return { label: "Sehr schlecht", color: "#F44336" };
          return { label: "Gefährlich", color: "#9C27B0" };
        };

        const euInfo = getEuInfo(euAqi);

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">≋</span>
            <h2 class="bottom-sheet__title">Luftqualität</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>EU Luftqualitätsindex</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${
                  euInfo.color
                }">${Math.round(euAqi)}</span>
                <span class="detail-card__label" style="color:${
                  euInfo.color
                }">${euInfo.label}</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>US AQI:</span>
                <span style="font-weight:600">${Math.round(usAqi)}</span>
              </div>
            </div>
            <div class="detail-card">
              <h3>Gesundheitsempfehlungen</h3>
              <ul class="detail-card__list">
                ${
                  euAqi <= 40
                    ? "<li>✓ Normale Outdoor-Aktivitäten möglich</li>"
                    : ""
                }
                ${
                  euAqi > 40 && euAqi <= 60
                    ? "<li>⚠️ Empfindliche Personen sollten Anstrengung reduzieren</li>"
                    : ""
                }
                ${
                  euAqi > 60 && euAqi <= 80
                    ? "<li>⚠️ Längere Outdoor-Aktivitäten einschränken</li><li>⚠️ Empfindliche Gruppen: drinnen bleiben</li>"
                    : ""
                }
                ${
                  euAqi > 80
                    ? "<li>🚨 Outdoor-Aktivitäten vermeiden</li><li>🚨 Fenster geschlossen halten</li><li>🚨 Luftfilter verwenden</li>"
                    : ""
                }
              </ul>
            </div>
            <div class="detail-card">
              <h3>EU AQI Skala</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li><span style="color:#4CAF50">●</span> 0-20 – Gut</li>
                <li><span style="color:#8BC34A">●</span> 21-40 – Akzeptabel</li>
                <li><span style="color:#FFEB3B">●</span> 41-60 – Mäßig</li>
                <li><span style="color:#FF9800">●</span> 61-80 – Schlecht</li>
                <li><span style="color:#F44336">●</span> 81-100 – Sehr schlecht</li>
                <li><span style="color:#9C27B0">●</span> &gt;100 – Gefährlich</li>
              </ul>
            </div>
          </div>
        `;
      },
    };

    return templates[cardType] ? templates[cardType]() : "";
  }

  function openHealthModal(cardType, appState, healthState) {
    const modalContent = getModalContent(cardType, appState, healthState);
    if (!modalContent) return;

    const sheetId = `sheet-health-${cardType}`;
    let sheet = document.getElementById(sheetId);

    if (!sheet) {
      sheet = document.createElement("section");
      sheet.id = sheetId;
      sheet.className = "bottom-sheet bottom-sheet--full";
      const overlay = document.getElementById("bottom-sheet-overlay");
      if (overlay) {
        overlay.appendChild(sheet);
      } else {
        document.body.appendChild(sheet);
      }
    }

    sheet.innerHTML = modalContent;

    if (window.ModalController) {
      window.ModalController.openSheet(sheetId);
    }
  }

  // ========================================
  // MAIN RENDER FUNCTION
  // ========================================

  function render(appState, healthState) {
    const container =
      document.getElementById("health-view-container") ||
      document.querySelector('[data-view="health"] .app-view__content') ||
      document.querySelector('[data-view="health"]');

    if (!container) {
      console.warn("[HealthSafetyView] Container not found");
      return;
    }

    const state = healthState || {};
    const timeline = state.outdoorScoreTimeline || [];
    const alerts = window._healthAlerts || [];

    const cardsHtml = `
      <div class="health-view-grid">
        <!-- Weather Alerts Section -->
        ${renderAlertsSection(alerts)}

        <!-- Health Metric Cards Grid -->
        <section class="health-cards-section">
          <div class="health-cards-header">
            <span class="health-cards-icon">💚</span>
            <h3>Gesundheits-Metriken</h3>
          </div>
          <div class="health-cards-grid">
            ${renderUmbrellaCard(state)}
            ${renderOutdoorCard(state)}
            ${renderClothingCard(state)}
            ${renderDrivingCard(state)}
            ${renderHeatCard(state)}
            ${renderUVCard(state)}
            ${renderWindchillCard(appState, state)}
            ${renderAQICard(appState)}
          </div>
        </section>

        <!-- Outdoor Timeline -->
        ${renderOutdoorTimeline(timeline)}
      </div>
    `;

    container.innerHTML = cardsHtml;

    // Add click handlers for cards
    container.querySelectorAll(".health-metric-card").forEach((card) => {
      card.addEventListener("click", () => {
        const cardType = card.dataset.healthCard;
        if (cardType) {
          openHealthModal(cardType, appState, healthState);
        }
      });
    });
  }

  // ========================================
  // ALERTS FETCHING
  // ========================================

  async function fetchHealthAlerts(lat, lon) {
    try {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        hourly:
          "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weathercode,windspeed_10m",
        timezone: "auto",
        forecast_days: "2",
      });

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const payload = await response.json();
      const alerts = deriveAlertsFromForecast(payload);
      window._healthAlerts = alerts;
      return alerts;
    } catch (error) {
      console.error("[HealthSafetyView] fetchHealthAlerts failed:", error);
      window._healthAlerts = [];
      return [];
    }
  }

  function deriveAlertsFromForecast(payload) {
    const alerts = [];
    const hourly = payload?.hourly || {};
    const hours = (hourly.time || []).slice(0, 24);

    const grab = (arr, idx, fallback = null) => {
      if (!arr || !(idx in arr)) return fallback;
      const value = Number(arr[idx]);
      return Number.isFinite(value) ? value : fallback;
    };

    const pushAlert = (id, data) => {
      if (alerts.some((item) => item.id === id)) return;
      alerts.push({ id, ...data });
    };

    hours.forEach((iso, idx) => {
      const temp = grab(hourly.temperature_2m, idx);
      const feels = grab(hourly.apparent_temperature, idx);
      const prob = grab(hourly.precipitation_probability, idx, 0);
      const rain = grab(hourly.precipitation, idx, 0);
      const wind = grab(hourly.windspeed_10m, idx, 0);
      const code = grab(hourly.weathercode, idx);

      // Storm warnings
      if (wind >= 75) {
        pushAlert(`wind-${iso}`, {
          severity: "red",
          title: "Sturmwarnung",
          description: `Windspitzen um ${wind.toFixed(0)} km/h erwartet.`,
          time: iso,
        });
      } else if (wind >= 55) {
        pushAlert(`wind-${iso}`, {
          severity: "orange",
          title: "Sturmböen",
          description: `Wind bis ${wind.toFixed(0)} km/h möglich.`,
          time: iso,
        });
      }

      // Heat warnings
      if (temp >= 35) {
        pushAlert(`heat-${iso}`, {
          severity: "red",
          title: "Extreme Hitze",
          description: `Temperaturen über 35°C erwartet. Hitzeschutz dringend empfohlen!`,
          time: iso,
        });
      } else if (temp >= 32) {
        pushAlert(`heat-${iso}`, {
          severity: "orange",
          title: "Starke Hitze",
          description: `Temperaturen über 32°C erwartet.`,
          time: iso,
        });
      }

      // Frost warnings
      if (feels <= -15) {
        pushAlert(`frost-${iso}`, {
          severity: "red",
          title: "Extreme Kälte",
          description: `Gefühlte Temperatur um ${feels.toFixed(
            0
          )}°C. Erfrierungsgefahr!`,
          time: iso,
        });
      } else if (feels <= -10) {
        pushAlert(`frost-${iso}`, {
          severity: "orange",
          title: "Strenger Frost",
          description: `Gefühlte Temperatur um ${feels.toFixed(0)}°C.`,
          time: iso,
        });
      }

      // Heavy rain
      if (rain >= 10 && prob >= 70) {
        pushAlert(`rain-${iso}`, {
          severity: "orange",
          title: "Starkregen",
          description: `${rain.toFixed(1)} mm mit ${prob}% Wahrscheinlichkeit.`,
          time: iso,
        });
      } else if (rain >= 5 && prob >= 60) {
        pushAlert(`rain-${iso}`, {
          severity: "yellow",
          title: "Regen erwartet",
          description: `${rain.toFixed(1)} mm mit ${prob}% Wahrscheinlichkeit.`,
          time: iso,
        });
      }

      // Thunderstorms
      if ([95, 96, 99].includes(code)) {
        pushAlert(`storm-${iso}`, {
          severity: "red",
          title: "Gewitterwarnung",
          description: "Gewitter mit Hagel oder Starkregen möglich.",
          time: iso,
        });
      }
    });

    return alerts;
  }

  // Export
  global.HealthSafetyView = {
    render,
    fetchHealthAlerts,
    openHealthModal,
    calculateWindchill,
    getWindchillInfo,
  };
})(window);
