/**
 * Dashboard Main JavaScript
 * Handles SPA navigation, modals, and all dashboard functionality
 */

// Global state
let currentUser = null;
let currentPage = 'dashboard';
let isLoading = false;

// Convert page globals
let convertCoinPrices = {};
let convertExchangeRates = {};
let convertUserWallets = [];
let convertUserCurrency = 'USD';

// DOM elements
const loadingOverlay = document.getElementById('loadingOverlay');
const pageContent = document.getElementById('page-content');
const sidebar = document.getElementById('sidebar');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileClose = document.getElementById('mobileClose');
const notificationBtn = document.getElementById('notificationBtn');
const notificationPopup = document.getElementById('notificationPopup');
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const modalOverlay = document.getElementById('modalOverlay');

// Modal elements
const profileModal = document.getElementById('profileModal');
const settingsModal = document.getElementById('settingsModal');
const connectWalletModal = document.getElementById('connectWalletModal');
const referralsModal = document.getElementById('referralsModal');

/**
 * Initialize the dashboard
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading();
    
    // Ensure all modals are hidden initially
    initializeModals();
    
    // Check authentication
    await checkAuthentication();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial page based on hash or default to dashboard
    const initialPage = window.location.hash.replace('#', '') || 'dashboard';
    await loadPage(initialPage);
    
    // Load user data
    await loadUserData();
    
    hideLoading();
  } catch (error) {
    console.error('Dashboard initialization error:', error);
    handleAuthError();
  }
});

/**
 * Initialize modals to ensure they're hidden
 */
function initializeModals() {
  // Ensure all side modals are hidden initially
  const allModals = document.querySelectorAll('.side-modal');
  allModals.forEach(modal => {
    modal.classList.remove('active');
  });
  
  // Ensure modal overlay is hidden
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
  }
  
  // Ensure dropdowns are hidden
  if (notificationPopup) {
    notificationPopup.classList.remove('active');
  }
  
  if (profileDropdown) {
    profileDropdown.classList.remove('active');
  }
}

/**
 * Check if user is authenticated
 */
async function checkAuthentication() {
  try {
    const response = await fetch('/api/auth/me', { 
      credentials: 'include' 
    });
    
    if (!response.ok) {
      throw new Error('Not authenticated');
    }
    
    const data = await response.json();
    currentUser = data.user;
    
    // Update UI with user info
    updateUserInfo();
    
  } catch (error) {
    console.error('Authentication check failed:', error);
    throw error;
  }
}

/**
 * Load user data and update UI
 */
async function loadUserData() {
  if (!currentUser) return;
  
  try {
    // Update profile modal with user data
    document.getElementById('profileName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('firstName').value = currentUser.firstName || '';
    document.getElementById('lastName').value = currentUser.lastName || '';
    document.getElementById('email').value = currentUser.email || '';
    document.getElementById('phone').value = currentUser.phone || '';
    document.getElementById('country').value = currentUser.country || '';
    document.getElementById('accountCurrency').value = currentUser.accountCurrency || '';
    
// Load notifications
await loadNotifications();

// Set up real-time notification updates (every 30 seconds)
setInterval(async () => {
  await loadNotifications();
}, 30000);
    
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function updateUserInfo() {
  if (!currentUser) return;
  
  // Update any user-specific UI elements
  const userElements = document.querySelectorAll('[data-user-info]');
  userElements.forEach(element => {
    const field = element.dataset.userInfo;
    if (currentUser[field]) {
      element.textContent = currentUser[field];
    }
  });
  
  // Remove any profile text, keep only the icon
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    // Keep only the icon, remove any text content
    const icon = profileBtn.querySelector('.material-icons') || profileBtn.querySelector('i');
    if (icon) {
      profileBtn.innerHTML = '';
      profileBtn.appendChild(icon);
      
      // Ensure the icon shows the person icon
      icon.textContent = 'person';
      icon.className = 'material-icons';
    } else {
      // If no icon exists, create one
      profileBtn.innerHTML = '<i class="material-icons">person</i>';
    }
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Mobile menu toggle
  mobileMenuToggle?.addEventListener('click', toggleMobileMenu);
  mobileClose?.addEventListener('click', closeMobileMenu);
  
  // Navigation
  setupNavigation();
  
  // Header actions
  notificationBtn?.addEventListener('click', toggleNotifications);
  profileBtn?.addEventListener('click', toggleProfileDropdown);
  
  // Profile dropdown actions
  document.getElementById('profileSettingsBtn')?.addEventListener('click', openSettingsModal);
  document.getElementById('profileDetailsBtn')?.addEventListener('click', openProfileModal);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  
  // Modal close buttons
  setupModalCloseButtons();
  
  // Modal overlay click to close
  modalOverlay?.addEventListener('click', closeAllModals);
  
  // Prevent modal content clicks from closing modal
  document.querySelectorAll('.side-modal').forEach(modal => {
    modal.addEventListener('click', (e) => e.stopPropagation());
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', handleOutsideClick);
  
  // Handle browser back/forward
  window.addEventListener('popstate', handlePopState);
  
  // Referral link copy
  document.getElementById('copyReferralLink')?.addEventListener('click', copyReferralLink);
}

/**
 * Setup navigation event listeners
 */
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const page = item.dataset.page;
      if (!page) return;
      
      // Special handling for modal-based pages
      if (page === 'connect') {
        openConnectWalletModal();
        return;
      }
      
      if (page === 'referrals') {
        openReferralsModal();
        return;
      }
      
      // Regular page navigation
      await navigateToPage(page);
      
      // Close mobile menu if open
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    });
  });
}

/**
 * Setup modal close button event listeners
 */
function setupModalCloseButtons() {
  const closeButtons = [
    'closeNotifications',
    'closeProfileModal',
    'closeSettingsModal', 
    'closeConnectModal',
    'closeReferralsModal'
    // Note: Page-specific modal close buttons (like for withdraw) are handled by their respective JS files
  ];
  
  closeButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', closeAllModals);
    }
  });
}

/**
 * Navigate to a specific page
 */
async function navigateToPage(page) {
  if (isLoading) return;
  
  try {
    showLoading();
    
    // Update URL without reloading
    window.history.pushState({ page }, '', `#${page}`);
    
    // Load the page
    await loadPage(page);
    
    // Update active nav item
    updateActiveNavItem(page);
    
    hideLoading();
    
  } catch (error) {
    console.error(`Error navigating to ${page}:`, error);
    hideLoading();
  }
}

/**
 * Load page content
 */
async function loadPage(page) {
  currentPage = page;
  
  try {
    // Ensure user is authenticated before loading any page
    if (!currentUser) {
      console.error('No current user found, checking authentication...');
      try {
        await checkAuthentication();
      } catch (authError) {
        console.error('Authentication failed:', authError);
        handleAuthError();
        return;
      }
    }
    
    let content = '';
    
    switch (page) {
      case 'dashboard':
        content = await loadDashboardPage();
        break;
      case 'deposit':
        content = await loadDepositPage();
        break;
      case 'withdraw':
        content = await loadWithdrawPage();
        break;
      case 'assets':
        content = await loadAssetsPage();
        break;
      case 'markets':
        content = await loadMarketsPage();
        break;
      case 'trade':
        content = await loadTradePage();
        break;
      case 'convert':
        content = await loadConvertPage();
        break;
      case 'subscribe':
        content = await loadSubscribePage();
        break;
      case 'signals':
        content = await loadSignalsPage();
        break;
      case 'stake':
        content = await loadStakePage();
        break;
      case 'experts':
        content = await loadExpertsPage();
        break;
      default:
        content = await loadDashboardPage();
    }
    
    // Insert content and initialize page-specific functionality
    if (pageContent) {
        pageContent.innerHTML = content;
        
        // Add fade-in animation to content
        pageContent.style.opacity = '0';
        setTimeout(() => {
          pageContent.style.opacity = '1';
          pageContent.style.transition = 'opacity 0.3s ease';
        }, 50);
    } else {
        console.error("pageContent element not found in DOM");
    }
    
    // Small delay to ensure DOM is ready
    setTimeout(async () => {
      await initializePageFunctionality(page);
    }, 100);
    
  } catch (error) {
    console.error(`Error loading ${page} page:`, error);
    if(pageContent) {
        pageContent.innerHTML = `
        <div class="card">
            <div class="card-body text-center">
            <i class="material-icons" style="font-size: 3rem; color: var(--error-color); margin-bottom: 1rem;">error_outline</i>
            <h3>Failed to load page content</h3>
            <p class="text-muted">Please try again or contact support if the problem persists.</p>
            <button class="btn btn-primary" onclick="location.reload()">
                <i class="material-icons">refresh</i>
                Retry
            </button>
            </div>
        </div>
        `;
    }
  }
}

/**
 * Load Dashboard Page
 */
