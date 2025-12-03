(function (global) {
  let mapLayerManager = null;
  let currentIndex = 0;
  let frames = [];
  let playing = false;
  let intervalId = null;

  function init(manager) {
    mapLayerManager = manager || global.MapLayerManager;
    frames = [];
    currentIndex = 0;
  }

  function generateFrames() {
    const now = Date.now();
    const stepMinutes = 15;
    const pastHours = 24;
    const futureHours = 6;
    const result = [];

    const pastCount = Math.floor((pastHours * 60) / stepMinutes);
    const futureCount = Math.floor((futureHours * 60) / stepMinutes);

    for (let i = pastCount; i > 0; i -= 1) {
      result.push(now - i * stepMinutes * 60 * 1000);
    }
    result.push(now);
    for (let j = 1; j <= futureCount; j += 1) {
      result.push(now + j * stepMinutes * 60 * 1000);
    }

    setFrames(result);
    return result;
  }

  function setFrames(timestamps) {
    frames = timestamps || [];
    currentIndex = 0;
    const slider = document.getElementById("map-timeline-slider");
    if (slider) {
      const maxIndex = Math.max(frames.length - 1, 0);
      slider.max = String(maxIndex);
      slider.value = "0";
      slider.disabled = maxIndex === 0;
    }
    updateTimeline();
  }

  function step(delta) {
    if (!frames.length) return;
    currentIndex = (currentIndex + delta + frames.length) % frames.length;
    updateTimeline();
  }

  function play() {
    if (playing || !frames.length) return;
    playing = true;
    intervalId = setInterval(() => step(1), 750);
  }

  function pause() {
    playing = false;
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  function seek(index) {
    if (!frames.length) return;
    const numericIndex = Number(index);
    if (Number.isNaN(numericIndex)) return;
    const clamped = Math.min(Math.max(numericIndex, 0), frames.length - 1);
    currentIndex = clamped;
    updateTimeline();
  }

  function updateTimeline() {
    const ts = frames[currentIndex];
    if (!ts || !mapLayerManager) return;
    (mapLayerManager.getLayerList() || []).forEach((entry) => {
      mapLayerManager.updateLayerData(entry.id, ts);
    });
    if (
      global.MapContainer &&
      typeof global.MapContainer.handleTimelineUpdate === "function"
    ) {
      global.MapContainer.handleTimelineUpdate(ts);
    }
    const slider = document.getElementById("map-timeline-slider");
    if (slider) slider.value = String(currentIndex);
    const label = document.getElementById("map-timeline-label");
    if (label && ts) {
      const date = new Date(ts);
      const now = Date.now();
      const diffMinutes = Math.round((ts - now) / 60000);
      const timeStr = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      let context = "Live";
      if (diffMinutes < -5) {
        context = `${Math.abs(diffMinutes)} Min zurück`;
      } else if (diffMinutes > 5) {
        context = `${diffMinutes} Min voraus`;
      }
      label.textContent = `${timeStr} · ${context}`;

      const subtitle = document.querySelector(
        '[data-view="radar"] .map-view__subtitle'
      );
      if (subtitle) {
        subtitle.textContent = `Zeitstempel: ${timeStr} (${context})`;
      }
    }
  }

  global.RadarController = {
    init,
    setFrames,
    generateFrames,
    step,
    play,
    pause,
    seek,
  };
})(window);
