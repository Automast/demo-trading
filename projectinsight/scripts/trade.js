/**
 * Trade Page Functionality
 * Handles all trading-related operations
 */

// Trade functionality
let tradeCurrentUser = window.currentUser;
let userWallets_trade = []; // Scoped
let coinPricesUSD_trade = {}; // Scoped
let exchangeRates_trade = {}; // Scoped
let userCurrency_trade = tradeCurrentUser?.accountCurrency || 'USD';
let openTrades_trade = []; // Scoped
// let closedTrades_trade = []; // Scoped, if needed

const allCrypto_trade = [
  { symbol: 'BTC', name: 'Bitcoin' }, { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'LTC', name: 'Litecoin' }, { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'ADA', name: 'Cardano' }, { symbol: 'SOL', name: 'Solana' },
  { symbol: 'MATIC', name: 'Polygon' }, { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'DOT', name: 'Polkadot' }, { symbol: 'BCH', name: 'Bitcoin Cash' },
  { symbol: 'AVAX', name: 'Avalanche' }, { symbol: 'ALGO', name: 'Algorand' },
  { symbol: 'AAVE', name: 'AAVE' }, { symbol: 'AXS', name: 'Axie Infinity' },
  { symbol: 'PEPE', name: 'Pepe' }, { symbol: 'UNI', name: 'Uniswap' },
  { symbol: 'LINK', name: 'Chainlink' }, { symbol: 'ATOM', name: 'Cosmos' },
  { symbol: 'XLM', name: 'Stellar' }, { symbol: 'VET', name: 'VeChain' }
];

const allStocks_trade = [
  { symbol: 'AAPL',  name: 'Apple' }, { symbol: 'TSLA',  name: 'Tesla' },
  { symbol: 'AMZN',  name: 'Amazon' }, { symbol: 'MSFT',  name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Google' }, { symbol: 'FB',    name: 'Meta' },
  { symbol: 'BABA',  name: 'Alibaba' }, { symbol: 'BAC',   name: 'Bank of America' },
  { symbol: 'ADBE',  name: 'Adobe' }
];

const fiatCurrencies_trade = ['USD','EUR','GBP','JPY','AUD','CAD','CHF'];

const cryptoLogos_trade = {
  BTC: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  LTC: "https://assets.coingecko.com/coins/images/2/large/litecoin.png",
  XRP: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  ADA: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
  MATIC: "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
  DOT: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
  BCH: "https://assets.coingecko.com/coins/images/780/large/bitcoin-cash.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/large/avalanche.png",
  ALGO: "https://assets.coingecko.com/coins/images/4380/large/download.png",
  AAVE: "https://assets.coingecko.com/coins/images/12645/large/AAVE.png",
  AXS: "https://assets.coingecko.com/coins/images/13029/large/axie-infinity.png",
  PEPE: "https://assets.coingecko.com/coins/images/26139/large/pepe-logo.png",
  UNI: "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
  LINK: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
  ATOM: "https://assets.coingecko.com/coins/images/1481/large/atom.png",
  XLM: "https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png",
  VET: "https://assets.coingecko.com/coins/images/41/large/vechain.png"
};

const stockLogos_trade = {
  AAPL: "https://logo.clearbit.com/apple.com", TSLA: "https://logo.clearbit.com/tesla.com",
  AMZN: "https://logo.clearbit.com/amazon.com", MSFT: "https://logo.clearbit.com/microsoft.com",
  GOOGL: "https://logo.clearbit.com/google.com", FB: "https://logo.clearbit.com/meta.com",
  BABA: "https://logo.clearbit.com/alibaba.com", BAC: "https://logo.clearbit.com/bankofamerica.com",
  ADBE: "https://logo.clearbit.com/adobe.com"
};

const fiatIcons_trade = {
  USD: "attach_money", EUR: "euro_symbol", GBP: "currency_pound", JPY: "yen",
  AUD: "attach_money", CAD: "attach_money", CHF: "attach_money"
};

const coinGeckoMap_trade = {
  BTC: 'bitcoin', ETH: 'ethereum', LTC: 'litecoin', XRP: 'ripple',
  ADA: 'cardano', SOL: 'solana', MATIC: 'matic-network', DOGE: 'dogecoin',
  DOT: 'polkadot', BCH: 'bitcoin-cash', AVAX: 'avalanche-2', ALGO: 'algorand',
  AAVE: 'aave', AXS: 'axie-infinity', PEPE: 'pepe', UNI: 'uniswap',
  LINK: 'chainlink', ATOM: 'cosmos', XLM: 'stellar', VET: 'vechain'
};

function getIconUrl_trade(symbol, market) {
  if (market === 'Crypto') {
    if (cryptoLogos_trade[symbol]) return cryptoLogos_trade[symbol];
    return 'https://cryptoicon-api.vercel.app/api/icon/' + symbol.toLowerCase();
  } else if (market === 'Stocks') {
    if (stockLogos_trade[symbol]) return stockLogos_trade[symbol];
    return "MATERIAL:trending_up"; // Use material icon instead of placeholder
  } else if (market === 'Forex' || market === 'Fiat') {
    return "MATERIAL:" + (fiatIcons_trade[symbol] || "attach_money");
  }
  return "MATERIAL:help_outline"; // Use material icon instead of placeholder
}

function updateSelectedIcon_trade(elementId, symbol, market) {
  var iconEl = document.getElementById(elementId);
  if (!iconEl) return;
  var container = iconEl.parentNode;
  var iconUrl = getIconUrl_trade(symbol, market);

  if (iconUrl.indexOf("MATERIAL:") === 0) {
    var iconName = iconUrl.replace("MATERIAL:", "");
    var span = document.createElement("span");
    span.id = elementId;
    span.className = "material-icons asset-icon";
    span.style.fontSize = "24px";
    span.style.verticalAlign = "middle";
    span.textContent = iconName;
    if (iconEl.tagName.toLowerCase() === "img" || iconEl.tagName.toLowerCase() === "span") {
        container.replaceChild(span, iconEl);
    } else { // Should not happen if IDs are correct
        container.appendChild(span);
    }
  } else {
    var img;
    if (iconEl.tagName.toLowerCase() !== "img") {
      img = document.createElement("img");
      img.id = elementId;
      img.className = "asset-icon";
      container.replaceChild(img, iconEl);
    } else {
      img = iconEl;
    }
    img.src = iconUrl;
    img.alt = symbol + " icon";
    img.style.width = "24px";
    img.style.height = "24px";
    img.style.verticalAlign = "middle";
  }
}

function updateAssetPrice_trade(elementId, symbol, market) {
  var el = document.getElementById(elementId);
  if(!el) return;
  if(market === "Crypto") {
    let price = getCryptoPriceInUser_trade(symbol);
    el.textContent = "Price: " + formatNumber_trade(price) + " " + userCurrency_trade;
  } else if(market === "Stocks") {
    let price = getStockPriceInUser_trade(symbol);
    el.textContent = "Price: " + formatNumber_trade(price) + " " + userCurrency_trade;
  } else {
    el.textContent = "";
  }
}

// Initialize only when called from dashboard
window.initializeTradePage = async function() {
  try {
    await fetchCoinPrices_trade();
    await fetchExchangeRates_trade();
    await fetchUserWallets_trade();

    initTabs_trade();
    initBuyForm_trade();
    initSellForm_trade();
    initConvertForm_trade();
  } catch (err) {
    console.error('Trade initialization error:', err);
  }
};

async function fetchCoinPrices_trade() {
  try {
    const res = await fetch('/api/coin-prices', { credentials: 'include' });
    if (!res.ok) throw new Error('coin-prices failed: ' + res.status);
    coinPricesUSD_trade = await res.json();
  } catch (err) {
    console.error('Coin prices fetch error:', err);
    coinPricesUSD_trade = {};
  }
}

async function fetchExchangeRates_trade() {
  const key = '22b4c51015d34a6cc3fd928b';
  const url = 'https://v6.exchangerate-api.com/v6/' + key + '/latest/USD';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('exchangeRates fetch error: ' + res.status);
    const data = await res.json();
    exchangeRates_trade = data.conversion_rates || {};
  } catch (err) {
    console.error('Exchange rate fetch error:', err);
    exchangeRates_trade = {};
  }
}

