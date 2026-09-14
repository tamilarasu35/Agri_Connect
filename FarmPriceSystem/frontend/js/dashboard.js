/**
 * FarmPriceSystem — Dashboard Page Module (dashboard.js)
 * Full post-login dashboard with:
 *  - Personalized greeting (4 time periods)
 *  - Summary cards (top price, nearest mandi, smart alert)
 *  - Farmer personal details
 *  - Land details with map
 *  - Crop cards with live prices
 *  - Sales history table
 *  - Quick action buttons
 */

const Dashboard = (() => {

  // ============================
  // CROP EMOJI MAP
  // ============================
  const CROP_EMOJI = {
    tomato: '🍅', onion: '🧅', rice: '🌾', wheat: '🌿',
    sugarcane: '🎋', cotton: '☁️', banana: '🍌', mango: '🥭',
    potato: '🥔', chilli: '🌶️', groundnut: '🥜', coconut: '🥥',
    turmeric: '🟡', maize: '🌽'
  };

  // ============================
  // MANDI COORDINATES (for distance calc)
  // ============================
  const MANDIS = [
    { key: 'coimbatore', name: 'Coimbatore Mandi', lat: 11.0168, lon: 76.9558 },
    { key: 'salem',      name: 'Salem Mandi',      lat: 11.6643, lon: 78.1460 },
    { key: 'madurai',    name: 'Madurai Mandi',     lat: 9.9252,  lon: 78.1198 },
    { key: 'chennai',    name: 'Chennai (Koyambedu)', lat: 13.0827, lon: 80.2707 },
    { key: 'trichy',     name: 'Trichy Mandi',      lat: 10.7905, lon: 78.7047 },
    { key: 'dindigul',   name: 'Dindigul Mandi',    lat: 10.3624, lon: 77.9695 },
    { key: 'erode',      name: 'Erode Mandi',       lat: 11.3410, lon: 77.7172 },
    { key: 'tirunelveli', name: 'Tirunelveli Mandi', lat: 8.7139,  lon: 77.7567 },
  ];

  // ============================
  // SMART ALERTS (simulated, context-aware)
  // ============================
  const SMART_ALERTS = [
    { type: 'weather', icon: '🌧️', key: 'dashboard.alert_rain',    gauge: 'rain',     gaugePercent: 72, gaugeLabel: 'dashboard.rain_risk',    borderClass: 'alert-weather' },
    { type: 'pest',    icon: '🐛', key: 'dashboard.alert_pest',    gauge: 'pest',     gaugePercent: 45, gaugeLabel: 'dashboard.pest_risk',    borderClass: 'alert-pest' },
    { type: 'price',   icon: '📈', key: 'dashboard.alert_festival', gauge: 'moisture', gaugePercent: 30, gaugeLabel: 'dashboard.soil_moisture', borderClass: 'alert-price' },
    { type: 'weather', icon: '☀️', key: 'dashboard.alert_heat',    gauge: 'rain',     gaugePercent: 15, gaugeLabel: 'dashboard.rain_risk',    borderClass: 'alert-weather' },
  ];

  // ============================
  // SIMULATED PRICE DATA (fallback if no CSV)
  // ============================
  const PRICE_DATA = {
    tomato:    { price: 20, yesterday: 17, mandi: 'Coimbatore' },
    onion:     { price: 14, yesterday: 15, mandi: 'Coimbatore' },
    rice:      { price: 32, yesterday: 31, mandi: 'Coimbatore' },
    wheat:     { price: 26, yesterday: 27, mandi: 'Coimbatore' },
    sugarcane: { price: 35, yesterday: 33, mandi: 'Coimbatore' },
    cotton:    { price: 62, yesterday: 63, mandi: 'Erode' },
    banana:    { price: 22, yesterday: 23, mandi: 'Madurai' },
    mango:     { price: 55, yesterday: 52, mandi: 'Coimbatore' },
    potato:    { price: 18, yesterday: 19, mandi: 'Salem' },
    chilli:    { price: 48, yesterday: 45, mandi: 'Coimbatore' },
    groundnut: { price: 58, yesterday: 55, mandi: 'Coimbatore' },
    coconut:   { price: 18, yesterday: 17, mandi: 'Coimbatore' },
    turmeric:  { price: 95, yesterday: 92, mandi: 'Erode' },
    maize:     { price: 22, yesterday: 23, mandi: 'Coimbatore' },
  };

  // ============================
  // SIMULATED ORDERS DATA
  // ============================
  const ORDERS_DATA = [
    { date: '12 Mar', crop: 'tomato', variety: 'Cherry Tomato', qty: '100 kg', priceKg: '₹18', total: '₹1,800', status: 'completed' },
    { date: '08 Mar', crop: 'onion',  variety: 'Red Onion',     qty: '50 kg',  priceKg: '₹12', total: '₹600',   status: 'pending' },
    { date: '05 Mar', crop: 'rice',   variety: 'Sona Masuri',   qty: '200 kg', priceKg: '₹32', total: '₹6,400', status: 'completed' },
    { date: '28 Feb', crop: 'banana', variety: 'Nendran',       qty: '75 kg',  priceKg: '₹22', total: '₹1,650', status: 'completed' },
    { date: '20 Feb', crop: 'turmeric', variety: 'Erode Turmeric', qty: '30 kg', priceKg: '₹95', total: '₹2,850', status: 'cancelled' },
  ];

  // ============================
  // AUTH GUARD & PROFILE RETRIEVAL
  // ============================
  function checkAuth() {
    let session = null;
    if (window.Auth && typeof window.Auth.getSession === 'function') {
      session = window.Auth.getSession();
    }
    if (!session) {
      try {
        session = JSON.parse(localStorage.getItem('fps_session'));
      } catch(e){}
    }
    if (!session) {
      const name = localStorage.getItem('agriconnect_farmer_name');
      const phone = localStorage.getItem('agriconnect_farmer_phone');
      const loc = localStorage.getItem('agriconnect_farmer_location');
      if (name || phone) {
        session = {
          id: 'F' + Date.now(),
          name: name || (phone ? `Farmer (${phone.slice(-4)})` : 'Farmer'),
          phone: phone || '9876543210',
          location: loc || 'காந்தி வீதி, மதுரை, வாடிப்பட்டி',
          crops: ['tomato', 'onion', 'rice', 'wheat', 'sugarcane'],
          role: 'farmer'
        };
      }
    }
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  }

  // ============================
  // GET FULL FARMER PROFILE
  // ============================
  function getFarmerProfile(session) {
    try {
      const farmers = JSON.parse(localStorage.getItem('fps_farmers') || '[]');
      const found = farmers.find(f => f.id === session.id || (f.phone && session.phone && f.phone === session.phone));
      if (found) return { ...session, ...found };
      return session;
    } catch {
      return session;
    }
  }

  // ============================
  // DYNAMICALLY SYNC FARMER DETAILS EVERYWHERE ON DOM
  // ============================
  function updateAllDashboardFarmerDetails(farmer) {
    if (!farmer) farmer = {};

    const name = farmer.name 
      || localStorage.getItem('agriconnect_farmer_name')
      || (farmer.phone ? `Farmer (${farmer.phone.slice(-4)})` : 'Tamilarasu');

    const phone = farmer.phone || localStorage.getItem('agriconnect_farmer_phone') || '9876543210';
    const location = farmer.location || localStorage.getItem('agriconnect_farmer_location') || 'மதுரை, வாடிப்பட்டி';
    
    farmer.name = name;
    farmer.phone = phone;
    farmer.location = location;

    const words = name.trim().split(/\s+/);
    let initials = 'FP';
    if (words.length >= 2) {
      initials = (words[0][0] + words[words.length - 1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length > 0) {
      initials = words[0].substring(0, 2).toUpperCase();
    }

    // 1. Header User Profile Card Widget
    const headerUserName = document.getElementById('headerName') || document.querySelector('.user-profile-auth-widget .user-name');
    const headerUserRole = document.getElementById('headerRole') || document.querySelector('.user-profile-auth-widget .user-role');
    const headerAvatar = document.getElementById('headerAvatar') || document.querySelector('.user-profile-auth-widget .avatar-circle');

    if (headerUserName) headerUserName.textContent = name;
    if (headerUserRole) headerUserRole.textContent = `${location} • Certified Producer`;
    if (headerAvatar) headerAvatar.textContent = initials;

    // 2. Main Greeting Card
    const mainHeading = document.getElementById('mainGreetingHeading') || document.querySelector('.greeting-main-heading');
    const tamilSubheading = document.getElementById('mainGreetingSubheading') || document.querySelector('.greeting-tamil-subheading');
    const metaStripLoc = document.getElementById('mainGreetingLocation') || document.querySelector('.greeting-meta-strip span:first-child');

    if (mainHeading) mainHeading.innerHTML = `Good Morning, ${name} 👨‍🌾`;
    if (tamilSubheading) tamilSubheading.textContent = `காலை வணக்கம் • ${location} உழவர் மையம்`;
    if (metaStripLoc) metaStripLoc.textContent = `📍 ${location}`;

    // 3. CERTIFIED PRODUCER DOSSIER CARD
    const dossierAvatar = document.getElementById('dossierAvatar') || document.querySelector('.dossier-farmer-row .avatar-circle');
    const dossierName = document.getElementById('dossierName') || document.querySelector('.dossier-farmer-row strong');
    const dossierLic = document.getElementById('dossierLic') || document.querySelector('.dossier-farmer-row div div');
    const dossierReg = document.getElementById('dossierReg');
    
    if (dossierAvatar) dossierAvatar.textContent = initials;
    if (dossierName) dossierName.textContent = name;
    if (dossierLic) dossierLic.textContent = `APMC Lic #TN-FARM-${phone.slice(-4)}`;
    if (dossierReg) dossierReg.textContent = `Farm Location: ${location}`;

    // 4. Personal Details & Profile Display
    const personalNameEl = document.querySelector('#personalDetailsGrid .detail-item:first-child .detail-value');
    if (personalNameEl) personalNameEl.textContent = name;

    const profileDisplayName = document.getElementById('profileDisplayName');
    if (profileDisplayName) profileDisplayName.textContent = name;

    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) profileAvatar.textContent = initials;

    // 5. Marketplace Seller Profiles
    const sellerAvatars = document.querySelectorAll('.seller-profile-row .avatar-circle');
    const sellerNames = document.querySelectorAll('.seller-profile-row span');
    
    sellerAvatars.forEach(av => av.textContent = initials);
    sellerNames.forEach(sn => sn.textContent = `${name} • ${location}`);
  }

  // ============================
  // TIME-OF-DAY GREETING
  // ============================
  function getGreetingKey() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11)  return 'dashboard.greeting_morning';
    if (hour >= 11 && hour < 16) return 'dashboard.greeting_afternoon';
    if (hour >= 16 && hour < 20) return 'dashboard.greeting_evening';
    return 'dashboard.greeting_night';
  }

  function getGreetingEmoji() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11)  return '🌅';
    if (hour >= 11 && hour < 16) return '☀️';
    if (hour >= 16 && hour < 20) return '🌇';
    return '🌙';
  }

  // ============================
  // RENDER GREETING (Section 1)
  // ============================
  function renderGreeting(farmer) {
    updateAllDashboardFarmerDetails(farmer);

    const emojiEl   = document.getElementById('greetingEmoji');
    const greetEl   = document.getElementById('greetingText');
    const subInfoEl = document.getElementById('greetingSubinfo');

    if (emojiEl) emojiEl.textContent = getGreetingEmoji();

    if (greetEl) {
      const greetingWord = Lang.get(getGreetingKey());
      const name = farmer.name || 'Farmer';
      greetEl.innerHTML = `${greetingWord}, <span class="greeting-name">${name}!</span>`;
    }

    if (subInfoEl) {
      const location = farmer.location || '';
      const now = new Date();
      const lang = Lang.getCurrent();
      const locale = lang === 'tamil' ? 'ta-IN' : lang === 'hindi' ? 'hi-IN' : 'en-IN';
      const dateStr = now.toLocaleDateString(locale, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const parts = [];
      if (location) parts.push(`<span class="loc-icon">📍</span> ${location}`);
      parts.push(`<span class="dot-sep"></span>`);
      parts.push(`📅 ${dateStr}`);
      subInfoEl.innerHTML = parts.join(' ');
    }
  }

  // ============================
  // RENDER SUMMARY CARDS (Section 2)
  // ============================
  function renderSummaryCards(farmer) {
    renderTopPriceCard();
    renderNearestMandiCard(farmer);
    renderSmartAlertCard();
  }

  function renderTopPriceCard() {
    const el = document.getElementById('topPriceCard');
    if (!el) return;

    // Find highest priced crop
    let topCrop = null, topPrice = 0;
    for (const [crop, data] of Object.entries(PRICE_DATA)) {
      if (data.price > topPrice) {
        topPrice = data.price;
        topCrop = crop;
      }
    }

    const data = PRICE_DATA[topCrop];
    const change = data.price - data.yesterday;
    const changePercent = ((change / data.yesterday) * 100).toFixed(0);
    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
    const cropName = Lang.get(`crop.${topCrop}`) || topCrop;

    el.innerHTML = `
      <div class="sc-label" data-lang="dashboard.top_price_label">${Lang.get('dashboard.top_price_label')}</div>
      <div class="sc-value">${cropName} — ₹${topPrice}/kg</div>
      <div class="sc-sub">${data.mandi} Mandi</div>
      <span class="sc-trend ${trend}">${trendArrow} ${change > 0 ? '+' : ''}${changePercent}%</span>
    `;
  }

  function renderNearestMandiCard(farmer) {
    const el = document.getElementById('nearestMandiCard');
    if (!el) return;

    // Parse GPS from location or use default
    let farmerLat = 11.0168, farmerLon = 76.9558; // Default: Coimbatore area
    const loc = farmer.location || '';

    // Find nearest mandi
    let nearestMandi = MANDIS[0];
    let minDist = Infinity;

    MANDIS.forEach(m => {
      const dist = haversineDistance(farmerLat, farmerLon, m.lat, m.lon);
      if (dist < minDist) {
        minDist = dist;
        nearestMandi = m;
      }
    });

    const distKm = minDist.toFixed(1);
    const mandiName = Lang.get(`mandi.${nearestMandi.key}`) || nearestMandi.name;

    el.innerHTML = `
      <div class="sc-label" data-lang="dashboard.nearest_mandi_label">${Lang.get('dashboard.nearest_mandi_label')}</div>
      <div class="sc-value">📍 ${mandiName}</div>
      <div class="sc-sub">${distKm} km ${Lang.get('dashboard.away') || 'away'}</div>
      <a class="sc-link" href="https://maps.google.com/?q=${nearestMandi.lat},${nearestMandi.lon}" target="_blank">
        🗺️ ${Lang.get('dashboard.get_directions') || 'Get Directions'} →
      </a>
    `;
  }

  function renderSmartAlertCard() {
    const el = document.getElementById('smartAlertCard');
    if (!el) return;

    // Pick a random smart alert
    const alert = SMART_ALERTS[Math.floor(Math.random() * SMART_ALERTS.length)];

    el.className = `glass-summary-card ${alert.borderClass} alert-pulse`;

    const gaugeLevel = alert.gaugePercent > 60 ? Lang.get('dashboard.level_high') || 'High'
                     : alert.gaugePercent > 30 ? Lang.get('dashboard.level_medium') || 'Medium'
                     : Lang.get('dashboard.level_low') || 'Low';

    el.innerHTML = `
      <div class="sc-label">${alert.icon} ${Lang.get('dashboard.smart_alert_label') || 'Smart Alert'}</div>
      <div class="sc-value" style="font-size:1.1rem; font-family: var(--dash-font-body);">${Lang.get(alert.key)}</div>
      <div class="alert-gauge">
        <div class="alert-gauge__label">${Lang.get(alert.gaugeLabel) || ''} — ${gaugeLevel}</div>
        <div class="alert-gauge__track">
          <div class="alert-gauge__fill ${alert.gauge}" style="width: ${alert.gaugePercent}%"></div>
        </div>
      </div>
    `;
  }

  // ============================
  // RENDER PERSONAL DETAILS (Section 3)
  // ============================
  function renderPersonalDetails(farmer) {
    const container = document.getElementById('personalDetailsGrid');
    if (!container) return;

    const lang = Lang.getCurrent();
    const phone = farmer.phone || '----------';
    // Mask phone for privacy: show first 5 and mask rest
    const maskedPhone = phone.length >= 10
      ? phone.substring(0, 5) + ' XXXXX'
      : phone;

    const langDisplay = lang === 'tamil' ? 'தமிழ்' : lang === 'hindi' ? 'हिंदी' : 'English';

    const regDate = farmer.registeredAt
      ? new Date(farmer.registeredAt).toLocaleDateString(
          lang === 'tamil' ? 'ta-IN' : lang === 'hindi' ? 'hi-IN' : 'en-IN',
          { day: 'numeric', month: 'short', year: 'numeric' }
        )
      : '-';

    container.innerHTML = `
      <div class="detail-item">
        <span class="detail-label">${Lang.get('dashboard.field_name') || 'Name'}</span>
        <span class="detail-value">${farmer.name || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">${Lang.get('dashboard.field_phone') || 'Phone'}</span>
        <span class="detail-value">${maskedPhone}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">${Lang.get('dashboard.field_language') || 'Language'}</span>
        <span class="detail-value">${langDisplay}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">${Lang.get('dashboard.field_registered') || 'Registered'}</span>
        <span class="detail-value">${regDate}</span>
      </div>
    `;

    // Avatar initials
    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl && farmer.name) {
      const initials = farmer.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      avatarEl.textContent = initials;
    }

    // Profile name
    const nameEl = document.getElementById('profileDisplayName');
    if (nameEl) nameEl.textContent = farmer.name || 'Farmer';
  }

  // ============================
  // RENDER LAND DETAILS (Section 4 & Google Maps)
  // ============================
  function renderLandDetails(farmer) {
    const container = document.getElementById('landDetailsGrid');
    const location = farmer.location || 'Pudhukaraipudhur, Gobichettipalayam';
    const parts = location.split(',').map(s => s.trim());
    const village = parts[0] || 'Pudhukaraipudhur';
    const district = parts[1] || 'Gobichettipalayam';

    // Known TN agricultural location coordinates lookup
    const knownCoords = {
      'pudhukaraipudhur': { lat: 11.4725, lon: 77.4285 },
      'pudhukarai pudhur': { lat: 11.4725, lon: 77.4285 },
      'pudhukarai': { lat: 11.4725, lon: 77.4285 },
      'gobichettipalayam': { lat: 11.4549, lon: 77.4381 },
      'gobi': { lat: 11.4549, lon: 77.4381 },
      'palladam': { lat: 10.9968, lon: 77.2835 },
      'kangeyam': { lat: 11.0051, lon: 77.5606 },
      'erode': { lat: 11.3410, lon: 77.7172 },
      'coimbatore': { lat: 11.0168, lon: 76.9558 },
      'madurai': { lat: 9.9252, lon: 78.1198 }
    };

    let lat = 11.4725, lon = 77.4285; // Pudhukaraipudhur, Gobichettipalayam default
    let locKey = location.toLowerCase();

    try {
      const storedGps = JSON.parse(localStorage.getItem('fps_farmer_gps') || sessionStorage.getItem('fps_farmer_gps') || 'null');
      if (storedGps && storedGps.lat && storedGps.lon) {
        lat = Number(storedGps.lat);
        lon = Number(storedGps.lon);
      } else {
        for (const [k, v] of Object.entries(knownCoords)) {
          if (locKey.includes(k)) {
            lat = v.lat;
            lon = v.lon;
            break;
          }
        }
      }
    } catch(e) {}

    if (container) {
      container.innerHTML = `
        <div class="detail-item">
          <span class="detail-label">📍 ${Lang.get('dashboard.field_village') || 'Village'}</span>
          <span class="detail-value">${village}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">🏛️ ${Lang.get('dashboard.field_district') || 'District'}</span>
          <span class="detail-value">${district}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">🗺️ ${Lang.get('dashboard.field_state') || 'State'}</span>
          <span class="detail-value">Tamil Nadu</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">📡 ${Lang.get('dashboard.field_gps') || 'GPS'}</span>
          <span class="detail-value" id="gpsValText">${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E</span>
        </div>
      `;
    }

    const dossierReg = document.getElementById('dossierReg');
    if (dossierReg) dossierReg.textContent = `Farm Location: ${location}`;

    const mapEl = document.getElementById('landMapFrame');
    const plotTitleEl = document.getElementById('mapPlotTitle');
    const coordTextEl = document.getElementById('mapCoordinatesText');

    if (plotTitleEl) plotTitleEl.textContent = `📍 Registered Land Plot • ${location || 'Pudhukaraipudhur, Gobichettipalayam'}`;
    if (coordTextEl) coordTextEl.textContent = `Coordinates: ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E • ${village}`;

    if (mapEl) {
      const queryStr = encodeURIComponent((location || 'Pudhukaraipudhur, Gobichettipalayam') + ', Tamil Nadu');
      mapEl.src = `https://maps.google.com/maps?q=${queryStr}&t=m&z=15&output=embed`;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const liveLat = pos.coords.latitude;
        const liveLon = pos.coords.longitude;
        if (mapEl) {
          mapEl.src = `https://maps.google.com/maps?q=${liveLat},${liveLon}&t=m&z=16&output=embed`;
        }
        if (coordTextEl) {
          coordTextEl.textContent = `Real-Time GPS: ${liveLat.toFixed(4)}° N, ${liveLon.toFixed(4)}° E • Live Google Map Pin`;
        }
        const gpsValEl = document.getElementById('gpsValText');
        if (gpsValEl) gpsValEl.textContent = `${liveLat.toFixed(4)}° N, ${liveLon.toFixed(4)}° E`;
        localStorage.setItem('fps_farmer_gps', JSON.stringify({ lat: liveLat, lon: liveLon }));
      }, (err) => {}, { enableHighAccuracy: true, timeout: 8000 });
    }
  }

  // DEFAULT AUTHENTIC CROP PHOTOS FOR ALL 18 MANDI CROPS
  const DEFAULT_CROP_PHOTOS = {
    tomato: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=600&q=80',
    onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
    rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
    sugarcane: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=600&q=80',
    cotton: 'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&w=600&q=80',
    banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
    mango: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
    potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    chilli: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',
    groundnut: 'https://images.unsplash.com/photo-1567892328221-5a043c7b6f3a?auto=format&fit=crop&w=600&q=80',
    coconut: 'https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?auto=format&fit=crop&w=600&q=80',
    turmeric: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
    maize: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
    carrot: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?auto=format&fit=crop&w=600&q=80',
    beetroot: 'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?auto=format&fit=crop&w=600&q=80',
    radish: 'https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=600&q=80',
    cabbage: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=600&q=80'
  };

  // ============================
  // RENDER CROP CARDS (Section 5 & Active Field Carousel)
  // ============================
  function renderCropCards(farmer) {
    const row = document.getElementById('cropsFieldRow') || document.getElementById('cropsScrollRow');
    if (!row) return;

    // Retrieve cropsData: Prioritize direct user configuration saved from login/registration
    let cropsData = null;
    try {
      const stored = localStorage.getItem('agriconnect_farmer_crops_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cropsData = parsed;
        }
      }
    } catch(e) {}

    // Next check farmer.cropsData
    if ((!cropsData || !cropsData.length) && farmer && farmer.cropsData && Array.isArray(farmer.cropsData) && farmer.cropsData.length > 0) {
      cropsData = farmer.cropsData;
    }

    // Fallback: If only crop ID array farmer.crops exists
    if ((!cropsData || !cropsData.length) && farmer && farmer.crops && Array.isArray(farmer.crops) && farmer.crops.length > 0) {
      cropsData = farmer.crops.map((cId, idx) => {
        return {
          id: cId,
          name: Lang.get(`crop.${cId}`) || cId,
          quantity: 100,
          unit: 'kg',
          image: DEFAULT_CROP_PHOTOS[cId] || DEFAULT_CROP_PHOTOS['tomato'],
          stage: idx % 2 === 0 ? 'Vegetative Stage' : 'Flowering Stage',
          daysToHarvest: 14 + (idx * 7) % 28,
          health: 90 + (idx * 2) % 9
        };
      });
    }

    if (!cropsData || cropsData.length === 0) {
      row.innerHTML = `<div style="padding: 24px; color: var(--text-muted); text-align: center;">${Lang.get('dashboard.no_crops') || 'No active crops selected'}</div>`;
      return;
    }

    row.innerHTML = '';

    cropsData.forEach((crop, idx) => {
      const cropId = crop.id || (typeof crop === 'string' ? crop : 'tomato');
      const cropImg = crop.image || DEFAULT_CROP_PHOTOS[cropId] || DEFAULT_CROP_PHOTOS['tomato'];
      const qtyNum = (crop.quantity !== undefined && crop.quantity !== null && crop.quantity !== '') ? crop.quantity : 100;
      const unitStr = crop.unit || 'kg';
      const qtyText = `${qtyNum} ${unitStr}`;

      let cropName = crop.name;
      if (!cropName || cropName === cropId) {
        cropName = Lang.get(`crop.${cropId}`) || cropId;
      }

      const stage = crop.stage || (idx % 2 === 0 ? 'Vegetative Stage' : 'Maturation Stage');
      const health = crop.health || (90 + (idx * 3) % 9);
      const days = crop.daysToHarvest || (14 + (idx * 6) % 25);
      const moisture = 55 + (idx * 7) % 28;
      const soilTemp = 26 + (idx * 2) % 5;

      const card = document.createElement('div');
      card.className = 'crop-field-card';
      card.innerHTML = `
        <div class="crop-card-image-area" style="background-image: url('${cropImg}'); background-size: cover; background-position: center;">
          <div class="crop-card-overlay">
            <span class="crop-stage-badge">🌱 ${stage}</span>
            <div class="health-score-ring">${health}%</div>
          </div>
          <div class="crop-card-qty-badge">
            <span style="font-size:12px;">⚖️</span>
            <strong>${qtyText}</strong>
          </div>
        </div>
        <div class="crop-card-body">
          <div class="crop-card-title-row">
            <span class="crop-card-name">${cropName}</span>
            <span class="days-harvest-tag">⏳ ${days} Days</span>
          </div>
          <div class="crop-details-box">
            <span>💧 Moisture: ${moisture}%</span>
            <span>🌡️ Soil Temp: ${soilTemp}°C</span>
          </div>
          <div class="crop-card-stock-block">
            <div class="stock-label-line">
              <span class="stock-icon">📦</span>
              <span class="stock-label">கையிருப்பு அளவு / Stock:</span>
            </div>
            <div class="stock-value-line">
              <strong class="stock-qty-number">${qtyNum}</strong>
              <span class="stock-qty-unit">${unitStr}</span>
            </div>
          </div>
        </div>
      `;
      row.appendChild(card);
    });
  }

  // ============================
  // RENDER SALES HISTORY (Section 6)
  // ============================
  function renderSalesHistory() {
    const tbody = document.getElementById('salesTableBody');
    const emptyState = document.getElementById('salesEmptyState');
    const tableWrap = document.getElementById('salesTableWrap');
    const totalEl = document.getElementById('salesTotalValue');

    if (!tbody) return;

    // Check if there are orders
    const orders = ORDERS_DATA;

    if (orders.length === 0) {
      if (tableWrap) tableWrap.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (tableWrap) tableWrap.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = '';

    const statusLabels = {
      completed: { text: Lang.get('dashboard.status_completed') || 'Completed ✅', cls: 'completed' },
      pending:   { text: Lang.get('dashboard.status_pending')   || 'Pending ⏳', cls: 'pending' },
      cancelled: { text: Lang.get('dashboard.status_cancelled') || 'Cancelled ❌', cls: 'cancelled' },
    };

    let totalEarnings = 0;

    orders.forEach(order => {
      const emoji = CROP_EMOJI[order.crop] || '🌱';
      const cropName = Lang.get(`crop.${order.crop}`) || order.crop;
      const st = statusLabels[order.status] || statusLabels.pending;

      if (order.status === 'completed') {
        totalEarnings += parseInt(order.total.replace(/[₹,]/g, '')) || 0;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${order.date}</td>
        <td>${emoji} ${cropName}</td>
        <td>${order.qty}</td>
        <td>${order.priceKg}</td>
        <td style="font-weight:600;">${order.total}</td>
        <td><span class="status-badge ${st.cls}">${st.text}</span></td>
        <td><button class="btn-view-details">${Lang.get('dashboard.view_details') || 'Details'}</button></td>
      `;
      tbody.appendChild(tr);
    });

    if (totalEl) {
      totalEl.textContent = `₹${totalEarnings.toLocaleString('en-IN')}`;
    }
  }

  // ============================
  // UTILITY: Haversine Distance
  // ============================
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ============================
  // LOGOUT
  // ============================
  function logout() {
    Auth.logout();
    window.location.href = 'index.html';
  }

  // ============================
  // INIT
  // ============================
  function init() {
    const session = checkAuth();
    if (!session) return;

    const farmer = getFarmerProfile(session);

    // Synchronous immediate profile update (prevents flash of placeholder text)
    updateAllDashboardFarmerDetails(farmer);

    // Load saved language then render all sections
    const savedLang = Lang.getSaved();
    Lang.load(savedLang).then(() => {
      renderGreeting(farmer);
      renderSummaryCards(farmer);
      renderPersonalDetails(farmer);
      renderLandDetails(farmer);
      renderCropCards(farmer);
      renderSalesHistory();
      Lang.applyTranslations();
      // Ensure real farmer profile overrides any static dictionary strings
      updateAllDashboardFarmerDetails(farmer);
    }).catch(() => {
      updateAllDashboardFarmerDetails(farmer);
    });

    // Logout button
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Update location button
    const updateLocBtn = document.getElementById('btnUpdateLocation');
    if (updateLocBtn) {
      updateLocBtn.addEventListener('click', async () => {
        updateLocBtn.textContent = Lang.get('dashboard.detecting') || 'Detecting...';
        try {
          const location = await Auth.detectGPS();
          // Update farmer location in localStorage
          const farmers = JSON.parse(localStorage.getItem('fps_farmers') || '[]');
          const f = farmers.find(f => f.id === session.id);
          if (f) {
            f.location = location;
            localStorage.setItem('fps_farmers', JSON.stringify(farmers));
            renderLandDetails(f);
            renderNearestMandiCard(f);
          }
          updateLocBtn.textContent = `📍 ${Lang.get('dashboard.update_location') || 'Update Location'}`;
        } catch {
          updateLocBtn.textContent = `📍 ${Lang.get('dashboard.update_location') || 'Update Location'}`;
        }
      });
    }
  }

  return { init, logout };
})();

// Global inline name editing helper
function promptEditFarmerName() {
  const currentName = localStorage.getItem('agriconnect_farmer_name') || 'Tamilarasu';
  const newName = prompt("உங்கள் முழு பெயரை உள்ளிடவும் (Enter your full name):", currentName);
  if (newName && newName.trim()) {
    const formatted = newName.trim();
    localStorage.setItem('agriconnect_farmer_name', formatted);
    
    let session = {};
    try { session = JSON.parse(localStorage.getItem('fps_session') || '{}'); } catch(e){}
    session.name = formatted;
    localStorage.setItem('fps_session', JSON.stringify(session));

    let farmers = [];
    try { farmers = JSON.parse(localStorage.getItem('fps_farmers') || '[]'); } catch(e){}
    if (session.phone) {
      const found = farmers.find(f => f.phone === session.phone);
      if (found) {
        found.name = formatted;
        localStorage.setItem('fps_farmers', JSON.stringify(farmers));
      }
    }

    if (window.Dashboard && typeof window.Dashboard.init === 'function') {
      window.Dashboard.init();
    }
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', Dashboard.init);
