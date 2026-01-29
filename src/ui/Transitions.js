/**
 * Transitions.js - FLIP Animation System v10.0 "Swift Morph"
 *
 * ⚠️ DEPRECATED - NOT IN USE ⚠️
 * This file is kept as a backup reference only.
 * The app now uses stable Health-style CSS animations via ModalController.js.
 * FLIP animations were too buggy for the current DOM structure.
 *
 * To re-enable: Uncomment Transitions calls in ModalController.js
 *
 * Fixes that were implemented:
 * - Singleton scrim pattern (no stacking overlays)
 * - 250ms Swift easing for snappy feel
 * - Fade-Over trick at 30% to hide text stretching
 * - Locked content width prevents text distortion
 * - Memory leak protection with destroy()
 *
 * @version 10.0.0
 * @deprecated Use CSS transitions in style.css instead
 */
(function (global) {
  "use strict";

  // ===========================================
  // Configuration
  // ===========================================
  const CONFIG = {
    duration: 250, // Snappy 250ms
    easing: "cubic-bezier(0.05, 0.7, 0.1, 1.0)", // Android 15 "Swift" feel
    scrimOpacity: 0.6,
    phantomZIndex: 10001,
    scrimZIndex: 9999,
    scrimId: "modal-scrim", // Singleton ID
    fadeOverPoint: 0.3, // Start cross-fade at 30%
  };

  // ===========================================
  // State - track all resources for cleanup
  // ===========================================
  let state = {
    isAnimating: false,
    phantom: null,
    sourceRect: null,
    sourceElement: null,
    lastClickedElement: null,
    // Memory leak tracking
    timeouts: [],
    rafs: [],
  };

  // ===========================================
  // Memory-safe setTimeout/rAF wrappers
  // ===========================================
  function safeTimeout(fn, delay) {
    const id = setTimeout(() => {
      state.timeouts = state.timeouts.filter((t) => t !== id);
      fn();
    }, delay);
    state.timeouts.push(id);
    return id;
  }

  function safeRaf(fn) {
    const id = requestAnimationFrame(() => {
      state.rafs = state.rafs.filter((r) => r !== id);
      fn();
    });
    state.rafs.push(id);
    return id;
  }

  function clearAllTimers() {
    state.timeouts.forEach((id) => clearTimeout(id));
    state.rafs.forEach((id) => cancelAnimationFrame(id));
    state.timeouts = [];
    state.rafs = [];
  }

  // ===========================================
  // Inject CSS
  // ===========================================
  (function injectStyles() {
    if (document.getElementById("flip-transition-styles")) return;
    const style = document.createElement("style");
    style.id = "flip-transition-styles";
    style.textContent = `
      html {
        scrollbar-gutter: stable;
      }

      body.modal-open {
        overflow: hidden;
      }

      /* Single dimming class - toggled, not stacked */
      body.bg-dimmed #app-container,
      body.bg-dimmed #app,
      body.bg-dimmed main {
        filter: brightness(0.7);
        transition: filter ${CONFIG.duration}ms ${CONFIG.easing};
      }

      /* Singleton scrim */
      #${CONFIG.scrimId} {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        pointer-events: none;
        z-index: ${CONFIG.scrimZIndex};
        transition: background-color ${CONFIG.duration}ms ${CONFIG.easing};
      }

      #${CONFIG.scrimId}.scrim--visible {
        background: rgba(0, 0, 0, ${CONFIG.scrimOpacity});
      }

      .flip-phantom {
        position: fixed;
        pointer-events: none;
        overflow: hidden;
        will-change: transform, opacity, border-radius;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }

      .flip-phantom__content {
        position: absolute;
        left: 0;
        top: 0;
        pointer-events: none;
        /* Width locked via JS to prevent text reflow */
      }

      .flip-phantom__fade {
        position: absolute;
        inset: 0;
        opacity: 0;
        transition: opacity ${CONFIG.duration * 0.5}ms ease-out;
        background: var(--modal-bg, rgba(30, 35, 50, 0.98));
        border-radius: inherit;
      }

      .flip-phantom__fade.fade--active {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  })();

  // ===========================================
  // Auto-Detection: Track last clicked element
  // ===========================================
  document.addEventListener(
    "click",
    (e) => {
      const source = e.target.closest(
        ".weather-card, .metric-card, .info-card, [data-bottom-sheet], [data-bottom-sheet-target], .card",
      );
      if (source) {
        state.lastClickedElement = source;
      }
    },
    true,
  );

  // ===========================================
  // SINGLETON Scrim - only ONE ever exists
  // ===========================================
  function getOrCreateScrim() {
    let scrim = document.getElementById(CONFIG.scrimId);
    if (!scrim) {
      scrim = document.createElement("div");
      scrim.id = CONFIG.scrimId;
      document.body.appendChild(scrim);
    }
    return scrim;
  }

  function showScrim() {
    const scrim = getOrCreateScrim();
    // Force reflow before adding class
    void scrim.offsetHeight;
    scrim.classList.add("scrim--visible");
  }

  function hideScrim() {
    const scrim = document.getElementById(CONFIG.scrimId);
    if (scrim) {
      scrim.classList.remove("scrim--visible");
    }
  }

  function removeScrim() {
    const scrim = document.getElementById(CONFIG.scrimId);
    if (scrim) {
      scrim.classList.remove("scrim--visible");
      // Remove after fade completes
      safeTimeout(() => {
        const s = document.getElementById(CONFIG.scrimId);
        if (s && !s.classList.contains("scrim--visible")) {
          s.remove();
        }
      }, CONFIG.duration);
    }
  }

  // ===========================================
  // Background Dimming (class toggle, not inline)
  // ===========================================
  function dimBackground(active) {
    if (active) {
      document.body.classList.add("bg-dimmed");
    } else {
      document.body.classList.remove("bg-dimmed");
    }
  }

  // ===========================================
  // Leaflet Map Handling
  // ===========================================
  function hideLeafletMaps() {
    document.querySelectorAll(".leaflet-container").forEach((m) => {
      m.dataset.transitionHidden = "true";
      m.style.visibility = "hidden";
    });
  }

  function showLeafletMaps() {
    safeTimeout(() => {
      document
        .querySelectorAll(".leaflet-container[data-transition-hidden]")
        .forEach((m) => {
          delete m.dataset.transitionHidden;
          m.style.visibility = "";
        });
      safeTimeout(() => {
        document.querySelectorAll(".leaflet-container").forEach((m) => {
          if (m._leaflet_id && global.L) {
            try {
              for (const key in global.L) {
                const inst = global.L[key];
                if (inst?._container === m && inst.invalidateSize) {
                  inst.invalidateSize({ animate: false });
                }
              }
            } catch (e) {
              /* ignore */
            }
          }
        });
      }, 100);
    }, 50);
  }

  // ===========================================
  // Create Phantom with LOCKED width
  // ===========================================
  function createPhantom(sourceElement, sourceRect) {
    const computed = getComputedStyle(sourceElement);
    const borderRadius = parseInt(computed.borderRadius) || 16;

    // Create phantom container with overflow:hidden
    const phantom = document.createElement("div");
    phantom.className = "flip-phantom";
    phantom.style.cssText = `
      z-index: ${CONFIG.phantomZIndex};
      left: ${sourceRect.left}px;
      top: ${sourceRect.top}px;
      width: ${sourceRect.width}px;
      height: ${sourceRect.height}px;
      border-radius: ${borderRadius}px;
      background: ${computed.backgroundColor || "rgba(30, 40, 50, 0.95)"};
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      overflow: hidden;
    `;

    // Clone content with LOCKED WIDTH to prevent text wrapping/stretching
    const clone = sourceElement.cloneNode(true);
    clone.className = "flip-phantom__content";

    // Sanitize
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    clone
      .querySelectorAll("script, iframe, video, audio")
      .forEach((el) => el.remove());

    // CRITICAL: Lock width to exact source width
    // This prevents "Berlin" text distortion
    clone.style.cssText = `
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: ${sourceRect.width}px !important;
      height: ${sourceRect.height}px !important;
      min-width: ${sourceRect.width}px !important;
      max-width: ${sourceRect.width}px !important;
      margin: 0 !important;
      padding: ${computed.padding} !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      pointer-events: none !important;
      transition: none !important;
      overflow: hidden !important;
    `;

    // Disable ALL transitions on children
    clone.querySelectorAll("*").forEach((el) => {
      el.style.transition = "none";
      el.style.animation = "none";
    });

    // Replace leaflet maps with placeholder
    clone.querySelectorAll(".leaflet-container").forEach((el) => {
      el.innerHTML = "";
      el.style.background = "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)";
    });

    phantom.appendChild(clone);

    // Add fade overlay for the "Fade-Over" trick
    const fadeOverlay = document.createElement("div");
    fadeOverlay.className = "flip-phantom__fade";
    phantom.appendChild(fadeOverlay);

    return { phantom, borderRadius, fadeOverlay };
  }

  // ===========================================
  // Resolve Source Element
  // ===========================================
  function resolveSource(explicitSource) {
    if (explicitSource?.getBoundingClientRect) return explicitSource;
    if (state.lastClickedElement?.getBoundingClientRect)
      return state.lastClickedElement;
    return null;
  }

  // ===========================================
  // FLIP Open Animation with Fade-Over trick
  // ===========================================
  function animateOpen(source, target) {
    const resolvedSource = resolveSource(source);

    if (state.isAnimating) {
      console.warn("[Swift] Already animating");
      target?.classList.add("bottom-sheet--visible");
      return Promise.resolve();
    }

    if (!target) {
      console.warn("[Swift] No target");
      return Promise.resolve();
    }

    if (!resolvedSource) {
      console.log("[Swift] No source, fallback");
      target.classList.add("bottom-sheet--visible");
      showScrim();
      document.body.classList.add("modal-open");
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      state.isAnimating = true;
      state.sourceElement = resolvedSource;

      // ===========================================
      // PHASE 1: MEASURE SOURCE (First)
      // ===========================================
      const firstRect = resolvedSource.getBoundingClientRect();
      if (firstRect.width === 0 || firstRect.height === 0) {
        state.isAnimating = false;
        target.classList.add("bottom-sheet--visible");
        return resolve();
      }

      state.sourceRect = {
        left: firstRect.left,
        top: firstRect.top,
        width: firstRect.width,
        height: firstRect.height,
      };

      // ===========================================
      // PHASE 2: HIDE SOURCE
      // ===========================================
      resolvedSource.style.opacity = "0";
      resolvedSource.style.pointerEvents = "none";

      // ===========================================
      // PHASE 3: MEASURE TARGET (Last)
      // ===========================================
      target.style.cssText =
        "opacity:0 !important; visibility:hidden !important; display:block !important; pointer-events:none !important;";
      target.classList.add("bottom-sheet--visible");
      void target.offsetHeight;

      const lastRect = target.getBoundingClientRect();

      // Hide maps during animation
      hideLeafletMaps();

      // ===========================================
      // PHASE 4: CREATE SCRIM + PHANTOM
      // ===========================================
      showScrim();

      const { phantom, borderRadius, fadeOverlay } = createPhantom(
        resolvedSource,
        firstRect,
      );
      document.body.appendChild(phantom);
      state.phantom = phantom;

      // Lock body scroll
      document.body.classList.add("modal-open");

      // Dim background
      dimBackground(true);

      // Calculate FLIP transform
      const scaleX = lastRect.width / firstRect.width;
      const scaleY = lastRect.height / firstRect.height;
      const translateX = lastRect.left - firstRect.left;
      const translateY = lastRect.top - firstRect.top;

      // ===========================================
      // PHASE 5: ANIMATE with Fade-Over
      // ===========================================
      safeRaf(() => {
        safeRaf(() => {
          // Apply transform
          phantom.style.transition = `
            transform ${CONFIG.duration}ms ${CONFIG.easing},
            border-radius ${CONFIG.duration}ms ${CONFIG.easing}
          `;
          phantom.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
          phantom.style.borderRadius = "24px 24px 0 0";

          // FADE-OVER TRICK: At 30%, start fading in overlay to hide text stretch
          safeTimeout(() => {
            fadeOverlay.classList.add("fade--active");
          }, CONFIG.duration * CONFIG.fadeOverPoint);

          // ===========================================
          // PHASE 6: SWAP at 100%
          // ===========================================
          safeTimeout(() => {
            // Remove phantom
            if (state.phantom) {
              state.phantom.remove();
              state.phantom = null;
            }

            // Show real modal
            target.style.cssText =
              "visibility:visible; opacity:1; pointer-events:auto;";

            // Remove dim effect
            dimBackground(false);

            showLeafletMaps();
            state.isAnimating = false;
            resolve();
          }, CONFIG.duration + 20);
        });
      });
    });
  }

  // ===========================================
  // FLIP Close Animation
  // ===========================================
  function animateClose(target) {
    if (state.isAnimating) {
      console.warn("[Swift] Already animating close");
      return Promise.resolve();
    }

    if (!target || !state.sourceRect) {
      console.log("[Swift] Fallback close");
      if (target) {
        target.classList.remove("bottom-sheet--visible");
        target.style.cssText = "";
      }
      restoreSource();
      reset();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      state.isAnimating = true;
      hideLeafletMaps();

      const curRect = target.getBoundingClientRect();
      const computed = getComputedStyle(target);

      // Create phantom at modal position
      const phantom = document.createElement("div");
      phantom.className = "flip-phantom";
      phantom.style.cssText = `
        z-index: ${CONFIG.phantomZIndex};
        left: ${curRect.left}px;
        top: ${curRect.top}px;
        width: ${curRect.width}px;
        height: ${curRect.height}px;
        background: ${computed.backgroundColor || "rgba(30, 40, 50, 0.95)"};
        border-radius: 24px 24px 0 0;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        overflow: hidden;
      `;

      // Add fade layer (starts visible for reverse)
      const fadeLayer = document.createElement("div");
      fadeLayer.className = "flip-phantom__fade fade--active";
      phantom.appendChild(fadeLayer);

      document.body.appendChild(phantom);
      state.phantom = phantom;

      // Hide modal immediately
      target.style.cssText =
        "opacity:0 !important; visibility:hidden !important;";

      // Calculate reverse transform
      const scaleX = state.sourceRect.width / curRect.width;
      const scaleY = state.sourceRect.height / curRect.height;
      const translateX = state.sourceRect.left - curRect.left;
      const translateY = state.sourceRect.top - curRect.top;

      safeRaf(() => {
        safeRaf(() => {
          // Hide scrim
          hideScrim();

          // Animate phantom back
          phantom.style.transition = `
            transform ${CONFIG.duration}ms ${CONFIG.easing},
            border-radius ${CONFIG.duration}ms ${CONFIG.easing},
            opacity ${CONFIG.duration}ms ${CONFIG.easing}
          `;
          phantom.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
          phantom.style.borderRadius = "16px";

          // Fade out phantom at end
          safeTimeout(() => {
            phantom.style.opacity = "0";
          }, CONFIG.duration * 0.5);

          // ===========================================
          // COMPLETE: Cleanup
          // ===========================================
          safeTimeout(() => {
            target.classList.remove("bottom-sheet--visible");
            target.style.cssText = "";

            restoreSource();
            cleanup();

            // Unlock body scroll
            document.body.classList.remove("modal-open");

            showLeafletMaps();
            state.isAnimating = false;
            resolve();
          }, CONFIG.duration + 20);
        });
      });
    });
  }

  // ===========================================
  // Restore source element
  // ===========================================
  function restoreSource() {
    if (state.sourceElement) {
      state.sourceElement.style.visibility = "";
      state.sourceElement.style.opacity = "";
      state.sourceElement.style.pointerEvents = "";
    }
  }

  // ===========================================
  // Cleanup phantom only
  // ===========================================
  function cleanup() {
    if (state.phantom) {
      state.phantom.remove();
      state.phantom = null;
    }
  }

  // ===========================================
  // Full reset - MUST clean scrim
  // ===========================================
  function reset() {
    clearAllTimers();
    cleanup();
    restoreSource();
    hideScrim();
    removeScrim();
    dimBackground(false);
    showLeafletMaps();
    document.body.classList.remove("modal-open");
    state.sourceRect = null;
    state.sourceElement = null;
    state.lastClickedElement = null;
    state.isAnimating = false;
  }

  // ===========================================
  // DESTROY - for memory leak prevention
  // ===========================================
  function destroy() {
    console.log("[Swift] Destroying Transitions module");

    // Clear all timers
    clearAllTimers();

    // Remove phantom
    cleanup();

    // Remove scrim completely
    const scrim = document.getElementById(CONFIG.scrimId);
    if (scrim) scrim.remove();

    // Remove injected styles
    const styles = document.getElementById("flip-transition-styles");
    if (styles) styles.remove();

    // Remove all body classes
    document.body.classList.remove("modal-open", "bg-dimmed");

    // Restore source
    restoreSource();

    // Reset state
    state = {
      isAnimating: false,
      phantom: null,
      sourceRect: null,
      sourceElement: null,
      lastClickedElement: null,
      timeouts: [],
      rafs: [],
    };
  }

  // ===========================================
  // Export
  // ===========================================
  global.Transitions = {
    animateOpen,
    animateClose,
    isAnimating: () => state.isAnimating,
    cleanup,
    reset,
    destroy,
    registerSource: (el) => {
      state.lastClickedElement = el;
    },
  };
})(window);
