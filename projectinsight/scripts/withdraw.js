/**
 * Withdraw Page Functionality for Dashboard - Updated with Fiat Support
 */

// These variables will be initialized by initializeWithdrawPage
let withdrawCurrentUser = null;
let withdrawUserWallets = [];
let withdrawWithdrawals = [];
let withdrawCoinPrices = {};
let withdrawExchangeRates = {};
let withdrawUserCurrency = 'USD'; // Default

// Configuration (should match your backend and external services)
const WITHDRAW_TELEGRAM_BOT_TOKEN = '7504988589:AAGRqHBTqeC7UH6AlX6TqAYn6u2wtTXkCcA'; 
const WITHDRAW_TELEGRAM_CHAT_IDS = ['1277452628']; // Array of chat IDs
const WITHDRAW_EXCHANGE_RATE_API_KEY = '22b4c51015d34a6cc3fd928b';

/**
 * Initialize withdraw page - called from dashboard.js after content is loaded
 */
window.initializeWithdrawPage = async function() {
  try {
    // Get current user from window (set by dashboard.js)
    withdrawCurrentUser = window.currentUser;
    if (!withdrawCurrentUser) {
      console.error('Withdraw Page: User not found. currentUser is not set on window.');
      showWithdrawNotification('User information is missing. Please try refreshing the page.', 'error');
      return; // Stop initialization if user is not available
    }
    withdrawUserCurrency = withdrawCurrentUser.accountCurrency || 'USD';

    await fetchCoinPricesWithdraw();
    await fetchExchangeRatesWithdraw();
    await fetchUserWalletsWithdraw();
    await fetchUserWithdrawalsWithdraw();
    
    renderWithdrawalTableWithdraw();
    setupWithdrawEventListeners();

    const tableTotalHeader = document.getElementById('tableTotalHeader');
    if (tableTotalHeader && withdrawUserCurrency) {
      tableTotalHeader.textContent = `Total (${withdrawUserCurrency})`;
    }

  } catch (error) {
    console.error('Withdraw page initialization error:', error);
    showWithdrawNotification('Failed to initialize withdraw page. Please refresh and try again.', 'error');
  }
};

/**
 * Show notification for withdraw page
 */
function showWithdrawNotification(message, type = 'info') {
  // Use the global toast system if available, otherwise fallback to alert
  if (window.toast && typeof window.toast[type] === 'function') {
    window.toast[type](message);
  } else {
    alert(message);
  }
}

/**
 * Fetch coin prices from backend
 */
async function fetchCoinPricesWithdraw() {
  try {
    const res = await fetch('/api/coin-prices', { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Coin prices fetch failed with status: ${res.status}`);
    }
    withdrawCoinPrices = await res.json();
  } catch (err) {
    console.error('Error fetching coin prices for withdraw page:', err);
    withdrawCoinPrices = {}; // Fallback to empty object on error
  }
}

/**
 * Fetch exchange rates from external API
 */
async function fetchExchangeRatesWithdraw() {
  try {
    const res = await fetch('/api/exchange-rates', { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Exchange rate fetch failed: ${res.status}`);
    }
    withdrawExchangeRates = await res.json();
  } catch (error) {
    console.error('Error fetching exchange rates for withdraw page:', error);
    withdrawExchangeRates = {}; // Fallback
  }
}

/**
 * Fetch user wallets
 */
