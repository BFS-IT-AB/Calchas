/**
 * WeatherMath.js - Mathematical utilities for human comfort calculations
 * Pure functions for weather-related computations
 * @module utils/WeatherMath
 */

(function (global) {
  "use strict";

  const WeatherMath = {};

  // ============================================
  // FELT TEMPERATURE CALCULATIONS
  // ============================================

  /**
   * Calculate Wind Chill (Gefühlte Kälte)
   * Uses the North American Wind Chill Index formula
   * Valid for T <= 10°C and wind >= 4.8 km/h
   * @param {number} temp - Temperature in °C
   * @param {number} windSpeed - Wind speed in km/h
   * @returns {number|null} Wind chill temperature in °C
   */
  WeatherMath.calculateWindChill = function (temp, windSpeed) {
    if (temp == null || windSpeed == null) return null;
    if (temp > 10 || windSpeed < 4.8) return temp;

    const v016 = Math.pow(windSpeed, 0.16);
    const windChill =
      13.12 + 0.6215 * temp - 11.37 * v016 + 0.3965 * temp * v016;
    return Math.round(windChill * 10) / 10;
  };

  /**
   * Calculate Heat Index (Gefühlte Wärme)
   * Uses Rothfusz regression equation
   * Valid for T >= 27°C and humidity >= 40%
   * @param {number} temp - Temperature in °C
   * @param {number} humidity - Relative humidity in %
   * @returns {number} Heat index temperature in °C
   */
  WeatherMath.calculateHeatIndex = function (temp, humidity) {
    if (temp == null || humidity == null) return temp;
    if (temp < 27) return temp;

    // Convert to Fahrenheit for the formula
    const T = (temp * 9) / 5 + 32;
    const R = humidity;

    // Rothfusz regression
    let HI =
      -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      0.00683783 * T * T -
      0.05481717 * R * R +
      0.00122874 * T * T * R +
      0.00085282 * T * R * R -
      0.00000199 * T * T * R * R;

    // Adjustments for low/high humidity
    if (R < 13 && T >= 80 && T <= 112) {
      HI -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (R > 85 && T >= 80 && T <= 87) {
      HI += ((R - 85) / 10) * ((87 - T) / 5);
    }

    // Convert back to Celsius
    return Math.round((((HI - 32) * 5) / 9) * 10) / 10;
  };

  /**
   * Calculate apparent (felt) temperature combining wind chill and heat index
   * @param {number} temp - Temperature in °C
   * @param {number} humidity - Relative humidity in %
   * @param {number} windSpeed - Wind speed in km/h
   * @returns {number} Apparent temperature in °C
   */
  WeatherMath.calculateApparentTemperature = function (
    temp,
    humidity,
    windSpeed,
  ) {
    if (temp == null) return null;

    // Cold conditions: use wind chill
    if (temp <= 10 && windSpeed >= 4.8) {
      return this.calculateWindChill(temp, windSpeed);
    }

    // Hot conditions: use heat index
    if (temp >= 27 && humidity >= 40) {
      return this.calculateHeatIndex(temp, humidity);
    }

    return temp;
  };

  // ============================================
  // DEW POINT CALCULATIONS
  // ============================================

  /**
   * Calculate dew point using Magnus-Tetens formula
   * @param {number} temp - Temperature in °C
   * @param {number} humidity - Relative humidity in %
   * @returns {number} Dew point in °C
   */
  WeatherMath.calculateDewPoint = function (temp, humidity) {
    if (temp == null || humidity == null) return null;

    const a = 17.27;
    const b = 237.7;
    const alpha = (a * temp) / (b + temp) + Math.log(humidity / 100);
    const dewPoint = (b * alpha) / (a - alpha);

    return Math.round(dewPoint * 10) / 10;
  };

  /**
   * Get comfort level based on dew point (human perception)
   * @param {number} dewPoint - Dew point in °C
   * @returns {{level: string, description: string, score: number}}
   */
  WeatherMath.getDewPointComfort = function (dewPoint) {
    if (dewPoint == null)
      return { level: "unknown", description: "–", score: 50 };

    if (dewPoint < 10)
      return { level: "dry", description: "Trocken", score: 85 };
    if (dewPoint < 13)
      return { level: "comfortable", description: "Angenehm", score: 100 };
    if (dewPoint < 16)
      return {
        level: "slightly_humid",
        description: "Leicht feucht",
        score: 90,
      };
    if (dewPoint < 18)
      return { level: "humid", description: "Schwül", score: 70 };
    if (dewPoint < 21)
      return { level: "very_humid", description: "Sehr schwül", score: 50 };
    if (dewPoint < 24)
      return { level: "oppressive", description: "Drückend", score: 30 };
    return { level: "extreme", description: "Extrem schwül", score: 10 };
  };

  // ============================================
  // UV EXPOSURE CALCULATIONS
  // ============================================

  /**
   * Calculate time to sunburn based on UV index and skin type
   * Based on Fitzpatrick skin type scale
   * @param {number} uvIndex - UV index value
   * @param {number} skinType - Fitzpatrick skin type (1-6)
   * @returns {number} Minutes until sunburn without protection
   */
  WeatherMath.calculateSunburnTime = function (uvIndex, skinType = 2) {
    if (uvIndex == null || uvIndex <= 0) return Infinity;

    // MED (Minimal Erythemal Dose) values for different skin types in J/m²
    const medValues = {
      1: 200, // Very fair
      2: 250, // Fair
      3: 300, // Medium
      4: 450, // Olive
      5: 600, // Brown
      6: 800, // Dark
    };

    const med = medValues[skinType] || medValues[2];

    // UV Index of 1 ≈ 25 mW/m² of erythemal radiation
    // Time (min) = MED / (UV × 25 × 60/1000) = MED / (UV × 1.5)
    const timeMinutes = med / (uvIndex * 1.5);

    return Math.round(timeMinutes);
  };

  /**
   * Calculate recommended vitamin D exposure time
   * Time needed for adequate vitamin D synthesis
   * @param {number} uvIndex - UV index value
   * @param {number} skinType - Fitzpatrick skin type (1-6)
   * @returns {number} Minutes for adequate vitamin D
   */
  WeatherMath.calculateVitaminDTime = function (uvIndex, skinType = 2) {
    if (uvIndex == null || uvIndex < 3) return null; // Not enough UV for vitamin D

    // Approximate time for 1000 IU vitamin D
    // Darker skin needs more time
    const baseTime = 15; // minutes at UV 6 for skin type 2
    const skinMultiplier = {
      1: 0.7,
      2: 1.0,
      3: 1.3,
      4: 1.8,
      5: 2.5,
      6: 3.5,
    };

    const multiplier = skinMultiplier[skinType] || 1.0;
    const time = ((baseTime * 6) / uvIndex) * multiplier;

    return Math.round(time);
  };

  /**
   * Get UV risk level and protection recommendations
   * @param {number} uvIndex - UV index value
   * @returns {{level: string, risk: string, protection: string, color: string}}
   */
  WeatherMath.getUVRiskLevel = function (uvIndex) {
    if (uvIndex == null)
      return { level: "unknown", risk: "–", protection: "–", color: "#9E9E9E" };

    if (uvIndex < 3) {
      return {
        level: "low",
        risk: "Gering",
        protection: "Kein Schutz nötig",
        color: "#4CAF50",
        score: 100,
      };
    }
    if (uvIndex < 6) {
      return {
        level: "moderate",
        risk: "Mäßig",
        protection: "Sonnencreme LSF 15+",
        color: "#FFC107",
        score: 80,
      };
    }
    if (uvIndex < 8) {
      return {
        level: "high",
        risk: "Hoch",
        protection: "Sonnencreme, Hut, Schatten",
        color: "#FF9800",
        score: 55,
      };
    }
    if (uvIndex < 11) {
      return {
        level: "very_high",
        risk: "Sehr hoch",
        protection: "Voller Schutz, Mittagssonne meiden",
        color: "#F44336",
        score: 30,
      };
    }
    return {
      level: "extreme",
      risk: "Extrem",
      protection: "Draußen meiden 10-16 Uhr",
      color: "#9C27B0",
      score: 10,
    };
  };

  // ============================================
  // PRESSURE CALCULATIONS
  // ============================================

  /**
   * Calculate pressure change rate over time
   * @param {Array<{time: string, pressure: number}>} pressureData - Array of pressure readings
   * @param {number} hoursWindow - Hours to analyze (default: 3)
   * @returns {{change: number, rate: number, trend: string}}
   */
  WeatherMath.calculatePressureChange = function (
    pressureData,
    hoursWindow = 3,
  ) {
    if (!pressureData || pressureData.length < 2) {
      return { change: 0, rate: 0, trend: "stable" };
    }

    const now = Date.now();
    const windowMs = hoursWindow * 60 * 60 * 1000;

    // Filter to window
    const recentData = pressureData.filter((d) => {
      const time = new Date(d.time).getTime();
      return now - time <= windowMs;
    });

    if (recentData.length < 2) {
      return { change: 0, rate: 0, trend: "stable" };
    }

    // Sort by time
    recentData.sort((a, b) => new Date(a.time) - new Date(b.time));

    const firstPressure = recentData[0].pressure;
    const lastPressure = recentData[recentData.length - 1].pressure;
    const change = lastPressure - firstPressure;
    const rate = change / hoursWindow;

    let trend = "stable";
    if (change > 3) trend = "rising_fast";
    else if (change > 1) trend = "rising";
    else if (change < -3) trend = "falling_fast";
    else if (change < -1) trend = "falling";

    return {
      change: Math.round(change * 10) / 10,
      rate: Math.round(rate * 10) / 10,
      trend,
    };
  };

  /**
   * Calculate headache/migraine risk based on pressure changes
   * Research shows >5hPa change in 3h increases risk
   * @param {number} pressureChange - Pressure change in hPa over 3 hours
   * @returns {{risk: string, level: number, advice: string}}
   */
  WeatherMath.calculateHeadacheRisk = function (pressureChange) {
    const absChange = Math.abs(pressureChange);

    if (absChange < 3) {
      return {
        risk: "low",
        level: 1,
        advice: "Stabiler Luftdruck",
        color: "#4CAF50",
      };
    }
    if (absChange < 5) {
      return {
        risk: "moderate",
        level: 2,
        advice: "Leichte Druckschwankung",
        color: "#FFC107",
      };
    }
    if (absChange < 8) {
      return {
        risk: "elevated",
        level: 3,
        advice: "Erhöhtes Kopfschmerzrisiko",
        color: "#FF9800",
      };
    }
    return {
      risk: "high",
      level: 4,
      advice: "Starke Druckänderung - Migränerisiko",
      color: "#F44336",
    };
  };

  // ============================================
  // COMFORT CURVE CALCULATIONS
  // ============================================

  /**
   * Calculate temperature comfort score (100% optimal at 18-24°C)
   * @param {number} temp - Temperature in °C
   * @returns {number} Comfort score 0-100
   */
  WeatherMath.calculateTempComfortScore = function (temp) {
    if (temp == null) return 50;

    // Optimal range: 18-24°C
    if (temp >= 18 && temp <= 24) return 100;

    // Below optimal
    if (temp < 18) {
      if (temp < 0) return Math.max(0, 20 + temp * 2);
      if (temp < 10) return Math.max(30, 60 + (temp - 10) * 3);
      return Math.max(60, 100 - (18 - temp) * 5);
    }

    // Above optimal
    if (temp <= 28) return Math.max(70, 100 - (temp - 24) * 7.5);
    if (temp <= 32) return Math.max(40, 70 - (temp - 28) * 7.5);
    if (temp <= 36) return Math.max(15, 40 - (temp - 32) * 6.25);
    return Math.max(0, 15 - (temp - 36) * 5);
  };

  /**
   * Calculate humidity comfort score
   * Optimal: 40-60%
   * @param {number} humidity - Relative humidity %
   * @returns {number} Comfort score 0-100
   */
  WeatherMath.calculateHumidityComfortScore = function (humidity) {
    if (humidity == null) return 50;

    // Optimal range
    if (humidity >= 40 && humidity <= 60) return 100;

    // Too dry
    if (humidity < 40) {
      if (humidity < 20) return Math.max(40, 60 + (humidity - 20));
      return Math.max(60, 100 - (40 - humidity) * 2);
    }

    // Too humid
    if (humidity <= 70) return Math.max(70, 100 - (humidity - 60) * 3);
    if (humidity <= 80) return Math.max(50, 70 - (humidity - 70) * 2);
    if (humidity <= 90) return Math.max(30, 50 - (humidity - 80) * 2);
    return Math.max(10, 30 - (humidity - 90));
  };

  /**
   * Calculate wind comfort score
   * Light breeze (5-15 km/h) is pleasant
   * @param {number} windSpeed - Wind speed in km/h
   * @returns {number} Comfort score 0-100
   */
  WeatherMath.calculateWindComfortScore = function (windSpeed) {
    if (windSpeed == null) return 80;

    if (windSpeed <= 5) return 95;
    if (windSpeed <= 15) return 100;
    if (windSpeed <= 25) return 85;
    if (windSpeed <= 35) return 65;
    if (windSpeed <= 50) return 40;
    if (windSpeed <= 70) return 20;
    return Math.max(0, 20 - (windSpeed - 70) / 3);
  };

  // ============================================
  // SLEEP QUALITY CALCULATIONS
  // ============================================

  /**
   * Calculate sleep quality prediction based on conditions
   * Optimal sleep: 16-19°C, 40-60% humidity, quiet
   * @param {number} temp - Temperature in °C
   * @param {number} humidity - Relative humidity %
   * @param {number} pressure - Atmospheric pressure in hPa
   * @returns {{score: number, factors: object, advice: string}}
   */
  WeatherMath.calculateSleepQuality = function (temp, humidity, pressure) {
    let score = 100;
    const factors = {};

    // Temperature factor (optimal 16-19°C)
    if (temp != null) {
      if (temp >= 16 && temp <= 19) {
        factors.temperature = { score: 100, optimal: true };
      } else if (temp < 16) {
        const tempScore =
          temp < 10 ? 50 : Math.max(60, 100 - (16 - temp) * 6.67);
        factors.temperature = { score: tempScore, issue: "cold" };
      } else {
        const tempScore =
          temp > 26 ? 30 : Math.max(40, 100 - (temp - 19) * 8.57);
        factors.temperature = { score: tempScore, issue: "warm" };
      }
    }

    // Humidity factor
    if (humidity != null) {
      if (humidity >= 40 && humidity <= 60) {
        factors.humidity = { score: 100, optimal: true };
      } else {
        const humScore = this.calculateHumidityComfortScore(humidity);
        factors.humidity = {
          score: humScore,
          issue: humidity < 40 ? "dry" : "humid",
        };
      }
    }

    // Pressure stability factor
    if (pressure != null) {
      // Stable pressure is better for sleep
      factors.pressure = { score: 90, note: "stable" };
    }

    // Calculate weighted average
    const weights = { temperature: 0.5, humidity: 0.3, pressure: 0.2 };
    let totalWeight = 0;
    let weightedSum = 0;

    Object.keys(factors).forEach((key) => {
      if (weights[key]) {
        weightedSum += factors[key].score * weights[key];
        totalWeight += weights[key];
      }
    });

    score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 70;

    // Generate advice
    let advice = "";
    if (score >= 80) {
      advice = "Gute Schlafbedingungen";
    } else if (factors.temperature?.issue === "warm") {
      advice = "Gut lüften vor dem Schlafen";
    } else if (factors.temperature?.issue === "cold") {
      advice = "Warme Decke empfohlen";
    } else if (factors.humidity?.issue === "dry") {
      advice = "Luftbefeuchter kann helfen";
    } else if (factors.humidity?.issue === "humid") {
      advice = "Fenster schließen bei hoher Luftfeuchtigkeit";
    } else {
      advice = "Mäßige Schlafbedingungen";
    }

    return { score, factors, advice };
  };

  // ============================================
  // ACTIVITY RECOMMENDATIONS
  // ============================================

  /**
   * Check if conditions are suitable for specific activities
   * @param {object} conditions - Weather conditions
   * @returns {object} Activity recommendations
   */
  WeatherMath.getActivitySuitability = function (conditions) {
    const { temp, humidity, windSpeed, precipProb, uvIndex } = conditions;

    const activities = {
      running: {
        score: 0,
        suitable: false,
        note: "",
      },
      cycling: {
        score: 0,
        suitable: false,
        note: "",
      },
      hiking: {
        score: 0,
        suitable: false,
        note: "",
      },
      gardening: {
        score: 0,
        suitable: false,
        note: "",
      },
    };

    // Running
    let runScore = 100;
    if (temp < 5 || temp > 28) runScore -= 30;
    if (windSpeed > 30) runScore -= 20;
    if (precipProb > 40) runScore -= 25;
    if (humidity > 80) runScore -= 15;
    activities.running.score = Math.max(0, runScore);
    activities.running.suitable = runScore >= 60;
    activities.running.note =
      runScore >= 80
        ? "Ideal"
        : runScore >= 60
          ? "Geeignet"
          : "Nicht empfohlen";

    // Cycling (more wind-sensitive)
    let cycleScore = 100;
    if (temp < 8 || temp > 30) cycleScore -= 25;
    if (windSpeed > 25) cycleScore -= 35;
    if (precipProb > 30) cycleScore -= 30;
    activities.cycling.score = Math.max(0, cycleScore);
    activities.cycling.suitable = cycleScore >= 55;
    activities.cycling.note =
      cycleScore >= 75 ? "Ideal" : cycleScore >= 55 ? "Möglich" : "Schwierig";

    // Hiking
    let hikeScore = 100;
    if (temp < 10 || temp > 26) hikeScore -= 20;
    if (precipProb > 50) hikeScore -= 40;
    if (uvIndex > 7) hikeScore -= 15;
    activities.hiking.score = Math.max(0, hikeScore);
    activities.hiking.suitable = hikeScore >= 50;
    activities.hiking.note =
      hikeScore >= 70
        ? "Gute Bedingungen"
        : hikeScore >= 50
          ? "Mit Vorsicht"
          : "Nicht ideal";

    // Gardening
    let gardenScore = 100;
    if (temp < 12 || temp > 28) gardenScore -= 25;
    if (precipProb > 60) gardenScore -= 30;
    if (uvIndex > 6) gardenScore -= 20;
    if (windSpeed > 35) gardenScore -= 20;
    activities.gardening.score = Math.max(0, gardenScore);
    activities.gardening.suitable = gardenScore >= 55;
    activities.gardening.note =
      gardenScore >= 75
        ? "Perfekt"
        : gardenScore >= 55
          ? "Geeignet"
          : "Besser verschieben";

    return activities;
  };

  // ============================================
  // CONTEXTUAL COLOR ENGINE FOR CHARTS
  // ============================================

  /**
   * Get contextual color based on metric type and value
   * Returns both solid color and gradient for sleek charts
   * @param {string} type - Metric type: 'uv', 'temp', 'rain', 'humidity', 'wind', 'pressure'
   * @param {number} value - The metric value
   * @returns {object} { color, gradient, glow }
   */
  WeatherMath.getHealthColorByValue = function (type, value) {
    const colors = {
      // UV Index - Green to Violet scale
      uv: () => {
        if (value <= 2)
          return {
            color: "#4ade80",
            gradient: "linear-gradient(to top, #22c55e, #4ade80)",
            glow: "rgba(74, 222, 128, 0.4)",
          };
        if (value <= 5)
          return {
            color: "#fbbf24",
            gradient: "linear-gradient(to top, #f59e0b, #fbbf24)",
            glow: "rgba(251, 191, 36, 0.4)",
          };
        if (value <= 7)
          return {
            color: "#fb923c",
            gradient: "linear-gradient(to top, #f97316, #fb923c)",
            glow: "rgba(251, 146, 60, 0.4)",
          };
        if (value <= 10)
          return {
            color: "#ef4444",
            gradient: "linear-gradient(to top, #dc2626, #ef4444)",
            glow: "rgba(239, 68, 68, 0.4)",
          };
        return {
          color: "#a855f7",
          gradient: "linear-gradient(to top, #9333ea, #a855f7)",
          glow: "rgba(168, 85, 247, 0.5)",
        };
      },

      // Temperature - Blue to Red divergence
      temp: () => {
        if (value < 0)
          return {
            color: "#60a5fa",
            gradient: "linear-gradient(to top, #3b82f6, #60a5fa)",
            glow: "rgba(96, 165, 250, 0.4)",
          };
        if (value < 10)
          return {
            color: "#22d3ee",
            gradient: "linear-gradient(to top, #06b6d4, #22d3ee)",
            glow: "rgba(34, 211, 238, 0.4)",
          };
        if (value < 20)
          return {
            color: "#4ade80",
            gradient: "linear-gradient(to top, #22c55e, #4ade80)",
            glow: "rgba(74, 222, 128, 0.4)",
          };
        if (value < 28)
          return {
            color: "#fbbf24",
            gradient: "linear-gradient(to top, #f59e0b, #fbbf24)",
            glow: "rgba(251, 191, 36, 0.4)",
          };
        if (value < 35)
          return {
            color: "#fb923c",
            gradient: "linear-gradient(to top, #f97316, #fb923c)",
            glow: "rgba(251, 146, 60, 0.4)",
          };
        return {
          color: "#ef4444",
          gradient: "linear-gradient(to top, #dc2626, #ef4444)",
          glow: "rgba(239, 68, 68, 0.5)",
        };
      },

      // Rain - Light to deep blue
      rain: () => {
        if (value === 0)
          return {
            color: "#4ade80",
            gradient: "linear-gradient(to top, #22c55e, #4ade80)",
            glow: "rgba(74, 222, 128, 0.3)",
          };
        if (value < 20)
          return {
            color: "#38bdf8",
            gradient: "linear-gradient(to top, #0ea5e9, #38bdf8)",
            glow: "rgba(56, 189, 248, 0.4)",
          };
        if (value < 50)
          return {
            color: "#60a5fa",
            gradient: "linear-gradient(to top, #3b82f6, #60a5fa)",
            glow: "rgba(96, 165, 250, 0.4)",
          };
        if (value < 80)
          return {
            color: "#3b82f6",
            gradient: "linear-gradient(to top, #2563eb, #3b82f6)",
            glow: "rgba(59, 130, 246, 0.5)",
          };
        return {
          color: "#1d4ed8",
          gradient: "linear-gradient(to top, #1e40af, #1d4ed8)",
          glow: "rgba(29, 78, 216, 0.5)",
        };
      },

      // Humidity - Cyan scale
      humidity: () => {
        if (value < 30)
          return {
            color: "#fb923c",
            gradient: "linear-gradient(to top, #f97316, #fb923c)",
            glow: "rgba(251, 146, 60, 0.3)",
          };
        if (value < 60)
          return {
            color: "#4ade80",
            gradient: "linear-gradient(to top, #22c55e, #4ade80)",
            glow: "rgba(74, 222, 128, 0.4)",
          };
        if (value < 80)
          return {
            color: "#38bdf8",
            gradient: "linear-gradient(to top, #0ea5e9, #38bdf8)",
            glow: "rgba(56, 189, 248, 0.4)",
          };
        return {
          color: "#3b82f6",
          gradient: "linear-gradient(to top, #2563eb, #3b82f6)",
          glow: "rgba(59, 130, 246, 0.5)",
        };
      },

      // Wind - Teal to purple
      wind: () => {
        if (value < 10)
          return {
            color: "#4ade80",
            gradient: "linear-gradient(to top, #22c55e, #4ade80)",
            glow: "rgba(74, 222, 128, 0.3)",
          };
        if (value < 25)
          return {
            color: "#22d3ee",
            gradient: "linear-gradient(to top, #06b6d4, #22d3ee)",
            glow: "rgba(34, 211, 238, 0.4)",
          };
        if (value < 50)
          return {
            color: "#fbbf24",
            gradient: "linear-gradient(to top, #f59e0b, #fbbf24)",
            glow: "rgba(251, 191, 36, 0.4)",
          };
        if (value < 75)
          return {
            color: "#fb923c",
            gradient: "linear-gradient(to top, #f97316, #fb923c)",
            glow: "rgba(251, 146, 60, 0.5)",
          };
        return {
          color: "#ef4444",
          gradient: "linear-gradient(to top, #dc2626, #ef4444)",
          glow: "rgba(239, 68, 68, 0.5)",
        };
      },

      // Pressure - Purple-blue
      pressure: () => {
        if (value < 1000)
          return {
            color: "#f87171",
            gradient: "linear-gradient(to top, #ef4444, #f87171)",
            glow: "rgba(248, 113, 113, 0.3)",
          };
        if (value < 1010)
          return {
            color: "#fbbf24",
            gradient: "linear-gradient(to top, #f59e0b, #fbbf24)",
            glow: "rgba(251, 191, 36, 0.3)",
          };
        if (value < 1020)
          return {
            color: "#4ade80",
            gradient: "linear-gradient(to top, #22c55e, #4ade80)",
            glow: "rgba(74, 222, 128, 0.4)",
          };
        if (value < 1030)
          return {
            color: "#38bdf8",
            gradient: "linear-gradient(to top, #0ea5e9, #38bdf8)",
            glow: "rgba(56, 189, 248, 0.4)",
          };
        return {
          color: "#a78bfa",
          gradient: "linear-gradient(to top, #8b5cf6, #a78bfa)",
          glow: "rgba(167, 139, 250, 0.4)",
        };
      },

      // Visibility - Green scale (higher is better)
      visibility: () => {
        if (value < 1)
          return {
            color: "#ef4444",
            gradient: "linear-gradient(to top, #dc2626, #ef4444)",
            glow: "rgba(239, 68, 68, 0.4)",
          };
        if (value < 4)
          return {
            color: "#fb923c",
            gradient: "linear-gradient(to top, #f97316, #fb923c)",
            glow: "rgba(251, 146, 60, 0.4)",
          };
        if (value < 10)
          return {
            color: "#fbbf24",
            gradient: "linear-gradient(to top, #f59e0b, #fbbf24)",
            glow: "rgba(251, 191, 36, 0.4)",
          };
        if (value < 20)
          return {
            color: "#a3e635",
            gradient: "linear-gradient(to top, #84cc16, #a3e635)",
            glow: "rgba(163, 230, 53, 0.4)",
          };
        return {
          color: "#4ade80",
          gradient: "linear-gradient(to top, #22c55e, #4ade80)",
          glow: "rgba(74, 222, 128, 0.4)",
        };
      },

      // Clouds - Gray scale
      clouds: () => {
        if (value < 20)
          return {
            color: "#4ade80",
            gradient: "linear-gradient(to top, #22c55e, #4ade80)",
            glow: "rgba(74, 222, 128, 0.3)",
          };
        if (value < 50)
          return {
            color: "#94a3b8",
            gradient: "linear-gradient(to top, #64748b, #94a3b8)",
            glow: "rgba(148, 163, 184, 0.3)",
          };
        if (value < 80)
          return {
            color: "#64748b",
            gradient: "linear-gradient(to top, #475569, #64748b)",
            glow: "rgba(100, 116, 139, 0.4)",
          };
        return {
          color: "#475569",
          gradient: "linear-gradient(to top, #334155, #475569)",
          glow: "rgba(71, 85, 105, 0.4)",
        };
      },

      // Default - Green
      default: () => ({
        color: "#4ade80",
        gradient: "linear-gradient(to top, #22c55e, #4ade80)",
        glow: "rgba(74, 222, 128, 0.4)",
      }),
    };

    const getColor = colors[type] || colors.default;
    return getColor();
  };

  // Export to global scope
  global.WeatherMath = WeatherMath;

  // Also support ES6 module syntax if available
  if (typeof module !== "undefined" && module.exports) {
    module.exports = WeatherMath;
  }
})(typeof window !== "undefined" ? window : global);
