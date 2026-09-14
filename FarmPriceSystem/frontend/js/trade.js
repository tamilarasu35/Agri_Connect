/**
 * FarmPriceSystem — Phase 5: Direct Trade System
 */

const Trade = (() => {

  // ============================
  // CROP IMAGES DATABASE
  // ============================
  const CROP_IMAGES = {
    tomato: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=600&q=80',
    onion: 'https://images.unsplash.com/photo-1618512450570-5bfa8169ff55?auto=format&fit=crop&w=600&q=80',
    rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
    sugarcane: 'https://images.unsplash.com/photo-1593113630400-ea4288922497?auto=format&fit=crop&w=600&q=80',
    cotton: 'https://images.unsplash.com/photo-1594900010619-3351d102e3b2?auto=format&fit=crop&w=600&q=80',
    banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
    mango: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
    potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    chilli: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',
    groundnut: 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?auto=format&fit=crop&w=600&q=80',
    coconut: 'https://images.unsplash.com/photo-1584288079093-55938c82eb5c?auto=format&fit=crop&w=600&q=80',
    turmeric: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
    maize: 'https://images.unsplash.com/photo-1551754625-70c90487530d?auto=format&fit=crop&w=600&q=80',
    carrot: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80',
    beetroot: 'https://images.unsplash.com/photo-1587334206586-be1f4ff68181?auto=format&fit=crop&w=600&q=80',
    radish: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80',
    cabbage: 'https://images.unsplash.com/photo-1582515073490-39981397c445?auto=format&fit=crop&w=600&q=80'
  };

  // ============================
  // MANDI REALISTIC PRICING
  // ============================
  const REAL_PRICE_RANGES = {
    tomato: 16, onion: 13, rice: 31, wheat: 24, sugarcane: 34,
    cotton: 60, banana: 19, mango: 51, potato: 18, chilli: 44,
    groundnut: 52, coconut: 14, turmeric: 91, maize: 22, carrot: 24,
    beetroot: 20, radish: 11, cabbage: 15
  };

  // ============================
  // MOCK DATA (As requested in prompt)
  // ============================
  const LISTINGS = [
    {
      id: "LS-101", cropEmoji: "🍅", cropNameEn: "Tomato", cropNameTa: "Cherry Tomato",
      seller: "Murugan", village: "Palladam", district: "Coimbatore",
      grade: "Grade A", price: 18, minNegPrice: 15, qtyAvailable: 500, harvest: "Tomorrow",
      transport: "Available", payment: "Cash/UPI", pickup: "Farm pickup", organic: false,
      rating: 4.9, orders: 47, verified: true, photo: null, isNew: false
    },
    {
      id: "LS-102", cropEmoji: "🧅", cropNameEn: "Onion", cropNameTa: "Red Onion",
      seller: "Rajan", village: "Erode", district: "Erode District",
      grade: "Grade B", price: 12, minNegPrice: 10, qtyAvailable: 1200, harvest: "Jun 22",
      transport: "Buyer pickup", payment: "Cash/UPI", pickup: "Farm pickup", organic: false,
      rating: 4.6, orders: 23, verified: true, photo: null, isNew: false
    },
    {
      id: "LS-103", cropEmoji: "🌕", cropNameEn: "Turmeric", cropNameTa: "Erode Turmeric",
      seller: "Krishnamurthy", village: "Erode", district: "Erode District",
      grade: "Grade A", price: 85, minNegPrice: 75, qtyAvailable: 200, harvest: "Ready",
      transport: "Buyer pickup", payment: "UPI", pickup: "Farm pickup", organic: true,
      rating: 5.0, orders: 8, verified: true, photo: null, isNew: false
    }
  ];

  const TRANSACTIONS = [
    { crop: "Tomato — 200 kg", emoji: "🍅", buyer: "Annapoorna Hotel, Coimbatore", date: "Mar 15, 2026", txn: "TXN-2026-8841", amount: 3600, status: "Completed", statusClass: "status-completed" },
    { crop: "Onion — 50 kg", emoji: "🧅", buyer: "Annapoorna Hotel, Coimbatore", date: "Mar 18, 2026", txn: "TXN-2026-9102", amount: 600, status: "Pending", statusClass: "status-pending" },
    { crop: "Turmeric — 100 kg", emoji: "🌕", buyer: "Annapoorna Hotel, Coimbatore", date: "Mar 20, 2026", txn: "TXN-2026-9388", amount: 8500, status: "In Progress", statusClass: "status-progress" }
  ];

  // ============================
  // SESSION STATE
  // ============================
  let currentListingPhoto = null;  // Uploaded crop photo (data URL)
  let postedListings = [];          // New listings posted in this session
  let buyerRegistered = false;
  let buyerDetails = null;
  let selectedListingId = null;     // Selected listing ID when opening order/negotiation

  // ============================
  // TAB NAVIGATION
  // ============================
  function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.content-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons and panels
        tabBtns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        // Add active class to clicked button and target panel
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // ============================
  // TOAST NOTIFICATIONS
  // ============================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
      alert(message);
      return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : 'toast-error'}`;
    toast.style.cssText = `
      background: ${type === 'success' ? '#10B981' : '#EF4444'};
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      margin-top: 8px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      animation: slideIn 0.3s ease forwards;
    `;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ============================
  // BUYER REGISTRATION LOGIC
  // ============================
  function loadBuyerSession() {
    const session = localStorage.getItem('fps_buyer_session');
    if (session) {
      try {
        buyerDetails = JSON.parse(session);
        buyerRegistered = true;
      } catch (e) {
        buyerRegistered = false;
        buyerDetails = null;
      }
    }
    updateBuyerUI();
  }

  function updateBuyerUI() {
    const regCards = document.querySelectorAll('#buyerRegistrationCard');
    const summaryChips = document.querySelectorAll('#buyerSummaryChip');

    if (buyerRegistered && buyerDetails) {
      // Fill details in chips
      document.querySelectorAll('#bscName').forEach(el => el.textContent = buyerDetails.name);
      document.querySelectorAll('#bscTypeBadge').forEach(el => el.textContent = buyerDetails.businessType);
      document.querySelectorAll('#bscPhone').forEach(el => el.textContent = buyerDetails.phone);
      document.querySelectorAll('#bscDistrict').forEach(el => el.textContent = buyerDetails.location);
      document.querySelectorAll('#bscAddress').forEach(el => el.textContent = buyerDetails.address);

      regCards.forEach(card => card.classList.add('hidden'));
      summaryChips.forEach(chip => chip.classList.remove('hidden'));
    } else {
      regCards.forEach(card => card.classList.remove('hidden'));
      summaryChips.forEach(chip => chip.classList.add('hidden'));

      // Pre-fill inputs if available
      if (buyerDetails) {
        document.querySelectorAll('#buyerName').forEach(el => el.value = buyerDetails.name || '');
        document.querySelectorAll('#buyerType').forEach(el => el.value = buyerDetails.businessType || 'Retail');
        document.querySelectorAll('#buyerDistrict').forEach(el => el.value = buyerDetails.location || 'Coimbatore');
        document.querySelectorAll('#buyerPhone').forEach(el => el.value = buyerDetails.phone || '');
        document.querySelectorAll('#buyerAddress').forEach(el => el.value = buyerDetails.address || '');
      }
    }
  }

  function setupBuyerRegistration() {
    const btnConfirms = document.querySelectorAll('#btnConfirmBuyerDetails');
    btnConfirms.forEach(btnConfirm => {
      btnConfirm.addEventListener('click', async () => {
        const parent = btnConfirm.closest('#buyerRegistrationCard');
        if (!parent) return;

        const nameInput = parent.querySelector('#buyerName');
        const typeInput = parent.querySelector('#buyerType');
        const districtInput = parent.querySelector('#buyerDistrict');
        const phoneInput = parent.querySelector('#buyerPhone');
        const addressInput = parent.querySelector('#buyerAddress');
        const msgDiv = parent.querySelector('#buyerRegMessage');

        // Reset error styling
        [nameInput, phoneInput, addressInput].forEach(el => el?.classList.remove('shake-alert', 'invalid-input'));
        if (msgDiv) {
          msgDiv.classList.add('hidden');
          msgDiv.className = 'hidden alert-banner';
        }

        const name = nameInput?.value.trim();
        const type = typeInput?.value;
        const district = districtInput?.value;
        const phone = phoneInput?.value.trim();
        const address = addressInput?.value.trim();

        // Validation
        let hasError = false;
        if (!name) { nameInput?.classList.add('invalid-input'); hasError = true; }
        if (!phone || !/^\d{10}$/.test(phone)) { phoneInput?.classList.add('invalid-input'); hasError = true; }
        if (!address) { addressInput?.classList.add('invalid-input'); hasError = true; }

        if (hasError) {
          if (msgDiv) {
            msgDiv.classList.remove('hidden');
            msgDiv.classList.add('red');
            msgDiv.innerHTML = `⚠️ <span data-lang="trade.locked_message">${Lang.get('trade.locked_message') || 'Please fill in all details with a valid 10-digit phone number.'}</span>`;
          }
          parent.classList.add('shake-alert');
          setTimeout(() => parent.classList.remove('shake-alert'), 600);
          return;
        }

        btnConfirm.innerHTML = `⏳ Saving...`;
        btnConfirm.disabled = true;

        try {
          const response = await fetch('/api/buyers/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              phone,
              location: district,
              businessType: type,
              address,
              language: Lang.getCurrent()
            })
          });

          if (!response.ok) throw new Error('API registration failed');
          const resData = await response.json();

          if (resData.success) {
            buyerRegistered = true;
            buyerDetails = { name, phone, location: district, businessType: type, address };
            localStorage.setItem('fps_buyer_session', JSON.stringify(buyerDetails));
            
            updateBuyerUI();
            renderListings();
            showToast(Lang.get('trade.confirm_success') || 'Details confirmed successfully!', 'success');
          } else {
            throw new Error(resData.error || 'Registration failed');
          }
        } catch (err) {
          console.warn('API registration failed, fallback locally:', err.message);
          buyerRegistered = true;
          buyerDetails = { name, phone, location: district, businessType: type, address };
          localStorage.setItem('fps_buyer_session', JSON.stringify(buyerDetails));
          updateBuyerUI();
          renderListings();
          showToast('Details saved locally (Offline fall-back)', 'success');
        } finally {
          btnConfirm.innerHTML = `✅ <span data-lang="trade.btn_confirm_details">${Lang.get('trade.btn_confirm_details') || 'Confirm My Details'}</span>`;
          btnConfirm.disabled = false;
        }
      });
    });

    // Edit button click handlers
    document.querySelectorAll('#btnEditBuyerDetails').forEach(btn => {
      btn.addEventListener('click', () => {
        buyerRegistered = false;
        localStorage.removeItem('fps_buyer_session');
        updateBuyerUI();
        renderListings();
      });
    });
  }

  // ============================
  // DYNAMIC MANDI PRICE FETCHING
  // ============================
  async function updateMandiPriceDisplay() {
    const cropSelect = document.getElementById('farmerCrop');
    const varietyInput = document.getElementById('farmerVariety');
    const container = document.getElementById('mandiPriceDisplayContainer');
    const valEl = document.getElementById('mandiPriceVal');
    const tsEl = document.getElementById('mandiPriceTimestamp');

    if (!cropSelect || !container || !valEl) return;

    const crop = cropSelect.value;
    if (!crop) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    valEl.innerHTML = `<span class="loader" style="width:16px; height:16px; display:inline-block; margin-right:8px;"></span> Fetching market price...`;

    setTimeout(() => {
      const cropLower = crop.toLowerCase();
      const varietyName = varietyInput ? varietyInput.value.trim() : '';
      const basePrice = REAL_PRICE_RANGES[cropLower] || 25;
      const bonus = (varietyName.length % 5);
      const pricePerKg = basePrice + bonus;
      const pricePerQuintal = pricePerKg * 100;

      valEl.dataset.price = pricePerKg; // store for validation

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

      valEl.innerHTML = `₹ ${pricePerKg} / kg <span style="font-size: 0.95rem; font-weight: normal; opacity: 0.8; margin-left: 8px;">(₹ ${pricePerQuintal.toLocaleString('en-IN')} / quintal)</span>`;
      if (tsEl) tsEl.textContent = `Last updated: Today at ${timeStr}, ${dateStr}`;

      // Trigger warning check in case user has already typed a price
      validateNegotiatedPrice();
    }, 450);
  }

  function validateNegotiatedPrice() {
    const priceInput = document.getElementById('farmerPrice');
    const warningEl = document.getElementById('farmerPriceWarning');
    const valEl = document.getElementById('mandiPriceVal');

    if (!priceInput || !warningEl || !valEl) return;

    const userPrice = parseFloat(priceInput.value);
    const mandiPrice = parseFloat(valEl.dataset.price);

    if (!userPrice || isNaN(userPrice) || userPrice <= 0) {
      warningEl.textContent = '';
      warningEl.style.display = 'none';
      return;
    }

    if (mandiPrice && mandiPrice > 0) {
      const diffPercent = Math.abs(userPrice - mandiPrice) / mandiPrice;
      if (diffPercent > 0.20) {
        const direction = userPrice > mandiPrice ? 'above' : 'below';
        warningEl.textContent = `⚠️ Your selling price ₹${userPrice}/kg deviates by ${Math.round(diffPercent * 100)}% ${direction} market rate (₹${mandiPrice}/kg). Check local demand before locking in this price.`;
        warningEl.style.display = 'block';
      } else {
        warningEl.textContent = '';
        warningEl.style.display = 'none';
      }
    } else {
      warningEl.textContent = '';
      warningEl.style.display = 'none';
    }
  }

  // ============================
  // FARMER PANEL LOGIC
  // ============================
  function setupFarmerPanel() {
    const villageInput = document.getElementById('farmerVillage');
    if (villageInput) villageInput.value = "Thondamuthur";
    
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const dateInput = document.getElementById('farmerDate');
    if (dateInput) dateInput.value = tmr.toISOString().split('T')[0];

    // Grade Selection
    const gradeBtns = document.querySelectorAll('.grade-btn');
    gradeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        gradeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Mandi Price bindings
    document.getElementById('farmerCrop')?.addEventListener('change', updateMandiPriceDisplay);
    document.getElementById('farmerVariety')?.addEventListener('input', updateMandiPriceDisplay);
    document.getElementById('farmerPrice')?.addEventListener('input', validateNegotiatedPrice);

    // Post Listing Button
    document.getElementById('btnPostListing')?.addEventListener('click', async () => {
      const cropEl = document.getElementById('farmerCrop');
      if (!cropEl || !cropEl.value) {
        cropEl?.classList.add('shake-alert');
        setTimeout(() => cropEl?.classList.remove('shake-alert'), 600);
        return;
      }
      const priceVal = parseInt(document.getElementById('farmerPrice')?.value);
      if (!priceVal || priceVal < 1) {
        document.getElementById('farmerPrice')?.classList.add('shake-alert');
        setTimeout(() => document.getElementById('farmerPrice')?.classList.remove('shake-alert'), 600);
        showToast('Farmer cannot submit the listing without entering a negotiated price.', 'error');
        return;
      }

      const btn = document.getElementById('btnPostListing');
      const ogHtml = btn.innerHTML;
      btn.innerHTML = `⏳ Posting your listing...`;
      btn.disabled = true;

      // Gather form values
      const cropName = cropEl.options[cropEl.selectedIndex]?.text.split(' — ')[0].replace(/^[^\w]*/, '').trim() || 'Crop';
      const variety  = document.getElementById('farmerVariety')?.value.trim();
      const qty      = parseInt(document.getElementById('farmerQty')?.value) || 100;
      const minNeg   = parseInt(document.getElementById('farmerMinNegPrice')?.value) || Math.round(priceVal * 0.85);
      const grade    = document.querySelector('.grade-btn.active')?.dataset.grade || 'A';
      const district = document.getElementById('farmerDistrict')?.value || 'Coimbatore';
      const village  = document.getElementById('farmerVillage')?.value || '';
      const payment  = document.getElementById('farmerPayment')?.value || 'Cash';
      const harvest  = document.getElementById('farmerDate')?.value || 'Ready';
      const hasTransport = document.getElementById('toggleTransport')?.checked;

      const orderId = "ORD" + Math.floor(100000 + Math.random() * 900000);

      try {
        const postData = {
          order_id: orderId,
          farmer_id: document.getElementById('userName')?.textContent || 'Farmer',
          crop: cropName,
          variety: variety,
          quantity_kg: String(qty),
          price_per_kg: String(priceVal),
          total: String(qty * priceVal),
          mandi: district,
          status: "listed",
          date: harvest,
          grade: "Grade " + grade,
          payment: payment,
          transport: hasTransport ? "Vehicle available" : "Buyer pickup"
        };
        const postResp = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        });
        if (postResp.ok) {
          const res = await postResp.json();
          document.getElementById('listingTxnId').textContent = res.order_id || orderId;
        } else {
          throw new Error('API post failed');
        }
      } catch(e) {
        console.warn('Listing post API failed, using memory fallback:', e.message);
        document.getElementById('listingTxnId').textContent = orderId;
      }

      // Local state fallback update
      const EMOJI_MAP = {
        Tomato:'🍅', Onion:'🧅', Rice:'🌾', Wheat:'🌿', Sugarcane:'🎋',
        Cotton:'☁️', Banana:'🍌', Mango:'🥭', Potato:'🥔', Chilli:'🌶️',
        Groundnut:'🥜', Coconut:'🥥', Turmeric:'🌕', Maize:'🌽'
      };
      const cropEmoji = EMOJI_MAP[cropEl.value] || '🌱';

      const newListing = {
        id: orderId,
        cropEmoji,
        cropNameEn: cropName,
        cropNameTa: variety || '',
        seller: document.getElementById('userName')?.textContent || 'Farmer',
        village, district,
        grade: `Grade ${grade}`,
        price: priceVal,
        minNegPrice: minNeg,
        qtyAvailable: qty,
        harvest,
        transport: hasTransport ? 'Vehicle available' : 'Buyer pickup',
        payment,
        pickup: 'Farm pickup',
        organic: false,
        rating: 5.0,
        orders: 0,
        verified: true,
        photo: currentListingPhoto,
        isNew: true
      };
      // Save custom photo to local storage under orderId
      if (currentListingPhoto) {
        try {
          const photos = JSON.parse(localStorage.getItem('fps_custom_photos') || '{}');
          photos[orderId] = currentListingPhoto;
          localStorage.setItem('fps_custom_photos', JSON.stringify(photos));
        } catch (e) {
          console.warn('Failed to save photo to local cache:', e);
        }
      }

      postedListings.unshift(newListing);

      btn.innerHTML = ogHtml;
      btn.disabled = false;

      // Show success banner
      document.getElementById('listingSuccess').classList.remove('hidden');
      document.getElementById('listingSuccess').scrollIntoView({ behavior: 'smooth' });

      // Clear farmer inputs
      document.getElementById('farmerVariety').value = '';
      document.getElementById('farmerQty').value = '';
      document.getElementById('farmerPrice').value = '';
      document.getElementById('farmerMinNegPrice').value = '';
      const displayContainer = document.getElementById('mandiPriceDisplayContainer');
      if (displayContainer) displayContainer.style.display = 'none';

      // Clear the uploaded photo preview
      document.querySelectorAll('#btnRemovePhoto').forEach(removeBtn => removeBtn.click());

      // After 2.5 s switch to Buyer panel so farmer sees their live listing
      setTimeout(async () => {
        const buyerTabBtn = document.querySelector('[data-target="buyerPanel"]');
        if (buyerTabBtn) {
          buyerTabBtn.click();
          await loadAllData();
          setTimeout(() => {
            document.getElementById('liveListings')?.scrollIntoView({ behavior: 'smooth' });
          }, 350);
        }
      }, 2500);
    });
  }

  // ============================
  // DATA LOADER (LISTINGS + TRANSACTIONS)
  // ============================
  async function loadAllData() {
    // Fetch custom photos mapping from localStorage
    let customPhotos = {};
    try {
      customPhotos = JSON.parse(localStorage.getItem('fps_custom_photos') || '{}');
    } catch(e) {}

    // 1. Fetch Listings from /api/orders
    let serverListings = [];
    try {
      const resp = await fetch('/api/orders');
      if (resp.ok) {
        const data = await resp.json();
        serverListings = data.filter(item => item.status === 'listed').map(item => {
          const EMOJI_MAP = {
            tomato:'🍅', onion:'🧅', rice:'🌾', wheat:'🌿', sugarcane:'🎋',
            cotton:'☁️', banana:'🍌', mango:'🥭', potato:'🥔', chilli:'🌶️',
            groundnut:'🥜', coconut:'🥥', turmeric:'🌕', maize:'🌽'
          };
          const cropLower = (item.crop || '').toLowerCase();
          const cropEmoji = EMOJI_MAP[cropLower] || '🌱';
          const priceVal = parseInt(item.price_per_kg) || 0;
          return {
            id: item.order_id,
            cropEmoji,
            cropNameEn: item.crop,
            cropNameTa: item.variety || '',
            seller: item.farmer_id || 'Farmer',
            village: item.mandi || '',
            district: item.mandi || '',
            grade: item.grade || 'Grade A',
            price: priceVal,
            minNegPrice: Math.round(priceVal * 0.85),
            qtyAvailable: parseInt(item.quantity_kg) || 0,
            harvest: item.date || 'Ready',
            transport: item.transport || 'Buyer pickup',
            payment: item.payment || 'Cash/UPI',
            pickup: 'Farm pickup',
            organic: false,
            rating: 4.8,
            orders: 12,
            verified: true,
            photo: customPhotos[item.order_id] || null,
            isNew: false
          };
        });
      }
    } catch(e) {
      console.warn('API listings fetch error:', e.message);
    }

    // 2. Fetch Transactions from /api/orders
    let serverTransactions = [];
    try {
      const resp = await fetch('/api/orders');
      if (resp.ok) {
        const data = await resp.json();
        serverTransactions = data.filter(item => item.status !== 'listed').map(item => {
          const EMOJI_MAP = {
            tomato:'🍅', onion:'🧅', rice:'🌾', wheat:'🌿', sugarcane:'🎋',
            cotton:'☁️', banana:'🍌', mango:'🥭', potato:'🥔', chilli:'🌶️',
            groundnut:'🥜', coconut:'🥥', turmeric:'🌕', maize:'🌽'
          };
          const cropLower = (item.crop || '').toLowerCase();
          const cropEmoji = EMOJI_MAP[cropLower] || '🌱';
          const priceVal = parseInt(item.price_per_kg) || 0;
          const qtyVal = parseInt(item.quantity_kg) || 0;
          const totalVal = parseInt(item.total) || (priceVal * qtyVal);
          
          let statusClass = 'status-progress';
          if (item.status === 'completed') statusClass = 'status-completed';
          if (item.status === 'pending') statusClass = 'status-pending';
          if (item.status === 'cancelled') statusClass = 'status-cancelled';
          
          return {
            txn: item.order_id,
            crop: `${item.crop} — ${item.quantity_kg} kg`,
            emoji: cropEmoji,
            cropCategory: item.crop,
            cropVariety: item.variety,
            qty: qtyVal,
            price: priceVal,
            amount: totalVal,
            mandi: item.mandi,
            buyerId: item.buyer_id || 'B-9988',
            buyerName: item.buyer_id === (buyerDetails?.phone) ? buyerDetails.name : 'Registered Buyer',
            farmerId: item.farmer_id || 'F-10224',
            farmerName: item.farmer_id || 'Murugan',
            grade: item.grade || 'Grade A',
            payment: item.payment || 'Cash',
            transport: item.transport || 'Buyer pickup',
            status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
            statusClass: statusClass,
            date: item.date,
            photo: customPhotos[item.order_id] || null,
            otp: (Math.abs(item.order_id.split('').reduce((h,c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 5842)) % 9000 + 1000)
          };
        });
      }
    } catch(e) {
      console.warn('API transactions fetch error:', e.message);
    }

    renderListings(serverListings);
    renderTransactions(serverTransactions);
  }

  // ============================
  // BUYER PANEL (LISTINGS RENDER)
  // ============================
  function renderListings(serverListings = []) {
    const grid = document.getElementById('liveListings');
    if (!grid) return;
    grid.innerHTML = '';

    // Deduplicate listings preferring local postedListings over serverListings
    const seenIds = new Set();
    const allListings = [];
    postedListings.forEach(item => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allListings.push(item);
      }
    });
    serverListings.forEach(item => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allListings.push(item);
      }
    });

    const finalListings = allListings.length > 0 ? allListings : LISTINGS;

    finalListings.forEach((item, idx) => {
      const displayCrop = item.cropNameTa
        ? `${item.cropNameEn} — ${item.cropNameTa}`
        : item.cropNameEn;
      const organicStr = item.organic ? '<span class="organic-tag">🌿 Organic</span>' : '';

      // Photo banner (real photo or large emoji banner)
      const photoBanner = item.photo
        ? `<div class="lc-photo-banner">
             <img src="${item.photo}" alt="${item.cropNameEn}" class="lc-photo-img">
             ${item.isNew ? '<span class="lc-new-badge">✨ Your Listing — Just Posted!</span>' : ''}
           </div>`
        : item.isNew
          ? `<div class="lc-emoji-banner lc-new-banner">
               <span class="lc-banner-emoji">${item.cropEmoji}</span>
               <span class="lc-new-badge inline">✨ Your Listing — Just Posted!</span>
             </div>`
          : '';

      const minNegRow = item.minNegPrice
        ? `<div class="lc-neg-row">🤝 Min. Negotiation: <strong>₹${item.minNegPrice}/kg</strong></div>`
        : '';

      const lockClass = !buyerRegistered ? ' btn-locked' : '';

      const card = document.createElement('div');
      card.className = 'listing-card' + (item.isNew ? ' lc-is-new' : '');
      card.style.animationDelay = `${idx * 0.07}s`;
      card.innerHTML = `
        ${photoBanner}
        <div class="lc-top">
          <div class="lc-top-left">
            <div class="lc-emoji-box">${item.cropEmoji}</div>
            <div>
              <h4 class="lc-title">${displayCrop}</h4>
              <div class="lc-seller-info">
                ${item.seller}${item.village ? ', ' + item.village : ''} • ${item.district} |
                <span class="lc-status">● Live</span> |
                <span class="lc-grade">${item.grade}</span>
              </div>
            </div>
          </div>
          <div class="lc-top-right">
            <div class="lc-price">₹${item.price}</div>
            <div class="lc-per-kg">per kg</div>
          </div>
        </div>

        ${minNegRow}

        <div class="lc-middle">
          <div class="lc-detail-item">Available <strong>${item.qtyAvailable} kg</strong></div>
          <div class="lc-detail-item">Harvest <strong>${item.harvest}</strong></div>
          <div class="lc-detail-item">Transport / Payment
            <strong>${item.transport} / ${item.payment}</strong>
            <span style="display:block;font-size:0.75rem;margin-top:2px">${item.pickup} ${organicStr}</span>
          </div>
        </div>

        <div class="lc-footer">
          <div class="lc-trust-info">
            <div>
              <span class="stars">★★★★★</span>
              <span class="reviews">${item.rating}★ (${item.orders} orders)</span>
            </div>
            <div class="csc-badge">🏛️ CSC Verified</div>
          </div>
          <div class="lc-actions">
            <button class="btn-neg${lockClass}" onclick="Trade.openNegotiate('${item.id}', '${item.seller.replace(/'/g, "\\'")}', ${item.price}, ${item.minNegPrice || 0}, ${item.photo ? `'${item.photo}'` : 'null'}, '${item.cropEmoji}', '${item.cropNameEn.replace(/'/g, "\\'")}')">💬 Negotiate</button>
            <button class="btn-order${lockClass}" onclick="Trade.openOrder('${item.id}', '${item.cropNameEn.replace(/'/g, "\\'")}', '${item.seller.replace(/'/g, "\\'")}', ${item.price}, ${item.photo ? `'${item.photo}'` : 'null'}, '${item.cropEmoji}')">Order →</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // Filter Chips
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        grid.style.opacity = '0';
        setTimeout(() => { grid.style.opacity = '1'; }, 300);
      });
    });
  }

  // ============================
  // PHOTO UPLOAD
  // ============================
  function setupPhotoUpload() {
    const zone        = document.getElementById('photoUploadZone');
    const input       = document.getElementById('cropPhotoInput');
    const preview     = document.getElementById('cropPhotoPreview');
    const placeholder = document.getElementById('photoPlaceholder');
    const removeBtn   = document.getElementById('btnRemovePhoto');
    if (!zone || !input) return;

    zone.addEventListener('click', (e) => {
      if (e.target !== removeBtn) input.click();
    });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) processFile(file);
    });
    input.addEventListener('change', () => {
      if (input.files[0]) processFile(input.files[0]);
    });
    removeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      currentListingPhoto = null;
      if (preview)     { preview.style.display = 'none'; preview.src = ''; }
      if (placeholder) placeholder.style.display = 'flex';
      if (removeBtn)   removeBtn.style.display = 'none';
      zone.classList.remove('has-photo');
      input.value = '';
    });

    function cropTo54(dataUrl, callback) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetRatio = 5 / 4;
        const originalRatio = img.width / img.height;
        let sourceX = 0, sourceY = 0;
        let sourceWidth = img.width, sourceHeight = img.height;
        if (originalRatio > targetRatio) {
          sourceWidth = img.height * targetRatio;
          sourceX = (img.width - sourceWidth) / 2;
        } else if (originalRatio < targetRatio) {
          sourceHeight = img.width / targetRatio;
          sourceY = (img.height - sourceHeight) / 2;
        }
        const targetWidth = Math.min(800, sourceWidth);
        const targetHeight = targetWidth / targetRatio;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
        callback(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    }

    function processFile(file) {
      if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5MB.'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        cropTo54(ev.target.result, (croppedDataUrl) => {
          currentListingPhoto = croppedDataUrl;
          if (preview) { preview.src = currentListingPhoto; preview.style.display = 'block'; }
          if (placeholder) placeholder.style.display = 'none';
          if (removeBtn)   removeBtn.style.display = 'inline-flex';
          zone.classList.add('has-photo');
        });
      };
      reader.readAsDataURL(file);
    }
  }

  // ============================
  // MY ORDERS LOGIC
  // ============================
  function renderTransactions(serverTransactions = []) {
    const list = document.getElementById('txHistoryList');
    if (!list) return;
    list.innerHTML = '';

    const allTx = serverTransactions.length > 0 ? serverTransactions : TRANSACTIONS.map(tx => {
      return {
        ...tx,
        cropCategory: tx.crop.split(' — ')[0],
        cropVariety: 'Standard',
        qty: parseInt(tx.crop.replace(/\D/g, '')) || 100,
        price: Math.round(tx.amount / (parseInt(tx.crop.replace(/\D/g, '')) || 100)),
        mandi: 'Coimbatore District',
        buyerId: 'B-9988',
        buyerName: tx.buyer.split(',')[0],
        farmerId: 'F-10224',
        farmerName: 'Murugan M.',
        grade: 'Grade A',
        payment: 'UPI/Cash',
        transport: 'Farmer delivers',
        otp: 4821
      };
    });

    allTx.forEach(tx => {
      const card = document.createElement('div');
      card.className = 'tx-card';
      card.style.display = 'block';

      // Determine correct photo (uploaded or high quality Unsplash)
      const photoUrl = tx.photo || CROP_IMAGES[tx.cropCategory.toLowerCase()] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=150&q=80';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap: 16px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <img src="${photoUrl}" alt="${tx.cropCategory}" style="width:65px; aspect-ratio:5/4; object-fit:cover; border-radius:8px; border:1px solid rgba(0,0,0,0.1);">
            <div class="tx-left">
              <h4 style="margin:0; font-size:1.1rem; color:#fff;">${tx.emoji} ${tx.crop}</h4>
              <p style="margin:4px 0; color:var(--text-secondary); font-size:0.85rem;">${tx.buyerName} • ${tx.date}</p>
              <span class="tx-txn">${tx.txn}</span>
            </div>
          </div>
          <div class="tx-right" style="text-align:right;">
            <strong class="tx-price" style="display:block; font-size:1.2rem; color:var(--color-good);">₹${tx.amount.toLocaleString('en-IN')}</strong>
            <span class="badge-status ${tx.statusClass}" style="display:inline-block; margin-top:4px;">[${tx.status === 'Completed' ? '✓' : tx.status === 'Pending' ? '⏳' : '●'} ${tx.status}]</span>
          </div>
        </div>
        <div style="margin-top:12px; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px; display:flex; justify-content:flex-end;">
          <button class="btn-view-details" style="background:none; border:none; color:var(--saffron); font-weight:600; cursor:pointer; font-size:0.85rem;" onclick="Trade.toggleReceiptDetails('${tx.txn}')">
            View Details <span id="arrow-${tx.txn}">↓</span>
          </button>
        </div>
        <div id="receipt-details-${tx.txn}" class="hidden" style="margin-top:12px;">
          <div id="receipt-content-${tx.txn}">
            <div class="receipt-box" style="border:2px dashed rgba(255,255,255,0.15); padding:16px; border-radius:8px; background:rgba(0,0,0,0.25); font-family:Courier, monospace; font-size:0.85rem; color:#fff; line-height:1.4;">
              <div style="text-align:center; margin-bottom:12px;">
                <img src="${photoUrl}" alt="${tx.cropCategory}" style="width:100%; aspect-ratio:5/4; object-fit:cover; border-radius:6px; border:1px solid rgba(255,255,255,0.15);">
              </div>
              <div style="text-align:center; font-weight:bold; font-size:1.05rem; border-bottom:1px dashed rgba(255,255,255,0.15); padding-bottom:8px; margin-bottom:12px; color:var(--saffron)">
                AGRICONNECT RECEIPT / அக்ரிகனெக்ட் ரசீது
              </div>
              <table style="width:100%; border-collapse:collapse; margin-bottom:10px;">
                <tr><td style="padding:2px 0;"><b>Transaction ID:</b></td><td style="text-align:right;">${tx.txn}</td></tr>
                <tr><td style="padding:2px 0;"><b>Transaction Date:</b></td><td style="text-align:right;">${tx.date}</td></tr>
                <tr><td style="padding:2px 0;"><b>Farmer ID:</b></td><td style="text-align:right;">${tx.farmerId}</td></tr>
                <tr><td style="padding:2px 0;"><b>Farmer Name:</b></td><td style="text-align:right;">${tx.farmerName}</td></tr>
                <tr><td style="padding:2px 0;"><b>Farmer Rating:</b></td><td style="text-align:right;">⭐️ 4.9 (Verified)</td></tr>
                <tr><td style="padding:2px 0;"><b>CSC Status:</b></td><td style="text-align:right; color:var(--color-good)">🏛️ Verified CSC</td></tr>
                <tr style="border-top:1px dashed rgba(255,255,255,0.1);"><td colspan="2" style="height:6px;"></td></tr>
                <tr><td style="padding:2px 0;"><b>Buyer ID:</b></td><td style="text-align:right;">${tx.buyerId}</td></tr>
                <tr><td style="padding:2px 0;"><b>Buyer Name:</b></td><td style="text-align:right;">${tx.buyerName}</td></tr>
                <tr><td style="padding:2px 0;"><b>Crop Category:</b></td><td style="text-align:right;">${tx.cropCategory}</td></tr>
                <tr><td style="padding:2px 0;"><b>Crop Variety:</b></td><td style="text-align:right;">${tx.cropVariety || 'Standard'}</td></tr>
                <tr><td style="padding:2px 0;"><b>Crop Grade:</b></td><td style="text-align:right;">${tx.grade}</td></tr>
                <tr><td style="padding:2px 0;"><b>Quantity:</b></td><td style="text-align:right;">${tx.qty} kg</td></tr>
                <tr><td style="padding:2px 0;"><b>Price per kg (Negotiated):</b></td><td style="text-align:right; font-weight:bold;">₹${tx.price}/kg</td></tr>
                <tr><td style="padding:2px 0;"><b>Total Amount:</b></td><td style="text-align:right; font-weight:bold; color:var(--color-good)">₹${tx.amount.toLocaleString('en-IN')}</td></tr>
                <tr><td style="padding:2px 0;"><b>Mandi Location:</b></td><td style="text-align:right;">${tx.mandi}</td></tr>
                <tr><td style="padding:2px 0;"><b>Payment Mode:</b></td><td style="text-align:right;">${tx.payment}</td></tr>
                <tr><td style="padding:2px 0;"><b>Logistics:</b></td><td style="text-align:right;">${tx.transport}</td></tr>
                <tr><td style="padding:2px 0;"><b>Order Status:</b></td><td style="text-align:right; text-transform:uppercase;">${tx.status}</td></tr>
              </table>
              <div style="text-align:center; margin-top:12px; border-top:1px dashed rgba(255,255,255,0.15); padding-top:8px;">
                <div style="font-size:0.75rem; letter-spacing:4px; font-weight:bold; opacity:0.7;">|||||||||||||||||||||||||||||||||||||||</div>
                <div style="font-size:0.85rem; color:var(--saffron); font-weight:bold; margin-top:6px;">🔒 OTP Verification Code: ${tx.otp}</div>
                <div style="font-size:0.75rem; opacity:0.6; margin-top:4px;">(Provide OTP to farmer only upon successful delivery validation)</div>
              </div>
            </div>
          </div>
          <div style="display:flex; gap:10px; margin-top:12px; justify-content:center;">
            <button class="btn-outline-full" style="width:auto; padding:6px 12px; font-size:0.8rem; margin:0;" onclick="Trade.printReceipt('${tx.txn}')">🖨️ Print</button>
            <button class="btn-outline-full" style="width:auto; padding:6px 12px; font-size:0.8rem; margin:0;" onclick="Trade.downloadReceipt('${tx.txn}')">📥 Download</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  function toggleReceiptDetails(txnId) {
    const el = document.getElementById(`receipt-details-${txnId}`);
    const arrow = document.getElementById(`arrow-${txnId}`);
    if (el) {
      const isHidden = el.classList.contains('hidden');
      if (isHidden) {
        el.classList.remove('hidden');
        if (arrow) arrow.textContent = '↑';
      } else {
        el.classList.add('hidden');
        if (arrow) arrow.textContent = '↓';
      }
    }
  }

  function printReceipt(txnId) {
    const receiptContent = document.getElementById(`receipt-content-${txnId}`).innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Receipt</title><style>body{font-family:monospace;padding:20px;color:#000;background:#fff;}table{width:100%;}</style></head><body>');
      printWindow.document.write(receiptContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }

  function downloadReceipt(txnId) {
    const element = document.getElementById(`receipt-content-${txnId}`);
    if (!element) return;
    const text = element.innerText;
    const blob = new Blob([text], { type: 'text/plain; charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.download = `Receipt-${txnId}.txt`;
    anchor.href = window.URL.createObjectURL(blob);
    anchor.click();
    window.URL.revokeObjectURL(anchor.href);
  }

  // ============================
  // MODALS LOGIC
  // ============================
  let currentModalPrice = 0;

  function setCloseHandlers() {
    document.querySelectorAll('.btn-close-modal, .btn-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
      });
    });
  }

  function openOrder(listingId, cropName, farmerName, price, photoUrl, cropEmoji) {
    if (!buyerRegistered) {
      showToast(Lang.get('trade.locked_message') || 'Please register and confirm your details to Order.', 'error');
      const card = document.getElementById('buyerRegistrationCard');
      if (card) {
        document.querySelector('[data-target="buyerPanel"]')?.click();
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('shake-alert');
        setTimeout(() => card.classList.remove('shake-alert'), 600);
      }
      return;
    }

    selectedListingId = listingId;
    document.getElementById('moCropName').textContent = cropName;
    document.getElementById('moFarmerName').textContent = "Seller: " + farmerName;
    document.getElementById('moPrice').value = price;
    document.getElementById('moQty').value = "";
    document.getElementById('moTotal').textContent = "₹0";
    currentModalPrice = price;

    // Display photo or fallback emoji banner
    const photoContainer = document.getElementById('moPhotoContainer');
    if (photoContainer) {
      if (photoUrl) {
        photoContainer.innerHTML = `<img src="${photoUrl}" alt="${cropName}" style="width:100%; aspect-ratio:5/4; object-fit:cover; border-radius:10px; margin-bottom:16px; border: 1px solid rgba(255,255,255,0.1);">`;
      } else {
        const defaultPhoto = CROP_IMAGES[cropName.toLowerCase()] || '';
        if (defaultPhoto) {
          photoContainer.innerHTML = `<img src="${defaultPhoto}" alt="${cropName}" style="width:100%; aspect-ratio:5/4; object-fit:cover; border-radius:10px; margin-bottom:16px; border: 1px solid rgba(255,255,255,0.1);">`;
        } else {
          photoContainer.innerHTML = `<div style="width:100%; height:90px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; margin-bottom:16px; font-size:3rem;">${cropEmoji || '🌱'}</div>`;
        }
      }
    }

    document.getElementById('orderModal').classList.remove('hidden');
  }

  function openNegotiate(listingId, farmerName, price, minNegPrice, photoUrl, cropEmoji, cropNameEn) {
    if (!buyerRegistered) {
      showToast(Lang.get('trade.locked_message') || 'Please register and confirm your details to Negotiate.', 'error');
      const card = document.getElementById('buyerRegistrationCard');
      if (card) {
        document.querySelector('[data-target="buyerPanel"]')?.click();
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('shake-alert');
        setTimeout(() => card.classList.remove('shake-alert'), 600);
      }
      return;
    }

    selectedListingId = listingId;
    document.getElementById('mnCurrentPrice').textContent = price;
    document.getElementById('mnCounterPrice').value = '';
    document.getElementById('mnNote').value = '';

    // Show / update min negotiation floor
    const minEl = document.getElementById('mnMinFloor');
    if (minEl) {
      if (minNegPrice && minNegPrice > 0) {
        minEl.textContent = `₹${minNegPrice}/kg`;
        minEl.closest('.mn-floor-row')?.style.removeProperty('display');
      } else {
        minEl.closest('.mn-floor-row')?.style.setProperty('display', 'none');
      }
    }

    // Display photo or fallback emoji banner
    const photoContainer = document.getElementById('mnPhotoContainer');
    if (photoContainer) {
      const displayTitle = cropNameEn ? `${cropNameEn} (${farmerName})` : farmerName;
      if (photoUrl) {
        photoContainer.innerHTML = `
          <div style="margin-bottom:16px;">
            <img src="${photoUrl}" alt="${displayTitle}" style="width:100%; aspect-ratio:5/4; object-fit:cover; border-radius:10px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size:0.9rem; color:var(--text-secondary); margin-top:6px; font-weight:600; text-align:center;">${displayTitle}</div>
          </div>`;
      } else {
        const defaultPhoto = CROP_IMAGES[cropNameEn.toLowerCase()] || '';
        if (defaultPhoto) {
          photoContainer.innerHTML = `
            <div style="margin-bottom:16px;">
              <img src="${defaultPhoto}" alt="${displayTitle}" style="width:100%; aspect-ratio:5/4; object-fit:cover; border-radius:10px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="font-size:0.9rem; color:var(--text-secondary); margin-top:6px; font-weight:600; text-align:center;">${displayTitle}</div>
            </div>`;
        } else {
          photoContainer.innerHTML = `
            <div style="margin-bottom:16px;">
              <div style="width:100%; height:90px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; font-size:3rem;">${cropEmoji || '🌱'}</div>
              <div style="font-size:0.9rem; color:var(--text-secondary); margin-top:6px; font-weight:600; text-align:center;">${displayTitle}</div>
            </div>`;
        }
      }
    }

    document.getElementById('negotiateModal').classList.remove('hidden');
  }

  function attachLiveCalculators() {
    const qtyInput = document.getElementById('moQty');
    const priceInput = document.getElementById('moPrice');
    const totalEl = document.getElementById('moTotal');

    const calc = () => {
      const q = parseInt(qtyInput.value) || 0;
      const p = parseInt(priceInput.value) || 0;
      totalEl.textContent = `₹${(q * p).toLocaleString('en-IN')}`;
    };

    qtyInput?.addEventListener('input', calc);
    priceInput?.addEventListener('input', calc);

    // Confirm Order Event
    const btnConfirmOrder = document.getElementById('btnConfirmOrder');
    if (btnConfirmOrder) {
      btnConfirmOrder.addEventListener('click', async () => {
        if (!buyerRegistered) {
          showToast('Please confirm your buyer details first!', 'error');
          return;
        }

        const orderId = selectedListingId;
        const buyerId = buyerDetails ? buyerDetails.phone : 'AnonymousBuyer';

        btnConfirmOrder.disabled = true;
        btnConfirmOrder.innerHTML = `⏳ Ordering...`;

        try {
          const resp = await fetch('/api/orders/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: orderId,
              status: 'pending',
              buyer_id: buyerId
            })
          });

          if (!resp.ok) throw new Error('API order update failed');
          const data = await resp.json();

          if (data.success) {
            document.getElementById('orderModal').classList.add('hidden');
            document.getElementById('orderTxnId').textContent = orderId;
            document.getElementById('orderSuccessModal').classList.remove('hidden');
            
            await loadAllData();
          } else {
            throw new Error(data.error || 'API call failed');
          }
        } catch (e) {
          console.warn('API order update failed, fallback locally:', e.message);
          document.getElementById('orderModal').classList.add('hidden');
          document.getElementById('orderTxnId').textContent = orderId || `TXN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
          document.getElementById('orderSuccessModal').classList.remove('hidden');

          // Local mock sync
          const matchedListing = LISTINGS.find(item => item.id === orderId);
          if (matchedListing) {
            TRANSACTIONS.unshift({
              crop: `${matchedListing.cropNameEn} — ${matchedListing.qtyAvailable} kg`,
              emoji: matchedListing.cropEmoji,
              buyer: buyerDetails.name,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              txn: orderId,
              amount: matchedListing.qtyAvailable * matchedListing.price,
              status: "Pending",
              statusClass: "status-pending"
            });
          }
          renderTransactions();
        } finally {
          btnConfirmOrder.disabled = false;
          btnConfirmOrder.innerHTML = `✅ <span data-lang="trade.btn_confirm_order">${Lang.get('trade.btn_confirm_order') || 'Confirm Order'}</span>`;
        }
      });
    }

    // Send Offer Event
    document.getElementById('btnSendOffer')?.addEventListener('click', () => {
      const priceVal = parseInt(document.getElementById('mnCounterPrice').value);
      if (!priceVal) {
        alert("Please enter a counter price.");
        return;
      }
      alert(`முன்மொழிவு அனுப்பப்பட்டது! Counter offer of ₹${priceVal}/kg sent to farmer. They will respond within 2 hours.`);
      document.getElementById('negotiateModal').classList.add('hidden');
    });
  }

  // ============================
  // INIT
  // ============================
  async function init() {
    const savedLang = typeof Lang !== 'undefined' ? Lang.getSaved() : 'english';
    if (window.Lang && typeof Lang.load === 'function') {
      await Lang.load(savedLang);
    }

    setupTabs();
    setupFarmerPanel();
    setupPhotoUpload();
    await loadAllData();
    setCloseHandlers();
    attachLiveCalculators();

    // Auth display name bindings
    try {
      const activeUser = (typeof Auth !== 'undefined' && typeof Auth.getActiveUser === 'function')
        ? Auth.getActiveUser() : null;
      if (activeUser) {
        const nameEl = document.getElementById('userName');
        const avatarEl = document.getElementById('userAvatar');
        const tNameEl = document.getElementById('tradeUserName');
        const tAvatarEl = document.getElementById('tradeUserAvatar');
        if (nameEl) nameEl.textContent = activeUser.name;
        if (avatarEl) avatarEl.textContent = activeUser.name.substring(0,2).toUpperCase();
        if (tNameEl) tNameEl.textContent = activeUser.name;
        if (tAvatarEl) tAvatarEl.textContent = activeUser.name.substring(0,2).toUpperCase();
      }
    } catch(e) {
      console.warn('Auth not available:', e.message);
    }

    // Pre-fill form from URL params (coming from prices page)
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCrop  = params.get('crop');
      const urlPrice = params.get('price');
      const urlMandi = params.get('mandi');

      if (urlCrop) {
        const sel = document.getElementById('farmerCrop');
        if (sel) {
          [...sel.options].forEach(o => {
            if (o.value.toLowerCase() === urlCrop.toLowerCase()) sel.value = o.value;
          });
        }
      }
      if (urlPrice) {
        const pi = document.getElementById('farmerPrice');
        if (pi) pi.value = urlPrice;
        // Suggest min negotiation as 85% of selling price
        const mn = document.getElementById('farmerMinNegPrice');
        if (mn && !mn.value) mn.value = Math.round(parseInt(urlPrice) * 0.85);
      }
      if (urlMandi) {
        const dist = document.getElementById('farmerDistrict');
        if (dist) {
          [...dist.options].forEach(o => {
            if (o.value.toLowerCase() === urlMandi.toLowerCase()) dist.value = o.value;
          });
        }
      }

      // If ?view=orders open the orders tab directly
      if (params.get('view') === 'orders') {
        document.querySelector('[data-target="ordersPanel"]')?.click();
      }
    } catch(e) { /* ignore url param errors */ }

    if (window.Lang && typeof Lang.applyTranslations === 'function') {
      Lang.applyTranslations();
    }
  }

  return { 
    init,
    openOrder,
    openNegotiate,
    toggleReceiptDetails,
    printReceipt,
    downloadReceipt
  };
})();

document.addEventListener('DOMContentLoaded', Trade.init);
