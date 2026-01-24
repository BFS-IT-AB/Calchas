/**
 * UnitsSelectorSheet.js - Einheiten-Einstellungen
 * Design inspiriert von WeatherMaster App (Screenshot 2)
 */
(function (global) {
  // Toast notification helper
  function showToast(message, isError) {
    var existing = document.querySelector(".settings-toast");
    if (existing) existing.remove();

    var toast = document.createElement("div");
    toast.className =
      "settings-toast" + (isError ? " settings-toast--error" : "");
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("settings-toast--visible");
    });

    setTimeout(function () {
      toast.classList.remove("settings-toast--visible");
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 2500);
  }

  // SVG Line Icons für Einheiten
  const ICONS = {
    temp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4v10.54a4 4 0 11-4 0V4a2 2 0 114 0z"/></svg>`,
    wind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2"/></svg>`,
    visibility: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/></svg>`,
    precip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>`,
    pressure: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
    timeFormat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
    aqi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 14h4v7H4zm6-5h4v12h-4zm6-6h4v18h-4z"/></svg>`,
  };

  const UNIT_CONFIGS = {
    temp: {
      icon: ICONS.temp,
      title: "Einheit Temperatur",
      options: [
        { value: "C", label: "Celsius" },
        { value: "F", label: "Fahrenheit" },
      ],
    },
    wind: {
      icon: ICONS.wind,
      title: "Einheit Windstärke",
      options: [
        { value: "km/h", label: "Km/h" },
        { value: "m/s", label: "m/s" },
        { value: "mph", label: "mph" },
        { value: "kn", label: "Knoten" },
      ],
    },
    visibility: {
      icon: ICONS.visibility,
      title: "Einheit Sichtweite",
      options: [
        { value: "km", label: "Km" },
        { value: "mi", label: "Meilen" },
      ],
    },
    precip: {
      icon: ICONS.precip,
      title: "Einheit Niederschlag",
      options: [
        { value: "mm", label: "mm" },
        { value: "cm", label: "cm" },
        { value: "in", label: "Zoll" },
      ],
    },
    pressure: {
      icon: ICONS.pressure,
      title: "Einheit Luftdruck",
      options: [
        { value: "hPa", label: "hPa" },
        { value: "mmHg", label: "mmHg" },
        { value: "inHg", label: "inHg" },
      ],
    },
    timeFormat: {
      icon: ICONS.timeFormat,
      title: "Zeitformat",
      options: [
        { value: "24", label: "24 hr" },
        { value: "12", label: "12 hr" },
      ],
    },
    aqi: {
      icon: ICONS.aqi,
      title: "AQI Typ",
      options: [
        { value: "eu", label: "Europäischer AQI" },
        { value: "us", label: "US AQI" },
      ],
    },
  };

  const DEFAULT_UNITS = {
    temp: "C",
    wind: "km/h",
    visibility: "km",
    precip: "mm",
    pressure: "hPa",
    timeFormat: "24",
    aqi: "eu",
  };

  function readUnits(appState) {
    const stateUnits = appState?.units || {};
    const settingUnits = appState?.settings?.units || {};
    let storedUnits = {};
    try {
      storedUnits =
        JSON.parse(localStorage.getItem("wetter_units") || "{}") || {};
    } catch (e) {
      storedUnits = {};
    }
    const legacyTemp = (() => {
      try {
        return localStorage.getItem("wetter_unit_temp") || null;
      } catch (e) {
        return null;
      }
    })();
    const legacyWind = (() => {
      try {
        return localStorage.getItem("wetter_unit_wind") || null;
      } catch (e) {
        return null;
      }
    })();

    return {
      ...DEFAULT_UNITS,
      ...storedUnits,
      ...settingUnits,
      temp:
        stateUnits.temperature ||
        settingUnits.temp ||
        storedUnits.temp ||
        legacyTemp ||
        DEFAULT_UNITS.temp,
      wind:
        stateUnits.wind ||
        settingUnits.wind ||
        storedUnits.wind ||
        legacyWind ||
        DEFAULT_UNITS.wind,
      visibility:
        stateUnits.visibility ||
        settingUnits.visibility ||
        storedUnits.visibility ||
        DEFAULT_UNITS.visibility,
      precip:
        stateUnits.precip ||
        settingUnits.precip ||
        storedUnits.precip ||
        DEFAULT_UNITS.precip,
      pressure:
        stateUnits.pressure ||
        settingUnits.pressure ||
        storedUnits.pressure ||
        DEFAULT_UNITS.pressure,
      timeFormat:
        stateUnits.timeFormat ||
        settingUnits.timeFormat ||
        storedUnits.timeFormat ||
        DEFAULT_UNITS.timeFormat,
      aqi:
        stateUnits.aqi ||
        settingUnits.aqi ||
        storedUnits.aqi ||
        DEFAULT_UNITS.aqi,
    };
  }

  function renderUnitsSheet(appState) {
    const container = document.getElementById("settings-units-body");
    if (!container) {
      console.warn("[UnitsSelectorSheet] Container nicht gefunden");
      return;
    }

    const units = readUnits(appState);

    container.innerHTML = `
      <div class="units-settings">
        ${renderUnitRow("temp", units.temp)}
        ${renderUnitRow("wind", units.wind)}
        ${renderUnitRow("visibility", units.visibility || "km")}
        ${renderUnitRow("precip", units.precip || "mm")}
        ${renderUnitRow("pressure", units.pressure || "hPa")}
        ${renderUnitRow("timeFormat", units.timeFormat || "24")}
        ${renderUnitRow("aqi", units.aqi || "eu")}
      </div>
    `;

    // Click handlers
    container.querySelectorAll(".units-row").forEach((row) => {
      row.addEventListener("click", () => {
        const kind = row.getAttribute("data-unit-kind");
        const currentVal = units[kind];
        showUnitSelector(appState, kind, currentVal);
      });
    });
  }

  function renderUnitRow(kind, currentValue) {
    const config = UNIT_CONFIGS[kind];
    if (!config) return "";
    const currentOption = config.options.find((o) => o.value === currentValue);
    const displayValue = currentOption
      ? currentOption.label
      : currentValue || "-";
    const defaultValue = DEFAULT_UNITS[kind];
    const disabledAttr =
      currentValue !== defaultValue
        ? "disabled style='opacity:0.5;pointer-events:none'"
        : "";
    return `
      <button class="units-row" type="button" data-unit-kind="${kind}" ${disabledAttr}>
        <span class="units-row__icon">${config.icon}</span>
        <span class="units-row__content">
          <span class="units-row__title">${config.title}</span>
          <span class="units-row__value">${displayValue}${currentValue !== defaultValue ? " (in Entwicklung)" : ""}</span>
        </span>
      </button>
    `;
  }

  function showUnitSelector(appState, kind, currentValue) {
    const config = UNIT_CONFIGS[kind];
    if (!config) return;
    const defaultValue = DEFAULT_UNITS[kind];
    const existingModal = document.getElementById("unit-selector-modal");
    if (existingModal) existingModal.remove();
    const modal = document.createElement("div");
    modal.id = "unit-selector-modal";
    modal.className = "unit-selector-modal";
    modal.innerHTML = `
      <div class="unit-selector-backdrop"></div>
      <div class="unit-selector-content">
        <h3 class="unit-selector-title">${config.title}</h3>
        <div class="unit-selector-options">
          ${config.options
            .map(
              (opt) => `
            <button
              class="unit-selector-option ${
                opt.value === currentValue ? "unit-selector-option--active" : ""
              }"
              type="button"
              data-value="${opt.value}"
              ${opt.value !== defaultValue ? "disabled style='opacity:0.5;pointer-events:none'" : ""}
            >
              <span class="unit-selector-option__label">${opt.label}${opt.value !== defaultValue ? " (in Entwicklung)" : ""}</span>
              ${
                opt.value === currentValue
                  ? '<span class="unit-selector-option__check">✓</span>'
                  : ""
              }
            </button>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal
      .querySelector(".unit-selector-backdrop")
      .addEventListener("click", () => modal.remove());
    modal.querySelectorAll(".unit-selector-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-value");
        const config = UNIT_CONFIGS[kind];
        const option = config?.options?.find((o) => o.value === value);
        const label = option ? option.label : value;
        applyUnit(appState, kind, value);
        modal.remove();
        showToast("✓ " + config.title + " auf " + label + " geändert");
        renderUnitsSheet(appState);
      });
    });
    requestAnimationFrame(() =>
      modal.classList.add("unit-selector-modal--visible"),
    );
  }

  function applyUnit(appState, kind, value) {
    if (!appState) appState = {};
    if (!appState.settings) appState.settings = {};
    if (!appState.settings.units)
      appState.settings.units = { ...DEFAULT_UNITS };

    const nextUnits = { ...appState.settings.units, [kind]: value };
    appState.settings.units = nextUnits;

    // Map to appState.units structure used by the rest of the app
    const mapped = {
      temperature: nextUnits.temp,
      wind: nextUnits.wind,
      visibility: nextUnits.visibility,
      precip: nextUnits.precip,
      pressure: nextUnits.pressure,
      timeFormat: nextUnits.timeFormat,
      aqi: nextUnits.aqi,
    };

    if (appState.persistUnits) {
      appState.persistUnits(mapped);
    } else {
      try {
        const payload = { ...nextUnits, ...mapped };
        localStorage.setItem("wetter_units", JSON.stringify(payload));
        if (mapped.temperature)
          localStorage.setItem("wetter_unit_temp", mapped.temperature);
        if (mapped.wind) localStorage.setItem("wetter_unit_wind", mapped.wind);
      } catch (e) {}
      appState.units = { ...(appState.units || {}), ...mapped };
    }

    // Trigger live re-render if Daten vorhanden
    try {
      if (
        appState.weatherData &&
        window.buildRenderData &&
        window.renderFromRenderData
      ) {
        const updatedRenderData = window.buildRenderData(
          appState.weatherData,
          appState.units || mapped,
        );
        appState.renderData = updatedRenderData;
        window.renderFromRenderData();
      }
    } catch (e) {
      console.warn(
        "[UnitsSelectorSheet] Re-Render nach Unit-Change fehlgeschlagen",
        e,
      );
    }
  }

  global.UnitsSelectorSheet = { renderUnitsSheet };
})(window);
