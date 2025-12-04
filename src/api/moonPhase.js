class MoonPhaseAPI {
  constructor() {
    this.baseUrl = (API_ENDPOINTS?.MOONPHASE?.BASE || "").replace(/\/$/, "");
    this.timeout = API_ENDPOINTS?.MOONPHASE?.TIMEOUT || 5000;
    this.name = "PhaseOfTheMoonToday";
    // API ist offline/existiert nicht mehr - nutze immer lokale Berechnung
    this.isAvailable = false;
  }

  async fetchPhase(date = new Date(), apiKey = null, context = {}) {
    const start = Date.now();

    // Direkt lokale Berechnung verwenden (API ist nicht mehr verfügbar)
    const localData = this._computeLocalPhase(date, context);
    if (localData) {
      return {
        data: localData,
        duration: Date.now() - start,
        source: "moonphase-local",
        statusMessage: "Lokal berechnet",
        state: "online",
      };
    }

    return {
      error: "Mondphase konnte nicht berechnet werden",
      source: "moonphase",
    };
  }

  _buildRequestInit(apiKey) {
    const headers = { Accept: "application/json" };
    if (apiKey) {
      headers["x-api-key"] = apiKey.trim();
    }
    return { headers };
  }

  _normalizeContext(date, context = {}) {
    const isoDate = this._formatDate(date);
    const locationDetails =
      (context && context.locationDetails) || context || {};
    const rawCity =
      context.city ||
      context.cityName ||
      locationDetails.city ||
      locationDetails.locality ||
      locationDetails.region ||
      null;
    const slugValue = rawCity ? this._slugify(rawCity) : "";
    const citySlug = slugValue || null;
    return { isoDate, citySlug };
  }

  _buildRequestQueue({ isoDate, citySlug }) {
    const requests = [];
    if (citySlug) {
      requests.push({
        url: `${this.baseUrl}/location/${encodeURIComponent(citySlug)}`,
        tag: "location",
      });
    }
    if (isoDate) {
      requests.push({
        url: `${this.baseUrl}/date/${isoDate}`,
        tag: "date",
      });
    }
    requests.push({
      url: `${this.baseUrl}/current`,
      tag: "current",
    });
    return requests;
  }

  _formatDate(date) {
    try {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed.toISOString().split("T")[0];
    } catch (e) {
      return null;
    }
  }

  _slugify(value) {
    return value
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .trim();
  }

  _normalize(payload, sourceTag) {
    const entry = this._unwrap(payload);
    if (!entry || typeof entry !== "object") return null;

    const illumination = this._toNumber(
      entry.illumination ??
        entry.percent_illumination ??
        entry.illumination_percentage ??
        entry.illuminationPercent
    );

    const moonrise =
      entry.moonrise_local ||
      entry.moonrise ||
      entry.rise ||
      entry.moonriseTime ||
      this._extractEventTime(entry, "moonrise");
    const moonset =
      entry.moonset_local ||
      entry.moonset ||
      entry.set ||
      entry.moonsetTime ||
      this._extractEventTime(entry, "moonset");

    return {
      phase: entry.phase || entry.current_phase || entry.name || null,
      illumination,
      description:
        entry.description ||
        entry.summary ||
        this._buildDescription(entry.phase, illumination),
      zodiac: entry.zodiac || entry.zodiac_sign || entry.sign || null,
      moonrise,
      moonset,
      emoji: entry.emoji || this._phaseEmoji(entry.phase),
      daysSinceNew: this._toNumber(
        entry.days_since_new || entry.age || entry.moon_age
      ),
      nextFullMoon: entry.next_full_moon || entry.nextFullMoon || null,
      nextNewMoon: entry.next_new_moon || entry.nextNewMoon || null,
      source: sourceTag,
    };
  }

  _unwrap(payload) {
    if (!payload) return null;
    if (Array.isArray(payload) && payload.length) {
      return payload[0];
    }
    if (payload.data) {
      if (Array.isArray(payload.data) && payload.data.length) {
        return payload.data[0];
      }
      if (typeof payload.data === "object") {
        return payload.data;
      }
    }
    return payload;
  }

  _extractEventTime(entry, key) {
    if (!entry || typeof entry !== "object") return null;
    if (entry.events) {
      if (typeof entry.events === "object" && !Array.isArray(entry.events)) {
        return entry.events[key] || null;
      }
      if (Array.isArray(entry.events)) {
        const match = entry.events.find((event) => {
          const label = (event?.type || event?.name || "")
            .toString()
            .toLowerCase();
          return label.includes(key);
        });
        return match?.time || null;
      }
    }
    return null;
  }

  _toNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  _phaseEmoji(phase) {
    if (!phase || typeof phase !== "string") return null;
    const key = phase.toLowerCase();
    const mapping = {
      "new moon": "🌑",
      "waxing crescent": "🌒",
      "first quarter": "🌓",
      "waxing gibbous": "🌔",
      "full moon": "🌕",
      "waning gibbous": "🌖",
      "last quarter": "🌗",
      "waning crescent": "🌘",
    };
    return mapping[key] || null;
  }

  _buildDescription(phase, illumination) {
    if (!phase) return null;
    if (typeof illumination !== "number") return phase;
    return `${phase} (${illumination.toFixed(1)}% beleuchtet)`;
  }

  _computeLocalPhase(date, context = {}) {
    try {
      const target = new Date(date);
      if (Number.isNaN(target.getTime())) return null;
      const synodicMonth = 29.530588853; // Tage
      const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14); // Referenz aus Meeus
      const daysSinceNew = (target.getTime() - knownNewMoon) / 86400000;
      const cycle = this._normalizeCycle(daysSinceNew / synodicMonth);
      const age = cycle * synodicMonth;
      const illumination = ((1 - Math.cos(cycle * 2 * Math.PI)) / 2) * 100; // Prozent
      const phaseInfo = this._phaseFromCycle(cycle);
      const locationLabel =
        context?.city ||
        context?.locationDetails?.city ||
        context?.locationDetails?.locality ||
        null;

      return {
        phase: phaseInfo.name,
        illumination,
        description: `${phaseInfo.name} (${illumination.toFixed(
          1
        )}% beleuchtet)`,
        zodiac: null,
        moonrise: null,
        moonset: null,
        emoji: phaseInfo.emoji,
        daysSinceNew: age,
        nextFullMoon: null,
        nextNewMoon: null,
        source: locationLabel ? `computed:${locationLabel}` : "computed",
      };
    } catch (error) {
      console.warn("MoonPhase Local fallback fehlgeschlagen", error);
      return null;
    }
  }

  _normalizeCycle(value) {
    const normalized = value - Math.floor(value);
    return normalized < 0 ? normalized + 1 : normalized;
  }

  _phaseFromCycle(cycle) {
    const phases = [
      "New Moon",
      "Waxing Crescent",
      "First Quarter",
      "Waxing Gibbous",
      "Full Moon",
      "Waning Gibbous",
      "Last Quarter",
      "Waning Crescent",
    ];
    const index = Math.floor(cycle * 8 + 0.5) % phases.length;
    const name = phases[index];
    return {
      name,
      emoji: this._phaseEmoji(name) || this._phaseEmoji(name.toLowerCase()),
    };
  }
}

const moonPhaseAPI = new MoonPhaseAPI();

if (typeof module !== "undefined" && module.exports) {
  module.exports = MoonPhaseAPI;
}