async function fetchUserWallets_trade() {
  try {
    const res = await fetch('/api/user/' + tradeCurrentUser.id + '/wallets', { credentials: 'include' });
    if (!res.ok) throw new Error('wallets fetch error: ' + res.status);
    userWallets_trade = await res.json();
  } catch (err) {
    console.error('Wallet fetch error:', err);
    userWallets_trade = [];
  }
}

function initTabs_trade() {
  const tabBuy = document.getElementById('tabBuy');
  const tabSell = document.getElementById('tabSell');
  const tabConvert = document.getElementById('tabConvert');

  const buyTabContent = document.getElementById('buyTabContent');
  const sellTabContent = document.getElementById('sellTabContent');
  const convertTabContent = document.getElementById('convertTabContent');

  if(!tabBuy || !tabSell || !tabConvert || !buyTabContent || !sellTabContent || !convertTabContent) return;

  tabBuy.addEventListener('click', () => {
    tabBuy.classList.add('active');
    tabSell.classList.remove('active');
    tabConvert.classList.remove('active');
    buyTabContent.classList.add('active');
    sellTabContent.classList.remove('active');
    convertTabContent.classList.remove('active');
  });
  tabSell.addEventListener('click', () => {
    tabSell.classList.add('active');
    tabBuy.classList.remove('active');
    tabConvert.classList.remove('active');
    sellTabContent.classList.add('active');
    buyTabContent.classList.remove('active');
    convertTabContent.classList.remove('active');
  });
  tabConvert.addEventListener('click', () => {
    tabConvert.classList.add('active');
    tabBuy.classList.remove('active');
    tabSell.classList.remove('active');
    convertTabContent.classList.add('active');
    buyTabContent.classList.remove('active');
    sellTabContent.classList.remove('active');
  });
}

