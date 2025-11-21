/**
 * Integration script for Elite Trading Hub + Web3 Trading Engine
 * Add this script after loading the Web3TradingEngine
 */

(function() {
  'use strict';

  // Initialize the trading engine
  const tradingEngine = new Web3TradingEngine({
    demoMode: true, // Start in demo mode for safety
    network: 'mainnet',
    slippageTolerance: 0.5
  });

  // Global state
  let isDemoMode = true;
  let currentNetwork = 'mainnet';

  // ==================== UI HELPERS ====================
  
  function showNotification(message, type = 'info') {
    // You can integrate with your existing notification system
    console.log(`[${type.toUpperCase()}]`, message);
    
    // Add message to chat
    if (typeof addMessage === 'function') {
      const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
      addMessage(`${icon} ${message}`, 'them');
    }
  }

  function updateWalletUI(wallet) {
    const statusEl = document.getElementById('wallet-status');
    if (!statusEl) return;

    if (wallet.connected) {
      statusEl.textContent = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
      statusEl.classList.remove('disconnected');
      
      // Add balance display
      const balanceEl = document.createElement('div');
      balanceEl.style.fontSize = '11px';
      balanceEl.style.color = '#6ee7b7';
      balanceEl.textContent = `${parseFloat(wallet.balance).toFixed(4)} ETH`;
      
      const parent = statusEl.parentElement;
      if (parent && !parent.querySelector('.wallet-balance')) {
        balanceEl.className = 'wallet-balance';
        parent.appendChild(balanceEl);
      }
    } else {
      statusEl.textContent = 'Connect Wallet';
      statusEl.classList.add('disconnected');
      
      const balanceEl = document.querySelector('.wallet-balance');
      if (balanceEl) balanceEl.remove();
    }
  }

  function updateBalanceDisplay() {
    tradingEngine.getBalance().then(balance => {
      console.log('Current balances:', balance);
      
      // Update UI with balances
      const balanceContainer = document.getElementById('balance-display');
      if (balanceContainer) {
        balanceContainer.innerHTML = Object.entries(balance)
          .map(([token, amount]) => 
            `<div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.02);margin:4px 0;">
              <span style="font-weight:600;color:#d4af37;">${token}:</span>
              <span style="color:#6ee7b7;margin-left:8px;">${parseFloat(amount).toFixed(6)}</span>
            </div>`
          ).join('');
      }
    }).catch(err => {
      console.error('Balance fetch error:', err);
    });
  }

  function addModeToggle() {
    const tradePanel = document.getElementById('trade-panel');
    if (!tradePanel) return;

    const panelHead = tradePanel.querySelector('.panel-head');
    if (!panelHead || panelHead.querySelector('.mode-toggle-container')) return;

    const modeToggle = document.createElement('div');
    modeToggle.className = 'mode-toggle-container';
    modeToggle.style.cssText = 'display:flex;gap:8px;align-items:center;';
    modeToggle.innerHTML = `
      <button class="mode-switch-btn ${isDemoMode ? 'active' : ''}" data-mode="demo" 
        style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);
        background:${isDemoMode ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.02)'};
        color:${isDemoMode ? '#fff' : '#a0a0a0'};font-size:12px;font-weight:600;cursor:pointer;transition:all 0.3s;">
        🎮 Demo Mode
      </button>
      <button class="mode-switch-btn ${!isDemoMode ? 'active' : ''}" data-mode="live"
        style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);
        background:${!isDemoMode ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.02)'};
        color:${!isDemoMode ? '#fff' : '#a0a0a0'};font-size:12px;font-weight:600;cursor:pointer;transition:all 0.3s;">
        💰 Live Mode
      </button>
    `;

    panelHead.appendChild(modeToggle);

    // Add event listeners
    modeToggle.querySelectorAll('.mode-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        isDemoMode = mode === 'demo';
        tradingEngine.setDemoMode(isDemoMode);
        
        // Update button styles
        modeToggle.querySelectorAll('.mode-switch-btn').forEach(b => {
          const isActive = b.dataset.mode === mode;
          b.style.background = isActive 
            ? (mode === 'demo' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #10b981, #059669)')
            : 'rgba(255,255,255,0.02)';
          b.style.color = isActive ? '#fff' : '#a0a0a0';
        });

        showNotification(
          `Switched to ${mode === 'demo' ? 'Demo' : 'Live'} mode`,
          'success'
        );
      });
    });
  }

  function addNetworkSelector() {
    const tradePanel = document.getElementById('trade-panel');
    if (!tradePanel) return;

    const orderControls = tradePanel.querySelector('.order-controls');
    if (!orderControls || orderControls.querySelector('#network-selector')) return;

    const networkGroup = document.createElement('div');
    networkGroup.className = 'control-group';
    networkGroup.innerHTML = `
      <label class="control-label">Network</label>
      <select id="network-selector" class="input" style="cursor:pointer;">
        <option value="mainnet">Ethereum Mainnet</option>
        <option value="polygon">Polygon</option>
        <option value="bsc">BSC</option>
        <option value="goerli">Goerli Testnet</option>
      </select>
    `;

    orderControls.appendChild(networkGroup);

    document.getElementById('network-selector').addEventListener('change', async (e) => {
      const network = e.target.value;
      currentNetwork = network;
      
      if (tradingEngine.wallet.connected && !isDemoMode) {
        try {
          await tradingEngine.switchNetwork(network);
          showNotification(`Switched to ${network}`, 'success');
        } catch (err) {
          showNotification(`Failed to switch network: ${err.message}`, 'error');
        }
      } else {
        tradingEngine.config.network = network;
        showNotification(`Network set to ${network}`, 'info');
      }
    });
  }

  function addBalancePanel() {
    const tradePanel = document.getElementById('trade-panel');
    if (!tradePanel || tradePanel.querySelector('#balance-panel')) return;

    const balancePanel = document.createElement('div');
    balancePanel.id = 'balance-panel';
    balancePanel.style.cssText = 'margin-top:20px;padding:20px;background:linear-gradient(135deg, rgba(255,255,255,0.02), transparent);border-radius:12px;border:1px solid rgba(255,255,255,0.05);';
    balancePanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-weight:700;color:#d4af37;font-size:14px;">💰 Account Balance</span>
        <button id="refresh-balance" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);color:#a0a0a0;font-size:11px;cursor:pointer;">
          🔄 Refresh
        </button>
      </div>
      <div id="balance-display"></div>
    `;

    const cryptoInterface = document.getElementById('crypto-interface');
    if (cryptoInterface) {
      cryptoInterface.appendChild(balancePanel);
      
      document.getElementById('refresh-balance').addEventListener('click', updateBalanceDisplay);
      updateBalanceDisplay();
    }
  }

  // ==================== WALLET INTEGRATION ====================

  // Override the existing connectWallet function
  window.connectWeb3Wallet = async function(walletId) {
    try {
      if (walletId === 'metamask') {
        const wallet = await tradingEngine.connectMetaMask();
        updateWalletUI(wallet);
        showNotification(`Wallet connected: ${wallet.address.slice(0, 10)}...`, 'success');
        updateBalanceDisplay();
        return wallet;
      } else if (walletId === 'walletconnect') {
        showNotification('WalletConnect coming soon. Use MetaMask for now.', 'info');
      } else {
        showNotification(`${walletId} integration coming soon`, 'info');
      }
    } catch (error) {
      showNotification(`Connection failed: ${error.message}`, 'error');
      throw error;
    }
  };

  window.disconnectWeb3Wallet = function() {
    tradingEngine.disconnect();
    updateWalletUI({ connected: false });
    showNotification('Wallet disconnected', 'info');
  };

  // ==================== TRADE EXECUTION ====================

  window.executeWeb3Trade = async function(params) {
    try {
      // Show loading state
      const placeBtn = document.getElementById('place-order');
      if (placeBtn) {
        placeBtn.disabled = true;
        placeBtn.textContent = '⏳ Processing...';
      }

      // Validate inputs
      if (!params.amountIn || parseFloat(params.amountIn) <= 0) {
        throw new Error('Invalid amount');
      }

      // Execute trade
      const trade = await tradingEngine.executeTrade(params);

      // Show success
      showNotification(
        `${isDemoMode ? 'Demo' : 'Live'} trade executed: ${params.side.toUpperCase()} ${params.amountIn} ${params.tokenIn}`,
        'success'
      );

      // Update UI
      updateBalanceDisplay();
      addTradeToHistory(trade);

      return trade;

    } catch (error) {
      showNotification(`Trade failed: ${error.message}`, 'error');
      throw error;
    } finally {
      // Reset button
      const placeBtn = document.getElementById('place-order');
      if (placeBtn) {
        placeBtn.disabled = false;
        placeBtn.textContent = 'Execute Order';
      }
    }
  };

  function addTradeToHistory(trade) {
    // Add trade to history display
    const historyEl = document.getElementById('trade-history');
    if (!historyEl) return;

    const tradeEl = document.createElement('div');
    tradeEl.style.cssText = 'padding:12px;border-radius:8px;background:rgba(255,255,255,0.02);margin:8px 0;border-left:3px solid #10b981;';
    tradeEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:600;color:#d4af37;">${trade.side.toUpperCase()} ${trade.tokenIn}→${trade.tokenOut}</span>
        <span style="color:#6ee7b7;font-size:11px;">${new Date(trade.timestamp).toLocaleTimeString()}</span>
      </div>
      <div style="font-size:12px;color:#a0a0a0;">
        Amount: ${trade.amountIn} ${trade.tokenIn}
        ${trade.amountOut ? `→ ${trade.amountOut} ${trade.tokenOut}` : ''}
      </div>
      ${trade.txHash ? `<div style="font-size:10px;color:#60a5fa;margin-top:4px;">TX: ${trade.txHash.slice(0, 20)}...</div>` : ''}
    `;

    historyEl.insertBefore(tradeEl, historyEl.firstChild);
  }

  function addTradeHistoryPanel() {
    const tradePanel = document.getElementById('trade-panel');
    if (!tradePanel || tradePanel.querySelector('#trade-history-panel')) return;

    const historyPanel = document.createElement('div');
    historyPanel.id = 'trade-history-panel';
    historyPanel.style.cssText = 'margin-top:20px;padding:20px;background:linear-gradient(135deg, rgba(255,255,255,0.02), transparent);border-radius:12px;border:1px solid rgba(255,255,255,0.05);max-height:400px;overflow-y:auto;';
    historyPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-weight:700;color:#d4af37;font-size:14px;">📊 Trade History</span>
        <button id="export-history" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);color:#a0a0a0;font-size:11px;cursor:pointer;">
          📥 Export CSV
        </button>
      </div>
      <div id="trade-history"></div>
    `;

    const cryptoInterface = document.getElementById('crypto-interface');
    if (cryptoInterface) {
      cryptoInterface.appendChild(historyPanel);
      
      document.getElementById('export-history').addEventListener('click', () => {
        tradingEngine.exportTradeHistory();
        showNotification('Trade history exported', 'success');
      });
    }
  }

  // ==================== ORDER FORM ENHANCEMENT ====================

  function enhanceOrderForm() {
    const placeBtn = document.getElementById('place-order');
    if (!placeBtn || placeBtn._enhanced) return;
    placeBtn._enhanced = true;

    // Replace existing handler
    const newBtn = placeBtn.cloneNode(true);
    placeBtn.parentNode.replaceChild(newBtn, placeBtn);

    newBtn.addEventListener('click', async () => {
      try {
        // Get form values
        const side = document.querySelector('.side-btn.active')?.dataset.side || 'buy';
        const orderType = document.getElementById('order-type')?.value || 'market';
        const amountIn = document.getElementById('order-qty')?.value;
        const price = document.getElementById('order-price')?.value;
        
        // Validate
        if (!amountIn) {
          showNotification('Please enter amount', 'error');
          return;
        }

        // Check wallet connection for live mode
        if (!isDemoMode && !tradingEngine.wallet.connected) {
          showNotification('Please connect wallet for live trading', 'error');
          const statusEl = document.getElementById('wallet-status');
          if (statusEl) statusEl.click();
          return;
        }

        // Prepare trade params
        const params = {
          tokenIn: side === 'buy' ? 'USDT' : 'BTC',
          tokenOut: side === 'buy' ? 'BTC' : 'USDT',
          amountIn: parseFloat(amountIn),
          side,
          orderType,
          slippage: 0.5
        };

        // Execute trade
        await executeWeb3Trade(params);

      } catch (error) {
        console.error('Order placement error:', error);
      }
    });
  }

  // ==================== EVENT LISTENERS ====================

  tradingEngine.on('walletConnected', (wallet) => {
    console.log('✅ Wallet connected:', wallet.address);
    updateWalletUI(wallet);
  });

  tradingEngine.on('walletDisconnected', () => {
    console.log('🔌 Wallet disconnected');
    updateWalletUI({ connected: false });
  });

  tradingEngine.on('tradeCompleted', (trade) => {
    console.log('✅ Trade completed:', trade);
    addTradeToHistory(trade);
  });

  tradingEngine.on('tradeStarted', (params) => {
    console.log('⏳ Trade started:', params);
  });

  tradingEngine.on('error', (error) => {
    console.error('❌ Error:', error);
    showNotification(error.message, 'error');
  });

  tradingEngine.on('demoModeChanged', (isDemo) => {
    console.log(`${isDemo ? '🎮' : '💰'} Mode: ${isDemo ? 'Demo' : 'Live'}`);
  });

  // ==================== INITIALIZATION ====================

  function initWeb3Integration() {
    console.log('🚀 Initializing Web3 integration...');

    // Add UI enhancements
    setTimeout(() => {
      addModeToggle();
      addNetworkSelector();
      addBalancePanel();
      addTradeHistoryPanel();
      enhanceOrderForm();
      
      console.log('✅ Web3 integration ready');
      showNotification('Web3 Trading Engine loaded - Demo mode active', 'success');
    }, 1000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeb3Integration);
  } else {
    initWeb3Integration();
  }

  // Expose globally
  window.tradingEngine = tradingEngine;
  window.executeWeb3Trade = executeWeb3Trade;
  window.connectWeb3Wallet = connectWeb3Wallet;
  window.disconnectWeb3Wallet = disconnectWeb3Wallet;

  console.log('✅ Web3 Trading Integration loaded');
})();
