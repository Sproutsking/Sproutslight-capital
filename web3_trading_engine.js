/**
 * Elite Trading Hub - Web3 Trading Engine
 * Standalone script for wallet connection and trade execution
 * Supports both demo and live trading modes
 */

class Web3TradingEngine {
  constructor(config = {}) {
    this.config = {
      demoMode: config.demoMode ?? true,
      network: config.network || 'mainnet', // mainnet, goerli, polygon, bsc
      slippageTolerance: config.slippageTolerance || 0.5, // 0.5%
      gasMultiplier: config.gasMultiplier || 1.2,
      ...config
    };

    this.wallet = {
      connected: false,
      address: null,
      provider: null,
      signer: null,
      balance: '0',
      chainId: null
    };

    this.demoBalance = {
      ETH: 10,
      USDT: 50000,
      USDC: 50000,
      BTC: 0.5
    };

    this.networks = {
      mainnet: {
        chainId: '0x1',
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
        blockExplorer: 'https://etherscan.io'
      },
      goerli: {
        chainId: '0x5',
        name: 'Goerli Testnet',
        rpcUrl: 'https://eth-goerli.g.alchemy.com/v2/demo',
        blockExplorer: 'https://goerli.etherscan.io'
      },
      polygon: {
        chainId: '0x89',
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        blockExplorer: 'https://polygonscan.com'
      },
      bsc: {
        chainId: '0x38',
        name: 'BSC Mainnet',
        rpcUrl: 'https://bsc-dataseed.binance.org',
        blockExplorer: 'https://bscscan.com'
      }
    };

    // Uniswap V2 Router addresses
    this.routers = {
      mainnet: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      goerli: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      polygon: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
      bsc: '0x10ED43C718714eb63d5aA57B78B54704E256024E' // PancakeSwap
    };

    // Common token addresses
    this.tokens = {
      mainnet: {
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
      },
      polygon: {
        WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
      },
      bsc: {
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
      }
    };

    this.pendingTxs = [];
    this.tradeHistory = [];
    this.eventListeners = {};
  }

