const { WeatherMap } = require("../../js/ui/shared/features.js");

describe("WeatherMap RainViewer tile URLs", () => {
  const createMap = () => {
    const instance = new WeatherMap("test-map");
    instance.rainViewerHost = "https://tilecache.example.com";
    return instance;
  };

  test("builds radar tile with smoothing and snow colors (256px)", () => {
    const map = createMap();
    const url = map._buildRainViewerTileUrl({
      path: "/v2/radar/123456",
      type: "past",
    });
    // Geändert auf 256 für konsistentes Tile-Verhalten auf allen Zoomlevels
    expect(url).toBe(
      "https://tilecache.example.com/v2/radar/123456/256/{z}/{x}/{y}/2/1_1.png",
    );
  });

  test("builds satellite tile with neutral palette", () => {
    const map = createMap();
    const url = map._buildRainViewerTileUrl({
      path: "/v2/satellite/abcdef",
      type: "infrared",
    });
    expect(url).toBe(
      "https://tilecache.example.com/v2/satellite/abcdef/256/{z}/{x}/{y}/0/0_0.png",
    );
  });

  test("returns valid fallback URL when no frame path", () => {
    const map = createMap();
    const url = map._buildRainViewerTileUrl(null);
    // Sollte statische Fallback-URL zurückgeben
    expect(url).toContain("rainviewer.com");
    expect(url).toContain("{z}");
  });

  test("handles frame with only time (legacy format)", () => {
    const map = createMap();
    map.rainViewerFrames = { past: [], nowcast: [] };
    const url = map._getActiveRainViewerTileUrl();
    // Sollte immer eine gültige Fallback-URL zurückgeben
    expect(typeof url).toBe("string");
    expect(url).toContain("rainviewer.com");
  });
});
