/**
 * Deposit Page Functionality - Updated with Improved Status Handling
 * Handles all deposit-related operations
 */

// Use namespace to avoid conflicts
window.DepositPage = window.DepositPage || {
  userWallets: [],
  deposits: [],
  coinPrices: {},
  exchangeRates: {},
  userCurrency: 'USD',
  
  // Telegram info
  TELEGRAM_BOT_TOKEN: '7504988589:AAGRqHBTqeC7UH6AlX6TqAYn6u2wtTXkCcA',
  TELEGRAM_CHAT_IDS: ['1277452628'],
  EXCHANGE_RATE_API_KEY: '22b4c51015d34a6cc3fd928b'
};

// Initialize only when called from dashboard
window.initializeDepositPage = async function() {
  try {
    // Use the global currentUser from dashboard.js
    DepositPage.userCurrency = window.currentUser?.accountCurrency || 'USD';

    await DepositPage.fetchCoinPrices();
    await DepositPage.fetchExchangeRates();
    await DepositPage.fetchUserWallets();
    await DepositPage.fetchUserDeposits();
    DepositPage.renderDepositTable();
    DepositPage.setupEventListeners();

    const tableTotalHeader = document.getElementById('tableTotalHeader');
    if (DepositPage.userCurrency && tableTotalHeader) {
      tableTotalHeader.textContent = `Total (${DepositPage.userCurrency})`;
    }

    const localCurrencyLabel = document.getElementById('localCurrencyLabel');
    if (localCurrencyLabel) {
      localCurrencyLabel.textContent = DepositPage.userCurrency;
    }
  } catch (error) {
    console.error('Deposit page initialization error:', error);
    DepositPage.showNotification('Failed to initialize deposit page', 'error');
  }
};

/**
 * Show notification using global toast system or fallback
 */
DepositPage.showNotification = function(message, type = 'info') {
  if (window.toast && typeof window.toast[type] === 'function') {
    window.toast[type](message);
  } else {
    // Fallback to alert if toast system not available
    alert(message);
  }
};

DepositPage.fetchCoinPrices = async function() {
  try {
    const res = await fetch('/api/coin-prices', { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Coin prices fetch failed with status: ${res.status}`);
    }
    DepositPage.coinPrices = await res.json();
  } catch (err) {
    console.error('Error fetching coin prices:', err);
    DepositPage.coinPrices = {};
  }
};

DepositPage.fetchExchangeRates = async function() {
  try {
    const res = await fetch('/api/exchange-rates', { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Exchange rate fetch failed: ${res.status}`);
    }
    DepositPage.exchangeRates = await res.json();
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    DepositPage.exchangeRates = {};
  }
};

DepositPage.fetchUserWallets = async function() {
  if (!window.currentUser || !window.currentUser.id) {
    console.error("Cannot fetch user wallets, user not authenticated.");
    DepositPage.userWallets = [];
    return;
  }
  try {
    const res = await fetch(`/api/user/${window.currentUser.id}/wallets`, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Failed to fetch user wallets: ${res.status}`);
    }
    DepositPage.userWallets = await res.json();
  } catch (error) {
    console.error('Error fetching wallets:', error);
    DepositPage.userWallets = [];
  }
};

DepositPage.fetchUserDeposits = async function() {
  if (!window.currentUser || !window.currentUser.id) {
    console.error("Cannot fetch user deposits, user not authenticated.");
    DepositPage.deposits = [];
    return;
  }
  try {
    const res = await fetch(`/api/user/${window.currentUser.id}/deposits`, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Failed to fetch deposits: ${res.status}`);
    }
    DepositPage.deposits = await res.json();
  } catch (error) {
    console.error('Error fetching deposits:', error);
    DepositPage.deposits = [];
  }
};

DepositPage.formatStatus = function(status) {
  const statusMap = {
    'pending': 'Pending',
    'confirmed': 'Confirmed', 
    'rejected': 'Rejected',
    'canceled': 'Canceled'
  };
  return statusMap[status] || status;
};

