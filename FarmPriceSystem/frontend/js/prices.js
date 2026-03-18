/**
 * FarmPriceSystem — Prices Page Module (prices.js)
 * Handles crop selection, quantity, mandi, price fetching, and summary table.
 */

const Prices = (() => {

  // ============================
  // CROP DATA — All 14 categories + subcategories
  // ============================
  const CROP_DATA = [
    {
      id: 'tomato', emoji: '🍅', nameKey: 'crop.tomato',
      subs: [
        { id: 'cherry_tomato', nameKey: 'sub.cherry_tomato' },
        { id: 'roma_tomato', nameKey: 'sub.roma_tomato' },
        { id: 'beefsteak_tomato', nameKey: 'sub.beefsteak_tomato' },
        { id: 'heirloom_tomato', nameKey: 'sub.heirloom_tomato' },
        { id: 'grape_tomato', nameKey: 'sub.grape_tomato' },
      ]
    },
    {
      id: 'onion', emoji: '🧅', nameKey: 'crop.onion',
      subs: [
        { id: 'red_onion', nameKey: 'sub.red_onion' },
        { id: 'white_onion', nameKey: 'sub.white_onion' },
        { id: 'yellow_onion', nameKey: 'sub.yellow_onion' },
        { id: 'spring_onion', nameKey: 'sub.spring_onion' },
        { id: 'shallots', nameKey: 'sub.shallots' },
      ]
    },
    {
      id: 'rice', emoji: '🌾', nameKey: 'crop.rice',
      subs: [
        { id: 'basmati_rice', nameKey: 'sub.basmati_rice' },
        { id: 'jasmine_rice', nameKey: 'sub.jasmine_rice' },
        { id: 'sona_masuri', nameKey: 'sub.sona_masuri' },
        { id: 'brown_rice', nameKey: 'sub.brown_rice' },
        { id: 'sticky_rice', nameKey: 'sub.sticky_rice' },
      ]
    },
    {
      id: 'wheat', emoji: '🌿', nameKey: 'crop.wheat',
      subs: [
        { id: 'durum_wheat', nameKey: 'sub.durum_wheat' },
        { id: 'hard_red_wheat', nameKey: 'sub.hard_red_wheat' },
        { id: 'soft_wheat', nameKey: 'sub.soft_wheat' },
        { id: 'emmer_wheat', nameKey: 'sub.emmer_wheat' },
        { id: 'einkorn_wheat', nameKey: 'sub.einkorn_wheat' },
      ]
    },
    {
      id: 'sugarcane', emoji: '🎋', nameKey: 'crop.sugarcane',
      subs: [
        { id: 'co_86032', nameKey: 'sub.co_86032' },
        { id: 'co_0238', nameKey: 'sub.co_0238' },
        { id: 'coj_64', nameKey: 'sub.coj_64' },
        { id: 'co_05011', nameKey: 'sub.co_05011' },
        { id: 'copant_84211', nameKey: 'sub.copant_84211' },
      ]
    },
    {
      id: 'cotton', emoji: '☁️', nameKey: 'crop.cotton',
      subs: [
        { id: 'bt_cotton', nameKey: 'sub.bt_cotton' },
        { id: 'egyptian_cotton', nameKey: 'sub.egyptian_cotton' },
        { id: 'pima_cotton', nameKey: 'sub.pima_cotton' },
        { id: 'upland_cotton', nameKey: 'sub.upland_cotton' },
        { id: 'organic_cotton', nameKey: 'sub.organic_cotton' },
      ]
    },
    {
      id: 'banana', emoji: '🍌', nameKey: 'crop.banana',
      subs: [
        { id: 'cavendish', nameKey: 'sub.cavendish' },
        { id: 'robusta', nameKey: 'sub.robusta' },
        { id: 'nendran', nameKey: 'sub.nendran' },
        { id: 'red_banana', nameKey: 'sub.red_banana' },
        { id: 'poovan', nameKey: 'sub.poovan' },
        { id: 'rasthali', nameKey: 'sub.rasthali' },
      ]
    },
    {
      id: 'mango', emoji: '🥭', nameKey: 'crop.mango',
      subs: [
        { id: 'alphonso', nameKey: 'sub.alphonso' },
        { id: 'banganapalli', nameKey: 'sub.banganapalli' },
        { id: 'dasheri', nameKey: 'sub.dasheri' },
        { id: 'kesar', nameKey: 'sub.kesar' },
        { id: 'langra', nameKey: 'sub.langra' },
        { id: 'totapuri', nameKey: 'sub.totapuri' },
      ]
    },
    {
      id: 'potato', emoji: '🥔', nameKey: 'crop.potato',
      subs: [
        { id: 'russet_potato', nameKey: 'sub.russet_potato' },
        { id: 'red_potato', nameKey: 'sub.red_potato' },
        { id: 'yukon_gold', nameKey: 'sub.yukon_gold' },
        { id: 'fingerling_potato', nameKey: 'sub.fingerling_potato' },
        { id: 'sweet_potato', nameKey: 'sub.sweet_potato' },
      ]
    },
    {
      id: 'chilli', emoji: '🌶️', nameKey: 'crop.chilli',
      subs: [
        { id: 'green_chilli', nameKey: 'sub.green_chilli' },
        { id: 'red_chilli', nameKey: 'sub.red_chilli' },
        { id: 'kashmiri_chilli', nameKey: 'sub.kashmiri_chilli' },
        { id: 'byadgi_chilli', nameKey: 'sub.byadgi_chilli' },
        { id: 'birds_eye_chilli', nameKey: 'sub.birds_eye_chilli' },
      ]
    },
    {
      id: 'groundnut', emoji: '🥜', nameKey: 'crop.groundnut',
      subs: [
        { id: 'spanish_type', nameKey: 'sub.spanish_type' },
        { id: 'virginia_type', nameKey: 'sub.virginia_type' },
        { id: 'runner_type', nameKey: 'sub.runner_type' },
        { id: 'valencia_type', nameKey: 'sub.valencia_type' },
      ]
    },
    {
      id: 'coconut', emoji: '🥥', nameKey: 'crop.coconut',
      subs: [
        { id: 'west_coast_tall', nameKey: 'sub.west_coast_tall' },
        { id: 'east_coast_tall', nameKey: 'sub.east_coast_tall' },
        { id: 'chowghat_dwarf', nameKey: 'sub.chowghat_dwarf' },
        { id: 'malayan_dwarf', nameKey: 'sub.malayan_dwarf' },
        { id: 'hybrid_coconut', nameKey: 'sub.hybrid_coconut' },
      ]
    },
    {
      id: 'turmeric', emoji: '🟡', nameKey: 'crop.turmeric',
      subs: [
        { id: 'salem_turmeric', nameKey: 'sub.salem_turmeric' },
        { id: 'erode_turmeric', nameKey: 'sub.erode_turmeric' },
        { id: 'alleppey_turmeric', nameKey: 'sub.alleppey_turmeric' },
        { id: 'rajapuri', nameKey: 'sub.rajapuri' },
        { id: 'lakadong', nameKey: 'sub.lakadong' },
      ]
    },
    {
      id: 'maize', emoji: '🌽', nameKey: 'crop.maize',
      subs: [
        { id: 'sweet_corn', nameKey: 'sub.sweet_corn' },
        { id: 'dent_corn', nameKey: 'sub.dent_corn' },
        { id: 'flint_corn', nameKey: 'sub.flint_corn' },
        { id: 'popcorn', nameKey: 'sub.popcorn' },
        { id: 'baby_corn', nameKey: 'sub.baby_corn' },
      ]
    },
  ];

  // ============================
  // MANDI DATA — Tamil Nadu
  // ============================
  const MANDIS = [
    { id: 'coimbatore', nameKey: 'mandi.coimbatore', lat: 11.0168, lng: 76.9558 },
    { id: 'salem', nameKey: 'mandi.salem', lat: 11.6643, lng: 78.146 },
    { id: 'madurai', nameKey: 'mandi.madurai', lat: 9.9252, lng: 78.1198 },
    { id: 'chennai', nameKey: 'mandi.chennai', lat: 13.0827, lng: 80.2707 },
    { id: 'trichy', nameKey: 'mandi.trichy', lat: 10.7905, lng: 78.7047 },
    { id: 'dindigul', nameKey: 'mandi.dindigul', lat: 10.3673, lng: 77.9803 },
    { id: 'erode', nameKey: 'mandi.erode', lat: 11.3410, lng: 77.7172 },
    { id: 'tirunelveli', nameKey: 'mandi.tirunelveli', lat: 8.7139, lng: 77.7567 },
  ];

  // ============================
  // SIMULATED PRICE DATA (offline fallback)
  // ============================
  const PRICE_DATA = {
    tomato:    { min: 12, max: 28, modal: 18, yesterday: 16 },
    onion:     { min: 8, max: 22, modal: 15, yesterday: 15 },
    rice:      { min: 32, max: 48, modal: 38, yesterday: 40 },
    wheat:     { min: 22, max: 36, modal: 28, yesterday: 27 },
    sugarcane: { min: 28, max: 42, modal: 35, yesterday: 34 },
    cotton:    { min: 52, max: 78, modal: 62, yesterday: 65 },
    banana:    { min: 18, max: 40, modal: 28, yesterday: 26 },
    mango:     { min: 35, max: 80, modal: 55, yesterday: 52 },
    potato:    { min: 10, max: 25, modal: 16, yesterday: 18 },
    chilli:    { min: 30, max: 65, modal: 48, yesterday: 45 },
    groundnut: { min: 45, max: 75, modal: 58, yesterday: 60 },
    coconut:   { min: 12, max: 25, modal: 18, yesterday: 18 },
    turmeric:  { min: 70, max: 120, modal: 95, yesterday: 90 },
    maize:     { min: 14, max: 28, modal: 22, yesterday: 24 },
  };

  // Add slight randomness per variety/mandi
  function getPriceForCrop(cropId, mandiId) {
    const base = PRICE_DATA[cropId];
    if (!base) return { min: 10, max: 30, modal: 20, yesterday: 19 };
    // Small variation per mandi
    const mandiIdx = MANDIS.findIndex(m => m.id === mandiId);
    const offset = (mandiIdx - 3) * 0.5;
    return {
      min: Math.round(base.min + offset + (Math.random() * 2 - 1)),
      max: Math.round(base.max + offset + (Math.random() * 2 - 1)),
      modal: Math.round(base.modal + offset + (Math.random() * 2 - 1)),
      yesterday: base.yesterday,
    };
  }

  // ============================
  // STATE
  // ============================
  let selectedCrop = null;   // { parentId, subId, emoji, parentKey, subKey }
  let selectedQty = null;
  let selectedMandi = null;
  let farmerLocation = null;

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

  function getFarmerProfile(session) {
    try {
      const farmers = JSON.parse(localStorage.getItem('fps_farmers') || '[]');
      return farmers.find(f => f.id === session.id) || session;
    } catch { return session; }
  }

  // ============================
  // CROP LIST RENDERING
  // ============================
  function renderCropList() {
    const container = document.getElementById('cropList');
    if (!container) return;
    container.innerHTML = '';

    CROP_DATA.forEach(crop => {
      const category = document.createElement('div');
      category.className = 'crop-category';

      // Parent
      const parent = document.createElement('div');
      parent.className = 'crop-parent';
      parent.innerHTML = `
        <div class="crop-parent-left">
          <span class="crop-parent-emoji">${crop.emoji}</span>
          <span class="crop-parent-name" data-lang="${crop.nameKey}">${Lang.get(crop.nameKey)}</span>
        </div>
        <span class="crop-expand-arrow">▼</span>
      `;

      // Subs container
      const subsContainer = document.createElement('div');
      subsContainer.className = 'crop-subs';

      crop.subs.forEach(sub => {
        const subItem = document.createElement('div');
        subItem.className = 'crop-sub-item';
        subItem.dataset.parentId = crop.id;
        subItem.dataset.subId = sub.id;
        subItem.innerHTML = `
          <span class="crop-sub-dot"></span>
          <span data-lang="${sub.nameKey}">${Lang.get(sub.nameKey)}</span>
        `;

        subItem.addEventListener('click', (e) => {
          e.stopPropagation();
          selectCrop(crop, sub);
        });

        subsContainer.appendChild(subItem);
      });

      // Parent click → toggle
      parent.addEventListener('click', () => {
        const wasExpanded = parent.classList.contains('expanded');
        // Collapse all
        container.querySelectorAll('.crop-parent').forEach(p => p.classList.remove('expanded'));
        container.querySelectorAll('.crop-subs').forEach(s => s.classList.remove('open'));
        // Expand this one if it wasn't
        if (!wasExpanded) {
          parent.classList.add('expanded');
          subsContainer.classList.add('open');
        }
      });

      category.appendChild(parent);
      category.appendChild(subsContainer);
      container.appendChild(category);
    });
  }

  function selectCrop(parent, sub) {
    selectedCrop = {
      parentId: parent.id,
      subId: sub.id,
      emoji: parent.emoji,
      parentKey: parent.nameKey,
      subKey: sub.nameKey,
    };

    // Highlight selected
    document.querySelectorAll('.crop-sub-item').forEach(el => el.classList.remove('selected'));
    const sel = document.querySelector(`.crop-sub-item[data-sub-id="${sub.id}"]`);
    if (sel) sel.classList.add('selected');

    // Show chip
    const chip = document.getElementById('selectedChip');
    const chipEmoji = document.getElementById('selectedChipEmoji');
    const chipName = document.getElementById('selectedChipName');
    if (chip) {
      chip.style.display = 'flex';
      chipEmoji.textContent = parent.emoji;
      chipName.textContent = Lang.get(sub.nameKey);
    }

    // Show quantity + mandi sections
    showSection('quantitySection');
    showSection('mandiSection');
    updateCheckPriceVisibility();
  }

  function clearSelection() {
    selectedCrop = null;
    selectedQty = null;
    selectedMandi = null;

    document.querySelectorAll('.crop-sub-item').forEach(el => el.classList.remove('selected'));
    document.getElementById('selectedChip').style.display = 'none';

    hideSection('quantitySection');
    hideSection('mandiSection');
    hideSection('checkPriceSection');
    hideSection('priceResult');
  }

  // ============================
  // QUANTITY SELECTOR
  // ============================
  function initQuantitySelector() {
    const btns = document.querySelectorAll('.qty-btn');
    const customInput = document.getElementById('qtyCustom');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedQty = parseInt(btn.dataset.qty);
        if (customInput) customInput.value = '';
        updateCheckPriceVisibility();
      });
    });

    if (customInput) {
      customInput.addEventListener('input', () => {
        btns.forEach(b => b.classList.remove('selected'));
        const val = parseInt(customInput.value);
        selectedQty = val > 0 ? val : null;
        updateCheckPriceVisibility();
      });
    }
  }

  // ============================
  // MANDI SELECTOR
  // ============================
  function renderMandis() {
    const grid = document.getElementById('mandiGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Auto-detect nearest mandi from farmer's saved location
    const autoMandiId = detectNearestMandi();

    MANDIS.forEach(mandi => {
      const card = document.createElement('div');
      card.className = 'mandi-card' + (mandi.id === autoMandiId ? ' selected' : '');
      card.dataset.mandiId = mandi.id;

      let inner = `
        <span class="mandi-pin">📍</span>
        <span class="mandi-name" data-lang="${mandi.nameKey}">${Lang.get(mandi.nameKey)}</span>
      `;
      if (mandi.id === autoMandiId) {
        inner += `<span class="mandi-auto-tag" data-lang="prices.nearest">Nearest</span>`;
        selectedMandi = mandi.id;
      }

      card.innerHTML = inner;

      card.addEventListener('click', () => {
        grid.querySelectorAll('.mandi-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedMandi = mandi.id;
        updateCheckPriceVisibility();
      });

      grid.appendChild(card);
    });

    updateCheckPriceVisibility();
  }

  function detectNearestMandi() {
    // Try to get farmer's saved GPS location
    try {
      const session = Auth.getSession();
      const farmers = JSON.parse(localStorage.getItem('fps_farmers') || '[]');
      const farmer = farmers.find(f => f.id === session?.id);
      if (farmer?.location) {
        // Simple keyword matching for location
        const loc = farmer.location.toLowerCase();
        if (loc.includes('coimbatore')) return 'coimbatore';
        if (loc.includes('salem')) return 'salem';
        if (loc.includes('madurai')) return 'madurai';
        if (loc.includes('chennai') || loc.includes('koyambedu')) return 'chennai';
        if (loc.includes('trichy') || loc.includes('tiruchirappalli')) return 'trichy';
        if (loc.includes('dindigul')) return 'dindigul';
        if (loc.includes('erode')) return 'erode';
        if (loc.includes('tirunelveli') || loc.includes('nellai')) return 'tirunelveli';
      }
    } catch {}
    // Default
    return 'chennai';
  }

  // ============================
  // CHECK PRICE VISIBILITY
  // ============================
  function updateCheckPriceVisibility() {
    if (selectedCrop && selectedQty && selectedMandi) {
      showSection('checkPriceSection');
    } else {
      hideSection('checkPriceSection');
    }
  }

  // ============================
  // PRICE FETCHING
  // ============================
  async function fetchPrice() {
    if (!selectedCrop || !selectedQty || !selectedMandi) return;

    // Show loading
    const resultDiv = document.getElementById('priceResult');
    showSection('priceResult');
    resultDiv.innerHTML = `
      <div class="price-loading">
        <div class="price-spinner"></div>
        <span data-lang="prices.fetching">${Lang.get('prices.fetching')}</span>
      </div>
    `;

    // Try API first (Agmarknet)
    let priceData = null;
    try {
      priceData = await fetchFromAgmarknet();
    } catch (e) {
      console.log('API failed, using offline data:', e);
    }

    // Fallback to simulated
    if (!priceData) {
      priceData = getPriceForCrop(selectedCrop.parentId, selectedMandi);
      // Show offline banner briefly
      showOfflineBanner();
    }

    // Render result
    await new Promise(r => setTimeout(r, 600)); // Simulate loading
    renderPriceResult(priceData);

    // Mark daily check done
    localStorage.setItem('fps_last_price_check', new Date().toDateString());
  }

  async function fetchFromAgmarknet() {
    // Try Agmarknet API
    const cropName = selectedCrop.parentId.charAt(0).toUpperCase() + selectedCrop.parentId.slice(1);
    const mandiObj = MANDIS.find(m => m.id === selectedMandi);
    const mandiName = mandiObj ? Lang.get(mandiObj.nameKey) : '';

    const API_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${API_KEY}&format=json&limit=5&filters[state]=Tamil%20Nadu&filters[commodity]=${encodeURIComponent(cropName)}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();

    if (data.records && data.records.length > 0) {
      const rec = data.records[0];
      return {
        min: parseInt(rec.min_price) || 0,
        max: parseInt(rec.max_price) || 0,
        modal: parseInt(rec.modal_price) || 0,
        yesterday: PRICE_DATA[selectedCrop.parentId]?.yesterday || 0,
        source: 'api',
        date: rec.arrival_date || new Date().toLocaleDateString(),
      };
    }
    throw new Error('No records found');
  }

  // ============================
  // RENDER PRICE RESULT
  // ============================
  function renderPriceResult(data) {
    const resultDiv = document.getElementById('priceResult');
    showSection('priceResult');

    // Restore the card HTML
    resultDiv.innerHTML = `
      <div class="price-result-card glass-card">
        <div class="result-header">
          <div class="result-crop">
            <span class="result-emoji">${selectedCrop.emoji}</span>
            <div>
              <h3 id="resultCropName">${Lang.get(selectedCrop.parentKey)}</h3>
              <p class="result-variety">${Lang.get(selectedCrop.subKey)}</p>
            </div>
          </div>
          <div class="result-mandi">
            <span class="loc-pin">📍</span>
            <span>${Lang.get(MANDIS.find(m => m.id === selectedMandi)?.nameKey || '')}</span>
          </div>
        </div>

        <div class="result-date">
          <span data-lang="prices.price_date">${Lang.get('prices.price_date')}</span>:
          <span>${data.date || new Date().toLocaleDateString('en-IN')}</span>
        </div>

        <div class="price-cards-row">
          <div class="price-mini-card min-price">
            <div class="price-label" data-lang="prices.min_price">${Lang.get('prices.min_price')}</div>
            <div class="price-val">₹${data.min}</div>
            <div class="price-unit">/kg</div>
          </div>
          <div class="price-mini-card modal-price">
            <div class="price-label" data-lang="prices.modal_price">${Lang.get('prices.modal_price')}</div>
            <div class="price-val price-modal-val">₹${data.modal}</div>
            <div class="price-unit">/kg</div>
          </div>
          <div class="price-mini-card max-price">
            <div class="price-label" data-lang="prices.max_price">${Lang.get('prices.max_price')}</div>
            <div class="price-val">₹${data.max}</div>
            <div class="price-unit">/kg</div>
          </div>
        </div>

        <div class="total-section">
          <div class="total-label" data-lang="prices.total_value">${Lang.get('prices.total_value')}</div>
          <div class="total-calc">
            ${selectedQty} kg × ₹${data.modal} =
            <span class="total-amount">₹${(selectedQty * data.modal).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div class="price-indicator">
          <div class="indicator-bar ${getPriceLevel(data)}"></div>
          <div class="indicator-labels">
            <span class="ind-low" data-lang="prices.below_normal">${Lang.get('prices.below_normal')}</span>
            <span class="ind-avg" data-lang="prices.average">${Lang.get('prices.average')}</span>
            <span class="ind-good" data-lang="prices.good_price">${Lang.get('prices.good_price')}</span>
          </div>
        </div>
      </div>
    `;
  }

  function getPriceLevel(data) {
    const ratio = data.modal / data.max;
    if (ratio >= 0.75) return 'good';
    if (ratio >= 0.5) return 'average';
    return 'low';
  }

  // ============================
  // SUMMARY TABLE
  // ============================
  function renderSummaryTable() {
    const tbody = document.getElementById('summaryBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const mandiId = selectedMandi || 'chennai';

    CROP_DATA.forEach(crop => {
      const price = getPriceForCrop(crop.id, mandiId);
      const trend = getTrend(price.modal, price.yesterday);

      const row = document.createElement('tr');
      if (selectedCrop && selectedCrop.parentId === crop.id) {
        row.classList.add('active');
      }

      row.innerHTML = `
        <td>
          <div class="crop-cell">
            <span class="crop-cell-emoji">${crop.emoji}</span>
            <span data-lang="${crop.nameKey}">${Lang.get(crop.nameKey)}</span>
          </div>
        </td>
        <td>₹${price.min}</td>
        <td>₹${price.max}</td>
        <td class="modal-price-cell">₹${price.modal}</td>
        <td class="${trend.cls}">${trend.arrow}</td>
      `;

      // Click row → select that crop
      row.addEventListener('click', () => {
        // Expand that crop category and select first sub
        const parentEl = document.querySelector(`.crop-parent-name[data-lang="${crop.nameKey}"]`);
        if (parentEl) {
          const parentDiv = parentEl.closest('.crop-parent');
          if (parentDiv) parentDiv.click();
          // Select first sub
          setTimeout(() => {
            const firstSub = parentDiv?.parentElement?.querySelector('.crop-sub-item');
            if (firstSub) firstSub.click();
          }, 100);
        }
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      tbody.appendChild(row);
    });
  }

  function getTrend(modal, yesterday) {
    if (modal > yesterday) return { arrow: '↑ Rising', cls: 'trend-up' };
    if (modal < yesterday) return { arrow: '↓ Falling', cls: 'trend-down' };
    return { arrow: '→ Stable', cls: 'trend-stable' };
  }

  // ============================
  // BANNERS
  // ============================
  function checkMorningRefresh() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 8) {
      const banner = document.getElementById('morningBanner');
      if (banner) banner.style.display = 'flex';
      // Auto-hide after 8 seconds
      setTimeout(() => { if (banner) banner.style.display = 'none'; }, 8000);
    }
  }

  function checkDailyAlert() {
    const lastCheck = localStorage.getItem('fps_last_price_check');
    const today = new Date().toDateString();
    if (lastCheck !== today) {
      const alert = document.getElementById('dailyAlert');
      if (alert) alert.style.display = 'flex';
      const dismiss = document.getElementById('dailyAlertDismiss');
      if (dismiss) {
        dismiss.addEventListener('click', () => { alert.style.display = 'none'; });
      }
    }
  }

  function showOfflineBanner() {
    const banner = document.getElementById('offlineBanner');
    if (banner) {
      banner.style.display = 'flex';
      setTimeout(() => { banner.style.display = 'none'; }, 6000);
    }
  }

  // ============================
  // HELPERS
  // ============================
  function showSection(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  }

  function hideSection(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function navigateTo(url) {
    const transition = document.getElementById('pageTransition');
    if (transition) {
      transition.classList.add('active');
      setTimeout(() => { window.location.href = url; }, 400);
    } else {
      window.location.href = url;
    }
  }

  // ============================
  // SCROLL EFFECT
  // ============================
  function initScrollEffect() {
    const header = document.getElementById('pricesHeader');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 30);
    });
  }

  // ============================
  // INIT
  // ============================
  function init() {
    const session = checkAuth();
    if (!session) return;

    const farmer = getFarmerProfile(session);
    farmerLocation = farmer.location || '';

    // Load language
    const savedLang = Lang.getSaved();
    Lang.load(savedLang).then(() => {
      renderCropList();
      renderMandis();
      renderSummaryTable();
      Lang.applyTranslations();
    });

    initQuantitySelector();
    initScrollEffect();

    // Check Price button
    const btnCheck = document.getElementById('btnCheckPrice');
    if (btnCheck) {
      btnCheck.addEventListener('click', fetchPrice);
    }

    // Clear selection
    const btnClear = document.getElementById('clearSelection');
    if (btnClear) {
      btnClear.addEventListener('click', clearSelection);
    }

    // Navigation
    const btnBack = document.getElementById('btnBack');
    if (btnBack) {
      btnBack.addEventListener('click', () => navigateTo('home.html'));
    }

    const btnDash = document.getElementById('btnDashboard');
    if (btnDash) {
      btnDash.addEventListener('click', () => navigateTo('dashboard.html'));
    }

    // Banners
    checkMorningRefresh();
    checkDailyAlert();
  }

  return { init };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', Prices.init);
