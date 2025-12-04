(function (global) {
  let currentView = "home";
  let globalListenerBound = false;

  function setActive(viewId) {
    if (!viewId) return;
    currentView = viewId;

    const navButtons = document.querySelectorAll(
      "#bottom-nav [data-nav-target]"
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

    // Hide/show app-bar based on view
    const appBar = document.getElementById("app-bar");
    if (appBar) {
      // Hide app-bar on settings, show on other views
      if (viewId === "settings") {
        appBar.style.display = "none";
      } else {
        appBar.style.display = "";
      }
    }

    const scrollContainer = document.querySelector(".app-main-views");
    if (scrollContainer && typeof scrollContainer.scrollTo === "function") {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
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

  global.BottomNav = { initBottomNav, setActive };
})(window);