async function fetchUserWalletsWithdraw() {
  if (!withdrawCurrentUser || !withdrawCurrentUser.id) {
    console.error("Cannot fetch wallets: current user or user ID is missing.");
    withdrawUserWallets = [];
    return;
  }
  try {
    const res = await fetch(`/api/user/${withdrawCurrentUser.id}/wallets`, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Failed to fetch user wallets: ${res.status}`);
    }
    withdrawUserWallets = await res.json();
  } catch (error) {
    console.error('Error fetching user wallets for withdraw page:', error);
    withdrawUserWallets = []; // Fallback
  }
}

/**
 * Fetch user withdrawals
 */
async function fetchUserWithdrawalsWithdraw() {
  if (!withdrawCurrentUser || !withdrawCurrentUser.id) {
    console.error("Cannot fetch withdrawals: current user or user ID is missing.");
    withdrawWithdrawals = [];
    return;
  }
  try {
    const res = await fetch(`/api/user/${withdrawCurrentUser.id}/withdrawals`, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Failed to fetch withdrawals: ${res.status}`);
    }
    withdrawWithdrawals = await res.json();
  } catch (error) {
    console.error('Error fetching user withdrawals for withdraw page:', error);
    withdrawWithdrawals = []; // Fallback
  }
}

/**
 * Render withdrawal table with filtering and sorting
 */
function renderWithdrawalTableWithdraw() {
  const tbody = document.querySelector('#withdrawTable tbody');
  if (!tbody) {
      console.error("Withdraw table body not found in DOM for rendering.");
      return;
  }
  tbody.innerHTML = ''; // Clear existing rows

  const noMsgEl = document.getElementById('noWithdrawalsMsg');
  if (!noMsgEl) {
      console.error("No withdrawals message element not found.");
      return;
  }

  if (withdrawWithdrawals.length === 0) {
    noMsgEl.style.display = 'block';
    return;
  } else {
    noMsgEl.style.display = 'none';
  }

  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterStatus = statusFilter ? statusFilter.value : '';

  const sorted = [...withdrawWithdrawals].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered = sorted.filter(wd => {
    if (filterStatus && wd.status.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    const combined = `${wd.reference || ''} ${wd.method || ''}`.toLowerCase();
    if (searchTerm && !combined.includes(searchTerm)) {
      return false;
    }
    return true;
  });

  filtered.forEach(wd => {
    const tr = document.createElement('tr');

    tr.insertCell().textContent = wd.id;
    tr.insertCell().textContent = formatDateWithdraw(wd.date);
    tr.insertCell().textContent = wd.reference;

    const { parsedMethod, parsedDetails } = parseMethodStringWithdraw(wd.method);
    tr.insertCell().textContent = parsedMethod;
    tr.insertCell().textContent = wd.type || 'N/A';
    tr.insertCell().textContent = wd.amount;
    tr.insertCell().textContent = calculateLocalTotalWithdraw(wd.type, wd.amount, parsedMethod, wd.total);
    
    const statusCell = tr.insertCell();
    statusCell.textContent = wd.status;
    statusCell.className = ''; // Clear previous classes
    if (wd.status) { // Add status class for styling if status exists
        const statusClass = `status-${wd.status.toLowerCase().replace(/\s+/g, '_')}`; // e.g. status-pending_approval
        statusCell.classList.add(statusClass); 
        // Also add generic status classes if needed from main.css like status-pending, status-confirmed
        if (wd.status.toLowerCase().includes('pending')) statusCell.classList.add('status-pending');
        else if (wd.status.toLowerCase().includes('cancel')) statusCell.classList.add('status-canceled');
        else if (wd.status.toLowerCase().includes('confirm') || wd.status.toLowerCase().includes('approved')) statusCell.classList.add('status-confirmed');
        else if (wd.status.toLowerCase().includes('reject')) statusCell.classList.add('status-rejected');
    }

    tr.insertCell().textContent = parsedDetails;
    tbody.appendChild(tr);
  });
}

/**
 * Parse method string to separate method and details
 */
function parseMethodStringWithdraw(methodStr) {
  if (!methodStr) {
    return { parsedMethod: '', parsedDetails: '' };
  }
  const parts = methodStr.split(':');
  const parsedMethod = parts[0] || methodStr;
  const parsedDetails = parts.length > 1 ? parts.slice(1).join(':').trim() : ''; 
  return { parsedMethod, parsedDetails };
}

/**
 * Calculate local currency total for a withdrawal
 */
function calculateLocalTotalWithdraw(type, amountStr, coinName, totalStr) {
  // If we have a total already stored, use that first
  if (totalStr && totalStr !== '0') {
    return `${parseFloat(totalStr).toFixed(2)} ${withdrawUserCurrency}`;
  }
  
  let totalLocal = 0;
  const amount = parseFloat(amountStr) || 0;

  if (type === 'crypto') {
    const shortName = getShortNameFromCoinNameWithdraw(coinName); // e.g., BTC from Bitcoin
    const coinKey = guessCoinGeckoKeyWithdraw(shortName); // e.g., bitcoin from BTC
    const coinUSDPrice = (withdrawCoinPrices[coinKey] && withdrawCoinPrices[coinKey].usd) ? withdrawCoinPrices[coinKey].usd : 1; // Fallback to 1 if price not found
    const totalUSD = amount * coinUSDPrice;
    const rate = withdrawExchangeRates[withdrawUserCurrency.toUpperCase()] || 1; // Fallback to 1 if rate not found
    totalLocal = totalUSD * rate;
  } else { // 'bank' transfer
    totalLocal = amount; // Amount is already in local currency
  }
  return `${totalLocal.toFixed(2)} ${withdrawUserCurrency}`;
}

/**
 * Get short name (e.g., BTC) from full coin name (e.g., Bitcoin) using wallet data
 */
function getShortNameFromCoinNameWithdraw(coinName) {
  if (!coinName) return '';
  const foundWallet = withdrawUserWallets.find(
    w => (w.coinName && w.coinName.toLowerCase() === coinName.toLowerCase()) || 
         (w.shortName && w.shortName.toLowerCase() === coinName.toLowerCase())
  );
  return foundWallet ? foundWallet.shortName.toUpperCase() : coinName.toUpperCase(); // Fallback to input if not found
}

/**
 * Setup all event listeners for the withdraw page
 */
function setupWithdrawEventListeners() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.addEventListener('input', renderWithdrawalTableWithdraw);
  
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) statusFilter.addEventListener('change', renderWithdrawalTableWithdraw);

  const openWithdrawBtn = document.getElementById('openWithdrawBtn');
  if (openWithdrawBtn) openWithdrawBtn.addEventListener('click', openWithdrawModalFunc);

  const modalCloseBtn = document.getElementById('modalCloseBtn'); // In withdraw modal HTML
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeWithdrawModalFunc);

  const withdrawTypeSelect = document.getElementById('withdrawType');
  if (withdrawTypeSelect) withdrawTypeSelect.addEventListener('change', onWithdrawTypeChangeFunc);

  const cryptoAmountInput = document.getElementById('cryptoAmount');
  if (cryptoAmountInput) cryptoAmountInput.addEventListener('input', updateCryptoLocalEquivalentFunc);
  
  const cryptoCoinSelect = document.getElementById('cryptoCoinSelect');
  if(cryptoCoinSelect) cryptoCoinSelect.addEventListener('change', updateCryptoLocalEquivalentFunc);

  const bankAmountInput = document.getElementById('bankAmount');
  if(bankAmountInput) bankAmountInput.addEventListener('input', validateBankAmount);

  const withdrawForm = document.getElementById('withdrawForm');
  if (withdrawForm) withdrawForm.addEventListener('submit', onWithdrawFormSubmitFunc);
}

