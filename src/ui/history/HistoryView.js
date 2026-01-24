export class HistoryView {
  constructor(options = {}) {
    this.containerId = options.containerId || "history-container";
  }

  async render(rawHistory) {
     const container = document.querySelector(`#${this.containerId}`);
     if (!container) return;
     container.innerHTML = `
        <div class="history-view-placeholder" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
          <p>History View cleaned for redesign.</p>
        </div>
      `;
  }
}
export default HistoryView;
