/*************************************************************
 *  app.js — Node/Express/SQLite backend with HTTP-only cookie auth
 *************************************************************/

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { randomBytes } from 'crypto';
import { CronJob } from 'cron';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// 1) IMPORTANT: import the wallet generator
import { generateAllWallets } from './walletgen.js';

import path from 'path';
import { fileURLToPath } from 'url';

// **** Added for price fetching ****
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================
// ENV / CONFIG
// ============================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_TO_SOMETHING_SECURE';

// Major world currencies for MVP
const MAJOR_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' }
];

// Multiple Exchange Rate APIs for fallback
// 10 Free Exchange Rate APIs for fallback (no API keys required)
const EXCHANGE_RATE_APIS = [
  {
    name: 'ExchangeRate-API',
    url: () => 'https://api.exchangerate-api.com/v4/latest/USD',
    transform: (data) => data.rates
  },
  {
    name: 'ExchangeRate.host',
    url: () => 'https://api.exchangerate.host/latest?base=USD',
    transform: (data) => data.rates
  },
  {
    name: 'Currency-API',
    url: () => 'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
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
    url: () => 'https://api.fxratesapi.com/latest',
    transform: (data) => data.rates
  },
  {
    name: 'FastForex',
    url: () => 'https://api.fastforex.io/fetch-all?from=USD',
    transform: (data) => data.results
  },
  {
    name: 'CurrencyBeacon',
    url: () => 'https://api.currencybeacon.com/v1/latest?base=USD',
    transform: (data) => data.rates
  },
  {
    name: 'CurrencyScoop',
    url: () => 'https://api.currencyscoop.com/v1/latest?base=USD',
    transform: (data) => data.response.rates
  },
  {
    name: 'ExchangeRates-API',
    url: () => 'https://open.er-api.com/v6/latest/USD',
    transform: (data) => data.rates
  },
  {
    name: 'FreeCurrencyAPI',
    url: () => 'https://api.freecurrencyapi.com/v1/latest?base_currency=USD',
    transform: (data) => data.data
  },
  {
    name: 'CurrencyAPI',
    url: () => 'https://api.currencyapi.com/v3/latest?base_currency=USD',
    transform: (data) => {
      const rates = {};
      Object.keys(data.data).forEach(currency => {
        rates[currency] = data.data[currency].value;
      });
      return rates;
    }
  }
];

const app = express();

// CORS setup
app.use(
  cors({
    origin: 'http://localhost:3001', // Adjust to your frontend domain if needed
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'projectinsight')));

// -----------------------------------------------------
// 0) Initialize / Open Database
// -----------------------------------------------------
let db;
(async () => {
  db = await open({
    filename: './myCryptoDemo.sqlite',
    driver: sqlite3.Database
  });

  // Create tables if they do not exist.
// First, create all existing tables
await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      country TEXT,
      password TEXT,
      accountCurrency TEXT,
      verificationStatus TEXT DEFAULT 'not_verified',
      planName TEXT,
      planAmount TEXT,
      referrerUsed TEXT,
      myReferrerCode TEXT,
      referrerCount INTEGER DEFAULT 0,
      referrerEarnings TEXT DEFAULT '0',
      fiatBalance TEXT DEFAULT '0',
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS user_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      coinName TEXT,
      shortName TEXT,
      walletAddress TEXT,
      privateKey TEXT,
      balance TEXT DEFAULT '0',
      type TEXT DEFAULT 'crypto'
    );

    CREATE TABLE IF NOT EXISTS user_external_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      walletName TEXT,
      walletText TEXT
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      date TEXT,
      reference TEXT,
      method TEXT,
      type TEXT,
      amount TEXT,
      totalEUR TEXT,
      status TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      date TEXT,
      reference TEXT,
      method TEXT,
      amount TEXT,
      total TEXT,
      status TEXT,
      type TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS user_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      signalName TEXT,
      balance TEXT DEFAULT '0'
    );

    CREATE TABLE IF NOT EXISTS user_stakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      stakeName TEXT,
      balance TEXT DEFAULT '0'
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      minimum TEXT,
      maximum TEXT,
      duration INTEGER,
      roi TEXT
    );

    CREATE TABLE IF NOT EXISTS signal_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price TEXT,
      strength INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      planName TEXT,
      balance TEXT DEFAULT '0'
    );

    CREATE TABLE IF NOT EXISTS active_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      planId INTEGER,
      amount TEXT,
      roiPercentage TEXT,
      duration INTEGER,
      startDate TEXT,
      endDate TEXT,
      estimatedReturns TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS active_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      packageId INTEGER,
      startDate TEXT,
      endDate TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      message TEXT,
      isRead INTEGER DEFAULT 0,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      fromAsset TEXT,
      toAsset TEXT,
      fromAmount TEXT,
      toAmount TEXT,
      exchangeRate TEXT,
      reference TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS active_stakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      coinSymbol TEXT,
      amount TEXT,
      roiPercentage TEXT,
      duration INTEGER,
      startDate TEXT,
      endDate TEXT,
      estimatedReturns TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT
    );
  `);

  // Check if tables exist and create missing ones
  try {
    // Check if user_stakes exists, if not create it
    const userStakesExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='user_stakes'");
    if (!userStakesExists) {
      await db.exec(`
        CREATE TABLE user_stakes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          stakeName TEXT,
          balance TEXT DEFAULT '0'
        );
      `);
      console.log('Created missing user_stakes table');
    }

    // Check if active_stakes exists, if not create it
    const activeStakesExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='active_stakes'");
    if (!activeStakesExists) {
      await db.exec(`
        CREATE TABLE active_stakes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          coinSymbol TEXT,
          amount TEXT,
          roiPercentage TEXT,
          duration INTEGER,
          startDate TEXT,
          endDate TEXT,
          estimatedReturns TEXT,
          status TEXT DEFAULT 'active',
          createdAt TEXT
        );
      `);
      console.log('Created missing active_stakes table');
    }

    // Initialize stake data for existing users who don't have stakes
    const existingUsers = await db.all('SELECT id FROM users');
    for (const user of existingUsers) {
      const existingStakes = await db.get('SELECT id FROM user_stakes WHERE userId = ?', [user.id]);
      if (!existingStakes) {
        // Initialize stakes for existing user
        const stakeList = ["Avalanche", "Ethereum", "Polygon", "Solana", "Tether"];
        for (let stakeName of stakeList) {
          await db.run(`
            INSERT INTO user_stakes (userId, stakeName, balance)
            VALUES (?, ?, '0')
          `, [user.id, stakeName]);
        }
        console.log(`Initialized stakes for existing user ${user.id}`);
      }
    }

    // Initialize default subscription plans if table empty
    const subPlanCount = await db.get('SELECT COUNT(*) as count FROM subscription_plans');
    if (subPlanCount.count === 0) {
      const defaultPlans = [
        { name: 'Premium plan', minimum: '4000', maximum: '50000', duration: 3, roi: '600' },
        { name: 'Pro plan', minimum: '50000', maximum: '500000', duration: 10, roi: '700' },
        { name: 'Expert plan', minimum: '500000', maximum: '1000000', duration: 31, roi: '900' },
        { name: 'Gold pro plan', minimum: '1000000', maximum: '50000000', duration: 7, roi: '650' }
      ];
      for (const p of defaultPlans) {
        await db.run(
          `INSERT INTO subscription_plans (name, minimum, maximum, duration, roi) VALUES (?, ?, ?, ?, ?)`,
          [p.name, p.minimum, p.maximum, p.duration, p.roi]
        );
      }
      console.log('Inserted default subscription plans');
    }

    // Initialize default signal packages if table empty
    const sigPkgCount = await db.get('SELECT COUNT(*) as count FROM signal_packages');
    if (sigPkgCount.count === 0) {
      const defaultSignals = [
        { name: 'CD V1', price: '650', strength: 30 },
        { name: 'CD V5 Pro', price: '6000', strength: 50 },
        { name: 'BC-IRS', price: '7000', strength: 70 },
        { name: 'XPN-4N', price: '8000', strength: 60 },
        { name: 'BC-IRS LEVEL2 Pro', price: '10000', strength: 70 },
        { name: 'TASANA Pro', price: '15000', strength: 80 },
        { name: 'RBF V6 25000', price: '25000', strength: 90 },
        { name: 'SILVER Pro', price: '35000', strength: 100 },
        { name: 'WAYXE Pro', price: '50000', strength: 100 }
      ];
      for (const s of defaultSignals) {
        await db.run(
          `INSERT INTO signal_packages (name, price, strength) VALUES (?, ?, ?)`,
          [s.name, s.price, s.strength]
        );
      }
      console.log('Inserted default signal packages');
    }

  } catch (tableError) {
    console.error('Error creating missing tables:', tableError);
  }

  console.log('Database connected and tables ensured.');
})();

// -----------------------------------------------------
// Helper Functions
// -----------------------------------------------------
function generateRefCode() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return code;
}

function generateReference() {
  return randomBytes(8).toString('hex');
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1d' });
}

// Optional auth middleware (used on certain routes)
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized. No token provided.' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// -----------------------------------------------------
// Currency and Exchange Rate Functions
// -----------------------------------------------------
async function fetchExchangeRates() {
  console.log('🔄 Fetching exchange rates from multiple APIs...');
  
  for (const api of EXCHANGE_RATE_APIS) {
    try {
      console.log(`Trying ${api.name}...`);
      const response = await fetch(api.url());
      
      if (!response.ok) {
        console.warn(`${api.name} returned status ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const rates = api.transform(data);
      
      // Validate we got meaningful data
      if (rates && typeof rates === 'object' && Object.keys(rates).length > 10) {
        // Ensure USD is always 1
        rates.USD = 1;
        console.log(`✅ Successfully fetched ${Object.keys(rates).length} exchange rates from ${api.name}`);
        return rates;
      } else {
        throw new Error('Insufficient exchange rate data received');
      }
    } catch (error) {
      console.warn(`❌ Failed to fetch exchange rates from ${api.name}:`, error.message);
      continue;
    }
  }
  
  console.log('⚠️ All exchange rate APIs failed, using fallback rates');
  // Fallback rates if all APIs fail
  return {
    USD: 1, };
}

