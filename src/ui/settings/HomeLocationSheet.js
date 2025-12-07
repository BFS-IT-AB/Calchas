/**
 * HomeLocationSheet.js - Heimatort-Verwaltung
 * Design inspiriert von WeatherMaster App
 */
(function (global) {
  const STORAGE_KEY_FAVORITES = "weather-favorites";

  // Get favorites from localStorage (same as LocationPickerController)
  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_FAVORITES)) || [];
    } catch {
      return [];
    }
  }

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

  function renderHomeSheet(appState) {
    const container = document.getElementById("settings-home-body");
    if (!container) return;

    const t = global.i18n
      ? global.i18n.t
      : (key) => {
          const fallbacks = {
            "settings.home.title": "Aktueller Heimatort",
            "settings.home.noHome": "Nicht gesetzt",
            "settings.home.clear": "Zurücksetzen",
            "settings.home.favoritesTitle": "Favoriten",
            "settings.home.noFavorites": "Keine Favoriten gespeichert",
            "settings.home.setAsHome": "Als Heimatort setzen",
            "settings.home.search": "Ort suchen...",
            "settings.home.setNewHome": "Neuen Heimatort festlegen",
            "settings.home.useCurrentLocation": "Aktuellen Standort verwenden",
          };
          return fallbacks[key] || key;
        };

    const home = appState.homeLocation || appState.home || null;
    // Load favorites from localStorage (same source as LocationPickerController)
    const favorites = getFavorites();

    container.innerHTML =
      '<div class="home-settings">' +
      '<div class="home-section">' +
      '<h3 class="home-section__title">' +
      t("settings.home.title") +
      "</h3>" +
      '<div class="home-current">' +
      '<span class="home-current__icon">📍</span>' +
      '<span class="home-current__text">' +
      (home
        ? home.city + (home.country ? ", " + home.country : "")
        : t("settings.home.noHome")) +
      "</span>" +
      "</div>" +
      '<button type="button" class="home-clear-btn" id="home-clear-btn" ' +
      (home ? "" : "disabled") +
      ">" +
      t("settings.home.clear") +
      "</button>" +
      "</div>" +
      '<div class="home-section">' +
      '<h3 class="home-section__title">' +
      t("settings.home.setNewHome") +
      "</h3>" +
      '<div class="home-search">' +
      '<input type="text" class="home-search__input" id="home-search-input" placeholder="' +
      t("settings.home.search") +
      '" />' +
      '<div class="home-search__results" id="home-search-results"></div>' +
      "</div>" +
      '<button type="button" class="home-location-btn" id="home-use-location">' +
      '<span class="home-location-btn__icon">📍</span>' +
      "<span>" +
      t("settings.home.useCurrentLocation") +
      "</span>" +
      "</button>" +
      "</div>" +
      '<div class="home-section">' +
      '<h3 class="home-section__title">' +
      t("settings.home.favoritesTitle") +
      "</h3>" +
      '<div class="home-favorites">' +
      (favorites.length === 0
        ? '<p class="home-section__empty">' +
          t("settings.home.noFavorites") +
          "</p>"
        : favorites
            .map(function (fav, idx) {
              // Support both old format (city, coords) and new format (name, lat, lon)
              const cityName = fav.city || fav.name || "Unbekannt";
              const countryName = fav.country || "";
              const displayName = countryName
                ? cityName + ", " + countryName
                : cityName;
              return (
                '<button type="button" class="home-favorite-item" data-fav-index="' +
                idx +
                '">' +
                '<span class="home-favorite-item__icon">⭐</span>' +
                '<span class="home-favorite-item__text">' +
                displayName +
                "</span>" +
                '<span class="home-favorite-item__action">' +
                t("settings.home.setAsHome") +
                "</span>" +
                "</button>"
              );
            })
            .join("")) +
      "</div>" +
      "</div>" +
      "</div>";

    // Clear button handler
    var clearBtn = document.getElementById("home-clear-btn");
    if (clearBtn && home && appState.clearHomeLocation) {
      clearBtn.addEventListener("click", function () {
        appState.clearHomeLocation();
        renderHomeSheet(appState);
      });
    }

    // Favorites handlers
    container.querySelectorAll("[data-fav-index]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-fav-index"), 10);
        var fav = favorites[idx];
        if (!fav || !appState.setHomeLocation) return;

        // Support both old format (city, coords) and new format (name, lat, lon)
        const cityName = fav.city || fav.name || "Unbekannt";
        const coords = fav.coords || { lat: fav.lat, lon: fav.lon };

        appState.setHomeLocation(cityName, coords, {
          country: fav.country || "",
          countryCode: fav.countryCode || "",
        });
        showToast("✓ Heimatort auf " + cityName + " gesetzt");
        renderHomeSheet(appState);
      });
    });

    // Search handler
    var searchInput = document.getElementById("home-search-input");
    var searchResults = document.getElementById("home-search-results");
    var searchTimeout = null;

    if (searchInput && searchResults) {
      searchInput.addEventListener("input", function () {
        var query = searchInput.value.trim();
        if (searchTimeout) clearTimeout(searchTimeout);

        if (query.length < 2) {
          searchResults.innerHTML = "";
          searchResults.classList.remove("home-search__results--visible");
          return;
        }

        searchTimeout = setTimeout(function () {
          searchLocation(query, searchResults, appState, renderHomeSheet);
        }, 300);
      });
    }

    // Use current location handler
    var useLocationBtn = document.getElementById("home-use-location");
    if (useLocationBtn) {
      useLocationBtn.addEventListener("click", function () {
        if (!navigator.geolocation) {
          alert("Geolokalisierung wird nicht unterstützt");
          return;
        }

        useLocationBtn.disabled = true;
        useLocationBtn.innerHTML =
          '<span class="home-location-btn__icon">⏳</span><span>Standort wird ermittelt...</span>';

        navigator.geolocation.getCurrentPosition(
          function (position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;

            // Reverse geocoding
            fetch(
              "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
                lat +
                "&lon=" +
                lon +
                "&accept-language=de"
            )
              .then(function (res) {
                return res.json();
              })
              .then(function (data) {
                var city =
                  data.address.city ||
                  data.address.town ||
                  data.address.village ||
                  data.address.municipality ||
                  "Unbekannt";
                var country = data.address.country || "";
                var countryCode = data.address.country_code
                  ? data.address.country_code.toUpperCase()
                  : "";

                if (appState.setHomeLocation) {
                  appState.setHomeLocation(
                    city,
                    { lat: lat, lon: lon },
                    {
                      country: country,
                      countryCode: countryCode,
                    }
                  );
                }
                showToast("✓ Heimatort auf " + city + " gesetzt");
                renderHomeSheet(appState);
              })
              .catch(function () {
                useLocationBtn.disabled = false;
                useLocationBtn.innerHTML =
                  '<span class="home-location-btn__icon">📍</span><span>' +
                  t("settings.home.useCurrentLocation") +
                  "</span>";
                alert("Fehler beim Ermitteln des Standorts");
              });
          },
          function (err) {
            useLocationBtn.disabled = false;
            useLocationBtn.innerHTML =
              '<span class="home-location-btn__icon">📍</span><span>' +
              t("settings.home.useCurrentLocation") +
              "</span>";
            alert("Standort konnte nicht ermittelt werden: " + err.message);
          }
        );
      });
    }
  }

  function searchLocation(query, resultsContainer, appState, rerender) {
    fetch(
      "https://nominatim.openstreetmap.org/search?format=json&q=" +
        encodeURIComponent(query) +
        "&limit=5&accept-language=de"
    )
      .then(function (res) {
        return res.json();
      })
      .then(function (results) {
        if (results.length === 0) {
          resultsContainer.innerHTML =
            '<div class="home-search__empty">Keine Ergebnisse gefunden</div>';
          resultsContainer.classList.add("home-search__results--visible");
          return;
        }

        var html = results
          .map(function (r) {
            var name = r.display_name.split(",")[0];
            var fullName = r.display_name;
            return (
              '<button type="button" class="home-search__result" data-lat="' +
              r.lat +
              '" data-lon="' +
              r.lon +
              '" data-name="' +
              name +
              '" data-full="' +
              fullName +
              '">' +
              '<span class="home-search__result-name">' +
              name +
              "</span>" +
              '<span class="home-search__result-detail">' +
              fullName +
              "</span>" +
              "</button>"
            );
          })
          .join("");

        resultsContainer.innerHTML = html;
        resultsContainer.classList.add("home-search__results--visible");

        resultsContainer
          .querySelectorAll(".home-search__result")
          .forEach(function (btn) {
            btn.addEventListener("click", function () {
              var lat = parseFloat(btn.dataset.lat);
              var lon = parseFloat(btn.dataset.lon);
              var name = btn.dataset.name;
              var full = btn.dataset.full;

              // Extract country from full name
              var parts = full.split(",");
              var country =
                parts.length > 1 ? parts[parts.length - 1].trim() : "";

              if (appState.setHomeLocation) {
                appState.setHomeLocation(
                  name,
                  { lat: lat, lon: lon },
                  {
                    country: country,
                    countryCode: "",
                  }
                );
              }
              resultsContainer.innerHTML = "";
              resultsContainer.classList.remove(
                "home-search__results--visible"
              );
              showToast("✓ Heimatort auf " + name + " gesetzt");
              rerender(appState);
            });
          });
      })
      .catch(function (err) {
        console.error("Suche fehlgeschlagen:", err);
        resultsContainer.innerHTML =
          '<div class="home-search__empty">Fehler bei der Suche</div>';
        resultsContainer.classList.add("home-search__results--visible");
      });
  }

  global.HomeLocationSheet = { renderHomeSheet };
})(window);