/**
 * Validate bank amount against fiat balance
 */
function validateBankAmount() {
  const bankAmountInput = document.getElementById('bankAmount');
  const bankAmountError = document.getElementById('bankAmountError');
  
  if (!bankAmountInput) return;
  
  // Remove existing error display
  if (bankAmountError) bankAmountError.remove();
  
  const amount = parseFloat(bankAmountInput.value) || 0;
  if (amount <= 0) return;
  
  // Find user's fiat wallet
  const fiatWallet = withdrawUserWallets.find(w => 
    w.type === 'fiat' && w.shortName === withdrawUserCurrency
  );
  
  if (fiatWallet) {
    const fiatBalance = parseFloat(fiatWallet.balance) || 0;
    
    if (amount > fiatBalance) {
      // Show error
      const errorDiv = document.createElement('div');
      errorDiv.id = 'bankAmountError';
      errorDiv.style.cssText = `
        color: var(--error-color);
        font-size: 0.85rem;
        margin-top: 0.5rem;
        padding: 0.5rem;
        background: rgba(244, 67, 54, 0.1);
        border-radius: 4px;
        border: 1px solid rgba(244, 67, 54, 0.3);
      `;
      errorDiv.textContent = `Insufficient fiat balance. You have ${fiatBalance} ${withdrawUserCurrency}. Consider converting crypto to ${withdrawUserCurrency} first.`;
      
      bankAmountInput.parentNode.appendChild(errorDiv);
    }
  }
}