function guessCoinGeckoKey(shortName) {
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
}

// -----------------------------------------------------
// 2) Auth Routes (Sign Up, Sign In, Logout, Me)
// -----------------------------------------------------

/**
 * 2.1) SIGNUP
 */
app.post('/api/auth/signup', async (req, res) => {
  const now = new Date().toISOString();

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      country,
      password,
      accountCurrency,
      referrerCode
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and Password are required' });
    }

    if (!accountCurrency || !MAJOR_CURRENCIES.find(c => c.code === accountCurrency)) {
      return res.status(400).json({ error: 'Valid account currency is required' });
    }

    // Generate new user ref code
    const myRefCode = generateRefCode();

    // Insert user in DB
    const insertUser = await db.run(`
      INSERT INTO users (
        firstName, lastName, email, phone, country, password, accountCurrency,
        referrerUsed, myReferrerCode, fiatBalance, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      firstName || '',
      lastName || '',
      email.trim(),
      phone || '',
      country || '',
      password, // Plaintext password (as requested)
      accountCurrency,
      referrerCode || '',
      myRefCode,
      '1000.00', // Starting fiat balance for testing
      now,
      now
    ]);

    const newUserId = insertUser.lastID;

    // If user used a valid referrer code, increment that referrer's count
    if (referrerCode && referrerCode.trim() !== '') {
      const refUser = await db.get('SELECT * FROM users WHERE myReferrerCode = ?', [referrerCode.trim()]);
      if (refUser) {
        await db.run(`
          UPDATE users
          SET referrerCount = referrerCount + 1
          WHERE id = ?
        `, [refUser.id]);
      }
    }

    // ========== Generate new user wallets from walletgen.js ==========
    try {
      const generatedWallets = await generateAllWallets();
      for (let w of generatedWallets) {
        await db.run(`
          INSERT INTO user_wallets (
            userId, coinName, shortName, walletAddress, privateKey, type
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          newUserId,
          w.coinName,
          w.shortName,
          w.walletAddress,
          w.privateKey,
          'crypto'
        ]);
      }

      // Add fiat wallet
      await db.run(`
        INSERT INTO user_wallets (
          userId, coinName, shortName, walletAddress, privateKey, balance, type
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        newUserId,
        MAJOR_CURRENCIES.find(c => c.code === accountCurrency).name,
        accountCurrency,
        'FIAT_WALLET',
        'FIAT_PRIVATE_KEY',
        '1000.00', // Starting balance
        'fiat'
      ]);

    } catch (errWallet) {
      // If something fails, delete user to avoid leftover user record
      await db.run('DELETE FROM users WHERE id = ?', [newUserId]);
      return res.status(500).json({
        error: 'Failed to generate or insert wallets.',
        details: errWallet.message
      });
    }

    // Initialize external wallets
    const externalWalletNames = [
      "Aktionariat Wallet", "Binance", "Bitcoin Wallet", "Bitkeep Wallet",
      "Bitpay", "Blockchain", "Coinbase", "Coinbase One", "Crypto Wallet",
      "Exodus Wallet", "Gemini", "Imtoken", "Infinito Wallet", "Infinity Wallet",
      "Keyringpro Wallet", "Metamask", "Ownbit Wallet", "Phantom Wallet",
      "Pulse Wallet", "Rainbow", "Robinhood Wallet", "Safepal Wallet",
      "Sparkpoint Wallet", "Trust Wallet", "Uniswap", "Wallet io"
    ];
    for (let walletName of externalWalletNames) {
      await db.run(`
        INSERT INTO user_external_wallets (userId, walletName, walletText)
        VALUES (?, ?, '')
      `, [newUserId, walletName]);
    }

    // Initialize signals
    const signalsList = [
      "ACD-Pro", "CD V5 Pro", "XPN-4N", "BC-IRS", "BC-IRS LEVEL2 Pro",
      "TASANA Pro", "RBF V6 25000", "SILVER Pro WAYXE Pro"
    ];
    for (let signalName of signalsList) {
      await db.run(`
        INSERT INTO user_signals (userId, signalName, balance)
        VALUES (?, ?, '0')
      `, [newUserId, signalName]);
    }

    // Initialize stakes
    const stakeList = ["Avalanche", "Ethereum", "Polygon", "Solana", "Tether"];
    for (let stakeName of stakeList) {
      await db.run(`
        INSERT INTO user_stakes (userId, stakeName, balance)
        VALUES (?, ?, '0')
      `, [newUserId, stakeName]);
    }

    // Finally, return newly created user (minus password)
    const user = await db.get('SELECT * FROM users WHERE id = ?', [newUserId]);
    const { password: pw, ...userSafe } = user;
    res.json({ message: 'Signup successful', user: userSafe });
  } catch (err) {
    console.error('Sign up error:', err);
    res.status(500).json({ error: 'Could not sign up user', details: err.message });
  }
});

/**
 * 2.2) SIGNIN (using HTTP-only cookie for JWT)
 */
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email & Password required' });
    }

    const user = await db.get(`
      SELECT * FROM users
      WHERE email = ?
    `, [email.trim()]);

    // Simple password check
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = generateToken(user.id);

    // Set token in an HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    const { password: _, ...userSafe } = user;
    res.json({
      message: 'Sign in successful',
      user: userSafe
    });
  } catch (err) {
    console.error('Sign in error:', err);
    res.status(500).json({ error: 'Could not sign in', details: err.message });
  }
});

/**
 * 2.3) LOGOUT
 */
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out' });
});

/**
 * 2.4) ME — Return the currently logged-in user's data
 */
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...userSafe } = user;
    res.json({ user: userSafe });
  } catch (err) {
    console.error('ME route error:', err);
    res.status(500).json({ error: 'Could not fetch user' });
  }
});

// -----------------------------------------------------
// NEW: Major Currencies Endpoint
// -----------------------------------------------------
app.get('/api/major-currencies', (req, res) => {
  res.json(MAJOR_CURRENCIES);
});

// -----------------------------------------------------
// NEW: Exchange Rates Endpoint  
// -----------------------------------------------------
app.get('/api/exchange-rates', async (req, res) => {
  try {
    const rates = await fetchExchangeRates();
    res.json(rates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Could not fetch exchange rates' });
  }
});

// -----------------------------------------------------
// 3) Wallet Management (User-facing CRUD)
// -----------------------------------------------------
app.post('/api/user/:userId/wallets', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { coinName, shortName, walletAddress, privateKey, balance, type } = req.body;

    if (!coinName || !shortName) {
      return res.status(400).json({ error: 'coinName and shortName are required' });
    }

    await db.run(`
      INSERT INTO user_wallets
        (userId, coinName, shortName, walletAddress, privateKey, balance, type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      coinName,
      shortName,
      walletAddress || '',
      privateKey || '',
      balance || '0',
      type || 'crypto'
    ]);

    res.json({ message: 'Wallet added successfully' });
  } catch (err) {
    console.error('Add wallet error:', err);
    res.status(500).json({ error: 'Could not add wallet', details: err.message });
  }
});

app.get('/api/user/:userId/wallets', async (req, res) => {
  try {
    const userId = req.params.userId;
    const wallets = await db.all(`
      SELECT * FROM user_wallets WHERE userId = ?
    `, [userId]);
    res.json(wallets);
  } catch (err) {
    console.error('Get wallets error:', err);
    res.status(500).json({ error: 'Could not fetch user wallets' });
  }
});

app.put('/api/user/:userId/wallets/:walletId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const walletId = req.params.walletId;
    const { coinName, shortName, walletAddress, privateKey, balance, type } = req.body;

    await db.run(`
      UPDATE user_wallets
      SET
        coinName = ?,
        shortName = ?,
        walletAddress = ?,
        privateKey = ?,
        balance = ?,
        type = ?
      WHERE id = ? AND userId = ?
    `, [
      coinName,
      shortName,
      walletAddress,
      privateKey,
      balance,
      type || 'crypto',
      walletId,
      userId
    ]);

    res.json({ message: 'Wallet updated successfully' });
  } catch (err) {
    console.error('Update wallet error:', err);
    res.status(500).json({ error: 'Could not update wallet', details: err.message });
  }
});

app.delete('/api/user/:userId/wallets/:walletId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const walletId = req.params.walletId;

    await db.run(`
      DELETE FROM user_wallets
      WHERE id = ? AND userId = ?
    `, [walletId, userId]);

    res.json({ message: 'Wallet deleted successfully' });
  } catch (err) {
    console.error('Delete wallet error:', err);
    res.status(500).json({ error: 'Could not delete wallet', details: err.message });
  }
});

// -----------------------------------------------------
// 3b) External Wallets CRUD (User-facing)
// -----------------------------------------------------
app.post('/api/user/:userId/external-wallets', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { walletName, walletText } = req.body;

    if (!walletName) {
      return res.status(400).json({ error: 'walletName is required' });
    }

    await db.run(`
      INSERT INTO user_external_wallets (userId, walletName, walletText)
      VALUES (?, ?, ?)
    `, [userId, walletName, walletText || '']);

    res.json({ message: 'External wallet added successfully' });
  } catch (err) {
    console.error('Add external wallet error:', err);
    res.status(500).json({ error: 'Could not add external wallet', details: err.message });
  }
});

app.get('/api/user/:userId/external-wallets', async (req, res) => {
  try {
    const userId = req.params.userId;
    const data = await db.all(`
      SELECT * FROM user_external_wallets WHERE userId = ?
    `, [userId]);
    res.json(data);
  } catch (err) {
    console.error('Get external wallets error:', err);
    res.status(500).json({ error: 'Could not fetch external wallets' });
  }
});

app.put('/api/user/:userId/external-wallets/:extWalletId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const extWalletId = req.params.extWalletId;
    const { walletName, walletText } = req.body;

    await db.run(`
      UPDATE user_external_wallets
      SET walletName = ?,
          walletText = ?
      WHERE id = ? AND userId = ?
    `, [walletName, walletText, extWalletId, userId]);

    res.json({ message: 'External wallet updated successfully' });
  } catch (err) {
    console.error('Update external wallet error:', err);
    res.status(500).json({ error: 'Could not update external wallet', details: err.message });
  }
});

