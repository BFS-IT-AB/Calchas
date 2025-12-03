/* Stadt-Suche Component */

class SearchInputComponent {
  constructor(inputSelector, buttonSelector, recentListSelector) {
    this.input = document.querySelector(inputSelector);
    this.button = document.querySelector(buttonSelector);
    this.recentList = document.querySelector(recentListSelector);
    this.recentCities = this._loadRecentCities();
    this.autocompleteTimeout = null;
    this.selectedSuggestionIdx = -1;

    this._setupEventListeners();
    this._renderRecentCities();
  }

  /**
   * Setup Event-Listener
   * @private
   */
  _setupEventListeners() {
    // Enter-Taste
    this.input?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.onSearch();
      }
    });

    // Button-Click
    this.button?.addEventListener("click", () => this.onSearch());

    // Input-Änderungen (für Auto-Complete später)
    this.input?.addEventListener("input", (e) => {
      this._handleInputChange(e.target.value);
    });
  }

  /**
   * Holt und validiert Search-Input
   * @returns {object} - {valid: boolean, value: string, error: string|null}
   */
  getSearchInput() {
    const value = this.input?.value || "";

    // Sanitize
    const sanitized = sanitizeInput(value);

    // Validiere
    const validation = validateCityInput(sanitized);

    if (!validation.valid) {
      return {
        valid: false,
        value: sanitized,
        error: validation.error,
      };
    }

    return {
      valid: true,
      value: sanitized,
      error: null,
    };
  }

  /**
   * Search triggern (wird vom Parent überschrieben)
   */
  onSearch() {
    const input = this.getSearchInput();

    if (!input.valid) {
      showError(input.error);
      return;
    }

    // Füge zu Recent hinzu
    this._addToRecentCities(input.value);

    // Trigger Event
    const event = new CustomEvent("search", {
      detail: { city: input.value },
    });
    window.dispatchEvent(event);
  }

  /**
   * Behandelt Input-Änderungen
   * @private
   */
  _handleInputChange(value) {
    if (value.length === 0) {
      this._hideAutocomplete();
      this._showRecentCities();
      return;
    }

    // Debounce autocomplete
    if (this.autocompleteTimeout) {
      clearTimeout(this.autocompleteTimeout);
    }

    this.autocompleteTimeout = setTimeout(() => {
      this._fetchAutocompleteSuggestions(value);
    }, 300);
  }

  /**
   * Holt Autocomplete-Vorschläge von der API
   * @private
   */
  async _fetchAutocompleteSuggestions(query) {
    if (query.length < 2) {
      this._hideAutocomplete();
      return;
    }

    try {
      this._showAutocompleteLoading();

      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&language=de&count=7&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) throw new Error("API Error");

      const data = await response.json();
      const suggestions = data.results || [];

      const formatted = suggestions
        .map((item) => ({
          name: item.name,
          displayName: this._formatDisplayName(item),
          importance: item.importance || 0,
        }))
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 7);

      // Wenn keine Ergebnisse und Query Diakritika enthält, nochmal mit bereinigter Query versuchen
      if (
        (formatted.length === 0 || formatted.every((f) => !f.name)) &&
        this._stripDiacritics(query).toLowerCase() !== query.toLowerCase()
      ) {
        try {
          const stripped = this._stripDiacritics(query);
          const resp2 = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
              stripped
            )}&language=de&count=7&format=json`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (resp2.ok) {
            const data2 = await resp2.json();
            const suggestions2 = data2.results || [];
            const formatted2 = suggestions2
              .map((item) => ({
                name: item.name,
                displayName: this._formatDisplayName(item),
                importance: item.importance || 0,
              }))
              .sort((a, b) => b.importance - a.importance)
              .slice(0, 7);

            this._showAutocompleteSuggestions(formatted2, query);
            return;
          }
        } catch (e) {
          // ignore and fall back to showing empty
        }
      }

      this._showAutocompleteSuggestions(formatted, query);
    } catch (error) {
      console.warn("Autocomplete error:", error);
      this._hideAutocomplete();
    }
  }

  /**
   * Formatiert Anzeigenamen
   * @private
   */
  _formatDisplayName(item) {
    let parts = [];
    if (item.name) parts.push(item.name);
    if (item.admin1 && item.admin1 !== item.country) parts.push(item.admin1);
    if (item.country) parts.push(item.country);
    if (parts[0]?.toLowerCase() === this.input.value.toLowerCase()) {
      parts.shift();
    }
    return parts.join(", ") || item.name;
  }

  /**
   * Entfernt diakritische Zeichen (Akzente) und normalisiert für Vergleiche
   * @private
   */
  _stripDiacritics(str) {
    if (!str) return "";
    // NFD Normalisierung + Entfernen der Combining Diacritics
    return str
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\u0131/g, "i") // spezielle Fälle falls nötig
      .replace(/ß/g, "ss");
  }

  /**
   * Findet die Position einer diakritik-ignorierenden Übereinstimmung
   * und gibt den hervorgehobenen HTML-String zurück.
   * @private
   */
  _highlightMatch(original, query) {
    if (!query) return original;

    const orig = original || "";
    const normOrigChars = [];
    const normToOrig = [];

    // Baue normalisierte Zeichenkette und Mapping
    for (let i = 0; i < orig.length; i++) {
      const ch = orig[i];
      const norm = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      for (let j = 0; j < norm.length; j++) {
        normOrigChars.push(norm[j]);
        normToOrig.push(i);
      }
    }

    const normOrig = normOrigChars.join("").toLowerCase();
    const normQuery = (query || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const idx = normOrig.indexOf(normQuery);
    if (idx === -1) return orig; // keine Übereinstimmung

    const startOrig = normToOrig[idx];
    const endOrig = normToOrig[idx + normQuery.length - 1] + 1;

    // Erzeuge hervorgehobenen String unter Verwendung der Originalindizes
    return (
      orig.substring(0, startOrig) +
      "<mark>" +
      orig.substring(startOrig, endOrig) +
      "</mark>" +
      orig.substring(endOrig)
    );
  }

  /**
   * Zeigt Autocomplete-Dropdown
   * @private
   */
  _showAutocompleteSuggestions(suggestions, query) {
    if (!this.input) return;

    let dropdown = document.getElementById("autocomplete-dropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = "autocomplete-dropdown";
      dropdown.className = "autocomplete-dropdown";
      // Einfügen in die search-box
      this.input.parentElement.appendChild(dropdown);

      this.input.addEventListener("keydown", (e) =>
        this._handleKeyboard(e, suggestions)
      );
      this.input.addEventListener("blur", () => {
        setTimeout(() => this._hideAutocomplete(), 200);
      });
    }

    if (suggestions.length === 0) {
      dropdown.innerHTML =
        '<div class="autocomplete-no-results">Keine Vorschläge gefunden</div>';
      dropdown.style.display = "block";
      return;
    }

    dropdown.innerHTML = suggestions
      .map(
        (s, idx) => `
      <div class="autocomplete-item" data-idx="${idx}" data-city="${
          s.displayName
        }">
        <div class="autocomplete-main">
          <strong>${this._highlightMatch(s.name, query)}</strong>
          <span class="autocomplete-secondary">${s.displayName.replace(
            s.name + ", ",
            ""
          )}</span>
        </div>
        <div class="autocomplete-icon">📍</div>
      </div>
    `
      )
      .join("");

    dropdown.style.display = "block";
    this.selectedSuggestionIdx = -1;

    dropdown.querySelectorAll(".autocomplete-item").forEach((item) => {
      item.addEventListener("click", () => {
        // Nur die Stadt (ersten Teil) nehmen, nicht Region/Land
        const fullName = item.dataset.city;
        const cityOnly = fullName.split(",")[0].trim();
        this.input.value = cityOnly;
        this._hideAutocomplete();
        this.onSearch();
      });

      item.addEventListener("mouseenter", () => {
        this._updateSuggestionHighlight(parseInt(item.dataset.idx), dropdown);
      });
    });
  }

  /**
   * Zeigt Loading-State
   * @private
   */
  _showAutocompleteLoading() {
    let dropdown = document.getElementById("autocomplete-dropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = "autocomplete-dropdown";
      dropdown.className = "autocomplete-dropdown";
      this.input.parentElement.appendChild(dropdown);
    }
    dropdown.innerHTML =
      '<div class="autocomplete-loading">⏳ Suche Vorschläge...</div>';
    dropdown.style.display = "block";
  }

  /**
   * Versteckt Autocomplete
   * @private
   */
  _hideAutocomplete() {
    const dropdown = document.getElementById("autocomplete-dropdown");
    if (dropdown) {
      dropdown.style.display = "none";
    }
  }

  /**
   * Tastatur-Navigation
   * @private
   */
  _handleKeyboard(e, suggestions) {
    const dropdown = document.getElementById("autocomplete-dropdown");
    if (!dropdown || dropdown.style.display === "none") return;

    const items = dropdown.querySelectorAll(".autocomplete-item");
    if (items.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.selectedSuggestionIdx = Math.min(
          this.selectedSuggestionIdx + 1,
          items.length - 1
        );
        this._updateSuggestionHighlight(this.selectedSuggestionIdx, dropdown);
        break;

      case "ArrowUp":
        e.preventDefault();
        this.selectedSuggestionIdx = Math.max(
          this.selectedSuggestionIdx - 1,
          -1
        );
        if (this.selectedSuggestionIdx === -1) {
          items.forEach((item) => item.classList.remove("selected"));
        } else {
          this._updateSuggestionHighlight(this.selectedSuggestionIdx, dropdown);
        }
        break;

      case "Enter":
        e.preventDefault();
        if (this.selectedSuggestionIdx >= 0) {
          items[this.selectedSuggestionIdx].click();
        } else {
          this.onSearch();
        }
        break;

      case "Escape":
        e.preventDefault();
        this._hideAutocomplete();
        break;
    }
  }

  /**
   * Aktualisiert Highlight
   * @private
   */
  _updateSuggestionHighlight(idx, dropdown) {
    dropdown.querySelectorAll(".autocomplete-item").forEach((item) => {
      item.classList.remove("selected");
    });

    if (idx >= 0) {
      const items = dropdown.querySelectorAll(".autocomplete-item");
      if (items[idx]) {
        items[idx].classList.add("selected");
        items[idx].scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  /**
   * Zeigt zuletzt gesuchte Städte
   * @private
   */
  _showRecentCities() {
    this._renderRecentCities();
  }

  /**
   * Fügt Stadt zu Recent-Liste hinzu
   * @private
   */
  _addToRecentCities(city) {
    // Entferne falls schon vorhanden
    this.recentCities = this.recentCities.filter(
      (c) => c.toLowerCase() !== city.toLowerCase()
    );

    // Füge am Anfang ein
    this.recentCities.unshift(city);

    // Begrenzte auf MAX_RECENT_CITIES
    this.recentCities = this.recentCities.slice(0, UI_CONFIG.MAX_RECENT_CITIES);

    // Speichere
    this._saveRecentCities();
  }

  /**
   * Rendert Recent-Städte-Liste
   * @private
   */
  _renderRecentCities() {
    if (!this.recentList) return;

    if (this.recentCities.length === 0) {
      this.recentList.innerHTML =
        '<p class="text-muted">Keine zuletzt gesuchten Orte</p>';
      return;
    }

    this.recentList.innerHTML = `
      <div class="recent-header">
        <span>🕐 Zuletzt gesucht</span>
        <button class="btn-small js-clear-recents" type="button">✕ Löschen</button>
      </div>
      <div class="recent-items">
        ${this.recentCities
          .map(
            (city, idx) => `
          <div class="recent-item" data-city="${city}">
            <span>${city}</span>
            <button class="btn-remove" data-idx="${idx}">✕</button>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    // Event-Listener für Recent-Items
    this.recentList.querySelectorAll(".recent-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (!e.target.classList.contains("btn-remove")) {
          this.input.value = item.dataset.city;
          this.onSearch();
        }
      });
    });

    // Event-Listener für Remove-Buttons
    this.recentList.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._removeFromRecentCities(parseInt(btn.dataset.idx));
      });
    });

    const inlineClearBtn = this.recentList.querySelector(".js-clear-recents");
    if (inlineClearBtn) {
      inlineClearBtn.addEventListener("click", () => {
        const clearHelper =
          (typeof window !== "undefined" && window.clearSearchHistory) || null;
        if (typeof clearHelper === "function") {
          clearHelper();
        } else {
          this.clearRecent();
        }
      });
    }
  }

  /**
   * Entfernt eine Stadt aus Recent
   * @private
   */
  _removeFromRecentCities(index) {
    this.recentCities.splice(index, 1);
    this._saveRecentCities();
    this._renderRecentCities();
  }

  /**
   * Löscht alle Recent-Städte
   */
  clearRecent() {
    const removedCount = this.recentCities.length;
    this.recentCities = [];
    this._saveRecentCities();
    this._renderRecentCities();
    if (
      removedCount > 0 &&
      typeof window !== "undefined" &&
      window.logAnalyticsEvent
    ) {
      window.logAnalyticsEvent("settings_action", {
        action: "clear_recent",
        removedCount,
      });
    }
    return removedCount > 0;
  }

  /**
   * Lädt Recent-Städte aus localStorage
   * @private
   */
  _loadRecentCities() {
    try {
      const stored = localStorage.getItem("wetter_recent_cities");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn("Fehler beim Laden von Recent-Städten:", e);
      return [];
    }
  }

  /**
   * Speichert Recent-Städte in localStorage
   * @private
   */
  _saveRecentCities() {
    try {
      localStorage.setItem(
        "wetter_recent_cities",
        JSON.stringify(this.recentCities)
      );
    } catch (e) {
      console.warn("Fehler beim Speichern von Recent-Städten:", e);
    }
  }

  /**
   * Setzt Input zurück
   */
  clear() {
    this.input.value = "";
    this.input.focus();
  }

  /**
   * Aktiviert/Deaktiviert das Input
   */
  setEnabled(enabled) {
    this.input.disabled = !enabled;
    this.button.disabled = !enabled;
  }

  /**
   * Zeigt Loading-State
   */
  setLoading(loading) {
    if (loading) {
      this.button.textContent = "⏳ Laden...";
      this.button.disabled = true;
      this.input.disabled = true;
    } else {
      this.button.textContent = "🔍 Suchen";
      this.button.disabled = false;
      this.input.disabled = false;
    }
  }
}