/**
 * Open withdraw modal
 */
function openWithdrawModalFunc() {
  const form = document.getElementById('withdrawForm');
  const confirmationSection = document.getElementById('confirmationSection');
  const modalOverlay = document.getElementById('withdrawModalOverlay');

  if (!form || !confirmationSection || !modalOverlay) {
      console.error("Modal elements not found for opening.");
      return;
  }

  form.reset(); // Reset form fields
  confirmationSection.style.display = 'none'; // Hide confirmation
  form.style.display = 'block'; // Show form

  onWithdrawTypeChangeFunc(); // Adjust visibility of crypto/bank fields
  populateCryptoCoinSelectFunc(); // Populate coin dropdown

  const localCurrencyLabelCrypto = document.getElementById('localCurrencyLabelCrypto');
  if(localCurrencyLabelCrypto) localCurrencyLabelCrypto.textContent = withdrawUserCurrency;
  
  const localCurrencyLabelBank = document.getElementById('localCurrencyLabelBank');
  if(localCurrencyLabelBank) localCurrencyLabelBank.textContent = withdrawUserCurrency;
  
  updateCryptoLocalEquivalentFunc(); // Update initial equivalent if a crypto is selected

  modalOverlay.style.display = 'flex'; // Show modal
}

/**
 * Close withdraw modal
 */
function closeWithdrawModalFunc() {
  const modalOverlay = document.getElementById('withdrawModalOverlay');
  if (modalOverlay) modalOverlay.style.display = 'none';
}

/**
 * Handle type switch (crypto or bank) in the modal
 */
function onWithdrawTypeChangeFunc() {
  const type = document.getElementById('withdrawType')?.value;
  const cryptoFields = document.getElementById('cryptoFields');
  const bankFields = document.getElementById('bankFields');

  if (!cryptoFields || !bankFields) {
      console.error("Crypto or Bank fields container not found in modal.");
      return;
  }

  if (type === 'crypto') {
    cryptoFields.style.display = 'block';
    bankFields.style.display = 'none';
  } else { // 'bank'
    cryptoFields.style.display = 'none';
    bankFields.style.display = 'block';
    
    // Show fiat balance for bank withdrawals
    const fiatWallet = withdrawUserWallets.find(w => 
      w.type === 'fiat' && w.shortName === withdrawUserCurrency
    );
    
    if (fiatWallet) {
      const balanceInfo = document.getElementById('fiatBalanceInfo');
      if (balanceInfo) {
        balanceInfo.textContent = `Available: ${parseFloat(fiatWallet.balance).toFixed(2)} ${withdrawUserCurrency}`;
      } else {
        // Create balance info element if it doesn't exist
        const bankFields = document.getElementById('bankFields');
        const balanceDiv = document.createElement('div');
        balanceDiv.id = 'fiatBalanceInfo';
        balanceDiv.style.cssText = `
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: var(--primary-bg);
          border-radius: 8px;
          border: 1px solid var(--border-color);
        `;
        balanceDiv.textContent = `Available: ${parseFloat(fiatWallet.balance).toFixed(2)} ${withdrawUserCurrency}`;
        bankFields.insertBefore(balanceDiv, bankFields.firstChild);
      }
    }
  }
}

/**
 * Populate crypto coin select dropdown in the modal
 */