app.delete('/api/user/:userId/external-wallets/:extWalletId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const extWalletId = req.params.extWalletId;

    await db.run(`
      DELETE FROM user_external_wallets
      WHERE id = ? AND userId = ?
    `, [extWalletId, userId]);

    res.json({ message: 'External wallet deleted successfully' });
  } catch (err) {
    console.error('Delete external wallet error:', err);
    res.status(500).json({ error: 'Could not delete external wallet', details: err.message });
  }
});

// -----------------------------------------------------
// 4) User & Admin Endpoints
// -----------------------------------------------------
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.all('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Could not fetch all users' });
  }
});

// Get single user + all sub-resources
app.get('/api/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const wallets = await db.all('SELECT * FROM user_wallets WHERE userId = ?', [userId]);
    const externalWallets = await db.all('SELECT * FROM user_external_wallets WHERE userId = ?', [userId]);
    const signals = await db.all('SELECT * FROM user_signals WHERE userId = ?', [userId]);
    const stakes = await db.all('SELECT * FROM user_stakes WHERE userId = ?', [userId]);
    const deposits = await db.all('SELECT * FROM deposits WHERE userId = ?', [userId]);
    const withdrawals = await db.all('SELECT * FROM withdrawals WHERE userId = ?', [userId]);
    const notifications = await db.all('SELECT * FROM notifications WHERE userId = ?', [userId]);

    res.json({
      user,
      wallets,
      externalWallets,
      signals,
      stakes,
      deposits,
      withdrawals,
      notifications
    });
  } catch (err) {
    console.error('Get user data error:', err);
    res.status(500).json({ error: 'Could not fetch user data' });
  }
});

/**
 * Update a user's fields (User-facing or Admin)
 */
app.put('/api/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    // We'll accept arbitrary fields from the body to update the user
    // (e.g. firstName, lastName, email, phone, password, etc.)
    const updateFields = req.body;
    if (!updateFields || Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update.' });
    }

    // Build dynamic SET clause
    const columns = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
    const values = Object.values(updateFields);

    const sql = `UPDATE users SET ${columns}, updatedAt = ? WHERE id = ?`;
    await db.run(sql, [...values, new Date().toISOString(), userId]);

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Could not update user', details: err.message });
  }
});

/**
 * Delete a user entirely (User or Admin). 
 * - This also optionally could delete all user sub-resources if you want.
 *   For now, let's just delete the user row itself. 
 */
app.delete('/api/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // If you want to remove sub-resources, you can also do:
    // await db.run(`DELETE FROM user_wallets WHERE userId = ?`, [userId]);
    // ... etc.

    await db.run(`DELETE FROM users WHERE id = ?`, [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Could not delete user', details: err.message });
  }
});

// Admin update user verification
app.put('/api/admin/verify-user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { verificationStatus } = req.body;
    await db.run(`
      UPDATE users
      SET verificationStatus = ?,
          updatedAt = ?
      WHERE id = ?
    `, [
      verificationStatus || 'not_verified',
      new Date().toISOString(),
      userId
    ]);
    res.json({ message: 'User verification status updated' });
  } catch (err) {
    console.error('Verify user error:', err);
    res.status(500).json({ error: 'Could not update user verification' });
  }
});

// Admin/User update plan subscription
app.put('/api/user/:id/plan', async (req, res) => {
  try {
    const userId = req.params.id;
    const { planName, planAmount } = req.body;
    await db.run(`
      UPDATE users
      SET planName = ?,
          planAmount = ?,
          updatedAt = ?
      WHERE id = ?
    `, [
      planName || '',
      planAmount || '0',
      new Date().toISOString(),
      userId
    ]);
    res.json({ message: 'Plan updated successfully' });
  } catch (err) {
    console.error('Update plan error:', err);
    res.status(500).json({ error: 'Could not update plan', details: err.message });
  }
});