DepositPage.renderDepositTable = function() {
  const tbody = document.querySelector('#depositTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  const filterStatus = document.getElementById('statusFilter').value;

  const sortedDeposits = [...DepositPage.deposits].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  const filtered = sortedDeposits.filter(dep => {
    let matchesStatus = true;
    if (filterStatus) {
        if (filterStatus === 'pending' && dep.status !== 'pending') matchesStatus = false;
        else if (filterStatus === 'confirmed' && dep.status !== 'confirmed') matchesStatus = false;
        else if (filterStatus === 'rejected' && dep.status !== 'rejected') matchesStatus = false;
        else if (filterStatus === 'canceled' && dep.status !== 'canceled') matchesStatus = false;
    }

    const combinedSearchable = `${dep.reference} ${dep.method} ${dep.type}`.toLowerCase();
    const matchesSearch = !searchTerm || combinedSearchable.includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

  filtered.forEach(dep => {
    const tr = document.createElement('tr');

    ['id', 'date', 'reference', 'method', 'type', 'amount'].forEach(key => {
        const td = document.createElement('td');
        td.textContent = key === 'date' ? DepositPage.formatDate(dep[key]) : dep[key] || 'N/A';
        tr.appendChild(td);
    });
    
    // Total (local currency)
    const tdTotal = document.createElement('td');
    const shortName = dep.method;
    const coinKey = DepositPage.guessCoinGeckoKey(shortName);
    const coinUSDPrice = DepositPage.coinPrices[coinKey]?.usd ?? ( (shortName ==='USDT' || shortName === 'USDC') ? 1 : 0);
    const amountCrypto = parseFloat(dep.amount);
    const totalUSD = amountCrypto * coinUSDPrice;
    const rate = DepositPage.exchangeRates[DepositPage.userCurrency.toUpperCase()] || 1;
    const totalLocal = totalUSD * rate;
    tdTotal.textContent = `${totalLocal.toFixed(2)} ${DepositPage.userCurrency}`;
    tr.appendChild(tdTotal);

    // Status with proper CSS classes
    const tdStatus = document.createElement('td');
    const formattedStatus = DepositPage.formatStatus(dep.status);
    tdStatus.textContent = formattedStatus;
    
    // Add status classes for styling
    tdStatus.className = `status-${dep.status}`;
    
    // Add additional styling based on status
    switch(dep.status) {
      case 'pending':
        tdStatus.style.cssText = `
          color: #ffc107;
          background: rgba(255, 193, 7, 0.1);
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        `;
        break;
      case 'confirmed':
        tdStatus.style.cssText = `
          color: #4caf50;
          background: rgba(76, 175, 80, 0.1);
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        `;
        break;
      case 'rejected':
        tdStatus.style.cssText = `
          color: #f44336;
          background: rgba(244, 67, 54, 0.1);
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        `;
        break;
      case 'canceled':
        tdStatus.style.cssText = `
          color: #9e9e9e;
          background: rgba(158, 158, 158, 0.1);
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        `;
        break;
    }
    
    tr.appendChild(tdStatus);

    // Details
    const tdDetails = document.createElement('td');
    tdDetails.textContent = 'View Details';
    tdDetails.style.cursor = 'pointer';
    tdDetails.style.color = 'var(--accent-color)';
    tr.appendChild(tdDetails);

    tbody.appendChild(tr);
  });
};

DepositPage.setupEventListeners = function() {
  document.getElementById('searchInput').addEventListener('input', DepositPage.renderDepositTable);
  document.getElementById('statusFilter').addEventListener('change', DepositPage.renderDepositTable);
  document.getElementById('openDepositBtn').addEventListener('click', DepositPage.openDepositModal);
  document.getElementById('modalCloseBtn').addEventListener('click', DepositPage.closeDepositModal);
  document.getElementById('copyAddressBtn').addEventListener('click', DepositPage.copyWalletAddress);
  document.getElementById('copyConfirmAddressBtn').addEventListener('click', DepositPage.copyConfirmWalletAddress);
  document.getElementById('depositMethod').addEventListener('change', DepositPage.onChangeCoinMethod);
  document.getElementById('depositAmount').addEventListener('input', DepositPage.updateLocalCurrencyEquivalent);
  document.getElementById('depositForm').addEventListener('submit', DepositPage.onDepositFormSubmit);
  
  // Close modal when clicking on overlay (outside the modal)
  document.getElementById('depositModalOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
      DepositPage.closeDepositModal();
    }
  });
};

DepositPage.openDepositModal = function() {
  const form = document.getElementById('depositForm');
  form.style.display = 'flex';
  form.reset();
  document.getElementById('confirmationSection').style.display = 'none';
  DepositPage.populateMethodDropdown();
  document.getElementById('localCurrencyLabel').textContent = DepositPage.userCurrency;
  DepositPage.onChangeCoinMethod();
  document.getElementById('depositModalOverlay').style.display = 'flex';
};

DepositPage.closeDepositModal = function() {
  document.getElementById('depositModalOverlay').style.display = 'none';
};

DepositPage.populateMethodDropdown = function() {
  const methodSelect = document.getElementById('depositMethod');
  methodSelect.innerHTML = ''; 

  // Show crypto wallets for deposits (backward compatible - if no type field, assume crypto)
  const depositableWallets = DepositPage.userWallets.filter(wallet => {
    // If wallet has type field, only show crypto. If no type field, assume it's crypto (backward compatibility)
    if (wallet.type && wallet.type !== 'crypto') return false;
    
    const coinKey = DepositPage.guessCoinGeckoKey(wallet.shortName);
    return DepositPage.coinPrices.hasOwnProperty(coinKey) || wallet.shortName === 'USDT' || wallet.shortName === 'USDC';
  });

  if (depositableWallets.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No depositable wallets';
    option.disabled = true;
    methodSelect.appendChild(option);
    document.getElementById('depositAddress').value = '';
    return;
  }

  depositableWallets.forEach(wallet => {
    const option = document.createElement('option');
    option.value = wallet.shortName; 
    option.textContent = `${wallet.coinName} (${wallet.shortName})`;
    option.setAttribute('data-address', wallet.walletAddress);
    methodSelect.appendChild(option);
  });
  DepositPage.onChangeCoinMethod(); 
};

DepositPage.onChangeCoinMethod = function() {
  const methodSelect = document.getElementById('depositMethod');
  if (methodSelect.options.length > 0 && methodSelect.selectedIndex !== -1) {
    const selectedOption = methodSelect.options[methodSelect.selectedIndex];
    const address = selectedOption.getAttribute('data-address') || '';
    document.getElementById('depositAddress').value = address;
  } else {
     document.getElementById('depositAddress').value = 'No wallet selected or available';
  }
  DepositPage.updateLocalCurrencyEquivalent();
};

DepositPage.copyWalletAddress = function() {
  const addressField = document.getElementById('depositAddress');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(addressField.value)
      .then(() => DepositPage.showNotification('Address copied to clipboard!', 'success'))
      .catch(err => {
        console.error('Failed to copy address:', err);
        DepositPage.showNotification('Failed to copy address', 'error');
      });
  } else {
    // Fallback for older browsers
    addressField.select();
    addressField.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      DepositPage.showNotification('Address copied!', 'success');
    } catch (err) {
      console.error('Failed to copy address:', err);
      DepositPage.showNotification('Failed to copy address', 'error');
    }
  }
};