  // Event system
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  // Wallet Connection
  async connectMetaMask() {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const balance = await provider.getBalance(address);

      this.wallet = {
        connected: true,
        address: address,
        provider: provider,
        signer: signer,
        balance: ethers.formatEther(balance),
        chainId: network.chainId.toString()
      };

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.connectMetaMask();
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      this.emit('walletConnected', this.wallet);
      console.log('✅ Wallet connected:', address);
      
      return this.wallet;
    } catch (error) {
      console.error('MetaMask connection error:', error);
      this.emit('error', { type: 'connection', message: error.message });
      throw error;
    }
  }

  async connectWalletConnect() {
    try {
      // WalletConnect v2 implementation
      // Note: Requires @walletconnect/ethereum-provider package
      throw new Error('WalletConnect integration requires additional setup. Use MetaMask for now.');
    } catch (error) {
      console.error('WalletConnect error:', error);
      throw error;
    }
  }

  disconnect() {
    this.wallet = {
      connected: false,
      address: null,
      provider: null,
      signer: null,
      balance: '0',
      chainId: null
    };
    this.emit('walletDisconnected');
    console.log('🔌 Wallet disconnected');
  }

  // Network switching
  async switchNetwork(networkName) {
    if (!this.wallet.connected) {
      throw new Error('Wallet not connected');
    }

    const network = this.networks[networkName];
    if (!network) {
      throw new Error(`Network ${networkName} not supported`);
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }]
      });
      console.log(`✅ Switched to ${network.name}`);
    } catch (error) {
      // Chain doesn't exist, add it
      if (error.code === 4902) {
        await this.addNetwork(networkName);
      } else {
        throw error;
      }
    }
  }

  async addNetwork(networkName) {
    const network = this.networks[networkName];
    if (!network) {
      throw new Error(`Network ${networkName} not supported`);
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: network.chainId,
          chainName: network.name,
          rpcUrls: [network.rpcUrl],
          blockExplorerUrls: [network.blockExplorer]
        }]
      });
      console.log(`✅ Added ${network.name}`);
    } catch (error) {
      console.error('Add network error:', error);
      throw error;
    }
  }

  // Balance checking
  async getBalance(tokenAddress = null) {
    if (this.config.demoMode) {
      return this.demoBalance;
    }

    if (!this.wallet.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      if (!tokenAddress) {
        // Get native token balance (ETH, BNB, MATIC)
        const balance = await this.wallet.provider.getBalance(this.wallet.address);
        return ethers.formatEther(balance);
      } else {
        // Get ERC20 token balance
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          this.wallet.provider
        );
        const balance = await tokenContract.balanceOf(this.wallet.address);
        return ethers.formatUnits(balance, 18);
      }
    } catch (error) {
      console.error('Balance check error:', error);
      throw error;
    }
  }

  // Get token price from DEX
  async getTokenPrice(tokenIn, tokenOut, amountIn) {
    if (this.config.demoMode) {
      // Return mock prices
      const mockPrices = {
        'ETH-USDT': 2500,
        'BTC-USDT': 45000,
        'USDT-ETH': 0.0004
      };
      return mockPrices[`${tokenIn}-${tokenOut}`] || 1;
    }

    try {
      const routerAddress = this.routers[this.config.network];
      const routerABI = [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
      ];

      const router = new ethers.Contract(
        routerAddress,
        routerABI,
        this.wallet.provider
      );

      const tokens = this.tokens[this.config.network];
      const path = [tokens[tokenIn], tokens[tokenOut]];
      const amountInWei = ethers.parseEther(amountIn.toString());

      const amounts = await router.getAmountsOut(amountInWei, path);
      const priceOut = ethers.formatEther(amounts[1]);

      return parseFloat(priceOut);
    } catch (error) {
      console.error('Price fetch error:', error);
      throw error;
    }
  }

  // Execute trade (DEX swap)
  async executeTrade(params) {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      side = 'buy', // buy or sell
      orderType = 'market', // market or limit
      slippage = this.config.slippageTolerance,
      takeProfit = null,
      stopLoss = null
    } = params;

    // Demo mode
    if (this.config.demoMode) {
      return this.executeDemoTrade(params);
    }

    // Real mode
    if (!this.wallet.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      this.emit('tradeStarted', params);

      const routerAddress = this.routers[this.config.network];
      const routerABI = [
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
      ];

      const router = new ethers.Contract(
        routerAddress,
        routerABI,
        this.wallet.signer
      );

      const tokens = this.tokens[this.config.network];
      const path = [tokens[tokenIn], tokens[tokenOut]];
      const amountInWei = ethers.parseEther(amountIn.toString());
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      // Calculate minimum output with slippage
      const expectedOut = await this.getTokenPrice(tokenIn, tokenOut, amountIn);
      const minAmountOut = ethers.parseEther(
        (expectedOut * (1 - slippage / 100)).toString()
      );

      let tx;

      // Check if trading native token (ETH, BNB, MATIC)
      if (tokenIn === 'WETH' || tokenIn === 'WMATIC' || tokenIn === 'WBNB') {
        tx = await router.swapExactETHForTokens(
          minAmountOut,
          path,
          this.wallet.address,
          deadline,
          { value: amountInWei }
        );
      } else if (tokenOut === 'WETH' || tokenOut === 'WMATIC' || tokenOut === 'WBNB') {
        // First approve token
        await this.approveToken(tokens[tokenIn], routerAddress, amountInWei);
        
        tx = await router.swapExactTokensForETH(
          amountInWei,
          minAmountOut,
          path,
          this.wallet.address,
          deadline
        );
      } else {
        // ERC20 to ERC20
        await this.approveToken(tokens[tokenIn], routerAddress, amountInWei);
        
        tx = await router.swapExactTokensForTokens(
          amountInWei,
          minAmountOut,
          path,
          this.wallet.address,
          deadline
        );
      }

      console.log('📝 Transaction sent:', tx.hash);
      this.emit('transactionSent', { hash: tx.hash, params });

      // Wait for confirmation
      const receipt = await tx.wait();

      const trade = {
        id: tx.hash,
        timestamp: Date.now(),
        tokenIn,
        tokenOut,
        amountIn,
        side,
        orderType,
        status: receipt.status === 1 ? 'success' : 'failed',
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        network: this.config.network
      };

      this.tradeHistory.push(trade);
      this.emit('tradeCompleted', trade);

      console.log('✅ Trade executed successfully:', tx.hash);
      return trade;

    } catch (error) {
      console.error('Trade execution error:', error);
      this.emit('error', { type: 'trade', message: error.message });
      throw error;
    }
  }

  // Demo trade execution
  async executeDemoTrade(params) {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      side,
      orderType,
      slippage = this.config.slippageTolerance
    } = params;

    return new Promise((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        const price = this.getTokenPrice(tokenIn, tokenOut, 1);
        const amountOut = amountIn * price * (1 - slippage / 100);

        // Update demo balances
        if (side === 'buy') {
          this.demoBalance[tokenIn] -= amountIn;
          this.demoBalance[tokenOut] = (this.demoBalance[tokenOut] || 0) + amountOut;
        } else {
          this.demoBalance[tokenOut] -= amountIn;
          this.demoBalance[tokenIn] = (this.demoBalance[tokenIn] || 0) + amountOut;
        }

        const trade = {
          id: 'demo_' + Date.now(),
          timestamp: Date.now(),
          tokenIn,
          tokenOut,
          amountIn,
          amountOut: amountOut.toFixed(6),
          side,
          orderType,
          status: 'success',
          demo: true,
          balance: { ...this.demoBalance }
        };

        this.tradeHistory.push(trade);
        this.emit('tradeCompleted', trade);

        console.log('✅ Demo trade executed:', trade);
        resolve(trade);
      }, 1500);
    });
  }

  // Token approval
  async approveToken(tokenAddress, spenderAddress, amount) {
    const tokenABI = [
      'function approve(address spender, uint256 amount) public returns (bool)'
    ];

    const token = new ethers.Contract(
      tokenAddress,
      tokenABI,
      this.wallet.signer
    );

    console.log('⏳ Approving token...');
    const tx = await token.approve(spenderAddress, amount);
    await tx.wait();
    console.log('✅ Token approved');
  }

  // Get trade history
  getTradeHistory(limit = 50) {
    return this.tradeHistory.slice(-limit);
  }

  // Toggle demo mode
  setDemoMode(enabled) {
    this.config.demoMode = enabled;
    this.emit('demoModeChanged', enabled);
    console.log(`${enabled ? '🎮' : '💰'} ${enabled ? 'Demo' : 'Live'} mode activated`);
  }

  // Get current mode
  isDemoMode() {
    return this.config.demoMode;
  }

  // Estimate gas
  async estimateGas(params) {
    if (this.config.demoMode) {
      return { gasLimit: '200000', gasPrice: '50', total: '0.01' };
    }

    try {
      const gasPrice = await this.wallet.provider.getFeeData();
      return {
        gasLimit: '200000',
        gasPrice: ethers.formatUnits(gasPrice.gasPrice, 'gwei'),
        total: ethers.formatEther(gasPrice.gasPrice * BigInt(200000))
      };
    } catch (error) {
      console.error('Gas estimation error:', error);
      return null;
    }
  }

  // Export trade history as CSV
  exportTradeHistory() {
    const csv = [
      ['ID', 'Date', 'Token In', 'Token Out', 'Amount In', 'Amount Out', 'Side', 'Type', 'Status'].join(','),
      ...this.tradeHistory.map(trade => [
        trade.id,
        new Date(trade.timestamp).toLocaleString(),
        trade.tokenIn,
        trade.tokenOut,
        trade.amountIn,
        trade.amountOut || 'N/A',
        trade.side,
        trade.orderType,
        trade.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.Web3TradingEngine = Web3TradingEngine;
  console.log('🚀 Web3 Trading Engine loaded');
}

// Usage example
/*
const engine = new Web3TradingEngine({
  demoMode: true, // Start in demo mode
  network: 'mainnet',
  slippageTolerance: 0.5
});

// Event listeners
engine.on('walletConnected', (wallet) => {
  console.log('Wallet connected:', wallet.address);
});

engine.on('tradeCompleted', (trade) => {
  console.log('Trade completed:', trade);
});

// Connect wallet
await engine.connectMetaMask();

// Execute trade
const trade = await engine.executeTrade({
  tokenIn: 'USDT',
  tokenOut: 'ETH',
  amountIn: 1000,
  side: 'buy',
  orderType: 'market',
  slippage: 0.5
});

// Switch to live mode
engine.setDemoMode(false);

// Get balance
const balance = await engine.getBalance();
console.log('Balance:', balance);
*/