function initBuyForm_trade() {
  const buyForm = document.getElementById('buyForm');
  const buyMarket = document.getElementById('buyMarket');
  const buySymbol = document.getElementById('buySymbol');
  const buyForexSection = document.getElementById('buyForexSection');
  const buySingleSymbolSection = document.getElementById('buySingleSymbolSection');
  const buyForexBase = document.getElementById('buyForexBase');
  const buyForexQuote = document.getElementById('buyForexQuote');
  const buyBalanceInfo = document.getElementById('buyBalanceInfo');
  const buyAmount = document.getElementById('buyAmount');
  const buyCostDisplay = document.getElementById('buyCostDisplay');
  const buyCurrencyLabel = document.getElementById('buyCurrencyLabel');
  const buyLeverageSlider = document.getElementById('buyLeverageSlider');
  const buyLeverageValue = document.getElementById('buyLeverageValue');
  const buyOrderType = document.getElementById('buyOrderType');
  const buyLimitPriceSection = document.getElementById('buyLimitPriceSection');
  const buyError = document.getElementById('buyError');
  const buySuccess = document.getElementById('buySuccess');
  const buyButton = document.getElementById('buyButton');

  if(!buyForm) return; // Exit if crucial elements are not found

  buyCurrencyLabel.textContent = userCurrency_trade;

  fillFiatSelect_trade(buyForexBase, "Fiat");
  fillFiatSelect_trade(buyForexQuote, "Fiat");
  if(buyForexBase.options.length > 1) buyForexBase.value = 'EUR'; else if (buyForexBase.options.length > 0) buyForexBase.value = buyForexBase.options[0].value;
  if(buyForexQuote.options.length > 0) buyForexQuote.value = 'USD'; else if (buyForexQuote.options.length > 0) buyForexQuote.value = buyForexQuote.options[0].value;
  
  updateSelectedIcon_trade("buyForexBaseIcon", buyForexBase.value, "Fiat");
  updateSelectedIcon_trade("buyForexQuoteIcon", buyForexQuote.value, "Fiat");
  
  fillAssetSelect_trade(buySymbol, 'Crypto');
  if(buySymbol.options.length > 0) {
     updateSelectedIcon_trade("buySymbolIcon", buySymbol.value, buyMarket.value);
     updateAssetPrice_trade("buyAssetPrice", buySymbol.value, buyMarket.value);
  }


  buyMarket.addEventListener('change', () => {
    if (buyMarket.value === 'Forex') {
      buyForexSection.style.display = 'block';
      buySingleSymbolSection.style.display = 'none';
    } else {
      buyForexSection.style.display = 'none';
      buySingleSymbolSection.style.display = 'block';
      fillAssetSelect_trade(buySymbol, buyMarket.value);
      if(buySymbol.options.length > 0) {
        updateSelectedIcon_trade("buySymbolIcon", buySymbol.value, buyMarket.value);
        updateAssetPrice_trade("buyAssetPrice", buySymbol.value, buyMarket.value);
      }
    }
    showBuyBalance_trade();
    calcBuyCost_trade();
    validateBuyForm_trade();
  });
  
  [buySymbol, buyForexBase, buyForexQuote, buyAmount].forEach(el => {
    el.addEventListener('change', () => {
      if (el === buySymbol) {
        updateSelectedIcon_trade("buySymbolIcon", buySymbol.value, buyMarket.value);
        updateAssetPrice_trade("buyAssetPrice", buySymbol.value, buyMarket.value);
      }
      if (el === buyForexBase) updateSelectedIcon_trade("buyForexBaseIcon", buyForexBase.value, "Fiat");
      if (el === buyForexQuote) updateSelectedIcon_trade("buyForexQuoteIcon", buyForexQuote.value, "Fiat");
      showBuyBalance_trade();
      calcBuyCost_trade();
      validateBuyForm_trade();
    });
    el.addEventListener('input', () => { // For amount input mainly
      showBuyBalance_trade();
      calcBuyCost_trade();
      validateBuyForm_trade();
    });
  });

  buyLeverageSlider.addEventListener('input', () => {
    buyLeverageValue.textContent = buyLeverageSlider.value + 'x';
  });

  buyOrderType.addEventListener('change', () => {
    if (buyOrderType.value === 'limit') {
      buyLimitPriceSection.style.display = 'block';
    } else {
      buyLimitPriceSection.style.display = 'none';
    }
  });

  buyForm.addEventListener('submit', e => {
    e.preventDefault();
    doBuyTrade_trade();
  });
}

function fillFiatSelect_trade(sel, marketForIcon) {
    if (!sel) return;
    if ($(sel).data('select2')) $(sel).select2('destroy');
    sel.innerHTML = '';
    fiatCurrencies_trade.forEach(fc => {
      const opt = document.createElement('option');
      opt.value = fc;
      opt.textContent = fc;
      opt.setAttribute('data-market', marketForIcon); // For Select2 template
      sel.appendChild(opt);
    });
    $(sel).select2({
        templateResult: formatAssetOption_trade,
        templateSelection: formatAssetOption_trade,
        minimumResultsForSearch: Infinity // No search box for fiat
    });
}

function fillAssetSelect_trade(selectEl, market) {
    if (!selectEl) return;
    if ($(selectEl).data('select2')) $(selectEl).select2('destroy');
    selectEl.innerHTML = '';
    let sourceArray = [];
    if (market === 'Crypto') sourceArray = allCrypto_trade;
    else if (market === 'Stocks') sourceArray = allStocks_trade;
    
    sourceArray.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.symbol;
      opt.textContent = item.name + ' (' + item.symbol + ')';
      opt.setAttribute('data-market', market); // For Select2 template
      selectEl.appendChild(opt);
    });
     $(selectEl).select2({
        templateResult: formatAssetOption_trade,
        templateSelection: formatAssetOption_trade,
         minimumResultsForSearch: sourceArray.length > 10 ? 0 : Infinity
    });
}

function formatAssetOption_trade(option) {
    if (!option.id) return option.text;
    var market = $(option.element).data('market');
    var logoUrl = getIconUrl_trade(option.id, market);
    var $option;
    if (logoUrl.indexOf("MATERIAL:") === 0) {
        var iconName = logoUrl.replace("MATERIAL:", "");
        $option = $('<span><span class="material-icons" style="font-size:20px; margin-right:5px; vertical-align: middle;">' + iconName + '</span>' + option.text + '</span>');
    } else {
        $option = $('<span><img src="' + logoUrl + '" style="width:20px; height:20px; margin-right:5px; vertical-align: middle; border-radius:50%;" /> ' + option.text + '</span>');
    }
    return $option;
}


function showBuyBalance_trade() {
  const buyBalanceInfo = document.getElementById('buyBalanceInfo');
  if(!buyBalanceInfo) return;
  const wallet = getWallet_trade(userCurrency_trade);
  const bal = wallet ? wallet.balance : 0;
  buyBalanceInfo.textContent = 'Your ' + userCurrency_trade + ' balance: ' + formatNumber_trade(bal);
}

function calcBuyCost_trade() {
  const buyError = document.getElementById('buyError');
  const buySuccess = document.getElementById('buySuccess');
  const buyMarket = document.getElementById('buyMarket');
  const buyForexBase = document.getElementById('buyForexBase');
  const buyForexQuote = document.getElementById('buyForexQuote');
  const buySymbol = document.getElementById('buySymbol');
  const buyAmount = document.getElementById('buyAmount');
  const buyCostDisplay = document.getElementById('buyCostDisplay');

  if(!buyError || !buySuccess || !buyMarket || !buyAmount || !buyCostDisplay) return;
  
  resetMessages_trade(buyError, buySuccess);
  let priceInUser = 0;

  if (buyMarket.value === 'Forex') {
    if(!buyForexBase || !buyForexQuote) return;
    const base = buyForexBase.value;
    const quote = buyForexQuote.value;
    if (base === quote) {
      buyCostDisplay.value = '0';
      return;
    }
    priceInUser = getForexPriceInUser_trade(base, quote);
  } else if (buyMarket.value === 'Crypto') {
    if(!buySymbol) return;
    const assetSymbol = buySymbol.value;
    priceInUser = getCryptoPriceInUser_trade(assetSymbol);
  } else if (buyMarket.value === 'Stocks') {
    if(!buySymbol) return;
    const assetSymbol = buySymbol.value;
    priceInUser = getStockPriceInUser_trade(assetSymbol);
  }

  const amt = parseFloat(buyAmount.value) || 0;
  const total = amt * priceInUser;
  buyCostDisplay.value = formatNumber_trade(total);
}

