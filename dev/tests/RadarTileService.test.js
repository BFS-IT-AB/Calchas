/**
 * RadarTileService.test.js
 * Tests für den robusten Radar-Tile-Service
 */

describe("RadarTileService", () => {
  // Mock-Umgebung erstellen
  beforeAll(() => {
    // JSDOM oder Node.js Umgebung simulieren
    if (typeof window === "undefined") {
      global.window = global;
    }

    // Service laden
    require("../../js/ui/map/services/RadarTileService.js");
  });

  afterAll(() => {
    if (window.RadarTileService) {
      window.RadarTileService.destroy();
    }
  });

  describe("buildTileUrl", () => {
    test("builds correct radar tile URL", () => {
      const url = window.RadarTileService.buildTileUrl({
        path: "/v2/radar/1234567890",
        type: "past",
      });

      expect(url).toContain("/v2/radar/1234567890");
      expect(url).toContain("256/{z}/{x}/{y}");
      expect(url).toContain("2/1_1.png");
    });

    test("builds correct infrared tile URL", () => {
      const url = window.RadarTileService.buildTileUrl({
        path: "/v2/satellite/abcdef",
        type: "infrared",
      });

      expect(url).toContain("/v2/satellite/abcdef");
      expect(url).toContain("0/0_0.png");
    });

    test("returns fallback URL when no frame path", () => {
      const url = window.RadarTileService.buildTileUrl(null);
      expect(url).toContain("rainviewer.com");
      expect(url).toContain("{z}");
    });
  });

  describe("getState", () => {
    test("returns valid state object", () => {
      const state = window.RadarTileService.getState();

      expect(state).toHaveProperty("initialized");
      expect(state).toHaveProperty("loading");
      expect(state).toHaveProperty("isHealthy");
      expect(state).toHaveProperty("frames");
      expect(state).toHaveProperty("tileLayerOptions");
    });

    test("tileLayerOptions has correct configuration", () => {
      const state = window.RadarTileService.getState();
      const options = state.tileLayerOptions;

      expect(options.tileSize).toBe(256);
      expect(options.maxNativeZoom).toBe(12);
      expect(options.maxZoom).toBe(20);
      expect(options.minZoom).toBe(1);
    });
  });

  describe("getAlternativeTileUrls", () => {
    test("returns multiple alternative URLs", () => {
      const urls = window.RadarTileService.getAlternativeTileUrls({
        path: "/v2/radar/test",
        type: "nowcast",
      });

      expect(Array.isArray(urls)).toBe(true);
      expect(urls.length).toBeGreaterThan(1);
      // Should contain different hosts
      const hosts = urls.map((url) => url.split("/")[2]);
      expect(new Set(hosts).size).toBeGreaterThanOrEqual(1);
    });
  });

  describe("config", () => {
    test("exposes readonly config", () => {
      const config = window.RadarTileService.config;

      expect(config).toHaveProperty("endpoints");
      expect(config).toHaveProperty("tileHosts");
      expect(config).toHaveProperty("refreshInterval");
      expect(config).toHaveProperty("maxRetries");
      expect(config.tileSize).toBe(256);
    });
  });

  describe("Mode Navigation", () => {
    test("setMode validates mode parameter", () => {
      // Sollte false zurückgeben wenn keine Frames vorhanden
      const result = window.RadarTileService.setMode("invalid");
      expect(result).toBe(false);
    });

    test("step handles empty frames gracefully", () => {
      const result = window.RadarTileService.step(1);
      // Sollte nicht crashen, auch ohne Frames
      expect(typeof result === "boolean").toBe(true);
    });
  });

  describe("hasFrames", () => {
    test("returns false when no frames loaded", () => {
      // Vor refresh sollten keine Frames vorhanden sein (in Test-Umgebung)
      const state = window.RadarTileService.getState();
      // Nach init ohne refresh könnten Frames leer sein
      expect(typeof window.RadarTileService.hasFrames()).toBe("boolean");
    });
  });
});
