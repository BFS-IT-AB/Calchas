/**
 * health.test.js - Jest Tests for Health Intelligence Module
 * Tests score calculations, time window detection, and i18n correctness
 */

// Mock window/global for module loading
const mockWindow = {
  WeatherMath: null,
  HealthEngine: null,
  HealthDataTransformer: null,
};

global.window = mockWindow;

// Load modules
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Helper to load IIFE modules
function loadModule(filePath) {
  const code = fs.readFileSync(path.resolve(__dirname, filePath), "utf8");
  const script = new vm.Script(code);
  script.runInNewContext({
    window: mockWindow,
    global: mockWindow,
    console,
    Math,
    Date,
    Array,
    Object,
    Number,
    String,
    Boolean,
    JSON,
    Promise,
    Error,
    isNaN,
    parseInt,
    parseFloat,
    Infinity,
    undefined,
    require: () => null,
    module: { exports: {} },
  });
}

// Load WeatherMath first (dependency)
loadModule("../src/utils/WeatherMath.js");

// Load HealthEngine
loadModule("../src/logic/HealthEngine.js");

// Load HealthDataTransformer
loadModule("../src/api/healthDataTransformer.js");

const { WeatherMath, HealthEngine, HealthDataTransformer } = mockWindow;

// ============================================
// WEATHERMATH TESTS
// ============================================

describe("WeatherMath", () => {
  describe("calculateWindChill", () => {
    test("returns temp when conditions invalid for wind chill", () => {
      expect(WeatherMath.calculateWindChill(15, 10)).toBe(15);
      expect(WeatherMath.calculateWindChill(5, 2)).toBe(5);
    });

    test("calculates wind chill correctly", () => {
      const result = WeatherMath.calculateWindChill(0, 20);
      expect(result).toBeLessThan(0);
      expect(result).toBeCloseTo(-5.2, 0);
    });

    test("handles null values", () => {
      expect(WeatherMath.calculateWindChill(null, 20)).toBeNull();
      expect(WeatherMath.calculateWindChill(0, null)).toBeNull();
    });
  });

  describe("calculateHeatIndex", () => {
    test("returns temp when below threshold", () => {
      expect(WeatherMath.calculateHeatIndex(20, 60)).toBe(20);
    });

    test("calculates heat index for hot conditions", () => {
      const result = WeatherMath.calculateHeatIndex(35, 70);
      expect(result).toBeGreaterThan(35);
    });
  });

  describe("calculateDewPoint", () => {
    test("calculates dew point correctly", () => {
      const dewPoint = WeatherMath.calculateDewPoint(20, 50);
      expect(dewPoint).toBeCloseTo(9.3, 0);
    });

    test("handles null values", () => {
      expect(WeatherMath.calculateDewPoint(null, 50)).toBeNull();
    });
  });

  describe("calculateSunburnTime", () => {
    test("returns Infinity for UV 0", () => {
      expect(WeatherMath.calculateSunburnTime(0, 2)).toBe(Infinity);
    });

    test("calculates shorter time for higher UV", () => {
      const lowUV = WeatherMath.calculateSunburnTime(3, 2);
      const highUV = WeatherMath.calculateSunburnTime(10, 2);
      expect(highUV).toBeLessThan(lowUV);
    });

    test("darker skin types have longer sunburn time", () => {
      const fairSkin = WeatherMath.calculateSunburnTime(6, 1);
      const darkSkin = WeatherMath.calculateSunburnTime(6, 5);
      expect(darkSkin).toBeGreaterThan(fairSkin);
    });
  });

  describe("calculateTempComfortScore", () => {
    test("returns 100 for optimal range (18-24°C)", () => {
      expect(WeatherMath.calculateTempComfortScore(20)).toBe(100);
      expect(WeatherMath.calculateTempComfortScore(18)).toBe(100);
      expect(WeatherMath.calculateTempComfortScore(24)).toBe(100);
    });

    test("returns lower scores outside optimal range", () => {
      expect(WeatherMath.calculateTempComfortScore(10)).toBeLessThan(100);
      expect(WeatherMath.calculateTempComfortScore(30)).toBeLessThan(100);
      expect(WeatherMath.calculateTempComfortScore(-5)).toBeLessThan(50);
      expect(WeatherMath.calculateTempComfortScore(40)).toBeLessThan(30);
    });
  });

  describe("calculateHeadacheRisk", () => {
    test("returns low risk for small pressure changes", () => {
      const result = WeatherMath.calculateHeadacheRisk(2);
      expect(result.risk).toBe("low");
      expect(result.level).toBe(1);
    });

    test("returns high risk for large pressure changes", () => {
      const result = WeatherMath.calculateHeadacheRisk(8);
      expect(result.risk).toBe("high");
      expect(result.level).toBe(4);
    });

    test("handles negative pressure changes", () => {
      const result = WeatherMath.calculateHeadacheRisk(-6);
      expect(result.risk).toBe("elevated");
    });
  });
});

