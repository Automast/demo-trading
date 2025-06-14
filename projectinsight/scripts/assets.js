/**
 * Assets Page Functionality
 * Handles all assets-related operations
 */

// Assets functionality
let assetsCurrentUser = window.currentUser; // Use the global currentUser from dashboard.js
let userWallets_assets = []; // Scoped to assets page
let coinPricesUSD_assets = {}; // Scoped
let exchangeRates_assets = {}; // Scoped
let userCurrency_assets = assetsCurrentUser?.accountCurrency || 'USD';
let notifications_assets = []; // Scoped

const allAssets_assets = [ // Renamed to avoid conflict if assets is used elsewhere
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

const coinGeckoMap_assets = { // Renamed
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
window.initializeAssetsPage = async function() {
  try {
    await fetchCoinPrices_assets();
    await fetchExchangeRates_assets();
    await fetchUserWallets_assets();
    updateTotalBalanceDisplay_assets();
    await fetchNotifications_assets();
    displayRecentNotifications_assets();
    await markNotificationsRead_assets();

    const searchBarEl = document.getElementById('searchBar');
    const filterSelectEl = document.getElementById('filterSelect');

    if(searchBarEl) searchBarEl.addEventListener('input', renderTable_assets);
    if(filterSelectEl) filterSelectEl.addEventListener('change', renderTable_assets);

    renderTable_assets();

  } catch (error) {
    console.error('Assets page initialization error:', error);
  }
};

async function fetchCoinPrices_assets() {
  try {
    const res = await fetch('/api/coin-prices', { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Failed to fetch coin prices: ' + res.status);
    }
    coinPricesUSD_assets = await res.json();
  } catch (err) {
    console.error('Error fetching coin prices:', err);
    coinPricesUSD_assets = {};
  }
}

async function fetchExchangeRates_assets() {
  const EXCHANGE_RATE_API_KEY = '22b4c51015d34a6cc3fd928b'; 
  const url = 'https://v6.exchangerate-api.com/v6/' + EXCHANGE_RATE_API_KEY + '/latest/USD';
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Exchange rate fetch failed: ' + res.status);
    }
    const data = await res.json();
    exchangeRates_assets = data.conversion_rates || {};
  } catch (err) {
    console.error('Error fetching exchange rates:', err);
    exchangeRates_assets = {};
  }
}

async function fetchUserWallets_assets() {
  try {
    const res = await fetch('/api/user/' + assetsCurrentUser.id + '/wallets', { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Failed to fetch user wallets: ' + res.status);
    }
    userWallets_assets = await res.json();
  } catch (err) {
    console.error('Error fetching wallets:', err);
    userWallets_assets = [];
  }
}

function calculateTotalBalance_assets() {
  let totalLocal = 0;

  for (let w of userWallets_assets) {
    const balNum = parseFloat(w.balance || '0');
    if (isNaN(balNum) || balNum <= 0) continue;

    if (w.shortName.toUpperCase() === userCurrency_assets.toUpperCase()) {
      totalLocal += balNum;
      continue;
    }

    const usdVal = balNum * getUsdPriceFromShortName_assets(w.shortName);
    const rate = exchangeRates_assets[userCurrency_assets.toUpperCase()] || 1;
    const localVal = usdVal * rate;
    totalLocal += localVal;
  }
  return totalLocal;
}

function updateTotalBalanceDisplay_assets() {
  const total = calculateTotalBalance_assets();
  const displayEl = document.getElementById('totalBalanceDisplay');
  if(displayEl) {
    displayEl.textContent = 
      'Total Balance: ' + formatNumber_assets(total) + ' ' + userCurrency_assets;
  }
}

async function fetchNotifications_assets() {
  try {
    const res = await fetch('/api/user/' + assetsCurrentUser.id + '/notifications', { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Could not fetch notifications: ' + res.status);
    }
    const allNotes = await res.json();
    notifications_assets = allNotes.slice(0, 5);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    notifications_assets = [];
  }
}

function displayRecentNotifications_assets() {
  const list = document.getElementById('notificationList');
  if(!list) return;
  list.innerHTML = '';

  if (notifications_assets.length === 0) {
    list.innerHTML = '<div class="text-center text-muted">No recent notifications.</div>';
    return;
  }

  notifications_assets.forEach(note => {
    const div = document.createElement('div');
    div.className = 'mb-2 p-3 bg-primary rounded'; // Use dashboard styles
    div.textContent = note.message;
    list.appendChild(div);
  });
}

async function markNotificationsRead_assets() {
  if (!notifications_assets.length) return;
  try {
    await fetch('/api/user/' + assetsCurrentUser.id + '/notifications-mark-all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isRead: 1 })
    });
  } catch (err) {
    console.error('Error marking notifications read:', err);
  }
}

function renderTable_assets() {
  const searchBarEl = document.getElementById('searchBar');
  const filterSelectEl = document.getElementById('filterSelect');
  const assetsTableBodyEl = document.getElementById('assetsTableBody');

  if(!searchBarEl || !filterSelectEl || !assetsTableBodyEl) return;

  const searchQuery = searchBarEl.value.toLowerCase();
  const filterType = filterSelectEl.value;
  const starredSymbols = getStarredAssets_assets();

  let filtered = allAssets_assets.filter(a => {
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
    starIcon.classList.add('star'); // This class needs to be defined in main.css or here
    if (starredSymbols.includes(asset.symbol)) {
      starIcon.classList.add('filled'); // This class needs to be defined
    }
    starIcon.onclick = () => toggleStar_assets(asset.symbol);
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
      const usdPrice = getUsdPriceFromShortName_assets(asset.symbol);
      const eurRate = exchangeRates_assets['EUR'] || 1;
      priceEur = usdPrice * eurRate;
    } else if (asset.type === 'Fiat') {
      priceEur = (asset.symbol === 'EUR') ? 1 : 0; // Simplified
    } else { // Stocks
      priceEur = 0; // Placeholder
    }
    const priceTd = document.createElement('td');
    priceTd.textContent = '€' + formatNumber_assets(priceEur) + '/' + asset.symbol;
    tr.appendChild(priceTd);

    let userBalance = '0.00';
    const foundWallet = userWallets_assets.find(w => w.shortName.toUpperCase() === asset.symbol.toUpperCase());
    if (foundWallet && foundWallet.balance) {
      userBalance = foundWallet.balance;
    }
    const walletTd = document.createElement('td');
    walletTd.textContent = userBalance + ' ' + asset.symbol;
    tr.appendChild(walletTd);

    const actionTd = document.createElement('td');
    const actionDiv = document.createElement('div');
    actionDiv.classList.add('d-flex'); // Bootstrap-like class, ensure defined in main.css
    actionDiv.style.gap = '0.5rem';
    actionDiv.style.flexWrap = 'wrap';

    const depositBtn = document.createElement('button');
    depositBtn.textContent = 'Deposit';
    depositBtn.classList.add('btn', 'btn-primary', 'btn-sm'); // Use dashboard button styles
    depositBtn.onclick = () => window.navigateToPage('deposit'); // Use SPA navigation
    actionDiv.appendChild(depositBtn);

    const withdrawBtn = document.createElement('button');
    withdrawBtn.textContent = 'Withdraw';
    withdrawBtn.classList.add('btn', 'btn-secondary', 'btn-sm'); // Use dashboard button styles
    withdrawBtn.onclick = () => window.navigateToPage('withdraw'); // Use SPA navigation
    actionDiv.appendChild(withdrawBtn);

    actionTd.appendChild(actionDiv);
    tr.appendChild(actionTd);

    assetsTableBodyEl.appendChild(tr);
  }
}

function getStarredAssets_assets() {
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

function setStarredAssets_assets(arr) {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = 'starred=' + arr.join(',') + '; path=/; expires=' + expires.toUTCString();
}

function toggleStar_assets(symbol) {
  let starred = getStarredAssets_assets();
  if (starred.includes(symbol)) {
    starred = starred.filter(s => s !== symbol);
  } else {
    starred.push(symbol);
    alert('Added to watchlist');
  }
  setStarredAssets_assets(starred);
  renderTable_assets();
}

function getUsdPriceFromShortName_assets(shortName) {
  const key = guessCoinGeckoKey_assets(shortName);
  if (!coinPricesUSD_assets[key] || !coinPricesUSD_assets[key].usd) {
    return 1; // Fallback for unknown as stable $1
  }
  return coinPricesUSD_assets[key].usd;
}

function guessCoinGeckoKey_assets(shortName) {
  const upper = shortName.toUpperCase();
  if (coinGeckoMap_assets[upper]) return coinGeckoMap_assets[upper];
  return 'usd-coin'; // Fallback as stable
}

function formatNumber_assets(num) {
  if (!num || isNaN(num)) return '0.00';
  return parseFloat(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}

// Star styling for assets page (if not globally available)
if (!document.getElementById('assets-star-style')) {
    const style = document.createElement('style');
    style.id = 'assets-star-style';
    style.textContent = '.star { cursor: pointer; font-size: 18px; color: var(--text-secondary); transition: all 0.2s; } .star.filled { color: #ffd700; } .star:hover { transform: scale(1.2); } .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.875rem; }';
    document.head.appendChild(style);
}