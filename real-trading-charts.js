// real-trading-charts.js
// Real charts with Binance WebSocket data

class RealTradingCharts {
  constructor() {
    this.charts = {
      volume: null,
      rsi: null,
      macd: null
    };
    this.ws = null;
    this.dataPoints = {
      volume: [],
      price: [],
      rsi: [],
      macd: { macd: [], signal: [], histogram: [] }
    };
    this.symbol = 'btcusdt';
    this.interval = '1m';
    this.maxDataPoints = 100;
    this.init();
  }

  init() {
    this.createCharts();
    this.connectWebSocket();
    this.setupMaximizeButtons();
  }

  createCharts() {
    // Volume Chart
    const volumeEl = document.getElementById('volume-chart');
    if (volumeEl && typeof LightweightCharts !== 'undefined') {
      this.charts.volume = LightweightCharts.createChart(volumeEl, {
        width: volumeEl.clientWidth,
        height: volumeEl.clientHeight,
        layout: {
          background: { color: '#000000' },
          textColor: '#d4af37',
        },
        grid: {
          vertLines: { color: '#1a1a1a' },
          horzLines: { color: '#1a1a1a' },
        },
        timeScale: {
          borderColor: '#2B2B43',
          timeVisible: true,
        },
      });
      
      this.charts.volume.series = this.charts.volume.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
      });
      