// -----------------------------------------------------
// 5) Deposits / Withdrawals with Admin Status Management
// -----------------------------------------------------
app.post('/api/deposits', async (req, res) => {
  try {
    const { userId, method, type, amount, totalEUR } = req.body;
    const reference = generateReference();
    const now = new Date().toISOString();

    const result = await db.run(`
      INSERT INTO deposits (
        userId, date, reference, method, type, amount, totalEUR, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [
      userId,
      now,
      reference,
      method || '',
      type || '',
      amount || '0',
      totalEUR || '0',
      now
    ]);

    res.json({
      message: 'Deposit created',
      depositId: result.lastID,
      reference
    });
  } catch (err) {
    console.error('Create deposit error:', err);
    res.status(500).json({ error: 'Could not create deposit', details: err.message });
  }
});

app.get('/api/user/:id/deposits', async (req, res) => {
  try {
    const userId = req.params.id;
    const list = await db.all('SELECT * FROM deposits WHERE userId = ?', [userId]);
    res.json(list);
  } catch (err) {
    console.error('List deposits error:', err);
    res.status(500).json({ error: 'Could not fetch deposits' });
  }
});

/** Update deposit (Admin or user) with balance update */
app.put('/api/user/:id/deposits/:depositId', async (req, res) => {
  try {
    const userId = req.params.id;
    const depositId = req.params.depositId;
    const updateFields = req.body;

    if (!updateFields || Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update.' });
    }

    // Get current deposit to check if status is changing
    const currentDeposit = await db.get('SELECT * FROM deposits WHERE id = ? AND userId = ?', [depositId, userId]);
    if (!currentDeposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    // Update deposit first
    const columns = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
    const values = Object.values(updateFields);

    const sql = `UPDATE deposits SET ${columns} WHERE id = ? AND userId = ?`;
    await db.run(sql, [...values, depositId, userId]);

    // If status changed to confirmed/approved, add to user's crypto balance
    if (updateFields.status && updateFields.status === 'confirmed' && currentDeposit.status !== 'confirmed') {
      const method = currentDeposit.method; // e.g., 'BTC', 'ETH'
      const amount = parseFloat(currentDeposit.amount) || 0;
      
      if (amount > 0 && method) {
        // Find user's wallet for this crypto (backward compatible)
        const wallets = await db.all('SELECT * FROM user_wallets WHERE userId = ?', [userId]);
        const wallet = wallets.find(w => 
          (w.shortName && w.shortName.toUpperCase() === method.toUpperCase()) &&
          (w.type === 'crypto' || !w.type) // Backward compatibility
        );

        if (wallet) {
          const newBalance = parseFloat(wallet.balance) + amount;
          await db.run(`
            UPDATE user_wallets 
            SET balance = ? 
            WHERE id = ?
          `, [newBalance.toString(), wallet.id]);

          // Create notification
          await db.run(`
            INSERT INTO notifications (userId, message, createdAt)
            VALUES (?, ?, ?)
          `, [
            userId,
            `Your deposit of ${amount} ${method} has been confirmed and added to your wallet.`,
            new Date().toISOString()
          ]);
        } else {
          console.warn(`No wallet found for method: ${method}, userId: ${userId}`);
          // Still update status but don't add balance
          await db.run(`
            INSERT INTO notifications (userId, message, createdAt)
            VALUES (?, ?, ?)
          `, [
            userId,
            `Your deposit of ${amount} ${method} has been confirmed, but no corresponding wallet was found.`,
            new Date().toISOString()
          ]);
        }

        // Credit referrer if applicable
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (user && user.referrerUsed) {
          const refUser = await db.get('SELECT * FROM users WHERE myReferrerCode = ?', [user.referrerUsed]);
          if (refUser) {
            const reward = (parseFloat(currentDeposit.totalEUR) || 0) * 0.10;
            const refWallet = await db.get('SELECT * FROM user_wallets WHERE userId = ? AND shortName = ? AND type = "fiat"', [refUser.id, refUser.accountCurrency]);
            if (refWallet) {
              const newRefBal = (parseFloat(refWallet.balance) || 0) + reward;
              await db.run('UPDATE user_wallets SET balance = ? WHERE id = ?', [newRefBal.toString(), refWallet.id]);
            }
            const newEarn = (parseFloat(refUser.referrerEarnings) || 0) + reward;
            await db.run('UPDATE users SET referrerEarnings = ?, updatedAt = ? WHERE id = ?', [newEarn.toString(), new Date().toISOString(), refUser.id]);
            await db.run('INSERT INTO notifications (userId, message, createdAt) VALUES (?, ?, ?)', [refUser.id, `You earned ${reward} ${refUser.accountCurrency} from a referral deposit`, new Date().toISOString()]);
          }
        }
      }
    }

    // Create notification for other status changes
    if (updateFields.status && updateFields.status !== 'confirmed' && currentDeposit.status !== updateFields.status) {
      await db.run(`
        INSERT INTO notifications (userId, message, createdAt)
        VALUES (?, ?, ?)
      `, [
        userId,
        `Your deposit status has been updated to: ${updateFields.status}`,
        new Date().toISOString()
      ]);
    }

    res.json({ message: 'Deposit updated successfully' });
  } catch (err) {
    console.error('Update deposit error:', err);
    res.status(500).json({ error: 'Could not update deposit', details: err.message });
  }
});

/** Delete deposit (Admin or user) */
app.delete('/api/user/:id/deposits/:depositId', async (req, res) => {
  try {
    const userId = req.params.id;
    const depositId = req.params.depositId;

    await db.run(`
      DELETE FROM deposits
      WHERE id = ? AND userId = ?
    `, [depositId, userId]);

    res.json({ message: 'Deposit deleted successfully' });
  } catch (err) {
    console.error('Delete deposit error:', err);
    res.status(500).json({ error: 'Could not delete deposit', details: err.message });
  }
});

app.post('/api/withdrawals', async (req, res) => {
  try {
    const { userId, method, amount, total, type } = req.body;
    const reference = generateReference();
    const now = new Date().toISOString();

    const result = await db.run(`
      INSERT INTO withdrawals (
        userId, date, reference, method, amount, total, status, type, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `, [
      userId,
      now,
      reference,
      method || '',
      amount || '0',
      total || '0',
      type || '',
      now
    ]);

    res.json({
      message: 'Withdrawal created',
      withdrawalId: result.lastID,
      reference
    });
  } catch (err) {
    console.error('Create withdrawal error:', err);
    res.status(500).json({ error: 'Could not create withdrawal', details: err.message });
  }
});

app.get('/api/user/:id/withdrawals', async (req, res) => {
  try {
    const userId = req.params.id;
    const list = await db.all('SELECT * FROM withdrawals WHERE userId = ?', [userId]);
    res.json(list);
  } catch (err) {
    console.error('List withdrawals error:', err);
    res.status(500).json({ error: 'Could not fetch withdrawals' });
  }
});

/** Update withdrawal with balance validation */
app.put('/api/user/:id/withdrawals/:withdrawalId', async (req, res) => {
  try {
    const userId = req.params.id;
    const withdrawalId = req.params.withdrawalId;
    const updateFields = req.body;

    if (!updateFields || Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update.' });
    }

    // Get current withdrawal
    const currentWithdrawal = await db.get('SELECT * FROM withdrawals WHERE id = ? AND userId = ?', [withdrawalId, userId]);
    if (!currentWithdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // If status is being changed to confirmed, validate balance and deduct
    if (updateFields.status && updateFields.status === 'confirmed' && currentWithdrawal.status !== 'confirmed') {
      const amount = parseFloat(currentWithdrawal.amount) || 0;
      
      if (amount > 0) {
        // Parse method to get asset info
        const methodParts = currentWithdrawal.method.split(':');
        const assetName = methodParts[0] || '';
        
        let walletToUpdate = null;
        
        if (currentWithdrawal.type === 'crypto') {
          // Find crypto wallet by method name
          const wallets = await db.all('SELECT * FROM user_wallets WHERE userId = ?', [userId]);
          walletToUpdate = wallets.find(w => 
            (w.coinName && w.coinName.toLowerCase() === assetName.toLowerCase()) ||
            (w.shortName && w.shortName.toLowerCase() === assetName.toLowerCase()) ||
            (!w.type || w.type === 'crypto') // Backward compatibility
          );
        } else if (currentWithdrawal.type === 'bank') {
          // Find fiat wallet
          const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
          if (user) {
            const wallets = await db.all('SELECT * FROM user_wallets WHERE userId = ?', [userId]);
            walletToUpdate = wallets.find(w => 
              w.shortName === user.accountCurrency && 
              (w.type === 'fiat' || (!w.type && w.shortName === user.accountCurrency))
            );
          }
        }
        
        if (walletToUpdate) {
          const currentBalance = parseFloat(walletToUpdate.balance) || 0;
          
          if (currentBalance < amount) {
            return res.status(400).json({ 
              error: `Insufficient balance. User has ${currentBalance} but trying to withdraw ${amount}` 
            });
          }
          
          // Deduct balance
          const newBalance = currentBalance - amount;
          await db.run(`
            UPDATE user_wallets 
            SET balance = ? 
            WHERE id = ?
          `, [newBalance.toString(), walletToUpdate.id]);
          
          // Create notification
          await db.run(`
            INSERT INTO notifications (userId, message, createdAt)
            VALUES (?, ?, ?)
          `, [
            userId,
            `Your withdrawal of ${amount} has been confirmed and ${amount} has been deducted from your wallet.`,
            new Date().toISOString()
          ]);
        } else {
          return res.status(400).json({ 
            error: 'Could not find corresponding wallet for withdrawal' 
          });
        }
      }
    }

    // Update withdrawal status
    const columns = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
    const values = Object.values(updateFields);

    const sql = `UPDATE withdrawals SET ${columns} WHERE id = ? AND userId = ?`;
    await db.run(sql, [...values, withdrawalId, userId]);

    // Create general notification for other status changes
    if (updateFields.status && updateFields.status !== 'confirmed' && currentWithdrawal.status !== updateFields.status) {
      await db.run(`
        INSERT INTO notifications (userId, message, createdAt)
        VALUES (?, ?, ?)
      `, [
        userId,
        `Your withdrawal status has been updated to: ${updateFields.status}`,
        new Date().toISOString()
      ]);
    }

    res.json({ message: 'Withdrawal updated successfully' });
  } catch (err) {
    console.error('Update withdrawal error:', err);
    res.status(500).json({ error: 'Could not update withdrawal', details: err.message });
  }
});

/** Delete withdrawal */
app.delete('/api/user/:id/withdrawals/:withdrawalId', async (req, res) => {
  try {
    const userId = req.params.id;
    const withdrawalId = req.params.withdrawalId;

    await db.run(`
      DELETE FROM withdrawals
      WHERE id = ? AND userId = ?
    `, [withdrawalId, userId]);

    res.json({ message: 'Withdrawal deleted successfully' });
  } catch (err) {
    console.error('Delete withdrawal error:', err);
    res.status(500).json({ error: 'Could not delete withdrawal', details: err.message });
  }
});

// -----------------------------------------------------
// NEW: Conversion API
// -----------------------------------------------------
app.post('/api/convert', async (req, res) => {
  try {
    const { userId, fromAsset, toAsset, fromAmount } = req.body;
    
    if (!userId || !fromAsset || !toAsset || !fromAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const amount = parseFloat(fromAmount);
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Get user
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

// Get exchange rates and crypto prices directly
const exchangeRates = await fetchExchangeRates();
let coinPrices = {};

// Fetch coin prices directly using the existing function
try {
  const coinIds = [
    'bitcoin',
    'ethereum', 
    'binancecoin',
    'usd-coin',
    'tether',
    'ripple',
    'cardano',
    'dogecoin',
    'solana',
    'avalanche-2',
    'shiba-inu',
    'litecoin',
    'tron',
    'polygon',
    'pepe'
  ].join(',');

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`;
  const response = await fetch(url);
  if (response.ok) {
    coinPrices = await response.json();
    console.log('Server: Fetched coin prices for conversion:', Object.keys(coinPrices));
  } else {
    throw new Error(`CoinGecko API failed with status: ${response.status}`);
  }
} catch (e) {
  console.error('Could not fetch coin prices for conversion:', e);
  return res.status(500).json({ error: 'Unable to fetch current crypto prices. Please try again later.' });
}

// Validate we have the required exchange rates
if (!exchangeRates[user.accountCurrency]) {
  console.error('Exchange rate not available for user currency:', user.accountCurrency);
  return res.status(500).json({ error: 'Exchange rate not available for your currency. Please try again later.' });
}

// Calculate conversion
let toAmount = 0;
let exchangeRate = 0;

// Fiat to Crypto
if (fromAsset === user.accountCurrency && toAsset !== user.accountCurrency) {
  const coinKey = guessCoinGeckoKey(toAsset);
  const coinUSDPrice = coinPrices[coinKey]?.usd;
  
  if (!coinUSDPrice || coinUSDPrice <= 0) {
    return res.status(400).json({ error: `Price data not available for ${toAsset}. Please try again later.` });
  }
  
  const usdAmount = amount / exchangeRates[user.accountCurrency];
  toAmount = usdAmount / coinUSDPrice;
  exchangeRate = 1 / (coinUSDPrice * exchangeRates[user.accountCurrency]);
  
  console.log(`Server conversion: ${amount} ${fromAsset} -> ${toAmount} ${toAsset} (rate: ${exchangeRate})`);
}
// Crypto to Fiat
else if (fromAsset !== user.accountCurrency && toAsset === user.accountCurrency) {
  const coinKey = guessCoinGeckoKey(fromAsset);
  const coinUSDPrice = coinPrices[coinKey]?.usd;
  
  if (!coinUSDPrice || coinUSDPrice <= 0) {
    return res.status(400).json({ error: `Price data not available for ${fromAsset}. Please try again later.` });
  }
  
  const usdAmount = amount * coinUSDPrice;
  toAmount = usdAmount * exchangeRates[user.accountCurrency];
  exchangeRate = coinUSDPrice * exchangeRates[user.accountCurrency];
  
  console.log(`Server conversion: ${amount} ${fromAsset} -> ${toAmount} ${toAsset} (rate: ${exchangeRate})`);
}
// Crypto to Crypto
else if (fromAsset !== user.accountCurrency && toAsset !== user.accountCurrency) {
  const fromCoinKey = guessCoinGeckoKey(fromAsset);
  const toCoinKey = guessCoinGeckoKey(toAsset);
  const fromCoinUSDPrice = coinPrices[fromCoinKey]?.usd;
  const toCoinUSDPrice = coinPrices[toCoinKey]?.usd;
  
  if (!fromCoinUSDPrice || fromCoinUSDPrice <= 0) {
    return res.status(400).json({ error: `Price data not available for ${fromAsset}. Please try again later.` });
  }
  
  if (!toCoinUSDPrice || toCoinUSDPrice <= 0) {
    return res.status(400).json({ error: `Price data not available for ${toAsset}. Please try again later.` });
  }
  
  const usdAmount = amount * fromCoinUSDPrice;
  toAmount = usdAmount / toCoinUSDPrice;
  exchangeRate = fromCoinUSDPrice / toCoinUSDPrice;
  
  console.log(`Server conversion: ${amount} ${fromAsset} -> ${toAmount} ${toAsset} (rate: ${exchangeRate})`);
}
else {
  return res.status(400).json({ error: 'Invalid conversion pair' });
}

// Final validation
if (!isFinite(toAmount) || toAmount <= 0) {
  return res.status(500).json({ error: 'Conversion calculation failed. Please try again.' });
}

if (!isFinite(exchangeRate) || exchangeRate <= 0) {
  return res.status(500).json({ error: 'Exchange rate calculation failed. Please try again.' });
}

    // Check balance
    let fromWallet;
    if (fromAsset === user.accountCurrency) {
      fromWallet = await db.get(`
        SELECT * FROM user_wallets 
        WHERE userId = ? AND shortName = ? AND type = 'fiat'
      `, [userId, fromAsset]);
    } else {
      fromWallet = await db.get(`
        SELECT * FROM user_wallets 
        WHERE userId = ? AND shortName = ? AND type = 'crypto'
      `, [userId, fromAsset]);
    }

    if (!fromWallet) {
      return res.status(404).json({ error: `Wallet not found for ${fromAsset}` });
    }

    const currentBalance = parseFloat(fromWallet.balance);
    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Get or create destination wallet
    let toWallet;
    if (toAsset === user.accountCurrency) {
      toWallet = await db.get(`
        SELECT * FROM user_wallets 
        WHERE userId = ? AND shortName = ? AND type = 'fiat'
      `, [userId, toAsset]);
    } else {
      toWallet = await db.get(`
        SELECT * FROM user_wallets 
        WHERE userId = ? AND shortName = ? AND type = 'crypto'
      `, [userId, toAsset]);
    }

    if (!toWallet) {
      return res.status(404).json({ error: `Wallet not found for ${toAsset}` });
    }

    // Perform conversion
    const newFromBalance = currentBalance - amount;
    const newToBalance = parseFloat(toWallet.balance) + toAmount;

    await db.run(`
      UPDATE user_wallets 
      SET balance = ? 
      WHERE id = ?
    `, [newFromBalance.toString(), fromWallet.id]);

    await db.run(`
      UPDATE user_wallets 
      SET balance = ? 
      WHERE id = ?
    `, [newToBalance.toString(), toWallet.id]);

    // Record conversion
    const reference = generateReference();
    await db.run(`
      INSERT INTO conversions (
        userId, fromAsset, toAsset, fromAmount, toAmount, exchangeRate, reference, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      fromAsset,
      toAsset,
      amount.toString(),
      toAmount.toString(),
      exchangeRate.toString(),
      reference,
      new Date().toISOString()
    ]);

    // Create notification
    await db.run(`
      INSERT INTO notifications (userId, message, createdAt)
      VALUES (?, ?, ?)
    `, [
      userId,
      `Successfully converted ${amount} ${fromAsset} to ${toAmount.toFixed(6)} ${toAsset}`,
      new Date().toISOString()
    ]);

    res.json({
      message: 'Conversion successful',
      reference,
      fromAmount: amount,
      toAmount,
      exchangeRate,
      fromAsset,
      toAsset
    });

  } catch (err) {
    console.error('Conversion error:', err);
    res.status(500).json({ error: 'Could not process conversion', details: err.message });
  }
});

// Get conversion history
app.get('/api/user/:userId/conversions', async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversions = await db.all(`
      SELECT * FROM conversions 
      WHERE userId = ? 
      ORDER BY createdAt DESC
    `, [userId]);
    res.json(conversions);
  } catch (err) {
    console.error('Get conversions error:', err);
    res.status(500).json({ error: 'Could not fetch conversions' });
  }
});

// -----------------------------------------------------
// 6) Signal & Stake Management
// -----------------------------------------------------
/**
 * Bulk update signals
 */
app.put('/api/user/:userId/signals', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { signals } = req.body;

    if (!Array.isArray(signals)) {
      return res.status(400).json({ error: 'signals must be an array' });
    }

    for (let s of signals) {
      await db.run(`
        UPDATE user_signals
        SET balance = ?
        WHERE userId = ? AND signalName = ?
      `, [
        s.balance || '0',
        userId,
        s.signalName
      ]);
    }

    res.json({ message: 'Signals updated successfully' });
  } catch (err) {
    console.error('Update signals error:', err);
    res.status(500).json({ error: 'Could not update signals', details: err.message });
  }
});

/** 
 * Create a new signal entry (if you want dynamic signals)
 */
app.post('/api/user/:userId/signals', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { signalName, balance } = req.body;

    if (!signalName) {
      return res.status(400).json({ error: 'signalName is required' });
    }

    const result = await db.run(`
      INSERT INTO user_signals (userId, signalName, balance)
      VALUES (?, ?, ?)
    `, [userId, signalName, balance || '0']);

    res.json({ message: 'Signal created', id: result.lastID });
  } catch (err) {
    console.error('Create signal error:', err);
    res.status(500).json({ error: 'Could not create signal', details: err.message });
  }
});

/** Read all signals for user */
app.get('/api/user/:userId/signals', async (req, res) => {
  try {
    const userId = req.params.userId;
    const rows = await db.all(`
      SELECT * FROM user_signals WHERE userId = ?
    `, [userId]);
    res.json(rows);
  } catch (err) {
    console.error('Get signals error:', err);
    res.status(500).json({ error: 'Could not fetch signals', details: err.message });
  }
});

/** Delete a signal */
app.delete('/api/user/:userId/signals/:signalId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const signalId = req.params.signalId;

    await db.run(`
      DELETE FROM user_signals
      WHERE id = ? AND userId = ?
    `, [signalId, userId]);

    res.json({ message: 'Signal deleted successfully' });
  } catch (err) {
    console.error('Delete signal error:', err);
    res.status(500).json({ error: 'Could not delete signal', details: err.message });
  }
});

/**
 * Bulk update stakes
 */
app.put('/api/user/:userId/stakes', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { stakes } = req.body;

    if (!Array.isArray(stakes)) {
      return res.status(400).json({ error: 'stakes must be an array' });
    }

    for (let st of stakes) {
      await db.run(`
        UPDATE user_stakes
        SET balance = ?
        WHERE userId = ? AND stakeName = ?
      `, [
        st.balance || '0',
        userId,
        st.stakeName
      ]);
    }

    res.json({ message: 'Stakes updated successfully' });
  } catch (err) {
    console.error('Update stakes error:', err);
    res.status(500).json({ error: 'Could not update stakes', details: err.message });
  }
});

/** Create a new stake if needed */
app.post('/api/user/:userId/stakes', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { stakeName, balance } = req.body;

    if (!stakeName) {
      return res.status(400).json({ error: 'stakeName is required' });
    }

    const result = await db.run(`
      INSERT INTO user_stakes (userId, stakeName, balance)
      VALUES (?, ?, ?)
    `, [userId, stakeName, balance || '0']);

    res.json({ message: 'Stake created', id: result.lastID });
  } catch (err) {
    console.error('Create stake error:', err);
    res.status(500).json({ error: 'Could not create stake', details: err.message });
  }
});

/** Read all stakes for user */
app.get('/api/user/:userId/stakes', async (req, res) => {
  try {
    const userId = req.params.userId;
    const rows = await db.all(`
      SELECT * FROM user_stakes WHERE userId = ?
    `, [userId]);
    res.json(rows);
  } catch (err) {
    console.error('Get stakes error:', err);
    res.status(500).json({ error: 'Could not fetch stakes', details: err.message });
  }
});

/** Delete a stake */
app.delete('/api/user/:userId/stakes/:stakeId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const stakeId = req.params.stakeId;

    await db.run(`
      DELETE FROM user_stakes
      WHERE id = ? AND userId = ?
    `, [stakeId, userId]);

    res.json({ message: 'Stake deleted successfully' });
  } catch (err) {
    console.error('Delete stake error:', err);
    res.status(500).json({ error: 'Could not delete stake', details: err.message });
  }
});

// -----------------------------------------------------
// 7) Notifications
// -----------------------------------------------------
app.post('/api/user/:userId/notifications', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { message } = req.body;
    const now = new Date().toISOString();

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const result = await db.run(`
      INSERT INTO notifications (userId, message, isRead, createdAt)
      VALUES (?, ?, 0, ?)
    `, [userId, message, now]);

    res.json({ message: 'Notification created', notificationId: result.lastID });
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ error: 'Could not create notification', details: err.message });
  }
});

app.get('/api/user/:userId/notifications', async (req, res) => {
  try {
    const userId = req.params.userId;
    const notifications = await db.all(`
      SELECT * FROM notifications WHERE userId = ?
      ORDER BY id DESC
    `, [userId]);
    res.json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Could not get notifications', details: err.message });
  }
});

app.put('/api/user/:userId/notifications/:notificationId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const notificationId = req.params.notificationId;
    const { message, isRead } = req.body;

    const existing = await db.get(`
      SELECT * FROM notifications
      WHERE id = ? AND userId = ?
    `, [notificationId, userId]);
    if (!existing) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const newMessage = (message === undefined) ? existing.message : message;
    const newIsRead = (isRead === undefined) ? existing.isRead : isRead;

    await db.run(`
      UPDATE notifications
      SET message = ?,
          isRead = ?
      WHERE id = ? AND userId = ?
    `, [newMessage, newIsRead, notificationId, userId]);

    res.json({ message: 'Notification updated' });
  } catch (err) {
    console.error('Update notification error:', err);
    res.status(500).json({ error: 'Could not update notification', details: err.message });
  }
});

app.delete('/api/user/:userId/notifications/:notificationId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const notificationId = req.params.notificationId;

    await db.run(`
      DELETE FROM notifications
      WHERE id = ? AND userId = ?
    `, [notificationId, userId]);

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Could not delete notification', details: err.message });
  }
});

app.put('/api/user/:userId/notifications-mark-all', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { isRead } = req.body;

    if (isRead === undefined) {
      return res.status(400).json({ error: 'isRead is required and should be 0 or 1' });
    }

    await db.run(`
      UPDATE notifications
      SET isRead = ?
      WHERE userId = ?
    `, [isRead, userId]);

    res.json({ message: 'All notifications updated' });
  } catch (err) {
    console.error('Mark all notifications error:', err);
    res.status(500).json({ error: 'Could not mark all notifications', details: err.message });
  }
});

// -----------------------------------------------------
// STAKE MATURATION CRON JOB
// -----------------------------------------------------
const stakeMaturationJob = new CronJob('0 */6 * * *', async () => {
  // Runs every 6 hours
  try {
    const now = new Date().toISOString();
    
    // Find matured stakes
    const maturedStakes = await db.all(`
      SELECT * FROM active_stakes 
      WHERE status = 'active' AND endDate <= ?
    `, [now]);

    for (const stake of maturedStakes) {
      try {
        // Auto-unstake matured stakes
        const response = await fetch(`http://localhost:${PORT}/api/stakes/${stake.id}/unstake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          console.log(`Auto-unstaked matured stake ${stake.id} for user ${stake.userId}`);
        }
      } catch (err) {
        console.error(`Error auto-unstaking stake ${stake.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in stakeMaturationJob:', err);
  }
});

stakeMaturationJob.start();

// -----------------------------------------------------
// 8) Automatic Deposit Cancellation (Cron Job)
// -----------------------------------------------------
const depositCheckJob = new CronJob('0 * * * *', async () => {
  // Runs every hour at minute 0
  try {
    const now = new Date().getTime();
    const pendingDeposits = await db.all(`
      SELECT * FROM deposits WHERE status = 'pending'
    `);

    for (let deposit of pendingDeposits) {
      const createdTime = new Date(deposit.createdAt).getTime();
      if ((now - createdTime) > 2 * 60 * 60 * 1000) { // older than 2 hours
        await db.run(`
          UPDATE deposits
          SET status = 'canceled'
          WHERE id = ?
        `, [deposit.id]);
        console.log(`Deposit ${deposit.id} auto-canceled (pending > 2 hours).`);
      }
    }
  } catch (err) {
    console.error('Error in depositCheckJob:', err);
  }
});

depositCheckJob.start();

// -----------------------------------------------------
// 9) SUPER-ADMIN: ALLOW EVERYTHING TO BE EDITED/DELETED
// -----------------------------------------------------

/** 
 * GET all records from a specific table 
 * e.g. GET /api/admin/get/users -> returns all user rows
 */
app.get('/api/admin/get/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const rows = await db.all(`SELECT * FROM ${table}`);
    res.json(rows);
  } catch (err) {
    console.error('Generic Get-All Error:', err);
    res.status(500).json({ error: 'Could not get records', details: err.message });
  }
});

/** 
 * GET one record by ID from any table 
 * e.g. GET /api/admin/get/users/1 -> returns user with id=1
 */
app.get('/api/admin/get/:table/:id', async (req, res) => {
  try {
    const table = req.params.table;
    const rowId = req.params.id;
    const row = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [rowId]);

    if (!row) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(row);
  } catch (err) {
    console.error('Generic Get-One Error:', err);
    res.status(500).json({ error: 'Could not get record', details: err.message });
  }
});

/** 
 * Admin Update: Updates by `id` column in any table with key/value pairs provided.
 * e.g. PUT /api/admin/update/users/1  with body { email: "new@email.com", password: "plaintext" }
 */
app.put('/api/admin/update/:table/:id', async (req, res) => {
  try {
    const table = req.params.table;       // e.g. 'users'
    const rowId = req.params.id;          // e.g. 1
    const updateFields = req.body;        // e.g. { firstName: 'NewName', lastName: 'NewLast' }

    if (!updateFields || Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update.' });
    }

    // Build the SET clause
    const columns = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateFields);

    // Construct dynamic SQL
    const sql = `UPDATE ${table} SET ${columns} WHERE id = ?`;
    await db.run(sql, [...values, rowId]);

    res.json({ message: 'Record updated successfully' });
  } catch (err) {
    console.error('Generic Update Error:', err);
    res.status(500).json({ error: 'Could not update record', details: err.message });
  }
});

/**
 * Admin Insert: Insert into any table with provided key/value pairs
 * e.g. POST /api/admin/insert/users  with body { firstName: 'Test', lastName: 'User', email: 'test@test.com' }
 */
app.post('/api/admin/insert/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const insertFields = req.body; 

    if (!insertFields || Object.keys(insertFields).length === 0) {
      return res.status(400).json({ error: 'No fields provided for insert.' });
    }

    const columns = Object.keys(insertFields).join(', ');
    const placeholders = Object.keys(insertFields).map(() => '?').join(', ');
    const values = Object.values(insertFields);

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = await db.run(sql, values);

    res.json({ message: 'Record inserted successfully', lastID: result.lastID });
  } catch (err) {
    console.error('Generic Insert Error:', err);
    res.status(500).json({ error: 'Could not insert record', details: err.message });
  }
});

/**
 * Admin Delete: Delete a record from any table by `id` column
 * e.g. DELETE /api/admin/delete/users/1
 */
app.delete('/api/admin/delete/:table/:id', async (req, res) => {
  try {
    const table = req.params.table;
    const rowId = req.params.id;

    const sql = `DELETE FROM ${table} WHERE id = ?`;
    await db.run(sql, rowId);

    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    console.error('Generic Delete Error:', err);
    res.status(500).json({ error: 'Could not delete record', details: err.message });
  }
});

// -----------------------------------------------------
// 10) [NEW] Price Fetching Feature
// -----------------------------------------------------

// Provide an API endpoint to retrieve these prices on-demand
app.get('/api/coin-prices', async (req, res) => {
  try {
    const coinIds = [
      'bitcoin',
      'ethereum',
      'binancecoin',
      'usd-coin',
      'tether',
      'ripple',
      'cardano',
      'dogecoin',
      'solana',
      'avalanche-2',
      'shiba-inu',
      'litecoin',
      'tron',
      'polygon',
      'pepe'
    ].join(',');

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CoinGecko fetch failed with status: ${response.status}`);
    }
    const data = await response.json();
    // Log the fetched prices to the terminal console
    console.log('Fetched Coin Prices:', JSON.stringify(data, null, 2));
    // Send the fetched data to the frontend
    res.json(data);
  } catch (err) {
    console.error('Error fetching coin prices:', err.message);
    res.status(500).json({ error: 'Could not fetch coin prices', details: err.message });
  }
});



