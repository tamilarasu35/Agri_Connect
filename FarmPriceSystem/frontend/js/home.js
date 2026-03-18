/**
 * FarmPriceSystem — Home Page Module (home.js)
 * Handles personalized greeting, simulated data cards, navigation, and animations.
 */

const Home = (() => {

  // ============================
  // SIMULATED DATA
  // ============================
  const WEATHER_DATA = [
    { temp: 32, condition: 'sunny', icon: '☀️', humidity: 65 },
    { temp: 28, condition: 'partly_cloudy', icon: '⛅', humidity: 72 },
    { temp: 30, condition: 'clear', icon: '🌤️', humidity: 58 },
    { temp: 26, condition: 'cloudy', icon: '☁️', humidity: 80 },
    { temp: 34, condition: 'hot', icon: '🔥', humidity: 45 },
  ];

  const CROP_PRICES = [
    { crop: 'tomato', emoji: '🍅', price: 42, trend: 'up', change: '+8%' },
    { crop: 'onion', emoji: '🧅', price: 35, trend: 'up', change: '+12%' },
    { crop: 'rice', emoji: '🌾', price: 28, trend: 'down', change: '-3%' },
    { crop: 'wheat', emoji: '🌿', price: 24, trend: 'up', change: '+5%' },
    { crop: 'sugarcane', emoji: '🎋', price: 32, trend: 'up', change: '+6%' },
    { crop: 'cotton', emoji: '☁️', price: 62, trend: 'down', change: '-2%' },
    { crop: 'banana', emoji: '🍌', price: 38, trend: 'up', change: '+4%' },
    { crop: 'mango', emoji: '🥭', price: 55, trend: 'up', change: '+10%' },
    { crop: 'potato', emoji: '🥔', price: 20, trend: 'down', change: '-5%' },
    { crop: 'chilli', emoji: '🌶️', price: 48, trend: 'up', change: '+15%' },
    { crop: 'turmeric', emoji: '🟡', price: 95, trend: 'up', change: '+7%' },
    { crop: 'coconut', emoji: '🥥', price: 18, trend: 'up', change: '+3%' },
    { crop: 'maize', emoji: '🌽', price: 22, trend: 'down', change: '-4%' },
  ];

  const ALERTS = [
    { type: 'safe', key: 'home.no_alert' },
    { type: 'warning', key: 'home.alert_msg' },
  ];

  const CROP_EMOJIS = ['🌾', '🍅', '🧅', '🌿', '🎋', '🍌', '🥭', '🌽', '🥔', '🌶️', '🥥', '🥜'];

  // ============================
  // AUTH GUARD
  // ============================
  function checkAuth() {
    const session = Auth.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  }

  // ============================
  // GET FARMER PROFILE
  // ============================
  function getFarmerProfile(session) {
    try {
      const farmers = JSON.parse(localStorage.getItem('fps_farmers') || '[]');
      return farmers.find(f => f.id === session.id) || session;
    } catch {
      return session;
    }
  }

  // ============================
  // GREETING
  // ============================
  function getGreetingPrefix() {
    const hour = new Date().getHours();
    const lang = Lang.getCurrent();

    if (lang === 'tamil') {
      if (hour < 12) return 'காலை வணக்கம்';
      if (hour < 17) return 'மதிய வணக்கம்';
      return 'மாலை வணக்கம்';
    } else if (lang === 'hindi') {
      if (hour < 12) return 'सुप्रभात';
      if (hour < 17) return 'नमस्ते';
      return 'शुभ संध्या';
    } else {
      if (hour < 12) return 'Good Morning';
      if (hour < 17) return 'Good Afternoon';
      return 'Good Evening';
    }
  }

  function renderGreeting(farmer) {
    const greetingEl = document.getElementById('greetingText');
    const locationEl = document.getElementById('greetingLocation');
    const timeEl = document.getElementById('greetingTime');

    if (greetingEl) {
      const prefix = getGreetingPrefix();
      const name = farmer.name || 'Farmer';
      greetingEl.innerHTML = `${prefix}, <span class="greeting-name">${name}!</span>`;
    }

    if (locationEl && farmer.location) {
      locationEl.innerHTML = `<span class="loc-icon">📍</span> ${farmer.location}`;
    }

    if (timeEl) {
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const lang = Lang.getCurrent();
      const locale = lang === 'tamil' ? 'ta-IN' : lang === 'hindi' ? 'hi-IN' : 'en-IN';
      timeEl.textContent = now.toLocaleDateString(locale, options);
    }
  }

  // ============================
  // WEATHER CARD
  // ============================
  function renderWeather(farmer) {
    const weather = WEATHER_DATA[Math.floor(Math.random() * WEATHER_DATA.length)];
    const tempEl = document.getElementById('weatherTemp');
    const condEl = document.getElementById('weatherCond');

    if (tempEl) {
      tempEl.textContent = `${weather.temp}°C`;
    }
    if (condEl) {
      const lang = Lang.getCurrent();
      const conditions = {
        sunny: { tamil: 'வெயில்', hindi: 'धूप', english: 'Sunny' },
        partly_cloudy: { tamil: 'ஓரளவு மேகமூட்டம்', hindi: 'आंशिक बादल', english: 'Partly Cloudy' },
        clear: { tamil: 'தெளிவான வானிலை', hindi: 'साफ़ मौसम', english: 'Clear Sky' },
        cloudy: { tamil: 'மேகமூட்டம்', hindi: 'बादल', english: 'Cloudy' },
        hot: { tamil: 'அதிக வெப்பம்', hindi: 'गर्म', english: 'Hot' },
      };
      const condText = conditions[weather.condition]?.[lang] || conditions[weather.condition]?.english || weather.condition;
      condEl.innerHTML = `<span>${weather.icon}</span><span>${condText} · ${Lang.get('home.humidity') || 'Humidity'} ${weather.humidity}%</span>`;
    }
  }

  // ============================
  // TOP PRICE CARD
  // ============================
  function renderTopPrice() {
    // Pick the top crop by price
    const sorted = [...CROP_PRICES].sort((a, b) => b.price - a.price);
    const top = sorted[0];

    const priceEl = document.getElementById('topPriceValue');
    const cropEl = document.getElementById('topPriceCrop');
    const trendEl = document.getElementById('topPriceTrend');

    if (priceEl) {
      priceEl.innerHTML = `<span class="price-value">₹${top.price}/kg</span>`;
    }
    if (cropEl) {
      const cropName = Lang.get(`crop.${top.crop}`) || top.crop;
      cropEl.textContent = `${top.emoji} ${cropName}`;
    }
    if (trendEl) {
      trendEl.className = `price-trend ${top.trend}`;
      trendEl.textContent = `${top.trend === 'up' ? '↑' : '↓'} ${top.change}`;
    }
  }

  // ============================
  // ALERT CARD
  // ============================
  function renderAlert() {
    // 70% chance safe, 30% warning
    const isSafe = Math.random() > 0.3;
    const alert = isSafe ? ALERTS[0] : ALERTS[1];

    const statusEl = document.getElementById('alertStatus');
    const msgEl = document.getElementById('alertMsg');
    const dotEl = document.getElementById('alertDot');

    if (dotEl) {
      dotEl.className = `alert-dot ${alert.type}`;
    }
    if (statusEl) {
      statusEl.textContent = isSafe
        ? (Lang.get('home.status_safe') || '✅ All Clear')
        : (Lang.get('home.status_warning') || '⚠️ Caution');
    }
    if (msgEl) {
      msgEl.textContent = Lang.get(alert.key);
    }
  }

  // ============================
  // FLOATING CROP EMOJIS
  // ============================
  function createCropFloats() {
    const container = document.getElementById('cropFloats');
    if (!container) return;

    for (let i = 0; i < 12; i++) {
      const el = document.createElement('div');
      el.className = 'crop-float';
      el.textContent = CROP_EMOJIS[i % CROP_EMOJIS.length];
      el.style.left = (Math.random() * 100) + '%';
      el.style.animationDuration = (18 + Math.random() * 22) + 's';
      el.style.animationDelay = (Math.random() * 15) + 's';
      el.style.fontSize = (1.2 + Math.random() * 1.5) + 'rem';
      container.appendChild(el);
    }
  }

  // ============================
  // HEADER SCROLL EFFECT
  // ============================
  function initScrollEffect() {
    const header = document.getElementById('homeHeader');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // ============================
  // NAVIGATION
  // ============================
  function navigateTo(url) {
    const transition = document.getElementById('pageTransition');
    if (transition) {
      transition.classList.add('active');
      setTimeout(() => { window.location.href = url; }, 400);
    } else {
      window.location.href = url;
    }
  }

  function logout() {
    Auth.logout();
    navigateTo('index.html');
  }

  // ============================
  // INIT
  // ============================
  function init() {
    const session = checkAuth();
    if (!session) return;

    const farmer = getFarmerProfile(session);

    // Load saved language
    const savedLang = Lang.getSaved();
    Lang.load(savedLang).then(() => {
      renderGreeting(farmer);
      renderWeather(farmer);
      renderTopPrice();
      renderAlert();
      Lang.applyTranslations();
    });

    createCropFloats();
    initScrollEffect();

    // Dashboard button
    const dashBtn = document.getElementById('btnDashboard');
    const ctaBtn = document.getElementById('btnCtaDashboard');

    if (dashBtn) {
      dashBtn.addEventListener('click', () => navigateTo('prices.html'));
    }
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => navigateTo('prices.html'));
    }

    // Logout button
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
  }

  return { init, navigateTo, logout };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', Home.init);
