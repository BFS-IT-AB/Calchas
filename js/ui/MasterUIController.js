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
  // CONFIGURATION - Uses Design Tokens (Phase 4)
  // ===========================================
  const CONFIG = {
    // Timing - read from CSS variables at runtime
    transitionDuration: 300, // --modal-transition-duration fallback

    // Selectors
    cardSelector: ".standard-card",
    backdropId: "master-backdrop", // Single backdrop element
    sheetClass: "standard-modal",
  };

  // ===========================================
  // STATE - Single Backdrop Principle
  // ===========================================
  let state = {
    activeModalId: null,
    modalStack: [], // Track stacked modals for z-index management
    isAnimating: false,
    backdropElement: null,
    currentZIndex: 1000, // Start from --z-modal-base
  };

  // ===========================================
  // SINGLE BACKDROP MANAGEMENT (Phase 4)
  // Global nur EIN Backdrop-Element
  // ===========================================

  /**
   * Get or create the SINGLE global backdrop element.
   * Implements the Single-Backdrop-Principle from Phase 4.
   * Uses CSS variables from design-tokens.css.
   *
   * @returns {HTMLElement} The single backdrop element
   */
  function getOrCreateBackdrop() {
    // Return existing backdrop if it's still in DOM
    if (
      state.backdropElement &&
      document.body.contains(state.backdropElement)
    ) {
      return state.backdropElement;
    }

    // PRIORITY 1: Use existing #bottom-sheet-overlay (existing modal system)
    let backdrop = document.getElementById("bottom-sheet-overlay");

    // PRIORITY 2: Check for #master-backdrop
    if (!backdrop) {
      backdrop = document.getElementById(CONFIG.backdropId);
    }

    // PRIORITY 3: Create new backdrop with design-token styles
    if (!backdrop) {
      console.log("[MasterUI] Creating single backdrop element");
      backdrop = document.createElement("div");
      backdrop.id = CONFIG.backdropId;
      backdrop.className = "master-backdrop";

      // Apply design-token styles inline for guaranteed consistency
      Object.assign(backdrop.style, {
        position: "fixed",
        inset: "0",
        background: "var(--modal-backdrop-bg, rgba(22, 22, 24, 0.96))",
        backdropFilter:
          "var(--modal-backdrop-blur, blur(20px)) var(--modal-backdrop-saturate, saturate(180%))",
        WebkitBackdropFilter:
          "var(--modal-backdrop-blur, blur(20px)) var(--modal-backdrop-saturate, saturate(180%))",
        zIndex: "var(--z-backdrop, 999)",
        opacity: "0",
        visibility: "hidden",
        transition:
          "opacity var(--modal-transition-duration, 300ms) var(--modal-transition-easing, cubic-bezier(0.05, 0.7, 0.1, 1)), visibility var(--modal-transition-duration, 300ms)",
        pointerEvents: "none",
      });

      document.body.appendChild(backdrop);
    }

    backdrop.setAttribute("aria-hidden", "true");

    // Clean up legacy/orphaned backdrop elements (NICHT das existierende overlay)
    document
      .querySelectorAll(
        "#modal-scrim, .flip-scrim, .health-modal-overlay:not(.health-modal-overlay--visible)",
      )
      .forEach((el) => {
        if (el !== backdrop) {
          el.remove();
        }
      });

    // Single click handler for backdrop
    if (!backdrop._masterUIClickHandler) {
      backdrop._masterUIClickHandler = true;
      backdrop.addEventListener("click", (e) => {
        // Only close if clicking directly on backdrop, not on modal content
        if (
          e.target === backdrop ||
          e.target.classList.contains("bottom-sheet-overlay") ||
          e.target.classList.contains("master-backdrop")
        ) {
          closeActiveModal();
        }
      });
    }

    state.backdropElement = backdrop;
    return backdrop;
  }

  /**
   * Show the single backdrop (no duplicate creation!)
   */
  function showBackdrop() {
    const backdrop = getOrCreateBackdrop();

    // Force reflow before adding visible state
    void backdrop.offsetHeight;

    // Apply visible state
    backdrop.classList.add("is-open", "is-visible");
    Object.assign(backdrop.style, {
      opacity: "1",
      visibility: "visible",
      pointerEvents: "auto",
    });
    backdrop.setAttribute("aria-hidden", "false");

    console.log("[MasterUI] Backdrop shown (single element)");
  }

  /**
   * Hide the single backdrop
   */
  function hideBackdrop() {
    const backdrop = state.backdropElement;
    if (backdrop) {
      backdrop.classList.remove("is-open", "is-visible");
      Object.assign(backdrop.style, {
        opacity: "0",
        visibility: "hidden",
        pointerEvents: "none",
      });
      backdrop.setAttribute("aria-hidden", "true");
    }
  }

  /**
   * NOTFALL: Erzwingt das Verstecken ALLER Overlays
   * Wird beim Öffnen der Historie aufgerufen um Geister-Modals zu killen
   */
  function forceClearOverlays() {
    console.warn("[MasterUI] FORCE CLEAR OVERLAYS - Killing all ghosts");

    // Alle möglichen Overlay-Klassen
    const overlaySelectors = [
      ".modal-backdrop",
      ".backdrop",
      ".modal.is-active",
      ".bottom-sheet-overlay.is-open",
      "#master-backdrop.is-visible",
      ".health-modal-overlay--visible",
      '[class*="overlay"].is-visible',
      '[class*="backdrop"].is-visible',
    ];

    overlaySelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        console.warn("[MasterUI] Hiding ghost overlay:", el);
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.classList.remove("is-active", "is-visible", "is-open");
      });
    });

    // Reset state
    state.activeModalId = null;
    state.modalStack = [];
  }

  /**
   * Completely remove the backdrop (cleanup)
   */
  function destroyBackdrop() {
    // Don't destroy #bottom-sheet-overlay - it's part of index.html
    const backdrop = state.backdropElement;
    if (backdrop && backdrop.id === CONFIG.backdropId) {
      backdrop.remove();
    }
    state.backdropElement = null;

    // Clean up any legacy elements
    document
      .querySelectorAll("#modal-scrim, .flip-scrim, .flip-phantom")
      .forEach((el) => el.remove());
  }

  // ===========================================
  // Z-INDEX MANAGEMENT (Phase 4)
  // Kontrollierte Stapelung über CSS Variables
  // ===========================================

  /**
   * Get the next z-index for stacked modals
   * Uses CSS variable as base, increments by 1 for each stacked modal
   *
   * @returns {number} The z-index value to use
   */
  function getNextZIndex() {
    const baseZIndex = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--z-modal-base",
      ) || "1000",
      10,
    );
    return baseZIndex + state.modalStack.length;
  }

  /**
   * Apply z-index to a modal element
   * @param {HTMLElement} modal - The modal element
   */
  function applyModalZIndex(modal) {
    const zIndex = getNextZIndex();
    modal.style.zIndex = zIndex;
    console.log(`[MasterUI] Modal z-index set to ${zIndex}`);
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
   * PHASE 7.9: Universelle Handle-Injektion
   * Garantiert dass jedes Modal einen swipe-handle hat
   * @param {HTMLElement} modal - Das Modal-Element
   */
  function ensureDragHandle(modal) {
    if (!modal || modal.querySelector(".swipe-handle")) return;

    const handle = document.createElement("div");
    handle.className = "swipe-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.style.cssText =
      "width: 60px; height: 24px; margin: 4px auto 8px auto;";
    modal.prepend(handle);
    console.log(
      "[MasterUI] Phase 7.9 ensureDragHandle:",
      modal.id || modal.className,
    );
  }

  // ===========================================
  // PHASE 7: SWIPE-TO-CLOSE GESTENSTEUERUNG
  // ===========================================

  /**
   * Swipe-State für aktives Modal
   */
  const swipeState = {
    startY: 0,
    currentY: 0,
    isDragging: false,
    modal: null,
    pointerId: null, // Für Pointer-Events
  };

  /**
   * PHASE 7.5: Add swipe-to-close listeners to a modal element
   * - Pointer Events für Emulator + Touch + Maus
   * - Start-Zone: Obere 60px ODER .swipe-handle
   * - Scroll-Schutz: Nur wenn modal.scrollTop === 0
   * - Visual Sync: Backdrop fade während Swipe
   *
   * @param {HTMLElement} modal - The modal element to add swipe listeners to
   */
  function addSwipeListeners(modal) {
    if (!modal || modal._swipeListenersAdded) return;

    const SWIPE_THRESHOLD = 80; // px - Mindestdistanz zum Schließen
    const BACKDROP_FADE_DISTANCE = 500; // px - Distanz für vollständiges Ausblenden
    const SWIPE_TOP_ZONE = 40; // px - PHASE 7.8: Reduziert um Buttons nicht zu blockieren

    // Finde scrollbaren Content-Bereich
    const getScrollableArea = () => {
      return (
        modal.querySelector(
          ".bottom-sheet__content, .modal-content, .standard-modal__content, [data-scrollable]",
        ) || modal
      );
    };

    // PHASE 7.8: touch-action immer pan-y - Browser soll nicht komplett blockiert werden
    modal.style.touchAction = "pan-y";

    // Pointer Down
    const onPointerDown = (e) => {
      // PHASE 7.8: INTERAKTIONS-RETTUNG
      // Wenn das Ziel ein interaktives Element ist, Swipe NICHT starten!
      // Damit Klicks auf Buttons, Toggles etc. durchgehen
      const interactiveElement = e.target.closest(
        "button, input, select, textarea, a, label, " +
          ".toggle-zone, .interactive, .clickable, " +
          '[role="button"], [role="switch"], [role="checkbox"], ' +
          ".aqi-toggle, .unit-toggle, .setting-toggle, " +
          "[data-clickable], [onclick]",
      );
      if (interactiveElement) {
        return; // Klick zum Button durchlassen, kein Swipe
      }

      // SCROLL-SCHUTZ: Nur starten wenn ganz oben gescrollt
      const scrollArea = getScrollableArea();
      if (scrollArea && scrollArea.scrollTop > 0) {
        return; // User ist im Content gescrollt - kein Swipe
      }

      // Berechne ob im oberen Bereich (erste 40px)
      const modalRect = modal.getBoundingClientRect();
      const clickY = e.clientY - modalRect.top;
      const isTopZone = clickY < SWIPE_TOP_ZONE;

      // Handle-Check
      const handle = modal.querySelector(".swipe-handle");
      const target = e.target;

      // Erlaube Swipe NUR von Handle ODER oberem Bereich
      const isSwipeArea =
        (handle && (handle.contains(target) || handle === target)) || isTopZone;

      if (!isSwipeArea) return;

      // Capture Pointer
      try {
        modal.setPointerCapture(e.pointerId);
      } catch (err) {
        // Fallback wenn capture fehlschlägt
      }

      swipeState.startY = e.clientY;
      swipeState.currentY = swipeState.startY;
      swipeState.isDragging = true;
      swipeState.modal = modal;
      swipeState.pointerId = e.pointerId;

      // Entferne Transition während des Swipens
      modal.classList.add("bottom-sheet--swiping", "standard-modal--swiping");
      modal.classList.remove(
        "bottom-sheet--snapping",
        "standard-modal--snapping",
      );
    };

    // Pointer Move
    const onPointerMove = (e) => {
      if (!swipeState.isDragging || swipeState.modal !== modal) return;

      swipeState.currentY = e.clientY;
      const deltaY = swipeState.currentY - swipeState.startY;

      if (deltaY < 0) {
        // Nach oben: Starke Resistance (10%)
        modal.style.transform = `translateY(${deltaY * 0.1}px)`;
      } else {
        // Nach unten: Volle Bewegung
        modal.style.transform = `translateY(${deltaY}px)`;

        // VISUAL SYNC: Backdrop-Opacity reduzieren
        const backdrop = getOrCreateBackdrop();
        if (backdrop) {
          const opacity = Math.max(0, 1 - deltaY / BACKDROP_FADE_DISTANCE);
          backdrop.style.opacity = opacity;
        }
      }

      // Verhindere Default nur beim aktiven Swipe
      if (Math.abs(deltaY) > 5) {
        e.preventDefault();
      }
    };

    // Pointer Up/Cancel
    const onPointerUp = (e) => {
      if (!swipeState.isDragging || swipeState.modal !== modal) return;

      // Release Pointer Capture
      if (swipeState.pointerId) {
        try {
          modal.releasePointerCapture(swipeState.pointerId);
        } catch (err) {
          /* ignore */
        }
      }

      const deltaY = swipeState.currentY - swipeState.startY;

      modal.classList.remove(
        "bottom-sheet--swiping",
        "standard-modal--swiping",
      );

      if (deltaY > SWIPE_THRESHOLD) {
        // Genug gewischt -> Schließen mit Animation
        modal.style.transition = `transform var(--modal-transition-duration, 300ms) var(--health-swift-easing)`;
        modal.style.transform = "translateY(100%)";

        setTimeout(() => {
          modal.style.transition = "";
          modal.style.transform = "";
          closeActiveModal(true);
        }, CONFIG.transitionDuration);
      } else {
        // SNAP-BACK: Zurückschnappen mit health-swift-easing
        modal.classList.add(
          "bottom-sheet--snapping",
          "standard-modal--snapping",
        );
        modal.style.transform = "translateY(0)";

        setTimeout(() => {
          modal.classList.remove(
            "bottom-sheet--snapping",
            "standard-modal--snapping",
          );
        }, CONFIG.transitionDuration);
      }

      // Reset Backdrop
      const backdrop = getOrCreateBackdrop();
      if (backdrop) {
        backdrop.style.opacity = "";
      }

      // Reset State
      swipeState.isDragging = false;
      swipeState.modal = null;
      swipeState.startY = 0;
      swipeState.currentY = 0;
      swipeState.pointerId = null;
    };

    // POINTER EVENT LISTENERS
    modal.addEventListener("pointerdown", onPointerDown);
    modal.addEventListener("pointermove", onPointerMove);
    modal.addEventListener("pointerup", onPointerUp);
    modal.addEventListener("pointercancel", onPointerUp);
    modal.addEventListener("lostpointercapture", onPointerUp);

    modal._swipeListenersAdded = true;
    console.log("[MasterUI] Phase 7.5 swipe listeners added:", modal.id);
  }

  /**
   * Remove swipe listeners from a modal
   * @param {HTMLElement} modal - The modal element
   */
  function removeSwipeListeners(modal) {
    if (!modal || !modal._swipeListenersAdded) return;
    // Note: Wir behalten die Listener, da sie über die Lebensdauer des Modals benötigt werden
    // Bei Bedarf kann hier ein Cleanup implementiert werden
  }

  /**
   * Open a modal by ID
   * Uses EXACT same technique as Health-page (requestAnimationFrame for class toggle)
   *
   * @param {string} modalId - The modal ID to open
   * @param {HTMLElement} [sourceElement] - Optional source element (for future use)
   */
  async function openModal(modalId, sourceElement) {
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

    // Close any currently open modal first (but keep backdrop if stacking)
    if (state.activeModalId && state.activeModalId !== resolvedId) {
      closeActiveModal(true); // silent close (no animation wait)
    }

    state.isAnimating = true;
    state.activeModalId = resolvedId;

    // Track modal in stack for z-index management
    if (!state.modalStack.includes(resolvedId)) {
      state.modalStack.push(resolvedId);
    }

    // PHASE 7.9: Universelle Handle-Garantie
    ensureDragHandle(modal);

    // Markiere Modal als vom Controller verwaltet
    modal.classList.add("master-modal-mode");
    modal._masterControlled = true;

    // PHASE 7.5: Swipe-Listener im try-catch
    try {
      addSwipeListeners(modal);
    } catch (err) {
      console.warn("[MasterUI] Swipe listeners failed:", err);
    }

    // Apply controlled z-index (Phase 4)
    applyModalZIndex(modal);

    // ZENTRAL: Lock body scroll via .modal-open class
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");

    // Show backdrop (SINGLE element, no duplicates)
    showBackdrop();

    // Render content if applicable (use ModalContentRenderer or legacy ModalController)
    const contentRenderer =
      global.ModalContentRenderer || global.ModalController;
    if (contentRenderer?.renderSheetContent) {
      try {
        await contentRenderer.renderSheetContent(resolvedId);
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
      setTimeout(() => firstFocusable.focus(), CONFIG.transitionDuration);
    }
  }

  /**
   * PHASE 7.6: Close the currently active modal with RADICAL DOM CLEANUP
   * - Modal wird nach Animation komplett aus DOM entfernt
   * - Verhindert "Geister-Modale" die im Hintergrund bleiben
   *
   * @param {boolean} [silent=false] - If true, skip animation delay
   */
  function closeActiveModal(silent = false) {
    const modalId = state.activeModalId;
    const modal = modalId && document.getElementById(modalId);

    console.log("[MasterUI] closeActiveModal called, modal:", modalId);

    if (!modal) {
      // Kein Modal offen - trotzdem State aufräumen
      state.activeModalId = null;
      state.modalStack = [];
      hideBackdrop();
      return;
    }

    // Remove visible classes - triggers CSS transition back to translateY(100%)
    modal.classList.remove("is-visible");
    modal.classList.remove("standard-modal--visible");
    modal.classList.remove("bottom-sheet--visible");
    modal.classList.remove("master-modal-mode");
    modal.setAttribute("aria-hidden", "true");
    modal.style.zIndex = "";

    // Remove from modal stack
    const index = state.modalStack.indexOf(modalId);
    if (index > -1) {
      state.modalStack.splice(index, 1);
    }

    // PHASE 7.6: Backdrop sofort auf opacity:0 setzen
    const backdrop = getOrCreateBackdrop();
    if (backdrop) {
      backdrop.style.opacity = "0";
      backdrop.style.pointerEvents = "none";
    }

    // Only hide backdrop completely if no more modals in stack
    if (state.modalStack.length === 0) {
      hideBackdrop();
    }

    const cleanup = () => {
      // ZENTRAL: Unlock body scroll
      if (state.modalStack.length === 0) {
        document.body.classList.remove(
          "modal-open",
          "bg-dimmed",
          "scrim-active",
        );
        document.documentElement.classList.remove(
          "modal-open",
          "bg-dimmed",
          "scrim-active",
        );
      }

      // PHASE 7.6: RADIKALER DOM-CLEANUP
      // Modal NICHT aus DOM entfernen - nur verstecken!
      // (Sonst müsste es bei jedem Öffnen neu erstellt werden)
      if (modal) {
        modal.style.display = "none";
        modal.style.transform = "";
        // Entferne injizierte swipe-handles für sauberen State
        const injectedHandle = modal.querySelector(".swipe-handle");
        if (injectedHandle && !modal.dataset.hasOriginalHandle) {
          injectedHandle.remove();
        }
        // Reset swipe listener flag damit beim nächsten Öffnen neu initialisiert wird
        modal._swipeListenersAdded = false;
      }

      // Clean up any leftover phantom elements
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

      // PHASE 7.6: State komplett zurücksetzen wenn Stack leer
      if (state.modalStack.length === 0) {
        state.activeModalId = null;
      } else {
        state.activeModalId = state.modalStack[state.modalStack.length - 1];
      }
      state.isAnimating = false;

      console.log(
        "[MasterUI] Modal closed, remaining stack:",
        state.modalStack,
      );
    };

    if (silent) {
      cleanup();
    } else {
      // Use CSS variable timing from design-tokens
      setTimeout(cleanup, CONFIG.transitionDuration);
    }
  }

  /**
   * Close all modals (clears entire stack)
   */
  function closeAll() {
    // Close all modals in reverse order
    while (state.modalStack.length > 0) {
      closeActiveModal(true); // silent close
    }
    // Final cleanup
    hideBackdrop();
    document.body.classList.remove("modal-open", "bg-dimmed", "scrim-active");
    document.documentElement.classList.remove(
      "modal-open",
      "bg-dimmed",
      "scrim-active",
    );
    state.isAnimating = false;
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

    console.log("[MasterUI] Initializing Master UI Controller (Phase 4)");

    // Initialize single backdrop element
    getOrCreateBackdrop();

    // ===========================================
    // PHASE 7.9: GLOBAL MUTATION OBSERVER
    // Fängt Modale ein, die den Controller umgehen
    // ===========================================
    const modalObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          // Prüfe ob das Element selbst ein Modal ist
          const isModal =
            node.matches &&
            node.matches(
              ".modal, .sheet, .bottom-sheet, .standard-modal, " +
                "[class*='modal'], [class*='sheet'], [id*='sheet']",
            );

          // Oder suche verschachtelte Modale
          const modals = isModal
            ? [node]
            : node.querySelectorAll
              ? Array.from(
                  node.querySelectorAll(
                    ".modal, .sheet, .bottom-sheet, .standard-modal, " +
                      "[class*='modal'], [class*='sheet'], [id*='sheet']",
                  ),
                )
              : [];

          modals.forEach((modal) => {
            // Nur wenn sichtbar und noch nicht verarbeitet
            const isVisible =
              modal.classList.contains("is-visible") ||
              modal.classList.contains("visible") ||
              modal.style.display === "flex" ||
              modal.style.display === "block";

            if (isVisible && !modal._masterControlled) {
              console.log(
                "[MasterUI] Observer caught modal:",
                modal.id || modal.className,
              );

              // Nachrüsten
              ensureDragHandle(modal);
              modal.classList.add("master-modal-mode");

              try {
                addSwipeListeners(modal);
              } catch (err) {
                console.warn("[MasterUI] Observer swipe setup failed:", err);
              }

              modal._masterControlled = true;
            }
          });
        });
      });
    });

    // Observer starten
    modalObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    console.log("[MasterUI] Global MutationObserver active");

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
    // BACKDROP CLICK - Already handled in getOrCreateBackdrop()
    // ===========================================

    // Mark as initialized
    global.MasterUIController._initialized = true;

    console.log(
      "[MasterUI] Initialization complete (Phase 4 - Single Backdrop)",
    );
  }

  // ===========================================
  // LEGACY COMPATIBILITY
  // ===========================================

  /**
   * Open a sheet (legacy ModalController compatibility)
   */
  async function openSheet(idOrMetric, sourceElement) {
    await openModal(idOrMetric, sourceElement);
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
   * Completely destroy the controller and clean up (Phase 4)
   */
  function destroy() {
    // Close all open modals
    closeAll();

    // Remove backdrop
    destroyBackdrop();

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
      modalStack: [],
      isAnimating: false,
      backdropElement: null,
      currentZIndex: 1000,
    };

    global.MasterUIController._initialized = false;
  }

  // ===========================================
  // EXPORT (Phase 4 - Extended API)
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

    // NOTFALL: Overlay-Killer
    forceClearOverlays,

    // State accessors
    isModalOpen: () => !!state.activeModalId,
    getActiveModalId: () => state.activeModalId,
    getModalStack: () => [...state.modalStack],

    // Internal flag
    _initialized: false,
  };

  // Also expose as ModalController for backwards compatibility
  global.ModalController = global.MasterUIController;
})(window);