// -----------------------------------------------------
// NEW: Dashboard Balance Calculation
// -----------------------------------------------------
app.get('/api/user/:userId/dashboard-data', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get user
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user wallets
    const wallets = await db.all('SELECT * FROM user_wallets WHERE userId = ?', [userId]);
    
    // Get exchange rates and crypto prices
    const [exchangeRates, coinPrices] = await Promise.all([
      fetchExchangeRates(),
      fetchCoinPricesForDashboard()
    ]);

    // Calculate total balance in user's currency
    let totalBalanceInUserCurrency = 0;
    let cryptoBalances = [];
    let fiatBalance = 0;

    const userCurrency = user.accountCurrency || 'USD';
    const userCurrencyRate = exchangeRates[userCurrency] || 1;

    for (const wallet of wallets) {
      const balance = parseFloat(wallet.balance) || 0;
      
      if (wallet.type === 'fiat' || wallet.shortName === userCurrency) {
        // Fiat balance - no conversion needed if same currency
        if (wallet.shortName === userCurrency) {
          fiatBalance += balance;
          totalBalanceInUserCurrency += balance;
        } else {
          // Convert other fiat currencies
          const walletCurrencyRate = exchangeRates[wallet.shortName] || 1;
          const usdValue = balance / walletCurrencyRate;
          const userCurrencyValue = usdValue * userCurrencyRate;
          totalBalanceInUserCurrency += userCurrencyValue;
        }
      } else {
        // Crypto balance - convert to user currency
        const coinKey = guessCoinGeckoKey(wallet.shortName);
        const coinUSDPrice = coinPrices[coinKey]?.usd || 0;
        
        if (coinUSDPrice > 0 && balance > 0) {
          const usdValue = balance * coinUSDPrice;
          const userCurrencyValue = usdValue * userCurrencyRate;
          totalBalanceInUserCurrency += userCurrencyValue;
        }
        
        cryptoBalances.push({
          ...wallet,
          balanceNumber: balance,
          usdValue: balance * coinUSDPrice,
          userCurrencyValue: balance * coinUSDPrice * userCurrencyRate
        });
      }
    }

    // Sort crypto balances - positive balances first, then by balance amount
    cryptoBalances.sort((a, b) => {
      if (a.balanceNumber > 0 && b.balanceNumber <= 0) return -1;
      if (a.balanceNumber <= 0 && b.balanceNumber > 0) return 1;
      return b.balanceNumber - a.balanceNumber;
    });

    // Take top 4 crypto balances
    const topCryptoBalances = cryptoBalances.slice(0, 4);

// Define the top 4 cryptos that should always be shown
const topCryptoNames = ['BTC', 'ETH', 'USDC', 'USDT'];
const topCryptoDetails = [
  { shortName: 'BTC', coinName: 'Bitcoin' },
  { shortName: 'ETH', coinName: 'Ethereum' },
  { shortName: 'USDC', coinName: 'USD Coin' },
  { shortName: 'USDT', coinName: 'Tether' }
];

// Get all crypto balances (positive first, then by amount)
cryptoBalances.sort((a, b) => {
  if (a.balanceNumber > 0 && b.balanceNumber <= 0) return -1;
  if (a.balanceNumber <= 0 && b.balanceNumber > 0) return 1;
  return b.balanceNumber - a.balanceNumber;
});

// Create the final top 4 display list
let finalTopCryptos = [];
let usedCryptos = new Set();

// First, add cryptos with positive balances (up to 4)
for (const crypto of cryptoBalances) {
  if (crypto.balanceNumber > 0 && finalTopCryptos.length < 4) {
    finalTopCryptos.push(crypto);
    usedCryptos.add(crypto.shortName.toUpperCase());
  }
}

// Fill remaining slots with top cryptos (BTC, ETH, USDC, USDT)
for (const topCrypto of topCryptoDetails) {
  if (finalTopCryptos.length >= 4) break;
  
  if (!usedCryptos.has(topCrypto.shortName)) {
    // Find existing wallet or create placeholder
    let existingWallet = cryptoBalances.find(c => 
      c.shortName.toUpperCase() === topCrypto.shortName
    );
    
    if (!existingWallet) {
      // Create placeholder with 0 balance
      const coinKey = guessCoinGeckoKey(topCrypto.shortName);
      const coinUSDPrice = coinPrices[coinKey]?.usd || 0;
      
      existingWallet = {
        shortName: topCrypto.shortName,
        coinName: topCrypto.coinName,
        balance: '0',
        balanceNumber: 0,
        usdValue: 0,
        userCurrencyValue: 0,
        type: 'crypto'
      };
    }
    
    finalTopCryptos.push(existingWallet);
    usedCryptos.add(topCrypto.shortName);
  }
}

// Calculate portfolio statistics based on deposits and withdrawals
const confirmedDeposits = await db.all(`
  SELECT SUM(CAST(amount AS REAL)) as totalIn, method, type 
  FROM deposits 
  WHERE userId = ? AND status = 'confirmed' 
  GROUP BY method, type
`, [userId]);

const confirmedWithdrawals = await db.all(`
  SELECT SUM(CAST(amount AS REAL)) as totalOut, method, type 
  FROM withdrawals 
  WHERE userId = ? AND status = 'confirmed' 
  GROUP BY method, type
`, [userId]);

// Calculate total in/out using the local currency values stored at transaction time
// This is much more accurate than using current prices for historical transactions
const depositSum = await db.get(`
  SELECT SUM(CAST(totalEUR AS REAL)) as totalIn 
  FROM deposits 
  WHERE userId = ? AND status = 'confirmed'
`, [userId]);

const withdrawalSum = await db.get(`
  SELECT SUM(CAST(total AS REAL)) as totalOut 
  FROM withdrawals 
  WHERE userId = ? AND status = 'confirmed'
`, [userId]);

let totalInUserCurrency = depositSum.totalIn || 0;
let totalOutUserCurrency = withdrawalSum.totalOut || 0;

// Convert to user currency if the stored values are in different currency
// Note: The database fields are named 'totalEUR' but they should contain 
// the user's local currency value at the time of transaction
if (userCurrency !== 'EUR') {
  // If your system stores everything in EUR, convert to user currency
  // For now, assuming the stored values are already in user's currency
  // If not, you'd need to apply proper currency conversion here
}

// Calculate net flow (in - out)
const netFlow = totalInUserCurrency - totalOutUserCurrency;

// Get recent deposits and withdrawals for portfolio visualization
const recentDeposits = await db.all(`
  SELECT * FROM deposits 
  WHERE userId = ? AND status = 'confirmed' 
  ORDER BY createdAt DESC 
  LIMIT 10
`, [userId]);

const recentWithdrawals = await db.all(`
  SELECT * FROM withdrawals 
  WHERE userId = ? AND status = 'confirmed' 
  ORDER BY createdAt DESC 
  LIMIT 10
`, [userId]);

// Get recent activity (notifications)
const recentActivity = await db.all(`
  SELECT * FROM notifications 
  WHERE userId = ? 
  ORDER BY createdAt DESC 
  LIMIT 5
`, [userId]);

// Portfolio data for visualization - include all assets with positive balances
const portfolioData = [];

// Add fiat if it has balance (show fiat first)
if (fiatBalance > 0) {
  portfolioData.push({
    name: userCurrency,
    value: fiatBalance,
    balance: fiatBalance,
    percentage: totalBalanceInUserCurrency > 0 ? 
      (fiatBalance / totalBalanceInUserCurrency) * 100 : 0,
    type: 'fiat'
  });
}

// Add crypto assets with positive balances
for (const crypto of finalTopCryptos) {
  if (crypto.balanceNumber > 0) {
    portfolioData.push({
      name: crypto.shortName,
      value: crypto.userCurrencyValue || 0,
      balance: crypto.balanceNumber,
      percentage: totalBalanceInUserCurrency > 0 ? 
        ((crypto.userCurrencyValue || 0) / totalBalanceInUserCurrency) * 100 : 0,
      type: 'crypto'
    });
  }
}

// Calculate proper asset count (fiat + crypto assets with positive balances)
let assetCount = 0;
if (fiatBalance > 0) assetCount++; // Count fiat if it has balance
assetCount += finalTopCryptos.filter(crypto => crypto.balanceNumber > 0).length; // Count crypto with positive balances

res.json({
  totalBalance: totalBalanceInUserCurrency,
  userCurrency,
  fiatBalance,
  topCryptoBalances: finalTopCryptos,
  recentDeposits,
  recentWithdrawals,
  recentActivity,
  exchangeRates,
  coinPrices,
  portfolioStats: {
    totalIn: totalInUserCurrency,
    totalOut: totalOutUserCurrency,
    netFlow: netFlow,
    assetCount: assetCount // Use the properly calculated asset count
  },
  portfolioData
});

  } catch (err) {
    console.error('Dashboard data error:', err);
    res.status(500).json({ error: 'Could not fetch dashboard data', details: err.message });
  }
});