      this.charts.volume.timeScale().fitContent();
    }

    // RSI Chart
    const rsiEl = document.getElementById('rsi-chart');
    if (rsiEl && typeof LightweightCharts !== 'undefined') {
      this.charts.rsi = LightweightCharts.createChart(rsiEl, {
        width: rsiEl.clientWidth,
        height: rsiEl.clientHeight,
        layout: {
          background: { color: '#000000' },
          textColor: '#d4af37',
        },
        grid: {
          vertLines: { color: '#1a1a1a' },
          horzLines: { color: '#1a1a1a' },
        },
      });
      
      this.charts.rsi.series = this.charts.rsi.addLineSeries({
        color: '#d4af37',
        lineWidth: 2,
      });

      // Add overbought/oversold lines
      this.charts.rsi.overbought = this.charts.rsi.addLineSeries({
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 2,
      });
      
      this.charts.rsi.oversold = this.charts.rsi.addLineSeries({
        color: '#10b981',
        lineWidth: 1,
        lineStyle: 2,
      });
    }

    // MACD Chart
    const macdEl = document.getElementById('macd-chart');
    if (macdEl && typeof LightweightCharts !== 'undefined') {
      this.charts.macd = LightweightCharts.createChart(macdEl, {
        width: macdEl.clientWidth,
        height: macdEl.clientHeight,
        layout: {
          background: { color: '#000000' },
          textColor: '#d4af37',
        },
        grid: {
          vertLines: { color: '#1a1a1a' },
          horzLines: { color: '#1a1a1a' },
        },
      });
      
      this.charts.macd.macdLine = this.charts.macd.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
      });
      
      this.charts.macd.signalLine = this.charts.macd.addLineSeries({
        color: '#FF6B6B',
        lineWidth: 2,
      });
      
      this.charts.macd.histogram = this.charts.macd.addHistogramSeries({
        color: '#26a69a',
      });
    }
  }

  connectWebSocket() {
    this.ws = new WebSocket(`wss://stream.binance.com:9443/ws/${this.symbol}@kline_${this.interval}`);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.k) {
        this.updateCharts(data.k);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed, reconnecting...');
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.ws.close();
    };
  }

  updateCharts(kline) {
    const timestamp = Math.floor(kline.t / 1000);
    const close = parseFloat(kline.c);
    const volume = parseFloat(kline.v);

    // Update Volume
    this.dataPoints.volume.push({ time: timestamp, value: volume });
    if (this.dataPoints.volume.length > this.maxDataPoints) {
      this.dataPoints.volume.shift();
    }
    if (this.charts.volume?.series) {
      this.charts.volume.series.setData(this.dataPoints.volume);
    }

    // Update price data for indicators
    this.dataPoints.price.push({ time: timestamp, value: close });
    if (this.dataPoints.price.length > this.maxDataPoints) {
      this.dataPoints.price.shift();
    }

    // Calculate and update RSI
    if (this.dataPoints.price.length >= 14) {
      const rsi = this.calculateRSI(this.dataPoints.price.map(p => p.value), 14);
      this.dataPoints.rsi.push({ time: timestamp, value: rsi });
      if (this.dataPoints.rsi.length > this.maxDataPoints) {
        this.dataPoints.rsi.shift();
      }
      
      if (this.charts.rsi?.series) {
        this.charts.rsi.series.setData(this.dataPoints.rsi);
        
        // Update overbought/oversold lines
        const lineData = this.dataPoints.rsi.map(d => ({ time: d.time, value: 70 }));
        this.charts.rsi.overbought.setData(lineData);
        this.charts.rsi.oversold.setData(lineData.map(d => ({ ...d, value: 30 })));
      }
    }

    // Calculate and update MACD
    if (this.dataPoints.price.length >= 26) {
      const macdData = this.calculateMACD(this.dataPoints.price.map(p => p.value));
      
      this.dataPoints.macd.macd.push({ time: timestamp, value: macdData.macd });
      this.dataPoints.macd.signal.push({ time: timestamp, value: macdData.signal });
      this.dataPoints.macd.histogram.push({ 
        time: timestamp, 
        value: macdData.histogram,
        color: macdData.histogram >= 0 ? '#26a69a' : '#ef5350'
      });

      if (this.dataPoints.macd.macd.length > this.maxDataPoints) {
        this.dataPoints.macd.macd.shift();
        this.dataPoints.macd.signal.shift();
        this.dataPoints.macd.histogram.shift();
      }

      if (this.charts.macd) {
        this.charts.macd.macdLine.setData(this.dataPoints.macd.macd);
        this.charts.macd.signalLine.setData(this.dataPoints.macd.signal);
        this.charts.macd.histogram.setData(this.dataPoints.macd.histogram);
      }
    }
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  calculateMACD(prices) {
    if (prices.length < 26) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    const ema12 = this.calculateEMA(prices.slice(-26), 12);
    const ema26 = this.calculateEMA(prices.slice(-26), 26);
    const macd = ema12 - ema26;

    const macdHistory = [];
    for (let i = prices.length - 9; i < prices.length; i++) {
      const ema12 = this.calculateEMA(prices.slice(0, i + 1), 12);
      const ema26 = this.calculateEMA(prices.slice(0, i + 1), 26);
      macdHistory.push(ema12 - ema26);
    }

    const signal = this.calculateEMA(macdHistory, 9);
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  setupMaximizeButtons() {
    ['volume', 'rsi', 'macd'].forEach(chartType => {
      const container = document.getElementById(`${chartType}-chart`)?.closest('.panel');
      if (!container) return;

      const header = container.querySelector('.mini-chart-title');
      if (!header) return;

      const maxBtn = document.createElement('button');
      maxBtn.innerHTML = '⤢';
      maxBtn.style.cssText = `
        float: right;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: #d4af37;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      `;
      
      maxBtn.addEventListener('mouseenter', () => {
        maxBtn.style.background = 'rgba(212,175,55,0.15)';
        maxBtn.style.transform = 'scale(1.1)';
      });
      
      maxBtn.addEventListener('mouseleave', () => {
        maxBtn.style.background = 'rgba(255,255,255,0.05)';
        maxBtn.style.transform = 'scale(1)';
      });

      maxBtn.addEventListener('click', () => {
        this.toggleMaximize(chartType, container);
      });

      header.appendChild(maxBtn);
    });
  }

  toggleMaximize(chartType, container) {
    if (container.classList.contains('maximized')) {
      // Minimize
      container.classList.remove('maximized');
      container.style.cssText = '';
      
      const minBtn = container.querySelector('.minimize-chart-btn');
      if (minBtn) minBtn.remove();
      
      // Recreate chart at normal size
      setTimeout(() => {
        this.resizeChart(chartType);
      }, 300);
    } else {
      // Maximize
      container.classList.add('maximized');
      container.style.cssText = `
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 10000;
        margin: 0 !important;
        border-radius: 0 !important;
        padding: 20px;
      `;

      const header = container.querySelector('.mini-chart-title');
      const minBtn = document.createElement('button');
      minBtn.className = 'minimize-chart-btn';
      minBtn.innerHTML = '✕ Close';
      minBtn.style.cssText = `
        float: right;
        background: rgba(239,68,68,0.1);
        border: 1px solid rgba(239,68,68,0.3);
        color: #ff6b6b;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        margin-left: 12px;
      `;
      
      minBtn.addEventListener('click', () => {
        this.toggleMaximize(chartType, container);
      });

      header.appendChild(minBtn);

      // Resize chart to full screen
      setTimeout(() => {
        this.resizeChart(chartType, true);
      }, 100);
    }
  }

  resizeChart(chartType, isMaximized = false) {
    const container = document.getElementById(`${chartType}-chart`);
    if (!container || !this.charts[chartType]) return;

    const width = isMaximized ? window.innerWidth - 40 : container.clientWidth;
    const height = isMaximized ? window.innerHeight - 120 : container.clientHeight;

    this.charts[chartType].resize(width, height);
    this.charts[chartType].timeScale().fitContent();
  }

  destroy() {
    if (this.ws) {
      this.ws.close();
    }
    Object.values(this.charts).forEach(chart => {
      if (chart && chart.remove) chart.remove();
    });
  }
}

// Initialize real charts
window.addEventListener('load', () => {
  window.realCharts = new RealTradingCharts();

  // Handle window resize
  window.addEventListener('resize', () => {
    ['volume', 'rsi', 'macd'].forEach(type => {
      if (window.realCharts?.charts[type]) {
        const container = document.getElementById(`${type}-chart`);
        if (container) {
          window.realCharts.charts[type].resize(
            container.clientWidth,
            container.clientHeight
          );
        }
      }
    });
  });
});
