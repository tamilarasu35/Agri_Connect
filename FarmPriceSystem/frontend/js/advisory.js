/**
 * advisory.js - Phase 7: Crop Advisory & Intelligence
 */

const Advisory = (() => {

  const TOP_CROPS = [
    { rank: 1, id: 'turmeric', emoji: '🌕', nameKey: 'crop.turmeric', location: 'Erode', price: 85, trendPerc: 12, trend: 'up' },
    { rank: 2, id: 'mango', emoji: '🥭', nameKey: 'crop.mango', location: 'Banganapalli', price: 65, trendPerc: 8, trend: 'up' },
    { rank: 3, id: 'chilli', emoji: '🌶️', nameKey: 'crop.chilli', location: 'Byadgi', price: 120, trendPerc: 0, trend: 'stable' },
    { rank: 4, id: 'tomato', emoji: '🍅', nameKey: 'crop.tomato', location: 'Cherry', price: 20, trendPerc: 5, trend: 'up' },
    { rank: 5, id: 'coconut', emoji: '🥥', nameKey: 'crop.coconut', location: 'Pollachi', price: 28, trendPerc: 6, trend: 'up' }
  ];

  function renderTopCrops() {
    const list = document.getElementById('topCropsContainer');
    list.innerHTML = '';

    TOP_CROPS.forEach(c => {
      const item = document.createElement('div');
      item.className = 'top-crop-item';
      
      let trendClass = 'stable';
      let trendChar = '→';
      let trendColor = '#888';
      let textTrend = 'Stable';
      
      if(c.trend === 'up') { 
        trendClass = 'up'; trendChar = '↑'; trendColor = 'var(--green-mid)'; 
        textTrend = `+${c.trendPerc}% this week`;
      }

      const cropName = Lang.get(c.nameKey) || (c.id.charAt(0).toUpperCase() + c.id.slice(1));

      item.innerHTML = `
        <div class="tci-rank">#${c.rank}</div>
        <div class="tci-info">
          <strong>${c.emoji} <span data-lang="${c.nameKey}">${cropName}</span></strong>
          <span>(${c.location})</span>
        </div>
        <div class="tci-price">
          <strong>₹${c.price}/kg</strong>
          <div class="tci-trend ${trendClass}">${trendChar} ${textTrend}</div>
        </div>
        <button class="btn-outline" style="margin-left:15px; padding:6px 10px; font-size:0.8rem" onclick="window.location.href='prices.html'">
          Check Price →
        </button>
      `;
      list.appendChild(item);
    });
  }

  function setupInteractions() {
    // Crowdsource Report
    const btnReport = document.getElementById('btnReport');
    btnReport?.addEventListener('click', () => {
      const p = document.getElementById('reportPrice').value;
      if(!p) return alert("Please enter a price.");
      
      const ogHtml = btnReport.innerHTML;
      btnReport.innerHTML = '<span class="loader" style="width:14px;height:14px;"></span> Sending...';
      
      setTimeout(() => {
        btnReport.innerHTML = '✅ Reported Successfully';
        btnReport.classList.remove('btn-primary');
        btnReport.classList.add('btn-outline');
        
        // Add to list
        const ul = document.getElementById('reportsList');
        const li = document.createElement('li');
        li.textContent = `"₹${p}/kg locally" — Just now`;
        li.style.color = "var(--green-mid)";
        ul.prepend(li);
        
        document.getElementById('reportPrice').value = '';
      }, 1000);
    });

    // CSC Operator Report
    const btnSurvey = document.getElementById('btnSubmitSurvey');
    btnSurvey?.addEventListener('click', () => {
      const fprice = document.getElementById('cscPrice').value;
      if(!fprice) return alert("Please enter price.");
      btnSurvey.textContent = '✅ Survey Submitted';
    });
  }

  // ============================
  // INIT
  // ============================
  async function init() {
    const savedLang = Lang.getSaved();
    if(window.Lang && typeof Lang.load === 'function'){
      await Lang.load(savedLang);
    }
    
    renderTopCrops();
    setupInteractions();
    
    if(window.Lang && typeof Lang.applyTranslations === 'function'){
      Lang.applyTranslations();
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Advisory.init);
