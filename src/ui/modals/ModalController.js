(function (global) {
  let activeSheetId = null;

  // Mapping von Sheet-IDs zu Render-Funktionen
  function renderSheetContent(sheetId) {
    // Get appState with fallback to default structure
    let appState = global.appState;
    if (!appState && global.AppState) {
      try {
        appState = new global.AppState();
        global.appState = appState;
      } catch (e) {
        console.warn("[ModalController] Konnte AppState nicht instanzieren", e);
      }
    }

    if (!appState) {
      appState = {
        settings: {
          theme: localStorage.getItem("wetter_theme") || "system",
          units: JSON.parse(localStorage.getItem("wetter_units") || "{}"),
        },
        favorites: [],
        homeLocation: null,
        units: JSON.parse(localStorage.getItem("wetter_units") || "null") || {},
      };
    }

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
      "sheet-settings-background": () => {
        if (global.BackgroundSettingsSheet?.renderBackgroundSheet) {
          global.BackgroundSettingsSheet.renderBackgroundSheet(appState);
        }
      },
      "sheet-settings-privacy": () => {
        if (global.PrivacyApiInfoSheet?.renderPrivacySheet) {
          global.PrivacyApiInfoSheet.renderPrivacySheet(appState);
        }
      },
      "sheet-settings-models": () => {
        renderModelsSheet();
      },
      "sheet-settings-export": () => {
        renderExportSheet(appState);
      },
      "sheet-settings-import": () => {
        renderImportSheet(appState);
      },
      "sheet-settings-discord": () => {
        renderDiscordSheet();
      },
    };

    // Helper render functions for sheets that don't have dedicated modules
    function renderModelsSheet() {
      const container = document.getElementById("settings-models-body");
      if (!container) return;

      // Get API status from apiKeyManager
      const keyManager = window.apiKeyManager;
      const apis = [
        {
          id: "open-meteo",
          name: "Open-Meteo",
          icon: "🌤️",
          status: "active",
          description: "Primäre Wetterdaten (kostenlos)",
          hasKey: false,
          keyRequired: false,
        },
        {
          id: "brightsky",
          name: "BrightSky (DWD)",
          icon: "🇩🇪",
          status: "active",
          description: "Deutsche Wetterdaten vom DWD (kostenlos)",
          hasKey: false,
          keyRequired: false,
        },
        {
          id: "nominatim",
          name: "Nominatim (OSM)",
          icon: "🗺️",
          status: "active",
          description: "Geocoding & Ortssuche (kostenlos)",
          hasKey: false,
          keyRequired: false,
        },
        {
          id: "bigdatacloud",
          name: "BigDataCloud",
          icon: "📍",
          status: "active",
          description: "Reverse Geocoding (kostenlos)",
          hasKey: false,
          keyRequired: false,
        },
        {
          id: "openweathermap",
          name: "OpenWeatherMap",
          icon: "🌍",
          status: keyManager?.hasKey?.("openweathermap")
            ? "active"
            : "inactive",
          description: "Zusätzliche Wetterdaten & Karten",
          hasKey: keyManager?.hasKey?.("openweathermap") || false,
          keyRequired: true,
          keyLink: "https://openweathermap.org/api",
        },
        {
          id: "visualcrossing",
          name: "Visual Crossing",
          icon: "📊",
          status: keyManager?.hasKey?.("visualcrossing")
            ? "active"
            : "inactive",
          description: "Historische Daten & erweiterte Vorhersagen",
          hasKey: keyManager?.hasKey?.("visualcrossing") || false,
          keyRequired: true,
          keyLink: "https://www.visualcrossing.com/weather-api",
        },
        {
          id: "meteostat",
          name: "Meteostat",
          icon: "📈",
          status: keyManager?.hasKey?.("meteostat") ? "active" : "inactive",
          description: "Historische Wetterdaten & Statistiken",
          hasKey: keyManager?.hasKey?.("meteostat") || false,
          keyRequired: true,
          keyLink: "https://meteostat.net/",
        },
        {
          id: "rainviewer",
          name: "RainViewer",
          icon: "🌧️",
          status: "active",
          description: "Niederschlagsradar & Prognose (kostenlos)",
          hasKey: false,
          keyRequired: false,
        },
      ];

      var html =
        '<div class="settings-sheet-content api-settings">' +
        '<div class="settings-info-card">' +
        '<span class="settings-info-card__icon">🔌</span>' +
        '<div class="settings-info-card__content">' +
        '<p class="settings-info-card__title">API-Datenquellen</p>' +
        '<p class="settings-info-card__text">Calchas nutzt mehrere Wetter-APIs für genaue Daten. Mit eigenen API-Keys kannst du erweiterte Funktionen freischalten.</p>' +
        "</div>" +
        "</div>" +
        '<div class="api-list">';

      apis.forEach(function (api) {
        html +=
          '<div class="api-item api-item--' +
          api.status +
          '">' +
          '<div class="api-item__header">' +
          '<span class="api-item__icon">' +
          api.icon +
          "</span>" +
          '<div class="api-item__info">' +
          '<span class="api-item__name">' +
          api.name +
          "</span>" +
          '<span class="api-item__desc">' +
          api.description +
          "</span>" +
          "</div>" +
          '<span class="api-item__status api-item__status--' +
          api.status +
          '">' +
          (api.status === "active" ? "✓ Aktiv" : "○ Inaktiv") +
          "</span>" +
          "</div>";

        if (api.keyRequired) {
          html +=
            '<div class="api-item__key-section">' +
            '<input type="password" class="api-key-input" id="api-key-' +
            api.id +
            '" ' +
            'placeholder="' +
            (api.hasKey ? "••••••••••••••••" : "API-Key eingeben") +
            '" ' +
            'data-api-id="' +
            api.id +
            '" />' +
            '<button type="button" class="api-key-btn" data-api-id="' +
            api.id +
            '">' +
            (api.hasKey ? "Ändern" : "Speichern") +
            "</button>" +
            "</div>";
        }

        html += "</div>";
      });

      html +=
        "</div>" +
        '<div class="api-info-note">' +
        '<span class="api-info-note__icon">ℹ️</span>' +
        "<p>API-Keys werden lokal gespeichert und nie an unsere Server gesendet.</p>" +
        "</div>" +
        "</div>";

      container.innerHTML = html;

      // Add event listeners for API key inputs
      container.querySelectorAll(".api-key-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var apiId = btn.dataset.apiId;
          var input = document.getElementById("api-key-" + apiId);
          var key = input && input.value ? input.value.trim() : "";

          if (key && keyManager && keyManager.setKey) {
            keyManager.setKey(apiId, key);
            input.value = "";
            input.placeholder = "••••••••••••••••";
            btn.textContent = "Ändern";

            // Update status
            var item = btn.closest(".api-item");
            if (item) {
              item.classList.remove("api-item--inactive");
              item.classList.add("api-item--active");
              var statusEl = item.querySelector(".api-item__status");
              if (statusEl) {
                statusEl.textContent = "✓ Aktiv";
                statusEl.classList.remove("api-item__status--inactive");
                statusEl.classList.add("api-item__status--active");
              }
            }
          }
        });
      });
    }

    // Toast helper
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

    function renderExportSheet(state) {
      const container = document.getElementById("settings-export-body");
      if (!container) return;
      container.innerHTML =
        '<div class="settings-sheet-content">' +
        '<div class="settings-info-card">' +
        '<span class="settings-info-card__icon">📤</span>' +
        '<div class="settings-info-card__content">' +
        '<p class="settings-info-card__title">Daten exportieren</p>' +
        '<p class="settings-info-card__text">Exportiere deine Einstellungen, Favoriten und den Heimatort als JSON-Datei. Du kannst diese Datei auf anderen Geräten importieren.</p>' +
        "</div>" +
        "</div>" +
        '<div class="export-preview" id="export-preview"></div>' +
        '<button type="button" class="settings-action-btn" id="export-data-btn">' +
        '<span class="settings-action-btn__icon">💾</span>' +
        '<span class="settings-action-btn__text">Daten als JSON exportieren</span>' +
        "</button>" +
        "</div>";

      // Show preview of what will be exported
      var previewEl = document.getElementById("export-preview");
      if (previewEl && state) {
        var favCount = (state.favorites || []).length;
        var hasHome = state.homeLocation && state.homeLocation.city;
        var hasUnits = state.units && Object.keys(state.units).length > 0;
        var theme = localStorage.getItem("wetter_theme") || "system";

        previewEl.innerHTML =
          '<div class="export-preview__list">' +
          '<div class="export-preview__item">' +
          "<span>🏠</span> Heimatort: " +
          (hasHome ? state.homeLocation.city : "Nicht gesetzt") +
          "</div>" +
          '<div class="export-preview__item">' +
          "<span>⭐</span> Favoriten: " +
          favCount +
          " Orte" +
          "</div>" +
          '<div class="export-preview__item">' +
          "<span>⚙️</span> Einheiten: " +
          (hasUnits ? "Gespeichert" : "Standard") +
          "</div>" +
          '<div class="export-preview__item">' +
          "<span>🎨</span> Theme: " +
          theme +
          "</div>" +
          "</div>";
      }

      var exportBtn = document.getElementById("export-data-btn");
      if (exportBtn) {
        exportBtn.addEventListener("click", function () {
          try {
            var exportData = {
              version: "1.0",
              exportedAt: new Date().toISOString(),
              settings: state && state.settings ? state.settings : {},
              favorites: state && state.favorites ? state.favorites : [],
              homeLocation:
                state && state.homeLocation ? state.homeLocation : null,
              units: state && state.units ? state.units : {},
              theme: localStorage.getItem("wetter_theme") || "system",
              language: localStorage.getItem("app-language") || "de",
            };
            var blob = new Blob([JSON.stringify(exportData, null, 2)], {
              type: "application/json",
            });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download =
              "calchas-backup-" +
              new Date().toISOString().split("T")[0] +
              ".json";
            a.click();
            URL.revokeObjectURL(url);
            showToast("✓ Export erfolgreich!");
          } catch (e) {
            console.error("Export fehlgeschlagen:", e);
            showToast("✗ Export fehlgeschlagen", true);
          }
        });
      }
    }

    function renderImportSheet(state) {
      const container = document.getElementById("settings-import-body");
      if (!container) return;
      container.innerHTML =
        '<div class="settings-sheet-content">' +
        '<div class="settings-info-card">' +
        '<span class="settings-info-card__icon">📥</span>' +
        '<div class="settings-info-card__content">' +
        '<p class="settings-info-card__title">Daten importieren</p>' +
        '<p class="settings-info-card__text">Importiere eine zuvor exportierte JSON-Datei, um deine Einstellungen wiederherzustellen.</p>' +
        "</div>" +
        "</div>" +
        '<label class="settings-file-input">' +
        '<input type="file" accept=".json" id="import-file-input" hidden />' +
        '<span class="settings-action-btn">' +
        '<span class="settings-action-btn__icon">📁</span>' +
        '<span class="settings-action-btn__text">JSON-Datei auswählen</span>' +
        "</span>" +
        "</label>" +
        '<div id="import-status" class="settings-import-status"></div>' +
        '<button type="button" class="settings-action-btn settings-action-btn--secondary" id="import-reload-btn" style="display:none;margin-top:12px;">' +
        '<span class="settings-action-btn__icon">🔄</span>' +
        '<span class="settings-action-btn__text">Seite neu laden</span>' +
        "</button>" +
        "</div>";

      var importInput = document.getElementById("import-file-input");
      var reloadBtn = document.getElementById("import-reload-btn");

      if (importInput) {
        importInput.addEventListener("change", function (e) {
          var file = e.target.files && e.target.files[0];
          if (!file) return;
          var statusEl = document.getElementById("import-status");
          var reader = new FileReader();
          reader.onload = function (ev) {
            try {
              var data = JSON.parse(ev.target.result);
              var importedCount = 0;

              if (data.settings && state) {
                Object.assign(state.settings || {}, data.settings);
                importedCount++;
              }
              if (data.favorites && state) {
                state.favorites = data.favorites;
                localStorage.setItem(
                  "wetter_favorites",
                  JSON.stringify(data.favorites),
                );
                importedCount++;
              }
              if (data.homeLocation && state) {
                state.homeLocation = data.homeLocation;
                localStorage.setItem(
                  "wetter_home_location",
                  JSON.stringify(data.homeLocation),
                );
                importedCount++;
              }
              if (data.units) {
                if (state) state.units = data.units;
                localStorage.setItem(
                  "wetter_units",
                  JSON.stringify(data.units),
                );
                importedCount++;
              }
              if (data.theme) {
                localStorage.setItem("wetter_theme", data.theme);
                importedCount++;
              }
              if (data.language) {
                localStorage.setItem("app-language", data.language);
                importedCount++;
              }

              if (statusEl) {
                statusEl.innerHTML =
                  '<span class="settings-import-success">✓ Import erfolgreich! ' +
                  importedCount +
                  " Einstellungen importiert.</span>";
              }
              if (reloadBtn) {
                reloadBtn.style.display = "flex";
              }
              showToast("✓ Import erfolgreich!");
            } catch (err) {
              console.error("Import fehlgeschlagen:", err);
              if (statusEl) {
                statusEl.innerHTML =
                  '<span class="settings-import-error">✗ Ungültige Datei: ' +
                  err.message +
                  "</span>";
              }
              showToast("✗ Import fehlgeschlagen", true);
            }
          };
          reader.readAsText(file);
        });
      }

      if (reloadBtn) {
        reloadBtn.addEventListener("click", function () {
          window.location.reload();
        });
      }
    }

    function renderDiscordSheet() {
      const container = document.getElementById("settings-discord-body");
      if (!container) return;
      container.innerHTML =
        '<div class="settings-sheet-content">' +
        '<div class="settings-discord-header">' +
        '<span class="settings-discord-logo">🎮</span>' +
        '<h3 class="settings-discord-title">Discord Community</h3>' +
        "</div>" +
        '<p class="settings-discord-text">Werde Teil unserer Discord-Community! Tausche dich mit anderen Wetter-Enthusiasten aus, erhalte Hilfe und bleibe über neue Features informiert.</p>' +
        '<a href="https://discord.gg/bjFM6zCZ" target="_blank" rel="noopener noreferrer" class="settings-discord-btn">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" class="settings-discord-btn__icon"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>' +
        "<span>Discord beitreten</span>" +
        "</a>" +
        "</div>";
    }

    if (renderMap[sheetId]) {
      try {
        renderMap[sheetId]();
      } catch (e) {
        console.warn("[ModalController] Render failed for " + sheetId + ":", e);
      }
    }
  }

  function resolveSheetId(idOrMetric) {
    if (!idOrMetric) return null;
    if (idOrMetric.startsWith("sheet-")) return idOrMetric;
    if (idOrMetric.startsWith("metric-")) {
      return "sheet-" + idOrMetric;
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
    console.log(
      `[ModalController.openSheet] Called with idOrMetric="${idOrMetric}"`,
    );

    const overlay = document.getElementById("bottom-sheet-overlay");
    const resolvedId = resolveSheetId(idOrMetric);
    const sheet = resolvedId && document.getElementById(resolvedId);

    console.log(`[ModalController.openSheet] Resolved ID: "${resolvedId}"`);
    console.log(`[ModalController.openSheet] Overlay:`, overlay);
    console.log(`[ModalController.openSheet] Sheet:`, sheet);
    console.log(
      `[ModalController.openSheet] Overlay hidden attr:`,
      overlay?.hidden,
    );
    console.log(
      `[ModalController.openSheet] Overlay aria-hidden:`,
      overlay?.getAttribute("aria-hidden"),
    );

    if (!overlay || !sheet) {
      console.error(`[ModalController.openSheet] Missing overlay or sheet!`);
      return;
    }

    // Render Sheet content vor dem Öffnen
    renderSheetContent(resolvedId);

    console.log(`[ModalController.openSheet] Setting overlay visible...`);
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    sheet.classList.add("bottom-sheet--visible");
    activeSheetId = resolvedId;

    console.log(`[ModalController.openSheet] Sheet opened successfully`);
    console.log(
      `[ModalController.openSheet] Overlay hidden after:`,
      overlay.hidden,
    );
    console.log(
      `[ModalController.openSheet] Overlay aria-hidden after:`,
      overlay.getAttribute("aria-hidden"),
    );
    console.log(
      `[ModalController.openSheet] Overlay display:`,
      getComputedStyle(overlay).display,
    );
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
