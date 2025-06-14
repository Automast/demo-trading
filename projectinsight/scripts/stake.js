/**
 * Stake Page JavaScript
 * Handles all staking functionality including pools display, staking, and unstaking
 */

// Global state
let currentStakeData = null;
let currentUserWallets = [];
let currentUserCurrency = 'USD';

// Staking pool configurations
const STAKING_POOLS = [
  {
    coinName: 'Avalanche',
    symbol: 'AVAX',
    minimum: 1000,
    maximum: 9000,
    cycle: 'Daily',
    roi: 84,
    icon: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png'
  },
  {
    coinName: 'Ethereum',
    symbol: 'ETH', 
    minimum: 1,
    maximum: 10,
    cycle: 'Daily',
    roi: 33,
    icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
  },
  {
    coinName: 'Polygon',
    symbol: 'MATIC',
    minimum: 87,
    maximum: 40000,
    cycle: 'Daily',
    roi: 64,
    icon: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png'
  },
  {
    coinName: 'Solana',
    symbol: 'SOL',
    minimum: 6,
    maximum: 180,
    cycle: 'Daily',
    roi: 45,
    icon: 'https://assets.coingecko.com/coins/images/4128/large/solana.png'
  },
  {
    coinName: 'Tether',
    symbol: 'USDT',
    minimum: 5000,
    maximum: 50000,
    cycle: 'Daily', 
    roi: 58,
    icon: 'https://assets.coingecko.com/coins/images/325/large/Tether.png'
  }
];

/**
 * Initialize the stake page
 */
