(function () {
  const ICON_BASE = "assets/google-weather-icons/weather/v1/light";
  const DAY_FALLBACK = "partly_cloudy_day";
  const NIGHT_FALLBACK = "partly_cloudy_night";

  const ICON_MAP = {
    0: { day: "clear_day", night: "clear_night", label: "Klarer Himmel" },
    1: {
      day: "partly_cloudy_day",
      night: "mostly_clear_night",
      label: "Meist klar",
    },
    2: {
      day: "partly_cloudy_day",
      night: "partly_cloudy_night",
      label: "Teilweise bewölkt",
    },
    3: { day: "cloudy", night: "cloudy", label: "Bewölkt" },
    45: { day: "haze_fog", night: "haze_fog", label: "Nebel" },
    48: { day: "haze_fog", night: "haze_fog", label: "Reifnebel" },
    51: { day: "drizzle", night: "drizzle", label: "Leichter Niesel" },
    53: { day: "drizzle", night: "drizzle", label: "Mäßiger Niesel" },
    55: { day: "drizzle", night: "drizzle", label: "Starker Niesel" },
    56: { day: "icy", night: "icy", label: "Gefrierender Niesel" },
    57: { day: "icy", night: "icy", label: "Gefrierender Niesel" },
    61: {
      day: "rain_with_cloudy",
      night: "rain_with_cloudy",
      label: "Leichter Regen",
    },
    63: { day: "rain_showers", night: "rain_showers", label: "Regen" },
    65: { day: "heavy_rain", night: "heavy_rain", label: "Starker Regen" },
    66: { day: "sleet_hail", night: "sleet_hail", label: "Gefrierender Regen" },
    67: { day: "sleet_hail", night: "sleet_hail", label: "Gefrierender Regen" },
    71: {
      day: "snow_with_cloudy",
      night: "snow_with_cloudy",
      label: "Leichter Schneefall",
    },
    73: { day: "snow_showers", night: "snow_showers", label: "Schnee" },
    75: { day: "heavy_snow", night: "heavy_snow", label: "Starker Schnee" },
    77: {
      day: "snow_with_cloudy",
      night: "snow_with_cloudy",
      label: "Schneekörner",
    },
    80: {
      day: "scattered_rain_showers_day",
      night: "scattered_rain_showers_night",
      label: "Regenschauer",
    },
    81: { day: "rain_showers", night: "rain_showers", label: "Regenschauer" },
    82: { day: "heavy_rain", night: "heavy_rain", label: "Kräftige Schauer" },
    85: {
      day: "scattered_snow_showers_day",
      night: "scattered_snow_showers_night",
      label: "Schneeschauer",
    },
    86: {
      day: "snow_showers",
      night: "snow_showers",
      label: "Kräftige Schneeschauer",
    },
    95: {
      day: "thunderstorms_day",
      night: "thunderstorms_night",
      label: "Gewitter",
    },
    96: {
      day: "strong_thunderstorms",
      night: "strong_thunderstorms",
      label: "Hagelgewitter",
    },
    99: {
      day: "strong_thunderstorms",
      night: "strong_thunderstorms",
      label: "Schweres Gewitter",
    },
  };

  const KEYWORD_MAP = [
    {
      keywords: ["clear", "sun"],
      day: "clear_day",
      night: "clear_night",
      label: "Klar",
    },
    {
      keywords: ["cloud"],
      day: "cloudy",
      night: "cloudy",
      label: "Bewölkt",
    },
    {
      keywords: ["rain", "shower"],
      day: "rain_with_cloudy",
      night: "rain_with_cloudy",
      label: "Regen",
    },
    {
      keywords: ["snow"],
      day: "snow_with_cloudy",
      night: "snow_with_cloudy",
      label: "Schnee",
    },
    {
      keywords: ["storm", "thunder"],
      day: "thunderstorms_day",
      night: "thunderstorms_night",
      label: "Gewitter",
    },
    {
      keywords: ["fog", "haze", "mist"],
      day: "haze_fog",
      night: "haze_fog",
      label: "Nebel",
    },
  ];

  const descriptor = (name, label, code) => ({
    name,
    path: `${ICON_BASE}/${name}.svg`,
    alt: label || "Wetter",
    code,
  });

  const variantKey = (isDay) => (Number(isDay) === 0 ? "night" : "day");

  function resolveIconByCode(code, isDay = 1) {
    const numericCode = typeof code === "number" ? code : Number(code);
    const entry = Number.isFinite(numericCode) ? ICON_MAP[numericCode] : null;
    const variant = variantKey(isDay);
    if (entry && entry[variant]) {
      return descriptor(entry[variant], entry.label, numericCode);
    }
    const fallbackName = variant === "day" ? DAY_FALLBACK : NIGHT_FALLBACK;
    return descriptor(fallbackName, "Wetter", numericCode);
  }

  function resolveIconByKeyword(keyword = "", isDay = 1) {
    const normalized = keyword.toLowerCase();
    if (!normalized) {
      return resolveIconByCode(undefined, isDay);
    }
    const found = KEYWORD_MAP.find((entry) =>
      entry.keywords.some((key) => normalized.includes(key))
    );
    if (!found) {
      return resolveIconByCode(undefined, isDay);
    }
    const variant = variantKey(isDay);
    const name = found[variant] || DAY_FALLBACK;
    return descriptor(name, found.label, undefined);
  }

  window.weatherIconMapper = Object.freeze({
    resolveIconByCode,
    resolveIconByKeyword,
  });
})();