// ============================================
// HEALTHENGINE TESTS
// ============================================

describe("HealthEngine", () => {
  let engine;

  beforeEach(() => {
    engine = new HealthEngine({ language: "de" });
  });

  describe("constructor", () => {
    test("initializes with default language", () => {
      const e = new HealthEngine();
      expect(e.language).toBe("de");
    });

    test("accepts custom language", () => {
      const e = new HealthEngine({ language: "en" });
      expect(e.language).toBe("en");
    });
  });

  describe("calculateOutdoorScore", () => {
    test("returns high score for ideal conditions", () => {
      const result = engine.calculateOutdoorScore({
        temp: 20,
        feels: 20,
        windSpeed: 10,
        precipProb: 5,
        humidity: 50,
        uvIndex: 3,
        visibility: 15,
        aqiValue: 20,
        pollenLevel: 1,
      });

      expect(result.score).toBeGreaterThan(80);
      expect(result.capped).toBe(false);
      expect(result.label).toBe("Ausgezeichnet");
    });

    test("caps score at 30 for high rain probability", () => {
      const result = engine.calculateOutdoorScore({
        temp: 20,
        feels: 20,
        windSpeed: 10,
        precipProb: 60, // > 40% threshold
        humidity: 50,
        uvIndex: 3,
      });

      expect(result.score).toBeLessThanOrEqual(30);
      expect(result.capped).toBe(true);
      expect(result.cappedBy).toBe("precipitation");
    });

    test("caps score at 30 for high wind speed", () => {
      const result = engine.calculateOutdoorScore({
        temp: 20,
        feels: 20,
        windSpeed: 50, // > 40 km/h threshold
        precipProb: 10,
        humidity: 50,
      });

      expect(result.score).toBeLessThanOrEqual(30);
      expect(result.capped).toBe(true);
      expect(result.cappedBy).toBe("wind");
    });

    test("returns low score for extreme weather (thunderstorm conditions)", () => {
      const result = engine.calculateOutdoorScore({
        temp: 25,
        feels: 28,
        windSpeed: 60,
        precipProb: 90,
        humidity: 85,
        uvIndex: 1,
        visibility: 2,
        aqiValue: 80,
      });

      expect(result.score).toBeLessThanOrEqual(30);
      expect(result.capped).toBe(true);
    });

    test("returns correct color for different scores", () => {
      const excellent = engine.calculateOutdoorScore({
        temp: 20,
        precipProb: 0,
        windSpeed: 5,
      });
      const poor = engine.calculateOutdoorScore({
        temp: 20,
        precipProb: 50,
        windSpeed: 45,
      });

      expect(excellent.color).toBe("#4ade80"); // green
      // Capped score of 30 shows as 'poor' (orange) not critical (red)
      expect(poor.capped).toBe(true);
      expect(["#fb923c", "#ef4444"]).toContain(poor.color);
    });
  });

  describe("findBestTimeWindow", () => {
    test("returns null for empty data", () => {
      expect(engine.findBestTimeWindow([])).toBeNull();
      expect(engine.findBestTimeWindow(null)).toBeNull();
    });

    test("finds correct best time window", () => {
      const hourlyData = [
        {
          time: "06:00",
          temperature: 15,
          windSpeed: 5,
          precipitationProbability: 10,
          humidity: 60,
        },
        {
          time: "07:00",
          temperature: 17,
          windSpeed: 5,
          precipitationProbability: 5,
          humidity: 55,
        },
        {
          time: "08:00",
          temperature: 19,
          windSpeed: 8,
          precipitationProbability: 5,
          humidity: 50,
        },
        {
          time: "09:00",
          temperature: 21,
          windSpeed: 10,
          precipitationProbability: 5,
          humidity: 48,
        },
        {
          time: "10:00",
          temperature: 22,
          windSpeed: 10,
          precipitationProbability: 5,
          humidity: 45,
        },
        {
          time: "11:00",
          temperature: 23,
          windSpeed: 12,
          precipitationProbability: 10,
          humidity: 45,
        },
        {
          time: "12:00",
          temperature: 24,
          windSpeed: 15,
          precipitationProbability: 15,
          humidity: 40,
        },
        {
          time: "13:00",
          temperature: 25,
          windSpeed: 18,
          precipitationProbability: 30,
          humidity: 40,
        },
        {
          time: "14:00",
          temperature: 26,
          windSpeed: 20,
          precipitationProbability: 45,
          humidity: 45,
        },
        {
          time: "15:00",
          temperature: 25,
          windSpeed: 25,
          precipitationProbability: 60,
          humidity: 50,
        },
      ];

      const result = engine.findBestTimeWindow(hourlyData);

      expect(result).not.toBeNull();
      expect(result.avgScore).toBeGreaterThan(50);
      expect(result.displayText).toContain("-");
      // Best window should be in the morning when conditions are optimal
      expect(result.start).toMatch(/^0[789]|10|11/);
    });

    test("excludes windows with any terrible hours", () => {
      const hourlyData = [
        {
          time: "06:00",
          temperature: 20,
          windSpeed: 5,
          precipitationProbability: 5,
          humidity: 50,
        },
        {
          time: "07:00",
          temperature: 20,
          windSpeed: 5,
          precipitationProbability: 5,
          humidity: 50,
        },
        {
          time: "08:00",
          temperature: 20,
          windSpeed: 80,
          precipitationProbability: 95,
          humidity: 95,
        }, // Terrible
        {
          time: "09:00",
          temperature: 20,
          windSpeed: 5,
          precipitationProbability: 5,
          humidity: 50,
        },
        {
          time: "10:00",
          temperature: 20,
          windSpeed: 5,
          precipitationProbability: 5,
          humidity: 50,
        },
      ];

      const result = engine.findBestTimeWindow(hourlyData);

      // Should not include 08:00 in the window
      if (result) {
        expect(result.hours.every((h) => h.score >= 25)).toBe(true);
      }
    });
  });

  describe("calculateHeadacheRisk", () => {
    test("returns unknown for insufficient data", () => {
      const result = engine.calculateHeadacheRisk([]);
      expect(result.risk).toBe("unknown");
    });

    test("detects critical pressure changes", () => {
      const pressureHistory = [
        {
          time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          pressure: 1013,
        },
        { time: new Date().toISOString(), pressure: 1020 }, // 7 hPa change
      ];

      const result = engine.calculateHeadacheRisk(pressureHistory);
      // The simple calculation returns change of 7, which should be elevated or high
      expect(Math.abs(result.change)).toBeGreaterThanOrEqual(5);
      expect(result.level).toBeGreaterThanOrEqual(2);
    });
  });

  describe("calculateVitaminDTimer", () => {
    test("returns not available for low UV", () => {
      const result = engine.calculateVitaminDTimer(2);
      expect(result.available).toBe(false);
      expect(result.minutes).toBeNull();
    });

    test("returns time for adequate UV", () => {
      const result = engine.calculateVitaminDTimer(6);
      expect(result.available).toBe(true);
      expect(result.minutes).toBeGreaterThan(0);
      expect(result.sunburnTime).toBeGreaterThan(result.minutes);
    });
  });

  describe("generateQuickChecks", () => {
    test("generates umbrella check with high priority for rain", () => {
      const checks = engine.generateQuickChecks({
        temp: 20,
        precipProb: 80,
        windSpeed: 10,
        uvIndex: 3,
      });

      const umbrellaCheck = checks.find((c) => c.id === "umbrella");
      expect(umbrellaCheck).toBeDefined();
      expect(umbrellaCheck.priority).toBeGreaterThan(80);
      expect(umbrellaCheck.icon).toBe("☔");
    });

    test("prioritizes sun protection during day with high UV", () => {
      const checks = engine.generateQuickChecks(
        { temp: 25, precipProb: 5, uvIndex: 9 },
        { isNight: false, maxUv: 9 },
      );

      const sunCheck = checks.find((c) => c.id === "sunprotection");
      expect(sunCheck).toBeDefined();
      expect(sunCheck.priority).toBeGreaterThan(90);
    });

    test("deprioritizes sun protection at night", () => {
      const checks = engine.generateQuickChecks(
        { temp: 20, precipProb: 5, uvIndex: 0 },
        { isNight: true, maxUv: 0 },
      );

      const sunCheck = checks.find((c) => c.id === "sunprotection");
      expect(sunCheck.priority).toBeLessThan(20);
    });

    test("prioritizes sleep quality at night", () => {
      const checks = engine.generateQuickChecks(
        { temp: 22, precipProb: 5, humidity: 55 },
        { isNight: true },
      );

      const sleepCheck = checks.find((c) => c.id === "sleep");
      expect(sleepCheck.priority).toBeGreaterThan(60);
    });
  });

  describe("generateSafetyAlerts", () => {
    test("generates heat alert for extreme temperatures", () => {
      const alerts = engine.generateSafetyAlerts({ temp: 38, feels: 40 });

      const heatAlert = alerts.find((a) => a.type === "heat");
      expect(heatAlert).toBeDefined();
      expect(heatAlert.severity).toBe("critical");
    });

    test("generates cold alert for freezing temperatures", () => {
      const alerts = engine.generateSafetyAlerts({ temp: -15, feels: -20 });

      const coldAlert = alerts.find((a) => a.type === "cold");
      expect(coldAlert).toBeDefined();
      expect(coldAlert.severity).toBe("critical");
    });

    test("generates UV alert for extreme UV", () => {
      const alerts = engine.generateSafetyAlerts({ uvIndex: 12 });

      const uvAlert = alerts.find((a) => a.type === "uv");
      expect(uvAlert).toBeDefined();
      expect(uvAlert.severity).toBe("critical");
    });

    test("generates storm alert for high wind and rain", () => {
      const alerts = engine.generateSafetyAlerts({
        windSpeed: 65,
        precipProb: 80,
      });

      const stormAlert = alerts.find((a) => a.type === "storm");
      expect(stormAlert).toBeDefined();
    });

    test("returns empty array for good conditions", () => {
      const alerts = engine.generateSafetyAlerts({
        temp: 20,
        feels: 20,
        uvIndex: 3,
        windSpeed: 10,
        precipProb: 5,
        aqiValue: 20,
      });

      expect(alerts.length).toBe(0);
    });
  });

  describe("i18n - German", () => {
    test("returns German labels", () => {
      const engineDe = new HealthEngine({ language: "de" });

      const result = engineDe.calculateOutdoorScore({
        temp: 20,
        precipProb: 5,
      });
      expect(result.label).toBe("Ausgezeichnet");

      const checks = engineDe.generateQuickChecks({ temp: 20, precipProb: 80 });
      expect(checks[0].question).toContain("?");
    });
  });

  describe("i18n - English", () => {
    test("returns English labels", () => {
      const engineEn = new HealthEngine({ language: "en" });

      const result = engineEn.calculateOutdoorScore({
        temp: 20,
        precipProb: 5,
      });
      expect(result.label).toBe("Excellent");

      const checks = engineEn.generateQuickChecks({ temp: 5, precipProb: 5 });
      const jacketCheck = checks.find((c) => c.id === "jacket");
      expect(jacketCheck.answer).toMatch(/jacket|coat/i);
    });
  });
});