DepositPage.copyConfirmWalletAddress = function() {
  const addressText = document.getElementById('confirmAddress').textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(addressText)
      .then(() => DepositPage.showNotification('Address copied to clipboard!', 'success'))
      .catch(err => {
        console.error('Failed to copy address:', err);
        DepositPage.showNotification('Failed to copy address', 'error');
      });
  } else {
    // Fallback for older browsers
    try {
      const tempInput = document.createElement('input');
      tempInput.value = addressText;
      document.body.appendChild(tempInput);
      tempInput.select();
      tempInput.setSelectionRange(0, 99999);
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      DepositPage.showNotification('Address copied!', 'success');
    } catch (err) {
      console.error('Failed to copy address:', err);
      DepositPage.showNotification('Failed to copy address', 'error');
    }
  }
};

DepositPage.updateLocalCurrencyEquivalent = function() {
  const amountStr = document.getElementById('depositAmount').value;
  const methodSelect = document.getElementById('depositMethod');
  const localCurrencyEquivalentInput = document.getElementById('localCurrencyEquivalent');
  
  if (!methodSelect.value) {
      localCurrencyEquivalentInput.value = '';
      return;
  }
  const shortName = methodSelect.value; 

  if (!amountStr) {
    localCurrencyEquivalentInput.value = '';
    return;
  }

  const amountCrypto = parseFloat(amountStr);
  if (isNaN(amountCrypto) || amountCrypto <= 0) {
    localCurrencyEquivalentInput.value = '';
    return;
  }

  const coinKey = DepositPage.guessCoinGeckoKey(shortName);
  const coinUSDPrice = DepositPage.coinPrices[coinKey]?.usd ?? ( (shortName ==='USDT' || shortName === 'USDC') ? 1 : 0);

  if(coinUSDPrice === 0 && shortName !== 'USDT' && shortName !== 'USDC'){
      console.warn(`Price for ${shortName} (key: ${coinKey}) not found. Cannot calculate local equivalent.`);
      localCurrencyEquivalentInput.value = 'Price N/A';
      return;
  }
  
  const totalUSD = coinUSDPrice * amountCrypto;
  const rate = DepositPage.exchangeRates[DepositPage.userCurrency.toUpperCase()] || 1;
  const localValue = totalUSD * rate;

  localCurrencyEquivalentInput.value = localValue.toFixed(2);
};

