(function (global) {
  let mapInstance = null;
  let layers = new Map();
  let currentTimestamp = null;

  // `MapContainer.init` ist der Einstieg für die MapLibre-GL basierte Karte,
  // die im Haupt-Radarbereich (`#map-container`) verwendet wird. Auf der
  // Live-Seite ist dies die große, zentrale Kartenansicht mit Layer-Management
  // für spezialisierte MapLibre-Layer (Raster-/Heatmap-Layer etc.). Wenn
  // MapLibre nicht geladen ist, wird ein Platzhalter angezeigt.
  function init(options) {
    const opts = options || {};
    const selector = opts.domSelector || "#map-container";
    const el = document.querySelector(selector);
    if (!el) {
      console.warn("MapContainer: Kein DOM-Element für", selector);
      return;
    }

    const center = opts.center || [52.52, 13.405];
    const zoom = opts.zoom || 7;

    if (!global.maplibregl) {
      console.warn(
        "MapContainer: maplibregl nicht gefunden – Map wird als Platzhalter gerendert."
      );
      el.innerHTML =
        '<div class="map-placeholder">Kartenbibliothek nicht geladen (maplibre-gl). Bitte Script einbinden.</div>';
      return;
    }

    mapInstance = new global.maplibregl.Map({
      container: el,
      style:
        "https://api.maptiler.com/maps/streets/style.json?key=" +
        (global.MAPTILER_API_KEY || "YOUR_MAPTILER_KEY_HERE"),
      center: [center[1], center[0]],
      zoom,
      attributionControl: false,
    });

    mapInstance.addControl(
      new global.maplibregl.NavigationControl(),
      "bottom-right"
    );

    mapInstance.on("load", () => {
      render();
    });
  }

  function addLayer(id, layerImpl) {
    if (!id || !layerImpl) return;
    layers.set(id, layerImpl);
    if (typeof layerImpl.onAdd === "function" && mapInstance) {
      layerImpl.onAdd(mapInstance, currentTimestamp);
    }
  }

  function removeLayer(id) {
    const layer = layers.get(id);
    if (layer && typeof layer.onRemove === "function" && mapInstance) {
      layer.onRemove(mapInstance);
    }
    layers.delete(id);
  }

  function handleTimelineUpdate(timestamp) {
    currentTimestamp = timestamp;
    layers.forEach((layer) => {
      if (typeof layer.onTimelineUpdate === "function") {
        layer.onTimelineUpdate(timestamp);
      }
    });
  }

  function render() {
    if (!mapInstance) return;
    layers.forEach((layer) => {
      if (typeof layer.render === "function") {
        layer.render(mapInstance, currentTimestamp);
      }
    });
  }

  function resize() {
    if (mapInstance && typeof mapInstance.resize === "function") {
      mapInstance.resize();
    }
  }

  /**
   * Gibt die interne MapLibre-GL-Instanz zurück (intern für Layer)
   */
  function getMap() {
    return mapInstance;
  }

  global.MapContainer = {
    init,
    addLayer,
    removeLayer,
    handleTimelineUpdate,
    render,
    resize,
    getMap,
  };
})(window);