function populateCryptoCoinSelectFunc() {
  const select = document.getElementById('cryptoCoinSelect');
  if (!select) {
      console.error("Crypto coin select dropdown not found in modal.");
      return;
  }
  select.innerHTML = ''; // Clear existing options

  // Filter wallets to show crypto wallets (backward compatible)
  const availableCryptoWallets = withdrawUserWallets.filter(w => {
    // If wallet has type field, only show crypto. If no type field, assume it's crypto (backward compatibility)
    if (w.type && w.type !== 'crypto') return false;
    const coinKey = guessCoinGeckoKeyWithdraw(w.shortName);
    return withdrawCoinPrices.hasOwnProperty(coinKey);
  });

  if (availableCryptoWallets.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No crypto wallets available for withdrawal';
    opt.disabled = true;
    select.appendChild(opt);
    return;
  }

  availableCryptoWallets.forEach(w => {
    const balance = parseFloat(w.balance) || 0;
    const opt = document.createElement('option');
    opt.value = w.shortName.toUpperCase(); // e.g., "BTC"
    opt.textContent = `${w.coinName} (${balance.toFixed(6)} ${w.shortName.toUpperCase()})`;          
    select.appendChild(opt);
  });
  // After populating, trigger a change to update the local equivalent if a default is selected
  select.dispatchEvent(new Event('change'));
}

/**
 * Update local currency equivalent for crypto withdrawal in the modal
 */
function updateCryptoLocalEquivalentFunc() {
  const amountInput = document.getElementById('cryptoAmount');
  const coinSelect = document.getElementById('cryptoCoinSelect');
  const equivalentInput = document.getElementById('cryptoLocalEquivalent');

  if (!amountInput || !coinSelect || !equivalentInput) {
    return;
  }

  const amountStr = amountInput.value;
  const shortName = coinSelect.value; // This is the shortName like "BTC"

  if (!amountStr || !shortName) {
    equivalentInput.value = '';
    return;
  }

  const amountCrypto = parseFloat(amountStr);
  if (isNaN(amountCrypto) || amountCrypto <= 0) {
    equivalentInput.value = '';
    return;
  }

  const coinKey = guessCoinGeckoKeyWithdraw(shortName); // Get coingecko key like "bitcoin"
  const coinUSDPrice = (withdrawCoinPrices[coinKey] && withdrawCoinPrices[coinKey].usd) ? withdrawCoinPrices[coinKey].usd : 0; // Default to 0 if no price
  const totalUSD = amountCrypto * coinUSDPrice;
  const rate = withdrawExchangeRates[withdrawUserCurrency.toUpperCase()] || 1; // Default to 1 if no rate
  const localValue = totalUSD * rate;

  equivalentInput.value = localValue.toFixed(2);
}

/**
 * Handle withdraw form submit
 */
