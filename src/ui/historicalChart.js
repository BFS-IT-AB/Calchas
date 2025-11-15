/**
 * src/ui/historicalChart.js
 * Historical Weather Data Chart Component
 * Displays temperature trends, precipitation data using simple canvas rendering
 */

class HistoricalChart {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.canvas = null;
    this.ctx = null;
    this.data = [];
    this.width = 0;
    this.height = 0;
  }

  /**
   * Set historical data and render chart
   * @param {Array} historicalData - Array of { date, temp_min, temp_max, precipitation }
   * @param {string} type - Chart type: 'temperature', 'precipitation', 'both'
   * @param {boolean} fahrenheit - Convert to Fahrenheit?
   */
  render(historicalData, type = 'temperature', fahrenheit = false) {
    if (!this.container) {
      console.warn('Chart container not found');
      return;
    }

    if (!historicalData || historicalData.length === 0) {
      this.container.innerHTML = `
        <div style="padding: var(--spacing-md); color: var(--text-muted); text-align: center;">
          📊 Keine historischen Daten verfügbar
        </div>
      `;
      return;
    }

    // Prepare data
    this.data = historicalData.map(d => ({
      date: d.date,
      temp_min: fahrenheit ? (d.temp_min * 9/5) + 32 : d.temp_min,
      temp_max: fahrenheit ? (d.temp_max * 9/5) + 32 : d.temp_max,
      temp_avg: fahrenheit ? (((d.temp_min + d.temp_max) / 2) * 9/5) + 32 : (d.temp_min + d.temp_max) / 2,
      precipitation: d.precipitation || 0,
    }));

    // Create canvas
    this.width = this.container.clientWidth || 600;
    this.height = type === 'both' ? 400 : 300;

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
        <h3 style="color: var(--text-heading); margin: 0;">📈 Historische Daten (letzte 7 Tage)</h3>
        <canvas id="historical-canvas" width="${this.width}" height="${this.height}" 
          style="border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--box-light);">
        </canvas>
      </div>
    `;

    this.canvas = document.getElementById('historical-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Draw based on type
    if (type === 'temperature' || type === 'both') {
      this._drawTemperatureChart(fahrenheit);
    }

    if (type === 'precipitation' || type === 'both') {
      this._drawPrecipitationOverlay();
    }

    this._drawLegend(type, fahrenheit);
    console.log(`✅ Historical chart rendered (${type})`);
  }

  /**
   * Draw temperature chart
   * @private
   * @param {boolean} fahrenheit - Is temperature in Fahrenheit?
   */
  _drawTemperatureChart(fahrenheit) {
    const padding = 50;
    const chartWidth = this.width - 2 * padding;
    const chartHeight = this.height - 2 * padding;

    // Find min/max temperatures
    let minTemp = Math.min(...this.data.map(d => d.temp_min));
    let maxTemp = Math.max(...this.data.map(d => d.temp_max));

    // Add padding to temp range
    const tempRange = maxTemp - minTemp;
    minTemp -= tempRange * 0.1;
    maxTemp += tempRange * 0.1;

    // Draw background grid
    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.05)';
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * chartHeight) / 5;
      this.ctx.fillRect(padding, y - 1, chartWidth, 2);
    }

    // Draw axes
    this.ctx.strokeStyle = 'var(--border-light, #ddd)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(padding, padding);
    this.ctx.lineTo(padding, this.height - padding);
    this.ctx.lineTo(this.width - padding, this.height - padding);
    this.ctx.stroke();

    // Draw temperature line (min-max range as filled area)
    const xStep = chartWidth / (this.data.length - 1 || 1);

    // Fill area between min and max
    this.ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
    this.ctx.beginPath();

    // Max line
    for (let i = 0; i < this.data.length; i++) {
      const x = padding + i * xStep;
      const normalizedTemp = (this.data[i].temp_max - minTemp) / (maxTemp - minTemp);
      const y = this.height - padding - normalizedTemp * chartHeight;
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    }

    // Min line (reverse)
    for (let i = this.data.length - 1; i >= 0; i--) {
      const x = padding + i * xStep;
      const normalizedTemp = (this.data[i].temp_min - minTemp) / (maxTemp - minTemp);
      const y = this.height - padding - normalizedTemp * chartHeight;
      this.ctx.lineTo(x, y);
    }

    this.ctx.closePath();
    this.ctx.fill();

    // Draw average temperature line
    this.ctx.strokeStyle = '#007BFF';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();

    for (let i = 0; i < this.data.length; i++) {
      const x = padding + i * xStep;
      const normalizedTemp = (this.data[i].temp_avg - minTemp) / (maxTemp - minTemp);
      const y = this.height - padding - normalizedTemp * chartHeight;
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    }

    this.ctx.stroke();

    // Draw x-axis labels (dates)
    this.ctx.fillStyle = 'var(--text-light, #333)';
    this.ctx.font = '12px system-ui';
    this.ctx.textAlign = 'center';

    for (let i = 0; i < this.data.length; i += Math.ceil(this.data.length / 5)) {
      const x = padding + i * xStep;
      const date = new Date(this.data[i].date);
      const label = `${date.getDate()}.${date.getMonth() + 1}.`;
      this.ctx.fillText(label, x, this.height - padding + 20);
    }

    // Draw y-axis labels (temperature)
    this.ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const temp = minTemp + (i / 5) * (maxTemp - minTemp);
      const y = this.height - padding - (i / 5) * chartHeight;
      const label = `${Math.round(temp)}°${fahrenheit ? 'F' : 'C'}`;
      this.ctx.fillText(label, padding - 10, y + 5);
    }
  }

  /**
   * Draw precipitation overlay
   * @private
   */
  _drawPrecipitationOverlay() {
    const padding = 50;
    const chartWidth = this.width - 2 * padding;
    const chartHeight = this.height - 2 * padding;

    const maxPrecip = Math.max(...this.data.map(d => d.precipitation), 1);
    const xStep = chartWidth / (this.data.length - 1 || 1);
    const barWidth = Math.max(xStep * 0.6, 5);

    // Draw precipitation bars
    this.ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';

    for (let i = 0; i < this.data.length; i++) {
      const x = padding + i * xStep;
      const normalizedPrecip = this.data[i].precipitation / maxPrecip;
      const barHeight = normalizedPrecip * chartHeight;
      const y = this.height - padding - barHeight;

      // Draw bar
      this.ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

      // Border
      this.ctx.strokeStyle = '#0096FF';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight);
    }
  }

  /**
   * Draw legend
   * @private
   * @param {string} type - Chart type
   * @param {boolean} fahrenheit - Is temperature in Fahrenheit?
   */
  _drawLegend(type, fahrenheit) {
    const legendY = this.height - 20;

    if (type === 'temperature' || type === 'both') {
      // Temperature legend
      this.ctx.fillStyle = '#007BFF';
      this.ctx.fillRect(this.width - 200, legendY, 15, 3);
      this.ctx.fillStyle = 'var(--text-light, #333)';
      this.ctx.font = '12px system-ui';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`Durchschn. Temperatur (°${fahrenheit ? 'F' : 'C'})`, this.width - 180, legendY + 4);
    }

    if (type === 'precipitation' || type === 'both') {
      // Precipitation legend
      this.ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
      this.ctx.fillRect(this.width - 200, legendY + 20, 15, 15);
      this.ctx.fillStyle = 'var(--text-light, #333)';
      this.ctx.fillText('Niederschlag (mm)', this.width - 180, legendY + 31);
    }
  }

  /**
   * Clear chart
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.data = [];
    console.log('✅ Chart cleared');
  }
}

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HistoricalChart;
}
