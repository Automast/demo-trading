// Trading Widget JavaScript - Enhanced with Form Validation and Balance Checking
class TradingWidget {
    constructor() {
        this.currentUser = null;
        this.userWallets = [];
        this.prices = {};
        this.selectedLeverage = { buy: 500, sell: 500 };
        this.currentApiIndex = { crypto: 0, stocks: 0, forex: 0 };
        
        // API configurations with multiple fallbacks
        this.apiConfig = {
            crypto: [
                {
                    name: 'CoinGecko',
                    baseUrl: 'https://api.coingecko.com/api/v3',
                    key: null, // Free tier doesn't need key
                    rateLimit: 50, // per minute
                    method: 'coingecko'
                },
                {
                    name: 'CoinMarketCap',
                    baseUrl: 'https://pro-api.coinmarketcap.com/v2',
                    key: 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c', // Demo key
                    rateLimit: 333, // per day for free
                    method: 'coinmarketcap'
                },
                {
                    name: 'Binance',
                    baseUrl: 'https://api.binance.com/api/v3',
                    key: null, // Public endpoints
                    rateLimit: 1200, // per minute
                    method: 'binance'
                },
                {
                    name: 'CoinAPI',
                    baseUrl: 'https://rest.coinapi.io/v1',
                    key: '73034021-THIS-IS-SAMPLE-KEY',
                    rateLimit: 100, // per day for free
                    method: 'coinapi'
                },
                {
                    name: 'Kraken',
                    baseUrl: 'https://api.kraken.com/0/public',
                    key: null,
                    rateLimit: 60, // per minute
                    method: 'kraken'
                }
            ],
            stocks: [
                {
                    name: 'Alpha Vantage',
                    baseUrl: 'https://www.alphavantage.co/query',
                    key: 'demo', // Free tier
                    rateLimit: 25, // per day for free
                    method: 'alphavantage'
                },
                {
                    name: 'Financial Modeling Prep',
                    baseUrl: 'https://financialmodelingprep.com/api/v3',
                    key: 'demo', // Free tier
                    rateLimit: 250, // per day
                    method: 'fmp'
                },
                {
                    name: 'Finnhub',
                    baseUrl: 'https://finnhub.io/api/v1',
                    key: 'demo', // Free tier
                    rateLimit: 60, // per minute
                    method: 'finnhub'
                },
                {
                    name: 'Polygon',
                    baseUrl: 'https://api.polygon.io/v2',
                    key: 'demo', // Free tier
                    rateLimit: 5, // per minute for free
                    method: 'polygon'
                },
                {
                    name: 'Twelve Data',
                    baseUrl: 'https://api.twelvedata.com',
                    key: 'demo', // Free tier
                    rateLimit: 800, // per day
                    method: 'twelvedata'
                }
            ],
            forex: [
                {
                    name: 'Fixer',
                    baseUrl: 'https://api.fixer.io/v1',
                    key: 'demo', // Free tier
                    rateLimit: 100, // per month
                    method: 'fixer'
                },
                {
                    name: 'CurrencyLayer',
                    baseUrl: 'https://api.currencylayer.com/v1',
                    key: 'demo', // Free tier
                    rateLimit: 100, // per month
                    method: 'currencylayer'
                },
                {
                    name: 'ExchangeRate-API',
                    baseUrl: 'https://api.exchangerate-api.com/v4',
                    key: null, // No key needed for basic
                    rateLimit: 1500, // per month
                    method: 'exchangerateapi'
                },
                {
                    name: 'ExchangeRates API',
                    baseUrl: 'https://api.exchangeratesapi.io/v1',
                    key: 'demo', // Free tier
                    rateLimit: 250, // per month
                    method: 'exchangeratesapi'
                },
                {
                    name: 'Free Forex API',
                    baseUrl: 'https://api.freeforexapi.com/v1',
                    key: null,
                    rateLimit: 1000, // per day
                    method: 'freeforexapi'
                }
            ]
        };

        // Asset definitions
        this.assets = {
            crypto: [
                { symbol: 'BTC', name: 'Bitcoin', icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
                { symbol: 'ETH', name: 'Ethereum', icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
                { symbol: 'BNB', name: 'Binance Coin', icon: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
                { symbol: 'XRP', name: 'Ripple', icon: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
                { symbol: 'ADA', name: 'Cardano', icon: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
                { symbol: 'SOL', name: 'Solana', icon: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
                { symbol: 'DOGE', name: 'Dogecoin', icon: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
                { symbol: 'DOT', name: 'Polkadot', icon: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' },
                { symbol: 'MATIC', name: 'Polygon', icon: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png' },
                { symbol: 'SHIB', name: 'Shiba Inu', icon: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png' },
                { symbol: 'LTC', name: 'Litecoin', icon: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png' },
                { symbol: 'AVAX', name: 'Avalanche', icon: 'https://assets.coingecko.com/coins/images/12559/large/avalanche.png' },
                { symbol: 'UNI', name: 'Uniswap', icon: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png' },
                { symbol: 'LINK', name: 'Chainlink', icon: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png' },
                { symbol: 'ATOM', name: 'Cosmos', icon: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png' },
                { symbol: 'ETC', name: 'Ethereum Classic', icon: 'https://assets.coingecko.com/coins/images/453/large/ethereum-classic-logo.png' },
                { symbol: 'NEAR', name: 'NEAR Protocol', icon: 'https://assets.coingecko.com/coins/images/10365/large/near_icon.png' },
                { symbol: 'VET', name: 'VeChain', icon: 'https://assets.coingecko.com/coins/images/1167/large/VET_Token_Icon.png' },
                { symbol: 'ICP', name: 'Internet Computer', icon: 'https://assets.coingecko.com/coins/images/14495/large/Internet_Computer_logo.png' },
                { symbol: 'FTM', name: 'Fantom', icon: 'https://assets.coingecko.com/coins/images/4001/large/Fantom.png' },
                { symbol: 'ALGO', name: 'Algorand', icon: 'https://assets.coingecko.com/coins/images/4380/large/download.png' },
                { symbol: 'MANA', name: 'Decentraland', icon: 'https://assets.coingecko.com/coins/images/878/large/decentraland-mana.png' },
                { symbol: 'SAND', name: 'The Sandbox', icon: 'https://assets.coingecko.com/coins/images/12129/large/sandbox_logo.jpg' },
                { symbol: 'CRO', name: 'Cronos', icon: 'https://assets.coingecko.com/coins/images/7310/large/cypto.png' },
                { symbol: 'APE', name: 'ApeCoin', icon: 'https://assets.coingecko.com/coins/images/24383/large/apecoin.jpg' },
                { symbol: 'USDT', name: 'Tether', icon: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png' },
                { symbol: 'USDC', name: 'USD Coin', icon: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png' },
                { symbol: 'BUSD', name: 'Binance USD', icon: 'https://assets.coingecko.com/coins/images/9576/large/BUSD.png' },
                { symbol: 'DAI', name: 'Dai', icon: 'https://assets.coingecko.com/coins/images/9956/large/4943.png' },
                { symbol: 'PEPE', name: 'Pepe', icon: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg' }
            ],
            stocks: [
                { symbol: 'AAPL', name: 'Apple Inc.', icon: 'https://logo.clearbit.com/apple.com' },
                { symbol: 'MSFT', name: 'Microsoft Corporation', icon: 'https://logo.clearbit.com/microsoft.com' },
                { symbol: 'GOOGL', name: 'Alphabet Inc.', icon: 'https://logo.clearbit.com/google.com' },
                { symbol: 'AMZN', name: 'Amazon.com Inc.', icon: 'https://logo.clearbit.com/amazon.com' },
                { symbol: 'TSLA', name: 'Tesla Inc.', icon: 'https://logo.clearbit.com/tesla.com' },
                { symbol: 'META', name: 'Meta Platforms Inc.', icon: 'https://logo.clearbit.com/meta.com' },
                { symbol: 'NVDA', name: 'NVIDIA Corporation', icon: 'https://logo.clearbit.com/nvidia.com' },
                { symbol: 'JPM', name: 'JPMorgan Chase & Co.', icon: 'https://logo.clearbit.com/jpmorganchase.com' },
                { symbol: 'JNJ', name: 'Johnson & Johnson', icon: 'https://logo.clearbit.com/jnj.com' },
                { symbol: 'V', name: 'Visa Inc.', icon: 'https://logo.clearbit.com/visa.com' },
                { symbol: 'PG', name: 'Procter & Gamble Co.', icon: 'https://logo.clearbit.com/pg.com' },
                { symbol: 'UNH', name: 'UnitedHealth Group Inc.', icon: 'https://logo.clearbit.com/unitedhealthgroup.com' },
                { symbol: 'HD', name: 'Home Depot Inc.', icon: 'https://logo.clearbit.com/homedepot.com' },
                { symbol: 'MA', name: 'Mastercard Inc.', icon: 'https://logo.clearbit.com/mastercard.com' },
                { symbol: 'BAC', name: 'Bank of America Corp.', icon: 'https://logo.clearbit.com/bankofamerica.com' },
                { symbol: 'DIS', name: 'Walt Disney Co.', icon: 'https://logo.clearbit.com/disney.com' },
                { symbol: 'ADBE', name: 'Adobe Inc.', icon: 'https://logo.clearbit.com/adobe.com' },
                { symbol: 'NFLX', name: 'Netflix Inc.', icon: 'https://logo.clearbit.com/netflix.com' },
                { symbol: 'CRM', name: 'Salesforce Inc.', icon: 'https://logo.clearbit.com/salesforce.com' },
                { symbol: 'XOM', name: 'Exxon Mobil Corp.', icon: 'https://logo.clearbit.com/exxonmobil.com' },
                { symbol: 'WMT', name: 'Walmart Inc.', icon: 'https://logo.clearbit.com/walmart.com' },
                { symbol: 'KO', name: 'Coca-Cola Co.', icon: 'https://logo.clearbit.com/coca-cola.com' },
                { symbol: 'PFE', name: 'Pfizer Inc.', icon: 'https://logo.clearbit.com/pfizer.com' },
                { symbol: 'INTC', name: 'Intel Corporation', icon: 'https://logo.clearbit.com/intel.com' },
                { symbol: 'VZ', name: 'Verizon Communications Inc.', icon: 'https://logo.clearbit.com/verizon.com' },
                { symbol: 'CSCO', name: 'Cisco Systems Inc.', icon: 'https://logo.clearbit.com/cisco.com' },
                { symbol: 'ORCL', name: 'Oracle Corporation', icon: 'https://logo.clearbit.com/oracle.com' },
                { symbol: 'IBM', name: 'International Business Machines Corp.', icon: 'https://logo.clearbit.com/ibm.com' },
                { symbol: 'UBER', name: 'Uber Technologies Inc.', icon: 'https://logo.clearbit.com/uber.com' },
                { symbol: 'PYPL', name: 'PayPal Holdings Inc.', icon: 'https://logo.clearbit.com/paypal.com' }
            ],
            forex: [
                { symbol: 'EURUSD', name: 'Euro / US Dollar', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'GBPUSD', name: 'British Pound / US Dollar', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'EURGBP', name: 'Euro / British Pound', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'EURJPY', name: 'Euro / Japanese Yen', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'EURCHF', name: 'Euro / Swiss Franc', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'EURAUD', name: 'Euro / Australian Dollar', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'EURCAD', name: 'Euro / Canadian Dollar', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'GBPCHF', name: 'British Pound / Swiss Franc', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'GBPAUD', name: 'British Pound / Australian Dollar', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'GBPCAD', name: 'British Pound / Canadian Dollar', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'CHFJPY', name: 'Swiss Franc / Japanese Yen', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' },
                { symbol: 'CADJPY', name: 'Canadian Dollar / Japanese Yen', icon: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&h=32&fit=crop&crop=center' }
            ]
        };

        this.init();
    }

    async init() {
        await this.loadUserData();
        this.setupEventListeners();
        this.populateAssets('buy', 'crypto');
        this.populateAssets('sell', 'crypto');
        await this.updatePrices();
        
        // Initial form validation
        this.validateForms();
        
        // Update prices every 30 seconds
        setInterval(() => this.updatePrices(), 30000);
    }

    async loadUserData() {
        try {
            // Try to get user data from parent window if in iframe
            if (window.parent && window.parent !== window) {
                const message = { type: 'getUserData' };
                window.parent.postMessage(message, '*');
                
                // Listen for response
                window.addEventListener('message', (event) => {
                    if (event.data.type === 'userData') {
                        this.currentUser = event.data.user;
                        this.userWallets = event.data.wallets;
                        this.updateBalanceDisplays();
                        this.validateForms();
                    }
                });
            } else {
                // Fallback: try to get from localStorage or API
                const userData = localStorage.getItem('currentUser');
                if (userData) {
                    this.currentUser = JSON.parse(userData);
                    await this.fetchUserWallets();
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            // Set default user currency and demo wallets for testing
            this.currentUser = { accountCurrency: 'USD' };
            this.userWallets = [
                { shortName: 'USD', type: 'fiat', balance: '10000.00' },
                { shortName: 'BTC', type: 'crypto', balance: '0.15' },
                { shortName: 'ETH', type: 'crypto', balance: '2.5' },
                { shortName: 'USDT', type: 'crypto', balance: '1500.00' }
            ];
        }
    }

    async fetchUserWallets() {
        if (!this.currentUser || !this.currentUser.id) return;
        
        try {
            const response = await fetch(`/api/user/${this.currentUser.id}/wallets`, {
                credentials: 'include'
            });
            if (response.ok) {
                this.userWallets = await response.json();
                this.updateBalanceDisplays();
                this.validateForms();
            }
        } catch (error) {
            console.error('Error fetching wallets:', error);
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Type changes
        document.getElementById('buy-type').addEventListener('change', (e) => {
            this.populateAssets('buy', e.target.value);
            this.toggleLeverage('buy', e.target.value);
            this.validateForms();
        });

        document.getElementById('sell-type').addEventListener('change', (e) => {
            this.populateAssets('sell', e.target.value);
            this.toggleLeverage('sell', e.target.value);
            this.validateForms();
        });

        // Asset changes
        document.getElementById('buy-asset').addEventListener('change', (e) => {
            this.updateAssetIcon('buy', e.target.value);
            this.updateAssetInfo('buy', e.target.value);
            this.validateForms();
        });

        document.getElementById('sell-asset').addEventListener('change', (e) => {
            this.updateAssetIcon('sell', e.target.value);
            this.updateAssetInfo('sell', e.target.value);
            // Update balance display when sell asset changes
            this.updateBalanceDisplays();
            this.validateForms();
        });

        // Amount input changes
        document.getElementById('buy-amount').addEventListener('input', () => {
            this.validateForms();
        });

        document.getElementById('sell-amount').addEventListener('input', () => {
            this.validateForms();
        });

        // Duration changes
        document.getElementById('buy-duration').addEventListener('change', () => {
            this.validateForms();
        });

        document.getElementById('sell-duration').addEventListener('change', () => {
            this.validateForms();
        });

        // Leverage buttons
        document.querySelectorAll('.leverage-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const leverage = e.target.dataset.leverage;
                const container = e.target.closest('.tab-content');
                const tab = container.id.includes('buy') ? 'buy' : 'sell';
                
                // Update active state
                container.querySelectorAll('.leverage-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.selectedLeverage[tab] = parseInt(leverage);
                this.validateForms();
            });
        });

        // Trade execution
        document.getElementById('execute-buy').addEventListener('click', () => {
            this.executeTrade('buy');
        });

        document.getElementById('execute-sell').addEventListener('click', () => {
            this.executeTrade('sell');
        });
    }

    validateForms() {
        this.validateForm('buy');
        this.validateForm('sell');
    }

    validateForm(tab) {
        const button = document.getElementById(`execute-${tab}`);
        const typeSelect = document.getElementById(`${tab}-type`);
        const assetSelect = document.getElementById(`${tab}-asset`);
        const amountInput = document.getElementById(`${tab}-amount`);
        const durationSelect = document.getElementById(`${tab}-duration`);

        // Check if all required fields are filled
        const isFormComplete = typeSelect.value && 
                              assetSelect.value && 
                              amountInput.value && 
                              parseFloat(amountInput.value) > 0 &&
                              durationSelect.value;

        if (!isFormComplete) {
            button.disabled = true;
            button.style.opacity = '0.6';
            return;
        }

        // Check balance
        const balanceCheck = this.checkBalance(tab);
        
        if (!balanceCheck.sufficient) {
            button.disabled = true;
            button.style.opacity = '0.6';
            
            // Update button text to show insufficient balance
            const btnText = button.querySelector('.btn-text');
            btnText.textContent = 'Insufficient Balance';
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            
            // Reset button text
            const btnText = button.querySelector('.btn-text');
            btnText.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
        }
    }

    checkBalance(tab) {
        const assetSelect = document.getElementById(`${tab}-asset`);
        const amountInput = document.getElementById(`${tab}-amount`);
        const selectedAsset = assetSelect.value;
        const requestedAmount = parseFloat(amountInput.value) || 0;

        if (!selectedAsset || requestedAmount <= 0) {
            return { sufficient: false, balance: 0, required: requestedAmount };
        }

        let availableBalance = 0;
        let currency = '';

        if (tab === 'buy') {
            // For buying, check fiat balance (USD)
            currency = this.currentUser?.accountCurrency || 'USD';
            const fiatWallet = this.userWallets.find(w => 
                w.shortName === currency && w.type === 'fiat'
            );
            availableBalance = fiatWallet ? parseFloat(fiatWallet.balance) : 0;
            
            // For buying, need to calculate cost (amount * price)
            const assetPrice = this.prices[selectedAsset] || 0;
            const totalCost = requestedAmount * assetPrice;
            
            return {
                sufficient: availableBalance >= totalCost,
                balance: availableBalance,
                required: totalCost,
                currency: currency
            };
        } else {
            // For selling, check asset balance
            currency = selectedAsset;
            const assetWallet = this.userWallets.find(w => 
                w.shortName === selectedAsset
            );
            availableBalance = assetWallet ? parseFloat(assetWallet.balance) : 0;
            
            return {
                sufficient: availableBalance >= requestedAmount,
                balance: availableBalance,
                required: requestedAmount,
                currency: currency
            };
        }
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}-tab`).classList.add('active');
        
        // Validate the newly active tab
        this.validateForms();
    }

    populateAssets(tab, type) {
        const select = document.getElementById(`${tab}-asset`);
        select.innerHTML = '<option value="">Select Asset</option>';

        const assets = this.assets[type] || [];
        assets.forEach(asset => {
            const option = document.createElement('option');
            option.value = asset.symbol;
            option.textContent = `${asset.name} (${asset.symbol})`;
            option.dataset.icon = asset.icon;
            select.appendChild(option);
        });

        // Clear current asset info
        this.updateAssetIcon(tab, '');
        this.updateAssetInfo(tab, '');
        this.validateForms();
    }

    updateAssetIcon(tab, symbol) {
        const iconEl = document.getElementById(`${tab}-asset-icon`);
        const typeSelect = document.getElementById(`${tab}-type`);
        const type = typeSelect.value;

        if (!symbol) {
            iconEl.src = '';
            iconEl.style.display = 'none';
            return;
        }

        const asset = this.assets[type]?.find(a => a.symbol === symbol);
        if (asset) {
            iconEl.src = asset.icon;
            iconEl.style.display = 'block';
            iconEl.onerror = () => {
                iconEl.src = 'https://via.placeholder.com/24/333/fff?text=' + symbol.charAt(0);
            };
        }
    }

    async updateAssetInfo(tab, symbol) {
        const assetNameEl = document.getElementById(`${tab}-asset-name`);
        const assetPriceEl = document.getElementById(`${tab}-asset-price`);

        if (!symbol) {
            assetNameEl.textContent = 'BTC';
            assetPriceEl.textContent = '$0.00';
            return;
        }

        assetNameEl.textContent = symbol;
        
        // Update price
        const price = await this.getAssetPrice(symbol);
        assetPriceEl.textContent = this.formatPrice(price);

        // Update balance info
        this.updateBalanceDisplays();
        this.validateForms();
    }

    updateBalanceDisplays() {
        // Buy tab - show fiat balance
        const buyBalanceCurrencyEl = document.getElementById('buy-balance-currency');
        const buyBalanceEl = document.getElementById('buy-balance');
        
        const currency = this.currentUser?.accountCurrency || 'USD';
        buyBalanceCurrencyEl.textContent = currency;
        
        const fiatWallet = this.userWallets.find(w => 
            w.shortName === currency && w.type === 'fiat'
        );
        const buyBalance = fiatWallet ? parseFloat(fiatWallet.balance) : 0;
        buyBalanceEl.textContent = `${buyBalance.toFixed(2)} ${currency}`;

        // Sell tab - Show USD balance AND selected asset balance
        const sellBalanceCurrencyEl = document.getElementById('sell-balance-currency');
        const sellBalanceEl = document.getElementById('sell-balance');
        
        const assetSelect = document.getElementById('sell-asset');
        const selectedAsset = assetSelect.value;
        
        if (selectedAsset) {
            // Show selected asset balance
            sellBalanceCurrencyEl.textContent = selectedAsset;
            
            const assetWallet = this.userWallets.find(w => 
                w.shortName === selectedAsset && w.type === 'crypto'
            );
            const assetBalance = assetWallet ? parseFloat(assetWallet.balance) : 0;
            sellBalanceEl.textContent = `${assetBalance.toFixed(6)} ${selectedAsset}`;
        } else {
            // Show USD balance as fallback
            sellBalanceCurrencyEl.textContent = currency;
            const sellBalance = fiatWallet ? parseFloat(fiatWallet.balance) : 0;
            sellBalanceEl.textContent = `${sellBalance.toFixed(2)} ${currency}`;
        }

        // Re-validate forms after balance update
        this.validateForms();
    }

    toggleLeverage(tab, type) {
        const leverageGroup = document.getElementById(`${tab}-leverage-group`);
        if (type === 'stocks') {
            leverageGroup.classList.add('hide-leverage');
        } else {
            leverageGroup.classList.remove('hide-leverage');
        }
    }

    // Enhanced price fetching with multiple API fallbacks
    async getAssetPrice(symbol) {
        const typeSelect = document.querySelector('#buy-type, #sell-type');
        let assetType = 'crypto';
        
        if (this.assets.stocks.find(a => a.symbol === symbol)) {
            assetType = 'stocks';
        } else if (this.assets.forex.find(a => a.symbol === symbol)) {
            assetType = 'forex';
        }

        return await this.fetchPriceWithFallback(symbol, assetType);
    }

    async fetchPriceWithFallback(symbol, assetType) {
        const apis = this.apiConfig[assetType];
        let lastError = null;

        for (let i = 0; i < apis.length; i++) {
            const apiIndex = (this.currentApiIndex[assetType] + i) % apis.length;
            const api = apis[apiIndex];

            try {
                console.log(`Trying ${api.name} API for ${symbol}...`);
                const price = await this.fetchFromAPI(symbol, api, assetType);
                
                if (price && price > 0) {
                    // Success - update current API index for next request
                    this.currentApiIndex[assetType] = apiIndex;
                    console.log(`✓ Success with ${api.name}: $${price}`);
                    return price;
                }
            } catch (error) {
                console.warn(`✗ ${api.name} API failed:`, error.message);
                lastError = error;
                continue;
            }
        }

        console.error(`All ${assetType} APIs failed for ${symbol}:`, lastError);
        return this.getMockPrice(symbol, assetType);
    }

    async fetchFromAPI(symbol, api, assetType) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
            let url = '';
            let headers = {
                'Accept': 'application/json',
            };

            switch (api.method) {
                case 'coingecko':
                    const coinId = this.getCoinGeckoId(symbol);
                    url = `${api.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd`;
                    break;

                case 'coinmarketcap':
                    url = `${api.baseUrl}/cryptocurrency/quotes/latest?symbol=${symbol}&convert=USD`;
                    if (api.key) headers['X-CMC_PRO_API_KEY'] = api.key;
                    break;

                case 'binance':
                    url = `${api.baseUrl}/ticker/price?symbol=${symbol}USDT`;
                    break;

                case 'coinapi':
                    url = `${api.baseUrl}/exchangerate/${symbol}/USD`;
                    if (api.key) headers['X-CoinAPI-Key'] = api.key;
                    break;

                case 'kraken':
                    url = `${api.baseUrl}/Ticker?pair=${symbol}USD`;
                    break;

                case 'alphavantage':
                    url = `${api.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${api.key}`;
                    break;

                case 'fmp':
                    url = `${api.baseUrl}/quote/${symbol}?apikey=${api.key}`;
                    break;

                case 'finnhub':
                    url = `${api.baseUrl}/quote?symbol=${symbol}&token=${api.key}`;
                    break;

                case 'polygon':
                    url = `${api.baseUrl}/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${api.key}`;
                    break;

                case 'twelvedata':
                    url = `${api.baseUrl}/price?symbol=${symbol}&apikey=${api.key}`;
                    break;

                case 'fixer':
                    url = `${api.baseUrl}/latest?access_key=${api.key}&base=USD&symbols=${symbol.slice(0,3)}`;
                    break;

                case 'currencylayer':
                    url = `${api.baseUrl}/live?access_key=${api.key}&currencies=${symbol.slice(3)}`;
                    break;

                case 'exchangerateapi':
                    url = `${api.baseUrl}/latest/USD`;
                    break;

                case 'exchangeratesapi':
                    url = `${api.baseUrl}/latest?access_key=${api.key}&base=USD`;
                    break;

                case 'freeforexapi':
                    url = `${api.baseUrl}/latest?base=USD&symbols=${symbol.slice(0,3)}`;
                    break;

                default:
                    throw new Error(`Unknown API method: ${api.method}`);
            }

            const response = await fetch(url, {
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return this.extractPriceFromResponse(data, symbol, api.method);

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    extractPriceFromResponse(data, symbol, method) {
        try {
            switch (method) {
                case 'coingecko':
                    const coinId = this.getCoinGeckoId(symbol);
                    return data[coinId]?.usd;

                case 'coinmarketcap':
                    return data.data?.[symbol]?.[0]?.quote?.USD?.price;

                case 'binance':
                    return parseFloat(data.price);

                case 'coinapi':
                    return data.rate;

                case 'kraken':
                    const pairKey = Object.keys(data.result)[0];
                    return parseFloat(data.result[pairKey]?.c?.[0]);

                case 'alphavantage':
                    return parseFloat(data['Global Quote']?.['05. price']);

                case 'fmp':
                    return data[0]?.price;

                case 'finnhub':
                    return data.c; // current price

                case 'polygon':
                    return data.results?.[0]?.c; // close price

                case 'twelvedata':
                    return parseFloat(data.price);

                case 'fixer':
                case 'currencylayer':
                case 'exchangerateapi':
                case 'exchangeratesapi':
                case 'freeforexapi':
                    // Forex pairs need special handling
                    const pair = symbol.toUpperCase();
                    const baseCurrency = pair.slice(0, 3);
                    const quoteCurrency = pair.slice(3, 6);
                    
                    if (data.rates) {
                        return data.rates[quoteCurrency] / (data.rates[baseCurrency] || 1);
                    }
                    return null;

                default:
                    return null;
            }
        } catch (error) {
            console.error(`Error extracting price from ${method} response:`, error);
            return null;
        }
    }

    getMockPrice(symbol, assetType) {
        // Fallback mock prices for demo purposes
        const mockPrices = {
            crypto: {
                'BTC': 65000, 'ETH': 3500, 'BNB': 420, 'XRP': 0.55,
                'ADA': 0.35, 'SOL': 145, 'DOGE': 0.08, 'DOT': 6.2,
                'MATIC': 0.85, 'SHIB': 0.000009, 'LTC': 85, 'AVAX': 28,
                'UNI': 8.5, 'LINK': 14, 'ATOM': 9, 'USDT': 1.00, 'USDC': 1.00
            },
            stocks: {
                'AAPL': 185, 'MSFT': 380, 'GOOGL': 145, 'AMZN': 155,
                'TSLA': 220, 'META': 320, 'NVDA': 480, 'JPM': 165
            },
            forex: {
                'EURUSD': 1.08, 'GBPUSD': 1.25, 'USDJPY': 150,
                'USDCHF': 0.88, 'AUDUSD': 0.65, 'USDCAD': 1.35
            }
        };

        return mockPrices[assetType]?.[symbol] || Math.random() * 100 + 50;
    }

    getCoinGeckoId(symbol) {
        const mapping = {
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin',
            'XRP': 'ripple', 'ADA': 'cardano', 'SOL': 'solana',
            'DOGE': 'dogecoin', 'DOT': 'polkadot', 'MATIC': 'polygon',
            'SHIB': 'shiba-inu', 'LTC': 'litecoin', 'AVAX': 'avalanche-2',
            'UNI': 'uniswap', 'LINK': 'chainlink', 'ATOM': 'cosmos',
            'PEPE': 'pepe', 'USDT': 'tether', 'USDC': 'usd-coin',
            'ETC': 'ethereum-classic', 'NEAR': 'near', 'VET': 'vechain',
            'ICP': 'internet-computer', 'FTM': 'fantom', 'ALGO': 'algorand',
            'MANA': 'decentraland', 'SAND': 'the-sandbox', 'CRO': 'cronos',
            'APE': 'apecoin', 'BUSD': 'binance-usd', 'DAI': 'dai'
        };
        return mapping[symbol] || symbol.toLowerCase();
    }

    async updatePrices() {
        // Update prices for visible assets
        const updatePromises = ['buy', 'sell'].map(async (tab) => {
            const assetSelect = document.getElementById(`${tab}-asset`);
            const selectedAsset = assetSelect.value;
            
            if (selectedAsset) {
                try {
                    const price = await this.getAssetPrice(selectedAsset);
                    this.prices[selectedAsset] = price;
                    
                    const assetPriceEl = document.getElementById(`${tab}-asset-price`);
                    assetPriceEl.textContent = this.formatPrice(price);
                    
                    // Re-validate forms after price update
                    this.validateForms();
                } catch (error) {
                    console.error(`Failed to update price for ${selectedAsset}:`, error);
                }
            }
        });

        await Promise.allSettled(updatePromises);
    }

    formatPrice(price) {
        if (!price || price <= 0) return '$0.00';
        
        if (price >= 1) {
            return `$${price.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 6 
            })}`;
        } else {
            return `$${price.toFixed(8)}`;
        }
    }

    async executeTrade(type) {
        const button = document.getElementById(`execute-${type}`);
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.loading-spinner');
        const errorMessage = document.getElementById('error-message');
        const errorText = errorMessage.querySelector('span');

        // Check balance one more time before execution
        const balanceCheck = this.checkBalance(type);
        
        if (!balanceCheck.sufficient) {
            // Show insufficient balance error immediately
            errorText.textContent = `Insufficient balance. Available: ${balanceCheck.balance.toFixed(6)} ${balanceCheck.currency}, Required: ${balanceCheck.required.toFixed(6)} ${balanceCheck.currency}`;
            errorMessage.style.display = 'flex';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
            return;
        }

        // Show loading
        button.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'block';
        errorMessage.style.display = 'none';

        // Simulate API call
        setTimeout(() => {
            button.disabled = false;
            btnText.style.display = 'block';
            spinner.style.display = 'none';
            
            // Check if this asset has actual balance (for demo purposes)
            const hasBalance = ['BTC', 'ETH', 'USDT', 'USD'].includes(balanceCheck.currency);
            
            if (hasBalance) {
                // Show normal error for assets with balance
                errorText.textContent = 'Trade execution failed. Please try again later.';
            } else {
                // Show insufficient balance for zero balance assets
                errorText.textContent = `Insufficient balance. Available: ${balanceCheck.balance.toFixed(6)} ${balanceCheck.currency}, Required: ${balanceCheck.required.toFixed(6)} ${balanceCheck.currency}`;
            }
            
            errorMessage.style.display = 'flex';

            // Hide error after 5 seconds
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
            
            // Re-validate forms
            this.validateForms();
        }, 2000); // 2 second loading
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TradingWidget();
});