async function fetchCoinPricesForDashboard() {
  try {
    const coinIds = [
      'bitcoin', 'ethereum', 'binancecoin', 'usd-coin', 'tether',
      'ripple', 'cardano', 'dogecoin', 'solana', 'avalanche-2',
      'shiba-inu', 'litecoin', 'tron', 'polygon', 'pepe'
    ].join(',');

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Fetched coin prices for dashboard');
    return data;
  } catch (error) {
    console.error('Error fetching coin prices for dashboard:', error);
    // Return fallback prices
    return {
      'bitcoin': { usd: 45000 },
      'ethereum': { usd: 3000 },
      'binancecoin': { usd: 300 },
      'dogecoin': { usd: 0.08 },
      'solana': { usd: 100 }
    };
  }
}


// -----------------------------------------------------
// STAKING ENDPOINTS
// -----------------------------------------------------

// Get staking overview for user
app.get('/api/user/:userId/staking-overview', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get user for currency info
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get active stakes
    const activeStakes = await db.all(`
      SELECT * FROM active_stakes 
      WHERE userId = ? AND status = 'active'
    `, [userId]);

    // Get completed stakes  
    const completedStakes = await db.all(`
      SELECT * FROM active_stakes 
      WHERE userId = ? AND status = 'completed'
    `, [userId]);

    // Get user wallets for balance info
    const wallets = await db.all('SELECT * FROM user_wallets WHERE userId = ?', [userId]);

    // Calculate total staking value in user's currency
    let totalStakingValue = 0;
    const exchangeRates = await fetchExchangeRates();
    const coinPrices = await fetchCoinPricesForDashboard();
    const userCurrencyRate = exchangeRates[user.accountCurrency] || 1;

    for (const stake of activeStakes) {
      const amount = parseFloat(stake.amount) || 0;
      const coinKey = guessCoinGeckoKey(stake.coinSymbol);
      const coinUSDPrice = coinPrices[coinKey]?.usd || 0;
      
      if (coinUSDPrice > 0) {
        const usdValue = amount * coinUSDPrice;
        const userCurrencyValue = usdValue * userCurrencyRate;
        totalStakingValue += userCurrencyValue;
      }
    }

    res.json({
      totalStakingValue,
      userCurrency: user.accountCurrency,
      activeStakingsCount: activeStakes.length,
      closedStakingsCount: completedStakes.length,
      activeStakes,
      completedStakes,
      wallets
    });

  } catch (err) {
    console.error('Staking overview error:', err);
    res.status(500).json({ error: 'Could not fetch staking overview' });
  }
});

