(function (global) {
  let currentView = "home";
  let globalListenerBound = false;
  let devDashboardIconActive = false;

  function createRipple(event, button) {
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    const rect = button.getBoundingClientRect();

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add("ripple");

    // Remove existing ripples
    const existingRipple = button.querySelector(".ripple");
    if (existingRipple) {
      existingRipple.remove();
    }

    button.appendChild(circle);

    // Remove ripple after animation
    setTimeout(() => circle.remove(), 600);
  }

  function addDevDashboardIcon() {
    if (devDashboardIconActive) return;

    const bottomNav = document.getElementById("bottom-nav");
    if (!bottomNav) return;

    // Create dev dashboard button
    const devButton = document.createElement("button");
    devButton.className = "bottom-nav__button bottom-nav__button--dev";
    devButton.type = "button";
    devButton.setAttribute("data-nav-target", "dev-dashboard");
    devButton.innerHTML = `
      <span class="bottom-nav__icon material-symbols-outlined" aria-hidden="true">code</span>
      <span class="bottom-nav__label">Dev</span>
    `;

    bottomNav.appendChild(devButton);
    devDashboardIconActive = true;

    console.log("[BottomNav] Dev Dashboard icon added");
  }

  function removeDevDashboardIcon() {
    if (!devDashboardIconActive) return;

    const bottomNav = document.getElementById("bottom-nav");
    if (!bottomNav) return;

    const devButton = bottomNav.querySelector(
      '[data-nav-target="dev-dashboard"]',
    );
    if (devButton) {
      devButton.remove();
      devDashboardIconActive = false;
      console.log("[BottomNav] Dev Dashboard icon removed");
    }
  }

  function setActive(viewId) {
    if (!viewId) return;
    currentView = viewId;

    const navButtons = document.querySelectorAll(
      "#bottom-nav [data-nav-target]",
    );
    navButtons.forEach((btn) => {
      const target = btn.getAttribute("data-nav-target");
      const isActive = target === viewId;
      btn.classList.toggle("bottom-nav__button--active", isActive);
      if (isActive) {
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.setAttribute("aria-pressed", "false");
      }
    });

    const sections = document.querySelectorAll("[data-view]");
    sections.forEach((section) => {
      const id = section.getAttribute("data-view");
      section.hidden = id !== viewId;
    });

    // Hide/show app-bar based on view - only show on home
    const appBar = document.getElementById("app-bar");
    if (appBar) {
      // Only show app-bar on home view
      if (viewId === "home") {
        appBar.style.display = "";
      } else {
        appBar.style.display = "none";
      }
    }

    // Toggle unified background class for non-home views
    const unifiedBgViews = ["settings", "history", "health", "dev-dashboard"];
    if (unifiedBgViews.includes(viewId)) {
      document.body.classList.add("view-unified-bg");
    } else {
      document.body.classList.remove("view-unified-bg");
    }

    const scrollContainer = document.querySelector(".app-main-views");
    if (scrollContainer && typeof scrollContainer.scrollTo === "function") {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }

    // CLEANUP: Beim Verlassen des History-Tabs Observer disconnecten
    if (viewId !== "history" && global.HistoryCharts?.cleanupObservers) {
      console.log("[BottomNav] Leaving History → Cleanup Observers");
      global.HistoryCharts.cleanupObservers();
    }

    // CLEANUP: Charts zerstören beim Verlassen
    if (viewId !== "history" && global.HistoryCharts?.destroyAll) {
      global.HistoryCharts.destroyAll();
    }

    // Trigger History render when switching to history tab
    if (viewId === "history" && global.HistoryController) {
      console.log("[BottomNav] History-Tab aktiviert → Starte Render");

      // Use requestAnimationFrame to ensure DOM is fully rendered after hidden removal
      requestAnimationFrame(() => {
        global.HistoryController.render().catch((err) => {
          console.warn("[BottomNav] History render failed:", err);
        });
      });
    }

    // Trigger Dev Dashboard render when switching to dev-dashboard tab
    if (viewId === "dev-dashboard" && global.DevDashboardView) {
      console.log("[BottomNav] Dev Dashboard aktiviert → Render");
      requestAnimationFrame(() => {
        global.DevDashboardView.render();
      });
    }

    // Remove dev dashboard icon when leaving dev-dashboard view
    if (viewId !== "dev-dashboard" && devDashboardIconActive) {
      removeDevDashboardIcon();
    }
  }

  function handleDocumentNavClick(event) {
    const target = event.target.closest("[data-nav-target]");
    if (!target) return;
    const viewId = target.getAttribute("data-nav-target");
    if (!viewId) return;
    setActive(viewId);
  }

  function initBottomNav() {
    const container = document.getElementById("bottom-nav");
    if (container && !container.dataset.navInitialized) {
      container.addEventListener("click", (event) => {
        const target = event.target.closest("[data-nav-target]");
        if (!target) return;
        const viewId = target.getAttribute("data-nav-target");
        if (!viewId) return;

        // Create ripple effect
        createRipple(event, target);

        event.preventDefault();
        setActive(viewId);
      });
      container.dataset.navInitialized = "true";
    }

    if (!globalListenerBound) {
      document.addEventListener("click", handleDocumentNavClick);
      globalListenerBound = true;
    }

    setActive(currentView);
  }

  global.BottomNav = {
    initBottomNav,
    setActive,
    addDevDashboardIcon,
    removeDevDashboardIcon,
  };
})(window);