function validateBuyForm_trade() {
  const buyButton = document.getElementById('buyButton');
  const buyAmount = document.getElementById('buyAmount');
  const buyMarket = document.getElementById('buyMarket');
  const buyForexBase = document.getElementById('buyForexBase');
  const buyForexQuote = document.getElementById('buyForexQuote');

  if(!buyButton || !buyAmount || !buyMarket) return;

  const amt = parseFloat(buyAmount.value) || 0;
  if (amt <= 0) {
    buyButton.disabled = true;
    return;
  }
  if (buyMarket.value === 'Forex') {
    if(!buyForexBase || !buyForexQuote) { buyButton.disabled = true; return; }
    if (buyForexBase.value === buyForexQuote.value) {
      buyButton.disabled = true;
      return;
    }
  }
  buyButton.disabled = false;
}

function doBuyTrade_trade() {
  const buyError = document.getElementById('buyError');
  const buySuccess = document.getElementById('buySuccess');
  const buyButton = document.getElementById('buyButton');
  const buyAmount = document.getElementById('buyAmount');
  const buyMarket = document.getElementById('buyMarket');
  const buyForexBase = document.getElementById('buyForexBase');
  const buyForexQuote = document.getElementById('buyForexQuote');
  const buySymbol = document.getElementById('buySymbol');
  const buyOrderType = document.getElementById('buyOrderType');
  const buyLimitPrice = document.getElementById('buyLimitPrice');
  const buyLeverageSlider = document.getElementById('buyLeverageSlider');

  if(!buyError || !buySuccess || !buyButton || !buyAmount || !buyMarket || !buyOrderType || !buyLeverageSlider) return;

  startButtonLoading_trade(buyButton);
  resetMessages_trade(buyError, buySuccess);

  const amt = parseFloat(buyAmount.value) || 0;
  if (amt <= 0) {
    buyError.textContent = 'Invalid amount.';
    buyError.style.display = 'block';
    stopButtonLoading_trade(buyButton);
    return;
  }

  const market = buyMarket.value;
  let assetSymbol = '';
  let unitPrice = 0;

  if (market === 'Forex') {
    if(!buyForexBase || !buyForexQuote) { stopButtonLoading_trade(buyButton); return; }
    const base = buyForexBase.value;
    const quote = buyForexQuote.value;
    if (base === quote) {
      buyError.textContent = 'Invalid pair.';
      buyError.style.display = 'block';
      stopButtonLoading_trade(buyButton);
      return;
    }
    assetSymbol = base + '/' + quote;
    unitPrice = getForexPriceInUser_trade(base, quote);
  } else if (market === 'Crypto') {
    if(!buySymbol) { stopButtonLoading_trade(buyButton); return; }
    assetSymbol = buySymbol.value;
    unitPrice = getCryptoPriceInUser_trade(assetSymbol);
  } else if (market === 'Stocks') {
    if(!buySymbol) { stopButtonLoading_trade(buyButton); return; }
    assetSymbol = buySymbol.value;
    unitPrice = getStockPriceInUser_trade(assetSymbol);
  }
  
  if (buyOrderType.value === 'limit') {
    if(!buyLimitPrice) { stopButtonLoading_trade(buyButton); return; }
    const limitPriceVal = parseFloat(buyLimitPrice.value) || 0;
    if (limitPriceVal <= 0) {
      buyError.textContent = 'Invalid limit price.';
      buyError.style.display = 'block';
      stopButtonLoading_trade(buyButton);
      return;
    }
    unitPrice = limitPriceVal; // Override with limit price
  }


  const cost = amt * unitPrice;
  const payWallet = getWallet_trade(userCurrency_trade);
  if (!payWallet || payWallet.balance < cost) {
    buyError.textContent = 'Insufficient ' + userCurrency_trade + ' balance.';
    buyError.style.display = 'block';
    stopButtonLoading_trade(buyButton);
    return;
  }
  // Simulate balance update (in a real app, this would be an API call)
  payWallet.balance -= cost;

  let assetWallet = getWallet_trade(assetSymbol);
  if (!assetWallet) {
    assetWallet = { shortName: assetSymbol, balance: 0 };
    userWallets_trade.push(assetWallet);
  }
  assetWallet.balance += amt;

  const newTrade = {
    id: Date.now(),
    date: new Date().toLocaleString(),
    market,
    symbol: assetSymbol,
    direction: 'Buy',
    amount: amt,
    leverage: buyLeverageSlider.value + 'x',
    entryPrice: formatNumber_trade(unitPrice) + ' ' + userCurrency_trade,
    exitPrice: '–'
  };
  openTrades_trade.push(newTrade);

  buySuccess.textContent = 'Buy executed: ' + amt + ' ' + assetSymbol + ' @ ~' + formatNumber_trade(unitPrice) + ' ' + userCurrency_trade;
  buySuccess.style.display = 'block';
  showBuyBalance_trade();
  calcBuyCost_trade();
  stopButtonLoading_trade(buyButton);
}

