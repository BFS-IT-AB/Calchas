(function (global) {
  let activeSheetId = null;

  // Mapping von Sheet-IDs zu Render-Funktionen
  function renderSheetContent(sheetId) {
    const appState = global.appState || {};

    const renderMap = {
      "sheet-settings-theme": () => {
        if (global.ThemeSelectorSheet?.renderThemeSheet) {
          global.ThemeSelectorSheet.renderThemeSheet(appState);
        }
      },
      "sheet-settings-units": () => {
        if (global.UnitsSelectorSheet?.renderUnitsSheet) {
          global.UnitsSelectorSheet.renderUnitsSheet(appState);
        }
      },
      "sheet-settings-language": () => {
        if (global.LanguageSelectorSheet?.renderLanguageSheet) {
          global.LanguageSelectorSheet.renderLanguageSheet(appState);
        }
      },
      "sheet-settings-home": () => {
        if (global.HomeLocationSheet?.renderHomeSheet) {
          global.HomeLocationSheet.renderHomeSheet(appState);
        }
      },
      "sheet-settings-about": () => {
        if (global.AboutSheet?.renderAboutSheet) {
          global.AboutSheet.renderAboutSheet(appState);
        }
      },
      "sheet-settings-privacy": () => {
        if (global.PrivacyApiInfoSheet?.renderPrivacySheet) {
          global.PrivacyApiInfoSheet.renderPrivacySheet(appState);
        }
      },
    };

    if (renderMap[sheetId]) {
      try {
        renderMap[sheetId]();
      } catch (e) {
        console.warn(`[ModalController] Render failed for ${sheetId}:`, e);
      }
    }
  }

  function resolveSheetId(idOrMetric) {
    if (!idOrMetric) return null;
    if (idOrMetric.startsWith("sheet-")) return idOrMetric;
    if (idOrMetric.startsWith("metric-")) {
      return `sheet-${idOrMetric}`;
    }

    const metricMapping = {
      wind: "sheet-metric-wind",
      precipitation: "sheet-metric-precipitation",
      uv: "sheet-metric-uv",
      visibility: "sheet-metric-visibility",
      aqi: "sheet-aqi",
      "temperature-trend": "sheet-temperature-trend",
      "sun-cloud": "sheet-sun-cloud",
      "map-layers": "sheet-map-layers",
    };

    return metricMapping[idOrMetric] || idOrMetric;
  }

  function openSheet(idOrMetric) {
    const overlay = document.getElementById("bottom-sheet-overlay");
    const resolvedId = resolveSheetId(idOrMetric);
    const sheet = resolvedId && document.getElementById(resolvedId);
    if (!overlay || !sheet) return;

    // Render Sheet content vor dem Öffnen
    renderSheetContent(resolvedId);

    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    sheet.classList.add("bottom-sheet--visible");
    activeSheetId = resolvedId;
  }

  function closeSheet() {
    const overlay = document.getElementById("bottom-sheet-overlay");
    if (!overlay) return;
    const activeSheet = activeSheetId && document.getElementById(activeSheetId);
    if (activeSheet) {
      activeSheet.classList.remove("bottom-sheet--visible");
    }
    overlay.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
    activeSheetId = null;
  }

  function initModalController() {
    const overlay = document.getElementById("bottom-sheet-overlay");
    if (!overlay) return;

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeSheet();
      }
      // Handle close buttons inside sheets
      if (event.target.closest("[data-close-sheet]")) {
        closeSheet();
      }
    });

    document.addEventListener("click", (event) => {
      const trigger =
        event.target.closest("[data-bottom-sheet]") ||
        event.target.closest("[data-bottom-sheet-target]");
      if (!trigger) return;

      const targetIdAttr =
        trigger.getAttribute("data-bottom-sheet") ||
        trigger.getAttribute("data-bottom-sheet-target");
      if (!targetIdAttr) return;

      openSheet(targetIdAttr);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSheet();
      }
    });
  }

  function open(metricIdOrSheetId) {
    openSheet(metricIdOrSheetId);
  }

  global.ModalController = {
    openSheet,
    open,
    closeSheet,
    initModalController,
  };
})(window);