async function loadDashboardPage() {
  return `
    <style>
      .dashboard-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      
      .dashboard-left, .dashboard-right {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      
      .balance-section {
        background: var(--secondary-bg);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 1.5rem;
      }
      
      .total-balance {
        text-align: center;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
      }
      
      .balance-title {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .balance-amount {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--text-color);
        margin-bottom: 0.25rem;
      }
      
      .balance-change {
        font-size: 0.9rem;
        color: var(--success-color);
      }
      
      .individual-balances {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .balance-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: var(--primary-bg);
        border-radius: 8px;
        transition: all var(--transition-speed);
      }
      
      .balance-item:hover {
        background: var(--hover-bg);
        transform: translateY(-1px);
      }
      
      .balance-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      
      .balance-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        background: var(--accent-color);
        color: white;
      }
      
      .balance-details h4 {
        font-size: 0.9rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
      }
      
      .balance-details p {
        font-size: 0.8rem;
        color: var(--text-secondary);
        margin: 0;
      }
      
      .balance-value {
        text-align: right;
      }
      
      .balance-amount-small {
        font-weight: 600;
        color: var(--text-color);
      }
      
      .balance-usd {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }
      
      .portfolio-section {
        background: var(--secondary-bg);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 1.5rem;
        height: fit-content;
      }
      
      .portfolio-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      
      .portfolio-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-color);
      }
      
      .portfolio-chart {
        width: 100%;
        height: 200px;
        background: var(--primary-bg);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1rem;
        position: relative;
        overflow: hidden;
      }
      
      .portfolio-placeholder {
        text-align: center;
        color: var(--text-secondary);
      }
      
      .portfolio-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      
      .portfolio-stat {
        text-align: center;
        padding: 0.75rem;
        background: var(--primary-bg);
        border-radius: 8px;
      }
      
      .stat-value {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--accent-color);
      }
      
      .stat-label {
        font-size: 0.8rem;
        color: var(--text-secondary);
        margin-top: 0.25rem;
      }
      
      .trading-section {
        grid-column: 1 / -1;
        background: var(--secondary-bg);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 1.5rem;
        margin-top: 1rem;
      }
      
      .trading-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      
      .trading-progress {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      
      .progress-card {
        background: var(--primary-bg);
        border-radius: 12px;
        padding: 1.5rem;
      }
      
      .progress-title {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-bottom: 1rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--border-color);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.5rem;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent-color), #00acc1);
        transition: width 0.3s ease;
      }
      
      .progress-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-color);
      }
      
      .trading-widget-container {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      
      .chart-widget {
        background: #0A0E11;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        overflow: hidden;
        height: 460px;
      }
      
      .trading-widget {
        height: 460px;
      }
      
      .trading-iframe {
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 12px;
        background: var(--secondary-bg);
      }
      
      .trades-section {
        background: var(--primary-bg);
        border-radius: 12px;
        padding: 1rem;
      }
      
      .trades-tabs {
        display: flex;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 1rem;
      }
      
      .trade-tab {
        flex: 1;
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 0.9rem;
        transition: all var(--transition-speed);
        border-bottom: 2px solid transparent;
      }
      
      .trade-tab.active {
        color: var(--accent-color);
        border-bottom-color: var(--accent-color);
      }
      
      .trade-content {
        min-height: 150px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
      }
      
      @media (max-width: 768px) {
        .dashboard-container {
          grid-template-columns: 1fr;
        }
        
        .trading-widget-container {
          grid-template-columns: 1fr;
        }
        
        .chart-widget {
          height: 300px;
        }
        
        .trading-widget {
          height: 350px;
        }
        
        .trading-progress {
          grid-template-columns: 1fr;
        }
        
        .balance-amount {
          font-size: 2rem;
        }
      }
    </style>

    <div class="dashboard-header fade-in">
      <h1 class="dashboard-title">Welcome back, ${currentUser?.firstName || 'User'}!</h1>
      <p class="dashboard-subtitle">Here's what's happening with your portfolio today.</p>
    </div>

    <div class="dashboard-container fade-in">
      <!-- Left Side - Balances -->
      <div class="dashboard-left">
        <div class="balance-section">
          <div class="total-balance">
            <div class="balance-title">Total Balance</div>
            <div class="balance-amount" id="dashboardTotalBalance">$0.00</div>
            
          </div>
          
          <div class="individual-balances" id="dashboardIndividualBalances">
            <!-- Individual balances will be populated here -->
          </div>
        </div>
      </div>

      <!-- Right Side - Portfolio -->
      <div class="dashboard-right">
        <div class="portfolio-section">
          <div class="portfolio-header">
            <h3 class="portfolio-title">Portfolio</h3>
            <button class="btn btn-secondary btn-sm" onclick="navigateToPage('assets')">View All</button>
          </div>
          
          <div class="portfolio-chart" id="portfolioChart">
            <div class="portfolio-placeholder">
              <i class="material-icons" style="font-size: 3rem; opacity: 0.4;">pie_chart</i>
              <p>Portfolio visualization</p>
              <p style="font-size: 0.8rem;">Make some deposits to see your portfolio</p>
            </div>
          </div>
          
          <div class="portfolio-stats" id="portfolioStats">
<div class="portfolio-stat">
  <div class="stat-value" id="portfolioGainLoss">+$0.00</div>
  <div class="stat-label">Net Flow</div>
  <div class="stat-description" style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.25rem;">Deposits - Withdrawals</div>
</div>
            <div class="portfolio-stat">
              <div class="stat-value" id="portfolioCount">0</div>
              <div class="stat-label">Assets</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Trading Section -->
    <div class="trading-section fade-in">
      <div class="trading-header">
        <h3>Trading</h3>
        <button class="btn btn-primary" onclick="navigateToPage('trade')">
          <i class="material-icons">trending_up</i>
          Open Full Trading
        </button>
      </div>

      <!-- Trading Progress -->
      <div class="trading-progress">
        <div class="progress-card">
          <div class="progress-title">Trading Progress</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-value">0%</div>
        </div>
        <div class="progress-card">
          <div class="progress-title">Trading Strength</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-value">0%</div>
        </div>
      </div>

      <!-- Trading Widget Container -->
      <div class="trading-widget-container">
        <!-- Chart Widget -->
        <div class="chart-widget">
          <div class="tradingview-widget-container" style="height: 100%; width: 100%; padding: 8px;">
            <div class="tradingview-decoration-border" style="background: transparent; width: calc(100% - 16px); height: calc(100% - 16px); position: absolute; top: 8px; pointer-events: none; user-select: none; left: 8px; border-radius: 2px; padding: 8px; border: 2px solid var(--border-color);"></div>
            <iframe scrolling="no" allowtransparency="true" frameborder="0" src="https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#%7B%22autosize%22%3Atrue%2C%22symbol%22%3A%22BTC%22%2C%22interval%22%3A%22D%22%2C%22timezone%22%3A%22Etc%2FUTC%22%2C%22theme%22%3A%22dark%22%2C%22style%22%3A%221%22%2C%22backgroundColor%22%3A%22transparent%22%2C%22gridColor%22%3A%22rgba(255%2C255%2C255%2C0.1)%22%2C%22isTransparent%22%3Atrue%2C%22hide_top_toolbar%22%3Afalse%2C%22hide_side_toolbar%22%3Afalse%2C%22allow_symbol_change%22%3Afalse%2C%22support_host%22%3A%22https%3A%2F%2Fwww.tradingview.com%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%7D" title="advanced chart TradingView widget" style="user-select: none; box-sizing: border-box; display: block; height: 100%; width: 100%; background: transparent;"></iframe>
          </div>
        </div>

        <!-- Trading Widget -->
        <div class="trading-widget">
          <iframe 
            src="../trading-widget/index.html" 
            class="trading-iframe" 
            title="Trading Widget"
            scrolling="no">
          </iframe>
        </div>
      </div>

      <!-- Trades Section -->
      <div class="trades-section">
        <div class="trades-tabs">
          <button class="trade-tab active" id="dashboardOpenTradesTab">Open Trades</button>
          <button class="trade-tab" id="dashboardClosedTradesTab">Closed Trades</button>
        </div>
        <div class="trade-content" id="dashboardTradeContent">
          <div style="text-align: center;">
            <i class="material-icons" style="font-size: 2rem; opacity: 0.4;">trending_up</i>
            <p>No open trades yet</p>
            <p style="font-size: 0.8rem;">Start trading to see your positions here</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Load Deposit Page - EXACT structure from uncustomized version
 */
async function loadDepositPage() {
  return `
    <style>
      /* Deposit Modal CSS - EXACT from uncustomized version but with dashboard theme */
      .deposit-modal-overlay {
        position: fixed;
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%;
        background-color: rgba(0,0,0,0.7);
        display: none; 
        justify-content: center; 
        align-items: center;
        z-index: 999;
      }
      .deposit-modal {
        background: var(--secondary-bg);
        color: var(--text-color);
        padding: 25px;
        width: 450px;
        border-radius: 5px;
        border: 1px solid var(--border-color);
        position: relative;
        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
      }
      .deposit-modal h2 {
        margin-top: 0;
        margin-bottom: 20px;
        color: var(--text-color);
      }
      .deposit-modal .close-btn {
        position: absolute;
        top: 15px; 
        right: 15px;
        background: transparent;
        border: none;
        font-size: 22px;
        color: var(--text-color);
        cursor: pointer;
      }
      .deposit-modal .close-btn:hover {
          color: var(--accent-color);
      }
      .deposit-modal form {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      .deposit-modal label {
        font-weight: bold;
        margin-bottom: 5px;
        color: var(--text-secondary);
      }
      .deposit-modal select,
      .deposit-modal input[type="text"],
      .deposit-modal input[type="number"] {
        width: 100%;
        padding: 10px;
        box-sizing: border-box;
        background-color: var(--primary-bg);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 4px;
      }
      .deposit-modal input[readonly] {
          background-color: var(--hover-bg);
      }
      .copy-address-wrapper {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .copy-address-wrapper button {
          padding: 8px 12px;
          background-color: var(--secondary-bg);
          color: var(--text-color);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          cursor: pointer;
      }
      .copy-address-wrapper button:hover {
          background-color: var(--hover-bg);
      }
      .deposit-modal button[type="submit"] {
        align-self: flex-end;
        padding: 10px 20px;
        cursor: pointer;
        background-color: var(--accent-color);
        color: #fff;
        border: none;
        border-radius: 4px;
        margin-top: 10px;
      }
      .deposit-modal button[type="submit"]:hover {
        background-color: #00acc1;
      }
      .confirmation-section {
        margin-top: 20px;
        padding: 15px;
        border: 1px solid var(--border-color);
        border-radius: 5px;
        background-color: var(--primary-bg);
        display: none;
      }
      .confirmation-section p {
        margin: 8px 0;
        color: var(--text-color);
      }
      .confirmation-section strong {
          color: var(--accent-color);
      }
      .confirmation-section button {
          padding: 6px 10px;
          font-size: 0.9em;
          background-color: var(--secondary-bg);
          color: var(--text-color);
          border: 1px solid var(--border-color);
      }
      .confirmation-section button:hover {
          background-color: var(--hover-bg);
      }
      /* Status Colors - EXACT from uncustomized version with simplified names */
      .status-pending { 
        color: #ffc107; 
        background: rgba(255, 193, 7, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.85rem;
      }
      .status-confirmed { 
        color: #4caf50; 
        background: rgba(76, 175, 80, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.85rem;
      }
      .status-rejected { 
        color: #f44336; 
        background: rgba(244, 67, 54, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.85rem;
      }
      .status-canceled { 
        color: #9E9E9E; 
        background: rgba(158, 158, 158, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.85rem;
      }
    </style>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Deposit Funds</h2>
        <button class="btn btn-primary" id="openDepositBtn">
          <i class="material-icons">add</i>
          Make a Deposit
        </button>
      </div>
      <div class="card-body">
        <div class="form-container" style="max-width: 100%; margin: 0;">
          <div class="form-group">
            <input type="text" id="searchInput" class="form-control" placeholder="Search by reference/method/type..." />
          </div>
          <div class="form-group">
            <select id="statusFilter" class="form-control">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>

        <div class="table-container">
          <table class="table" id="depositTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Reference</th>
                <th>Method</th>
                <th>Type</th>
                <th>Amount</th>
                <th id="tableTotalHeader">Total (Local)</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <!-- Populated via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Overlay - EXACT structure from uncustomized version -->
    <div class="deposit-modal-overlay" id="depositModalOverlay">
      <div class="deposit-modal" id="depositModal">
        <button class="close-btn" id="modalCloseBtn">×</button>
        <h2>Create a Deposit</h2>

        <form id="depositForm">
          <div>
            <label>Type</label>
            <select id="depositType" name="type">
              <option value="crypto" selected>Crypto</option>
            </select>
          </div>

          <div>
            <label>Method (Select a Coin)</label>
            <select id="depositMethod" name="method">
              <!-- Populated by user wallets -->
            </select>
          </div>

          <div>
            <label>Wallet Address</label>
            <div class="copy-address-wrapper">
              <input type="text" id="depositAddress" readonly />
              <button type="button" id="copyAddressBtn">Copy</button>
            </div>
          </div>

          <div>
            <label>Amount (Crypto)</label>
            <input type="number" id="depositAmount" min="0" step="any" required />
          </div>

          <div>
            <label>Equivalent in <span id="localCurrencyLabel">USD</span></label>
            <input type="text" id="localCurrencyEquivalent" readonly />
          </div>

          <button type="submit" id="confirmDepositBtn">Deposit</button>
        </form>

        <!-- Confirmation section after form is submitted -->
        <div class="confirmation-section" id="confirmationSection">
          <p>Your deposit has been created!</p>
          <p><strong>Reference:</strong> <span id="confirmRef"></span></p>
          <p><strong>Amount (Crypto):</strong> <span id="confirmAmountCrypto"></span></p>
          <p><strong>Local Currency:</strong> <span id="confirmAmountLocal"></span></p>
          <p><strong>Address:</strong> <span id="confirmAddress"></span> <button id="copyConfirmAddressBtn">Copy</button></p>
          <p>Status: <strong>Pending</strong></p>
          <p>You may now send your crypto to the wallet address above.</p>
          <p>Close this popup to see the new deposit in your table.</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Load Withdraw Page - FIXED VERSION
 */
async function loadWithdrawPage() {
  return `
    <style>
      /* Withdraw Modal Specific Styles */
      .withdraw-modal-overlay {
        position: fixed;
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%;
        background-color: rgba(0,0,0,0.7);
        display: none; /* Initially hidden */
        justify-content: center; 
        align-items: center;
        z-index: 2500; /* Ensure it's above other elements if needed */
      }
      .withdraw-modal {
        background: var(--secondary-bg);
        color: var(--text-color);
        padding: 25px;
        width: 500px;
        max-width: 90vw;
        max-height: 90vh; /* Changed from 90vh */
        border-radius: 12px;
        border: 1px solid var(--border-color);
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        overflow-y: auto; /* Changed to auto */
      }
      .withdraw-modal h2 {
        margin-top: 0;
        margin-bottom: 20px;
        color: var(--text-color);
      }
      .withdraw-modal .close-btn { /* Changed from .close-modal to .close-btn for consistency */
        position: absolute;
        top: 15px; 
        right: 15px;
        background: transparent;
        border: none;
        font-size: 22px; /* Material icon size */
        color: var(--text-secondary); /* From main.css for .close-modal */
        cursor: pointer;
        border-radius: 8px; /* From main.css */
        padding: 0.5rem; /* From main.css */
        transition: all var(--transition-speed); /* From main.css */
      }
      .withdraw-modal .close-btn:hover {
        color: var(--text-color); /* From main.css */
        background-color: var(--hover-bg); /* From main.css */
      }
      .withdraw-modal form {
        display: flex;
        flex-direction: column;
        gap: 15px; /* Consistent gap */
      }
      .withdraw-modal .form-group { /* Added for consistency with other forms */
         margin-bottom: 0; /* Override main.css if needed, or rely on form gap */
      }
      .withdraw-modal label {
        font-weight: 500; /* From main.css .form-group label */
        margin-bottom: 0.5rem; /* From main.css .form-group label */
        color: var(--text-secondary); /* From main.css .form-group label */
        display: block; /* From main.css .form-group label */
      }
      .withdraw-modal select.form-control,
      .withdraw-modal input[type="text"].form-control,
      .withdraw-modal input[type="number"].form-control,
      .withdraw-modal textarea.form-control {
        width: 100%;
        padding: 0.75rem 1rem; /* From main.css .form-control */
        box-sizing: border-box;
        background-color: var(--primary-bg); /* From main.css .form-control */
        color: var(--text-color); /* From main.css .form-control */
        border: 1px solid var(--border-color); /* From main.css .form-control */
        border-radius: 8px; /* From main.css .form-control */
        font-size: 0.95rem; /* From main.css .form-control */
        transition: border-color var(--transition-speed); /* From main.css .form-control */
      }
      .withdraw-modal input.form-control:focus, /* Updated selector */
      .withdraw-modal select.form-control:focus, /* Updated selector */
      .withdraw-modal textarea.form-control:focus { /* Updated selector */
        outline: none;
        border-color: var(--accent-color);
        box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
      }
      .withdraw-modal input.form-control[readonly] { /* Updated selector */
        background-color: var(--hover-bg);
        cursor: not-allowed;
        opacity: 0.8;
      }
       .withdraw-modal button[type="submit"] { /* This is .btn .btn-primary .w-100 */
        padding: 0.75rem 1.5rem; /* From main.css .btn */
        border: none; /* From main.css .btn */
        border-radius: 8px; /* From main.css .btn */
        font-weight: 500; /* From main.css .btn */
        cursor: pointer; /* From main.css .btn */
        transition: all var(--transition-speed); /* From main.css .btn */
        text-decoration: none; /* From main.css .btn */
        display: inline-flex; /* From main.css .btn */
        align-items: center; /* From main.css .btn */
        gap: 0.5rem; /* From main.css .btn */
        font-size: 0.95rem; /* From main.css .btn */
        background: var(--accent-color); /* From main.css .btn-primary */
        color: white; /* From main.css .btn-primary */
        width: 100%; /* From .w-100 */
        justify-content: center; /* To center icon and text */
        margin-top: 10px; /* Spacing from form elements */
      }
      .withdraw-modal button[type="submit"]:hover:not(:disabled) {
        background: #00acc1; /* From main.css .btn-primary:hover */
        transform: translateY(-2px); /* From main.css .btn-primary:hover */
      }
      .withdraw-modal button[type="submit"]:disabled {
        background-color: var(--border-color); /* More subtle disabled state */
        cursor: not-allowed;
        opacity: 0.6;
        transform: none;
        box-shadow: none;
      }
      .confirmation-section { /* Style for confirmation message */
        margin-top: 20px;
        padding: 20px;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        background-color: var(--primary-bg);
        display: none; /* Initially hidden */
      }
      .confirmation-section p {
        margin: 8px 0;
        color: var(--text-color);
        line-height: 1.5;
      }
      .confirmation-section strong {
        color: var(--accent-color);
        font-weight: 600;
      }
      .confirmation-section h3 {
        color: var(--text-color);
        margin-bottom: 1.5rem;
        font-size: 1.25rem;
        text-align: center;
      }
      .confirmation-section .text-center {
        text-align: center;
      }
      .confirmation-section .material-icons { /* Icon styling for success message */
        font-size: 3rem !important; /* Material icon size */
        color: var(--success-color) !important; /* Success color */
        margin-bottom: 1rem;
        display: block; /* Center the icon */
        margin-left: auto;
        margin-right: auto;
      }
       .confirmation-section .info-box { /* For the processing time message */
        margin-top: 1.5rem; /* mt-3 */
        padding: 1rem; /* p-3 */
        background: rgba(0, 188, 212, 0.1); /* bg-primary (accent with alpha) */
        border-radius: 8px; /* rounded */
        border: 1px solid rgba(0, 188, 212, 0.2); /* Subtle border */
      }
      .confirmation-section .info-box p {
        margin-bottom: 0.5rem; /* mb-0 and spacing */
      }
      .confirmation-section .info-box p:last-child {
        margin-bottom: 0;
      }


      /* Status Colors - already in main.css but can be specified here if needed */
      /* .status-pending { ... } */
      /* .status-confirmed { ... } */
      /* .status-canceled { ... } */

      /* Responsive */
      @media (max-width: 768px) {
        .withdraw-modal {
          width: 95vw;
          margin: 1rem;
          padding: 20px;
        }
        .withdraw-modal form {
          gap: 12px;
        }
      }

      @media (max-width: 480px) {
        .withdraw-modal {
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          border-radius: 0;
          margin: 0;
        }
         .withdraw-modal .modal-header { /* Adjust padding for smaller screens */
            padding: 1rem;
        }
        .withdraw-modal .modal-content { /* Adjust padding for smaller screens */
            padding: 1rem;
        }
      }
    </style>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Withdraw Funds</h2>
        <button class="btn btn-primary" id="openWithdrawBtn">
          <i class="material-icons">remove</i>
          Make a Withdrawal
        </button>
      </div>
      <div class="card-body">
        <div class="form-container" style="max-width: 100%; margin: 0; display: flex; gap: 1rem; margin-bottom: 1.5rem;">
          <div class="form-group" style="flex: 1;">
            <input type="text" id="searchInput" class="form-control" placeholder="Search by reference/method/type..." />
          </div>
          <div class="form-group" style="flex: 1;">
            <select id="statusFilter" class="form-control">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="canceled">Canceled</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
        </div>

        <div class="table-container">
          <table class="table" id="withdrawTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Reference</th>
                <th>Method</th>
                <th>Type</th>
                <th>Amount</th>
                <th id="tableTotalHeader">Total (Local)</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <!-- Populated via JS -->
            </tbody>
          </table>
        </div>

        <div class="text-center mt-4" id="noWithdrawalsMsg" style="display: none;">
          <i class="material-icons" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;">receipt</i>
          <p class="text-muted">You have not made any withdrawals yet.</p>
        </div>
      </div>
    </div>

    <!-- Modal Overlay -->
    <div class="withdraw-modal-overlay" id="withdrawModalOverlay">
      <div class="withdraw-modal" id="withdrawModal">
         <div class="modal-header"> <!-- Standard modal header -->
            <h2>Create a Withdrawal</h2>
            <button class="close-btn" id="modalCloseBtn"> <!-- Changed from close-modal to close-btn -->
                <i class="material-icons">close</i>
            </button>
        </div>
        <div class="modal-content"> <!-- Standard modal content area -->
            <form id="withdrawForm">
            <div class="form-group">
                <label for="withdrawType">Type</label>
                <select id="withdrawType" name="type" class="form-control">
                <option value="crypto" selected>Crypto</option>
                <option value="bank">Bank Transfer</option>
                </select>
            </div>

            <!-- CRYPTO FIELDS -->
            <div id="cryptoFields">
                <div class="form-group">
                <label for="cryptoCoinSelect">Coin</label>
                <select id="cryptoCoinSelect" class="form-control"></select>
                </div>

                <div class="form-group">
                <label for="cryptoDestinationAddress">Destination Wallet Address</label>
                <input type="text" id="cryptoDestinationAddress" class="form-control" placeholder="Enter external wallet address" />
                </div>

                <div class="form-group">
                <label for="cryptoAmount">Amount (Crypto)</label>
                <input type="number" id="cryptoAmount" class="form-control" min="0" step="any" />
                </div>

                <div class="form-group">
                <label>Equivalent in <span id="localCurrencyLabelCrypto">USD</span></label>
                <input type="text" id="cryptoLocalEquivalent" class="form-control" readonly />
                </div>
            </div>

            <!-- BANK TRANSFER FIELDS -->
            <div id="bankFields" style="display: none;">
                <div class="form-group">
                <label for="bankAmount">Amount (<span id="localCurrencyLabelBank">USD</span>)</label>
                <input type="number" id="bankAmount" class="form-control" min="0" step="any" />
                </div>

                <div class="form-group">
                <label for="bankDetails">Bank Details</label>
                <textarea id="bankDetails" rows="3" class="form-control" placeholder="Account name, number, routing info, etc."></textarea>
                </div>
            </div>

            <button type="submit" id="confirmWithdrawBtn">
                <i class="material-icons">remove_circle_outline</i> <!-- Changed icon for withdraw -->
                Withdraw
            </button>
            </form>

            <!-- Confirmation section after form is submitted -->
            <div class="confirmation-section" id="confirmationSection">
            <div class="text-center">
                <i class="material-icons">check_circle</i>
                <h3>Withdrawal Created Successfully!</h3>
            </div>
            <div class="mt-3">
                <p><strong>Reference:</strong> <span id="confirmRef"></span></p>
                <p><strong>Amount:</strong> <span id="confirmAmount"></span></p>
                <p><strong>Local Currency:</strong> <span id="confirmAmountLocal"></span></p>
                <p><strong>Method:</strong> <span id="confirmMethod"></span></p>
                <p>Status: <strong>Pending</strong></p>
                <div class="info-box"> <!-- Used class for styling -->
                <p class="mb-0"><strong>Processing Time:</strong></p>
                <p class="mb-0">Your withdrawal will be processed within 24-48 hours.</p>
                <p class="mb-0">You will be notified once the withdrawal is processed.</p>
                <p class="mb-0">Close this popup to see the new withdrawal in your table.</p>
                </div>
            </div>
            </div>
        </div>
      </div>
    </div>
  `;
}


/**
 * Load Assets Page
 */
async function loadAssetsPage() {
  return `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Assets</h2>
        <div class="balance" id="totalBalanceDisplay">Total Balance: 0.00</div>
      </div>
      <div class="card-body">
        <div class="form-container" style="max-width: 100%; margin: 0;">
          <div class="form-group">
            <input type="text" id="searchBar" class="form-control" placeholder="Search assets..." />
          </div>
          <div class="form-group">
            <select id="filterSelect" class="form-control">
              <option value="All">All Types</option>
              <option value="Crypto">Crypto</option>
              <option value="Fiat">Fiat</option>
              <option value="Stocks">Stocks</option>
            </select>
          </div>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>★</th>
                <th>Asset</th>
                <th>Type</th>
                <th>Current Price (EUR)</th>
                <th>In Your Wallet</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="assetsTableBody">
              <!-- Populated by JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Recent Activity</h2>
      </div>
      <div class="card-body">
        <div id="notificationList">
          <!-- Populated by JS -->
        </div>
      </div>
    </div>
  `;
}

async function loadTradePage() {
  return `
    <style>
      :root {
        --trade-container-height: 460px; /* Change this value to adjust TradingView height */
      }
      
      .trade-page-container {
        display: flex;
        gap: 16px;
        height: var(--trade-container-height);
      }
      
.chart-section {
        flex: 1;
        background: #0A0E11;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        overflow: hidden;
        position: relative;
        height: var(--trade-container-height);
        backdrop-filter: blur(10px);
        background-image: linear-gradient(135deg, 
          rgba(0, 188, 212, 0.08) 0%, 
          transparent 40%, 
          rgba(0, 188, 212, 0.03) 100%);
      }
      
      .trading-section {
        width: 320px;
        flex-shrink: 0;
        height: var(--trade-container-height);
      }
      
      .trading-iframe {
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 8px;
        background: var(--secondary-bg);
      }
      
/* Fix TradingView widget styling */
      .tradingview-widget-container {
        height: 100% !important;
        width: 100% !important;
        background: transparent !important;
      }
      
      /* Remove white border and fix decorative elements */
      .tradingview-decoration-border {
        border: 2px solid var(--border-color) !important;
        background: transparent !important;
        opacity: 0.7;
      }
      
      .tradingview-overlay {
        background: transparent !important;
        mix-blend-mode: normal !important;
      }
      
      /* Make iframe transparent */
      .chart-section iframe {
        background: transparent !important;
        color-scheme: normal !important;
      }
      
      /* Ensure container shows through */
      .chart-section {
        background: var(--secondary-bg) !important;
        backdrop-filter: blur(5px);
      }
      
      .trades-management {
        margin-top: 16px;
        background: var(--secondary-bg);
        border-radius: 8px;
        border: 1px solid var(--border-color);
        height: 300px;
        display: flex;
        flex-direction: column;
      }
      
      .trades-header {
        display: flex;
        border-bottom: 1px solid var(--border-color);
        flex-shrink: 0;
      }
      
      .trades-tab {
        flex: 1;
        padding: 12px 16px;
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all var(--transition-speed);
        border-bottom: 2px solid transparent;
      }
      
      .trades-tab:hover {
        color: var(--text-color);
        background: var(--hover-bg);
      }
      
      .trades-tab.active {
        color: var(--accent-color);
        border-bottom-color: var(--accent-color);
      }
      
      .trades-content {
        padding: 16px;
        flex: 1;
        overflow-y: auto;
      }
      
      .trades-list {
        display: none;
        height: 100%;
      }
      
      .trades-list.active {
        display: block;
      }
      
      .trade-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid var(--border-color);
      }
      
      .trade-item:last-child {
        border-bottom: none;
      }
      
      .trade-info {
        flex: 1;
      }
      
      .trade-symbol {
        font-weight: 600;
        color: var(--text-color);
        margin-bottom: 4px;
        font-size: 13px;
      }
      
      .trade-details {
        font-size: 11px;
        color: var(--text-secondary);
      }
      
      .trade-pnl {
        text-align: right;
      }
      
      .trade-amount {
        font-weight: 600;
        margin-bottom: 4px;
        font-size: 12px;
      }
      
      .trade-profit {
        color: var(--success-color);
      }
      
      .trade-loss {
        color: var(--error-color);
      }
      
      .no-trades {
        text-align: center;
        padding: 30px 16px;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
      }
      
      .no-trades i {
        font-size: 2.5rem;
        margin-bottom: 0.8rem;
        opacity: 0.4;
        display: block;
      }
      
      /* Responsive Design */
      @media (max-width: 1024px) {
        :root {
          --trade-container-height: 600px; /* Smaller height for tablets */
        }
        
        .trade-page-container {
          flex-direction: column;
          gap: 16px;
          height: auto; /* Let it flow naturally on tablets/mobile */
        }
        
        .chart-section {
          order: 2;
          height: var(--trade-container-height);
        }
        
        .trading-section {
          order: 1;
          width: 100%;
          height: var(--trade-container-height);
        }
        
        .trades-management {
          order: 3;
          height: 250px;
        }
      }
      
      @media (max-width: 768px) {
        :root {
          --trade-container-height: 450px; /* Even smaller for mobile */
        }
        
        .chart-section {
          order: 1; /* TradingView first on mobile */
        }
        
        .trading-section {
          order: 2; /* Trading widget second on mobile */
        }
        
        .trades-content {
          padding: 12px;
        }
        
        .trades-management {
          order: 3;
          height: 200px;
        }
      }
      
      @media (max-width: 480px) {
        :root {
          --trade-container-height: 400px;
        }
        
        .trades-tab {
          padding: 10px 12px;
          font-size: 12px;
        }
      }
    </style>

 <div class="page-header fade-in">
      <h2 class="page-title">Trade</h2><br>

    </div>
    
    <div class="trade-page-container">
      <!-- Chart Section with Your Custom TradingView -->
      <div class="chart-section">
        <div class="tradingview-widget-container" style="height: 100%; width: 100%; padding: 8px; mix-blend-mode: lighten; position: relative; border-radius: 12px; background-color: transparent;">
          <div class="tradingview-decoration-border" style="background: transparent; width: calc(100% - 16px); height: calc(100% - 16px); position: absolute; top: 8px; pointer-events: none; user-select: none; left: 8px; border-radius: 2px; padding: 8px;"></div>
          <div class="tradingview-overlay" style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; pointer-events: none;"></div>
          <style>
            .tradingview-widget-copyright {
              font-size: 13px !important;
              line-height: 32px !important;
              text-align: center !important;
              vertical-align: middle !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif !important;
              color: #B2B5BE !important;
            }
            .tradingview-widget-copyright .blue-text {
              color: #2962FF !important;
            }
            .tradingview-widget-copyright a {
              text-decoration: none !important;
              color: #B2B5BE !important;
            }
            .tradingview-widget-copyright a:visited {
              color: #B2B5BE !important;
            }
            .tradingview-widget-copyright a:hover .blue-text {
              color: #1E53E5 !important;
            }
            .tradingview-widget-copyright a:active .blue-text {
              color: #1848CC !important;
            }
            .tradingview-widget-copyright a:visited .blue-text {
              color: #2962FF !important;
            }
          </style>
          <iframe scrolling="no" allowtransparency="true" frameborder="0" src="https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#%7B%22autosize%22%3Atrue%2C%22symbol%22%3A%22BTC%22%2C%22interval%22%3A%22D%22%2C%22timezone%22%3A%22Etc%2FUTC%22%2C%22theme%22%3A%22dark%22%2C%22style%22%3A%221%22%2C%22backgroundColor%22%3A%22transparent%22%2C%22gridColor%22%3A%22rgba(255%2C255%2C255%2C0.1)%22%2C%22isTransparent%22%3Atrue%2C%22hide_top_toolbar%22%3Afalse%2C%22hide_side_toolbar%22%3Afalse%2C%22allow_symbol_change%22%3Afalse%2C%22support_host%22%3A%22https%3A%2F%2Fwww.tradingview.com%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22utm_source%22%3A%22app.therealworldphrase.com%22%2C%22utm_medium%22%3A%22widget%22%2C%22utm_campaign%22%3A%22advanced-chart%22%2C%22page-uri%22%3A%22app.therealworldphrase.com%2Fdashboard%22%7D" title="advanced chart TradingView widget" lang="en" style="user-select: none; box-sizing: border-box; display: block; height: 100%; width: 100%; background: transparent;"></iframe>
        </div>
      </div>

      <!-- Trading Section -->
      <div class="trading-section">
        <iframe 
          src="../trading-widget/index.html" 
          class="trading-iframe" 
          title="Trading Widget"
          scrolling="no">
        </iframe>
      </div>
    </div>

    <!-- Trades Management -->
    <div class="trades-management">
      <div class="trades-header">
        <button class="trades-tab active" data-trades-tab="open">Open Trades</button>
        <button class="trades-tab" data-trades-tab="closed">Closed Trades</button>
      </div>
      
      <div class="trades-content">
<div class="trades-list active" id="open-trades">
          <div class="no-trades">
            <i class="material-icons">trending_up</i>
            <p>No open trades yet</p>
          </div>
        </div>
        
        <div class="trades-list" id="closed-trades">
          <div class="no-trades">
            <i class="material-icons">history</i>
            <p>No closed trades yet</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
async function loadConvertPage() {
  return `
    <style>
      .convert-container {
        max-width: 600px;
        margin: 0 auto;
      }
      .convert-card {
        background: var(--secondary-bg);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }
      .convert-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      .convert-header h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        background: linear-gradient(135deg, var(--accent-color), #00acc1);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .convert-header p {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
      .asset-selector {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .asset-group {
        background: var(--primary-bg);
        border-radius: 12px;
        padding: 1.5rem;
        border: 1px solid var(--border-color);
        transition: all var(--transition-speed);
      }
      .asset-group:hover {
        border-color: var(--accent-color);
        transform: translateY(-2px);
      }
      .asset-label {
        font-weight: 500;
        color: var(--text-secondary);
        font-size: 0.9rem;
        margin-bottom: 1rem;
        display: block;
      }
      .asset-input-group {
        display: flex;
        gap: 1rem;
        align-items: center;
      }
      .asset-select {
        flex: 1;
        padding: 0.75rem 1rem;
        background: var(--secondary-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-color);
        font-size: 0.95rem;
        transition: all var(--transition-speed);
      }
      .asset-select:focus {
        outline: none;
        border-color: var(--accent-color);
        box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
      }
      .amount-input {
        flex: 1;
        padding: 0.75rem 1rem;
        background: var(--secondary-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-color);
        font-size: 0.95rem;
        transition: all var(--transition-speed);
      }
      .amount-input:focus {
        outline: none;
        border-color: var(--accent-color);
        box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
      }
      .balance-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--border-color);
      }
      .balance-text {
        font-size: 0.85rem;
        color: var(--text-secondary);
      }
      .balance-amount {
        font-weight: 500;
        color: var(--accent-color);
      }
      .max-button {
        background: var(--accent-color);
        color: white;
        border: none;
        padding: 0.375rem 0.75rem;
        border-radius: 6px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all var(--transition-speed);
      }
      .max-button:hover {
        background: #00acc1;
        transform: scale(1.05);
      }
      .convert-arrow {
        display: flex;
        justify-content: center;
        margin: 1rem 0;
      }
      .arrow-button {
        background: var(--accent-color);
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all var(--transition-speed);
        box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
      }
      .arrow-button:hover {
        background: #00acc1;
        transform: rotate(180deg) scale(1.1);
      }
      .conversion-summary {
        background: linear-gradient(135deg, rgba(0, 188, 212, 0.1), rgba(0, 172, 193, 0.05));
        border: 1px solid rgba(0, 188, 212, 0.2);
        border-radius: 12px;
        padding: 1.5rem;
        margin: 1.5rem 0;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      .summary-row:last-child {
        margin-bottom: 0;
        padding-top: 0.75rem;
        border-top: 1px solid rgba(0, 188, 212, 0.2);
        font-weight: 600;
      }
      .summary-label {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
      .summary-value {
        color: var(--text-color);
        font-weight: 500;
      }
      .rate-value {
        color: var(--accent-color);
        font-weight: 600;
      }
      .convert-button {
        width: 100%;
        padding: 1rem 2rem;
        background: var(--accent-color);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-speed);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 1rem;
        box-shadow: 0 4px 16px rgba(0, 188, 212, 0.3);
      }
      .convert-button:hover:not(:disabled) {
        background: #00acc1;
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 188, 212, 0.4);
      }
      .convert-button:disabled {
        background: var(--border-color);
        cursor: not-allowed;
        opacity: 0.6;
        transform: none;
        box-shadow: none;
      }
      .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .error-message {
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        color: var(--error-color);
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        font-size: 0.9rem;
      }
      .success-message {
        background: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
        color: var(--success-color);
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        font-size: 0.9rem;
      }
      .conversion-history {
        margin-top: 2rem;
      }
      .history-item {
        background: var(--primary-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 0.75rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .history-main {
        flex: 1;
      }
      .history-conversion {
        font-weight: 500;
        color: var(--text-color);
        margin-bottom: 0.25rem;
      }
      .history-rate {
        font-size: 0.85rem;
        color: var(--text-secondary);
      }
      .history-date {
        font-size: 0.8rem;
        color: var(--text-secondary);
        text-align: right;
      }
      @media (max-width: 768px) {
        .convert-container {
          max-width: 100%;
          padding: 0 1rem;
        }
        .convert-card {
          padding: 1.5rem;
        }
        .asset-input-group {
          flex-direction: column;
          gap: 0.75rem;
        }
        .balance-info {
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-start;
        }
        .history-item {
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-start;
        }
      }
    </style>

    <div class="convert-container">
      <div class="convert-card">
        <div class="convert-header">
          <h2>Convert Assets</h2>
          <p>Instantly convert between cryptocurrencies and your fiat currency</p>
        </div>

        <div id="convertMessages"></div>

        <form id="convertForm">
          <div class="asset-selector">
            <!-- From Asset -->
            <div class="asset-group">
              <label class="asset-label">From</label>
              <div class="asset-input-group">
                <select id="fromAssetSelect" class="asset-select" required>
                  <option value="">Select asset to convert from</option>
                </select>
                <input type="number" id="fromAmountInput" class="amount-input" placeholder="0.00" min="0" step="any" required>
              </div>
              <div class="balance-info">
                <span class="balance-text">Available: <span class="balance-amount" id="fromBalance">0.00</span></span>
                <button type="button" class="max-button" id="maxButton">MAX</button>
              </div>
            </div>

            <!-- Convert Arrow -->
            <div class="convert-arrow">
              <button type="button" class="arrow-button" id="swapButton" title="Swap assets">
                <i class="material-icons">swap_vert</i>
              </button>
            </div>

            <!-- To Asset -->
            <div class="asset-group">
              <label class="asset-label">To</label>
              <div class="asset-input-group">
                <select id="toAssetSelect" class="asset-select" required>
                  <option value="">Select asset to convert to</option>
                </select>
                <input type="text" id="toAmountInput" class="amount-input" placeholder="0.00" readonly>
              </div>
              <div class="balance-info">
                <span class="balance-text">Balance: <span class="balance-amount" id="toBalance">0.00</span></span>
              </div>
            </div>
          </div>

          <!-- Conversion Summary -->
          <div class="conversion-summary" id="conversionSummary" style="display: none;">
            <div class="summary-row">
              <span class="summary-label">Exchange Rate</span>
              <span class="summary-value rate-value" id="exchangeRate">-</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Network Fee</span>
              <span class="summary-value" id="networkFee">Free</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">You'll Receive</span>
              <span class="summary-value" id="receiveAmount">-</span>
            </div>
          </div>

          <button type="submit" class="convert-button" id="convertButton" disabled>
            <i class="material-icons">swap_horiz</i>
            Convert
          </button>
        </form>
      </div>

      <!-- Conversion History -->
      <div class="convert-card">
        <h3 style="margin-bottom: 1.5rem; color: var(--text-color);">Recent Conversions</h3>
        <div id="conversionHistory">
          <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
            <i class="material-icons" style="font-size: 3rem; opacity: 0.4;">history</i>
            <p>No conversions yet</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadSubscribePage() {
  return `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Subscription Plans</h2>
      </div>
      <div class="card-body">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="material-icons">stars</i>
            </div>
            <div class="stat-value">Free</div>
            <div class="stat-label">Basic Trading</div>
            <div style="margin-top: 1rem;">
              <button class="btn btn-secondary w-100">Current Plan</button>
            </div>
          </div>
          
          <div class="stat-card" style="border-color: var(--accent-color);">
            <div class="stat-icon">
              <i class="material-icons">diamond</i>
            </div>
            <div class="stat-value">$29</div>
            <div class="stat-label">Pro Trading</div>
            <div style="margin-top: 1rem;">
              <button class="btn btn-primary w-100">Upgrade</button>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="material-icons">workspace_premium</i>
            </div>
            <div class="stat-value">$99</div>
            <div class="stat-label">Premium</div>
            <div style="margin-top: 1rem;">
              <button class="btn btn-primary w-100">Upgrade</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadSignalsPage() {
  return `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Trading Signals</h2>
      </div>
      <div class="card-body">
        <div class="text-center">
          <i class="material-icons" style="font-size: 4rem; color: var(--accent-color); margin-bottom: 1rem;">wifi</i>
          <h3>Trading Signals</h3>
          <p class="text-muted">Get real-time trading signals from our AI-powered system</p>
          <p class="text-muted">Coming soon...</p>
          <div style="margin-top: 2rem;">
            <button class="btn btn-primary">
              <i class="material-icons">notifications</i>
              Get Notified When Available
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadStakePage() {
  return `
    <style>
      .stake-container {
        max-width: 100%;
        margin: 0 auto;
      }
      
      .stake-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      
      .stake-stat-card {
        background: var(--secondary-bg);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        transition: all var(--transition-speed);
      }
      
      .stake-stat-card:hover {
        transform: translateY(-2px);
        border-color: var(--accent-color);
      }
      
      .stake-stat-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--accent-color);
        margin-bottom: 0.5rem;
      }
      
      .stake-stat-label {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
      
      .stake-pools {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-top: 2rem;
      }
      
      .stake-pool-card {
        background: var(--secondary-bg);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 2rem;
        transition: all var(--transition-speed);
        position: relative;
        overflow: hidden;
      }
      
      .stake-pool-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--accent-color), #00acc1);
      }
      
      .stake-pool-card:hover {
        transform: translateY(-4px);
        border-color: var(--accent-color);
        box-shadow: 0 8px 32px rgba(0, 188, 212, 0.2);
      }
      
      .pool-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      
      .pool-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--primary-bg);
        padding: 4px;
      }
      
      .pool-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }
      
      .pool-info h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-color);
        margin-bottom: 0.25rem;
      }
      
      .pool-symbol {
        color: var(--text-secondary);
        font-size: 0.9rem;
        font-weight: 500;
      }
      
      .pool-details {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }
      
      .pool-detail {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .detail-label {
        color: var(--text-secondary);
        font-size: 0.85rem;
      }
      
      .detail-value {
        color: var(--text-color);
        font-weight: 500;
        font-size: 0.9rem;
      }
      
      .roi-badge {
        background: linear-gradient(135deg, var(--success-color), #66bb6a);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
      }
      
      .stake-button {
        width: 100%;
        padding: 0.875rem 1.5rem;
        background: var(--accent-color);
        color: white;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-speed);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      
      .stake-button:hover {
        background: #00acc1;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 188, 212, 0.4);
      }
      
      .stake-button:disabled {
        background: var(--border-color);
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      
      @media (max-width: 768px) {
        .stake-stats {
          grid-template-columns: 1fr 1fr;
        }
        
        .stake-pools {
          grid-template-columns: 1fr;
        }
        
        .stake-pool-card {
          padding: 1.5rem;
        }
      }
    </style>

    <div class="stake-container">
      <div class="page-header fade-in">
        <h2 class="page-title">Staking Pools</h2>
        <p class="page-subtitle">Earn rewards by staking your crypto assets</p>
      </div>

      <!-- Stake Statistics -->
      <div class="stake-stats fade-in">
        <div class="stake-stat-card">
          <div class="stake-stat-value" id="totalStakingValue">$0.00</div>
          <div class="stake-stat-label">Total Stakings</div>
        </div>
        <div class="stake-stat-card">
          <div class="stake-stat-value" id="activeStakingsCount">0</div>
          <div class="stake-stat-label">Active Stakings</div>
        </div>
        <div class="stake-stat-card">
          <div class="stake-stat-value" id="closedStakingsCount">0</div>
          <div class="stake-stat-label">Closed Stakings</div>
        </div>
        <div class="stake-stat-card">
          <button class="btn btn-secondary w-100" id="viewStakingsBtn">
            <i class="material-icons">visibility</i>
            View Stakings
          </button>
        </div>
      </div>

      <!-- Staking Pools -->
      <div class="stake-pools fade-in" id="stakingPools">
        <!-- Pools will be populated by JavaScript -->
      </div>
    </div>

    <!-- Stake Modal -->
    <div class="modal-overlay" id="stakeModalOverlay" style="display: none;">
      <div class="side-modal wide-modal active" id="stakeModal">
        <div class="modal-header">
          <h2 id="stakeModalTitle">Stake AVAX</h2>
          <button class="close-modal" id="closeStakeModal">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="modal-content">
          <form id="stakeForm">
            <div class="form-group">
              <label for="stakeAmount">Amount:</label>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <input type="number" id="stakeAmount" class="form-control" placeholder="0.00" min="0" step="any" required>
                <span id="stakeCurrencySymbol" style="color: var(--text-secondary); font-weight: 500;">AVAX</span>
              </div>
            </div>
            
            <div class="form-group">
              <label>Current Balance:</label>
              <div id="currentBalance" style="color: var(--accent-color); font-weight: 600;">0 AVAX</div>
            </div>
            
            <div class="form-group">
              <label for="stakeDuration">Duration:</label>
              <select id="stakeDuration" class="form-control" required>
                <option value="1">1 day</option>
                <option value="2">2 days</option>
                <option value="3">3 days</option>
                <option value="4">4 days</option>
                <option value="5">5 days</option>
                <option value="6">6 days</option>
                <option value="7">7 days</option>
                <option value="8">8 days</option>
                <option value="9">9 days</option>
                <option value="10">10 days</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>ROI:</label>
              <div id="roiDisplay" style="color: var(--success-color); font-weight: 600; font-size: 1.1rem;">84%</div>
            </div>
            
            <div class="form-group">
              <label>Estimated Returns:</label>
              <div id="estimatedReturns" style="color: var(--accent-color); font-weight: 600;">0 AVAX</div>
            </div>
            
            <button type="submit" class="btn btn-primary w-100" id="confirmStakeBtn">
              <i class="material-icons">lock</i>
              Stake Now
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- View Stakes Modal -->
    <div class="modal-overlay" id="viewStakesModalOverlay" style="display: none;">
      <div class="side-modal wide-modal active" id="viewStakesModal">
        <div class="modal-header">
          <h2>Your Stakes</h2>
          <button class="close-modal" id="closeViewStakesModal">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="modal-content">
          <div id="stakesTableContainer">
            <!-- Stakes table will be populated here -->
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadExpertsPage() {
  return `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Copy Expert Traders</h2>
      </div>
      <div class="card-body">
        <div class="text-center">
          <i class="material-icons" style="font-size: 4rem; color: var(--accent-color); margin-bottom: 1rem;">content_copy</i>
          <h3>Copy Trading</h3>
          <p class="text-muted">Follow and copy trades from expert traders</p>
          <p class="text-muted">Coming soon...</p>
          <div style="margin-top: 2rem;">
            <button class="btn btn-primary">
              <i class="material-icons">notifications</i>
              Get Notified When Available
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize page-specific functionality
 */
async function initializePageFunctionality(page) {
  // Ensure user is authenticated before proceeding
  if (!currentUser) {
    console.error('User not authenticated, redirecting to login');
    handleAuthError();
    return;
  }
  
  // Make current user available globally for page scripts
  window.currentUser = currentUser;
  
  switch (page) {
    case 'dashboard':
      await initializeDashboard();
      break;
    case 'deposit':
      await loadScript('../scripts/deposit.js');
      if (window.initializeDepositPage) {
        await window.initializeDepositPage();
      }
      break;
    case 'withdraw':
      await loadScript('../scripts/withdraw.js');
      if (window.initializeWithdrawPage) {
        await window.initializeWithdrawPage();
      }
      break;
    case 'assets':
      await loadScript('../scripts/assets.js');
      if (window.initializeAssetsPage) {
        await window.initializeAssetsPage();
      }
      break;
    case 'markets':
      await loadScript('../scripts/markets.js');
      if (window.initializeMarketsPage) {
        await window.initializeMarketsPage();
      }
      break;
    case 'trade':
      initializeTradePageNew();
      break;
    case 'convert':
      initializeConvert();
      break;
    case 'stake':
      await loadScript('../scripts/stake.js');
      if (window.initializeStakePage) {
        await window.initializeStakePage();
      }
      break;
    case 'subscribe':
    case 'signals':
    case 'experts':
      // These pages don't need special initialization yet
      break;
    default:
      console.log(`No special initialization needed for ${page}`);
  }
}

/**
 * Load external script dynamically
 */
async function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      existingScript.remove(); // Remove old script to allow reloading and prevent redeclaration errors
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = (err) => {
        console.error(`Error loading script: ${src}`, err);
        reject(err);
    };
    document.head.appendChild(script); // Append to head to ensure it's loaded
  });
}

/**
 * Initialize dashboard functionality
 */
async function initializeDashboard() {
  try {
    // Load dashboard data with new API
    await loadDashboardDataNew();
    
    // Setup dashboard event listeners
    setupDashboardEventListeners();
  } catch (error) {
    console.error('Error initializing dashboard:', error);
  }
}

/**
 * Load dashboard data
 */
async function loadDashboardDataNew() {
  try {
    if (!currentUser || !currentUser.id) {
      console.warn('No current user found for dashboard');
      return;
    }

    // Fetch comprehensive dashboard data
    const response = await fetch(`/api/user/${currentUser.id}/dashboard-data`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data');
    }

    const data = await response.json();
    
    // Update dashboard with fetched data
    updateDashboardDisplay(data);
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    // Show error state
    showDashboardError();
  }
}

function updateDashboardDisplay(data) {
  const {
    totalBalance,
    userCurrency,
    fiatBalance,
    topCryptoBalances,
    recentDeposits,
    recentWithdrawals,
    recentActivity,
    portfolioStats,
    portfolioData
  } = data;

  // Update total balance
  const totalBalanceEl = document.getElementById('dashboardTotalBalance');
  if (totalBalanceEl) {
    const currencySymbol = getCurrencySymbol(userCurrency);
    totalBalanceEl.textContent = `${currencySymbol}${formatNumber(totalBalance)}`;
  }

  // Update individual balances (always show fiat + 4 cryptos)
  updateIndividualBalances(topCryptoBalances, fiatBalance, userCurrency);
  
  // Update portfolio section with real data
  updatePortfolioSection(portfolioData, portfolioStats, userCurrency);
}

function updateIndividualBalances(cryptoBalances, fiatBalance, userCurrency) {
  const container = document.getElementById('dashboardIndividualBalances');
  if (!container) return;

  let balancesHTML = '';

  // Add fiat balance first
  balancesHTML += `
    <div class="balance-item">
      <div class="balance-info">
        <div class="balance-icon">
          <i class="material-icons">${getCurrencyIcon(userCurrency)}</i>
        </div>
        <div class="balance-details">
          <h4>${userCurrency}</h4>
          <p>Fiat Currency</p>
        </div>
      </div>
      <div class="balance-value">
        <div class="balance-amount-small">${formatNumber(fiatBalance)}</div>
        <div class="balance-usd">${userCurrency}</div>
      </div>
    </div>
  `;

  // Add top 4 crypto balances
  cryptoBalances.forEach(wallet => {
    const icon = getCryptoIcon(wallet.shortName);
    balancesHTML += `
      <div class="balance-item">
        <div class="balance-info">
          <div class="balance-icon">
            ${icon.startsWith('http') ? 
              `<img src="${icon}" alt="${wallet.shortName}" style="width: 20px; height: 20px; border-radius: 50%;">` :
              `<i class="material-icons">${icon}</i>`
            }
          </div>
          <div class="balance-details">
            <h4>${wallet.shortName.toUpperCase()}</h4>
            <p>${wallet.coinName}</p>
          </div>
        </div>
        <div class="balance-value">
          <div class="balance-amount-small">${formatNumber(wallet.balanceNumber)}</div>
          <div class="balance-usd">${getCurrencySymbol(userCurrency)}${formatNumber(wallet.userCurrencyValue)}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = balancesHTML;
}

function updatePortfolioSection(portfolioData, portfolioStats, userCurrency) {
  // Update portfolio stats
  const portfolioCountEl = document.getElementById('portfolioCount');
  if (portfolioCountEl) {
    portfolioCountEl.textContent = portfolioStats.assetCount;
  }

  // Update gain/loss to show in/out flow
  const portfolioGainLossEl = document.getElementById('portfolioGainLoss');
  if (portfolioGainLossEl && portfolioStats) {
    const netFlow = portfolioStats.netFlow || 0;
    const currencySymbol = getCurrencySymbol(userCurrency);
    const isPositive = netFlow >= 0;
    
    portfolioGainLossEl.textContent = `${isPositive ? '+' : ''}${currencySymbol}${formatNumber(Math.abs(netFlow))}`;
    portfolioGainLossEl.style.color = isPositive ? 'var(--success-color)' : 'var(--error-color)';
    
    // Update the label to reflect it's net flow
    const statLabel = portfolioGainLossEl.parentElement.querySelector('.stat-label');
    if (statLabel) {
      statLabel.textContent = 'Net Flow (30d)';
    }
  }

  const chartEl = document.getElementById('portfolioChart');
  if (chartEl) {
    // Show portfolio visualization if user has any balances
    if (portfolioData && portfolioData.length > 0) {
      chartEl.innerHTML = `<canvas id="portfolioCanvas" width="100%" height="200"></canvas>`;
      setTimeout(() => drawPortfolioChart(portfolioData, userCurrency), 100);
    } else {
      // Show placeholder if no balances
      chartEl.innerHTML = `
        <div class="portfolio-placeholder">
          <i class="material-icons" style="font-size: 3rem; opacity: 0.4;">pie_chart</i>
          <p>Portfolio visualization</p>
          <p style="font-size: 0.8rem;">Make some deposits to see your portfolio</p>
        </div>
      `;
    }
  }
}

function drawPortfolioChart(portfolioData, userCurrency) {
  const canvas = document.getElementById('portfolioCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = 220;
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 - 15; // Move chart up to make room for legend
  const radius = Math.min(centerX, centerY) - 15;
  
  // Colors for different assets
  const colors = [
    '#00bcd4', // Accent color
    '#4caf50', // Success color
    '#ff9800', // Warning color
    '#2196f3', // Info color
    '#9c27b0', // Purple
    '#f44336', // Error color
    '#795548', // Brown
    '#607d8b'  // Blue grey
  ];
  
  let startAngle = 0;
  const totalValue = portfolioData.reduce((sum, item) => sum + item.value, 0);
  
  if (totalValue === 0) {
    // Draw empty circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#1F2A33';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#A0A0A0';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('No assets', centerX, centerY);
    return;
  }
  
  // Draw pie slices
  portfolioData.forEach((item, index) => {
    const sliceAngle = (item.value / totalValue) * 2 * Math.PI;
    
    // Draw slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#0A0E11';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw percentage label if slice is big enough
    if (item.percentage > 8) {
      const labelAngle = startAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.percentage.toFixed(1)}%`, labelX, labelY);
    }
    
    startAngle += sliceAngle;
  });
  
  // Draw comprehensive legend below the chart
  const legendStartY = canvas.height - 35;
  const legendItemHeight = 15;
  const legendItemsPerRow = Math.floor(canvas.width / 80); // Approximate items per row
  
  portfolioData.forEach((item, index) => {
    const row = Math.floor(index / legendItemsPerRow);
    const col = index % legendItemsPerRow;
    
    const legendX = 5 + (col * (canvas.width / legendItemsPerRow));
    const legendY = legendStartY - (row * legendItemHeight);
    
    // Only draw if it fits in the canvas
    if (legendY > 0) {
      // Color box
      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(legendX, legendY - 10, 10, 10);
      
      // Asset name with percentage
      ctx.fillStyle = '#A0A0A0';
      ctx.font = '9px Inter';
      ctx.textAlign = 'left';
      
      const labelText = `${item.name} (${item.percentage.toFixed(1)}%)`;
      ctx.fillText(labelText, legendX + 13, legendY - 2);
    }
  });
  
  // Add total value in center if there's space
  if (portfolioData.length <= 6) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    
    const currencySymbol = getCurrencySymbol(userCurrency);
    const totalText = `${currencySymbol}${formatNumber(totalValue)}`;
    ctx.fillText(totalText, centerX, centerY + 3);
    
    ctx.fillStyle = '#A0A0A0';
    ctx.font = '10px Inter';
    ctx.fillText('Total', centerX, centerY - 10);
  }
}

function setupDashboardEventListeners() {
  // Setup trade tabs
  const openTradesTab = document.getElementById('dashboardOpenTradesTab');
  const closedTradesTab = document.getElementById('dashboardClosedTradesTab');
  
  if (openTradesTab && closedTradesTab) {
    openTradesTab.addEventListener('click', () => {
      openTradesTab.classList.add('active');
      closedTradesTab.classList.remove('active');
      // Switch content
      const contentEl = document.getElementById('dashboardTradeContent');
      if (contentEl) {
        contentEl.innerHTML = `
          <div style="text-align: center;">
            <i class="material-icons" style="font-size: 2rem; opacity: 0.4;">trending_up</i>
            <p>No open trades yet</p>
            <p style="font-size: 0.8rem;">Start trading to see your positions here</p>
          </div>
        `;
      }
    });
    
    closedTradesTab.addEventListener('click', () => {
      closedTradesTab.classList.add('active');
      openTradesTab.classList.remove('active');
      // Switch content
      const contentEl = document.getElementById('dashboardTradeContent');
      if (contentEl) {
        contentEl.innerHTML = `
          <div style="text-align: center;">
            <i class="material-icons" style="font-size: 2rem; opacity: 0.4;">history</i>
            <p>No closed trades yet</p>
            <p style="font-size: 0.8rem;">Complete some trades to see your history</p>
          </div>
        `;
      }
    });
  }
}

function showDashboardError() {
  const container = document.getElementById('page-content');
  if (container) {
    container.innerHTML = `
      <div class="card text-center">
        <div class="card-body">
          <i class="material-icons" style="font-size: 3rem; color: var(--error-color); margin-bottom: 1rem;">error_outline</i>
          <h3>Failed to load dashboard</h3>
          <p class="text-muted">Please refresh the page or try again later.</p>
          <button class="btn btn-primary" onclick="location.reload()">
            <i class="material-icons">refresh</i>
            Refresh
          </button>
        </div>
      </div>
    `;
  }
}

// Helper functions
function getCurrencySymbol(currency) {
  const symbols = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
    'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥'
  };
  return symbols[currency] || currency + ' ';
}

function getCurrencyIcon(currency) {
  const icons = {
    'USD': 'attach_money', 'EUR': 'euro_symbol', 'GBP': 'currency_pound',
    'JPY': 'currency_yen', 'AUD': 'attach_money', 'CAD': 'attach_money',
    'CHF': 'attach_money', 'CNY': 'currency_yen'
  };
  return icons[currency] || 'attach_money';
}

function getCryptoIcon(shortName) {
  const icons = {
    'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    'BNB': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    'USDT': 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    'USDC': 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    'XRP': 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    'ADA': 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    'DOGE': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    'SOL': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    'SHIB': 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
    'PEPE': 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg'
  };
  return icons[shortName?.toUpperCase()] || 'currency_bitcoin';
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


/**
 * Initialize the new trade page functionality
 */
function initializeTradePageNew() {
  // Setup trades tab switching
  const tradesTabButtons = document.querySelectorAll('[data-trades-tab]');
  tradesTabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tradesTab;
      
      // Update active tab button
      tradesTabButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      // Update active content
      document.querySelectorAll('.trades-list').forEach(list => {
        list.classList.remove('active');
      });
      document.getElementById(`${tab}-trades`).classList.add('active');
    });
  });

  // No need for complex TradingView initialization since we're using direct iframe
  console.log('✅ Trading page initialized with direct TradingView iframe');

  // Send user data to trading widget iframe
  const iframe = document.querySelector('.trading-iframe');
  if (iframe) {
    iframe.addEventListener('load', () => {
      // Send current user data to the iframe
      if (currentUser && iframe.contentWindow) {
        const message = {
          type: 'userData',
          user: currentUser,
          wallets: [] // Will be populated when wallets are loaded
        };
        
        // Load user wallets first
        if (currentUser.id) {
          fetch(`/api/user/${currentUser.id}/wallets`, { credentials: 'include' })
            .then(response => response.json())
            .then(wallets => {
              message.wallets = wallets;
              iframe.contentWindow.postMessage(message, '*');
            })
            .catch(error => {
              console.error('Error loading wallets for trading widget:', error);
              iframe.contentWindow.postMessage(message, '*');
            });
        } else {
          iframe.contentWindow.postMessage(message, '*');
        }
      }
    });
  }

  // Listen for messages from the trading widget
  window.addEventListener('message', (event) => {
    if (event.data.type === 'getUserData') {
      // Trading widget is requesting user data
      const iframe = document.querySelector('.trading-iframe');
      if (iframe && iframe.contentWindow && currentUser) {
        
        if (currentUser.id) {
          fetch(`/api/user/${currentUser.id}/wallets`, { credentials: 'include' })
            .then(response => response.json())
            .then(wallets => {
              const message = {
                type: 'userData',
                user: currentUser,
                wallets: wallets
              };
              iframe.contentWindow.postMessage(message, '*');
            })
            .catch(error => {
              console.error('Error loading wallets for trading widget:', error);
              const message = {
                type: 'userData',
                user: currentUser,
                wallets: []
              };
              iframe.contentWindow.postMessage(message, '*');
            });
        } else {
          const message = {
            type: 'userData',
            user: currentUser,
            wallets: []
          };
          iframe.contentWindow.postMessage(message, '*');
        }
      }
    }
  });

// Trades will be loaded from real data when available
  console.log('✅ Trade tabs initialized - ready for real trade data');
}
/**
 * Update dashboard statistics
 */
function updateDashboardStats(wallets) {
  // Calculate total balance (simplified)
  let totalBalance = 0;
  wallets.forEach(wallet => {
    const balance = parseFloat(wallet.balance) || 0;
    // For simplicity, treating all as USD equivalent
    totalBalance += balance; // This should ideally convert to a common currency
  });
  
  const totalBalanceEl = document.getElementById('totalBalance');
  if (totalBalanceEl) {
    totalBalanceEl.textContent = `$${totalBalance.toFixed(2)}`;
  }
  
  const portfolioCountEl = document.getElementById('portfolioCount');
  if (portfolioCountEl) {
    portfolioCountEl.textContent = wallets.length;
  }
  
  // Mock data for other stats
  const todayChangeEl = document.getElementById('todayChange');
  if (todayChangeEl) {
    todayChangeEl.textContent = '+$12.34'; // Example
  }
  
  const recentTransactionsEl = document.getElementById('recentTransactions');
  if (recentTransactionsEl) {
    recentTransactionsEl.textContent = '3'; // Example
  }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
  const recentActivity = document.getElementById('recentActivity');
  if (!recentActivity) return; // Element might not be on current page view

  if (!currentUser || !currentUser.id) {
    recentActivity.innerHTML = '<p class="text-muted">User not identified.</p>';
    return;
  }
  
  try {
    // Try to load recent notifications as activity
    const notifResponse = await fetch(`/api/user/${currentUser.id}/notifications`, {
      credentials: 'include'
    });
    
    if (notifResponse.ok) {
      const notifications = await notifResponse.json();
      
      if (notifications.length === 0) {
        recentActivity.innerHTML = '<p class="text-muted">No recent activity</p>';
      } else {
        const activityList = notifications.slice(0, 5).map(notif => 
          `<div class="mb-2 p-3 bg-primary rounded">${notif.message}</div>` // Ensure bg-primary is styled
        ).join('');
        recentActivity.innerHTML = activityList;
      }
    } else {
         recentActivity.innerHTML = '<p class="text-muted">Could not load activity.</p>';
    }
  } catch (error) {
    console.error('Error loading recent activity:', error);
    recentActivity.innerHTML = '<p class="text-muted">Unable to load recent activity</p>';
  }
}

/**
 * Initialize convert page functionality
 */
async function initializeConvert() {
  try {
    // Show loading message
    showConvertMessage('Loading real-time prices from multiple sources...', 'info');
    
    await loadConvertData();
    setupConvertEventListeners();
    await loadConversionHistory();
    
    // Clear loading message
    clearConvertMessages();
    
    
  } catch (error) {
    console.error('Error initializing convert page:', error);
    showConvertMessage('❌ Failed to load real-time prices. Please refresh the page.', 'error');
  }
}

/**
 * Load data for convert page
 */
async function loadConvertData() {
  if (!currentUser || !currentUser.id) {
    showConvertMessage('User not authenticated', 'error');
    return;
  }

  try {
    convertUserCurrency = currentUser.accountCurrency || 'USD';

    // Fetch wallets
    const walletsResponse = await fetch(`/api/user/${currentUser.id}/wallets`, { 
      credentials: 'include' 
    });
    
    if (!walletsResponse.ok) {
      throw new Error('Failed to fetch wallets');
    }
    
    convertUserWallets = await walletsResponse.json();
    
    // Fetch coin prices from multiple sources
    convertCoinPrices = await fetchCoinPricesFromMultipleSources();
    
    // Fetch exchange rates from multiple sources
    convertExchangeRates = await fetchExchangeRatesFromMultipleSources();
    
    populateAssetSelectors(convertUserWallets);
    
  } catch (error) {
    console.error('Error loading convert data:', error);
    showConvertMessage('Failed to load wallet data', 'error');
  }
}

/**
 * Fetch cryptocurrency prices from multiple free APIs
 */
async function fetchCoinPricesFromMultipleSources() {
  const cryptoAPIs = [
    {
      name: 'CoinGecko',
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,tether,usd-coin,ripple,cardano,dogecoin,solana,avalanche-2,shiba-inu,litecoin,tron,polygon-ecosystem-token,pepe&vs_currencies=usd',
      transform: (data) => {
        console.log('🔍 CoinGecko raw data:', data);
        return data;
      }
    },
    {
      name: 'CoinCap',
      url: 'https://api.coincap.io/v2/assets?limit=50', // Increased limit to ensure we get SHIB and PEPE
      transform: (data) => {
        console.log('🔍 CoinCap raw data:', data);
        const mapping = {
          'bitcoin': 'bitcoin', 'ethereum': 'ethereum', 'binance-coin': 'binancecoin',
          'tether': 'tether', 'usd-coin': 'usd-coin', 'xrp': 'ripple',
          'cardano': 'cardano', 'dogecoin': 'dogecoin', 'solana': 'solana',
          'avalanche': 'avalanche-2', 'shiba-inu': 'shiba-inu', 'litecoin': 'litecoin',
          'tron': 'tron', 'polygon': 'polygon-ecosystem-token', 'pepe': 'pepe'
        };
        const result = {};
        data.data.forEach(coin => {
          const geckoId = mapping[coin.id];
          if (geckoId && coin.priceUsd) {
            const price = parseFloat(coin.priceUsd);
            if (price > 0) {
              result[geckoId] = { usd: price };
              console.log(`✅ CoinCap: ${coin.id} → ${geckoId} = ${price}`);
            }
          }
        });
        return result;
      }
    },
    {
      name: 'Binance',
      url: 'https://data-api.binance.vision/api/v3/ticker/24hr',
      transform: (data) => {
        console.log('🔍 Binance raw data length:', data.length);
        const symbolMapping = {
          'BTCUSDT': 'bitcoin', 'ETHUSDT': 'ethereum', 'BNBUSDT': 'binancecoin',
          'USDCUSDT': 'usd-coin', 'XRPUSDT': 'ripple', 'ADAUSDT': 'cardano',
          'DOGEUSDT': 'dogecoin', 'SOLUSDT': 'solana', 'AVAXUSDT': 'avalanche-2',
          '1000SHIBUSDT': 'shiba-inu', // Binance uses 1000SHIBUSDT (price per 1000 SHIB)
          'LTCUSDT': 'litecoin', 'TRXUSDT': 'tron',
          'MATICUSDT': 'polygon-ecosystem-token', 
          '1000PEPEUSDT': 'pepe' // Binance uses 1000PEPEUSDT (price per 1000 PEPE)
        };
        const result = {};
        data.forEach(ticker => {
          const geckoId = symbolMapping[ticker.symbol];
          if (geckoId && ticker.lastPrice) {
            let price = parseFloat(ticker.lastPrice);
            
            // Adjust for Binance's 1000x pricing on SHIB and PEPE
            if (ticker.symbol === '1000SHIBUSDT' || ticker.symbol === '1000PEPEUSDT') {
              price = price / 1000; // Convert from price per 1000 tokens to price per token
            }
            
            if (price > 0) {
              result[geckoId] = { usd: price };
              console.log(`✅ Binance: ${ticker.symbol} → ${geckoId} = ${price}`);
            }
          }
        });
        
        // Add stable coins
        result['tether'] = { usd: 1 };
        result['usd-coin'] = { usd: 1 };
        return result;
      }
    }
  ];

  let lastError = null;

  for (const api of cryptoAPIs) {
    try {
      console.log(`🔄 Fetching crypto prices from ${api.name}...`);
      const response = await fetch(api.url);
      if (response.ok) {
        const data = await response.json();
        const transformedData = api.transform(data);
        
        // Validate we got some meaningful data including SHIB and PEPE
        const priceCount = Object.keys(transformedData).length;
        const hasSHIB = transformedData['shiba-inu']?.usd > 0;
        const hasPEPE = transformedData['pepe']?.usd > 0;
        
        console.log(`📊 ${api.name} results:`, {
          totalCoins: priceCount,
          hasSHIB: hasSHIB ? `${transformedData['shiba-inu'].usd}` : 'NO',
          hasPEPE: hasPEPE ? `${transformedData['pepe'].usd}` : 'NO'
        });
        
        if (priceCount > 0) {
          console.log(`✅ Successfully fetched ${priceCount} crypto prices from ${api.name}`);
          // Add source info for debugging
          transformedData._source = api.name;
          transformedData._timestamp = new Date().toISOString();
          return transformedData;
        } else {
          throw new Error('No price data received');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`❌ Failed to fetch crypto prices from ${api.name}:`, error.message);
      lastError = error;
    }
  }
  
  throw new Error(`All cryptocurrency price APIs failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Fetch exchange rates from multiple free APIs
 */
async function fetchExchangeRatesFromMultipleSources() {
  const exchangeAPIs = [
    {
      name: 'ExchangeRate-API',
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      transform: (data) => data.rates
    },
    {
      name: 'ExchangeRate.host',
      url: 'https://api.exchangerate.host/latest?base=USD',
      transform: (data) => data.rates
    },
    {
      name: 'Currency-API',
      url: 'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
      transform: (data) => {
        const rates = {};
        Object.keys(data.usd).forEach(currency => {
          rates[currency.toUpperCase()] = data.usd[currency];
        });
        return rates;
      }
    },
    {
      name: 'FXRatesAPI',
      url: 'https://api.fxratesapi.com/latest',
      transform: (data) => data.rates
    }
  ];

  let lastError = null;

  for (const api of exchangeAPIs) {
    try {
      console.log(`🔄 Fetching exchange rates from ${api.name}...`);
      const response = await fetch(api.url);
      if (response.ok) {
        const data = await response.json();
        const rates = api.transform(data);
        
        // Ensure USD is always 1 and validate we got meaningful data
        rates.USD = 1;
        const rateCount = Object.keys(rates).length;
        
        if (rateCount > 1) { // Should have more than just USD
          console.log(`✅ Successfully fetched ${rateCount} exchange rates from ${api.name}`);
          // Add source info for debugging
          rates._source = api.name;
          rates._timestamp = new Date().toISOString();
          return rates;
        } else {
          throw new Error('Insufficient exchange rate data received');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`❌ Failed to fetch exchange rates from ${api.name}:`, error.message);
      lastError = error;
    }
  }
  
  throw new Error(`All exchange rate APIs failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Populate asset selector dropdowns
 */
function populateAssetSelectors(wallets) {
  const fromSelect = document.getElementById('fromAssetSelect');
  const toSelect = document.getElementById('toAssetSelect');
  
  if (!fromSelect || !toSelect) return;
  
  // Clear existing options
  fromSelect.innerHTML = '<option value="">Select asset to convert from</option>';
  toSelect.innerHTML = '<option value="">Select asset to convert to</option>';
  
  // Add user's fiat currency first
  const userCurrency = convertUserCurrency;
  let fiatWallet = wallets.find(w => 
    (w.type === 'fiat' || (!w.type && w.shortName === userCurrency)) && 
    w.shortName === userCurrency
  );
  
  // If no fiat wallet found, use user's fiat balance
  if (!fiatWallet) {
    fiatWallet = {
      shortName: userCurrency,
      coinName: `${userCurrency} (Fiat)`,
      balance: currentUser.fiatBalance || '0',
      type: 'fiat'
    };
  }
  
  const fiatOption = `<option value="${userCurrency}" data-type="fiat" data-balance="${fiatWallet.balance}">${fiatWallet.coinName} (${userCurrency})</option>`;
  fromSelect.innerHTML += fiatOption;
  toSelect.innerHTML += fiatOption;
  
  // Add crypto wallets (backward compatible)
  const cryptoWallets = wallets.filter(w => w.type === 'crypto' || !w.type);
  cryptoWallets.forEach(wallet => {
    if (wallet.shortName !== userCurrency) {
      const option = `<option value="${wallet.shortName}" data-type="crypto" data-balance="${wallet.balance}">${wallet.coinName} (${wallet.shortName.toUpperCase()})</option>`;
      fromSelect.innerHTML += option;
      toSelect.innerHTML += option;
    }
  });
}

/**
 * Update conversion preview using cached data
 */
function updateConversionPreview() {
  const fromSelect = document.getElementById('fromAssetSelect');
  const toSelect = document.getElementById('toAssetSelect');
  const fromAmountInput = document.getElementById('fromAmountInput');
  const toAmountInput = document.getElementById('toAmountInput');
  const conversionSummary = document.getElementById('conversionSummary');
  const exchangeRate = document.getElementById('exchangeRate');
  const receiveAmount = document.getElementById('receiveAmount');
  const convertButton = document.getElementById('convertButton');
  
  if (!fromSelect || !toSelect || !fromAmountInput) return;
  
  const fromAsset = fromSelect.value;
  const toAsset = toSelect.value;
  const amount = parseFloat(fromAmountInput.value) || 0;
  
  // Hide summary and disable button by default
  if (conversionSummary) conversionSummary.style.display = 'none';
  if (convertButton) convertButton.disabled = true;
  
  if (!fromAsset || !toAsset || amount <= 0 || fromAsset === toAsset) {
    if (toAmountInput) toAmountInput.value = '';
    return;
  }
  
  try {
    const result = calculateConversion(fromAsset, toAsset, amount);
    
    if (result.success) {
      // Update display
      if (toAmountInput) toAmountInput.value = result.toAmount.toFixed(6);
      if (exchangeRate) exchangeRate.textContent = `1 ${fromAsset} = ${result.rate.toFixed(6)} ${toAsset}`;
      if (receiveAmount) receiveAmount.textContent = `${result.toAmount.toFixed(6)} ${toAsset}`;
      if (conversionSummary) conversionSummary.style.display = 'block';
      
      // Check balance
      const fromOption = fromSelect.options[fromSelect.selectedIndex];
      const availableBalance = parseFloat(fromOption.dataset.balance || '0');
      
      if (convertButton) {
        convertButton.disabled = amount > availableBalance;
        if (amount > availableBalance) {
          showConvertMessage(`Insufficient balance. You have ${availableBalance.toFixed(6)} ${fromAsset}`, 'error');
        } else {
          clearConvertMessages();
        }
      }
    } else {
      throw new Error(result.error || 'Conversion calculation failed');
    }
    
  } catch (error) {
    console.error('Error updating conversion preview:', error);
    showConvertMessage('Failed to calculate conversion rate', 'error');
  }
}

/**
 * Calculate conversion between assets
 */
function calculateConversion(fromAsset, toAsset, amount) {
  try {
    // Helper function to get crypto price in USD with better validation
    const getCryptoPriceUSD = (symbol) => {
      const mapping = {
        'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin',
        'DOGE': 'dogecoin', 'USDT': 'tether', 'USDC': 'usd-coin',
        'XRP': 'ripple', 'ADA': 'cardano', 'SOL': 'solana',
        'AVAX': 'avalanche-2', 'SHIB': 'shiba-inu', 'LTC': 'litecoin',
        'TRX': 'tron', 'MATIC': 'polygon-ecosystem-token', 'PEPE': 'pepe'
      };
      
      const coinKey = mapping[symbol.toUpperCase()] || symbol.toLowerCase();
      const price = convertCoinPrices[coinKey]?.usd;
      
      // Debug logging
      console.log(`🔍 Looking up price for ${symbol} (${coinKey}):`, price);
      
      // Strict validation - price must be a valid positive number
      if (typeof price !== 'number' || price <= 0 || !isFinite(price)) {
        console.error(`❌ Invalid price for ${symbol}: ${price}`);
        return null; // Return null instead of 0 to distinguish from actual 0 price
      }
      
      return price;
    };
    
    let toAmount = 0;
    let rate = 0;
    
    // Fiat to Crypto
    if (fromAsset === convertUserCurrency && toAsset !== convertUserCurrency) {
      const cryptoPriceUSD = getCryptoPriceUSD(toAsset);
      
      // Strict validation - must have valid price
      if (cryptoPriceUSD === null) {
        throw new Error(`❌ Price data not available for ${toAsset}. Please try again or contact support.`);
      }
      
      console.log(`💱 Converting ${amount} ${fromAsset} to ${toAsset} at ${cryptoPriceUSD} per ${toAsset}`);
      
      const userCurrencyToUSD = convertExchangeRates[convertUserCurrency] || 1;
      const usdAmount = amount / userCurrencyToUSD;
      toAmount = usdAmount / cryptoPriceUSD;
      rate = 1 / (cryptoPriceUSD * userCurrencyToUSD);
      
      console.log(`📊 Calculation: ${amount} ${fromAsset} → ${usdAmount} USD → ${toAmount} ${toAsset}`);
    }
    // Crypto to Fiat
    else if (fromAsset !== convertUserCurrency && toAsset === convertUserCurrency) {
      const cryptoPriceUSD = getCryptoPriceUSD(fromAsset);
      
      if (cryptoPriceUSD === null) {
        throw new Error(`❌ Price data not available for ${fromAsset}. Please try again or contact support.`);
      }
      
      console.log(`💱 Converting ${amount} ${fromAsset} to ${toAsset} at ${cryptoPriceUSD} per ${fromAsset}`);
      
      const userCurrencyToUSD = convertExchangeRates[convertUserCurrency] || 1;
      const usdAmount = amount * cryptoPriceUSD;
      toAmount = usdAmount * userCurrencyToUSD;
      rate = cryptoPriceUSD * userCurrencyToUSD;
      
      console.log(`📊 Calculation: ${amount} ${fromAsset} → ${usdAmount} USD → ${toAmount} ${toAsset}`);
    }
    // Crypto to Crypto
    else if (fromAsset !== convertUserCurrency && toAsset !== convertUserCurrency) {
      const fromPriceUSD = getCryptoPriceUSD(fromAsset);
      const toPriceUSD = getCryptoPriceUSD(toAsset);
      
      if (fromPriceUSD === null) {
        throw new Error(`❌ Price data not available for ${fromAsset}. Please try again or contact support.`);
      }
      if (toPriceUSD === null) {
        throw new Error(`❌ Price data not available for ${toAsset}. Please try again or contact support.`);
      }
      
      console.log(`💱 Converting ${amount} ${fromAsset} (${fromPriceUSD}) to ${toAsset} (${toPriceUSD})`);
      
      const usdAmount = amount * fromPriceUSD;
      toAmount = usdAmount / toPriceUSD;
      rate = fromPriceUSD / toPriceUSD;
      
      console.log(`📊 Calculation: ${amount} ${fromAsset} → ${usdAmount} USD → ${toAmount} ${toAsset}`);
    }
    else {
      throw new Error('❌ Invalid conversion pair - cannot convert currency to itself');
    }
    
    // Final validation
    if (!isFinite(toAmount) || toAmount <= 0) {
      throw new Error(`❌ Invalid conversion result: ${toAmount}`);
    }
    
    if (!isFinite(rate) || rate <= 0) {
      throw new Error(`❌ Invalid exchange rate: ${rate}`);
    }
    
    console.log(`✅ Final result: ${toAmount.toFixed(8)} ${toAsset} at rate ${rate.toFixed(8)}`);
    
    return { success: true, toAmount, rate };
    
  } catch (error) {
    console.error('💥 Conversion calculation failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Setup event listeners for convert page
 */
function setupConvertEventListeners() {
  const fromSelect = document.getElementById('fromAssetSelect');
  const toSelect = document.getElementById('toAssetSelect');
  const fromAmountInput = document.getElementById('fromAmountInput');
  const maxButton = document.getElementById('maxButton');
  const swapButton = document.getElementById('swapButton');
  const convertForm = document.getElementById('convertForm');
  
  if (fromSelect) fromSelect.addEventListener('change', updateFromAsset);
  if (toSelect) toSelect.addEventListener('change', updateToAsset);
  if (fromAmountInput) fromAmountInput.addEventListener('input', updateConversionPreview);
  if (maxButton) maxButton.addEventListener('click', setMaxAmount);
  if (swapButton) swapButton.addEventListener('click', swapAssets);
  if (convertForm) convertForm.addEventListener('submit', handleConversion);
}

/**
 * Update from asset selection
 */
function updateFromAsset() {
  const fromSelect = document.getElementById('fromAssetSelect');
  const fromBalance = document.getElementById('fromBalance');
  
  if (!fromSelect || !fromBalance) return;
  
  const selectedOption = fromSelect.options[fromSelect.selectedIndex];
  if (selectedOption && selectedOption.value) {
    const balance = selectedOption.dataset.balance || '0';
    const symbol = selectedOption.value;
    fromBalance.textContent = `${parseFloat(balance).toFixed(6)} ${symbol}`;
  } else {
    fromBalance.textContent = '0.00';
  }
  
  updateConversionPreview();
}

/**
 * Update to asset selection
 */
function updateToAsset() {
  const toSelect = document.getElementById('toAssetSelect');
  const toBalance = document.getElementById('toBalance');
  
  if (!toSelect || !toBalance) return;
  
  const selectedOption = toSelect.options[toSelect.selectedIndex];
  if (selectedOption && selectedOption.value) {
    const balance = selectedOption.dataset.balance || '0';
    const symbol = selectedOption.value;
    toBalance.textContent = `${parseFloat(balance).toFixed(6)} ${symbol}`;
  } else {
    toBalance.textContent = '0.00';
  }
  
  updateConversionPreview();
}

/**
 * Set maximum amount
 */
function setMaxAmount() {
  const fromSelect = document.getElementById('fromAssetSelect');
  const fromAmountInput = document.getElementById('fromAmountInput');
  
  if (!fromSelect || !fromAmountInput) return;
  
  const selectedOption = fromSelect.options[fromSelect.selectedIndex];
  if (selectedOption && selectedOption.value) {
    const balance = parseFloat(selectedOption.dataset.balance || '0');
    fromAmountInput.value = balance.toString();
    updateConversionPreview();
  }
}

/**
 * Swap from and to assets
 */
function swapAssets() {
  const fromSelect = document.getElementById('fromAssetSelect');
  const toSelect = document.getElementById('toAssetSelect');
  const fromAmountInput = document.getElementById('fromAmountInput');
  const toAmountInput = document.getElementById('toAmountInput');
  
  if (!fromSelect || !toSelect) return;
  
  // Swap the selected values
  const fromValue = fromSelect.value;
  const toValue = toSelect.value;
  
  fromSelect.value = toValue;
  toSelect.value = fromValue;
  
  // Clear amounts
  if (fromAmountInput) fromAmountInput.value = '';
  if (toAmountInput) toAmountInput.value = '';
  
  // Update displays
  updateFromAsset();
  updateToAsset();
  updateConversionPreview();
}

/**
 * Handle conversion form submission
 */
async function handleConversion(e) {
  e.preventDefault();
  
  const convertButton = document.getElementById('convertButton');
  const fromSelect = document.getElementById('fromAssetSelect');
  const toSelect = document.getElementById('toAssetSelect');
  const fromAmountInput = document.getElementById('fromAmountInput');
  
  if (!convertButton || !fromSelect || !toSelect || !fromAmountInput) return;
  
  // Show loading state
  const originalText = convertButton.innerHTML;
  convertButton.innerHTML = '<div class="loading-spinner"></div> Converting...';
  convertButton.disabled = true;
  
  try {
    const fromAsset = fromSelect.value;
    const toAsset = toSelect.value;
    const fromAmount = parseFloat(fromAmountInput.value);
    
    if (!fromAsset || !toAsset || fromAmount <= 0) {
      throw new Error('Please fill in all fields with valid values');
    }
    
    if (fromAsset === toAsset) {
      throw new Error('Cannot convert to the same asset');
    }
    
    console.log(`🔄 Starting conversion: ${fromAmount} ${fromAsset} → ${toAsset}`);
    
    // Calculate conversion using frontend logic
    const conversionResult = calculateConversion(fromAsset, toAsset, fromAmount);
    
    if (!conversionResult.success) {
      throw new Error(conversionResult.error);
    }
    
    console.log(`📊 Conversion calculated:`, {
      fromAmount,
      fromAsset,
      toAmount: conversionResult.toAmount,
      toAsset,
      rate: conversionResult.rate
    });
    
    // Validate the conversion result
    const warnings = validateConversion(fromAsset, toAsset, fromAmount, conversionResult.toAmount, conversionResult.rate);
    
    if (warnings.length > 0) {
      console.warn('⚠️ Conversion validation warnings:', warnings);
      // Show warning but don't block the conversion
      showConvertMessage(`⚠️ Warning: ${warnings[0]}. Please verify the conversion looks correct.`, 'error');
      
      // Give user a chance to cancel
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Make conversion request with calculated amounts
    console.log(`🚀 Sending conversion request to server...`);
    const response = await fetch('/api/convert', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: currentUser.id,
        fromAsset,
        toAsset,
        fromAmount: fromAmount.toString(),
        toAmount: conversionResult.toAmount.toString(), // Send calculated toAmount
        exchangeRate: conversionResult.rate.toString(), // Send calculated rate
        calculatedByFrontend: true, // Flag to indicate frontend calculation
        priceSource: convertCoinPrices._source || 'unknown', // Track price source
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Conversion failed');
    }
    
const result = await response.json();
console.log(`✅ Conversion successful:`, result);

// Show success message using the actual server conversion amounts
const actualToAmount = parseFloat(result.toAmount);
const displayToAmount = actualToAmount < 0.01 ? actualToAmount.toFixed(8) : actualToAmount.toFixed(6);

showConvertMessage(
  `✅ Successfully converted ${fromAmount} ${fromAsset} to ${displayToAmount} ${toAsset}`,
  'success'
);
    
    // Reset form
    fromAmountInput.value = '';
    document.getElementById('toAmountInput').value = '';
    document.getElementById('conversionSummary').style.display = 'none';
    
    // Reload data to update balances
    await loadConvertData();
    await loadConversionHistory();
    
  } catch (error) {
    console.error('💥 Conversion error:', error);
    showConvertMessage(`❌ ${error.message}`, 'error');
  } finally {
    // Restore button
    convertButton.innerHTML = originalText;
    convertButton.disabled = false;
  }
}

/**
 * Load conversion history
 */
async function loadConversionHistory() {
  if (!currentUser || !currentUser.id) return;
  
  try {
    const response = await fetch(`/api/user/${currentUser.id}/conversions`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch conversion history');
    }
    
    const conversions = await response.json();
    displayConversionHistory(conversions);
    
  } catch (error) {
    console.error('Error loading conversion history:', error);
  }
}

/**
 * Display conversion history
 */
function displayConversionHistory(conversions) {
  const historyContainer = document.getElementById('conversionHistory');
  if (!historyContainer) return;
  
  if (conversions.length === 0) {
    historyContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
        <i class="material-icons" style="font-size: 3rem; opacity: 0.4;">history</i>
        <p>No conversions yet</p>
      </div>
    `;
    return;
  }
  
  historyContainer.innerHTML = conversions.map(conversion => `
    <div class="history-item">
      <div class="history-main">
        <div class="history-conversion">
          ${parseFloat(conversion.fromAmount).toFixed(6)} ${conversion.fromAsset} → ${parseFloat(conversion.toAmount).toFixed(6)} ${conversion.toAsset}
        </div>
        <div class="history-rate">
          Rate: 1 ${conversion.fromAsset} = ${parseFloat(conversion.exchangeRate).toFixed(6)} ${conversion.toAsset}
        </div>
      </div>
      <div class="history-date">
        ${new Date(conversion.createdAt).toLocaleDateString()}
      </div>
    </div>
  `).join('');
}

/**
 * Show convert message
 */
function showConvertMessage(message, type = 'info') {
  const messagesContainer = document.getElementById('convertMessages');
  if (!messagesContainer) return;
  
  const messageClass = type === 'error' ? 'error-message' : type === 'success' ? 'success-message' : 'info-message';
  
  messagesContainer.innerHTML = `
    <div class="${messageClass}">
      ${message}
    </div>
  `;
  
  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      clearConvertMessages();
    }, 5000);
  }
}

/**
 * Clear convert messages
 */
function clearConvertMessages() {
  const messagesContainer = document.getElementById('convertMessages');
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
  }
}

/**
 * Update active navigation item
 */
function updateActiveNavItem(page) {
  // Remove active class from all nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active class to current page
  const activeItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
  }
}

/**
 * Handle browser back/forward
 */
function handlePopState(event) {
  const page = event.state?.page || window.location.hash.replace('#', '') || 'dashboard';
  loadPage(page); // Do not await if it causes issues, but typically fine
  updateActiveNavItem(page);
}

/**
 * Mobile menu functions
 */
function toggleMobileMenu() {
  if (sidebar) sidebar.classList.toggle('active');
}

function closeMobileMenu() {
  if (sidebar) sidebar.classList.remove('active');
}

/**
 * Notification functions
 */
function toggleNotifications(e) {
  e.stopPropagation();
  e.preventDefault();
  
  // Close profile dropdown first
  if (profileDropdown) profileDropdown.classList.remove('active');
  
  // Toggle notification popup
  if (notificationPopup) {
    const isActive = notificationPopup.classList.contains('active');
    if (isActive) {
      notificationPopup.classList.remove('active');
    } else {
      notificationPopup.classList.add('active');
      // Auto-close after 10 seconds if no interaction
      setTimeout(() => {
        if (notificationPopup && notificationPopup.classList.contains('active')) {
          notificationPopup.classList.remove('active');
        }
      }, 10000);
    }
  }
}

async function loadNotifications() {
  if (!currentUser || !currentUser.id) return;
  try {
    const response = await fetch(`/api/user/${currentUser.id}/notifications`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const notifications = await response.json();
      updateNotificationUI(notifications);
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

function updateNotificationUI(notifications) {
  if (!notificationPopup) return;
  const popupContent = notificationPopup.querySelector('.popup-content');
  if (!popupContent) return;
  
  // Update notification count badge
  const notificationBadge = document.querySelector('.notification-badge');
  const unreadCount = notifications.filter(n => !n.isRead).length;
  if (notificationBadge) {
    if (unreadCount > 0) {
      notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      notificationBadge.style.display = 'block';
    } else {
      notificationBadge.style.display = 'none';
    }
  }
  
  if (notifications.length === 0) {
    popupContent.innerHTML = `
      <div class="notification-empty">
        <i class="material-icons">notifications_none</i>
        <p>No notifications</p>
        <p class="text-muted">You're all caught up!</p>
      </div>
    `;
  } else {
    // Limit to 10 most recent notifications
    const recentNotifications = notifications.slice(0, 10);
    const notificationsList = recentNotifications.map(notif => `
      <div class="notification-item ${notif.isRead ? 'read' : 'unread'}" data-id="${notif.id}">
        <div class="notification-content">
          <p class="notification-message">${notif.message}</p>
          <small class="notification-time">${formatNotificationTime(notif.createdAt)}</small>
        </div>
        ${!notif.isRead ? '<div class="notification-dot"></div>' : ''}
      </div>
    `).join('');
    
    popupContent.innerHTML = `


      <div class="notification-list">
        ${notificationsList}
      </div>
      ${notifications.length > 10 ? '<div class="notification-footer"><small class="text-muted">Showing 10 most recent</small></div>' : ''}
    `;
  }
}

// Helper function to format notification time
function formatNotificationTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Function to mark all notifications as read
window.markAllNotificationsRead = async function() {
  if (!currentUser || !currentUser.id) return;
  
  try {
    const response = await fetch(`/api/user/${currentUser.id}/notifications-mark-all`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isRead: 1 })
    });
    
    if (response.ok) {
      // Reload notifications to update UI
      await loadNotifications();
    }
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
};

/**
 * Profile dropdown functions
 */
function toggleProfileDropdown(e) {
  e.stopPropagation();
  e.preventDefault();
  
  // Close notification popup first
  if (notificationPopup) notificationPopup.classList.remove('active');
  
  // Toggle profile dropdown
  if (profileDropdown) {
    const isActive = profileDropdown.classList.contains('active');
    if (isActive) {
      profileDropdown.classList.remove('active');
    } else {
      profileDropdown.classList.add('active');
      // Auto-close after 15 seconds if no interaction
      setTimeout(() => {
        if (profileDropdown && profileDropdown.classList.contains('active')) {
          profileDropdown.classList.remove('active');
        }
      }, 15000);
    }
  }
}

/**
 * Modal functions
 */
function openProfileModal() {
  closeAllDropdowns();
  closeAllModals(); // Close any other modals first
  setTimeout(() => { // Timeout ensures other modals are closed before opening new one
    if (modalOverlay) modalOverlay.classList.add('active');
    if (profileModal) profileModal.classList.add('active');
  }, 100); // Small delay
}

function openSettingsModal() {
  closeAllDropdowns();
  closeAllModals(); 
  setTimeout(() => {
    if (modalOverlay) modalOverlay.classList.add('active');
    if (settingsModal) settingsModal.classList.add('active');
  }, 100);
}

function openConnectWalletModal() {
  closeMobileMenu(); // Close mobile menu if open
  closeAllDropdowns();
  closeAllModals(); 
  setTimeout(() => {
    if (modalOverlay) modalOverlay.classList.add('active');
    if (connectWalletModal) connectWalletModal.classList.add('active');
  }, 100);
}

function openReferralsModal() {
  closeMobileMenu();
  closeAllDropdowns();
  closeAllModals(); 
  setTimeout(() => {
    if (modalOverlay) modalOverlay.classList.add('active');
    if (referralsModal) referralsModal.classList.add('active');
  }, 100);
}

function closeAllModals() {
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
  }
  document.querySelectorAll('.side-modal').forEach(modal => {
    modal.classList.remove('active');
  });
  
  // Also close any page-specific modals (like withdraw or deposit)
  // This targets modals that have their own overlay structure
  const pageSpecificModalOverlays = document.querySelectorAll('.withdraw-modal-overlay, .deposit-modal-overlay');
  pageSpecificModalOverlays.forEach(overlay => {
    if (overlay) overlay.style.display = 'none';
  });
}


function closeAllDropdowns() {
  if (notificationPopup) notificationPopup.classList.remove('active');
  if (profileDropdown) profileDropdown.classList.remove('active');
}

/**
 * Handle clicks outside of dropdowns and modals
 */
function handleOutsideClick(e) {
  // Close notification popup - improved detection
  if (notificationPopup && notificationBtn && 
      !notificationBtn.contains(e.target) && 
      !notificationPopup.contains(e.target) &&
      !e.target.closest('#notificationBtn') &&
      !e.target.closest('#notificationPopup')) {
    notificationPopup.classList.remove('active');
  }
  
  // Close profile dropdown - improved detection
  if (profileDropdown && profileBtn && 
      !profileBtn.contains(e.target) && 
      !profileDropdown.contains(e.target) &&
      !e.target.closest('#profileBtn') &&
      !e.target.closest('#profileDropdown')) {
    profileDropdown.classList.remove('active');
  }
  
  // Close mobile sidebar
  if (window.innerWidth <= 768 && sidebar && mobileMenuToggle && 
      sidebar.classList.contains('active') && // Only if active
      !sidebar.contains(e.target) && 
      !mobileMenuToggle.contains(e.target)) {
    closeMobileMenu();
  }
  
  // Close side modals if clicking on main overlay
  if (modalOverlay && e.target === modalOverlay) {
    closeAllModals(); // This closes general side modals
  }

  // Close page-specific modals (like withdraw or deposit) if clicking their overlay
  const withdrawModalOverlay = document.getElementById('withdrawModalOverlay');
  if (withdrawModalOverlay && e.target === withdrawModalOverlay) {
    withdrawModalOverlay.style.display = 'none';
  }
  const depositModalOverlay = document.getElementById('depositModalOverlay');
  if (depositModalOverlay && e.target === depositModalOverlay) {
    depositModalOverlay.style.display = 'none';
  }
}

/**
 * Copy referral link
 */
function copyReferralLink() {
  const referralInput = document.getElementById('referralLinkInput');
  if (referralInput) {
    referralInput.select();
    referralInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
      document.execCommand('copy');
      
      // Show feedback
      const copyBtn = document.getElementById('copyReferralLink');
      if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="material-icons">check</i>';
        copyBtn.style.background = 'var(--success-color)';
        
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.style.background = 'var(--accent-color)'; // Reset to original color
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy referral link:', err);
      // Optionally, provide fallback or alert user
    }
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    // No need to await, just fire and forget if server needs to clear session
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error); // Log error but still redirect
  }
  // Always redirect to login page
  window.location.href = '/login/'; // Ensure this path is correct
}

/**
 * Handle authentication errors
 */
function handleAuthError() {
  // Redirect to login page if authentication fails or user is not found
  window.location.href = '/login/'; // Ensure this path is correct
}

/**
 * Loading functions
 */
function showLoading() {
  isLoading = true;
  if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  isLoading = false;
  if (loadingOverlay) loadingOverlay.style.display = 'none';
}

/**
 * Utility function to make navigateToPage available globally
 * if other scripts need to call it.
 */
window.navigateToPage = navigateToPage;

/**
 * Debug function for conversion calculations
 * Usage: debugConversion('USD', 'BTC', 10) in browser console
 */
window.debugConversion = function(fromAsset, toAsset, amount) {
  console.log('=== CONVERSION DEBUG ===');
  console.log(`Converting ${amount} ${fromAsset} to ${toAsset}`);
  console.log('User Currency:', convertUserCurrency);
  
  // Show current rates
  console.log('Exchange Rates Source:', convertExchangeRates._source || 'Unknown');
  console.log('Crypto Prices Source:', convertCoinPrices._source || 'Unknown');
  console.log('Available crypto prices:', Object.keys(convertCoinPrices).filter(k => !k.startsWith('_')));
  
  if (fromAsset !== convertUserCurrency) {
    const mapping = {
      'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin',
      'DOGE': 'dogecoin', 'USDT': 'tether', 'USDC': 'usd-coin',
      'XRP': 'ripple', 'ADA': 'cardano', 'SOL': 'solana',
      'AVAX': 'avalanche-2', 'SHIB': 'shiba-inu', 'LTC': 'litecoin',
      'TRX': 'tron', 'MATIC': 'polygon-ecosystem-token', 'PEPE': 'pepe'
    };
    const coinKey = mapping[fromAsset.toUpperCase()] || fromAsset.toLowerCase();
    const price = convertCoinPrices[coinKey]?.usd;
    console.log(`${fromAsset} (${coinKey}) price:`, price);
    
    // Special check for SHIB and PEPE
    if (fromAsset === 'SHIB' || fromAsset === 'PEPE') {
      console.log(`🔍 ${fromAsset} price validation:`, {
        key: coinKey,
        rawPrice: price,
        isValidNumber: typeof price === 'number',
        isPositive: price > 0,
        isFinite: isFinite(price),
        expectedRange: fromAsset === 'SHIB' ? '$0.00001 - $0.0001' : '$0.000001 - $0.00001'
      });
    }
  }
  
  if (toAsset !== convertUserCurrency) {
    const mapping = {
      'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin',
      'DOGE': 'dogecoin', 'USDT': 'tether', 'USDC': 'usd-coin',
      'XRP': 'ripple', 'ADA': 'cardano', 'SOL': 'solana',
      'AVAX': 'avalanche-2', 'SHIB': 'shiba-inu', 'LTC': 'litecoin',
      'TRX': 'tron', 'MATIC': 'polygon-ecosystem-token', 'PEPE': 'pepe'
    };
    const coinKey = mapping[toAsset.toUpperCase()] || toAsset.toLowerCase();
    const price = convertCoinPrices[coinKey]?.usd;
    console.log(`${toAsset} (${coinKey}) price:`, price);
    
    // Special check for SHIB and PEPE
    if (toAsset === 'SHIB' || toAsset === 'PEPE') {
      console.log(`🔍 ${toAsset} price validation:`, {
        key: coinKey,
        rawPrice: price,
        isValidNumber: typeof price === 'number',
        isPositive: price > 0,
        isFinite: isFinite(price),
        expectedRange: toAsset === 'SHIB' ? '$0.00001 - $0.0001' : '$0.000001 - $0.00001'
      });
    }
  }
  
  console.log(`${convertUserCurrency} exchange rate:`, convertExchangeRates[convertUserCurrency] || 'NOT FOUND');
  
  // Perform calculation
  const result = calculateConversion(fromAsset, toAsset, amount);
  console.log('Calculation Result:', result);
  
  if (result.success) {
    console.log(`✅ ${amount} ${fromAsset} = ${result.toAmount.toFixed(8)} ${toAsset}`);
    console.log(`Exchange Rate: 1 ${fromAsset} = ${result.rate.toFixed(8)} ${toAsset}`);
    
    // Sanity check for common conversions
    if (fromAsset === 'USD' && (toAsset === 'SHIB' || toAsset === 'PEPE')) {
      const expectedMin = toAsset === 'SHIB' ? 10000 : 100000; // Minimum expected tokens for $1
      const tokensPerUSD = result.toAmount / amount;
      if (tokensPerUSD < expectedMin) {
        console.warn(`⚠️ SANITY CHECK FAILED: Got ${tokensPerUSD} ${toAsset} per USD, expected at least ${expectedMin}`);
      } else {
        console.log(`✅ SANITY CHECK PASSED: ${tokensPerUSD.toFixed(0)} ${toAsset} per USD looks reasonable`);
      }
    }
  } else {
    console.log('❌ Error:', result.error);
  }
  
  console.log('=== END DEBUG ===');
  return result;
};

/**
 * Helper function to validate conversion before sending to server
 */
function validateConversion(fromAsset, toAsset, fromAmount, toAmount, rate) {
  const warnings = [];
  
  // Check for suspicious 1:1 conversions
  if (Math.abs(rate - 1) < 0.0001) {
    warnings.push(`Suspicious 1:1 conversion rate for ${fromAsset} to ${toAsset}`);
  }
  
  // Check for SHIB/PEPE specific validations
  if (fromAsset === 'USD' && toAsset === 'SHIB') {
    const tokensPerUSD = toAmount / fromAmount;
    if (tokensPerUSD < 10000) {
      warnings.push(`SHIB conversion looks wrong: only ${tokensPerUSD} SHIB per USD (expected 10,000+)`);
    }
  }
  
  if (fromAsset === 'USD' && toAsset === 'PEPE') {
    const tokensPerUSD = toAmount / fromAmount;
    if (tokensPerUSD < 100000) {
      warnings.push(`PEPE conversion looks wrong: only ${tokensPerUSD} PEPE per USD (expected 100,000+)`);
    }
  }
  
  // Check for unreasonably small amounts
  if (toAmount < 0.000000001) {
    warnings.push(`Conversion result suspiciously small: ${toAmount}`);
  }
  
  return warnings;
}
