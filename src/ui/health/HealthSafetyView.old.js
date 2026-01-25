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
  // QUICK CHECK SECTION - Konkrete Empfehlungen
  // ========================================

  /**
   * Render the Quick Check section with actionable recommendations
   */
  function renderQuickCheckSection(state, appState) {
    const feels = state.raw?.feels || state.raw?.temp || 15;
    const precipProb = state.raw?.precipProb || 0;
    const current = appState?.current || {};
    const hourly = appState?.hourly || [];
    const windSpeed = current.windSpeed || 0;
    const humidity = state.raw?.humidity || 50;
    const visibility = current.visibility || 10;
    const currentUv = current.uvIndex || 0;
    const maxUv = hourly
      .slice(0, 12)
      .reduce((max, h) => Math.max(max, h.uvIndex || 0), currentUv);

    // Build check items
    const checks = [];

    // 1. Regenschirm Check
    let umbrellaStatus, umbrellaColor, umbrellaIcon;
    if (precipProb >= 70) {
      umbrellaStatus = "Ja, unbedingt";
      umbrellaColor = "#F44336";
      umbrellaIcon = "☔";
    } else if (precipProb >= 40) {
      umbrellaStatus = "Sicherheitshalber";
      umbrellaColor = "#FF9800";
      umbrellaIcon = "🌂";
    } else {
      umbrellaStatus = "Nein";
      umbrellaColor = "#4CAF50";
      umbrellaIcon = "✓";
    }
    checks.push({
      question: "Regenschirm mitnehmen?",
      answer: umbrellaStatus,
      color: umbrellaColor,
      icon: umbrellaIcon,
      detail: `${precipProb}% Regenwahrscheinlichkeit`,
      type: "umbrella",
    });

    // 2. Sonnenschutz Check
    let sunStatus, sunColor, sunIcon;
    if (maxUv >= 8) {
      sunStatus = "Unbedingt!";
      sunColor = "#F44336";
      sunIcon = "🧴";
    } else if (maxUv >= 5) {
      sunStatus = "Empfohlen";
      sunColor = "#FF9800";
      sunIcon = "🕶️";
    } else if (maxUv >= 3) {
      sunStatus = "Bei längerem Aufenthalt";
      sunColor = "#FFEB3B";
      sunIcon = "☀️";
    } else {
      sunStatus = "Nicht nötig";
      sunColor = "#4CAF50";
      sunIcon = "✓";
    }
    checks.push({
      question: "Sonnenschutz nötig?",
      answer: sunStatus,
      color: sunColor,
      icon: sunIcon,
      detail: `UV-Index: ${Math.round(maxUv)}`,
      type: "uv",
    });

    // 3. Jacke/Kleidung Check
    let jacketStatus, jacketColor, jacketIcon;
    if (feels <= 5) {
      jacketStatus = "Dicke Winterjacke";
      jacketColor = "#2196F3";
      jacketIcon = "🧥";
    } else if (feels <= 12) {
      jacketStatus = "Warme Jacke";
      jacketColor = "#4CAF50";
      jacketIcon = "🧤";
    } else if (feels <= 18 || precipProb >= 50) {
      jacketStatus = precipProb >= 50 ? "Regenjacke" : "Leichte Jacke";
      jacketColor = precipProb >= 50 ? "#42A5F5" : "#8BC34A";
      jacketIcon = "🧥";
    } else {
      jacketStatus = "Nicht nötig";
      jacketColor = "#4CAF50";
      jacketIcon = "✓";
    }
    checks.push({
      question: "Jacke anziehen?",
      answer: jacketStatus,
      color: jacketColor,
      icon: jacketIcon,
      detail: `Gefühlt ${Math.round(feels)}°C`,
      type: "clothing",
    });

    // 4. Fahrsicherheit Check
    let drivingStatus, drivingColor, drivingIcon;
    const drivingRisk =
      (windSpeed >= 60 ? 2 : windSpeed >= 40 ? 1 : 0) +
      (precipProb >= 80 ? 2 : precipProb >= 50 ? 1 : 0) +
      (visibility < 1 ? 2 : visibility < 5 ? 1 : 0);

    if (drivingRisk >= 4) {
      drivingStatus = "Vorsicht geboten!";
      drivingColor = "#F44336";
      drivingIcon = "⚠️";
    } else if (drivingRisk >= 2) {
      drivingStatus = "Aufmerksam fahren";
      drivingColor = "#FF9800";
      drivingIcon = "🚗";
    } else {
      drivingStatus = "Normale Bedingungen";
      drivingColor = "#4CAF50";
      drivingIcon = "✓";
    }

    let drivingDetail = [];
    if (windSpeed >= 40)
      drivingDetail.push(`${Math.round(windSpeed)} km/h Wind`);
    if (precipProb >= 50) drivingDetail.push(`${precipProb}% Regen`);
    if (visibility < 5) drivingDetail.push(`${visibility} km Sicht`);

    checks.push({
      question: "Autofahrt sicher?",
      answer: drivingStatus,
      color: drivingColor,
      icon: drivingIcon,
      detail:
        drivingDetail.length > 0
          ? drivingDetail.join(", ")
          : "Gute Sicht, wenig Wind",
      type: "driving",
    });

    // 5. Sport draußen Check
    const outdoorScore = state.currentOutdoorScore || 50;
    let sportStatus, sportColor, sportIcon;
    if (outdoorScore >= 70) {
      sportStatus = "Ideale Bedingungen";
      sportColor = "#4CAF50";
      sportIcon = "🏃";
    } else if (outdoorScore >= 50) {
      sportStatus = "Möglich";
      sportColor = "#8BC34A";
      sportIcon = "👍";
    } else if (outdoorScore >= 30) {
      sportStatus = "Mit Einschränkungen";
      sportColor = "#FF9800";
      sportIcon = "⚡";
    } else {
      sportStatus = "Besser drinnen";
      sportColor = "#F44336";
      sportIcon = "🏠";
    }
    checks.push({
      question: "Sport im Freien?",
      answer: sportStatus,
      color: sportColor,
      icon: sportIcon,
      detail: `Outdoor-Score: ${outdoorScore}/100`,
      type: "outdoor",
    });

    // Build HTML
    const checkItems = checks
      .map(
        (check) => `
      <div class="quick-check-item" data-check-type="${check.type}">
        <div class="quick-check-question">${check.question}</div>
        <div class="quick-check-answer">
          <span class="quick-check-icon">${check.icon}</span>
          <span class="quick-check-status" style="color:${check.color}">${check.answer}</span>
        </div>
        <div class="quick-check-detail">${check.detail}</div>
      </div>
    `
      )
      .join("");

    return `
      <section class="quick-check-section">
        <div class="quick-check-header">
          <span class="quick-check-header-icon">✅</span>
          <div class="quick-check-header-text">
            <h3>Schnell-Check</h3>
            <span class="quick-check-subtitle">Was du heute wissen musst</span>
          </div>
        </div>
        <div class="quick-check-grid">
          ${checkItems}
        </div>
      </section>
    `;
  }

  // ========================================
  // WEATHER ALERTS SECTION - REDESIGNED
  // ========================================

  /**
   * Get category info for alert types
   */
  function getAlertCategoryInfo(type) {
    const categories = {
      wind: { icon: "💨", label: "Wind", color: "#64B5F6" },
      heat: { icon: "🌡️", label: "Hitze", color: "#FF7043" },
      cold: { icon: "❄️", label: "Kälte", color: "#4FC3F7" },
      rain: { icon: "🌧️", label: "Niederschlag", color: "#42A5F5" },
      storm: { icon: "⛈️", label: "Gewitter", color: "#7E57C2" },
      fog: { icon: "🌫️", label: "Nebel", color: "#90A4AE" },
      uv: { icon: "☀️", label: "UV-Strahlung", color: "#FFA726" },
    };
    return (
      categories[type] || { icon: "⚠️", label: "Warnung", color: "#FF9800" }
    );
  }

  /**
   * Group alerts by severity and type for cleaner display
   */
  function processAlerts(rawAlerts) {
    if (!rawAlerts || rawAlerts.length === 0)
      return { hasAlerts: false, summary: null, grouped: {} };

    // Group by type
    const grouped = {};
    rawAlerts.forEach((alert) => {
      const type = alert.type || "other";
      if (!grouped[type]) {
        grouped[type] = {
          alerts: [],
          maxSeverity: "yellow",
          ...getAlertCategoryInfo(type),
        };
      }
      grouped[type].alerts.push(alert);
      // Track highest severity
      if (alert.severity === "red" || grouped[type].maxSeverity !== "red") {
        if (alert.severity === "red") grouped[type].maxSeverity = "red";
        else if (
          alert.severity === "orange" &&
          grouped[type].maxSeverity !== "red"
        ) {
          grouped[type].maxSeverity = "orange";
        }
      }
    });

    // Determine overall status
    const hasRed = rawAlerts.some((a) => a.severity === "red");
    const hasOrange = rawAlerts.some((a) => a.severity === "orange");

    let summary = {
      level: hasRed ? "critical" : hasOrange ? "warning" : "info",
      color: hasRed ? "#F44336" : hasOrange ? "#FF9800" : "#FFEB3B",
      text: hasRed
        ? "Wetterwarnungen aktiv"
        : hasOrange
        ? "Hinweise beachten"
        : "Leichte Hinweise",
      icon: hasRed ? "🚨" : hasOrange ? "⚠️" : "💡",
    };

    return { hasAlerts: true, summary, grouped, totalCount: rawAlerts.length };
  }

  function renderAlertsSection(alerts) {
    const { hasAlerts, summary, grouped, totalCount } = processAlerts(alerts);

    if (!hasAlerts) {
      return `
        <section class="weather-alerts-section" data-clickable-alerts>
          <div class="weather-alerts-header">
            <span class="weather-alerts-icon">✅</span>
            <div class="weather-alerts-title">
              <h3>Wetter-Status</h3>
              <span class="weather-alerts-subtitle">Nächste 24 Stunden</span>
            </div>
          </div>
          <div class="weather-alerts-status weather-alerts-status--good">
            <span class="weather-alerts-status__icon">👍</span>
            <div class="weather-alerts-status__text">
              <strong>Alles im grünen Bereich</strong>
              <p>Keine besonderen Wetterereignisse erwartet</p>
            </div>
          </div>
          <div class="weather-alerts-footer">
            <span class="weather-alerts-more">Tippen für Details →</span>
          </div>
        </section>
      `;
    }

    // Create compact category pills
    const categoryPills = Object.entries(grouped)
      .sort((a, b) => {
        const severityOrder = { red: 0, orange: 1, yellow: 2 };
        return (
          (severityOrder[a[1].maxSeverity] || 3) -
          (severityOrder[b[1].maxSeverity] || 3)
        );
      })
      .slice(0, 4)
      .map(([type, data]) => {
        const severityColor =
          data.maxSeverity === "red"
            ? "#F44336"
            : data.maxSeverity === "orange"
            ? "#FF9800"
            : "#FFEB3B";
        return `
          <div class="weather-alert-pill" style="--pill-color: ${severityColor}">
            <span class="weather-alert-pill__icon">${data.icon}</span>
            <span class="weather-alert-pill__label">${data.label}</span>
            ${
              data.alerts.length > 1
                ? `<span class="weather-alert-pill__count">${data.alerts.length}</span>`
                : ""
            }
          </div>
        `;
      })
      .join("");

    // Get the most important alert for preview
    const topAlert = alerts.sort((a, b) => {
      const order = { red: 0, orange: 1, yellow: 2 };
      return (order[a.severity] || 3) - (order[b.severity] || 3);
    })[0];

    return `
      <section class="weather-alerts-section" data-clickable-alerts>
        <div class="weather-alerts-header">
          <span class="weather-alerts-icon">${summary.icon}</span>
          <div class="weather-alerts-title">
            <h3>Wetter-Hinweise</h3>
            <span class="weather-alerts-subtitle">${summary.text}</span>
          </div>
          <span class="weather-alerts-badge" style="background:${
            summary.color
          }">${totalCount}</span>
        </div>

        <div class="weather-alerts-pills">
          ${categoryPills}
        </div>

        ${
          topAlert
            ? `
          <div class="weather-alert-preview" style="border-color:${
            summary.color
          }">
            <div class="weather-alert-preview__content">
              <strong>${topAlert.title}</strong>
              <p>${topAlert.description}</p>
            </div>
            <span class="weather-alert-preview__time">${formatTime(
              topAlert.time
            )}</span>
          </div>
        `
            : ""
        }

        <div class="weather-alerts-footer">
          <span class="weather-alerts-more">Tippen für alle Details →</span>
        </div>
      </section>
    `;
  }

  /**
   * Render alerts modal content
   */
  function renderAlertsModalContent(alerts) {
    const { hasAlerts, summary, grouped } = processAlerts(alerts);

    if (!hasAlerts) {
      return `
        <header class="bottom-sheet__header">
          <span class="bottom-sheet__icon">✅</span>
          <h2 class="bottom-sheet__title">Wetter-Status</h2>
          <button class="bottom-sheet__close" type="button" data-close-sheet>
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        <div class="bottom-sheet__body">
          <div class="detail-card">
            <div class="alerts-modal-empty">
              <span class="alerts-modal-empty__icon">🌤️</span>
              <h3>Keine Warnungen</h3>
              <p>In den nächsten 24 Stunden sind keine besonderen Wetterereignisse zu erwarten.</p>
            </div>
          </div>
          <div class="detail-card">
            <h3>Allgemeine Empfehlungen</h3>
            <ul class="detail-card__list">
              <li>✓ Normale Aktivitäten möglich</li>
              <li>✓ Keine besonderen Vorkehrungen nötig</li>
              <li>💡 Wetter-App für Updates im Blick behalten</li>
            </ul>
          </div>
        </div>
      `;
    }

    // Group alerts by category for the modal
    const categoryCards = Object.entries(grouped)
      .sort((a, b) => {
        const severityOrder = { red: 0, orange: 1, yellow: 2 };
        return (
          (severityOrder[a[1].maxSeverity] || 3) -
          (severityOrder[b[1].maxSeverity] || 3)
        );
      })
      .map(([type, data]) => {
        const severityColor =
          data.maxSeverity === "red"
            ? "#F44336"
            : data.maxSeverity === "orange"
            ? "#FF9800"
            : "#FFEB3B";
        const severityBg =
          data.maxSeverity === "red"
            ? "rgba(244, 67, 54, 0.1)"
            : data.maxSeverity === "orange"
            ? "rgba(255, 152, 0, 0.1)"
            : "rgba(255, 235, 59, 0.1)";

        // Get time range
        const times = data.alerts
          .map((a) => a.time)
          .filter(Boolean)
          .sort();
        const firstTime = times[0] ? formatTime(times[0]) : "";
        const lastTime = times[times.length - 1]
          ? formatTime(times[times.length - 1])
          : "";
        const timeRange =
          firstTime === lastTime ? firstTime : `${firstTime} - ${lastTime}`;

        // Get recommendation based on type and severity
        const recommendations = getAlertRecommendations(type, data.maxSeverity);

        return `
          <div class="detail-card" style="border-left: 3px solid ${severityColor}; background: ${severityBg}">
            <div class="alert-category-header">
              <span class="alert-category-icon">${data.icon}</span>
              <div class="alert-category-info">
                <strong>${data.label}</strong>
                <span class="alert-category-time">${timeRange} Uhr</span>
              </div>
              <span class="alert-category-severity" style="color:${severityColor}">
                ${
                  data.maxSeverity === "red"
                    ? "Warnung"
                    : data.maxSeverity === "orange"
                    ? "Achtung"
                    : "Hinweis"
                }
              </span>
            </div>
            <p class="alert-category-description">${
              data.alerts[0].description
            }</p>
            ${
              recommendations.length > 0
                ? `
              <div class="alert-recommendations">
                <span class="alert-recommendations-label">Empfehlung:</span>
                <ul>
                  ${recommendations.map((r) => `<li>${r}</li>`).join("")}
                </ul>
              </div>
            `
                : ""
            }
          </div>
        `;
      })
      .join("");

    return `
      <header class="bottom-sheet__header">
        <span class="bottom-sheet__icon">${summary.icon}</span>
        <h2 class="bottom-sheet__title">Wetter-Hinweise</h2>
        <button class="bottom-sheet__close" type="button" data-close-sheet>
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="bottom-sheet__body">
        <div class="alerts-modal-summary" style="background: linear-gradient(135deg, ${
          summary.color
        }22, ${summary.color}11)">
          <div class="alerts-modal-summary__status">
            <span class="alerts-modal-summary__icon">${summary.icon}</span>
            <div>
              <strong>${summary.text}</strong>
              <p>${alerts.length} ${
      alerts.length === 1 ? "Hinweis" : "Hinweise"
    } für die nächsten 24h</p>
            </div>
          </div>
        </div>

        ${categoryCards}

        <div class="detail-card">
          <h3>Allgemeine Sicherheitstipps</h3>
          <ul class="detail-card__list" style="font-size:0.85rem">
            <li>📱 Push-Benachrichtigungen aktivieren für wichtige Updates</li>
            <li>🔄 Vorhersage regelmäßig aktualisieren</li>
            <li>📍 Lokale Behörden bei extremen Wetterereignissen beachten</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Get recommendations based on alert type and severity
   */
  function getAlertRecommendations(type, severity) {
    const recommendations = {
      wind: {
        red: [
          "Aufenthalt im Freien vermeiden",
          "Lose Gegenstände sichern",
          "Vorsicht vor herabfallenden Ästen",
        ],
        orange: ["Vorsicht bei Outdoor-Aktivitäten", "Fenster schließen"],
        yellow: ["Auf Windböen achten"],
      },
      heat: {
        red: [
          "Direkte Sonne meiden",
          "Viel trinken (mind. 3L)",
          "Klimatisierte Räume aufsuchen",
          "Körperliche Anstrengung vermeiden",
        ],
        orange: [
          "Mittagshitze meiden",
          "Ausreichend trinken",
          "Sonnenschutz verwenden",
        ],
        yellow: ["Auf Flüssigkeitszufuhr achten"],
      },
      cold: {
        red: [
          "Warme Kleidung in Schichten",
          "Aufenthalt im Freien minimieren",
          "Auf Erfrierungszeichen achten",
        ],
        orange: ["Warm anziehen", "Handschuhe und Mütze tragen"],
        yellow: ["Wärmer kleiden als üblich"],
      },
      rain: {
        red: [
          "Regenschutz mitnehmen",
          "Keller auf Überflutung prüfen",
          "Nicht durch überflutete Straßen fahren",
        ],
        orange: ["Regenschirm einpacken", "Wasserdichte Kleidung"],
        yellow: ["Regenschirm dabei haben"],
      },
      storm: {
        red: [
          "Sofort Schutz suchen",
          "Nicht unter Bäumen stehen",
          "Elektrische Geräte meiden",
        ],
        orange: [
          "Outdoor-Aktivitäten verschieben",
          "Schutz in der Nähe suchen",
        ],
        yellow: ["Wetter im Auge behalten"],
      },
      fog: {
        red: ["Autofahrten vermeiden", "Nebelscheinwerfer nutzen"],
        orange: ["Vorsichtig fahren", "Abstand halten"],
        yellow: ["Mit eingeschränkter Sicht rechnen"],
      },
      uv: {
        red: ["Direkte Sonne komplett meiden", "Hoher Lichtschutzfaktor (50+)"],
        orange: ["Sonnencreme auftragen", "Hut und Sonnenbrille tragen"],
        yellow: ["Sonnenschutz empfohlen"],
      },
    };
    return recommendations[type]?.[severity] || [];
  }

  // ========================================
  // OUTDOOR SCORE SECTION - REDESIGNED
  // ========================================

  /**
   * Get icon for a factor
   */
  function getFactorIcon(factorKey) {
    const icons = {
      temperature: "🌡️",
      wind: "💨",
      precipitation: "🌧️",
      uv: "☀️",
      humidity: "💧",
      airQuality: "🌫️",
      pollen: "🌸",
      visibility: "👁️",
    };
    return icons[factorKey] || "📊";
  }

  /**
   * Get German label for a factor
   */
  function getFactorLabel(factorKey) {
    const labels = {
      temperature: "Temperatur",
      wind: "Wind",
      precipitation: "Niederschlag",
      uv: "UV-Index",
      humidity: "Feuchtigkeit",
      airQuality: "Luftqualität",
      pollen: "Pollenflug",
      visibility: "Sichtweite",
    };
    return labels[factorKey] || factorKey;
  }

  /**
   * Render the main outdoor score card with factors
   */
  function renderOutdoorScoreSection(healthState, appState) {
    const score = healthState?.currentOutdoorScore || 50;
    const factors = healthState?.currentScoreFactors || {};
    const timeline = healthState?.outdoorScoreTimeline || [];
    const sliced = timeline.slice(0, 12);

    const color = getScoreColor(score);
    const label = labelForScore(score);

    // Find best time
    let bestSlot = sliced[0] || { score: 50 };
    sliced.forEach((slot) => {
      if ((slot.score || 0) > (bestSlot.score || 0)) bestSlot = slot;
    });
    const bestTimeStr = formatTime(bestSlot.time) || "";
    const bestHour =
      bestTimeStr.match(/(\d{1,2}):/)?.[1] || bestTimeStr.substring(0, 2);

    // Sort factors by impact (lowest score = biggest problem)
    const sortedFactors = Object.entries(factors)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 4); // Show top 4 factors

    // Create mini factor bars
    const factorBars = sortedFactors
      .map(([key, data]) => {
        const factorColor = getScoreColor(data.score);
        const icon = getFactorIcon(key);
        const labelText = getFactorLabel(key);
        return `
        <div class="outdoor-factor-item">
          <span class="outdoor-factor-icon">${icon}</span>
          <div class="outdoor-factor-info">
            <span class="outdoor-factor-label">${labelText}</span>
            <div class="outdoor-factor-bar">
              <div class="outdoor-factor-bar__fill" style="width:${data.score}%;background:${factorColor}"></div>
            </div>
          </div>
          <span class="outdoor-factor-score" style="color:${factorColor}">${data.score}</span>
        </div>
      `;
      })
      .join("");

    // Create timeline mini chart
    const timelineBars = sliced
      .map((slot, idx) => {
        const slotScore = Math.round(slot.score || 0);
        const slotColor = getScoreColor(slotScore);
        const barHeight = Math.max(4, Math.round((slotScore / 100) * 40));
        const time = formatTime(slot.time) || "";
        const hourStr = time.match(/(\d{1,2}):/)?.[1] || "";
        const showLabel = idx % 3 === 0;
        return `
        <div class="outdoor-mini-bar" title="${time}: ${slotScore}">
          <div class="outdoor-mini-bar__fill" style="height:${barHeight}px;background:${slotColor}"></div>
          <span class="outdoor-mini-bar__time">${
            showLabel ? hourStr : ""
          }</span>
        </div>
      `;
      })
      .join("");

    // Activity suggestion based on score
    let activityHint = "";
    if (score >= 80) {
      activityHint = "🏃 Perfekt für Sport & lange Aktivitäten";
    } else if (score >= 60) {
      activityHint = "🚶 Gut für Spaziergänge & moderate Aktivitäten";
    } else if (score >= 40) {
      activityHint = "🛒 Kurze Erledigungen möglich";
    } else if (score >= 20) {
      activityHint = "⚡ Nur kurze Aufenthalte empfohlen";
    } else {
      activityHint = "🏠 Besser drinnen bleiben";
    }

    return `
      <section class="outdoor-score-section" data-clickable-outdoor>
        <div class="outdoor-score-header">
          <div class="outdoor-score-title">
            <span class="outdoor-score-icon">🌤️</span>
            <h3>Outdoor-Score</h3>
          </div>
          <span class="outdoor-score-time">Nächste 12h</span>
        </div>

        <div class="outdoor-score-main">
          <div class="outdoor-score-circle" style="--score-color:${color}">
            <svg viewBox="0 0 100 100">
              <circle class="outdoor-score-bg" cx="50" cy="50" r="42" />
              <circle class="outdoor-score-progress" cx="50" cy="50" r="42"
                      style="stroke-dasharray: ${
                        score * 2.64
                      } 264; stroke: ${color}" />
            </svg>
            <div class="outdoor-score-value">
              <span class="outdoor-score-number">${score}</span>
              <span class="outdoor-score-label">${label}</span>
            </div>
          </div>

          <div class="outdoor-score-details">
            <div class="outdoor-score-hint">${activityHint}</div>
            <div class="outdoor-factors-list">
              ${factorBars}
            </div>
          </div>
        </div>

        <div class="outdoor-timeline-mini">
          <div class="outdoor-timeline-mini__chart">
            ${timelineBars}
          </div>
        </div>

        <div class="outdoor-score-footer">
          <div class="outdoor-best-time">
            <span class="outdoor-best-icon">✨</span>
            <span>Beste Zeit: <strong>${bestHour} Uhr</strong> (Score: ${Math.round(
      bestSlot.score || 0
    )})</span>
          </div>
          <span class="outdoor-more-info">Tippen für Details →</span>
        </div>
      </section>
    `;
  }

  /**
   * Legacy function for backwards compatibility
   */
  function renderOutdoorTimeline(timeline) {
    // This is now handled by renderOutdoorScoreSection
    return "";
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
        const currentScore =
          state.currentOutdoorScore || timeline[0]?.score || 50;
        const factors = state.currentScoreFactors || {};
        const scoreColor = getScoreColor(currentScore);
        const scoreLabel = labelForScore(currentScore);

        // Find best time in timeline
        let bestSlot = timeline[0] || { score: 50 };
        timeline.slice(0, 12).forEach((slot) => {
          if ((slot.score || 0) > (bestSlot.score || 0)) bestSlot = slot;
        });
        const bestTime = formatTime(bestSlot.time) || "--:--";
        const bestScore = Math.round(bestSlot.score || 50);

        // Create factor breakdown
        const factorOrder = [
          "temperature",
          "precipitation",
          "wind",
          "uv",
          "humidity",
          "airQuality",
          "pollen",
          "visibility",
        ];
        const factorRows = factorOrder
          .filter((key) => factors[key])
          .map((key) => {
            const data = factors[key];
            const icon = getFactorIcon(key);
            const label = getFactorLabel(key);
            const color = getScoreColor(data.score);
            const weight = Math.round(data.weight * 100);
            // Robust temperature formatting: always 1 decimal, strip float artifacts
            let valueDisplay = data.value;
            if (key === "temperature") {
              let num = Number(data.value);
              if (!isNaN(num)) {
                // Fix float artifacts, always 1 decimal
                valueDisplay = (Math.round(num * 10) / 10).toFixed(1) + "°C";
              }
            }
            return `
              <div class="factor-detail-row">
                <span class="factor-detail-icon">${icon}</span>
                <span class="factor-detail-label">${label}</span>
                <div class="factor-detail-bar">
                  <div class="factor-detail-bar__fill" style="width:${
                    data.score
                  }%;background:${color}"></div>
                </div>
                <span class="factor-detail-score" style="color:${color}">${
              data.score
            }</span>
                <span class="factor-detail-weight">(${weight}%)</span>
                ${
                  key === "temperature"
                    ? `<span class="factor-detail-temp">${valueDisplay}</span>`
                    : ""
                }
              </div>
            `;
          })
          .join("");

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

        // Activity suggestions based on score
        let activities = [];
        if (currentScore >= 80) {
          activities = [
            "Joggen",
            "Radfahren",
            "Wandern",
            "Picknick",
            "Gartenarbeit",
          ];
        } else if (currentScore >= 60) {
          activities = [
            "Spaziergang",
            "Leichtes Training",
            "Kurze Fahrradtour",
          ];
        } else if (currentScore >= 40) {
          activities = ["Kurzer Spaziergang", "Einkaufen", "Besorgungen"];
        } else {
          activities = ["Indoor-Aktivitäten", "Nur kurze Wege"];
        }

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">🌤️</span>
            <h2 class="bottom-sheet__title">Outdoor-Score Details</h2>
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
              <div class="detail-card__row" style="margin-top:12px;background:rgba(76,175,80,0.1);padding:8px 12px;border-radius:8px">
                <span>✨ Beste Zeit heute:</span>
                <span style="font-weight:600">${bestTime} Uhr (Score: ${bestScore})</span>
              </div>
            </div>

            <div class="detail-card">
              <h3>Faktor-Analyse</h3>
              <p class="detail-text--muted" style="font-size:0.8rem;margin-bottom:12px">
                Der Score berechnet sich aus 8 Umweltfaktoren mit unterschiedlicher Gewichtung.
              </p>
              <div class="factor-detail-list">
                ${factorRows}
              </div>
            </div>

            <div class="detail-card">
              <h3>Geeignete Aktivitäten</h3>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                ${activities
                  .map(
                    (a) =>
                      `<span style="background:rgba(93,123,255,0.15);padding:6px 12px;border-radius:20px;font-size:0.85rem">${a}</span>`
                  )
                  .join("")}
              </div>
            </div>

            <div class="detail-card">
              <h3>Stündlicher Verlauf</h3>
              <div class="health-chart-barlist">${timelineRows}</div>
            </div>

            <div class="detail-card">
              <h3>Faktor-Erklärung</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li>🌡️ <strong>Temperatur (25%)</strong> – Optimal: 18-24°C gefühlt</li>
                <li>🌧️ <strong>Niederschlag (20%)</strong> – Regenwahrscheinlichkeit</li>
                <li>💨 <strong>Wind (15%)</strong> – Optimal: unter 20 km/h</li>
                <li>☀️ <strong>UV-Index (10%)</strong> – Niedriger UV = besser</li>
                <li>💧 <strong>Feuchtigkeit (10%)</strong> – Optimal: 40-60%</li>
                <li>🌫️ <strong>Luftqualität (10%)</strong> – AQI unter 40 ideal</li>
                <li>🌸 <strong>Pollenflug (5%)</strong> – Relevant für Allergiker</li>
                <li>👁️ <strong>Sichtweite (5%)</strong> – Für Outdoor-Sport wichtig</li>
              </ul>
            </div>

            <div class="detail-card">
              <h3>Score-Legende</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li><span style="color:#4CAF50">●</span> 80-100 – Perfekt für alle Outdoor-Aktivitäten</li>
                <li><span style="color:#8BC34A">●</span> 60-79 – Gut geeignet</li>
                <li><span style="color:#FFEB3B">●</span> 40-59 – Mit Einschränkungen möglich</li>
                <li><span style="color:#FF9800">●</span> 20-39 – Nur kurze Aufenthalte empfohlen</li>
                <li><span style="color:#F44336">●</span> 0-19 – Besser drinnen bleiben</li>
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

      comfort: () => {
        const feels = state.raw?.feels || state.raw?.temp || 15;
        const humidity = state.raw?.humidity || 50;
        const temp = current.temperature || feels;
        const windSpeed = current.windSpeed || 0;
        const windchill = calculateWindchill(temp, windSpeed);

        // Determine comfort level
        let comfort = { level: "Angenehm", color: "#4CAF50", icon: "😊" };
        let factors = [];
        let tips = [];

        if (feels >= 35) {
          comfort = { level: "Sehr heiß", color: "#F44336", icon: "🥵" };
          factors = [
            "Extreme Hitze",
            humidity >= 60 ? "Hohe Luftfeuchtigkeit" : null,
          ].filter(Boolean);
          tips = [
            "Direkte Sonne meiden",
            "Viel trinken (3+ Liter)",
            "Klimatisierte Räume aufsuchen",
            "Sport vermeiden",
          ];
        } else if (feels >= 30) {
          comfort = { level: "Heiß", color: "#FF9800", icon: "😓" };
          factors = [
            "Hohe Temperatur",
            humidity >= 70 ? "Schwüle Luft" : null,
          ].filter(Boolean);
          tips = [
            "Mittagssonne meiden",
            "Regelmäßig trinken",
            "Leichte Kleidung",
            "Pausen einlegen",
          ];
        } else if (feels >= 25 && humidity >= 70) {
          comfort = { level: "Schwül", color: "#FF9800", icon: "😰" };
          factors = ["Hohe Luftfeuchtigkeit"];
          tips = [
            "Luftige Kleidung",
            "Kühlere Orte aufsuchen",
            "Nicht überanstrengen",
          ];
        } else if (feels <= -10) {
          comfort = { level: "Sehr kalt", color: "#2196F3", icon: "🥶" };
          factors = [
            "Extreme Kälte",
            windSpeed >= 20 ? "Eisiger Wind" : null,
          ].filter(Boolean);
          tips = [
            "Erfrierungsgefahr!",
            "Nur kurz draußen",
            "Alle Körperteile schützen",
            "Warme Getränke",
          ];
        } else if (feels <= 0) {
          comfort = { level: "Kalt", color: "#42A5F5", icon: "❄️" };
          factors = [
            "Frost",
            windSpeed >= 15 ? "Wind verstärkt Kälte" : null,
          ].filter(Boolean);
          tips = ["Warm anziehen", "Handschuhe & Mütze", "Auf Glätte achten"];
        } else if (feels <= 5 && windSpeed >= 30) {
          comfort = { level: "Windig-kalt", color: "#64B5F6", icon: "🌬️" };
          factors = ["Starker Wind"];
          tips = ["Windgeschützte Wege", "Winddichte Kleidung"];
        } else if (feels >= 18 && feels <= 24 && humidity < 70) {
          comfort = { level: "Ideal", color: "#4CAF50", icon: "😎" };
          factors = ["Perfekte Temperatur", "Angenehme Luftfeuchtigkeit"];
          tips = ["Perfekt für alle Aktivitäten!", "Genießen Sie das Wetter"];
        } else {
          factors = ["Normale Bedingungen"];
          tips = ["Keine besonderen Vorkehrungen nötig"];
        }

        return `
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">${comfort.icon}</span>
            <h2 class="bottom-sheet__title">Komfort-Index</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet>
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="detail-card">
              <h3>Aktuelles Wohlbefinden</h3>
              <div class="detail-card__hero">
                <span class="detail-card__value" style="color:${
                  comfort.color
                }">${comfort.level}</span>
              </div>
              <div class="detail-card__row" style="margin-top:12px">
                <span>Gefühlt:</span>
                <span style="font-weight:600">${Math.round(feels)}°C</span>
              </div>
              <div class="detail-card__row">
                <span>Tatsächlich:</span>
                <span style="font-weight:600">${Math.round(temp)}°C</span>
              </div>
              <div class="detail-card__row">
                <span>Luftfeuchtigkeit:</span>
                <span style="font-weight:600">${Math.round(humidity)}%</span>
              </div>
              ${
                windSpeed > 0
                  ? `
                <div class="detail-card__row">
                  <span>Wind:</span>
                  <span style="font-weight:600">${Math.round(
                    windSpeed
                  )} km/h</span>
                </div>
              `
                  : ""
              }
              ${
                windchill !== null && windchill < temp - 2
                  ? `
                <div class="detail-card__row">
                  <span>Windchill:</span>
                  <span style="font-weight:600;color:#42A5F5">${Math.round(
                    windchill
                  )}°C</span>
                </div>
              `
                  : ""
              }
            </div>

            <div class="detail-card">
              <h3>Einflussfaktoren</h3>
              <ul class="detail-card__list">
                ${factors.map((f) => `<li>• ${f}</li>`).join("")}
              </ul>
            </div>

            <div class="detail-card">
              <h3>Empfehlungen</h3>
              <ul class="detail-card__list">
                ${tips.map((t) => `<li>✓ ${t}</li>`).join("")}
              </ul>
            </div>

            <div class="detail-card">
              <h3>Komfort-Skala</h3>
              <ul class="detail-card__list" style="font-size:0.85rem">
                <li><span style="color:#4CAF50">😎</span> 18-24°C, &lt;70% Feuchte – Ideal</li>
                <li><span style="color:#8BC34A">😊</span> 12-28°C – Angenehm</li>
                <li><span style="color:#FFEB3B">😰</span> &gt;25°C + hohe Feuchte – Schwül</li>
                <li><span style="color:#FF9800">😓</span> 30-35°C – Heiß</li>
                <li><span style="color:#F44336">🥵</span> &gt;35°C – Sehr heiß</li>
                <li><span style="color:#42A5F5">❄️</span> &lt;0°C – Kalt</li>
                <li><span style="color:#2196F3">🥶</span> &lt;-10°C – Sehr kalt</li>
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
    const alerts = window._healthAlerts || [];

    const cardsHtml = `
      <div class="health-view-grid">
        <!-- Outdoor Score Section -->
        ${renderOutdoorScoreSection(state, appState)}

        <!-- Weather Alerts Section -->
        ${renderAlertsSection(alerts)}

        <!-- Quick Check Section - Konkrete Empfehlungen -->
        ${renderQuickCheckSection(state, appState)}
      </div>
    `;

    container.innerHTML = cardsHtml;

    // Add click handlers for metric cards
    container.querySelectorAll(".health-metric-card").forEach((card) => {
      card.addEventListener("click", () => {
        const cardType = card.dataset.healthCard;
        if (cardType) {
          openHealthModal(cardType, appState, healthState);
        }
      });
    });

    // Add click handler for outdoor score section
    const outdoorSection = container.querySelector("[data-clickable-outdoor]");
    if (outdoorSection) {
      outdoorSection.addEventListener("click", () => {
        openHealthModal("outdoor", appState, healthState);
      });
    }

    // Add click handler for alerts section
    const alertsSection = container.querySelector("[data-clickable-alerts]");
    if (alertsSection) {
      alertsSection.addEventListener("click", () => {
        openAlertsModal(alerts);
      });
    }
  }

  /**
   * Open alerts modal
   */
  function openAlertsModal(alerts) {
    const modalContent = renderAlertsModalContent(alerts);
    const sheetId = "sheet-health-alerts";
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

    // Track conditions across hours to create consolidated alerts
    const conditions = {
      wind: { severe: [], moderate: [] },
      heat: { severe: [], moderate: [] },
      cold: { severe: [], moderate: [] },
      rain: { severe: [], moderate: [] },
      storm: { severe: [] },
    };

    hours.forEach((iso, idx) => {
      const temp = grab(hourly.temperature_2m, idx);
      const feels = grab(hourly.apparent_temperature, idx);
      const prob = grab(hourly.precipitation_probability, idx, 0);
      const rain = grab(hourly.precipitation, idx, 0);
      const wind = grab(hourly.windspeed_10m, idx, 0);
      const code = grab(hourly.weathercode, idx);

      // Collect wind data
      if (wind >= 75) {
        conditions.wind.severe.push({ time: iso, value: wind });
      } else if (wind >= 50) {
        conditions.wind.moderate.push({ time: iso, value: wind });
      }

      // Collect heat data
      if (temp >= 35) {
        conditions.heat.severe.push({ time: iso, value: temp });
      } else if (temp >= 30) {
        conditions.heat.moderate.push({ time: iso, value: temp });
      }

      // Collect cold data
      if (feels <= -15) {
        conditions.cold.severe.push({ time: iso, value: feels });
      } else if (feels <= -5) {
        conditions.cold.moderate.push({ time: iso, value: feels });
      }

      // Collect rain data
      if (rain >= 10 && prob >= 70) {
        conditions.rain.severe.push({ time: iso, value: rain, prob });
      } else if (rain >= 3 && prob >= 50) {
        conditions.rain.moderate.push({ time: iso, value: rain, prob });
      }

      // Thunderstorms
      if ([95, 96, 99].includes(code)) {
        conditions.storm.severe.push({ time: iso, code });
      }
    });

    // Create consolidated alerts from collected conditions

    // Wind alerts
    if (conditions.wind.severe.length > 0) {
      const maxWind = Math.max(...conditions.wind.severe.map((w) => w.value));
      alerts.push({
        id: "wind-severe",
        type: "wind",
        severity: "red",
        title: "Sturmwarnung",
        description: `Windspitzen bis ${maxWind.toFixed(
          0
        )} km/h erwartet. Outdoor-Aktivitäten gefährlich.`,
        time: conditions.wind.severe[0].time,
        count: conditions.wind.severe.length,
      });
    } else if (conditions.wind.moderate.length > 0) {
      const maxWind = Math.max(...conditions.wind.moderate.map((w) => w.value));
      alerts.push({
        id: "wind-moderate",
        type: "wind",
        severity: "orange",
        title: "Starker Wind",
        description: `Böen bis ${maxWind.toFixed(0)} km/h möglich.`,
        time: conditions.wind.moderate[0].time,
        count: conditions.wind.moderate.length,
      });
    }

    // Heat alerts
    if (conditions.heat.severe.length > 0) {
      const maxTemp = Math.max(...conditions.heat.severe.map((h) => h.value));
      alerts.push({
        id: "heat-severe",
        type: "heat",
        severity: "red",
        title: "Hitzewarnung",
        description: `Bis zu ${maxTemp.toFixed(
          0
        )}°C erwartet. Hitzeschutz dringend empfohlen!`,
        time: conditions.heat.severe[0].time,
        count: conditions.heat.severe.length,
      });
    } else if (conditions.heat.moderate.length > 0) {
      const maxTemp = Math.max(...conditions.heat.moderate.map((h) => h.value));
      alerts.push({
        id: "heat-moderate",
        type: "heat",
        severity: "orange",
        title: "Hohe Temperaturen",
        description: `Temperaturen um ${maxTemp.toFixed(
          0
        )}°C. Ausreichend trinken!`,
        time: conditions.heat.moderate[0].time,
        count: conditions.heat.moderate.length,
      });
    }

    // Cold alerts
    if (conditions.cold.severe.length > 0) {
      const minTemp = Math.min(...conditions.cold.severe.map((c) => c.value));
      alerts.push({
        id: "cold-severe",
        type: "cold",
        severity: "red",
        title: "Extreme Kälte",
        description: `Gefühlte Temperatur bis ${minTemp.toFixed(
          0
        )}°C. Erfrierungsgefahr!`,
        time: conditions.cold.severe[0].time,
        count: conditions.cold.severe.length,
      });
    } else if (conditions.cold.moderate.length > 0) {
      const minTemp = Math.min(...conditions.cold.moderate.map((c) => c.value));
      alerts.push({
        id: "cold-moderate",
        type: "cold",
        severity: "orange",
        title: "Frost",
        description: `Gefühlte Temperatur um ${minTemp.toFixed(0)}°C.`,
        time: conditions.cold.moderate[0].time,
        count: conditions.cold.moderate.length,
      });
    }

    // Rain alerts
    if (conditions.rain.severe.length > 0) {
      const totalRain = conditions.rain.severe.reduce(
        (sum, r) => sum + r.value,
        0
      );
      alerts.push({
        id: "rain-severe",
        type: "rain",
        severity: "orange",
        title: "Starkregen",
        description: `Bis zu ${totalRain.toFixed(0)} mm Niederschlag in ${
          conditions.rain.severe.length
        }h.`,
        time: conditions.rain.severe[0].time,
        count: conditions.rain.severe.length,
      });
    } else if (conditions.rain.moderate.length > 0) {
      const avgProb = Math.round(
        conditions.rain.moderate.reduce((sum, r) => sum + r.prob, 0) /
          conditions.rain.moderate.length
      );
      alerts.push({
        id: "rain-moderate",
        type: "rain",
        severity: "yellow",
        title: "Regen erwartet",
        description: `Regenschauer mit ${avgProb}% Wahrscheinlichkeit.`,
        time: conditions.rain.moderate[0].time,
        count: conditions.rain.moderate.length,
      });
    }

    // Thunderstorm alerts
    if (conditions.storm.severe.length > 0) {
      alerts.push({
        id: "storm-severe",
        type: "storm",
        severity: "red",
        title: "Gewitterwarnung",
        description: "Gewitter mit Hagel oder Starkregen möglich.",
        time: conditions.storm.severe[0].time,
        count: conditions.storm.severe.length,
      });
    }

    // Sort by severity
    const severityOrder = { red: 0, orange: 1, yellow: 2 };
    alerts.sort(
      (a, b) =>
        (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
    );

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
