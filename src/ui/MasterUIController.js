/**
 * MasterUIController.js - Centralized UI Controller
 *
 * Single source of truth for ALL modal and card interactions.
 * Uses the Health-page components as the absolute blueprint.
 *
 * Features:
 * - Event Delegation (single click listener on main container)
 * - CSS-class-based transitions (.is-visible, .is-active)
 * - Global scrim element management
 * - Unified card/modal interactions
 * - Zero custom JS-math animations (pure CSS)
 *
 * @module ui/MasterUIController
 * @version 1.0.0
 */
(function (global) {
  "use strict";

  // ===========================================
  // CONFIGURATION - Extracted from Health-page
  // ===========================================
  const CONFIG = {
    // Timing - EXACT from health.css
    transitionFast: 150, // --health-transition-fast
    transitionNormal: 250, // --health-transition-normal
    transitionSlow: 400, // --health-transition-slow

    // Easing - EXACT cubic-bezier from health.css
    easingDefault: "ease",
    easingSlow: "cubic-bezier(0.4, 0, 0.2, 1)",

    // Selectors
    cardSelector: ".standard-card",
    modalOverlayId: "master-scrim",
    sheetClass: "standard-modal",

    // Z-indices
    scrimZIndex: 99998,
    modalZIndex: 99999,
  };

  // ===========================================
  // STATE
  // ===========================================
  let state = {
    activeModalId: null,
    isAnimating: false,
    scrimElement: null,
  };

  // ===========================================
  // SCRIM MANAGEMENT - Single global scrim
  // ===========================================

  /**
   * Get or create the global scrim element
   * @returns {HTMLElement} The scrim element
   */
  function getOrCreateScrim() {
    if (state.scrimElement && document.body.contains(state.scrimElement)) {
      return state.scrimElement;
    }

    // FIXED: Use the EXISTING #bottom-sheet-overlay from index.html
    // The modals are children of this element, so we MUST use it as the scrim
    let scrim = document.getElementById("bottom-sheet-overlay");

    if (!scrim) {
      // Fallback: create new scrim if overlay doesn't exist (shouldn't happen)
      console.warn(
        "[MasterUI] #bottom-sheet-overlay not found, creating fallback",
      );
      scrim = document.createElement("div");
      scrim.id = "bottom-sheet-overlay";
      scrim.className = "bottom-sheet-overlay";
      document.body.appendChild(scrim);
    }

    scrim.setAttribute("aria-hidden", "true");

    // Remove any orphaned scrims from old systems (but NOT our overlay)
    document
      .querySelectorAll("#master-scrim, #modal-scrim, .flip-scrim")
      .forEach((el) => el.remove());

    // Click on scrim (but not on modal content) closes modal
    if (!scrim._masterUIClickHandler) {
      scrim._masterUIClickHandler = true;
      scrim.addEventListener("click", (e) => {
        // Only close if clicking directly on the overlay, not on modal content
        if (
          e.target === scrim ||
          e.target.classList.contains("bottom-sheet-overlay")
        ) {
          closeActiveModal();
        }
      });
    }

    state.scrimElement = scrim;
    return scrim;
  }

  /**
   * Show the scrim with animation
   */
  function showScrim() {
    const scrim = getOrCreateScrim();

    // Force reflow before adding class (ensures CSS transition triggers)
    void scrim.offsetHeight;

    // FIXED: Add the correct class for the existing overlay structure
    scrim.classList.add("is-open");
    scrim.classList.add("is-visible"); // Keep for backwards compatibility
    scrim.setAttribute("aria-hidden", "false");

    console.log(
      "[MasterUI] Scrim shown:",
      scrim.id,
      scrim.classList.toString(),
    );
  }

  /**
   * Hide the scrim with animation
   */
  function hideScrim() {
    const scrim = state.scrimElement;
    if (scrim) {
      scrim.classList.remove("is-open");
      scrim.classList.remove("is-visible");
      scrim.setAttribute("aria-hidden", "true");
    }
  }

  /**
   * Completely remove the scrim (cleanup)
   */
  function destroyScrim() {
    if (state.scrimElement) {
      state.scrimElement.remove();
      state.scrimElement = null;
    }
    // Also clean up any legacy scrims
    document
      .querySelectorAll(
        "#master-scrim, #modal-scrim, .flip-scrim, .flip-phantom",
      )
      .forEach((el) => el.remove());
  }

  // ===========================================
  // MODAL MANAGEMENT
  // ===========================================

  /**
   * Resolve a modal ID from various input formats
   * @param {string} idOrMetric - Sheet ID, metric name, or data attribute value
   * @returns {string|null} Resolved modal ID
   */
  function resolveModalId(idOrMetric) {
    if (!idOrMetric) return null;

    // Already has sheet- prefix
    if (idOrMetric.startsWith("sheet-")) return idOrMetric;

    // Has metric- prefix
    if (idOrMetric.startsWith("metric-")) return "sheet-" + idOrMetric;

    // Common metric mappings
    const metricMapping = {
      wind: "sheet-metric-wind",
      precipitation: "sheet-metric-precipitation",
      uv: "sheet-metric-uv",
      visibility: "sheet-metric-visibility",
      aqi: "sheet-aqi",
      "temperature-trend": "sheet-temperature-trend",
      "sun-cloud": "sheet-sun-cloud",
      "map-layers": "sheet-map-layers",
      "location-picker": "sheet-location-picker",
      settings: "sheet-settings",
    };

    return metricMapping[idOrMetric] || idOrMetric;
  }

  /**
   * Ensure modal has the standard drag handle (Health modal style)
   * @param {HTMLElement} modal - The modal element
   */
  function ensureDragHandle(modal) {
    // Check for both class names (standard and legacy)
    if (
      !modal.querySelector(".bottom-sheet__handle, .standard-modal__handle")
    ) {
      const handle = document.createElement("div");
      // Use the Health modal class name
      handle.className = "bottom-sheet__handle";
      handle.setAttribute("aria-hidden", "true");
      modal.insertBefore(handle, modal.firstChild);
    }
  }

  /**
   * Open a modal by ID
   * Uses EXACT same technique as Health-page (requestAnimationFrame for class toggle)
   *
   * @param {string} modalId - The modal ID to open
   * @param {HTMLElement} [sourceElement] - Optional source element (for future use)
   */
  function openModal(modalId, sourceElement) {
    console.log("[MasterUI] openModal called:", modalId);

    if (state.isAnimating) {
      console.log("[MasterUI] Animation in progress, skipping");
      return;
    }

    const resolvedId = resolveModalId(modalId);
    const modal = resolvedId && document.getElementById(resolvedId);

    console.log("[MasterUI] Resolved ID:", resolvedId, "Modal found:", !!modal);

    if (!modal) {
      console.warn("[MasterUI] Modal not found:", modalId);
      return;
    }

    // Close any currently open modal first
    if (state.activeModalId && state.activeModalId !== resolvedId) {
      closeActiveModal(true); // silent close (no animation wait)
    }

    state.isAnimating = true;
    state.activeModalId = resolvedId;

    // Ensure drag handle exists
    ensureDragHandle(modal);

    // Lock body scroll
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");

    // Show scrim (this now shows the existing #bottom-sheet-overlay)
    showScrim();

    // Render content if applicable (use ModalContentRenderer or legacy ModalController)
    const contentRenderer =
      global.ModalContentRenderer || global.ModalController;
    if (contentRenderer?.renderSheetContent) {
      try {
        contentRenderer.renderSheetContent(resolvedId);
      } catch (e) {
        console.warn("[MasterUI] Content render failed:", e);
      }
    }

    // STUTTER FIX: Double-requestAnimationFrame pattern
    // First RAF: Browser paints the modal in hidden/off-screen state (display:flex, transform:translateY(100%))
    // Second RAF: Apply visible class AFTER browser has painted, triggering smooth CSS transition
    // This is the EXACT technique used by the Health-page "Outfit für heute" modal
    modal.style.display = "flex";
    modal.style.flexDirection = "column";

    requestAnimationFrame(() => {
      // Force style recalc - browser now knows modal is display:flex at translateY(100%)
      void modal.offsetHeight;

      requestAnimationFrame(() => {
        // NOW add visible classes - CSS transition will animate from 100% to 0
        modal.classList.add("is-visible");
        modal.classList.add("standard-modal--visible");
        modal.classList.add("bottom-sheet--visible");

        console.log(
          "[MasterUI] Modal classes applied:",
          modal.id,
          modal.classList.toString(),
        );

        state.isAnimating = false;
      });
    });

    // Accessibility
    modal.setAttribute("aria-hidden", "false");

    // Focus management
    const firstFocusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), CONFIG.transitionSlow);
    }
  }

  /**
   * Close the currently active modal
   * Uses EXACT same 400ms delay as Health-page modal transition
   *
   * @param {boolean} [silent=false] - If true, skip animation delay
   */
  function closeActiveModal(silent = false) {
    const modal =
      state.activeModalId && document.getElementById(state.activeModalId);

    console.log(
      "[MasterUI] closeActiveModal called, modal:",
      state.activeModalId,
    );

    // Remove visible classes - this triggers the CSS transition back to translateY(100%)
    if (modal) {
      modal.classList.remove("is-visible");
      modal.classList.remove("standard-modal--visible");
      modal.classList.remove("bottom-sheet--visible");
      modal.setAttribute("aria-hidden", "true");
    }

    // Hide scrim (250ms transition)
    hideScrim();

    const cleanup = () => {
      // Unlock body scroll
      document.body.classList.remove("modal-open", "bg-dimmed", "scrim-active");
      document.documentElement.classList.remove(
        "modal-open",
        "bg-dimmed",
        "scrim-active",
      );

      // Reset display to none AFTER transition completes
      if (modal) {
        modal.style.display = "";
      }

      // Clean up any leftover elements from old systems
      document
        .querySelectorAll(".flip-phantom, .flip-scrim")
        .forEach((el) => el.remove());

      // Reset app container filters
      const appContainer =
        document.getElementById("app-container") ||
        document.getElementById("app") ||
        document.querySelector("main");
      if (appContainer) {
        appContainer.style.filter = "";
        appContainer.style.transform = "";
      }

      state.activeModalId = null;
      state.isAnimating = false;
    };

    if (silent) {
      cleanup();
    } else {
      // EXACT from health.css: 400ms = var(--ui-transition-slow) for modal slide-down
      // Wait for full transition before hiding display
      setTimeout(cleanup, CONFIG.transitionSlow);
    }
  }

  /**
   * Close all modals (alias for closeActiveModal)
   */
  function closeAll() {
    closeActiveModal();
  }

  // ===========================================
  // CARD INTERACTIONS
  // ===========================================

  /**
   * Handle card press (mouse down / touch start)
   * Adds the .is-active class for press effect
   *
   * @param {HTMLElement} card - The card element
   */
  function handleCardPress(card) {
    card.classList.add("is-active");
  }

  /**
   * Handle card release (mouse up / touch end)
   * Removes the .is-active class
   *
   * @param {HTMLElement} card - The card element
   */
  function handleCardRelease(card) {
    card.classList.remove("is-active");
  }

  // ===========================================
  // EVENT DELEGATION - Single listener pattern
  // ===========================================

  /**
   * Initialize the Master UI Controller
   * Sets up event delegation on document.body
   */
  function init() {
    // Prevent double initialization
    if (global.MasterUIController?._initialized) {
      console.log("[MasterUI] Already initialized");
      return;
    }

    console.log("[MasterUI] Initializing Master UI Controller");

    // Create scrim element
    getOrCreateScrim();

    // ===========================================
    // CLICK DELEGATION
    // ===========================================
    document.addEventListener(
      "click",
      (e) => {
        // Check for modal triggers
        const trigger =
          e.target.closest("[data-bottom-sheet]") ||
          e.target.closest("[data-bottom-sheet-target]") ||
          e.target.closest("[data-modal]");

        if (trigger) {
          const targetId =
            trigger.getAttribute("data-bottom-sheet") ||
            trigger.getAttribute("data-bottom-sheet-target") ||
            trigger.getAttribute("data-modal");
          if (targetId) {
            e.preventDefault();
            openModal(targetId, trigger);
            return;
          }
        }

        // Check for close buttons
        if (
          e.target.closest("[data-close-sheet]") ||
          e.target.closest("[data-close-modal]") ||
          e.target.closest(".standard-modal__close") ||
          e.target.closest(".bottom-sheet__close")
        ) {
          closeActiveModal();
          return;
        }

        // Check for card clicks that should open modals
        const card = e.target.closest(".standard-card[data-detail-type]");
        if (card) {
          const detailType = card.getAttribute("data-detail-type");
          if (detailType) {
            openModal(detailType, card);
          }
        }
      },
      { capture: false },
    );

    // ===========================================
    // PRESS EFFECT (mousedown/touchstart)
    // ===========================================
    document.addEventListener(
      "mousedown",
      (e) => {
        const card = e.target.closest(".standard-card");
        if (card) {
          handleCardPress(card);
        }
      },
      { passive: true },
    );

    document.addEventListener(
      "touchstart",
      (e) => {
        const card = e.target.closest(".standard-card");
        if (card) {
          handleCardPress(card);
        }
      },
      { passive: true },
    );

    // ===========================================
    // RELEASE EFFECT (mouseup/touchend/mouseleave)
    // ===========================================
    document.addEventListener(
      "mouseup",
      (e) => {
        const card = e.target.closest(".standard-card");
        if (card) {
          handleCardRelease(card);
        }
      },
      { passive: true },
    );

    document.addEventListener(
      "touchend",
      (e) => {
        const card = e.target.closest(".standard-card");
        if (card) {
          handleCardRelease(card);
        }
      },
      { passive: true },
    );

    document.addEventListener(
      "mouseleave",
      (e) => {
        const card = e.target.closest(".standard-card");
        if (card) {
          handleCardRelease(card);
        }
      },
      { passive: true, capture: true },
    );

    // ===========================================
    // KEYBOARD SUPPORT
    // ===========================================
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.activeModalId) {
        closeActiveModal();
      }
    });

    // ===========================================
    // SCRIM CLICK
    // ===========================================
    // Already handled in getOrCreateScrim()

    // Mark as initialized
    global.MasterUIController._initialized = true;

    console.log("[MasterUI] Initialization complete");
  }

  // ===========================================
  // LEGACY COMPATIBILITY
  // ===========================================

  /**
   * Open a sheet (legacy ModalController compatibility)
   */
  function openSheet(idOrMetric, sourceElement) {
    openModal(idOrMetric, sourceElement);
  }

  /**
   * Close the current sheet (legacy ModalController compatibility)
   */
  function closeSheet() {
    closeActiveModal();
  }

  /**
   * Initialize (legacy ModalController compatibility)
   */
  function initModalController() {
    init();
  }

  // ===========================================
  // CLEANUP / DESTROY
  // ===========================================

  /**
   * Completely destroy the controller and clean up
   */
  function destroy() {
    // Close any open modals
    closeActiveModal(true);

    // Remove scrim
    destroyScrim();

    // Remove body classes
    document.body.classList.remove("modal-open", "bg-dimmed", "scrim-active");
    document.documentElement.classList.remove(
      "modal-open",
      "bg-dimmed",
      "scrim-active",
    );

    // Reset state
    state = {
      activeModalId: null,
      isAnimating: false,
      scrimElement: null,
    };

    global.MasterUIController._initialized = false;
  }

  // ===========================================
  // EXPORT
  // ===========================================
  global.MasterUIController = {
    // Main API
    init,
    openModal,
    closeActiveModal,
    closeAll,
    destroy,

    // Legacy compatibility (ModalController API)
    openSheet,
    closeSheet,
    initModalController,
    open: openModal,

    // State accessors
    isModalOpen: () => !!state.activeModalId,
    getActiveModalId: () => state.activeModalId,

    // Internal flag
    _initialized: false,
  };

  // Also expose as ModalController for backwards compatibility
  global.ModalController = global.MasterUIController;
})(window);
