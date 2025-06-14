/**
 * Markets Page Functionality
 * Handles all markets-related operations
 */

// Markets functionality
let marketsCurrentUser = window.currentUser; // Use the global currentUser
let userWallets_markets = []; // Scoped
let coinPricesUSD_markets = {}; // Scoped
let exchangeRates_markets = {}; // Scoped
let userCurrency_markets = marketsCurrentUser?.accountCurrency || 'USD';

const allAssets_markets = [ // Renamed
  { symbol: 'AAPL',  name: 'Apple',                    type: 'Stocks' },
  { symbol: 'AAVE',  name: 'AAVE',                     type: 'Crypto' },
  { symbol: 'ABT',   name: 'Abbot Labs',               type: 'Stocks' },
  { symbol: 'ADA',   name: 'Cardano',                  type: 'Crypto' },
  { symbol: 'ADBE',  name: 'Adobe',                    type: 'Stocks' },
  { symbol: 'ALGO',  name: 'Algorand',                 type: 'Crypto' },
  { symbol: 'AMZN',  name: 'Amazon',                   type: 'Stocks' },
  { symbol: 'AUD',   name: 'Australian Dollar',        type: 'Fiat'   },
  { symbol: 'AVAX',  name: 'Avalanche',                type: 'Crypto' },
  { symbol: 'AXS',   name: 'Axie Infinity',            type: 'Crypto' },
  { symbol: 'BABA',  name: 'Alibaba',                  type: 'Stocks' },
  { symbol: 'BAC',   name: 'Bank of America',          type: 'Stocks' },
  { symbol: 'BCH',   name: 'Bitcoin Cash',             type: 'Crypto' },
  { symbol: 'BTC',   name: 'Bitcoin',                  type: 'Crypto' },
  { symbol: 'CAD',   name: 'Canadian Dollar',          type: 'Fiat'   },
  { symbol: 'CHF',   name: 'Swiss Franc',              type: 'Fiat'   },
  { symbol: 'CRO',   name: 'Cronos',                   type: 'Crypto' },
  { symbol: 'DAI',   name: 'Dai',                      type: 'Crypto' },
  { symbol: 'DOGE',  name: 'Dogecoin',                 type: 'Crypto' },
  { symbol: 'DOT',   name: 'Polkadot',                 type: 'Crypto' },
  { symbol: 'ETH',   name: 'Ethereum',                 type: 'Crypto' },
  { symbol: 'EUR',   name: 'Euro',                     type: 'Fiat'   },
  { symbol: 'FB',    name: 'Meta Platforms Inc',       type: 'Stocks' },
  { symbol: 'GBP',   name: 'British Pound',            type: 'Fiat'   },
  { symbol: 'GOOGL', name: 'Google',                   type: 'Stocks' },
  { symbol: 'LTC',   name: 'Litecoin',                 type: 'Crypto' },
  { symbol: 'MATIC', name: 'Polygon',                  type: 'Crypto' },
  { symbol: 'MSFT',  name: 'Microsoft',                type: 'Stocks' },
  { symbol: 'PEPE',  name: 'Pepe',                     type: 'Crypto' },
  { symbol: 'SOL',   name: 'Solana',                   type: 'Crypto' },
  { symbol: 'TSLA',  name: 'Tesla',                    type: 'Stocks' },
  { symbol: 'UNI',   name: 'Uniswap',                  type: 'Crypto' },
  { symbol: 'USD',   name: 'United States Dollar',     type: 'Fiat'   },
  { symbol: 'USDC',  name: 'USD Coin',                 type: 'Crypto' },
  { symbol: 'USDT',  name: 'Tether',                   type: 'Crypto' },
  { symbol: 'XRP',   name: 'Ripple',                   type: 'Crypto' }
];

const coinGeckoMap_markets = { // Renamed
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDC: 'usd-coin',
  USDT: 'tether',
  BNB: 'binancecoin',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  SOL: 'solana',
  AVAX: 'avalanche-2',
  SHIB: 'shiba-inu',
  LTC: 'litecoin',
  TRX: 'tron',
  MATIC: 'matic-network',
  PEPE: 'pepe',
  XRP: 'ripple',
  CRO: 'crypto-com-chain',
  DAI: 'dai',
  UNI: 'uniswap',
  AAVE: 'aave',
  ALGO: 'algorand',
  BCH: 'bitcoin-cash',
  AXS: 'axie-infinity'
};

// Initialize only when called from dashboard
window.initializeMarketsPage = async function() {
  try {
    await fetchCoinPrices_markets();
    await fetchExchangeRates_markets();
    await fetchUserWallets_markets();

    const searchBarEl = document.getElementById('searchBar');
    const filterSelectEl = document.getElementById('filterSelect');

    if(searchBarEl) searchBarEl.addEventListener('input', renderTable_markets);
    if(filterSelectEl) filterSelectEl.addEventListener('change', renderTable_markets);

    renderTable_markets();

  } catch (error) {
    console.error('Markets page initialization error:', error);
  }
};

async function fetchCoinPrices_markets() {
  try {
    const res = await fetch('/api/coin-prices', { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Failed to fetch coin prices: ' + res.status);
    }
    coinPricesUSD_markets = await res.json();
  } catch (err) {
    console.error('Error fetching coin prices:', err);
    coinPricesUSD_markets = {};
  }
}

async function fetchExchangeRates_markets() {
  const EXCHANGE_RATE_API_KEY = '22b4c51015d34a6cc3fd928b'; 
  const url = 'https://v6.exchangerate-api.com/v6/' + EXCHANGE_RATE_API_KEY + '/latest/USD';
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Exchange rate fetch failed: ' + res.status);
    }
    const data = await res.json();
    exchangeRates_markets = data.conversion_rates || {};
  } catch (err) {
    console.error('Error fetching exchange rates:', err);
    exchangeRates_markets = {};
  }
}

