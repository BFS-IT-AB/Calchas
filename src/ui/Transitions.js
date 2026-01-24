/**
 * Transitions.js - FLIP Animation System v8.0 "Snapshot & Cross-Morph"
 * Canvas-based pixel snapshots for perfect transitions without DOM artifacts.
 * @version 8.0.0
 */
(function (global) {
  "use strict";

  // ===========================================
  // Configuration
  // ===========================================
  const CONFIG = {
    duration: 250,
    easing: "cubic-bezier(0.2, 0, 0, 1)",
    scrimEasing: "cubic-bezier(0.3, 0, 0, 1)", // Android 15 scrim easing
    backgroundScale: 0.92,
    backgroundBorderRadius: 24,
    crossfadeAt: 0.5, // Crossfade at 50%
    phantomZIndex: 10001,
    scrimZIndex: 9999,
    scrimOpacity: 0.4,
  };

  let state = {
    isAnimating: false,
    phantomA: null, // Card snapshot
    phantomB: null, // Modal background
    scrim: null,
    sourceRect: null,
    sourceElement: null,
    lastClickedElement: null,
    appContainer: null,
  };

  // ===========================================
  // Inject CSS for transitions
  // ===========================================
  (function injectStyles() {
    if (document.getElementById("flip-transition-styles")) return;
    const style = document.createElement("style");
    style.id = "flip-transition-styles";
    style.textContent = `
      .flip-scrim {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        pointer-events: none;
        will-change: background-color;
      }
      .flip-phantom-snapshot {
        position: fixed;
        pointer-events: none;
        background-size: 100% 100%;
        background-repeat: no-repeat;
        background-position: center;
        will-change: transform, opacity, border-radius;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
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
  // App Container (Android 15 depth effect)
  // ===========================================
  function getAppContainer() {
    if (!state.appContainer) {
      state.appContainer =
        document.getElementById("app-container") ||
        document.getElementById("app") ||
        document.querySelector("main") ||
        document.body;
    }
    return state.appContainer;
  }

  function applyBackgroundEffect(active) {
    const container = getAppContainer();
    if (container && container !== document.body) {
      if (active) {
        container.style.transition = `transform ${CONFIG.duration}ms ${CONFIG.scrimEasing}, border-radius ${CONFIG.duration}ms ${CONFIG.scrimEasing}`;
        container.style.transformOrigin = "center top";
        container.style.transform = `scale(${CONFIG.backgroundScale})`;
        container.style.borderRadius = `${CONFIG.backgroundBorderRadius}px`;
        container.style.overflow = "hidden";
      } else {
        container.style.transition = `transform ${CONFIG.duration}ms ${CONFIG.scrimEasing}, border-radius ${CONFIG.duration}ms ${CONFIG.scrimEasing}`;
        container.style.transform = "";
        container.style.borderRadius = "";
        setTimeout(() => {
          container.style.transition = "";
          container.style.transformOrigin = "";
          container.style.overflow = "";
        }, CONFIG.duration);
      }
    }
  }

  // ===========================================
  // Scrim (Dark Overlay)
  // ===========================================
  function createScrim() {
    const scrim = document.createElement("div");
    scrim.className = "flip-scrim";
    scrim.style.zIndex = CONFIG.scrimZIndex;
    document.body.appendChild(scrim);
    return scrim;
  }

  function animateScrim(scrim, show) {
    scrim.style.transition = `background-color ${CONFIG.duration}ms ${CONFIG.scrimEasing}`;
    scrim.style.backgroundColor = show
      ? `rgba(0, 0, 0, ${CONFIG.scrimOpacity})`
      : "rgba(0, 0, 0, 0)";
  }

  function removeScrim() {
    if (state.scrim) {
      state.scrim.remove();
      state.scrim = null;
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
    setTimeout(() => {
      document
        .querySelectorAll(".leaflet-container[data-transition-hidden]")
        .forEach((m) => {
          delete m.dataset.transitionHidden;
          m.style.visibility = "";
        });
      setTimeout(() => {
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
  // Canvas Snapshot Generator
  // ===========================================
  async function captureSnapshot(element) {
    const rect = element.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Try html2canvas if available (higher quality)
    if (global.html2canvas) {
      try {
        const canvas = await global.html2canvas(element, {
          scale: dpr,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
        });
        return canvas.toDataURL("image/png");
      } catch (e) {
        console.warn("[Snapshot] html2canvas failed, using fallback", e);
      }
    }

    // Native fallback: Use foreignObject in SVG
    return await captureSvgSnapshot(element, rect, dpr);
  }

  async function captureSvgSnapshot(element, rect, dpr) {
    return new Promise((resolve) => {
      // Clone element for snapshot
      const clone = element.cloneNode(true);

      // Sanitize clone
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      clone
        .querySelectorAll("script, iframe, video, audio, canvas")
        .forEach((el) => el.remove());

      // Replace leaflet maps with placeholder
      clone.querySelectorAll(".leaflet-container").forEach((el) => {
        el.innerHTML = "";
        el.style.background =
          "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)";
      });

      // Get computed styles
      const computed = getComputedStyle(element);

      // Create a wrapper with exact styles
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: ${computed.backgroundColor};
        border-radius: ${computed.borderRadius};
        overflow: hidden;
      `;

      clone.style.cssText = `
        width: ${rect.width}px !important;
        height: ${rect.height}px !important;
        margin: 0 !important;
        position: relative !important;
      `;

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Serialize to SVG foreignObject
      const data = new XMLSerializer().serializeToString(wrapper);
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width * dpr}" height="${rect.height * dpr}">
          <foreignObject width="100%" height="100%" style="transform: scale(${dpr}); transform-origin: 0 0;">
            ${data}
          </foreignObject>
        </svg>
      `;

      // Convert to image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        document.body.removeChild(wrapper);
        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = () => {
        document.body.removeChild(wrapper);
        // Final fallback: solid color
        resolve(null);
      };

      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

      // Timeout fallback
      setTimeout(() => {
        if (wrapper.parentNode) {
          document.body.removeChild(wrapper);
        }
        resolve(null);
      }, 100);
    });
  }

  // ===========================================
  // Create Snapshot Phantom (Pixel-Perfect)
  // ===========================================
  function createSnapshotPhantom(dataUrl, rect, borderRadius, zIndex) {
    const phantom = document.createElement("div");
    phantom.className = "flip-phantom-snapshot";

    const bg = dataUrl
      ? `url("${dataUrl}")`
      : "linear-gradient(135deg, rgba(30, 40, 50, 0.95) 0%, rgba(20, 30, 40, 0.95) 100%)";

    phantom.style.cssText = `
      z-index: ${zIndex};
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border-radius: ${borderRadius}px;
      background-image: ${bg};
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      transform-origin: top left;
    `;

    return phantom;
  }

  // ===========================================
  // Create Modal Background Phantom
  // ===========================================
  function createModalPhantom(rect, backgroundColor, zIndex) {
    const phantom = document.createElement("div");
    phantom.className = "flip-phantom-snapshot";
    phantom.style.cssText = `
      z-index: ${zIndex};
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border-radius: 24px 24px 0 0;
      background: ${backgroundColor || "rgba(30, 40, 50, 0.98)"};
      box-shadow: 0 -4px 32px rgba(0,0,0,0.5);
      opacity: 0;
      transform-origin: top left;
    `;
    return phantom;
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
  // Calculate Transform for Animation
  // ===========================================
  function calculateTransform(fromRect, toRect) {
    const scaleX = toRect.width / fromRect.width;
    const scaleY = toRect.height / fromRect.height;
    const translateX = toRect.left - fromRect.left;
    const translateY = toRect.top - fromRect.top;
    return { scaleX, scaleY, translateX, translateY };
  }

  // ===========================================
  // FLIP Open Animation (Snapshot & Cross-Morph)
  // ===========================================
  function animateOpen(source, target) {
    const resolvedSource = resolveSource(source);

    if (state.isAnimating) {
      console.warn("[SCM] Already animating");
      target?.classList.add("bottom-sheet--visible");
      return Promise.resolve();
    }

    if (!target) {
      console.warn("[SCM] No target");
      return Promise.resolve();
    }

    if (!resolvedSource) {
      console.log("[SCM] No source, fallback");
      target.classList.add("bottom-sheet--visible");
      return Promise.resolve();
    }

    return new Promise(async (resolve) => {
      state.isAnimating = true;
      state.sourceElement = resolvedSource;

      // ===========================================
      // PHASE 1: MEASURE SOURCE (FIRST)
      // ===========================================
      console.log("[SCM] FIRST");

      const firstRect = resolvedSource.getBoundingClientRect();
      if (firstRect.width === 0 || firstRect.height === 0) {
        console.warn("[SCM] Zero source rect");
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

      const computed = getComputedStyle(resolvedSource);
      const sourceBorderRadius = parseInt(computed.borderRadius) || 16;

      // ===========================================
      // PHASE 2: CAPTURE SNAPSHOT (BEFORE HIDING)
      // ===========================================
      console.log("[SCM] SNAPSHOT");

      // Capture the snapshot while element is still visible
      const snapshotDataUrl = await captureSnapshot(resolvedSource);

      // ===========================================
      // FRAME 0: ATOMIC HIDE SOURCE (after snapshot)
      // ===========================================
      resolvedSource.style.opacity = "0";
      resolvedSource.style.pointerEvents = "none";

      // ===========================================
      // PHASE 3: MEASURE TARGET (LAST) - HIDDEN
      // ===========================================
      target.style.cssText =
        "opacity:0 !important; visibility:hidden !important; display:block !important; pointer-events:none !important;";
      target.classList.add("bottom-sheet--visible");
      void target.offsetHeight;

      const lastRect = target.getBoundingClientRect();
      const targetComputed = getComputedStyle(target);
      console.log("[SCM] LAST:", lastRect.width, "x", lastRect.height);

      // Hide leaflet maps
      hideLeafletMaps();

      // ===========================================
      // PHASE 4: CREATE DUAL-LAYER PHANTOMS
      // ===========================================
      console.log("[SCM] CREATE PHANTOMS");

      // Create scrim (dark overlay)
      state.scrim = createScrim();

      // Phantom A: Card snapshot (starts visible)
      const phantomA = createSnapshotPhantom(
        snapshotDataUrl,
        firstRect,
        sourceBorderRadius,
        CONFIG.phantomZIndex + 1,
      );
      document.body.appendChild(phantomA);
      state.phantomA = phantomA;

      // Phantom B: Modal background (starts invisible at card position)
      const phantomB = createModalPhantom(
        firstRect,
        targetComputed.backgroundColor,
        CONFIG.phantomZIndex,
      );
      document.body.appendChild(phantomB);
      state.phantomB = phantomB;

      // Apply Android 15 depth effect to background
      applyBackgroundEffect(true);

      // Calculate transform
      const transform = calculateTransform(firstRect, lastRect);

      // ===========================================
      // PHASE 5: DOUBLE RAF FOR SYNC
      // ===========================================
      requestAnimationFrame(() => {
        console.log("[SCM] INVERT");

        requestAnimationFrame(() => {
          // ===========================================
          // PHASE 6: ANIMATE BOTH PHANTOMS
          // ===========================================
          console.log("[SCM] PLAY");

          // Animate scrim
          animateScrim(state.scrim, true);

          // Set transitions
          const transitionStr = `transform ${CONFIG.duration}ms ${CONFIG.easing}, border-radius ${CONFIG.duration}ms ${CONFIG.easing}, opacity ${CONFIG.duration}ms ${CONFIG.easing}`;
          phantomA.style.transition = transitionStr;
          phantomB.style.transition = transitionStr;

          // Animate Phantom A (card snapshot) - scale to modal size
          phantomA.style.transform = `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scaleX}, ${transform.scaleY})`;
          phantomA.style.borderRadius = "24px 24px 0 0";

          // Animate Phantom B (modal bg) - same transform, fade in
          phantomB.style.transform = `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scaleX}, ${transform.scaleY})`;
          phantomB.style.width = `${firstRect.width}px`;
          phantomB.style.height = `${firstRect.height}px`;

          // ===========================================
          // PHASE 7: CROSSFADE AT 50%
          // ===========================================
          setTimeout(() => {
            console.log("[SCM] CROSSFADE");
            phantomA.style.opacity = "0";
            phantomB.style.opacity = "1";
          }, CONFIG.duration * CONFIG.crossfadeAt);

          // ===========================================
          // PHASE 8: HARD SWAP AT 100%
          // ===========================================
          const onEnd = (e) => {
            if (e && e.target !== phantomA) return;
            phantomA.removeEventListener("transitionend", onEnd);

            console.log("[SCM] HARD SWAP");

            // Reveal real modal in same frame as phantom removal
            requestAnimationFrame(() => {
              // Remove phantoms
              cleanupPhantoms();
              removeScrim();

              // Instant reveal
              target.style.cssText =
                "visibility:visible; opacity:1; pointer-events:auto;";

              // Reset background
              applyBackgroundEffect(false);
              showLeafletMaps();
              state.isAnimating = false;
              resolve();
            });
          };

          phantomA.addEventListener("transitionend", onEnd);

          // Fallback timeout
          setTimeout(() => {
            if (state.phantomA === phantomA) onEnd(null);
          }, CONFIG.duration + 100);
        });
      });
    });
  }

  // ===========================================
  // FLIP Close Animation (Reverse Cross-Morph)
  // ===========================================
  function animateClose(target) {
    if (state.isAnimating) {
      console.warn("[SCM] Already animating close");
      return Promise.resolve();
    }

    if (!target || !state.sourceRect) {
      console.log("[SCM] Fallback close");
      if (target) {
        target.classList.remove("bottom-sheet--visible");
        target.style.cssText = "";
      }
      restoreSource();
      reset();
      return Promise.resolve();
    }

    return new Promise(async (resolve) => {
      state.isAnimating = true;
      hideLeafletMaps();

      const curRect = target.getBoundingClientRect();
      const computed = getComputedStyle(target);

      // Create scrim
      state.scrim = createScrim();
      state.scrim.style.backgroundColor = `rgba(0, 0, 0, ${CONFIG.scrimOpacity})`;

      // Apply background effect
      applyBackgroundEffect(true);

      // Create phantom at modal position (simple colored box for close)
      const phantom = document.createElement("div");
      phantom.className = "flip-phantom-snapshot";
      phantom.style.cssText = `
        z-index: ${CONFIG.phantomZIndex};
        left: ${curRect.left}px;
        top: ${curRect.top}px;
        width: ${curRect.width}px;
        height: ${curRect.height}px;
        background: ${computed.backgroundColor || "rgba(30, 40, 50, 0.98)"};
        border-radius: 24px 24px 0 0;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        transform-origin: top left;
      `;

      document.body.appendChild(phantom);
      state.phantomA = phantom;

      // Hide modal IMMEDIATELY
      target.style.cssText =
        "opacity:0 !important; visibility:hidden !important;";

      // Calculate reverse transform
      const transform = calculateTransform(curRect, state.sourceRect);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          phantom.style.transition = `transform ${CONFIG.duration}ms ${CONFIG.easing}, border-radius ${CONFIG.duration}ms ${CONFIG.easing}, opacity ${CONFIG.duration}ms ${CONFIG.easing}`;

          // Animate scrim out
          animateScrim(state.scrim, false);

          // Animate back to source
          phantom.style.transform = `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scaleX}, ${transform.scaleY})`;
          phantom.style.borderRadius = "16px";
          phantom.style.opacity = "0";

          const onEnd = (e) => {
            if (e && e.target !== phantom) return;
            phantom.removeEventListener("transitionend", onEnd);

            requestAnimationFrame(() => {
              target.classList.remove("bottom-sheet--visible");
              target.style.cssText = "";

              restoreSource();
              applyBackgroundEffect(false);

              console.log("[SCM] DONE close");
              cleanupPhantoms();
              removeScrim();
              showLeafletMaps();
              state.isAnimating = false;
              resolve();
            });
          };

          phantom.addEventListener("transitionend", onEnd);

          setTimeout(() => {
            if (state.phantomA === phantom) onEnd(null);
          }, CONFIG.duration + 100);
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
  // Cleanup
  // ===========================================
  function cleanupPhantoms() {
    if (state.phantomA) {
      state.phantomA.remove();
      state.phantomA = null;
    }
    if (state.phantomB) {
      state.phantomB.remove();
      state.phantomB = null;
    }
  }

  function cleanup() {
    cleanupPhantoms();
    removeScrim();
    state.isAnimating = false;
  }

  function reset() {
    cleanup();
    restoreSource();
    applyBackgroundEffect(false);
    showLeafletMaps();
    state.sourceRect = null;
    state.sourceElement = null;
    state.lastClickedElement = null;
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
    registerSource: (el) => {
      state.lastClickedElement = el;
    },
  };
})(window);
