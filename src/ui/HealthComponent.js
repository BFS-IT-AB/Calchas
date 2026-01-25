/**
 * HealthComponent.js - High-End UI Component for Health Intelligence
 * Renders the health section with glassmorphism design, dynamic grids,
 * and smooth micro-interactions using IntersectionObserver.
 * @module ui/HealthComponent
 */

(function (global) {
  "use strict";

  /**
   * HealthComponent Class
   * Pure DOM rendering with template literals
   */
  class HealthComponent {
    constructor(options = {}) {
      this.container = options.container || null;
      this.language = options.language || "de";
      this.engine =
        options.engine ||
        (global.HealthEngine
          ? new global.HealthEngine({ language: this.language })
          : null);
      this.observer = null;
      this.animatedElements = new Set();

      // i18n
      this.strings = {
        de: {
          outdoorQuality: "Outdoor-Qualität",
          bestTimeSlot: "Bestes Zeitfenster",
          quickCheck: "Schnell-Check",
          whatYouNeedToKnow: "Was du heute wissen musst",
          safetyAlerts: "Sicherheitshinweise",
          bioInsights: "Bio-Indikatoren",
          headacheRisk: "Kopfschmerz-Risiko",
          vitaminDTimer: "Vitamin-D Timer",
          pressureChange: "Druckänderung",
          noAlerts: "Keine Warnungen aktiv",
          allClear: "Alles im grünen Bereich",
          lastUpdated: "Zuletzt aktualisiert",
          offline: "Offline-Daten",
          nextHours: "Nächste 24 Stunden",
          score: "Score",
          now: "Jetzt",
        },
        en: {
          outdoorQuality: "Outdoor Quality",
          bestTimeSlot: "Best Time Slot",
          quickCheck: "Quick Check",
          whatYouNeedToKnow: "What you need to know today",
          safetyAlerts: "Safety Alerts",
          bioInsights: "Bio Indicators",
          headacheRisk: "Headache Risk",
          vitaminDTimer: "Vitamin D Timer",
          pressureChange: "Pressure Change",
          noAlerts: "No warnings active",
          allClear: "All clear",
          lastUpdated: "Last updated",
          offline: "Offline data",
          nextHours: "Next 24 hours",
          score: "Score",
          now: "Now",
        },
      };
    }

    /**
     * Get localized string
     */
    t(key) {
      return this.strings[this.language]?.[key] || this.strings.de[key] || key;
    }

    /**
     * Get color hex for a numeric score value
     */
    getScoreColor(score) {
      if (score >= 80) return "#4ade80";
      if (score >= 60) return "#a3e635";
      if (score >= 40) return "#fbbf24";
      if (score >= 20) return "#fb923c";
      return "#ef4444";
    }

    /**
     * Get CSS class for a numeric score value
     */
    getScoreColorClass(score) {
      if (score >= 80) return "color--green";
      if (score >= 60) return "color--lime";
      if (score >= 40) return "color--amber";
      if (score >= 20) return "color--orange";
      return "color--red";
    }

    /**
     * Map hex color to CSS class name
     */
    getColorClass(color) {
      const colorMap = {
        "#4ade80": "color--green",
        "#a3e635": "color--lime",
        "#fbbf24": "color--amber",
        "#fb923c": "color--orange",
        "#ef4444": "color--red",
        "#3b82f6": "color--blue",
      };
      // Find matching color or default
      const lowerColor = (color || "").toLowerCase();
      for (const [hex, className] of Object.entries(colorMap)) {
        if (lowerColor === hex || lowerColor.includes(hex.slice(1))) {
          return className;
        }
      }
      // Check for color names
      if (lowerColor.includes("green") || lowerColor.includes("4ade80"))
        return "color--green";
      if (lowerColor.includes("lime") || lowerColor.includes("a3e6"))
        return "color--lime";
      if (lowerColor.includes("amber") || lowerColor.includes("fbbf"))
        return "color--amber";
      if (lowerColor.includes("orange") || lowerColor.includes("fb92"))
        return "color--orange";
      if (lowerColor.includes("red") || lowerColor.includes("ef44"))
        return "color--red";
      return "color--green";
    }

    /**     * Initialize IntersectionObserver for scroll animations
     */
    initScrollAnimations() {
      if (this.observer) {
        this.observer.disconnect();
      }

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (
              entry.isIntersecting &&
              !this.animatedElements.has(entry.target)
            ) {
              entry.target.classList.add("health-card--visible");
              this.animatedElements.add(entry.target);
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: "0px 0px -50px 0px",
        },
      );

      // Observe all cards
      const cards = document.querySelectorAll(".health-card");
      cards.forEach((card) => this.observer.observe(card));
    }

    /**
     * Render the complete health section
     * @param {object} analysisResult - Result from HealthEngine.analyze()
     * @param {object} options - Render options
     * @returns {string} HTML string
     */
    render(analysisResult, options = {}) {
      if (!analysisResult) {
        return this.renderEmpty();
      }

      const {
        outdoorScore,
        bestTimeWindow,
        quickChecks,
        safetyAlerts,
        headacheRisk,
        vitaminDTimer,
        timeline,
        lastUpdated,
        isOffline,
        officialAlerts,
      } = analysisResult;

      const html = `
        <div class="health-section" data-health-component>
          ${this.renderPriorityAlertBanner(officialAlerts)}
          ${this.renderOutdoorQualityCard(outdoorScore, timeline, bestTimeWindow)}
          ${this.renderQuickCheckGrid(quickChecks)}
          ${this.renderBioInsights(headacheRisk, vitaminDTimer)}
          ${this.renderSafetyAlerts(safetyAlerts)}
          ${this.renderLastUpdated(lastUpdated, isOffline)}
          <div class="health-spacer" style="height: 120px; flex-shrink: 0; width: 100%;"></div>
        </div>
      `;

      // Schedule animation initialization
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => this.initScrollAnimations());
      }

      return html;
    }

    /**
     * Render Priority Alert Banner for official weather warnings (CAP)
     */
    renderPriorityAlertBanner(officialAlerts) {
      if (!officialAlerts || officialAlerts.length === 0) {
        return "";
      }

      // Get the most severe alert
      const severityOrder = { extreme: 4, severe: 3, moderate: 2, minor: 1 };
      const sortedAlerts = [...officialAlerts].sort(
        (a, b) =>
          (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0),
      );
      const primaryAlert = sortedAlerts[0];

      const severityColors = {
        extreme: "#dc2626",
        severe: "#ea580c",
        moderate: "#d97706",
        minor: "#ca8a04",
      };

      const color = severityColors[primaryAlert.severity] || "#ef4444";
      const icon =
        primaryAlert.event?.includes("Sturm") ||
        primaryAlert.event?.includes("Wind")
          ? "🌪️"
          : primaryAlert.event?.includes("Gewitter")
            ? "⛈️"
            : primaryAlert.event?.includes("Regen") ||
                primaryAlert.event?.includes("Überschwemmung")
              ? "🌊"
              : primaryAlert.event?.includes("Schnee") ||
                  primaryAlert.event?.includes("Eis")
                ? "❄️"
                : primaryAlert.event?.includes("Hitze")
                  ? "🔥"
                  : "⚠️";

      return `
        <div class="priority-alert-banner js-open-details"
             data-detail-type="official-alerts"
             style="--alert-color: ${color}">
          <div class="priority-alert-banner__pulse"></div>
          <div class="priority-alert-banner__content">
            <span class="priority-alert-banner__icon">${icon}</span>
            <div class="priority-alert-banner__text">
              <span class="priority-alert-banner__title">${primaryAlert.event || (this.language === "de" ? "Wetterwarnung" : "Weather Warning")}</span>
              <span class="priority-alert-banner__subtitle">${primaryAlert.headline || primaryAlert.description || ""}</span>
            </div>
            <span class="priority-alert-banner__arrow">›</span>
          </div>
          ${officialAlerts.length > 1 ? `<span class="priority-alert-banner__badge">+${officialAlerts.length - 1}</span>` : ""}
        </div>
      `;
    }

    /**
     * Render empty state
     */
    renderEmpty() {
      return `
        <div class="health-section health-section--empty">
          <div class="health-empty-state">
            <span class="health-empty-icon">📊</span>
            <p>${this.language === "de" ? "Lade Gesundheitsdaten..." : "Loading health data..."}</p>
          </div>
        </div>
      `;
    }

    /**
     * Render the main Outdoor Quality card with interactive timeline
     */
    renderOutdoorQualityCard(score, timeline, bestTimeWindow) {
      const { score: scoreValue, label, color, capped, cappedBy } = score;

      // Build interactive timeline chart
      const timelineHtml = this.renderInteractiveTimeline(
        timeline,
        bestTimeWindow,
      );

      // Score reasoning/explanation
      const reasoningHtml = this.renderScoreReasoning(score);

      // Capped indicator with explanation
      const cappedIndicator = capped
        ? `<div class="outdoor-card__capped">
            <span class="capped-icon">⚠️</span>
            <span class="capped-text">${this.language === "de" ? "Limitiert durch" : "Limited by"}: ${
              cappedBy === "precipitation"
                ? this.language === "de"
                  ? "🌧️ Hohe Regenwahrscheinlichkeit"
                  : "🌧️ High rain probability"
                : this.language === "de"
                  ? "💨 Starker Wind"
                  : "💨 Strong wind"
            }</span>
          </div>`
        : "";

      return `
        <section class="health-card health-card--outdoor outdoor-quality-card js-open-details" data-detail-type="outdoor">
          <div class="health-card__header">
            <div class="health-card__title-group">
              <span class="health-card__icon">🌿</span>
              <h3 class="health-card__title">${this.t("outdoorQuality")}</h3>
            </div>
            <span class="health-card__subtitle">${this.t("nextHours")}</span>
          </div>

          <div class="outdoor-card__content">
            <div class="outdoor-card__score-header">
              <div class="outdoor-card__score-display">
                <div class="score-circle" style="--score-color: ${color}">
                  <svg class="score-circle__svg" viewBox="0 0 100 100">
                    <circle class="score-circle__bg" cx="50" cy="50" r="45" />
                    <circle class="score-circle__progress" cx="50" cy="50" r="45"
                      stroke-dasharray="${scoreValue * 2.83}, 283" />
                    <text class="score-circle__text" x="50" y="45" dominant-baseline="middle" text-anchor="middle">${scoreValue}</text>
                    <text class="score-circle__label-text" x="50" y="62" dominant-baseline="middle" text-anchor="middle">${label}</text>
                  </svg>
                </div>
              </div>
              <div class="outdoor-card__info-badges">
                ${cappedIndicator}
                ${reasoningHtml}
              </div>
            </div>

            <div class="outdoor-card__timeline-wrapper">
              ${timelineHtml}
            </div>
          </div>
        </section>
      `;
    }

    /**
     * Render score reasoning based on top factors
     */
    renderScoreReasoning(score) {
      if (!score.factors) return "";

      // Find the most impactful factors (lowest scores)
      const sortedFactors = Object.entries(score.factors)
        .sort((a, b) => a[1].score - b[1].score)
        .slice(0, 2);

      const factorLabels = {
        temperature: { de: "Temperatur", en: "Temperature" },
        precipitation: { de: "Niederschlag", en: "Precipitation" },
        wind: { de: "Wind", en: "Wind" },
        humidity: { de: "Luftfeuchtigkeit", en: "Humidity" },
        uv: { de: "UV-Strahlung", en: "UV" },
        airQuality: { de: "Luftqualität", en: "Air Quality" },
      };

      let reasonText = "";
      if (score.score >= 70) {
        const goodFactors = sortedFactors.filter(
          ([_, data]) => data.score >= 70,
        );
        if (goodFactors.length > 0) {
          const factorName =
            factorLabels[goodFactors[0][0]]?.[this.language] ||
            goodFactors[0][0];
          reasonText =
            this.language === "de"
              ? `Gut, da ${factorName.toLowerCase()} optimal`
              : `Good, optimal ${factorName.toLowerCase()}`;
        }
      } else if (score.score < 40) {
        const badFactor = sortedFactors[0];
        if (badFactor) {
          const factorName =
            factorLabels[badFactor[0]]?.[this.language] || badFactor[0];
          reasonText =
            this.language === "de"
              ? `Eingeschränkt durch ${factorName.toLowerCase()}`
              : `Limited by ${factorName.toLowerCase()}`;
        }
      }

      if (!reasonText) return "";

      return `<div class="outdoor-card__reasoning">${reasonText}</div>`;
    }

    /**
     * Render interactive horizontal scroll timeline with best window highlight
     */
    renderInteractiveTimeline(timeline, bestTimeWindow) {
      if (!timeline || timeline.length === 0) {
        return '<div class="timeline-empty">–</div>';
      }

      // DEBUG: Log timeline data to verify scores are coming through
      console.log(
        "[HealthComponent] Timeline Data:",
        timeline.slice(0, 5).map((h) => ({
          time: h.time,
          score: h.score,
          color: this.getScoreColor(h.score),
          colorClass: this.getScoreColorClass(h.score),
        })),
      );

      // Determine best window indices
      let bestStartIdx = -1;
      let bestEndIdx = -1;
      if (bestTimeWindow) {
        const startHour = parseInt(
          bestTimeWindow.start?.split(":")[0] ||
            bestTimeWindow.displayText?.split(" - ")[0]?.split(":")[0] ||
            -1,
        );
        const endHour = parseInt(
          bestTimeWindow.end?.split(":")[0] ||
            bestTimeWindow.displayText?.split(" - ")[1]?.split(":")[0] ||
            -1,
        );

        timeline.forEach((hour, idx) => {
          const hourNum = parseInt(this.formatTimeLabel(hour.time));
          if (hourNum === startHour && bestStartIdx === -1) bestStartIdx = idx;
          if (hourNum === endHour) bestEndIdx = idx;
        });
      }

      // Generate all 24 hours with scroll capability
      const bars = timeline
        .slice(0, 24)
        .map((hour, index) => {
          const timeLabel = this.formatTimeLabel(hour.time);
          const heightPercent = Math.max(8, hour.score);
          const isNow = index === 0;
          const isBestWindow =
            bestStartIdx !== -1 && index >= bestStartIdx && index <= bestEndIdx;

          // Use score-based color calculation for accurate representation
          const slotColor = this.getScoreColor(hour.score);
          const colorClass = this.getScoreColorClass(hour.score);

          // FORCE the color directly via inline style on the fill element
          return `
          <div class="timeline-slot ${isBestWindow ? "timeline-slot--best" : ""} ${isNow ? "timeline-slot--now" : ""}"
               data-hour="${timeLabel}"
               data-score="${hour.score}"
               data-detail-type="timeline-hour"
               data-hour-index="${index}"
               style="--slot-color: ${slotColor}; --slot-height: ${heightPercent}%">
            <div class="timeline-slot__bar">
              <div class="timeline-slot__fill" style="background: ${slotColor} !important; height: ${heightPercent}%"></div>
              <span class="timeline-slot__score" style="color: ${slotColor}">${hour.score}</span>
            </div>
            <span class="timeline-slot__time" ${isNow ? `style="color: ${slotColor}"` : ""}>${isNow ? this.t("now") : timeLabel}</span>
            ${isBestWindow && index === bestStartIdx ? `<span class="timeline-slot__badge">${this.language === "de" ? "Empfohlen" : "Recommended"}</span>` : ""}
          </div>
        `;
        })
        .join("");

      // Best time indicator
      const bestTimeIndicator = bestTimeWindow
        ? `
        <div class="timeline-best-indicator" style="--best-color: ${bestTimeWindow.color}">
          <span class="timeline-best-indicator__icon">⭐</span>
          <span class="timeline-best-indicator__text">${this.t("bestTimeSlot")}: ${bestTimeWindow.displayText}</span>
          <span class="timeline-best-indicator__score">${bestTimeWindow.avgScore}</span>
        </div>
      `
        : "";

      return `
        <div class="timeline-interactive" role="region" aria-label="${this.language === "de" ? "24-Stunden Vorhersage" : "24-hour forecast"}">
          ${bestTimeIndicator}
          <div class="timeline-scroll-container">
            <div class="timeline-slots">
              ${bars}
            </div>
          </div>
          <div class="timeline-scroll-hint">
            <span class="timeline-scroll-hint__arrow">←</span>
            <span>${this.language === "de" ? "Wischen für mehr" : "Swipe for more"}</span>
            <span class="timeline-scroll-hint__arrow">→</span>
          </div>
        </div>
      `;
    }

    /**
     * Render timeline chart as horizontal CSS grid (legacy, kept for compatibility)
     */
    renderTimelineChart(timeline) {
      if (!timeline || timeline.length === 0) {
        return '<div class="timeline-empty">–</div>';
      }

      // Take every 2nd hour for a cleaner display (12 bars for 24h)
      const displayData = timeline.filter((_, i) => i % 2 === 0).slice(0, 12);

      const bars = displayData
        .map((hour, index) => {
          const timeLabel = this.formatTimeLabel(hour.time);
          const heightPercent = Math.max(5, hour.score);
          const isNow = index === 0;

          return `
          <div class="timeline-bar" style="--bar-height: ${heightPercent}%; --bar-color: ${hour.color}">
            <div class="timeline-bar__fill"></div>
            <span class="timeline-bar__label">${isNow ? this.t("now") : timeLabel}</span>
          </div>
        `;
        })
        .join("");

      return `
        <div class="timeline-chart">
          ${bars}
        </div>
      `;
    }

    /**
     * Format time label
     */
    formatTimeLabel(timeInput) {
      if (!timeInput) return "";

      if (/^\d{1,2}:\d{2}$/.test(timeInput)) {
        return timeInput.split(":")[0];
      }

      try {
        const date = new Date(timeInput);
        if (!isNaN(date.getTime())) {
          return date.getHours().toString().padStart(2, "0");
        }
      } catch (e) {
        // Fallback
      }

      const match = String(timeInput).match(/(\d{1,2}):/);
      return match ? match[1] : "";
    }

    /**
     * Render Quick Check grid with dynamic prioritization
     */
    renderQuickCheckGrid(quickChecks) {
      if (!quickChecks || quickChecks.length === 0) {
        return "";
      }

      // Take top 4-6 checks based on priority (already sorted)
      const displayChecks = quickChecks.slice(0, 6);

      const checkItems = displayChecks
        .map((check) => {
          const colorClass = this.getColorClass(check.color);
          return `
        <div class="quick-check-card health-card js-open-details" data-check-type="${check.type}" data-detail-type="${check.type}">
          <div class="quick-check-card__icon ${colorClass}">
            ${check.icon}
          </div>
          <div class="quick-check-card__content">
            <span class="quick-check-card__question">${check.question}</span>
            <span class="quick-check-card__answer ${colorClass}">${check.answer}</span>
            <span class="quick-check-card__detail">${check.detail}</span>
          </div>
        </div>
      `;
        })
        .join("");

      return `
        <section class="health-section__quick-checks">
          <div class="health-section__header">
            <span class="health-section__icon">✅</span>
            <div class="health-section__title-group">
              <h3 class="health-section__title">${this.t("quickCheck")}</h3>
              <span class="health-section__subtitle">${this.t("whatYouNeedToKnow")}</span>
            </div>
          </div>
          <div class="quick-check-grid">
            ${checkItems}
          </div>
        </section>
      `;
    }

    /**
     * Render Bio Insights section (headache risk, vitamin D)
     */
    renderBioInsights(headacheRisk, vitaminDTimer) {
      const cards = [];

      // Headache Risk Card
      if (headacheRisk) {
        const riskLevel = headacheRisk.level || 0;
        const riskDots = Array(4)
          .fill(0)
          .map(
            (_, i) =>
              `<span class="risk-dot ${i < riskLevel ? "risk-dot--active" : ""}" style="--dot-color: ${headacheRisk.color}"></span>`,
          )
          .join("");

        cards.push(`
          <div class="bio-card health-card">
            <div class="bio-card__header">
              <span class="bio-card__icon">🧠</span>
              <span class="bio-card__title">${this.t("headacheRisk")}</span>
            </div>
            <div class="bio-card__content">
              <div class="bio-card__risk-indicator">
                ${riskDots}
              </div>
              <span class="bio-card__value" style="color: ${headacheRisk.color}">
                ${headacheRisk.advice}
              </span>
              <span class="bio-card__detail">
                ${this.t("pressureChange")}: ${headacheRisk.change > 0 ? "+" : ""}${headacheRisk.change} hPa
              </span>
            </div>
          </div>
        `);
      }

      // Vitamin D Timer Card
      if (vitaminDTimer) {
        const uvInfo = vitaminDTimer.uvLevel || {};

        cards.push(`
          <div class="bio-card health-card">
            <div class="bio-card__header">
              <span class="bio-card__icon">☀️</span>
              <span class="bio-card__title">${this.t("vitaminDTimer")}</span>
            </div>
            <div class="bio-card__content">
              ${
                vitaminDTimer.available
                  ? `
                  <div class="vitamin-d-timer">
                    <span class="vitamin-d-timer__value">${vitaminDTimer.minutes}</span>
                    <span class="vitamin-d-timer__unit">min</span>
                  </div>
                  <span class="bio-card__detail">${vitaminDTimer.sunburnAdvice}</span>
                `
                  : `
                  <span class="bio-card__value bio-card__value--muted">
                    ${vitaminDTimer.advice}
                  </span>
                `
              }
            </div>
          </div>
        `);
      }

      if (cards.length === 0) {
        return "";
      }

      return `
        <section class="health-section__bio-insights">
          <div class="health-section__header">
            <span class="health-section__icon">🔬</span>
            <div class="health-section__title-group">
              <h3 class="health-section__title">${this.t("bioInsights")}</h3>
            </div>
          </div>
          <div class="bio-insights-grid">
            ${cards.join("")}
          </div>
        </section>
      `;
    }

    /**
     * Render Safety Alerts section
     */
    renderSafetyAlerts(alerts) {
      if (!alerts || alerts.length === 0) {
        return `
          <section class="health-section__safety health-card health-card--success">
            <div class="safety-clear">
              <span class="safety-clear__icon">✅</span>
              <div class="safety-clear__text">
                <strong>${this.t("allClear")}</strong>
                <span>${this.t("noAlerts")}</span>
              </div>
            </div>
          </section>
        `;
      }

      const alertItems = alerts
        .slice(0, 3)
        .map((alert) => {
          const severityClass = `safety-alert--${alert.severity}`;

          return `
          <div class="safety-alert health-card ${severityClass}" style="--alert-color: ${alert.color}">
            <div class="safety-alert__header">
              <span class="safety-alert__icon">${alert.icon}</span>
              <span class="safety-alert__title">${alert.title}</span>
            </div>
            <p class="safety-alert__message">${alert.message}</p>
          </div>
        `;
        })
        .join("");

      return `
        <section class="health-section__safety">
          <div class="health-section__header">
            <span class="health-section__icon">⚠️</span>
            <div class="health-section__title-group">
              <h3 class="health-section__title">${this.t("safetyAlerts")}</h3>
            </div>
          </div>
          <div class="safety-alerts-list">
            ${alertItems}
          </div>
        </section>
      `;
    }

    /**
     * Render last updated timestamp with offline indicator
     */
    renderLastUpdated(timestamp, isOffline = false) {
      if (!timestamp) return "";

      let formattedTime;
      try {
        const date = new Date(timestamp);
        formattedTime = date.toLocaleTimeString(
          this.language === "de" ? "de-DE" : "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        );
      } catch (e) {
        formattedTime = timestamp;
      }

      return `
        <div class="health-section__footer">
          ${isOffline ? `<span class="offline-badge">📴 ${this.t("offline")}</span>` : ""}
          <span class="last-updated">
            ${this.t("lastUpdated")}: ${formattedTime}
          </span>
        </div>
      `;
    }

    /**
     * Mount component to container
     */
    mount(container, analysisResult) {
      const targetContainer = container || this.container;
      if (!targetContainer) {
        console.warn("HealthComponent: No container provided");
        return;
      }

      const html = this.render(analysisResult);

      if (typeof targetContainer === "string") {
        const el = document.querySelector(targetContainer);
        if (el) {
          el.innerHTML = html;
          this.initEventDelegation(el);
        }
      } else {
        targetContainer.innerHTML = html;
        this.initEventDelegation(targetContainer);
      }
    }

    /**
     * Initialize event delegation for modal triggers
     * Uses a single listener on the container for all interactive elements
     */
    initEventDelegation(container) {
      // Ensure modal container exists at body end
      this.ensureModalContainer();

      // Find the health-section element
      const healthSection =
        container.querySelector(".health-section") || container;

      // Remove existing listener if any (prevents duplicates)
      if (healthSection._healthClickHandler) {
        healthSection.removeEventListener(
          "click",
          healthSection._healthClickHandler,
        );
        healthSection.removeEventListener(
          "touchend",
          healthSection._healthClickHandler,
        );
      }

      // Store reference for this context
      const self = this;

      // Create and attach delegated click handler
      healthSection._healthClickHandler = (event) => {
        // Prevent double-firing on touch devices
        if (event.type === "touchend") {
          event.preventDefault();
        }

        // Find closest interactive element - expanded selector for better hit area
        const trigger = event.target.closest(
          ".js-open-details, [data-detail-type], [data-clickable-alerts], " +
            ".health-card--outdoor, .quick-check-card, .bio-card, .safety-alert, " +
            ".outdoor-quality-card, .timeline-slot",
        );

        if (!trigger) return;

        // Determine the detail type with fallback detection
        let detailType =
          trigger.dataset.detailType || trigger.dataset.checkType;

        // Fallback detection based on element class
        if (!detailType) {
          if (
            trigger.classList.contains("health-card--outdoor") ||
            trigger.classList.contains("outdoor-quality-card")
          ) {
            detailType = "outdoor";
          } else if (trigger.classList.contains("bio-card")) {
            const title =
              trigger.querySelector(".bio-card__title")?.textContent || "";
            detailType = title.includes("Kopfschmerz")
              ? "headache"
              : title.includes("Vitamin")
                ? "vitaminD"
                : "bio";
          } else if (
            trigger.classList.contains("safety-alert") ||
            trigger.hasAttribute("data-clickable-alerts")
          ) {
            detailType = "alerts";
          } else if (trigger.classList.contains("timeline-slot")) {
            detailType = "timeline-hour";
          }
        }

        if (!detailType) return;

        // DEBUG: Log triggered modal
        console.log("[HealthComponent] Modal Triggered:", detailType, trigger);

        // Dispatch custom event for logging/analytics
        const customEvent = new CustomEvent("health:modal:open", {
          bubbles: true,
          detail: { type: detailType, trigger, timestamp: Date.now() },
        });
        healthSection.dispatchEvent(customEvent);

        // Open the modal
        self.openDetailModal(detailType);
      };

      // Attach for both click and touch
      healthSection.addEventListener(
        "click",
        healthSection._healthClickHandler,
      );
      healthSection.addEventListener(
        "touchend",
        healthSection._healthClickHandler,
        { passive: false },
      );

      console.log(
        "[HealthComponent] Event delegation initialized on:",
        healthSection,
      );
    }

    /**
     * Ensure modal container exists at body end for proper z-index stacking
     */
    ensureModalContainer() {
      if (!document.getElementById("health-modal-container")) {
        const container = document.createElement("div");
        container.id = "health-modal-container";
        container.setAttribute("aria-live", "polite");
        document.body.appendChild(container);
      }
    }

    /**
     * Open detail modal for a specific type
     * @param {string} detailType - Type of detail to show (outdoor, umbrella, uv, jacket, etc.)
     */
    openDetailModal(detailType) {
      // Use global HealthSafetyView modal system if available
      if (
        typeof HealthSafetyView !== "undefined" &&
        HealthSafetyView.openHealthModal
      ) {
        const appState =
          HealthSafetyView._lastAppState || window._healthAppState || {};
        const analysis = HealthSafetyView.getCurrentAnalysis?.() || {};
        HealthSafetyView.openHealthModal(detailType, appState, analysis);
        return;
      }

      // Fallback: create simple modal
      this.showFallbackModal(detailType);
    }

    /**
     * Show fallback modal when HealthSafetyView is not available
     */
    showFallbackModal(detailType) {
      // Remove existing modal
      const existing = document.querySelector(".health-modal-overlay");
      if (existing) existing.remove();

      const titles = {
        outdoor: "Outdoor-Qualität Details",
        umbrella: "Regenschirm-Empfehlung",
        uv: "UV-Index Details",
        jacket: "Jacken-Empfehlung",
        sleep: "Schlafqualität Details",
        headache: "Kopfschmerz-Risiko Details",
        vitaminD: "Vitamin D Timer Details",
        alerts: "Wetter-Warnungen",
        bio: "Bio-Indikatoren Details",
        "timeline-hour": "Stunden-Details",
      };

      const icons = {
        outdoor: "🌿",
        umbrella: "☔",
        uv: "☀️",
        jacket: "🧥",
        sleep: "😴",
        headache: "🧠",
        vitaminD: "🌞",
        alerts: "⚠️",
        bio: "🔬",
        "timeline-hour": "🕐",
      };

      const overlay = document.createElement("div");
      overlay.className = "health-modal-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML = `
        <div class="health-modal-sheet">
          <header class="bottom-sheet__header">
            <span class="bottom-sheet__icon">${icons[detailType] || "ℹ️"}</span>
            <h2 class="bottom-sheet__title">${titles[detailType] || "Details"}</h2>
            <button class="bottom-sheet__close" type="button" data-close-sheet aria-label="Schließen">
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>
          <div class="bottom-sheet__body">
            <div class="modal-spinner">
              <div class="modal-spinner__circle"></div>
              <span class="modal-spinner__text">Analyse läuft...</span>
            </div>
          </div>
        </div>
      `;

      // Close on overlay click, close button, or Escape key
      const closeModal = () => {
        overlay.classList.remove("health-modal-overlay--visible");
        setTimeout(() => overlay.remove(), 300);
        document.removeEventListener("keydown", handleEscape);
      };

      const handleEscape = (e) => {
        if (e.key === "Escape") closeModal();
      };

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay || e.target.closest("[data-close-sheet]")) {
          closeModal();
        }
      });

      document.addEventListener("keydown", handleEscape);

      // Append to dedicated modal container or body
      const modalContainer =
        document.getElementById("health-modal-container") || document.body;
      modalContainer.appendChild(overlay);

      // Animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.classList.add("health-modal-overlay--visible");
        });
      });

      console.log("[HealthComponent] Modal opened:", detailType);
    }

    /**
     * Update component with new data
     */
    update(analysisResult) {
      this.mount(this.container, analysisResult);
    }

    /**
     * Cleanup
     */
    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.animatedElements.clear();

      // Remove event delegation listener
      const healthSection = this.container?.querySelector(".health-section");
      if (healthSection?._healthClickHandler) {
        healthSection.removeEventListener(
          "click",
          healthSection._healthClickHandler,
        );
      }
    }
  }

  // Export
  global.HealthComponent = HealthComponent;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = HealthComponent;
  }
})(typeof window !== "undefined" ? window : global);