async function fetchUserWallets_markets() {
  try {
    const res = await fetch('/api/user/' + marketsCurrentUser.id + '/wallets', { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Failed to fetch user wallets: ' + res.status);
    }
    userWallets_markets = await res.json();
  } catch (err) {
    console.error('Error fetching wallets:', err);
    userWallets_markets = [];
  }
}

function renderTable_markets() {
  const searchBarEl = document.getElementById('searchBar');
  const filterSelectEl = document.getElementById('filterSelect');
  const assetsTableBodyEl = document.getElementById('assetsTableBody');

  if(!searchBarEl || !filterSelectEl || !assetsTableBodyEl) return;

  const searchQuery = searchBarEl.value.toLowerCase();
  const filterType = filterSelectEl.value;
  const starredSymbols = getStarredAssets_markets();

  let filtered = allAssets_markets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery) ||
                          a.symbol.toLowerCase().includes(searchQuery);
    const matchesFilter = (filterType === 'All') || (a.type === filterType);
    return matchesSearch && matchesFilter;
  });

  filtered.sort((a, b) => {
    const aStar = starredSymbols.includes(a.symbol);
    const bStar = starredSymbols.includes(b.symbol);
    if (aStar && !bStar) return -1;
    if (!aStar && bStar) return 1;
    return a.name.localeCompare(b.name);
  });

  assetsTableBodyEl.innerHTML = '';

  for (let asset of filtered) {
    const tr = document.createElement('tr');

    const starTd = document.createElement('td');
    const starIcon = document.createElement('span');
    starIcon.textContent = '★';
    starIcon.classList.add('star'); // Defined in main.css or here
    if (starredSymbols.includes(asset.symbol)) {
      starIcon.classList.add('filled'); // Defined in main.css or here
    }
    starIcon.onclick = () => toggleStar_markets(asset.symbol);
    starTd.appendChild(starIcon);
    tr.appendChild(starTd);

    const nameTd = document.createElement('td');
    nameTd.textContent = asset.name;
    tr.appendChild(nameTd);

    const typeTd = document.createElement('td');
    typeTd.textContent = asset.type;
    tr.appendChild(typeTd);

    let priceEur = 0;
    if (asset.type === 'Crypto') {
      const usdPrice = getUsdPriceFromShortName_markets(asset.symbol);
      const eurRate = exchangeRates_markets['EUR'] || 1;
      priceEur = usdPrice * eurRate;
    } else if (asset.type === 'Fiat') {
      priceEur = (asset.symbol === 'EUR') ? 1 : 0;
    } else {
      priceEur = 0;
    }
    const priceTd = document.createElement('td');
    priceTd.textContent = '€' + formatNumber_markets(priceEur) + '/' + asset.symbol;
    tr.appendChild(priceTd);

    let userBalance = '0.00';
    const foundWallet = userWallets_markets.find(w => w.shortName.toUpperCase() === asset.symbol.toUpperCase());
    if (foundWallet && foundWallet.balance) {
      userBalance = foundWallet.balance;
    }
    const walletTd = document.createElement('td');
    walletTd.textContent = userBalance + ' ' + asset.symbol;
    tr.appendChild(walletTd);

    const actionTd = document.createElement('td');
    const tradeBtn = document.createElement('button');
    tradeBtn.textContent = 'Trade';
    tradeBtn.classList.add('btn', 'btn-success'); // Use dashboard button styles
    tradeBtn.onclick = () => window.navigateToPage('trade'); // Use SPA navigation
    actionTd.appendChild(tradeBtn);
    tr.appendChild(actionTd);

    assetsTableBodyEl.appendChild(tr);
  }
}

function getStarredAssets_markets() {
  const name = 'starred=';
  const decoded = decodeURIComponent(document.cookie);
  const parts = decoded.split(';');
  for (let p of parts) {
    const c = p.trim();
    if (c.startsWith(name)) {
      return c.substring(name.length).split(',');
    }
  }
  return [];
}

function setStarredAssets_markets(arr) {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = 'starred=' + arr.join(',') + '; path=/; expires=' + expires.toUTCString();
}

function toggleStar_markets(symbol) {
  let starred = getStarredAssets_markets();
  if (starred.includes(symbol)) {
    starred = starred.filter(s => s !== symbol);
  } else {
    starred.push(symbol);
    alert('Added to watchlist');
  }
  setStarredAssets_markets(starred);
  renderTable_markets();
}

function getUsdPriceFromShortName_markets(shortName) {
  const key = guessCoinGeckoKey_markets(shortName);
  if (!coinPricesUSD_markets[key] || !coinPricesUSD_markets[key].usd) {
    return 1;
  }
  return coinPricesUSD_markets[key].usd;
}

function guessCoinGeckoKey_markets(shortName) {
  const upper = shortName.toUpperCase();
  if (coinGeckoMap_markets[upper]) return coinGeckoMap_markets[upper];
  return 'usd-coin';
}

function formatNumber_markets(num) {
  if (!num || isNaN(num)) return '0.00';
  return parseFloat(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}

// Star styling for markets page (if not globally available)
if (!document.getElementById('markets-star-style')) {
    const style = document.createElement('style');
    style.id = 'markets-star-style';
    style.textContent = '.star { cursor: pointer; font-size: 18px; color: var(--text-secondary); transition: all 0.2s; } .star.filled { color: #ffd700; } .star:hover { transform: scale(1.2); }';
    document.head.appendChild(style);
}