// demo-live-trading-system.js

class TradingSystem {
  constructor() {
    this.mode = 'demo'; // 'demo' or 'live'
    this.demoBalance = {
      USDT: 100000,
      BTC: 0,
      ETH: 0
    };
    this.demoPositions = [];
    this.liveWallet = null;
    this.bybitTestnet = 'https://api-testnet.bybit.com';
    this.bybitMainnet = 'https://api.bybit.com';
    this.init();
  }

  init() {
    this.setupModeToggle();
    this.setupOrderExecution();
    this.loadDemoData();
    this.displayBalance();
  }

  setupModeToggle() {
    // Add trading mode toggle near wallet status
    const tradeHeader = document.querySelector('.main-trading-header');
    if (!tradeHeader) return;

    const controls = tradeHeader.querySelector('.panel-controls');
    if (!controls) return;

    const modeToggle = document.createElement('div');
    modeToggle.id = 'trading-mode-toggle';
    modeToggle.style.cssText = `
      display: flex;
      gap: 8px;
      background: rgba(255,255,255,0.02);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      margin-right: 12px;
    `;

    modeToggle.innerHTML = `
      <button class="mode-toggle-btn active" data-mode="demo" style="
        padding: 8px 16px;
        background: linear-gradient(135deg, var(--gold-dark), var(--gold-primary));
        border: none;
        border-radius: 8px;
        color: #0a0a0a;
        font-weight: 600;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      ">
        📊 Demo Trading
      </button>
      <button class="mode-toggle-btn" data-mode="live" style="
        padding: 8px 16px;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: #888;
        font-weight: 600;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      ">
        💰 Live Trading
      </button>
    `;

    controls.insertBefore(modeToggle, controls.firstChild);

    // Mode toggle handlers
    modeToggle.querySelectorAll('.mode-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const newMode = btn.dataset.mode;
        
        if (newMode === 'live' && !this.liveWallet) {
          this.promptWalletConnection();
          return;
        }

        this.switchMode(newMode);
        
        // Update button states
        modeToggle.querySelectorAll('.mode-toggle-btn').forEach(b => {
          if (b.dataset.mode === newMode) {
            b.style.background = 'linear-gradient(135deg, var(--gold-dark), var(--gold-primary))';
            b.style.color = '#0a0a0a';
            b.classList.add('active');
          } else {
            b.style.background = 'transparent';
            b.style.color = '#888';
            b.classList.remove('active');
          }
        });
      });
    });
  }

  switchMode(mode) {
    this.mode = mode;
    this.displayBalance();
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 90px;
      right: 20px;
      background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1));
      border: 1px solid rgba(212,175,55,0.4);
      padding: 16px 24px;
      border-radius: 12px;
      color: #d4af37;
      font-weight: 600;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    `;
    
    notification.textContent = mode === 'demo' 
      ? '📊 Switched to Demo Trading Mode' 
      : '💰 Switched to Live Trading Mode';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  promptWalletConnection() {
    const modal = document.getElementById('wallet-modal');
    if (modal) {
      modal.classList.add('active');
      
      // Override wallet connection success
      const originalWalletClick = document.querySelectorAll('.wallet-option');
      originalWalletClick.forEach(opt => {
        opt.addEventListener('click', async () => {
          // Simulated wallet connection
          this.liveWallet = {
            address: '0x' + Math.random().toString(16).substr(2, 40),
            provider: opt.dataset.id
          };
          
          this.switchMode('live');
          modal.classList.remove('active');
        });
      });
    }
  }

  loadDemoData() {
    const stored = localStorage.getItem('demo_trading_data');
    if (stored) {
      const data = JSON.parse(stored);
      this.demoBalance = data.balance || this.demoBalance;
      this.demoPositions = data.positions || [];
    }
  }

  saveDemoData() {
    localStorage.setItem('demo_trading_data', JSON.stringify({
      balance: this.demoBalance,
      positions: this.demoPositions
    }));
  }

  displayBalance() {
    // Create or update balance display
    let balanceDisplay = document.getElementById('balance-display');
    
    if (!balanceDisplay) {
      const orderbookContainer = document.querySelector('.orderbook-container');
      if (!orderbookContainer) return;

      balanceDisplay = document.createElement('div');
      balanceDisplay.id = 'balance-display';
      balanceDisplay.style.cssText = `
        padding: 16px;
        background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(212,175,55,0.02));
        border-radius: 12px;
        border: 1px solid rgba(212,175,55,0.1);
        margin-bottom: 16px;
      `;
      
      orderbookContainer.insertBefore(balanceDisplay, orderbookContainer.firstChild);
    }

    if (this.mode === 'demo') {
      balanceDisplay.innerHTML = `
        <div style="color: #d4af37; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
          📊 Demo Account Balance
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${Object.entries(this.demoBalance).map(([asset, amount]) => `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #888; font-size: 12px;">${asset}</span>
              <span style="color: #fff; font-weight: 600; font-size: 14px;">${amount.toFixed(4)}</span>
            </div>
          `).join('')}
        </div>
        <button id="reset-demo-btn" style="
          width: 100%;
          margin-top: 12px;
          padding: 8px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">
          🔄 Reset Demo Account
        </button>
      `;

      document.getElementById('reset-demo-btn')?.addEventListener('click', () => {
        if (confirm('Reset demo account to $100,000 USDT?')) {
          this.resetDemoAccount();
        }
      });
    } else {
      balanceDisplay.innerHTML = `
        <div style="color: #10b981; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
          💰 Live Trading Active
        </div>
        <div style="color: #888; font-size: 12px;">
          Connected: ${this.liveWallet?.address.slice(0, 10)}...
        </div>
      `;
    }
  }

  resetDemoAccount() {
    this.demoBalance = {
      USDT: 100000,
      BTC: 0,
      ETH: 0
    };
    this.demoPositions = [];
    this.saveDemoData();
    this.displayBalance();
    
    alert('✅ Demo account reset to $100,000 USDT');
  }

  setupOrderExecution() {
    const placeOrderBtn = document.getElementById('place-order');
    if (!placeOrderBtn) return;

    placeOrderBtn.addEventListener('click', () => {
      this.executeOrder();
    });
  }

  async executeOrder() {
    const side = document.querySelector('.side-btn.active')?.dataset.side || 'buy';
    const orderType = document.getElementById('order-type')?.value || 'market';
    const price = parseFloat(document.getElementById('order-price')?.value || 0);
    const qty = parseFloat(document.getElementById('order-qty')?.value || 0);
    const leverage = document.querySelector('.leverage-btn.active')?.dataset.lev || 1;

    if (!qty || qty <= 0) {
      alert('❌ Please enter a valid quantity');
      return;
    }

    if (this.mode === 'demo') {
      this.executeDemoOrder({ side, orderType, price, qty, leverage });
    } else {
      await this.executeLiveOrder({ side, orderType, price, qty, leverage });
    }
  }

  async executeDemoOrder(order) {
    const { side, qty, leverage } = order;
    
    // Get current market price (simulate with orderbook)
    const marketPrice = this.getMarketPrice();
    const totalCost = marketPrice * qty;
    const requiredMargin = totalCost / leverage;

    if (side === 'buy') {
      if (this.demoBalance.USDT < requiredMargin) {
        alert(`❌ Insufficient balance. Required: ${requiredMargin.toFixed(2)} USDT`);
        return;
      }

      this.demoBalance.USDT -= requiredMargin;
      this.demoBalance.BTC += qty;

      this.demoPositions.push({
        id: 'demo_' + Date.now(),
        side: 'long',
        symbol: 'BTCUSDT',
        qty,
        entryPrice: marketPrice,
        leverage,
        timestamp: Date.now()
      });
    } else {
      if (this.demoBalance.BTC < qty) {
        alert(`❌ Insufficient BTC balance`);
        return;
      }

      this.demoBalance.BTC -= qty;
      this.demoBalance.USDT += totalCost;

      this.demoPositions.push({
        id: 'demo_' + Date.now(),
        side: 'short',
        symbol: 'BTCUSDT',
        qty,
        entryPrice: marketPrice,
        leverage,
        timestamp: Date.now()
      });
    }

    this.saveDemoData();
    this.displayBalance();
    this.showOrderConfirmation(order, marketPrice, 'demo');
  }

  async executeLiveOrder(order) {
    if (!this.liveWallet) {
      alert('❌ Please connect your wallet first');
      this.promptWalletConnection();
      return;
    }

    // This is where you'd integrate with Bybit API
    // For now, we'll simulate the order
    
    alert('🚀 Live trading integration coming soon!\nThis will connect to Bybit API with your credentials.');
    
    // Bybit API integration example:
    /*
    const bybitOrder = await this.placeBybitOrder({
      api_key: 'YOUR_API_KEY',
      symbol: 'BTCUSDT',
      side: order.side === 'buy' ? 'Buy' : 'Sell',
      order_type: 'Market',
      qty: order.qty,
      time_in_force: 'GoodTillCancel'
    });
    */
  }

  getMarketPrice() {
    // Get from orderbook or use simulated price
    const bids = window.orderbookSystem?.bids || [];
    if (bids.length > 0) {
      return parseFloat(bids[0][0]);
    }
    return 50000; // Fallback price
  }

  showOrderConfirmation(order, executionPrice, mode) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 90px;
      right: 20px;
      background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1));
      border: 1px solid rgba(16,185,129,0.4);
      padding: 20px;
      border-radius: 12px;
      color: #fff;
      z-index: 10000;
      min-width: 300px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.6);
      animation: slideIn 0.3s ease;
    `;

    notification.innerHTML = `
      <div style="font-weight: 700; font-size: 16px; color: #6ee7b7; margin-bottom: 12px;">
        ✅ Order Executed (${mode.toUpperCase()})
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Side:</span>
          <span style="color: ${order.side === 'buy' ? '#6ee7b7' : '#fca5a5'}; font-weight: 600;">
            ${order.side.toUpperCase()}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Quantity:</span>
          <span style="font-weight: 600;">${order.qty} BTC</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Price:</span>
          <span style="font-weight: 600;">$${executionPrice.toFixed(2)}</span>
        </div>
        ${order.leverage ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Leverage:</span>
            <span style="font-weight: 600;">${order.leverage}x</span>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // Bybit API integration methods (to be implemented with actual API keys)
  async placeBybitOrder(params) {
    // This requires proper authentication with Bybit API
    // Use testnet for demo: https://api-testnet.bybit.com
    // Use mainnet for live: https://api.bybit.com
    
    const endpoint = this.mode === 'demo' ? this.bybitTestnet : this.bybitMainnet;
    
    // You'll need to sign the request with HMAC SHA256
    // See Bybit API documentation for details
    
    throw new Error('Bybit integration requires API keys - implement with your credentials');
  }
}

// Initialize trading system
window.addEventListener('load', () => {
  window.tradingSystem = new TradingSystem();
});