window.initializeStakePage = async function() {
  console.log('🔄 Initializing stake page...');
  
  try {
    // Load initial data
    await loadStakeData();
    
    // Render staking pools
    renderStakingPools();
    
    // Setup event listeners
    setupStakeEventListeners();
    
    console.log('✅ Stake page initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing stake page:', error);
    
    // Show error in the UI instead of just console
    const stakingPools = document.getElementById('stakingPools');
    if (stakingPools) {
      stakingPools.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 3rem; color: var(--error-color);">
          <i class="material-icons" style="font-size: 4rem; margin-bottom: 1rem;">error_outline</i>
          <h3>Failed to Load Staking Data</h3>
          <p>Please try refreshing the page or contact support if the problem persists.</p>
          <button class="btn btn-primary" onclick="location.reload()">
            <i class="material-icons">refresh</i>
            Refresh Page
          </button>
        </div>
      `;
    }
  }
};

/**
 * Load staking data from the server
 */
async function loadStakeData() {
  console.log('🔍 Checking authentication...');
  console.log('window.currentUser:', window.currentUser);
  
  // Wait a bit for currentUser to be available
  let retries = 0;
  while ((!window.currentUser || !window.currentUser.id) && retries < 10) {
    console.log(`⏳ Waiting for authentication... (${retries + 1}/10)`);
    await new Promise(resolve => setTimeout(resolve, 500));
    retries++;
  }
  
  if (!window.currentUser || !window.currentUser.id) {
    console.error('❌ User still not authenticated after waiting');
    throw new Error('User not authenticated');
  }
  
  console.log('✅ User authenticated:', window.currentUser.id);

  try {
    console.log('🔄 Fetching staking overview...');
    const response = await fetch(`/api/user/${window.currentUser.id}/staking-overview`, {
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API response not ok:', response.status, errorText);
      throw new Error(`Failed to fetch staking data: ${response.status}`);
    }

    currentStakeData = await response.json();
    console.log('✅ Staking data loaded:', currentStakeData);
    
    currentUserWallets = currentStakeData.wallets || [];
    currentUserCurrency = currentStakeData.userCurrency || 'USD';
    
    // Update UI with fetched data
    updateStakeStats();
    
  } catch (error) {
    console.error('❌ Error loading stake data:', error);
    throw error;
  }
}

/**
 * Update stake statistics display
 */
function updateStakeStats() {
  if (!currentStakeData) return;
  
  const currencySymbol = getCurrencySymbol(currentUserCurrency);
  
  // Update total staking value
  const totalStakingEl = document.getElementById('totalStakingValue');
  if (totalStakingEl) {
    totalStakingEl.textContent = `${currencySymbol}${formatNumber(currentStakeData.totalStakingValue)}`;
  }
  
  // Update active stakings count
  const activeCountEl = document.getElementById('activeStakingsCount');
  if (activeCountEl) {
    activeCountEl.textContent = currentStakeData.activeStakingsCount;
  }
  
  // Update closed stakings count
  const closedCountEl = document.getElementById('closedStakingsCount');
  if (closedCountEl) {
    closedCountEl.textContent = currentStakeData.closedStakingsCount;
  }
}

/**
 * Render staking pools
 */
function renderStakingPools() {
  const container = document.getElementById('stakingPools');
  if (!container) return;
  
  const poolsHTML = STAKING_POOLS.map(pool => {
    const userWallet = getUserWalletForSymbol(pool.symbol);
    const currentBalance = userWallet ? parseFloat(userWallet.balance) || 0 : 0;
    const hasActiveStake = hasActiveStakeForCoin(pool.symbol);
    
    return `
      <div class="stake-pool-card">
        <div class="pool-header">
          <div class="pool-icon">
            <img src="${pool.icon}" alt="${pool.coinName}" onerror="this.src='https://via.placeholder.com/48x48/00bcd4/ffffff?text=${pool.symbol}'">
          </div>
          <div class="pool-info">
            <h3>${pool.coinName}</h3>
            <div class="pool-symbol">${pool.symbol}</div>
          </div>
        </div>
        
        <div class="pool-details">
          <div class="pool-detail">
            <span class="detail-label">Minimum</span>
            <span class="detail-value">${formatNumber(pool.minimum)} ${pool.symbol}</span>
          </div>
          <div class="pool-detail">
            <span class="detail-label">Maximum</span>
            <span class="detail-value">${formatNumber(pool.maximum)} ${pool.symbol}</span>
          </div>
          <div class="pool-detail">
            <span class="detail-label">Cycle</span>
            <span class="detail-value">${pool.cycle}</span>
          </div>
          <div class="pool-detail">
            <span class="detail-label">APR</span>
            <span class="roi-badge">${pool.roi}%</span>
          </div>
          <div class="pool-detail">
            <span class="detail-label">Your Balance</span>
            <span class="detail-value">${formatNumber(currentBalance)} ${pool.symbol}</span>
          </div>
        </div>
        
        <button class="stake-button ${hasActiveStake ? 'disabled' : ''}" 
                onclick="openStakeModal('${pool.symbol}')"
                ${hasActiveStake ? 'disabled' : ''}>
          <i class="material-icons">lock</i>
          ${hasActiveStake ? 'Already Staked' : 'Stake'}
        </button>
      </div>
    `;
  }).join('');
  
  container.innerHTML = poolsHTML;
}

/**
 * Setup event listeners
 */
function setupStakeEventListeners() {
  // View stakings button
  const viewStakingsBtn = document.getElementById('viewStakingsBtn');
  if (viewStakingsBtn) {
    viewStakingsBtn.addEventListener('click', openViewStakesModal);
  }
  
  // Close stake modal
  const closeStakeModal = document.getElementById('closeStakeModal');
  if (closeStakeModal) {
    closeStakeModal.addEventListener('click', closeStakeModalFunc);
  }
  
  // Close view stakes modal
  const closeViewStakesModal = document.getElementById('closeViewStakesModal');
  if (closeViewStakesModal) {
    closeViewStakesModal.addEventListener('click', closeViewStakesModalFunc);
  }
  
  // Stake form submission
  const stakeForm = document.getElementById('stakeForm');
  if (stakeForm) {
    stakeForm.addEventListener('submit', handleStakeSubmission);
  }
  
  // Amount input for estimated returns calculation
  const stakeAmountInput = document.getElementById('stakeAmount');
  const stakeDurationSelect = document.getElementById('stakeDuration');
  
  if (stakeAmountInput && stakeDurationSelect) {
    stakeAmountInput.addEventListener('input', updateEstimatedReturns);
    stakeDurationSelect.addEventListener('change', updateEstimatedReturns);
  }
  
  // Close modals when clicking overlay
  const stakeModalOverlay = document.getElementById('stakeModalOverlay');
  if (stakeModalOverlay) {
    stakeModalOverlay.addEventListener('click', (e) => {
      if (e.target === stakeModalOverlay) {
        closeStakeModalFunc();
      }
    });
  }
  
  const viewStakesModalOverlay = document.getElementById('viewStakesModalOverlay');
  if (viewStakesModalOverlay) {
    viewStakesModalOverlay.addEventListener('click', (e) => {
      if (e.target === viewStakesModalOverlay) {
        closeViewStakesModalFunc();
      }
    });
  }
}

/**
 * Open stake modal for specific coin
 */
window.openStakeModal = function(coinSymbol) {
  const pool = STAKING_POOLS.find(p => p.symbol === coinSymbol);
  const userWallet = getUserWalletForSymbol(coinSymbol);
  
  if (!pool) {
    showStakeError(`Pool not found for ${coinSymbol}`);
    return;
  }
  
  if (hasActiveStakeForCoin(coinSymbol)) {
    showStakeError(`You already have an active ${coinSymbol} stake`);
    return;
  }
  
  const currentBalance = userWallet ? parseFloat(userWallet.balance) || 0 : 0;
  
  // Update modal content
  const modalTitle = document.getElementById('stakeModalTitle');
  const currencySymbol = document.getElementById('stakeCurrencySymbol');
  const currentBalanceEl = document.getElementById('currentBalance');
  const roiDisplay = document.getElementById('roiDisplay');
  const stakeAmountInput = document.getElementById('stakeAmount');
  
  if (modalTitle) modalTitle.textContent = `Stake ${coinSymbol}`;
  if (currencySymbol) currencySymbol.textContent = coinSymbol;
  if (currentBalanceEl) currentBalanceEl.textContent = `${formatNumber(currentBalance)} ${coinSymbol}`;
  if (roiDisplay) roiDisplay.textContent = `${pool.roi}%`;
  if (stakeAmountInput) {
    stakeAmountInput.setAttribute('data-coin', coinSymbol);
    stakeAmountInput.setAttribute('data-roi', pool.roi);
    stakeAmountInput.value = '';
  }
  
  // Reset estimated returns
  const estimatedReturns = document.getElementById('estimatedReturns');
  if (estimatedReturns) estimatedReturns.textContent = `0 ${coinSymbol}`;
  
  // Show modal
  const modalOverlay = document.getElementById('stakeModalOverlay');
  if (modalOverlay) {
    modalOverlay.style.display = 'flex';
    setTimeout(() => modalOverlay.style.opacity = '1', 10);
  }
};

/**
 * Close stake modal
 */
function closeStakeModalFunc() {
  const modalOverlay = document.getElementById('stakeModalOverlay');
  if (modalOverlay) {
    modalOverlay.style.opacity = '0';
    setTimeout(() => modalOverlay.style.display = 'none', 300);
  }
}

/**
 * Open view stakes modal
 */
function openViewStakesModal() {
  if (!currentStakeData) {
    showStakeError('No staking data available');
    return;
  }
  
  renderStakesTable();
  
  const modalOverlay = document.getElementById('viewStakesModalOverlay');
  if (modalOverlay) {
    modalOverlay.style.display = 'flex';
    setTimeout(() => modalOverlay.style.opacity = '1', 10);
  }
}

/**
 * Close view stakes modal
 */
function closeViewStakesModalFunc() {
  const modalOverlay = document.getElementById('viewStakesModalOverlay');
  if (modalOverlay) {
    modalOverlay.style.opacity = '0';
    setTimeout(() => modalOverlay.style.display = 'none', 300);
  }
}

/**
 * Render stakes table
 */
function renderStakesTable() {
  const container = document.getElementById('stakesTableContainer');
  if (!container || !currentStakeData) return;
  
  const allStakes = [...currentStakeData.activeStakes, ...currentStakeData.completedStakes];
  
  if (allStakes.length === 0) {
    container.innerHTML = `
      <div class="text-center" style="padding: 3rem;">
        <i class="material-icons" style="font-size: 4rem; color: var(--text-secondary); margin-bottom: 1rem;">inbox</i>
        <h3 style="color: var(--text-secondary);">No Stakes Yet</h3>
        <p style="color: var(--text-secondary);">Start staking to see your stakes here</p>
      </div>
    `;
    return;
  }
  
  const tableHTML = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Coin</th>
            <th>Amount</th>
            <th>Duration</th>
            <th>APR</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Estimated Returns</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${allStakes.map(stake => `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <img src="${getPoolIcon(stake.coinSymbol)}" style="width: 24px; height: 24px; border-radius: 50%;" 
                       onerror="this.src='https://via.placeholder.com/24x24/00bcd4/ffffff?text=${stake.coinSymbol}'">
                  ${stake.coinSymbol}
                </div>
              </td>
              <td>${formatNumber(parseFloat(stake.amount))} ${stake.coinSymbol}</td>
              <td>${stake.duration} day${stake.duration > 1 ? 's' : ''}</td>
              <td>${stake.roiPercentage}%</td>
              <td>${formatDate(stake.startDate)}</td>
              <td>${formatDate(stake.endDate)}</td>
              <td>${formatNumber(parseFloat(stake.estimatedReturns))} ${stake.coinSymbol}</td>
              <td>
                <span class="status-${stake.status === 'active' ? 'pending' : 'confirmed'}">
                  ${stake.status === 'active' ? 'Active' : 'Completed'}
                </span>
              </td>
              <td>
                ${stake.status === 'active' ? 
                  `<button class="btn btn-secondary btn-sm" onclick="unstakeEarly(${stake.id})">
                    <i class="material-icons">lock_open</i>
                    Unstake
                  </button>` : 
                  '<span style="color: var(--text-secondary);">-</span>'
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = tableHTML;
}

/**
 * Handle stake form submission
 */
async function handleStakeSubmission(e) {
  e.preventDefault();
  
  const stakeAmountInput = document.getElementById('stakeAmount');
  const stakeDurationSelect = document.getElementById('stakeDuration');
  const confirmButton = document.getElementById('confirmStakeBtn');
  
  if (!stakeAmountInput || !stakeDurationSelect) return;
  
  const coinSymbol = stakeAmountInput.getAttribute('data-coin');
  const roi = parseFloat(stakeAmountInput.getAttribute('data-roi'));
  const amount = parseFloat(stakeAmountInput.value);
  const duration = parseInt(stakeDurationSelect.value);
  
  if (!coinSymbol || !amount || !duration || !roi) {
    showStakeError('Please fill in all fields');
    return;
  }
  
  if (amount <= 0) {
    showStakeError('Amount must be greater than 0');
    return;
  }
  
  // Check balance
  const userWallet = getUserWalletForSymbol(coinSymbol);
  const currentBalance = userWallet ? parseFloat(userWallet.balance) || 0 : 0;
  
  if (currentBalance < amount) {
    showStakeError(`Insufficient balance. You have ${formatNumber(currentBalance)} ${coinSymbol}. Please deposit or convert more ${coinSymbol}.`);
    return;
  }
  
  // Check minimum/maximum
  const pool = STAKING_POOLS.find(p => p.symbol === coinSymbol);
  if (pool) {
    if (amount < pool.minimum) {
      showStakeError(`Minimum stake amount is ${formatNumber(pool.minimum)} ${coinSymbol}`);
      return;
    }
    if (amount > pool.maximum) {
      showStakeError(`Maximum stake amount is ${formatNumber(pool.maximum)} ${coinSymbol}`);
      return;
    }
  }
  
  // Show loading state
  const originalText = confirmButton.innerHTML;
  confirmButton.innerHTML = '<div class="loading-spinner"></div> Processing...';
  confirmButton.disabled = true;
  
  try {
    const response = await fetch('/api/stakes', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: window.currentUser.id,
        coinSymbol,
        amount: amount.toString(),
        duration,
        roiPercentage: roi.toString()
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create stake');
    }
    
    const result = await response.json();
    
    // Show success
    showStakeSuccess(`Successfully staked ${formatNumber(amount)} ${coinSymbol}! Estimated returns: ${formatNumber(parseFloat(result.estimatedReturns))} ${coinSymbol}`);
    
    // Refresh data
    await loadStakeData();
    renderStakingPools();
    
    // Close modal
    closeStakeModalFunc();
    
  } catch (error) {
    console.error('Stake submission error:', error);
    showStakeError(error.message);
  } finally {
    // Restore button
    confirmButton.innerHTML = originalText;
    confirmButton.disabled = false;
  }
}

/**
 * Update estimated returns display
 */
function updateEstimatedReturns() {
  const stakeAmountInput = document.getElementById('stakeAmount');
  const stakeDurationSelect = document.getElementById('stakeDuration');
  const estimatedReturns = document.getElementById('estimatedReturns');
  
  if (!stakeAmountInput || !stakeDurationSelect || !estimatedReturns) return;
  
  const amount = parseFloat(stakeAmountInput.value) || 0;
  const duration = parseInt(stakeDurationSelect.value) || 1;
  const roi = parseFloat(stakeAmountInput.getAttribute('data-roi')) || 0;
  const coinSymbol = stakeAmountInput.getAttribute('data-coin') || '';
  
  if (amount > 0 && roi > 0) {
    const returns = amount * (roi / 100) * duration / 365;
    estimatedReturns.textContent = `${formatNumber(returns)} ${coinSymbol}`;
  } else {
    estimatedReturns.textContent = `0 ${coinSymbol}`;
  }
}

/**
 * Unstake early (with confirmation)
 */
window.unstakeEarly = async function(stakeId) {
  if (!confirm('Are you sure you want to unstake early? You will not receive any rewards.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/stakes/${stakeId}/unstake`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to unstake');
    }
    
    const result = await response.json();
    
    showStakeSuccess(result.message);
    
    // Refresh data
    await loadStakeData();
    renderStakingPools();
    renderStakesTable();
    
  } catch (error) {
    console.error('Unstake error:', error);
    showStakeError(error.message);
  }
};

// Helper functions
function getUserWalletForSymbol(symbol) {
  return currentUserWallets.find(w => 
    w.shortName && w.shortName.toLowerCase() === symbol.toLowerCase() && 
    (w.type === 'crypto' || !w.type)
  );
}

function hasActiveStakeForCoin(coinSymbol) {
  if (!currentStakeData || !currentStakeData.activeStakes) return false;
  return currentStakeData.activeStakes.some(stake => 
    stake.coinSymbol === coinSymbol && stake.status === 'active'
  );
}

function getPoolIcon(symbol) {
  const pool = STAKING_POOLS.find(p => p.symbol === symbol);
  return pool ? pool.icon : `https://via.placeholder.com/24x24/00bcd4/ffffff?text=${symbol}`;
}

function getCurrencySymbol(currency) {
  const symbols = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
    'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥'
  };
  return symbols[currency] || currency + ' ';
}

function formatNumber(num) {
  if (!num || isNaN(num)) return '0.00';
  if (num < 0.01) return num.toFixed(6);
  if (num < 1) return num.toFixed(4);
  return parseFloat(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function showStakeError(message) {
  // You can implement a toast notification system here
  alert('Error: ' + message);
}

function showStakeSuccess(message) {
  // You can implement a toast notification system here
  alert('Success: ' + message);
}

// CSS for loading spinner
const style = document.createElement('style');
style.textContent = `
  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);