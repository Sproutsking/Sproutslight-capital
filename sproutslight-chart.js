/* Technical Indicators */
let volumeWidget = null;
let rsiWidget = null;
let macdWidget = null;

function initTechnicalIndicators() {
  // Create separate TradingView widgets for each indicator
  setTimeout(() => {
    createVolumeChart();
    createRSIChart();
    createMACDChart();
  }, 1500);
}

function createVolumeChart() {
  const container = document.getElementById('volume-chart');
  if (!container || typeof TradingView === 'undefined') {
    console.log('Volume chart container or TradingView not ready');
    return;
  }

  container.innerHTML = '<div id="volume_widget" style="height:100%;width:100%;"></div>';

  try {
    volumeWidget = new TradingView.widget({
      container_id: 'volume_widget',
      autosize: true,
      symbol: 'BINANCE:BTCUSDT',
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#0a0a0a',
      enable_publishing: false,
      hide_top_toolbar: true,
      hide_legend: false,
      hide_side_toolbar: true,
      allow_symbol_change: false,
      studies: ['Volume@tv-basicstudies'],
      disabled_features: ['header_widget', 'timeframes_toolbar', 'display_market_status', 'symbol_info'],
      enabled_features: [],
      loading_screen: { backgroundColor: '#0a0a0a' },
      overrides: {
        'mainSeriesProperties.showCountdown': false,
        'paneProperties.background': '#0a0a0a',
        'paneProperties.vertGridProperties.color': 'rgba(255,255,255,0.02)',
        'paneProperties.horzGridProperties.color': 'rgba(255,255,255,0.02)',
      }
    });
    console.log('Volume chart created');
  } catch (e) {
    console.error('Volume chart error:', e);
  }
}

function createRSIChart() {
  const container = document.getElementById('rsi-chart');
  if (!container || typeof TradingView === 'undefined') {
    console.log('RSI chart container or TradingView not ready');
    return;
  }

  container.innerHTML = '<div id="rsi_widget" style="height:100%;width:100%;"></div>';

  try {
    rsiWidget = new TradingView.widget({
      container_id: 'rsi_widget',
      autosize: true,
      symbol: 'BINANCE:BTCUSDT',
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#0a0a0a',
      enable_publishing: false,
      hide_top_toolbar: true,
      hide_legend: false,
      hide_side_toolbar: true,
      allow_symbol_change: false,
      studies: ['RSI@tv-basicstudies'],
      disabled_features: ['header_widget', 'timeframes_toolbar', 'display_market_status', 'symbol_info'],
      enabled_features: [],
      loading_screen: { backgroundColor: '#0a0a0a' },
      overrides: {
        'mainSeriesProperties.showCountdown': false,
        'paneProperties.background': '#0a0a0a',
        'paneProperties.vertGridProperties.color': 'rgba(255,255,255,0.02)',
        'paneProperties.horzGridProperties.color': 'rgba(255,255,255,0.02)',
      }
    });
    console.log('RSI chart created');
  } catch (e) {
    console.error('RSI chart error:', e);
  }
}

function createMACDChart() {
  const container = document.getElementById('macd-chart');
  if (!container || typeof TradingView === 'undefined') {
    console.log('MACD chart container or TradingView not ready');
    return;
  }

  container.innerHTML = '<div id="macd_widget" style="height:100%;width:100%;"></div>';

  try {
    macdWidget = new TradingView.widget({
      container_id: 'macd_widget',
      autosize: true,
      symbol: 'BINANCE:BTCUSDT',
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#0a0a0a',
      enable_publishing: false,
      hide_top_toolbar: true,
      hide_legend: false,
      hide_side_toolbar: true,
      allow_symbol_change: false,
      studies: ['MACD@tv-basicstudies'],
      disabled_features: ['header_widget', 'timeframes_toolbar', 'display_market_status', 'symbol_info'],
      enabled_features: [],
      loading_screen: { backgroundColor: '#0a0a0a' },
      overrides: {
        'mainSeriesProperties.showCountdown': false,
        'paneProperties.background': '#0a0a0a',
        'paneProperties.vertGridProperties.color': 'rgba(255,255,255,0.02)',
        'paneProperties.horzGridProperties.color': 'rgba(255,255,255,0.02)',
      }
    });
    console.log('MACD chart created');
  } catch (e) {
    console.error('MACD chart error:', e);
  }
}