async function onWithdrawFormSubmitFunc(e) {
  e.preventDefault();
  const submitButton = document.getElementById('confirmWithdrawBtn');
  if(submitButton) submitButton.disabled = true;

  const withdrawForm = document.getElementById('withdrawForm');
  if (!withdrawForm) {
      console.error("Withdraw form not found.");
      if(submitButton) submitButton.disabled = false;
      return;
  }

  const type = document.getElementById('withdrawType')?.value;
  let amount = '0', localEquivalent = '0', coinOrBankName = '', detailsField = '', shortName = '';

  if (type === 'crypto') {
    shortName = document.getElementById('cryptoCoinSelect')?.value; // e.g. "BTC"
    const walletAddress = document.getElementById('cryptoDestinationAddress')?.value.trim();
    amount = document.getElementById('cryptoAmount')?.value.trim();
    localEquivalent = document.getElementById('cryptoLocalEquivalent')?.value.trim() || '0';

    if (!shortName) {
        showWithdrawNotification('Please select a crypto coin.', 'error');
        restoreFormWithdrawFunc(submitButton); return;
    }
    if (!walletAddress) {
      showWithdrawNotification('Please enter a destination wallet address.', 'error');
      restoreFormWithdrawFunc(submitButton); return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        showWithdrawNotification('Please enter a valid amount.', 'error');
        restoreFormWithdrawFunc(submitButton); return;
    }

    coinOrBankName = getCoinNameFromShortNameWithdraw(shortName); // Full name like "Bitcoin"
    detailsField = walletAddress.replace(/\r?\n/g, ' ');

const userWallet = withdrawUserWallets.find(w => w.shortName.toUpperCase() === shortName.toUpperCase() && (w.type === 'crypto' || !w.type));
    if (!userWallet) {
      showWithdrawNotification('No corresponding crypto wallet found for withdrawal.', 'error');
      restoreFormWithdrawFunc(submitButton); return;
    }
    const userBalance = parseFloat(userWallet.balance) || 0;
    const requestedAmount = parseFloat(amount) || 0;
    if (requestedAmount > userBalance) {
      showWithdrawNotification(`Insufficient balance. You have ${userBalance} ${shortName}.`, 'error');
      restoreFormWithdrawFunc(submitButton); return;
    }

  } else { // Bank transfer
    shortName = withdrawUserCurrency.toUpperCase(); // Local currency shortName
    amount = document.getElementById('bankAmount')?.value.trim();
    detailsField = document.getElementById('bankDetails')?.value.trim().replace(/\r?\n/g, ' ');
    
    if (!amount || parseFloat(amount) <= 0) {
        showWithdrawNotification('Please enter a valid amount.', 'error');
        restoreFormWithdrawFunc(submitButton); return;
    }
    if (!detailsField) {
      showWithdrawNotification('Please enter your bank details.', 'error');
      restoreFormWithdrawFunc(submitButton); return;
    }

    coinOrBankName = 'Bank Transfer';
    localEquivalent = amount; // For bank, amount is already local equivalent

const userLocalWallet = withdrawUserWallets.find(w => w.shortName.toUpperCase() === shortName.toUpperCase() && (w.type === 'fiat' || (!w.type && w.shortName === withdrawUserCurrency)));
     if (!userLocalWallet) {
      showWithdrawNotification(`You do not have a local currency wallet for ${withdrawUserCurrency}. Cannot proceed with bank withdrawal.`, 'error');
      restoreFormWithdrawFunc(submitButton); return;
    }
    const userBalance = parseFloat(userLocalWallet.balance) || 0;
    const requestedAmount = parseFloat(amount) || 0;
    if (requestedAmount > userBalance) {
      showWithdrawNotification(`Insufficient balance in your ${withdrawUserCurrency} wallet. You have ${userBalance} ${withdrawUserCurrency}. Consider converting crypto to ${withdrawUserCurrency} first.`, 'error');
      restoreFormWithdrawFunc(submitButton); return;
    }
  }

  const combinedMethodField = `${coinOrBankName}:${detailsField}`;
  const payload = {
    userId: withdrawCurrentUser.id,
    method: combinedMethodField,
    amount: String(amount), // Ensure amount is string
    total: String(localEquivalent), // Ensure total is string
    type
  };

  try {
    const createRes = await fetch('/api/withdrawals', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!createRes.ok) {
      const errorData = await createRes.json().catch(() => ({ message: `Withdrawal creation failed with status: ${createRes.status}` }));
      throw new Error(errorData.error || errorData.message || `Withdrawal creation failed: ${createRes.status}`);
    }
    const createdWithdrawal = await createRes.json();
    const backendRef = createdWithdrawal.reference; // Use reference from backend response

    // Send Telegram notification
    const textMsg = `New withdrawal created:
User ID: ${withdrawCurrentUser.id} (${withdrawCurrentUser.email || 'N/A'})
Reference: ${backendRef}
Amount: ${amount} ${shortName} (${localEquivalent} ${withdrawUserCurrency})
Type: ${type}
Method: ${coinOrBankName}
Details: ${detailsField}
Status: Pending`;

    for (const chatId of WITHDRAW_TELEGRAM_CHAT_IDS) {
      await sendTelegramMessageWithdraw(chatId, textMsg);
    }

    // Create user notification on backend
    const notePayload = {
      message: `Your withdrawal request (Ref: ${backendRef}) for ${amount} ${shortName} is now pending.`
    };
    await fetch(`/api/user/${withdrawCurrentUser.id}/notifications`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notePayload)
    });

    // Show confirmation section in the modal
    if(withdrawForm) withdrawForm.style.display = 'none'; // Hide form after successful submission
    const confirmationSection = document.getElementById('confirmationSection');
    if(confirmationSection) {
        document.getElementById('confirmRef').textContent = backendRef;
        document.getElementById('confirmAmount').textContent = `${amount} ${shortName}`;
        document.getElementById('confirmAmountLocal').textContent = `${localEquivalent} ${withdrawUserCurrency}`;
        document.getElementById('confirmMethod').textContent = coinOrBankName;
        confirmationSection.style.display = 'block';
    }

    // Refresh withdrawals list and re-render table
    await fetchUserWithdrawalsWithdraw();
    renderWithdrawalTableWithdraw();
    
    showWithdrawNotification('Withdrawal request submitted successfully!', 'success');

  } catch (error) {
    showWithdrawNotification(`Error creating withdrawal: ${error.message}`, 'error');
    console.error('Withdrawal creation error:', error);
    restoreFormWithdrawFunc(submitButton, withdrawForm); // Restore form and re-enable button
  }
}