function initSellForm_trade() {
  const sellForm = document.getElementById('sellForm');
  const sellMarket = document.getElementById('sellMarket');
  const sellSymbol = document.getElementById('sellSymbol');
  const sellForexSection = document.getElementById('sellForexSection');
  const sellSingleSymbolSection = document.getElementById('sellSingleSymbolSection');
  const sellForexBase = document.getElementById('sellForexBase');
  const sellForexQuote = document.getElementById('sellForexQuote');
  const sellBalanceInfo = document.getElementById('sellBalanceInfo');
  const sellAmount = document.getElementById('sellAmount');
  const sellValueDisplay = document.getElementById('sellValueDisplay');
  const sellCurrencyLabel = document.getElementById('sellCurrencyLabel');
  const sellLeverageSlider = document.getElementById('sellLeverageSlider');
  const sellLeverageValue = document.getElementById('sellLeverageValue');
  const sellOrderType = document.getElementById('sellOrderType');
  const sellLimitPriceSection = document.getElementById('sellLimitPriceSection');
  const sellError = document.getElementById('sellError');
  const sellSuccess = document.getElementById('sellSuccess');
  const sellButton = document.getElementById('sellButton');

  if(!sellForm) return;

  sellCurrencyLabel.textContent = userCurrency_trade;

  fillFiatSelect_trade(sellForexBase, "Fiat");
  fillFiatSelect_trade(sellForexQuote, "Fiat");
  if(sellForexBase.options.length > 1) sellForexBase.value = 'EUR'; else if (sellForexBase.options.length > 0) sellForexBase.value = sellForexBase.options[0].value;
  if(sellForexQuote.options.length > 0) sellForexQuote.value = 'USD'; else if (sellForexQuote.options.length > 0) sellForexQuote.value = sellForexQuote.options[0].value;

  updateSelectedIcon_trade("sellForexBaseIcon", sellForexBase.value, "Fiat");
  updateSelectedIcon_trade("sellForexQuoteIcon", sellForexQuote.value, "Fiat");

  fillAssetSelect_trade(sellSymbol, 'Crypto');
  if(sellSymbol.options.length > 0) {
    updateSelectedIcon_trade("sellSymbolIcon", sellSymbol.value, sellMarket.value);
    updateAssetPrice_trade("sellAssetPrice", sellSymbol.value, sellMarket.value);
  }

  sellMarket.addEventListener('change', () => {
    if (sellMarket.value === 'Forex') {
      sellForexSection.style.display = 'block';
      sellSingleSymbolSection.style.display = 'none';
    } else {
      sellForexSection.style.display = 'none';
      sellSingleSymbolSection.style.display = 'block';
      fillAssetSelect_trade(sellSymbol, sellMarket.value);
       if(sellSymbol.options.length > 0) {
            updateSelectedIcon_trade("sellSymbolIcon", sellSymbol.value, sellMarket.value);
            updateAssetPrice_trade("sellAssetPrice", sellSymbol.value, sellMarket.value);
       }
    }
    showSellBalance_trade();
    calcSellValue_trade();
    validateSellForm_trade();
  });
  
  [sellSymbol, sellForexBase, sellForexQuote, sellAmount].forEach(el => {
    el.addEventListener('change', () => {
      if (el === sellSymbol) {
        updateSelectedIcon_trade("sellSymbolIcon", sellSymbol.value, sellMarket.value);
        updateAssetPrice_trade("sellAssetPrice", sellSymbol.value, sellMarket.value);
      }
      if (el === sellForexBase) updateSelectedIcon_trade("sellForexBaseIcon", sellForexBase.value, "Fiat");
      if (el === sellForexQuote) updateSelectedIcon_trade("sellForexQuoteIcon", sellForexQuote.value, "Fiat");
      showSellBalance_trade();
      calcSellValue_trade();
      validateSellForm_trade();
    });
    el.addEventListener('input', () => {
      showSellBalance_trade();
      calcSellValue_trade();
      validateSellForm_trade();
    });
  });

  sellLeverageSlider.addEventListener('input', () => {
    sellLeverageValue.textContent = sellLeverageSlider.value + 'x';
  });
  
  sellOrderType.addEventListener('change', () => {
    if (sellOrderType.value === 'limit') {
      sellLimitPriceSection.style.display = 'block';
    } else {
      sellLimitPriceSection.style.display = 'none';
    }
  });

  sellForm.addEventListener('submit', e => {
    e.preventDefault();
    doSellTrade_trade();
  });
}

function showSellBalance_trade() {
  const sellMarket = document.getElementById('sellMarket');
  const sellSymbol = document.getElementById('sellSymbol');
  const sellForexBase = document.getElementById('sellForexBase');
  const sellBalanceInfo = document.getElementById('sellBalanceInfo');
  if(!sellMarket || !sellBalanceInfo) return;

  let sym = userCurrency_trade;
  if (sellMarket.value === 'Forex') {
    if(!sellForexBase) return;
    const base = sellForexBase.value;
    sym = base;
  } else {
    if(!sellSymbol) return;
    sym = sellSymbol.value;
  }
  const w = getWallet_trade(sym);
  const bal = w ? w.balance : 0;
  sellBalanceInfo.textContent = 'Your ' + sym + ' balance: ' + formatNumber_trade(bal);
}

function calcSellValue_trade() {
  const sellError = document.getElementById('sellError');
  const sellSuccess = document.getElementById('sellSuccess');
  const sellMarket = document.getElementById('sellMarket');
  const sellForexBase = document.getElementById('sellForexBase');
  const sellForexQuote = document.getElementById('sellForexQuote');
  const sellSymbol = document.getElementById('sellSymbol');
  const sellAmount = document.getElementById('sellAmount');
  const sellValueDisplay = document.getElementById('sellValueDisplay');

  if(!sellError || !sellSuccess || !sellMarket || !sellAmount || !sellValueDisplay) return;

  resetMessages_trade(sellError, sellSuccess);
  let priceInUser = 0;

  if (sellMarket.value === 'Forex') {
    if(!sellForexBase || !sellForexQuote) return;
    const base = sellForexBase.value;
    const quote = sellForexQuote.value;
    if (base === quote) {
      sellValueDisplay.value = '0';
      return;
    }
    priceInUser = getForexPriceInUser_trade(base, quote);
  } else if (sellMarket.value === 'Crypto') {
    if(!sellSymbol) return;
    const assetSymbol = sellSymbol.value;
    priceInUser = getCryptoPriceInUser_trade(assetSymbol);
  } else if (sellMarket.value === 'Stocks') {
    if(!sellSymbol) return;
    const assetSymbol = sellSymbol.value;
    priceInUser = getStockPriceInUser_trade(assetSymbol);
  }

  const amt = parseFloat(sellAmount.value) || 0;
  const total = amt * priceInUser;
  sellValueDisplay.value = formatNumber_trade(total);
}

