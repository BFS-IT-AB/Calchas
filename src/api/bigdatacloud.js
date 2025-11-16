class BigDataCloudAPI {
  constructor() {
    this.baseUrl = API_ENDPOINTS.BIGDATACLOUD.BASE;
    this.timeout = API_ENDPOINTS.BIGDATACLOUD.TIMEOUT;
    this.name = "BigDataCloud";
  }

  async fetchLocationDetails(
    latitude,
    longitude,
    apiKey = null,
    language = "de"
  ) {
    try {
      const coordCheck = validateCoordinates(latitude, longitude);
      if (!coordCheck.valid) {
        throw new Error(coordCheck.error);
      }

      const params = new URLSearchParams({
        latitude: Number(latitude).toFixed(6),
        longitude: Number(longitude).toFixed(6),
        localityLanguage: language || "en",
      });
      if (apiKey) {
        params.set("key", apiKey.trim());
      }

      const url = `${this.baseUrl}?${params.toString()}`;
      const start = Date.now();
      const response = await safeApiFetch(url, {}, this.timeout);
      const payload = await response.json();
      if (
        !payload ||
        typeof payload !== "object" ||
        payload.latitude === undefined
      ) {
        throw new Error("Ungültige BigDataCloud Antwort");
      }

      const normalized = this._normalize(payload);
      return {
        data: normalized,
        duration: Date.now() - start,
        source: "bigdatacloud",
      };
    } catch (error) {
      console.warn("BigDataCloud", error);
      return {
        error: error.message || String(error),
        source: "bigdatacloud",
      };
    }
  }

  _normalize(payload) {
    const adminEntries = Array.isArray(payload?.localityInfo?.administrative)
      ? payload.localityInfo.administrative
      : [];
    const adminTop = adminEntries[0] || {};
    const subdivisions = adminEntries
      .map((entry) => entry.name)
      .filter(Boolean)
      .slice(0, 3);

    return {
      city:
        payload.city ||
        payload.locality ||
        adminTop.name ||
        payload.principalSubdivision,
      locality: payload.locality,
      region: payload.principalSubdivision || adminTop.name,
      continent: payload.continent,
      country: payload.countryName,
      countryCode: payload.countryCode,
      countryFlag: this._countryFlag(payload.countryCode),
      plusCode: payload.plusCode,
      postcode: payload.postcode,
      timezone: payload.timezone?.ianaTimezone || payload.timezone?.name,
      confidence: payload.confidence,
      subdivisions,
      latitude: payload.latitude,
      longitude: payload.longitude,
    };
  }

  _countryFlag(code) {
    if (!code || typeof code !== "string" || code.length !== 2) return null;
    const base = 0x1f1e6;
    const chars = code.toUpperCase().split("");
    return chars
      .map((char) => String.fromCodePoint(base + char.charCodeAt(0) - 65))
      .join("");
  }
}

const bigDataCloudAPI = new BigDataCloudAPI();

if (typeof module !== "undefined" && module.exports) {
  module.exports = BigDataCloudAPI;
}