// Create new stake
app.post('/api/stakes', async (req, res) => {
  try {
    const { userId, coinSymbol, amount, duration, roiPercentage } = req.body;
    
    if (!userId || !coinSymbol || !amount || !duration || !roiPercentage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stakeAmount = parseFloat(amount);
    if (stakeAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Check if user has sufficient balance
    const wallet = await db.get(`
      SELECT * FROM user_wallets 
      WHERE userId = ? AND shortName = ? AND type = 'crypto'
    `, [userId, coinSymbol.toLowerCase()]);

    if (!wallet) {
      return res.status(404).json({ error: `${coinSymbol} wallet not found` });
    }

    const currentBalance = parseFloat(wallet.balance) || 0;
    if (currentBalance < stakeAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Check if user already has active stake for this coin
    const existingStake = await db.get(`
      SELECT * FROM active_stakes 
      WHERE userId = ? AND coinSymbol = ? AND status = 'active'
    `, [userId, coinSymbol]);

    if (existingStake) {
      return res.status(400).json({ error: `You already have an active ${coinSymbol} stake` });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + (duration * 24 * 60 * 60 * 1000));
    const estimatedReturns = stakeAmount * (parseFloat(roiPercentage) / 100) * duration / 365;

    // Create stake record
    const result = await db.run(`
      INSERT INTO active_stakes (
        userId, coinSymbol, amount, roiPercentage, duration, 
        startDate, endDate, estimatedReturns, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `, [
      userId,
      coinSymbol,
      stakeAmount.toString(),
      roiPercentage,
      duration,
      now.toISOString(),
      endDate.toISOString(),
      estimatedReturns.toString(),
      now.toISOString()
    ]);

    // Deduct from user's wallet balance
    const newBalance = currentBalance - stakeAmount;
    await db.run(`
      UPDATE user_wallets 
      SET balance = ? 
      WHERE id = ?
    `, [newBalance.toString(), wallet.id]);

    // Add to user_stakes balance (for tracking total staked per coin)
    let stakeRecord = await db.get(`
      SELECT * FROM user_stakes 
      WHERE userId = ? AND stakeName = ?
    `, [userId, coinSymbol]);

    if (stakeRecord) {
      const currentStakeBalance = parseFloat(stakeRecord.balance) || 0;
      await db.run(`
        UPDATE user_stakes 
        SET balance = ? 
        WHERE id = ?
      `, [(currentStakeBalance + stakeAmount).toString(), stakeRecord.id]);
    } else {
      await db.run(`
        INSERT INTO user_stakes (userId, stakeName, balance)
        VALUES (?, ?, ?)
      `, [userId, coinSymbol, stakeAmount.toString()]);
    }

    // Create notification
    await db.run(`
      INSERT INTO notifications (userId, message, createdAt)
      VALUES (?, ?, ?)
    `, [
      userId,
      `Successfully staked ${stakeAmount} ${coinSymbol} for ${duration} days`,
      now.toISOString()
    ]);

    res.json({
      message: 'Stake created successfully',
      stakeId: result.lastID,
      estimatedReturns
    });

  } catch (err) {
    console.error('Create stake error:', err);
    res.status(500).json({ error: 'Could not create stake', details: err.message });
  }
});

// Unstake (manually or automatically when matured)
app.post('/api/stakes/:stakeId/unstake', async (req, res) => {
  try {
    const stakeId = req.params.stakeId;
    
    const stake = await db.get('SELECT * FROM active_stakes WHERE id = ? AND status = "active"', [stakeId]);
    if (!stake) {
      return res.status(404).json({ error: 'Active stake not found' });
    }

    const now = new Date();
    const endDate = new Date(stake.endDate);
    const isMatured = now >= endDate;
    
    // Calculate returns
    let totalReturns = parseFloat(stake.amount);
    if (isMatured) {
      totalReturns += parseFloat(stake.estimatedReturns);
    }

    // Find user's wallet
    const wallet = await db.get(`
      SELECT * FROM user_wallets 
      WHERE userId = ? AND shortName = ? AND type = 'crypto'
    `, [stake.userId, stake.coinSymbol.toLowerCase()]);

    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }

    // Return funds to wallet
    const currentBalance = parseFloat(wallet.balance) || 0;
    const newBalance = currentBalance + totalReturns;
    
    await db.run(`
      UPDATE user_wallets 
      SET balance = ? 
      WHERE id = ?
    `, [newBalance.toString(), wallet.id]);

    // Update stake status
    await db.run(`
      UPDATE active_stakes 
      SET status = 'completed'
      WHERE id = ?
    `, [stakeId]);

    // Update user_stakes balance
    const stakeRecord = await db.get(`
      SELECT * FROM user_stakes 
      WHERE userId = ? AND stakeName = ?
    `, [stake.userId, stake.coinSymbol]);

    if (stakeRecord) {
      const currentStakeBalance = parseFloat(stakeRecord.balance) || 0;
      const newStakeBalance = Math.max(0, currentStakeBalance - parseFloat(stake.amount));
      await db.run(`
        UPDATE user_stakes 
        SET balance = ? 
        WHERE id = ?
      `, [newStakeBalance.toString(), stakeRecord.id]);
    }

    // Create notification
    const message = isMatured 
      ? `Your ${stake.coinSymbol} stake has matured! Received ${totalReturns} ${stake.coinSymbol} (including ${parseFloat(stake.estimatedReturns).toFixed(6)} rewards)`
      : `Unstaked ${stake.amount} ${stake.coinSymbol} early (no rewards earned)`;
    
    await db.run(`
      INSERT INTO notifications (userId, message, createdAt)
      VALUES (?, ?, ?)
    `, [stake.userId, message, now.toISOString()]);

    res.json({
      message: 'Unstake successful',
      totalReturns,
      isMatured
    });

  } catch (err) {
    console.error('Unstake error:', err);
    res.status(500).json({ error: 'Could not unstake', details: err.message });
  }
});

// -----------------------------------------------------
// Subscription and Signal Endpoints
// -----------------------------------------------------

// List subscription plans
app.get('/api/subscription-plans', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM subscription_plans');
    res.json(rows);
  } catch (err) {
    console.error('List subscription plans error:', err);
    res.status(500).json({ error: 'Could not fetch plans' });
  }
});

