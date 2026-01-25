/**
 * HealthEngine.js - Proactive Health Intelligence Engine
 * Calculates weighted multi-factor scores, detects optimal time windows,
 * and generates bio-alerts for human comfort predictions.
 * @module logic/HealthEngine
 */

(function (global) {
  "use strict";

  // Get WeatherMath utilities
  const WeatherMath =
    global.WeatherMath ||
    (typeof require !== "undefined" ? require("../utils/WeatherMath") : null);

  /**
   * HealthEngine Class
   * The mathematical "truth" for health & comfort calculations
   */
  class HealthEngine {
    constructor(options = {}) {
      this.language = options.language || "de";
      this.skinType = options.skinType || 2;
      this.sensitiveToMigraine = options.sensitiveToMigraine || false;

      // Weight configuration for score calculation
      this.weights = {
        temperature: 0.25,
        precipitation: 0.2,
        wind: 0.15,
        humidity: 0.1,
        uv: 0.1,
        airQuality: 0.1,
        visibility: 0.05,
        pollen: 0.05,
      };

      // Critical thresholds that cap the score
      this.criticalThresholds = {
        precipProb: 40, // Rain probability %
        windSpeed: 40, // km/h
        maxScoreOnCritical: 30,
      };

      // i18n strings
      this.strings = {
        de: {
          excellent: "Ausgezeichnet",
          good: "Gut",
          moderate: "Mäßig",
          poor: "Schlecht",
          critical: "Kritisch",
          bestTimeWindow: "Bestes Zeitfenster",
          outdoorQuality: "Outdoor-Qualität",
          sunProtection: "Sonnenschutz",
          sleepQuality: "Schlafqualität",
          headacheRisk: "Kopfschmerz-Risiko",
          vitaminD: "Vitamin-D Timer",
          umbrella: "Regenschirm",
          jacket: "Jacke",
          noProtectionNeeded: "Kein Schutz nötig",
          recommended: "Empfohlen",
          required: "Erforderlich",
          minutesUntilSunburn: "Min. bis Sonnenbrand",
          minutesForVitaminD: "Min. für Vitamin D",
          pressureStable: "Druck stabil",
          pressureRising: "Druck steigt",
          pressureFalling: "Druck fällt",
          lowRisk: "Niedriges Risiko",
          moderateRisk: "Mittleres Risiko",
          highRisk: "Hohes Risiko",
          idealConditions: "Ideale Bedingungen",
          stayHydrated: "Viel trinken",
          seekShade: "Schatten suchen",
          avoidOutdoor: "Outdoor meiden",
        },
        en: {
          excellent: "Excellent",
          good: "Good",
          moderate: "Moderate",
          poor: "Poor",
          critical: "Critical",
          bestTimeWindow: "Best Time Window",
          outdoorQuality: "Outdoor Quality",
          sunProtection: "Sun Protection",
          sleepQuality: "Sleep Quality",
          headacheRisk: "Headache Risk",
          vitaminD: "Vitamin D Timer",
          umbrella: "Umbrella",
          jacket: "Jacket",
          noProtectionNeeded: "No protection needed",
          recommended: "Recommended",
          required: "Required",
          minutesUntilSunburn: "min until sunburn",
          minutesForVitaminD: "min for vitamin D",
          pressureStable: "Pressure stable",
          pressureRising: "Pressure rising",
          pressureFalling: "Pressure falling",
          lowRisk: "Low risk",
          moderateRisk: "Moderate risk",
          highRisk: "High risk",
          idealConditions: "Ideal conditions",
          stayHydrated: "Stay hydrated",
          seekShade: "Seek shade",
          avoidOutdoor: "Avoid outdoor",
        },
      };
    }

    /**
     * Get localized string
     * @param {string} key - Translation key
     * @returns {string}
     */
    t(key) {
      return this.strings[this.language]?.[key] || this.strings.de[key] || key;
    }

    // ============================================
    // WEIGHTED MULTI-FACTOR SCORE
    // ============================================

    /**
     * Calculate the weighted outdoor comfort score
     * Critical factors can cap the score at 30
     * @param {object} params - Weather parameters
     * @returns {{score: number, factors: object, capped: boolean, cappedBy: string|null}}
     */
    calculateOutdoorScore(params) {
      const {
        temp = 20,
        feels = temp,
        windSpeed = 0,
        precipProb = 0,
        humidity = 50,
        uvIndex = 0,
        visibility = 10,
        aqiValue = 0,
        pollenLevel = 0,
      } = params;

      const factors = {};
      let capped = false;
      let cappedBy = null;

      // Check critical thresholds FIRST
      if (precipProb > this.criticalThresholds.precipProb) {
        capped = true;
        cappedBy = "precipitation";
      } else if (windSpeed > this.criticalThresholds.windSpeed) {
        capped = true;
        cappedBy = "wind";
      }

      // 1. Temperature Factor (comfort curve 18-24°C = 100%)
      const tempScore = WeatherMath?.calculateTempComfortScore
        ? WeatherMath.calculateTempComfortScore(feels)
        : this._fallbackTempScore(feels);
      factors.temperature = {
        score: tempScore,
        weight: this.weights.temperature,
        value: feels,
        optimal: feels >= 18 && feels <= 24,
      };

      // 2. Precipitation Factor
      let precipScore = 100;
      if (precipProb <= 10) precipScore = 100;
      else if (precipProb <= 25) precipScore = 90;
      else if (precipProb <= 40) precipScore = 70;
      else if (precipProb <= 60) precipScore = 45;
      else if (precipProb <= 80) precipScore = 25;
      else precipScore = 10;
      factors.precipitation = {
        score: precipScore,
        weight: this.weights.precipitation,
        value: precipProb,
        critical: precipProb > this.criticalThresholds.precipProb,
      };

      // 3. Wind Factor
      const windScore = WeatherMath?.calculateWindComfortScore
        ? WeatherMath.calculateWindComfortScore(windSpeed)
        : this._fallbackWindScore(windSpeed);
      factors.wind = {
        score: windScore,
        weight: this.weights.wind,
        value: windSpeed,
        critical: windSpeed > this.criticalThresholds.windSpeed,
      };

      // 4. Humidity Factor
      const humidityScore = WeatherMath?.calculateHumidityComfortScore
        ? WeatherMath.calculateHumidityComfortScore(humidity)
        : this._fallbackHumidityScore(humidity);
      factors.humidity = {
        score: humidityScore,
        weight: this.weights.humidity,
        value: humidity,
      };

      // 5. UV Factor (high UV reduces score)
      const uvRisk = WeatherMath?.getUVRiskLevel?.(uvIndex);
      const uvScore = uvRisk?.score ?? this._fallbackUVScore(uvIndex);
      factors.uv = {
        score: uvScore,
        weight: this.weights.uv,
        value: uvIndex,
        risk: uvRisk?.risk || "unknown",
      };

      // 6. Air Quality Factor
      let aqiScore = 100;
      if (aqiValue <= 20) aqiScore = 100;
      else if (aqiValue <= 40) aqiScore = 85;
      else if (aqiValue <= 60) aqiScore = 65;
      else if (aqiValue <= 80) aqiScore = 45;
      else if (aqiValue <= 100) aqiScore = 25;
      else aqiScore = Math.max(0, 25 - (aqiValue - 100) * 0.25);
      factors.airQuality = {
        score: aqiScore,
        weight: this.weights.airQuality,
        value: aqiValue,
      };

      // 7. Visibility Factor
      let visibilityScore = 100;
      if (visibility >= 10) visibilityScore = 100;
      else if (visibility >= 5) visibilityScore = 90;
      else if (visibility >= 2) visibilityScore = 70;
      else if (visibility >= 1) visibilityScore = 45;
      else visibilityScore = 20;
      factors.visibility = {
        score: visibilityScore,
        weight: this.weights.visibility,
        value: visibility,
      };

      // 8. Pollen Factor (0-5 scale)
      let pollenScore = 100;
      if (pollenLevel <= 1) pollenScore = 100;
      else if (pollenLevel <= 2) pollenScore = 80;
      else if (pollenLevel <= 3) pollenScore = 55;
      else if (pollenLevel <= 4) pollenScore = 30;
      else pollenScore = 10;
      factors.pollen = {
        score: pollenScore,
        weight: this.weights.pollen,
        value: pollenLevel,
      };

      // Calculate weighted score
      let score = Object.values(factors).reduce(
        (sum, f) => sum + f.score * f.weight,
        0,
      );
      score = Math.round(Math.max(0, Math.min(100, score)));

      // Apply critical cap
      if (capped) {
        score = Math.min(score, this.criticalThresholds.maxScoreOnCritical);
      }

      return {
        score,
        factors,
        capped,
        cappedBy,
        label: this._getScoreLabel(score),
        color: this._getScoreColor(score),
      };
    }

    /**
     * Get score label based on value
     */
    _getScoreLabel(score) {
      if (score >= 80) return this.t("excellent");
      if (score >= 60) return this.t("good");
      if (score >= 40) return this.t("moderate");
      if (score >= 20) return this.t("poor");
      return this.t("critical");
    }

    /**
     * Get score color based on value
     */
    _getScoreColor(score) {
      if (score >= 80) return "#4ade80"; // accent-green
      if (score >= 60) return "#a3e635"; // lime
      if (score >= 40) return "#fbbf24"; // amber
      if (score >= 20) return "#fb923c"; // orange
      return "#ef4444"; // red
    }

    // Fallback functions if WeatherMath is not available
    _fallbackTempScore(temp) {
      if (temp >= 18 && temp <= 24) return 100;
      if (temp < 18) return Math.max(0, 100 - Math.abs(18 - temp) * 5);
      return Math.max(0, 100 - (temp - 24) * 6);
    }

    _fallbackWindScore(wind) {
      if (wind <= 15) return 100;
      if (wind <= 30) return 80;
      if (wind <= 50) return 50;
      return Math.max(0, 50 - (wind - 50));
    }

    _fallbackHumidityScore(humidity) {
      if (humidity >= 40 && humidity <= 60) return 100;
      return Math.max(0, 100 - Math.abs(50 - humidity) * 1.5);
    }

    _fallbackUVScore(uv) {
      if (uv <= 2) return 100;
      if (uv <= 5) return 80;
      if (uv <= 7) return 55;
      if (uv <= 10) return 30;
      return 10;
    }

    // ============================================
    // PEAK WINDOW DETECTION
    // ============================================

    /**
     * Scan hourly data and find the best time window for outdoor activity
     * @param {Array} hourlyData - 24h array of weather data
     * @param {number} minDuration - Minimum window duration in hours (default: 1.5)
     * @returns {{start: string, end: string, avgScore: number, hours: Array}}
     */
    findBestTimeWindow(hourlyData, minDuration = 1.5) {
      if (!hourlyData || hourlyData.length < 3) {
        return null;
      }

      // Calculate scores for each hour
      const hourlyScores = hourlyData.map((h, index) => {
        const result = this.calculateOutdoorScore({
          temp: h.temperature,
          feels: h.apparentTemperature || h.feelsLike || h.temperature,
          windSpeed: h.windSpeed,
          precipProb: h.precipitationProbability ?? h.precipProb ?? 0,
          humidity: h.humidity,
          uvIndex: h.uvIndex ?? h.uv ?? 0,
          visibility: h.visibility,
          aqiValue: h.aqiValue ?? 0,
          pollenLevel: h.pollenLevel ?? 0,
        });

        return {
          index,
          time: h.time || h.timeLabel,
          score: result.score,
          factors: result.factors,
        };
      });

      // Find the window with highest average score
      const minSlots = Math.ceil(minDuration * 2); // Assuming 30-min resolution
      const windowSize = Math.max(3, minSlots); // At least 3 slots (1.5h)

      let bestWindow = null;
      let bestAvgScore = 0;

      for (let i = 0; i <= hourlyScores.length - windowSize; i++) {
        const window = hourlyScores.slice(i, i + windowSize);
        const avgScore =
          window.reduce((sum, h) => sum + h.score, 0) / window.length;

        // Also check minimum score in window (don't recommend if any hour is terrible)
        const minScore = Math.min(...window.map((h) => h.score));

        if (avgScore > bestAvgScore && minScore >= 25) {
          bestAvgScore = avgScore;
          bestWindow = {
            startIndex: i,
            endIndex: i + windowSize - 1,
            hours: window,
          };
        }
      }

      if (!bestWindow) {
        return null;
      }

      // Format time strings
      const startTime = this._formatTimeLabel(
        hourlyScores[bestWindow.startIndex].time,
      );
      const endTime = this._formatTimeLabel(
        hourlyScores[bestWindow.endIndex].time,
      );

      return {
        start: startTime,
        end: endTime,
        avgScore: Math.round(bestAvgScore),
        label: this.t("bestTimeWindow"),
        displayText: `${startTime} - ${endTime}`,
        hours: bestWindow.hours,
        color: this._getScoreColor(bestAvgScore),
      };
    }

    /**
     * Format time label for display
     */
    _formatTimeLabel(timeInput) {
      if (!timeInput) return "";

      // If already HH:MM format
      if (/^\d{1,2}:\d{2}$/.test(timeInput)) {
        return timeInput;
      }

      // Try to parse as date
      try {
        const date = new Date(timeInput);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString(
            this.language === "de" ? "de-DE" : "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          );
        }
      } catch (e) {
        // Fall through
      }

      // Extract time from string
      const match = String(timeInput).match(/(\d{1,2}):(\d{2})/);
      if (match) {
        return `${match[1].padStart(2, "0")}:${match[2]}`;
      }

      return String(timeInput).substring(0, 5);
    }

    // ============================================
    // BIO-ALERTS
    // ============================================

    /**
     * Calculate headache/migraine risk based on pressure changes
     * Threshold: >5hPa change in 3 hours
     * @param {Array} pressureHistory - Array of {time, pressure} readings
     * @returns {{risk: string, level: number, change: number, advice: string, color: string}}
     */
    calculateHeadacheRisk(pressureHistory) {
      if (!pressureHistory || pressureHistory.length < 2) {
        return {
          risk: "unknown",
          level: 0,
          change: 0,
          advice: this.t("pressureStable"),
          color: "#9E9E9E",
        };
      }

      // Use WeatherMath if available
      const pressureData = WeatherMath?.calculatePressureChange?.(
        pressureHistory,
        3,
      );
      const change =
        pressureData?.change ??
        this._calculateSimplePressureChange(pressureHistory);
      const absChange = Math.abs(change);

      // Apply risk calculation
      const riskResult =
        WeatherMath?.calculateHeadacheRisk?.(change) ??
        this._fallbackHeadacheRisk(change);

      // Add trend info
      let trendAdvice = this.t("pressureStable");
      if (change > 2) trendAdvice = this.t("pressureRising");
      else if (change < -2) trendAdvice = this.t("pressureFalling");

      return {
        risk: riskResult.risk,
        level: riskResult.level,
        change: Math.round(change * 10) / 10,
        advice: riskResult.advice,
        trendAdvice,
        color: riskResult.color,
        isCritical: absChange >= 5,
        showAlert: this.sensitiveToMigraine && absChange >= 4,
      };
    }

    _calculateSimplePressureChange(history) {
      if (history.length < 2) return 0;
      const sorted = [...history].sort(
        (a, b) => new Date(a.time) - new Date(b.time),
      );
      return sorted[sorted.length - 1].pressure - sorted[0].pressure;
    }

    _fallbackHeadacheRisk(change) {
      const absChange = Math.abs(change);
      if (absChange < 3)
        return {
          risk: "low",
          level: 1,
          advice: this.t("lowRisk"),
          color: "#4CAF50",
        };
      if (absChange < 5)
        return {
          risk: "moderate",
          level: 2,
          advice: this.t("moderateRisk"),
          color: "#FFC107",
        };
      return {
        risk: "high",
        level: 3,
        advice: this.t("highRisk"),
        color: "#F44336",
      };
    }

    /**
     * Calculate Vitamin D timer - time for adequate UV exposure
     * @param {number} uvIndex - Current UV index
     * @returns {{available: boolean, minutes: number, advice: string, sunburnTime: number}}
     */
    calculateVitaminDTimer(uvIndex) {
      if (uvIndex == null || uvIndex < 3) {
        return {
          available: false,
          minutes: null,
          advice:
            this.language === "de"
              ? "UV-Index zu niedrig für Vitamin D Synthese"
              : "UV index too low for vitamin D synthesis",
          sunburnTime: null,
        };
      }

      const vitaminDTime =
        WeatherMath?.calculateVitaminDTime?.(uvIndex, this.skinType) ??
        Math.round(
          ((15 * 6) / uvIndex) *
            (this.skinType === 2 ? 1 : this.skinType * 0.5),
        );

      const sunburnTime =
        WeatherMath?.calculateSunburnTime?.(uvIndex, this.skinType) ??
        Math.round(200 / (uvIndex * 1.5));

      return {
        available: true,
        minutes: vitaminDTime,
        sunburnTime,
        safeExposure: Math.min(vitaminDTime, Math.floor(sunburnTime * 0.7)),
        advice:
          this.language === "de"
            ? `${vitaminDTime} ${this.t("minutesForVitaminD")}`
            : `${vitaminDTime} ${this.t("minutesForVitaminD")}`,
        sunburnAdvice:
          this.language === "de"
            ? `${sunburnTime} ${this.t("minutesUntilSunburn")}`
            : `${sunburnTime} ${this.t("minutesUntilSunburn")}`,
        uvLevel: WeatherMath?.getUVRiskLevel?.(uvIndex) ?? { level: "unknown" },
      };
    }

    // ============================================
    // QUICK-CHECK INSIGHTS
    // ============================================

    /**
     * Generate actionable quick-check items
     * @param {object} conditions - Current weather conditions
     * @param {object} options - Additional options (isNight, hourly data, etc.)
     * @returns {Array<{id: string, question: string, answer: string, icon: string, priority: number, color: string}>}
     */
    generateQuickChecks(conditions, options = {}) {
      const {
        temp = 20,
        feels = temp,
        precipProb = 0,
        windSpeed = 0,
        uvIndex = 0,
        humidity = 50,
      } = conditions;

      const { isNight = false, maxUv = uvIndex } = options;

      const checks = [];

      // 1. Umbrella Check
      let umbrellaCheck = {
        id: "umbrella",
        question: this.language === "de" ? "Regenschirm?" : "Umbrella?",
        priority: 50,
        type: "umbrella",
      };

      if (precipProb >= 70) {
        umbrellaCheck = {
          ...umbrellaCheck,
          answer:
            this.language === "de" ? "Ja, unbedingt!" : "Yes, definitely!",
          icon: "☔",
          color: "#F44336",
          priority: 100,
        };
      } else if (precipProb >= 40) {
        umbrellaCheck = {
          ...umbrellaCheck,
          answer: this.language === "de" ? "Sicherheitshalber" : "Just in case",
          icon: "🌂",
          color: "#FF9800",
          priority: 80,
        };
      } else {
        umbrellaCheck = {
          ...umbrellaCheck,
          answer: this.language === "de" ? "Nicht nötig" : "Not needed",
          icon: "✓",
          color: "#4CAF50",
          priority: 20,
        };
      }
      umbrellaCheck.detail = `${precipProb}% ${this.language === "de" ? "Regenwahrscheinlichkeit" : "rain probability"}`;
      checks.push(umbrellaCheck);

      // 2. Sun Protection Check (high priority during day with UV)
      let sunCheck = {
        id: "sunprotection",
        question: this.language === "de" ? "Sonnenschutz?" : "Sun protection?",
        priority: isNight ? 5 : 50,
        type: "uv",
      };

      const effectiveUv = Math.max(uvIndex, maxUv);

      if (effectiveUv >= 8) {
        sunCheck = {
          ...sunCheck,
          answer: this.language === "de" ? "Unbedingt!" : "Essential!",
          icon: "🧴",
          color: "#F44336",
          priority: isNight ? 5 : 100,
        };
      } else if (effectiveUv >= 5) {
        sunCheck = {
          ...sunCheck,
          answer: this.language === "de" ? "Empfohlen" : "Recommended",
          icon: "🕶️",
          color: "#FF9800",
          priority: isNight ? 5 : 85,
        };
      } else if (effectiveUv >= 3) {
        sunCheck = {
          ...sunCheck,
          answer:
            this.language === "de"
              ? "Bei längerem Aufenthalt"
              : "For extended time",
          icon: "☀️",
          color: "#FFC107",
          priority: isNight ? 5 : 60,
        };
      } else {
        sunCheck = {
          ...sunCheck,
          answer: this.language === "de" ? "Nicht nötig" : "Not needed",
          icon: "✓",
          color: "#4CAF50",
          priority: isNight ? 5 : 15,
        };
      }
      sunCheck.detail = `UV-Index: ${Math.round(effectiveUv)}`;
      checks.push(sunCheck);

      // 3. Jacket Check
      let jacketCheck = {
        id: "jacket",
        question: this.language === "de" ? "Jacke anziehen?" : "Wear a jacket?",
        priority: 50,
        type: "clothing",
      };

      if (feels <= 5) {
        jacketCheck = {
          ...jacketCheck,
          answer:
            this.language === "de" ? "Dicke Winterjacke" : "Heavy winter coat",
          icon: "🧥",
          color: "#2196F3",
          priority: 90,
        };
      } else if (feels <= 12) {
        jacketCheck = {
          ...jacketCheck,
          answer: this.language === "de" ? "Warme Jacke" : "Warm jacket",
          icon: "🧤",
          color: "#4CAF50",
          priority: 70,
        };
      } else if (feels <= 18 || precipProb >= 50) {
        jacketCheck = {
          ...jacketCheck,
          answer:
            precipProb >= 50
              ? this.language === "de"
                ? "Regenjacke"
                : "Rain jacket"
              : this.language === "de"
                ? "Leichte Jacke"
                : "Light jacket",
          icon: "🧥",
          color: precipProb >= 50 ? "#42A5F5" : "#8BC34A",
          priority: 55,
        };
      } else {
        jacketCheck = {
          ...jacketCheck,
          answer: this.language === "de" ? "Nicht nötig" : "Not needed",
          icon: "✓",
          color: "#4CAF50",
          priority: 20,
        };
      }
      jacketCheck.detail = `${this.language === "de" ? "Gefühlt" : "Feels like"} ${Math.round(feels)}°C`;
      checks.push(jacketCheck);

      // 4. Sleep Quality Check (higher priority at night)
      let sleepCheck = {
        id: "sleep",
        question: this.language === "de" ? "Schlafqualität?" : "Sleep quality?",
        priority: isNight ? 80 : 30,
        type: "sleep",
      };

      const sleepData = WeatherMath?.calculateSleepQuality?.(
        temp,
        humidity,
      ) ?? { score: temp >= 16 && temp <= 20 ? 85 : 60, advice: "" };

      if (sleepData.score >= 80) {
        sleepCheck = {
          ...sleepCheck,
          answer: this.language === "de" ? "Sehr gut" : "Very good",
          icon: "😴",
          color: "#4CAF50",
          priority: isNight ? 70 : 25,
        };
      } else if (sleepData.score >= 60) {
        sleepCheck = {
          ...sleepCheck,
          answer: this.language === "de" ? "Gut" : "Good",
          icon: "🛏️",
          color: "#8BC34A",
          priority: isNight ? 65 : 30,
        };
      } else {
        sleepCheck = {
          ...sleepCheck,
          answer: this.language === "de" ? "Eingeschränkt" : "Limited",
          icon: "🌡️",
          color: "#FF9800",
          priority: isNight ? 85 : 40,
        };
      }
      sleepCheck.detail =
        sleepData.advice ||
        `${Math.round(temp)}°C, ${humidity}% ${this.language === "de" ? "Feuchte" : "humidity"}`;
      checks.push(sleepCheck);

      // 5. Wind Advisory
      if (windSpeed >= 30) {
        checks.push({
          id: "wind",
          question:
            this.language === "de" ? "Wind beachten?" : "Wind advisory?",
          answer:
            windSpeed >= 50
              ? this.language === "de"
                ? "Starker Wind!"
                : "Strong wind!"
              : this.language === "de"
                ? "Böiger Wind"
                : "Gusty wind",
          icon: windSpeed >= 50 ? "🌪️" : "💨",
          color: windSpeed >= 50 ? "#F44336" : "#FF9800",
          priority: windSpeed >= 50 ? 95 : 70,
          detail: `${Math.round(windSpeed)} km/h`,
          type: "wind",
        });
      }

      // Sort by priority (highest first)
      checks.sort((a, b) => b.priority - a.priority);

      return checks;
    }

    // ============================================
    // SAFETY ALERTS
    // ============================================

    /**
     * Generate safety-critical alerts
     * @param {object} conditions - Weather conditions
     * @param {object} bioData - Bio data (pressure changes, etc.)
     * @returns {Array<{type: string, severity: string, title: string, message: string, icon: string, color: string}>}
     */
    generateSafetyAlerts(conditions, bioData = {}) {
      const alerts = [];
      const {
        temp = 20,
        feels = temp,
        uvIndex = 0,
        windSpeed = 0,
        precipProb = 0,
        humidity = 50,
        aqiValue = 0,
      } = conditions;

      // Heat Alert
      if (feels >= 35) {
        alerts.push({
          type: "heat",
          severity: "critical",
          title: this.language === "de" ? "Extreme Hitze" : "Extreme Heat",
          message:
            this.language === "de"
              ? "Hitzewarnung! Viel trinken, Sonne meiden."
              : "Heat warning! Stay hydrated, avoid sun.",
          icon: "🌡️",
          color: "#F44336",
          priority: 100,
        });
      } else if (feels >= 30) {
        alerts.push({
          type: "heat",
          severity: "warning",
          title:
            this.language === "de" ? "Hohe Temperaturen" : "High Temperatures",
          message:
            this.language === "de"
              ? "Viel trinken und Pausen im Schatten einlegen."
              : "Stay hydrated and take breaks in shade.",
          icon: "☀️",
          color: "#FF9800",
          priority: 75,
        });
      }

      // Cold Alert
      if (feels <= -10) {
        alerts.push({
          type: "cold",
          severity: "critical",
          title: this.language === "de" ? "Extreme Kälte" : "Extreme Cold",
          message:
            this.language === "de"
              ? "Erfrierungsgefahr! Warm anziehen, Aufenthalt begrenzen."
              : "Frostbite risk! Dress warmly, limit exposure.",
          icon: "❄️",
          color: "#2196F3",
          priority: 100,
        });
      } else if (feels <= 0) {
        alerts.push({
          type: "cold",
          severity: "warning",
          title: this.language === "de" ? "Frostgefahr" : "Frost Warning",
          message:
            this.language === "de"
              ? "Warm anziehen und auf Glätte achten."
              : "Dress warmly and watch for ice.",
          icon: "🥶",
          color: "#4FC3F7",
          priority: 70,
        });
      }

      // UV Alert
      if (uvIndex >= 11) {
        alerts.push({
          type: "uv",
          severity: "critical",
          title: this.language === "de" ? "Extreme UV-Strahlung" : "Extreme UV",
          message:
            this.language === "de"
              ? "Mittagssonne unbedingt meiden!"
              : "Avoid midday sun!",
          icon: "☀️",
          color: "#9C27B0",
          priority: 95,
        });
      } else if (uvIndex >= 8) {
        alerts.push({
          type: "uv",
          severity: "warning",
          title:
            this.language === "de" ? "Sehr hohe UV-Strahlung" : "Very High UV",
          message:
            this.language === "de"
              ? "Sonnencreme, Hut und Sonnenbrille tragen."
              : "Wear sunscreen, hat and sunglasses.",
          icon: "🧴",
          color: "#F44336",
          priority: 80,
        });
      }

      // Storm Alert (wind + precip)
      if (windSpeed >= 60 || (windSpeed >= 40 && precipProb >= 70)) {
        alerts.push({
          type: "storm",
          severity: windSpeed >= 60 ? "critical" : "warning",
          title: this.language === "de" ? "Sturmwarnung" : "Storm Warning",
          message:
            this.language === "de"
              ? "Aufenthalt im Freien vermeiden."
              : "Avoid being outdoors.",
          icon: "⛈️",
          color: "#7E57C2",
          priority: windSpeed >= 60 ? 100 : 85,
        });
      }

      // Air Quality Alert
      if (aqiValue >= 100) {
        alerts.push({
          type: "aqi",
          severity: aqiValue >= 150 ? "critical" : "warning",
          title:
            this.language === "de"
              ? "Schlechte Luftqualität"
              : "Poor Air Quality",
          message:
            this.language === "de"
              ? "Aktivitäten im Freien einschränken."
              : "Limit outdoor activities.",
          icon: "😷",
          color: "#795548",
          priority: aqiValue >= 150 ? 90 : 65,
        });
      }

      // Headache/Migraine Alert (from bio data)
      if (bioData.headacheRisk?.isCritical) {
        alerts.push({
          type: "bio",
          severity: "info",
          title:
            this.language === "de" ? "Kopfschmerz-Risiko" : "Headache Risk",
          message: bioData.headacheRisk.advice,
          icon: "🧠",
          color: "#FF9800",
          priority: this.sensitiveToMigraine ? 80 : 40,
        });
      }

      // Sort by priority
      alerts.sort((a, b) => b.priority - a.priority);

      return alerts;
    }

    // ============================================
    // COMPLETE HEALTH ANALYSIS
    // ============================================

    /**
     * Run complete health analysis
     * @param {object} appState - Full app state with current, hourly, daily data
     * @returns {object} Complete health analysis result
     */
    analyze(appState) {
      const current = appState.current || {};
      const hourly = appState.hourly || [];
      const daily = (appState.daily && appState.daily[0]) || {};
      const aqi = appState.aqi || {};
      const pollen = appState.pollen || {};

      // Extract conditions
      const conditions = {
        temp: current.temperature,
        feels:
          current.apparentTemperature ||
          current.feelsLike ||
          current.temperature,
        windSpeed: current.windSpeed || 0,
        precipProb: current.precipProb || daily.precipProbMax || 0,
        humidity: current.humidity || 50,
        uvIndex: current.uvIndex || daily.uvIndexMax || 0,
        visibility: current.visibility || 10,
        aqiValue: aqi.europeanAqi || aqi.usAqi || 0,
        pollenLevel: Math.round(
          ((pollen.trees || 1) + (pollen.grass || 1) + (pollen.weeds || 1)) / 3,
        ),
        pressure: current.pressure || current.surfacePressure,
      };

      // Check if night time
      const now = new Date();
      const hour = now.getHours();
      const isNight = hour < 6 || hour >= 21;

      // Calculate max UV for the day
      const maxUv = hourly
        .slice(0, 12)
        .reduce(
          (max, h) => Math.max(max, h.uvIndex || h.uv || 0),
          conditions.uvIndex,
        );

      // Build pressure history from hourly data
      const pressureHistory = hourly
        .slice(0, 6)
        .map((h) => ({
          time: h.time,
          pressure: h.pressure || h.surfacePressure,
        }))
        .filter((h) => h.pressure != null);

      // Run all calculations
      const outdoorScore = this.calculateOutdoorScore(conditions);
      const bestTimeWindow = this.findBestTimeWindow(hourly.slice(0, 24));
      const headacheRisk = this.calculateHeadacheRisk(pressureHistory);
      const vitaminDTimer = this.calculateVitaminDTimer(conditions.uvIndex);
      const quickChecks = this.generateQuickChecks(conditions, {
        isNight,
        maxUv,
      });
      const safetyAlerts = this.generateSafetyAlerts(conditions, {
        headacheRisk,
      });

      // Calculate hourly timeline scores
      const timeline = hourly.slice(0, 24).map((h) => {
        const hourResult = this.calculateOutdoorScore({
          temp: h.temperature,
          feels: h.apparentTemperature || h.feelsLike || h.temperature,
          windSpeed: h.windSpeed,
          precipProb: h.precipitationProbability ?? h.precipProb ?? 0,
          humidity: h.humidity,
          uvIndex: h.uvIndex ?? h.uv ?? 0,
          visibility: h.visibility,
          aqiValue: conditions.aqiValue,
          pollenLevel: conditions.pollenLevel,
        });

        return {
          time: h.time || h.timeLabel,
          score: hourResult.score,
          color: hourResult.color,
        };
      });

      // Last updated timestamp
      const lastUpdated = appState.lastUpdated || new Date().toISOString();

      return {
        // Main score
        outdoorScore,

        // Best time window
        bestTimeWindow,

        // Bio alerts
        headacheRisk,
        vitaminDTimer,

        // Quick checks (sorted by priority)
        quickChecks,

        // Safety alerts
        safetyAlerts,

        // Timeline for chart
        timeline,

        // Raw conditions for reference
        conditions,

        // Meta
        lastUpdated,
        isNight,
        language: this.language,

        // For compatibility with existing code
        currentOutdoorScore: outdoorScore.score,
        currentScoreFactors: outdoorScore.factors,
      };
    }

    // ============================================
    // 24h FORECAST API (for UI binding)
    // ============================================

    /**
     * Get 24-hour forecast with scores and recommendations
     * Designed for direct UI binding with the timeline component
     * @param {Array} hourlyData - Array of hourly weather data
     * @param {object} options - Additional options
     * @returns {object} Complete 24h forecast with UI-ready data
     */
    get24hForecast(hourlyData, options = {}) {
      if (!hourlyData || hourlyData.length === 0) {
        return {
          hours: [],
          bestWindow: null,
          averageScore: 0,
          trend: "stable",
          recommendations: [],
        };
      }

      const { aqiValue = 0, pollenLevel = 0 } = options;

      // Calculate scores for each hour
      const hours = hourlyData.slice(0, 24).map((h, index) => {
        const result = this.calculateOutdoorScore({
          temp: h.temperature,
          feels: h.apparentTemperature || h.feelsLike || h.temperature,
          windSpeed: h.windSpeed || 0,
          precipProb: h.precipitationProbability ?? h.precipProb ?? 0,
          humidity: h.humidity || 50,
          uvIndex: h.uvIndex ?? h.uv ?? 0,
          visibility: h.visibility || 10,
          aqiValue,
          pollenLevel,
        });

        const date = h.time
          ? new Date(h.time)
          : new Date(Date.now() + index * 3600000);
        const hourNum = date.getHours();
        const isNightHour = hourNum < 6 || hourNum >= 21;

        return {
          index,
          time: h.time || date.toISOString(),
          hour: hourNum,
          displayTime: `${hourNum.toString().padStart(2, "0")}:00`,
          score: result.score,
          label: result.label,
          color: result.color,
          capped: result.capped,
          cappedBy: result.cappedBy,
          factors: result.factors,
          isNight: isNightHour,
          // Raw weather for detail views
          weather: {
            temp: h.temperature,
            feels: h.apparentTemperature || h.feelsLike || h.temperature,
            precipProb: h.precipitationProbability ?? h.precipProb ?? 0,
            windSpeed: h.windSpeed || 0,
            uvIndex: h.uvIndex ?? h.uv ?? 0,
            humidity: h.humidity || 50,
          },
        };
      });

      // Find best window
      const bestWindow = this.findBestTimeWindow(hourlyData);

      // Calculate average and trend
      const averageScore = Math.round(
        hours.reduce((sum, h) => sum + h.score, 0) / hours.length,
      );

      // Trend: compare first 6h vs last 6h
      const firstHalf =
        hours.slice(0, 6).reduce((sum, h) => sum + h.score, 0) / 6;
      const secondHalf =
        hours.slice(6, 12).reduce((sum, h) => sum + h.score, 0) / 6;
      const trend =
        secondHalf > firstHalf + 10
          ? "improving"
          : secondHalf < firstHalf - 10
            ? "declining"
            : "stable";

      // Generate hour-specific recommendations
      const recommendations = this._generate24hRecommendations(
        hours,
        bestWindow,
      );

      return {
        hours,
        bestWindow,
        averageScore,
        trend,
        trendLabel:
          trend === "improving"
            ? this.language === "de"
              ? "Wird besser"
              : "Improving"
            : trend === "declining"
              ? this.language === "de"
                ? "Wird schlechter"
                : "Declining"
              : this.language === "de"
                ? "Stabil"
                : "Stable",
        recommendations,
      };
    }

    /**
     * Generate recommendations based on 24h forecast
     */
    _generate24hRecommendations(hours, bestWindow) {
      const recommendations = [];

      // Best time recommendation
      if (bestWindow) {
        recommendations.push({
          type: "best-time",
          priority: 100,
          icon: "⭐",
          title: this.language === "de" ? "Beste Zeit" : "Best Time",
          message:
            this.language === "de"
              ? `${bestWindow.displayText} bietet optimale Bedingungen (Score: ${bestWindow.avgScore})`
              : `${bestWindow.displayText} offers optimal conditions (Score: ${bestWindow.avgScore})`,
          color: bestWindow.color,
        });
      }

      // Check for capped hours
      const cappedHours = hours.filter((h) => h.capped);
      if (cappedHours.length > 3) {
        const cappedBy = cappedHours[0].cappedBy;
        recommendations.push({
          type: "warning",
          priority: 90,
          icon: "⚠️",
          title:
            cappedBy === "precipitation"
              ? this.language === "de"
                ? "Regen erwartet"
                : "Rain Expected"
              : this.language === "de"
                ? "Starker Wind"
                : "Strong Wind",
          message:
            this.language === "de"
              ? `${cappedHours.length} Stunden mit eingeschränkten Bedingungen`
              : `${cappedHours.length} hours with limited conditions`,
          color: "#FF9800",
        });
      }

      // High UV warning
      const highUvHours = hours.filter((h) => (h.weather.uvIndex || 0) >= 6);
      if (highUvHours.length > 0) {
        const maxUv = Math.max(...highUvHours.map((h) => h.weather.uvIndex));
        recommendations.push({
          type: "uv",
          priority: 75,
          icon: "☀️",
          title: this.language === "de" ? "UV-Warnung" : "UV Warning",
          message:
            this.language === "de"
              ? `UV-Index bis ${Math.round(maxUv)} – Sonnenschutz empfohlen`
              : `UV index up to ${Math.round(maxUv)} – sun protection recommended`,
          color: "#FF9800",
        });
      }

      return recommendations.sort((a, b) => b.priority - a.priority);
    }

    // ============================================
    // PRIORITIZED CHECKS API (for dynamic Quick-Check)
    // ============================================

    /**
     * Get prioritized checks based on current conditions
     * Implements the dynamic prioritization logic:
     * - Safety first (warnings, frost)
     * - Contextual priority (UV > 5 → sun protection up, rain > 30% → umbrella up)
     * - Time context (22:00-06:00 → sleep quality primary)
     *
     * @param {object} weatherData - Current weather conditions
     * @param {object} options - Additional context (time, hourly data)
     * @returns {Array} Sorted array of check objects
     */
    getPrioritizedChecks(weatherData, options = {}) {
      const {
        temp = 20,
        feels = temp,
        precipProb = 0,
        windSpeed = 0,
        uvIndex = 0,
        humidity = 50,
        aqiValue = 0,
      } = weatherData || {};

      const {
        isNight = this._isNightTime(),
        maxUv = uvIndex,
        hourly = [],
        alerts = [],
      } = options;

      const checks = [];

      // ====== SAFETY FIRST (highest priority) ======

      // Weather alerts get top priority
      if (alerts.length > 0) {
        const criticalAlerts = alerts.filter(
          (a) => a.severity === "red" || a.severity === "critical",
        );
        if (criticalAlerts.length > 0) {
          checks.push({
            id: "alert-critical",
            question:
              this.language === "de" ? "Wetterwarnungen" : "Weather Warnings",
            answer:
              this.language === "de" ? "Warnung aktiv!" : "Warning active!",
            icon: "🚨",
            color: "#F44336",
            priority: 200,
            type: "alert",
            detail: criticalAlerts[0].title || "Critical weather alert",
          });
        }
      }

      // Frost warning
      if (feels <= 0) {
        checks.push({
          id: "frost",
          question: this.language === "de" ? "Frostgefahr?" : "Frost danger?",
          answer:
            feels <= -5
              ? this.language === "de"
                ? "Ja, Vorsicht!"
                : "Yes, caution!"
              : this.language === "de"
                ? "Leichter Frost"
                : "Light frost",
          icon: "❄️",
          color: feels <= -5 ? "#F44336" : "#4FC3F7",
          priority: feels <= -5 ? 180 : 150,
          type: "frost",
          detail: `${Math.round(feels)}°C ${this.language === "de" ? "gefühlt" : "feels like"}`,
        });
      }

      // Storm/high wind
      if (windSpeed >= 50) {
        checks.push({
          id: "storm",
          question: this.language === "de" ? "Sturmwarnung?" : "Storm warning?",
          answer:
            this.language === "de"
              ? "Ja, drinnen bleiben!"
              : "Yes, stay inside!",
          icon: "🌪️",
          color: "#F44336",
          priority: 190,
          type: "storm",
          detail: `${Math.round(windSpeed)} km/h`,
        });
      }

      // ====== CONTEXTUAL PRIORITY ======

      // Rain check - higher priority if precipProb > 30%
      const rainPriority = precipProb >= 70 ? 140 : precipProb >= 30 ? 100 : 40;
      checks.push({
        id: "umbrella",
        question: this.language === "de" ? "Regenschirm?" : "Umbrella?",
        answer:
          precipProb >= 70
            ? this.language === "de"
              ? "Ja, unbedingt!"
              : "Yes, definitely!"
            : precipProb >= 30
              ? this.language === "de"
                ? "Sicherheitshalber"
                : "Just in case"
              : this.language === "de"
                ? "Nicht nötig"
                : "Not needed",
        icon: precipProb >= 70 ? "☔" : precipProb >= 30 ? "🌂" : "✓",
        color:
          precipProb >= 70
            ? "#F44336"
            : precipProb >= 30
              ? "#FF9800"
              : "#4CAF50",
        priority: rainPriority,
        type: "umbrella",
        detail: `${Math.round(precipProb)}% ${this.language === "de" ? "Regenwahrscheinlichkeit" : "rain probability"}`,
      });

      // UV check - higher priority if UV > 5 (and not night)
      const effectiveUv = Math.max(uvIndex, maxUv);
      if (!isNight) {
        const uvPriority =
          effectiveUv >= 8
            ? 130
            : effectiveUv >= 5
              ? 110
              : effectiveUv >= 3
                ? 60
                : 20;
        checks.push({
          id: "sunprotection",
          question:
            this.language === "de" ? "Sonnenschutz?" : "Sun protection?",
          answer:
            effectiveUv >= 8
              ? this.language === "de"
                ? "Unbedingt!"
                : "Essential!"
              : effectiveUv >= 5
                ? this.language === "de"
                  ? "Empfohlen"
                  : "Recommended"
                : effectiveUv >= 3
                  ? this.language === "de"
                    ? "Bei längerem Aufenthalt"
                    : "For extended time"
                  : this.language === "de"
                    ? "Nicht nötig"
                    : "Not needed",
          icon:
            effectiveUv >= 8
              ? "🧴"
              : effectiveUv >= 5
                ? "🕶️"
                : effectiveUv >= 3
                  ? "☀️"
                  : "✓",
          color:
            effectiveUv >= 8
              ? "#F44336"
              : effectiveUv >= 5
                ? "#FF9800"
                : effectiveUv >= 3
                  ? "#FFC107"
                  : "#4CAF50",
          priority: uvPriority,
          type: "uv",
          detail: `UV-Index: ${Math.round(effectiveUv)}`,
        });
      }

      // ====== TIME CONTEXT (Sleep at night) ======
      if (isNight) {
        const sleepScore = this._calculateSleepScore(temp, humidity);
        checks.push({
          id: "sleep",
          question:
            this.language === "de" ? "Schlafqualität?" : "Sleep quality?",
          answer:
            sleepScore >= 80
              ? this.language === "de"
                ? "Sehr gut"
                : "Very good"
              : sleepScore >= 60
                ? this.language === "de"
                  ? "Gut"
                  : "Good"
                : this.language === "de"
                  ? "Eingeschränkt"
                  : "Limited",
          icon: sleepScore >= 80 ? "😴" : sleepScore >= 60 ? "🛏️" : "🌡️",
          color:
            sleepScore >= 80
              ? "#4CAF50"
              : sleepScore >= 60
                ? "#8BC34A"
                : "#FF9800",
          priority: 120, // High priority at night
          type: "sleep",
          detail: `${Math.round(temp)}°C, ${Math.round(humidity)}% ${this.language === "de" ? "Feuchte" : "humidity"}`,
        });
      } else {
        // During day, sleep check has lower priority
        const sleepScore = this._calculateSleepScore(temp, humidity);
        checks.push({
          id: "sleep",
          question:
            this.language === "de" ? "Schlafprognose?" : "Sleep forecast?",
          answer:
            sleepScore >= 80
              ? this.language === "de"
                ? "Gute Nacht erwartet"
                : "Good night expected"
              : sleepScore >= 60
                ? this.language === "de"
                  ? "Ok für heute Nacht"
                  : "OK for tonight"
                : this.language === "de"
                  ? "Schwierige Nacht"
                  : "Difficult night",
          icon: "🛏️",
          color:
            sleepScore >= 80
              ? "#4CAF50"
              : sleepScore >= 60
                ? "#8BC34A"
                : "#FF9800",
          priority: 30,
          type: "sleep",
          detail: `${this.language === "de" ? "Prognose für heute Nacht" : "Tonight forecast"}`,
        });
      }

      // ====== STANDARD CHECKS ======

      // Jacket check
      const jacketPriority = feels <= 5 ? 90 : feels <= 12 ? 70 : 50;
      checks.push({
        id: "jacket",
        question: this.language === "de" ? "Jacke anziehen?" : "Wear a jacket?",
        answer:
          feels <= 5
            ? this.language === "de"
              ? "Dicke Winterjacke"
              : "Heavy winter coat"
            : feels <= 12
              ? this.language === "de"
                ? "Warme Jacke"
                : "Warm jacket"
              : feels <= 18 || precipProb >= 50
                ? precipProb >= 50
                  ? this.language === "de"
                    ? "Regenjacke"
                    : "Rain jacket"
                  : this.language === "de"
                    ? "Leichte Jacke"
                    : "Light jacket"
                : this.language === "de"
                  ? "Nicht nötig"
                  : "Not needed",
        icon: feels <= 12 ? "🧥" : feels <= 18 ? "🧤" : "✓",
        color:
          feels <= 5
            ? "#2196F3"
            : feels <= 12
              ? "#4CAF50"
              : feels <= 18
                ? "#8BC34A"
                : "#4CAF50",
        priority: jacketPriority,
        type: "clothing",
        detail: `${this.language === "de" ? "Gefühlt" : "Feels like"} ${Math.round(feels)}°C`,
      });

      // Wind advisory (if moderate but not storm-level)
      if (windSpeed >= 30 && windSpeed < 50) {
        checks.push({
          id: "wind",
          question:
            this.language === "de" ? "Wind beachten?" : "Wind advisory?",
          answer: this.language === "de" ? "Böiger Wind" : "Gusty wind",
          icon: "💨",
          color: "#FF9800",
          priority: 70,
          type: "wind",
          detail: `${Math.round(windSpeed)} km/h`,
        });
      }

      // Air quality (if poor)
      if (aqiValue >= 100) {
        checks.push({
          id: "aqi",
          question: this.language === "de" ? "Luftqualität?" : "Air quality?",
          answer:
            aqiValue >= 150
              ? this.language === "de"
                ? "Schlecht"
                : "Poor"
              : this.language === "de"
                ? "Mäßig"
                : "Moderate",
          icon: "😷",
          color: aqiValue >= 150 ? "#F44336" : "#FF9800",
          priority: aqiValue >= 150 ? 100 : 60,
          type: "aqi",
          detail: `AQI: ${Math.round(aqiValue)}`,
        });
      }

      // Sort by priority (highest first)
      checks.sort((a, b) => b.priority - a.priority);

      return checks;
    }

    /**
     * Check if current time is night
     */
    _isNightTime() {
      const hour = new Date().getHours();
      return hour < 6 || hour >= 22;
    }

    /**
     * Calculate sleep quality score
     */
    _calculateSleepScore(temp, humidity) {
      // Optimal: 16-19°C, 40-60% humidity
      let score = 100;

      if (temp < 14) score -= (14 - temp) * 5;
      else if (temp > 22) score -= (temp - 22) * 8;
      else if (temp < 16 || temp > 19) score -= 10;

      if (humidity < 30) score -= (30 - humidity) * 0.5;
      else if (humidity > 70) score -= (humidity - 70) * 0.5;

      return Math.max(0, Math.min(100, score));
    }
  }

  // Export
  global.HealthEngine = HealthEngine;

  // Also support ES6 module syntax
  if (typeof module !== "undefined" && module.exports) {
    module.exports = HealthEngine;
  }
})(typeof window !== "undefined" ? window : global);