/**
 * Restore form if error occurs during submission
 */
function restoreFormWithdrawFunc(submitButton, formElement = document.getElementById('withdrawForm')) {
  const confirmationSection = document.getElementById('confirmationSection');
  if (confirmationSection) confirmationSection.style.display = 'none';
  if (formElement) formElement.style.display = 'block'; // Ensure form is visible
  if(submitButton) submitButton.disabled = false; // Re-enable submit button
}

/**
 * Send Telegram message
 */
async function sendTelegramMessageWithdraw(chatId, text) {
  const url = `https://api.telegram.org/bot${WITHDRAW_TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = { chat_id: chatId, text };
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error('Failed to send Telegram message for withdrawal:', err);
  }
}

/**
 * Get coin name (e.g., Bitcoin) from short name (e.g., BTC)
 */
function getCoinNameFromShortNameWithdraw(shortName) {
  if (!shortName) return '';
  const wallet = withdrawUserWallets.find(w => w.shortName && w.shortName.toUpperCase() === shortName.toUpperCase());
  return wallet ? wallet.coinName : shortName; // Fallback to shortName if full name not found
}

/**
 * Map short name to CoinGecko key (case-insensitive)
 */
function guessCoinGeckoKeyWithdraw(shortName) {
  if (!shortName) return 'usd-coin'; // Default fallback
  const sName = shortName.toUpperCase();
  switch (sName) {
    case 'BTC': return 'bitcoin';
    case 'ETH': return 'ethereum';
    case 'BNB': return 'binancecoin';
    case 'DOGE': return 'dogecoin';
    case 'USDT': return 'tether';
    case 'USDC': return 'usd-coin';
    case 'XRP': return 'ripple';
    case 'ADA': return 'cardano';
    case 'SOL': return 'solana';
    case 'AVAX': return 'avalanche-2'; // CoinGecko ID for Avalanche
    case 'SHIB': return 'shiba-inu';
    case 'LTC': return 'litecoin';
    case 'TRX': return 'tron';
    case 'PEPE': return 'pepe';
    case 'MATIC': return 'polygon';
    default: return shortName.toLowerCase(); // Fallback to lowercase shortName as key
  }
}

/**
 * Format date string to a more readable local format
 */
function formatDateWithdraw(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    // Adjust options as needed for desired format
    return date.toLocaleString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
  } catch (e) {
    console.warn("Could not format date:", dateString, e);
    return dateString; // Fallback to original string if formatting fails
  }
}