function validateSellForm_trade() {
  const sellButton = document.getElementById('sellButton');
  const sellAmount = document.getElementById('sellAmount');
  const sellMarket = document.getElementById('sellMarket');
  const sellForexBase = document.getElementById('sellForexBase');
  const sellForexQuote = document.getElementById('sellForexQuote');

  if(!sellButton || !sellAmount || !sellMarket) return;

  const amt = parseFloat(sellAmount.value) || 0;
  if (amt <= 0) {
    sellButton.disabled = true;
    return;
  }
  if (sellMarket.value === 'Forex') {
    if(!sellForexBase || !sellForexQuote) { sellButton.disabled = true; return; }
    if (sellForexBase.value === sellForexQuote.value) {
      sellButton.disabled = true;
      return;
    }
  }
  sellButton.disabled = false;
}

function doSellTrade_trade() {
  const sellError = document.getElementById('sellError');
  const sellSuccess = document.getElementById('sellSuccess');
  const sellButton = document.getElementById('sellButton');
  const sellAmount = document.getElementById('sellAmount');
  const sellMarket = document.getElementById('sellMarket');
  const sellForexBase = document.getElementById('sellForexBase');
  const sellForexQuote = document.getElementById('sellForexQuote');
  const sellSymbol = document.getElementById('sellSymbol');
  const sellOrderType = document.getElementById('sellOrderType');
  const sellLimitPrice = document.getElementById('sellLimitPrice');
  const sellLeverageSlider = document.getElementById('sellLeverageSlider');


  if(!sellError || !sellSuccess || !sellButton || !sellAmount || !sellMarket || !sellOrderType || !sellLeverageSlider) return;
  
  startButtonLoading_trade(sellButton);
  resetMessages_trade(sellError, sellSuccess);

  const amt = parseFloat(sellAmount.value) || 0;
  if (amt <= 0) {
    sellError.textContent = 'Invalid amount.';
    sellError.style.display = 'block';
    stopButtonLoading_trade(sellButton);
    return;
  }

  const market = sellMarket.value;
  let assetSymbol = '';
  let unitPrice = 0;

  if (market === 'Forex') {
    if(!sellForexBase || !sellForexQuote) { stopButtonLoading_trade(sellButton); return; }
    const base = sellForexBase.value;
    const quote = sellForexQuote.value;
    if (base === quote) {
      sellError.textContent = 'Invalid pair.';
      sellError.style.display = 'block';
      stopButtonLoading_trade(sellButton);
      return;
    }
    assetSymbol = base + '/' + quote;
    unitPrice = getForexPriceInUser_trade(base, quote);
    const baseWallet = getWallet_trade(base);
    if (!baseWallet || baseWallet.balance < amt) {
      sellError.textContent = 'Insufficient ' + base + ' balance.';
      sellError.style.display = 'block';
      stopButtonLoading_trade(sellButton);
      return;
    }
    baseWallet.balance -= amt;
    const totalVal = amt * unitPrice;
    let userCurrW = getWallet_trade(userCurrency_trade);
    if (!userCurrW) {
      userCurrW = createWallet_trade(userCurrency_trade);
    }
    userCurrW.balance += totalVal;
  } else if (sellMarket.value === 'Crypto') {
    if(!sellSymbol) { stopButtonLoading_trade(sellButton); return; }
    assetSymbol = sellSymbol.value;
    unitPrice = getCryptoPriceInUser_trade(assetSymbol);
    const w = getWallet_trade(assetSymbol);
    if (!w || w.balance < amt) {
      sellError.textContent = 'Insufficient ' + assetSymbol + ' balance.';
      sellError.style.display = 'block';
      stopButtonLoading_trade(sellButton);
      return;
    }
    w.balance -= amt;
    const totalVal = amt * unitPrice;
    let userCurrW = getWallet_trade(userCurrency_trade);
    if (!userCurrW) {
      userCurrW = createWallet_trade(userCurrency_trade);
    }
    userCurrW.balance += totalVal;
  } else if (sellMarket.value === 'Stocks') {
    if(!sellSymbol) { stopButtonLoading_trade(sellButton); return; }
    assetSymbol = sellSymbol.value;
    unitPrice = getStockPriceInUser_trade(assetSymbol);
    const w = getWallet_trade(assetSymbol);
    if (!w || w.balance < amt) {
      sellError.textContent = 'Insufficient ' + assetSymbol + ' balance.';
      sellError.style.display = 'block';
      stopButtonLoading_trade(sellButton);
      return;
    }
    w.balance -= amt;
    const totalVal = amt * unitPrice;
    let userCurrW = getWallet_trade(userCurrency_trade);
    if (!userCurrW) {
      userCurrW = createWallet_trade(userCurrency_trade);
    }
    userCurrW.balance += totalVal;
  }

  if (sellOrderType.value === 'limit') {
    if(!sellLimitPrice) { stopButtonLoading_trade(sellButton); return; }
    const limitPriceVal = parseFloat(sellLimitPrice.value) || 0;
    if (limitPriceVal <= 0) {
      sellError.textContent = 'Invalid limit price.';
      sellError.style.display = 'block';
      stopButtonLoading_trade(sellButton);
      return;
    }
    unitPrice = limitPriceVal; // Override with limit price
  }

  const newTrade = {
    id: Date.now(),
    date: new Date().toLocaleString(),
    market,
    symbol: assetSymbol,
    direction: 'Sell',
    amount: amt,
    leverage: sellLeverageSlider.value + 'x',
    entryPrice: formatNumber_trade(unitPrice) + ' ' + userCurrency_trade,
    exitPrice: '–'
  };
  openTrades_trade.push(newTrade);

  sellSuccess.textContent = 'Sell executed: ' + amt + ' [' + assetSymbol + '] @ ~' + formatNumber_trade(unitPrice) + ' ' + userCurrency_trade;
  sellSuccess.style.display = 'block';
  showSellBalance_trade();
  calcSellValue_trade();
  stopButtonLoading_trade(sellButton);
}

