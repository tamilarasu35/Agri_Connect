/**
 * AgriConnect Companion — Interactive Script Module
 * Controls live interactive features, OTP simulation, category filters,
 * APMC rate updates, carousel navigation, and language sync.
 */

document.addEventListener('DOMContentLoaded', () => {
  syncGlobalUserProfile();
  initLanguageSwitcher();
  initOtpSimulation();
  initCategoryFilters();
  initAPMCTableSort();
  initCommunityPriceSubmit();
  initCropCarouselScroll();
  initLiveTickerUpdate();
});

function syncGlobalUserProfile() {
  try {
    let session = null;
    if (window.Auth && typeof window.Auth.getSession === 'function') {
      session = window.Auth.getSession();
    }
    if (!session) {
      try { session = JSON.parse(localStorage.getItem('fps_session')); } catch(e){}
    }
    const name = (session && session.name) || localStorage.getItem('agriconnect_farmer_name') || 'Tamilarasu';
    const location = (session && session.location) || localStorage.getItem('agriconnect_farmer_location') || 'மதுரை, வாடிப்பட்டி';
    const phone = (session && session.phone) || localStorage.getItem('agriconnect_farmer_phone') || '9876543210';

    const words = name.trim().split(/\s+/);
    let initials = 'SS';
    if (words.length >= 2) {
      initials = (words[0][0] + words[words.length - 1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length > 0) {
      initials = words[0].substring(0, 2).toUpperCase();
    }

    // 1. Header widget
    document.querySelectorAll('.user-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.user-role').forEach(el => el.textContent = `${location} • Certified Producer`);
    document.querySelectorAll('.avatar-circle').forEach(el => el.textContent = initials);

    // 2. Greeting headings
    const mainHeading = document.querySelector('.greeting-main-heading');
    if (mainHeading) mainHeading.innerHTML = `Good Morning, ${name} 👨‍🌾`;

    const subLoc = document.querySelector('.greeting-meta-strip span:first-child');
    if (subLoc) subLoc.textContent = `📍 ${location}`;

    // 3. Certified Producer Dossier
    const dossierAvatar = document.getElementById('dossierAvatar') || document.querySelector('.dossier-farmer-row .avatar-circle');
    const dossierName = document.getElementById('dossierName') || document.querySelector('.dossier-farmer-row strong');
    const dossierLic = document.getElementById('dossierLic') || document.querySelector('.dossier-farmer-row div div');
    const dossierReg = document.getElementById('dossierReg');
    
    if (dossierAvatar) dossierAvatar.textContent = initials;
    if (dossierName) dossierName.textContent = name;
    if (dossierLic) dossierLic.textContent = `APMC Lic #TN-FARM-${phone.slice(-4)}`;
    if (dossierReg) dossierReg.textContent = `Farm Location: ${location}`;

    // 4. Certified Producer Seller rows
    document.querySelectorAll('.seller-profile-row').forEach((row) => {
      const avatar = row.querySelector('.avatar-circle');
      const text = row.querySelector('span');
      if (avatar) avatar.textContent = initials;
      if (text) text.textContent = `${name} • ${location} (Certified Producer)`;
    });
  } catch(e){}
}

/* -------------------------------------------------------------------------- */
/* 1. Language Switcher Integration                                           */
/* -------------------------------------------------------------------------- */
function initLanguageSwitcher() {
  const langBtns = document.querySelectorAll('.lang-selector-group .lang-btn');
  if (!langBtns.length) return;

  langBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const targetLang = e.target.getAttribute('data-lang-btn') || 'english';
      
      // Update UI active state
      langBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      // Call global Lang handler if present
      if (window.Lang && typeof window.Lang.load === 'function') {
        await window.Lang.load(targetLang);
        syncGlobalUserProfile();
      }
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 2. Interactive OTP Escrow Simulation Demo                                  */
/* -------------------------------------------------------------------------- */
function initOtpSimulation() {
  const otpInputs = document.querySelectorAll('.otp-single-input');
  const verifyBtn = document.getElementById('verifyOtpBtn');
  const successAlert = document.getElementById('otpSuccessAlert');

  if (!otpInputs.length) return;

  // Auto focus next input
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });

  if (verifyBtn) {
    verifyBtn.addEventListener('click', () => {
      let code = '';
      otpInputs.forEach(i => code += i.value);

      if (code.length < 4) {
        alert('Please enter complete 4-digit weighbridge OTP code.');
        return;
      }

      verifyBtn.textContent = 'Verifying Escrow Lock...';
      verifyBtn.disabled = true;

      setTimeout(() => {
        verifyBtn.textContent = '✓ Verified & Released';
        verifyBtn.style.background = '#22c55e';
        
        if (successAlert) {
          successAlert.classList.add('show');
          successAlert.innerHTML = `
            <strong>✓ Instant Payout Executed!</strong><br>
            ₹18,960 successfully credited to State Bank A/C ending in 4521.<br>
            <small style="opacity: 0.8;">Transaction Ref: eKISAN-TXN#2024-884920 • Weighbridge Slip verified</small>
          `;
        }
      }, 1000);
    });
  }
}

/* -------------------------------------------------------------------------- */
/* 3. Category & Quality Grade Filter Pills                                   */
/* -------------------------------------------------------------------------- */
function initCategoryFilters() {
  const catPills = document.querySelectorAll('.cat-pill');
  const gradeBtns = document.querySelectorAll('.grade-pill-btn');
  const listingCards = document.querySelectorAll('.market-listing-card');

  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const selectedCategory = pill.getAttribute('data-category');
      filterListings(selectedCategory, getCurrentActiveGrade());
    });
  });

  gradeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      gradeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const selectedGrade = btn.getAttribute('data-grade');
      filterListings(getCurrentActiveCategory(), selectedGrade);
    });
  });

  function getCurrentActiveCategory() {
    const activePill = document.querySelector('.cat-pill.active');
    return activePill ? activePill.getAttribute('data-category') : 'all';
  }

  function getCurrentActiveGrade() {
    const activeGrade = document.querySelector('.grade-pill-btn.active');
    return activeGrade ? activeGrade.getAttribute('data-grade') : 'all';
  }

  function filterListings(category, grade) {
    listingCards.forEach(card => {
      const cardCat = card.getAttribute('data-crop-category') || 'vegetables';
      const cardGrade = card.getAttribute('data-crop-grade') || 'A';

      const matchesCat = (category === 'all' || category === cardCat);
      const matchesGrade = (grade === 'all' || grade === cardGrade);

      if (matchesCat && matchesGrade) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/* 4. APMC Table Sorting                                                     */
/* -------------------------------------------------------------------------- */
function initAPMCTableSort() {
  const tableHeaders = document.querySelectorAll('.apmc-spot-table th[data-sort]');
  const tableBody = document.querySelector('.apmc-spot-table tbody');

  if (!tableHeaders.length || !tableBody) return;

  tableHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      const currentOrder = th.getAttribute('data-order') === 'asc' ? 'desc' : 'asc';
      th.setAttribute('data-order', currentOrder);

      const rows = Array.from(tableBody.querySelectorAll('tr'));
      rows.sort((a, b) => {
        const cellA = a.querySelector(`[data-col="${key}"]`)?.textContent.trim() || '';
        const cellB = b.querySelector(`[data-col="${key}"]`)?.textContent.trim() || '';

        const numA = parseFloat(cellA.replace(/[^0-9.-]+/g, '')) || cellA;
        const numB = parseFloat(cellB.replace(/[^0-9.-]+/g, '')) || cellB;

        if (numA < numB) return currentOrder === 'asc' ? -1 : 1;
        if (numA > numB) return currentOrder === 'asc' ? 1 : -1;
        return 0;
      });

      rows.forEach(r => tableBody.appendChild(r));
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 5. Community Price Submission Modal / Feature                               */
/* -------------------------------------------------------------------------- */
function initCommunityPriceSubmit() {
  const submitBtn = document.getElementById('btnSubmitPriceReport');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', () => {
    const crop = prompt('Enter Crop Name (e.g. Tomato / Shallots):', 'Tomato');
    if (!crop) return;
    const price = prompt(`Enter Current Mandi Rate for ${crop} (₹/kg):`, '24');
    if (!price) return;
    const location = prompt('Enter Village / Mandi Location:', 'Palladam');

    const priceList = document.querySelector('.community-price-list');
    if (priceList) {
      const newItem = document.createElement('div');
      newItem.className = 'price-report-item';
      newItem.innerHTML = `
        <div>
          <strong>${crop} (${location})</strong><br>
          <small>Reported by You • Just now</small>
        </div>
        <div style="text-align: right;">
          <strong style="color: #047857; font-size: 16px;">₹${price}/kg</strong>
          <div style="font-size: 11px; color: #16a34a;">Market Signal</div>
        </div>
      `;
      priceList.prepend(newItem);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* 6. Active Crops Carousel Touch / Scroll Helpers                             */
/* -------------------------------------------------------------------------- */
function initCropCarouselScroll() {
  const carousel = document.querySelector('.carousel-scroll-wrapper');
  if (!carousel) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  carousel.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });
  carousel.addEventListener('mouseleave', () => isDown = false);
  carousel.addEventListener('mouseup', () => isDown = false);
  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 2;
    carousel.scrollLeft = scrollLeft - walk;
  });
}

/* -------------------------------------------------------------------------- */
/* 7. Live Ticker Data Update Simulation                                      */
/* -------------------------------------------------------------------------- */
function initLiveTickerUpdate() {
  // Minor random price fluctuations every 12 seconds to show live activity
  setInterval(() => {
    const prices = document.querySelectorAll('.ticker-item .price-val');
    if (!prices.length) return;
    const randomIndex = Math.floor(Math.random() * prices.length);
    const target = prices[randomIndex];
    const currentVal = parseInt(target.textContent.replace(/\D/g, ''));
    if (!isNaN(currentVal)) {
      const delta = Math.floor(Math.random() * 10) - 4;
      const newVal = Math.max(10, currentVal + delta);
      target.textContent = `₹${newVal}/kg`;
    }
  }, 12000);
}