// List signal packages
app.get('/api/signal-packages', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM signal_packages');
    res.json(rows);
  } catch (err) {
    console.error('List signal packages error:', err);
    res.status(500).json({ error: 'Could not fetch signals' });
  }
});

// Overview for subscriptions
app.get('/api/user/:userId/subscription-overview', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const plans = await db.all('SELECT * FROM subscription_plans');
    const userSubs = await db.all('SELECT * FROM user_subscriptions WHERE userId = ?', [userId]);
    const wallet = await db.get('SELECT * FROM user_wallets WHERE userId = ? AND shortName = ? AND type = "fiat"', [userId, user.accountCurrency]);
    const fiatBalance = wallet ? parseFloat(wallet.balance) || 0 : 0;

    res.json({ plans, userSubscriptions: userSubs, userCurrency: user.accountCurrency, fiatBalance });
  } catch (err) {
    console.error('Subscription overview error:', err);
    res.status(500).json({ error: 'Could not fetch overview' });
  }
});

// Overview for signals
app.get('/api/user/:userId/signal-overview', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const packages = await db.all('SELECT * FROM signal_packages');
    const userSignals = await db.all('SELECT * FROM user_signals WHERE userId = ?', [userId]);
    const wallet = await db.get('SELECT * FROM user_wallets WHERE userId = ? AND shortName = ? AND type = "fiat"', [userId, user.accountCurrency]);
    const fiatBalance = wallet ? parseFloat(wallet.balance) || 0 : 0;

    res.json({ packages, userSignals, userCurrency: user.accountCurrency, fiatBalance });
  } catch (err) {
    console.error('Signal overview error:', err);
    res.status(500).json({ error: 'Could not fetch overview' });
  }
});

// Purchase subscription
app.post('/api/subscriptions', async (req, res) => {
  try {
    const { userId, planId, amount } = req.body;
    if (!userId || !planId || !amount) return res.status(400).json({ error: 'Missing fields' });

    const plan = await db.get('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const amt = parseFloat(amount);
    if (amt < parseFloat(plan.minimum) || amt > parseFloat(plan.maximum)) {
      return res.status(400).json({ error: 'Amount outside allowed range' });
    }

    const wallet = await db.get('SELECT * FROM user_wallets WHERE userId = ? AND shortName = ? AND type = "fiat"', [userId, (await db.get('SELECT accountCurrency FROM users WHERE id = ?', [userId])).accountCurrency]);
    if (!wallet) return res.status(404).json({ error: 'Fiat wallet not found' });
    const currentBalance = parseFloat(wallet.balance) || 0;
    if (currentBalance < amt) return res.status(400).json({ error: 'Insufficient balance' });

    const now = new Date();
    const endDate = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1000);
    const estimated = amt * (parseFloat(plan.roi) / 100);

    const result = await db.run(
      `INSERT INTO active_subscriptions (userId, planId, amount, roiPercentage, duration, startDate, endDate, estimatedReturns, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [userId, planId, amt.toString(), plan.roi, plan.duration, now.toISOString(), endDate.toISOString(), estimated.toString(), now.toISOString()]
    );

    // update user_subscriptions
    let subRec = await db.get('SELECT * FROM user_subscriptions WHERE userId = ? AND planName = ?', [userId, plan.name]);
    if (subRec) {
      const newBal = (parseFloat(subRec.balance) || 0) + amt;
      await db.run('UPDATE user_subscriptions SET balance = ? WHERE id = ?', [newBal.toString(), subRec.id]);
    } else {
      await db.run('INSERT INTO user_subscriptions (userId, planName, balance) VALUES (?, ?, ?)', [userId, plan.name, amt.toString()]);
    }

    // deduct from wallet
    const newBalance = currentBalance - amt;
    await db.run('UPDATE user_wallets SET balance = ? WHERE id = ?', [newBalance.toString(), wallet.id]);

    await db.run('INSERT INTO notifications (userId, message, createdAt) VALUES (?, ?, ?)', [userId, `Subscribed to ${plan.name} with ${amt}`, now.toISOString()]);

    res.json({ message: 'Subscription created', id: result.lastID, estimatedReturns: estimated });
  } catch (err) {
    console.error('Create subscription error:', err);
    res.status(500).json({ error: 'Could not create subscription' });
  }
});

// Purchase signal package
app.post('/api/signals/purchase', async (req, res) => {
  try {
    const { userId, packageId } = req.body;
    if (!userId || !packageId) return res.status(400).json({ error: 'Missing fields' });

    const pkg = await db.get('SELECT * FROM signal_packages WHERE id = ?', [packageId]);
    if (!pkg) return res.status(404).json({ error: 'Signal package not found' });

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    const wallet = await db.get('SELECT * FROM user_wallets WHERE userId = ? AND shortName = ? AND type = "fiat"', [userId, user.accountCurrency]);
    if (!wallet) return res.status(404).json({ error: 'Fiat wallet not found' });

    const price = parseFloat(pkg.price);
    const currentBalance = parseFloat(wallet.balance) || 0;
    if (currentBalance < price) return res.status(400).json({ error: 'Insufficient balance' });

    const now = new Date();
    await db.run(
      `INSERT INTO active_signals (userId, packageId, startDate, endDate, status, createdAt) VALUES (?, ?, ?, ?, 'active', ?)`,
      [userId, packageId, now.toISOString(), now.toISOString(), now.toISOString()]
    );

    // Update user_signals balance
    let sigRec = await db.get('SELECT * FROM user_signals WHERE userId = ? AND signalName = ?', [userId, pkg.name]);
    if (sigRec) {
      const newBal = (parseFloat(sigRec.balance) || 0) + price;
      await db.run('UPDATE user_signals SET balance = ? WHERE id = ?', [newBal.toString(), sigRec.id]);
    } else {
      await db.run('INSERT INTO user_signals (userId, signalName, balance) VALUES (?, ?, ?)', [userId, pkg.name, pkg.price]);
    }

    // Deduct from wallet
    const newBalance = currentBalance - price;
    await db.run('UPDATE user_wallets SET balance = ? WHERE id = ?', [newBalance.toString(), wallet.id]);

    await db.run('INSERT INTO notifications (userId, message, createdAt) VALUES (?, ?, ?)', [userId, `Purchased signal ${pkg.name} for ${price}`, now.toISOString()]);

    res.json({ message: 'Signal purchased' });
  } catch (err) {
    console.error('Purchase signal error:', err);
    res.status(500).json({ error: 'Could not purchase signal' });
  }
});

// Withdraw referral earnings
app.post('/api/user/:id/referral-withdraw', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const earnings = parseFloat(user.referrerEarnings) || 0;
    if (earnings <= 0) return res.status(400).json({ error: 'No referral earnings' });

    const wallet = await db.get('SELECT * FROM user_wallets WHERE userId = ? AND shortName = ? AND type = "fiat"', [userId, user.accountCurrency]);
    if (!wallet) return res.status(404).json({ error: 'Fiat wallet not found' });

    const newBalance = (parseFloat(wallet.balance) || 0) + earnings;
    await db.run('UPDATE user_wallets SET balance = ? WHERE id = ?', [newBalance.toString(), wallet.id]);
    await db.run('UPDATE users SET referrerEarnings = ?, updatedAt = ? WHERE id = ?', ['0', new Date().toISOString(), userId]);

    await db.run('INSERT INTO notifications (userId, message, createdAt) VALUES (?, ?, ?)', [userId, `Withdrew ${earnings} ${user.accountCurrency} referral earnings`, new Date().toISOString()]);

    res.json({ message: 'Referral earnings withdrawn', amount: earnings });
  } catch (err) {
    console.error('Referral withdraw error:', err);
    res.status(500).json({ error: 'Could not withdraw earnings' });
  }
});

// -----------------------------------------------------
// 11) Start the Server
// -----------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