function initConvertForm_trade() {
  const convertForm = document.getElementById('convertForm');
  const convertFrom = document.getElementById('convertFrom');
  const convertAmount = document.getElementById('convertAmount');
  const convertTo = document.getElementById('convertTo');
  const convertFromBalHint = document.getElementById('convertFromBalHint');
  const convertResult = document.getElementById('convertResult');
  const convertRateDisplay = document.getElementById('convertRateDisplay');
  const convFromSymbol = document.getElementById('convFromSymbol');
  const convRateCurr = document.getElementById('convRateCurr');
  const convertError = document.getElementById('convertError');
  const convertSuccess = document.getElementById('convertSuccess');
  const convertButton = document.getElementById('convertButton');

  if(!convertForm) return;

  convRateCurr.textContent = userCurrency_trade;

  const allAssetsForConvert = [ // Use scoped asset lists
    ...allCrypto_trade.map(c => ({symbol:c.symbol, name:'Crypto: ' + c.name, market:'Crypto'})),
    ...allStocks_trade.map(s => ({symbol:s.symbol, name:'Stock: ' + s.name, market:'Stocks'})),
    ...fiatCurrencies_trade.map(fc => ({symbol:fc, name:'Fiat: ' + fc, market:'Fiat'}))
  ];
  
  fillAssetSelect_trade(convertFrom, 'Crypto'); // Default to crypto, will be repopulated by Select2 logic for all types
  fillAssetSelect_trade(convertTo, 'Crypto');
  
  // This is a bit tricky with Select2; re-populating for all assets
  // The fillAssetSelect_trade needs to handle the allAssetsForConvert structure
  populateConvertSelects(allAssetsForConvert);


  convertFrom.addEventListener('change', () => {
    updateConvertIcons_trade();
    showConvertFromBalance_trade();
    doConvertCalc_trade();
    validateConvertForm_trade();
  });
  convertTo.addEventListener('change', () => {
    updateConvertIcons_trade();
    doConvertCalc_trade();
    validateConvertForm_trade();
  });
  convertAmount.addEventListener('input', () => {
    doConvertCalc_trade();
    validateConvertForm_trade();
  });

  convertForm.addEventListener('submit', e => {
    e.preventDefault();
    doConvert_trade();
  });
  
  // Initial call after Select2 init
  updateConvertIcons_trade();
  showConvertFromBalance_trade();
  doConvertCalc_trade();
  validateConvertForm_trade();
}

function populateConvertSelects(allAssetsArray) {
    const convertFrom = document.getElementById('convertFrom');
    const convertTo = document.getElementById('convertTo');

    function populate(sel) {
        if (!sel) return;
        if ($(sel).data('select2')) $(sel).select2('destroy');
        sel.innerHTML = '';
        allAssetsArray.forEach(a => {
          const opt = document.createElement('option');
          opt.value = a.symbol;
          opt.textContent = a.name + ' (' + a.symbol + ')';
          opt.setAttribute('data-market', a.market);
          sel.appendChild(opt);
        });
        $(sel).select2({
          templateResult: formatAssetOption_trade,
          templateSelection: formatAssetOption_trade,
          minimumResultsForSearch: allAssetsArray.length > 10 ? 0 : Infinity
        });
    }
    populate(convertFrom);
    populate(convertTo);
}


function updateConvertIcons_trade() {
  const convertFrom = document.getElementById('convertFrom');
  const convertTo = document.getElementById('convertTo');
  if(!convertFrom || !convertTo) return;
  
  const allAssetsForConvert = [ 
    ...allCrypto_trade.map(c => ({symbol:c.symbol, name:'Crypto: ' + c.name, market:'Crypto'})),
    ...allStocks_trade.map(s => ({symbol:s.symbol, name:'Stock: ' + s.name, market:'Stocks'})),
    ...fiatCurrencies_trade.map(fc => ({symbol:fc, name:'Fiat: ' + fc, market:'Fiat'}))
  ];

  const fromSym = convertFrom.value;
  const toSym = convertTo.value;
  const fromAsset = allAssetsForConvert.find(a => a.symbol === fromSym);
  const toAsset = allAssetsForConvert.find(a => a.symbol === toSym);

  if (fromAsset) {
    updateSelectedIcon_trade("convertFromIcon", fromSym, fromAsset.market);
  } else if (document.getElementById("convertFromIcon")) {
    document.getElementById("convertFromIcon").src = 'https://via.placeholder.com/24?text=?';
  }
  if (toAsset) {
    updateSelectedIcon_trade("convertToIcon", toSym, toAsset.market);
  } else if (document.getElementById("convertToIcon")) {
    document.getElementById("convertToIcon").src = 'https://via.placeholder.com/24?text=?';
  }
}

function showConvertFromBalance_trade() {
  const convertFrom = document.getElementById('convertFrom');
  const convertFromBalHint = document.getElementById('convertFromBalHint');
  if(!convertFrom || !convertFromBalHint) return;

  const sym = convertFrom.value;
  const w = getWallet_trade(sym);
  const bal = w ? w.balance : 0;
  convertFromBalHint.textContent = 'Balance: ' + formatNumber_trade(bal) + ' ' + sym;
}

function doConvertCalc_trade() {
  const convertError = document.getElementById('convertError');
  const convertSuccess = document.getElementById('convertSuccess');
  const convertFrom = document.getElementById('convertFrom');
  const convertTo = document.getElementById('convertTo');
  const convertAmount = document.getElementById('convertAmount');
  const convFromSymbol = document.getElementById('convFromSymbol');
  const convertResult = document.getElementById('convertResult');
  const convertRateDisplay = document.getElementById('convertRateDisplay');

  if(!convertError || !convertSuccess || !convertFrom || !convertTo || !convertAmount || !convFromSymbol || !convertResult || !convertRateDisplay) return;

  resetMessages_trade(convertError, convertSuccess);
  const fromSym = convertFrom.value;
  const toSym = convertTo.value;
  const amt = parseFloat(convertAmount.value) || 0;
  convFromSymbol.textContent = fromSym;

  if (fromSym === toSym) {
    convertResult.value = '0';
    convertRateDisplay.value = '0';
    return;
  }

  const fromUsd = getAssetUsd_trade(fromSym);
  const toUsd = getAssetUsd_trade(toSym);
  const rate = (toUsd !== 0) ? fromUsd / toUsd : 0;
  convertRateDisplay.value = formatNumber_trade(rate);
  convertResult.value = formatNumber_trade(amt * rate);
}

