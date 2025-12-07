/**
 * LocationPickerController - Handles location search, favorites, and recent searches
 */
(function (global) {
  const STORAGE_KEY_FAVORITES = "weather-favorites";
  const STORAGE_KEY_RECENTS = "weather-recents";
  const MAX_RECENTS = 5;

  let searchTimeout = null;

  function init() {
    const searchInput = document.getElementById("location-search-input");
    const searchResults = document.getElementById("location-search-results");
    const currentLocationBtn = document.getElementById("use-current-location");
    const favoritesList = document.getElementById("favorites-list");
    const recentsList = document.getElementById("recents-list");

    if (searchInput && searchResults) {
      searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query.length < 2) {
          searchResults.hidden = true;
          return;
        }
        searchTimeout = setTimeout(
          () => searchLocations(query, searchResults),
          300
        );
      });
    }

    if (currentLocationBtn) {
      currentLocationBtn.addEventListener("click", handleCurrentLocation);
    }

    renderFavorites(favoritesList);
    renderRecents(recentsList);

    // Also update lists when sheet opens
    document.addEventListener("click", (event) => {
      if (
        event.target.closest(
          '[data-bottom-sheet-target="sheet-location-picker"]'
        )
      ) {
        setTimeout(() => {
          renderFavorites(favoritesList);
          renderRecents(recentsList);
        }, 100);
      }
    });
  }

  async function searchLocations(query, resultsContainer) {
    if (!resultsContainer) return;

    resultsContainer.innerHTML =
      '<li class="location-search__loading">Suche...</li>';
    resultsContainer.hidden = false;

    try {
      // Use Open-Meteo Geocoding API
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=5&language=de&format=json`
      );
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML =
          '<li class="location-search__empty">Keine Ergebnisse gefunden</li>';
        return;
      }

      resultsContainer.innerHTML = "";
      data.results.forEach((result) => {
        const li = document.createElement("li");
        li.className = "location-search__item";

        const cityData = {
          name: result.name,
          lat: result.latitude,
          lon: result.longitude,
          country: result.country || "",
          admin1: result.admin1 || "",
        };

        const isFavorite = isCityFavorite(cityData);

        li.innerHTML = `
          <span class="location-search__name">${formatLocationName(
            result
          )}</span>
          <button class="location-search__fav-btn ${
            isFavorite ? "is-favorite" : ""
          }"
                  type="button"
                  aria-label="${
                    isFavorite
                      ? "Aus Favoriten entfernen"
                      : "Zu Favoriten hinzufügen"
                  }"
                  title="${
                    isFavorite
                      ? "Aus Favoriten entfernen"
                      : "Zu Favoriten hinzufügen"
                  }">
            ${isFavorite ? "⭐" : "☆"}
          </button>
        `;

        // Click on name selects location
        li.querySelector(".location-search__name").addEventListener(
          "click",
          () => {
            selectLocation(result);
          }
        );

        // Click on star toggles favorite
        li.querySelector(".location-search__fav-btn").addEventListener(
          "click",
          (e) => {
            e.stopPropagation();
            toggleFavorite(cityData, e.target);
          }
        );

        resultsContainer.appendChild(li);
      });
    } catch (error) {
      console.error("Location search error:", error);
      resultsContainer.innerHTML =
        '<li class="location-search__error">Fehler bei der Suche</li>';
    }
  }

  function formatLocationName(location) {
    const parts = [location.name];
    if (location.admin1) parts.push(location.admin1);
    if (location.country) parts.push(location.country);
    return parts.join(", ");
  }

  function selectLocation(location) {
    const cityData = {
      name: location.name,
      lat: location.latitude,
      lon: location.longitude,
      country: location.country || "",
      admin1: location.admin1 || "",
    };

    // Add to recents
    addToRecents(cityData);

    // Close modal
    if (window.ModalController) {
      window.ModalController.closeSheet();
    }

    // Clear search
    const searchInput = document.getElementById("location-search-input");
    const searchResults = document.getElementById("location-search-results");
    if (searchInput) searchInput.value = "";
    if (searchResults) searchResults.hidden = true;

    // Load weather for this location using coordinates directly
    if (typeof window.loadWeatherByCoords === "function") {
      window.loadWeatherByCoords(cityData.lat, cityData.lon, cityData.name);
    } else if (typeof window.loadWeather === "function") {
      window.loadWeather(cityData.name);
    }
  }

  function handleCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation wird von deinem Browser nicht unterstützt.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        if (window.ModalController) {
          window.ModalController.closeSheet();
        }

        // Try to get location name via reverse geocoding
        let locationName = "Aktueller Standort";
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          if (data && data.address) {
            locationName =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.municipality ||
              "Aktueller Standort";
          }
        } catch (e) {
          console.warn("Reverse geocoding failed:", e);
        }

        if (typeof window.loadWeatherByCoords === "function") {
          window.loadWeatherByCoords(latitude, longitude, locationName);
        } else if (typeof window.loadWeather === "function") {
          window.loadWeather(locationName);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Standort konnte nicht ermittelt werden.");
      }
    );
  }

  // Favorites Management
  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_FAVORITES)) || [];
    } catch {
      return [];
    }
  }

  function saveFavorites(favorites) {
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
  }

  function isCityFavorite(cityData) {
    const favorites = getFavorites();
    return favorites.some(
      (f) =>
        Math.abs(f.lat - cityData.lat) < 0.01 &&
        Math.abs(f.lon - cityData.lon) < 0.01
    );
  }

  function toggleFavorite(cityData, buttonEl) {
    const isFav = isCityFavorite(cityData);
    if (isFav) {
      removeFromFavorites(cityData);
      buttonEl.textContent = "☆";
      buttonEl.classList.remove("is-favorite");
      buttonEl.setAttribute("aria-label", "Zu Favoriten hinzufügen");
      buttonEl.title = "Zu Favoriten hinzufügen";
    } else {
      addToFavorites(cityData);
      buttonEl.textContent = "⭐";
      buttonEl.classList.add("is-favorite");
      buttonEl.setAttribute("aria-label", "Aus Favoriten entfernen");
      buttonEl.title = "Aus Favoriten entfernen";
    }
    // Update favorites list if visible
    const favoritesList = document.getElementById("favorites-list");
    if (favoritesList) {
      renderFavorites(favoritesList);
    }
  }

  function addToFavorites(cityData) {
    const favorites = getFavorites();
    const exists = favorites.some(
      (f) => f.lat === cityData.lat && f.lon === cityData.lon
    );
    if (!exists) {
      favorites.push(cityData);
      saveFavorites(favorites);
    }
  }

  function removeFromFavorites(cityData) {
    const favorites = getFavorites().filter(
      (f) => f.lat !== cityData.lat || f.lon !== cityData.lon
    );
    saveFavorites(favorites);
  }

  function renderFavorites(container) {
    if (!container) return;
    const favorites = getFavorites();

    if (favorites.length === 0) {
      container.innerHTML =
        '<li class="location-list__empty">Keine Favoriten gespeichert</li>';
      return;
    }

    container.innerHTML = "";
    favorites.forEach((fav) => {
      const li = document.createElement("li");
      li.className = "location-list__item";
      li.innerHTML = `
        <span class="location-list__name">${fav.name}${
        fav.country ? ", " + fav.country : ""
      }</span>
        <button class="location-list__remove" type="button" aria-label="Entfernen">
          <span class="material-symbols-outlined">close</span>
        </button>
      `;

      li.querySelector(".location-list__name").addEventListener("click", () => {
        selectLocation({ ...fav, latitude: fav.lat, longitude: fav.lon });
      });

      li.querySelector(".location-list__remove").addEventListener(
        "click",
        (e) => {
          e.stopPropagation();
          removeFromFavorites(fav);
          renderFavorites(container);
        }
      );

      container.appendChild(li);
    });
  }

  // Recents Management
  function getRecents() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_RECENTS)) || [];
    } catch {
      return [];
    }
  }

  function saveRecents(recents) {
    localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(recents));
  }

  function addToRecents(cityData) {
    let recents = getRecents();
    // Remove if already exists
    recents = recents.filter(
      (r) => r.lat !== cityData.lat || r.lon !== cityData.lon
    );
    // Add to front
    recents.unshift(cityData);
    // Keep max
    recents = recents.slice(0, MAX_RECENTS);
    saveRecents(recents);
  }

  function renderRecents(container) {
    if (!container) return;
    const recents = getRecents();

    if (recents.length === 0) {
      container.innerHTML =
        '<li class="location-list__empty">Keine kürzlichen Suchen</li>';
      return;
    }

    container.innerHTML = "";
    recents.forEach((recent) => {
      const li = document.createElement("li");
      li.className = "location-list__item";
      li.innerHTML = `
        <span class="location-list__name">${recent.name}${
        recent.country ? ", " + recent.country : ""
      }</span>
      `;
      li.addEventListener("click", () => {
        selectLocation({
          ...recent,
          latitude: recent.lat,
          longitude: recent.lon,
        });
      });
      container.appendChild(li);
    });
  }

  // Expose to global
  global.LocationPickerController = {
    init,
    getFavorites,
    addToFavorites,
    removeFromFavorites,
    getRecents,
    addToRecents,
  };
})(window);