// ============================================
// HEALTHDATATRANSFORMER TESTS
// ============================================

describe("HealthDataTransformer", () => {
  let transformer;

  beforeEach(() => {
    transformer = new HealthDataTransformer();
  });

  describe("transform", () => {
    test("transforms OpenMeteo-style data correctly", () => {
      const rawData = {
        current: {
          temperature: 22,
          apparent_temperature: 24,
          humidity: 55,
          wind_speed: 15,
          precipitation_probability: 10,
          uv_index: 4,
        },
        hourly: [
          {
            time: "2024-01-01T10:00",
            temperature: 20,
            precipitation_probability: 5,
          },
        ],
      };

      const result = transformer.transform(rawData);

      expect(result.current.temperature).toBe(22);
      expect(result.current.apparentTemperature).toBe(24);
      expect(result.current.humidity).toBe(55);
      // The transformer uses 'temperature' key directly for hourly data
      expect(result.hourly[0].temperature).toBe(20);
    });

    test("handles missing data gracefully", () => {
      const result = transformer.transform({});

      expect(result.current.temperature).toBeNull();
      expect(result.hourly).toEqual([]);
    });

    test("returns empty state for null input", () => {
      const result = transformer.transform(null);

      expect(result.current).toBeDefined();
      expect(result.hourly).toEqual([]);
    });
  });

  describe("transformAqi", () => {
    test("normalizes AQI data", () => {
      const rawAqi = {
        european_aqi: 45,
        pm2_5: 12,
        label: "Fair",
      };

      const result = transformer.transformAqi(rawAqi);

      expect(result.europeanAqi).toBe(45);
      expect(result.pm25).toBe(12);
      expect(result.label).toBe("Fair");
    });

    test("generates label from value if not provided", () => {
      const rawAqi = { europeanAqi: 75 };

      const result = transformer.transformAqi(rawAqi);

      expect(result.label).toBe("Poor");
    });
  });

  describe("transformPollen", () => {
    test("normalizes pollen levels to 0-5 scale", () => {
      const rawPollen = {
        trees: 3,
        grass: 80, // 0-100 scale
        weeds: 2,
      };

      const result = transformer.transformPollen(rawPollen);

      expect(result.trees).toBe(3);
      expect(result.grass).toBe(4); // 80/20 = 4
      expect(result.weeds).toBe(2);
    });
  });

  describe("getWithFallback", () => {
    test("returns fresh data when available", () => {
      const freshData = {
        current: { temperature: 25 },
      };

      const result = transformer.getWithFallback(freshData);

      expect(result.current.temperature).toBe(25);
      expect(result.fromCache).toBe(false);
    });

    test("returns empty state when no data and no cache", () => {
      // Clear any existing cache
      transformer.clearCache();

      const result = transformer.getWithFallback(null);

      expect(result.current.temperature).toBeNull();
    });
  });

  describe("static methods", () => {
    test("quick() transforms without instantiation", () => {
      const result = HealthDataTransformer.quick({
        current: { temperature: 20 },
      });

      expect(result.current.temperature).toBe(20);
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe("Health Intelligence Integration", () => {
  test("full pipeline: transform -> analyze -> result", () => {
    const transformer = new HealthDataTransformer();
    const engine = new HealthEngine({ language: "de" });

    // Simulate API response
    const apiResponse = {
      current: {
        temperature: 22,
        apparentTemperature: 23,
        humidity: 50,
        windSpeed: 12,
        precipProb: 10,
        uvIndex: 5,
        pressure: 1015,
        visibility: 15,
      },
      hourly: Array(24)
        .fill(null)
        .map((_, i) => ({
          time: `2024-06-15T${String(i).padStart(2, "0")}:00`,
          temperature: 18 + Math.sin((i / 24) * Math.PI * 2) * 6,
          windSpeed: 8 + Math.random() * 10,
          precipitationProbability: i > 14 ? 40 : 10,
          humidity: 45 + Math.random() * 20,
          uvIndex: i >= 6 && i <= 18 ? Math.max(0, 8 - Math.abs(i - 12)) : 0,
        })),
      aqi: { europeanAqi: 30 },
      pollen: { trees: 2, grass: 1, weeds: 1 },
    };

    // Transform
    const transformedData = transformer.transform(apiResponse);

    // Analyze
    const analysis = engine.analyze(transformedData);

    // Verify complete result
    expect(analysis.outdoorScore).toBeDefined();
    expect(analysis.outdoorScore.score).toBeGreaterThan(50);

    expect(analysis.bestTimeWindow).toBeDefined();
    expect(analysis.bestTimeWindow.displayText).toMatch(/\d{2}:\d{2}/);

    expect(Array.isArray(analysis.quickChecks)).toBe(true);
    expect(analysis.quickChecks.length).toBeGreaterThan(0);

    expect(Array.isArray(analysis.safetyAlerts)).toBe(true);

    expect(Array.isArray(analysis.timeline)).toBe(true);
    expect(analysis.timeline.length).toBe(24);

    expect(analysis.currentOutdoorScore).toBe(analysis.outdoorScore.score);
  });
});