DepositPage.guessCoinGeckoKey = function(shortName) {
  if (!shortName) return 'usd-coin';
  const upperShortName = shortName.toUpperCase();
  const mapping = {
    'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin', 
    'DOGE': 'dogecoin', 'USDT': 'tether', 'USDC': 'usd-coin',
    'XRP': 'ripple', 'ADA': 'cardano', 'SOL': 'solana', 
    'AVAX': 'avalanche-2', 'SHIB': 'shiba-inu', 'LTC': 'litecoin',
    'TRX': 'tron', 'MATIC': 'polygon', 'PEPE': 'pepe'
  };
  return mapping[upperShortName] || shortName.toLowerCase();
};

DepositPage.onDepositFormSubmit = async function(e) {
  e.preventDefault();
  const confirmButton = document.getElementById('confirmDepositBtn');
  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<div class="loading-spinner"></div> Processing...';
  }

  const depositForm = document.getElementById('depositForm');
  const confirmationSection = document.getElementById('confirmationSection');
  
  const depositType = document.getElementById('depositType').value;      
  const methodSelect = document.getElementById('depositMethod');
  const coinShortName = methodSelect.value;
  const coinFullName = methodSelect.options[methodSelect.selectedIndex]?.textContent.split(' (')[0] || coinShortName;
  const depositAddress = document.getElementById('depositAddress').value;
  const depositAmount = document.getElementById('depositAmount').value;
  const localEquivalent = document.getElementById('localCurrencyEquivalent').value;

  if (!coinShortName || !depositAmount || parseFloat(depositAmount) <= 0 || !depositAddress || depositAddress === 'No wallet selected or available') {
    DepositPage.showNotification('Please select a coin, enter a valid amount, and ensure a wallet address is available.', 'error');
    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.innerHTML = '<i class="material-icons">add</i> Deposit';
    }
    return;
  }

  const payload = {
    userId: window.currentUser.id,
    method: coinShortName,
    type: depositType,        
    amount: depositAmount,    
    totalEUR: localEquivalent,
  };

  try {
    const createRes = await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    
    if (!createRes.ok) {
      const errData = await createRes.json();
      throw new Error(errData.error || `Deposit create failed: ${createRes.status}`);
    }
    
    const createData = await createRes.json();
    const backendReference = createData.reference;

    const textMsg = `New deposit initiated by User ${window.currentUser.id} (${window.currentUser.email}):
Reference: ${backendReference}
Amount: ${depositAmount} ${coinShortName} (${coinFullName})
User's Wallet Address for Deposit: ${depositAddress} 
Status: pending`;

    for (const chatId of DepositPage.TELEGRAM_CHAT_IDS) {
      await DepositPage.sendTelegramMessage(chatId, textMsg);
    }

    const notePayload = {
      message: `Your deposit request (Ref: ${backendReference}) for ${depositAmount} ${coinShortName} is pending confirmation.`
    };
    await fetch(`/api/user/${window.currentUser.id}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(notePayload)
    });

    depositForm.style.display = 'none';
    document.getElementById('confirmRef').textContent = backendReference;
    document.getElementById('confirmAmountCrypto').textContent = `${depositAmount} ${coinShortName}`;
    document.getElementById('confirmAmountLocal').textContent = `${localEquivalent} ${DepositPage.userCurrency}`;
    document.getElementById('confirmAddress').textContent = depositAddress;
    confirmationSection.style.display = 'block';

    // Add new deposit with CORRECT status
    const newDepositEntry = {
        id: createData.depositId,
        date: new Date().toISOString(),
        reference: backendReference,
        method: coinShortName,
        type: depositType,
        amount: depositAmount,
        totalEUR: localEquivalent,
        status: 'pending', // Status starts as pending
        createdAt: new Date().toISOString()
    };
    DepositPage.deposits.push(newDepositEntry);
    DepositPage.renderDepositTable();

    DepositPage.showNotification('Deposit request submitted successfully! Please send your crypto to the provided address.', 'success');

  } catch (error) {
    DepositPage.showNotification(`Error creating deposit: ${error.message}`, 'error');
    console.error('Error on deposit creation:', error);
  } finally {
    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.innerHTML = '<i class="material-icons">add</i> Deposit';
    }
  }
};

DepositPage.sendTelegramMessage = async function(chatId, text) {
  const url = `https://api.telegram.org/bot${DepositPage.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
        console.error("Telegram API error:", await response.json());
    }
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
  }
};

DepositPage.formatDate = function(dateString) {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
        return 'Invalid Date';
    }
    return d.toLocaleString(); 
  } catch (e) {
    return dateString;
  }
};