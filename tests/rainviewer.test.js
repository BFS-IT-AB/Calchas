const { WeatherMap } = require("../src/features.js");

describe("WeatherMap RainViewer tile URLs", () => {
  const createMap = () => {
    const instance = new WeatherMap("test-map");
    instance.rainViewerHost = "https://tilecache.example.com";
    return instance;
  };

  test("builds radar tile with smoothing and snow colors", () => {
    const map = createMap();
    const url = map._buildRainViewerTileUrl({
      path: "/v2/radar/123456",
      type: "past",
    });
    expect(url).toBe(
      "https://tilecache.example.com/v2/radar/123456/512/{z}/{x}/{y}/2/1_1.png",
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
});