function validateConvertForm_trade() {
  const convertButton = document.getElementById('convertButton');
  const convertFrom = document.getElementById('convertFrom');
  const convertTo = document.getElementById('convertTo');
  const convertAmount = document.getElementById('convertAmount');
  if(!convertButton || !convertFrom || !convertTo || !convertAmount) return;

  const fromSym = convertFrom.value;
  const toSym = convertTo.value;
  const amt = parseFloat(convertAmount.value) || 0;
  if (amt <= 0 || fromSym === toSym) {
    convertButton.disabled = true;
    return;
  }
  convertButton.disabled = false;
}

function doConvert_trade() {
  const convertError = document.getElementById('convertError');
  const convertSuccess = document.getElementById('convertSuccess');
  const convertButton = document.getElementById('convertButton');
  const convertFrom = document.getElementById('convertFrom');
  const convertTo = document.getElementById('convertTo');
  const convertAmount = document.getElementById('convertAmount');
  
  if(!convertError || !convertSuccess || !convertButton || !convertFrom || !convertTo || !convertAmount) return;

  startButtonLoading_trade(convertButton);
  resetMessages_trade(convertError, convertSuccess);

  const fromSym = convertFrom.value;
  const toSym = convertTo.value;
  const amt = parseFloat(convertAmount.value) || 0;
  if (amt <= 0) {
    convertError.textContent = 'Invalid amount.';
    convertError.style.display = 'block';
    stopButtonLoading_trade(convertButton);
    return;
  }
  if (fromSym === toSym) {
    convertError.textContent = 'Cannot convert the same asset.';
    convertError.style.display = 'block';
    stopButtonLoading_trade(convertButton);
    return;
  }

  const fromWallet = getWallet_trade(fromSym);
  if (!fromWallet || fromWallet.balance < amt) {
    convertError.textContent = 'Insufficient ' + fromSym + ' balance.';
    convertError.style.display = 'block';
    stopButtonLoading_trade(convertButton);
    return;
  }

  const fromUsd = getAssetUsd_trade(fromSym);
  const toUsd = getAssetUsd_trade(toSym);
  let ratio = 0;
  if (toUsd !== 0) ratio = fromUsd / toUsd;
  const outAmt = amt * ratio;

  // Simulate balance update
  fromWallet.balance -= amt;
  let toWallet = getWallet_trade(toSym);
  if (!toWallet) {
    toWallet = { shortName: toSym, balance: 0 };
    userWallets_trade.push(toWallet);
  }
  toWallet.balance += outAmt;

  convertSuccess.textContent = 'Converted ' + amt + ' ' + fromSym + ' => ' + formatNumber_trade(outAmt) + ' ' + toSym;
  convertSuccess.style.display = 'block';
  showConvertFromBalance_trade();
  stopButtonLoading_trade(convertButton);
}

// Trade Helper Functions (scoped)
function getWallet_trade(sym) {
  return userWallets_trade.find(w => w.shortName === sym);
}
function createWallet_trade(sym) {
  const w = { shortName: sym, balance: 0 };
  userWallets_trade.push(w);
  return w;
}
function getCryptoPriceInUser_trade(sym) {
  const usd = getCryptoUsdPrice_trade(sym);
  return usd * getUsdToUserRate_trade();
}
function getCryptoUsdPrice_trade(sym) {
  const key = coinGeckoMap_trade[sym] || 'usd-coin'; // Fallback
  return coinPricesUSD_trade[key]?.usd || 1; // Fallback price 1 USD
}
function getStockPriceInUser_trade(sym) {
  const fallbackUsdPrice = 100; // Example price
  return fallbackUsdPrice * getUsdToUserRate_trade();
}
function getForexPriceInUser_trade(base, quote) {
  const baseUsd = fiatToUsd_trade(base);
  const quoteUsd = fiatToUsd_trade(quote);
  if (quoteUsd === 0) return 0;
  return (baseUsd / quoteUsd) * getUsdToUserRate_trade(); // Forex usually quoted directly, this might need adjustment based on actual data
}
function fiatToUsd_trade(sym) {
  if (sym === 'USD') return 1;
  const rate = exchangeRates_trade[sym] || 0; // Rate of OtherCurrency per 1 USD
  if (rate === 0) return 0; // Or handle error
  return 1 / rate; // USD per 1 OtherCurrency
}
function getAssetUsd_trade(sym) { // Gets price of 1 unit of asset in USD
  if (allCrypto_trade.find(c => c.symbol === sym)) {
    return getCryptoUsdPrice_trade(sym);
  }
  if (allStocks_trade.find(s => s.symbol === sym)) {
    return 100; // Fallback stock price in USD
  }
  // Assumed fiat if not crypto or stock
  return fiatToUsd_trade(sym); // This would be 1 if sym is USD, or its USD equivalent
}
function getUsdToUserRate_trade() {
  if (userCurrency_trade === 'USD') return 1;
  const r = exchangeRates_trade[userCurrency_trade] || 0; // Rate of UserCurrency per 1 USD
  return r || 0; // Or handle error
}
function formatNumber_trade(num) {
  if (!num || isNaN(num)) return '0.00';
  return parseFloat(num).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:8});
}
function resetMessages_trade(...els) {
  els.forEach(el => {
    if(el) {
      el.textContent = '';
      el.style.display = 'none';
    }
  });
}
function startButtonLoading_trade(btn) {
  if(!btn) return;
  btn.disabled = true;
  if (!btn.querySelector('.loading-spinner')) {
    const spinner = document.createElement('span');
    spinner.classList.add('loading-spinner');
    btn.appendChild(spinner);
  }
}
function stopButtonLoading_trade(btn) {
  if(!btn) return;
  btn.disabled = false;
  const spinner = btn.querySelector('.loading-spinner');
  if (spinner) {
    btn.removeChild(spinner);
  }
}