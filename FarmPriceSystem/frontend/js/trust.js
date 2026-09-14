/**
 * trust.js - Phase 6: Trust & Fraud Prevention System
 */

const TrustPage = (() => {

  // ============================
  // STAR RATING LOGIC
  // ============================
  function initStarRating() {
    const stars = document.querySelectorAll('.star');
    let selectedValue = 0;

    stars.forEach(star => {
      // Hover effect
      star.addEventListener('mouseover', function() {
        const val = parseInt(this.getAttribute('data-val'));
        highlightStars(val);
      });

      // Remove hover effect
      star.addEventListener('mouseout', function() {
        highlightStars(selectedValue);
      });

      // Click to set rating
      star.addEventListener('click', function() {
        selectedValue = parseInt(this.getAttribute('data-val'));
        highlightStars(selectedValue);
      });
    });

    const submitBtn = document.getElementById('btnSubmitRating');
    submitBtn.addEventListener('click', () => {
      if (selectedValue === 0) {
        alert(Lang.get('trust.select_star') || 'Please select a star rating first.');
        return;
      }
      const comment = document.getElementById('ratingComment').value;
      const ogHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="loader"></span> ' + (Lang.get('trust.submitting') || 'Submitting...');
      submitBtn.disabled = true;

      // Simulate API call
      setTimeout(() => {
        submitBtn.innerHTML = '✅ ' + (Lang.get('trust.rating_saved') || 'Rating Saved');
        submitBtn.style.background = 'var(--green-mid)';
        
        // Hide rating section after 2 secs
        setTimeout(() => {
          document.querySelector('.rating-card').style.display = 'none';
        }, 2000);
      }, 1000);
    });
  }

  function highlightStars(val) {
    const stars = document.querySelectorAll('.star');
    stars.forEach(s => {
      const starVal = parseInt(s.getAttribute('data-val'));
      if (starVal <= val) {
        s.classList.add('active');
        s.textContent = '★';
      } else {
        s.classList.remove('active');
        s.textContent = '☆';
      }
    });
  }

  // ============================
  // ACTION BUTTONS (RECEIPT)
  // ============================
  function initReceiptActions() {
    const btnPrint = document.getElementById('btnPrint');
    const btnSavePdf = document.getElementById('btnSavePdf');
    // const btnCopyId is handled via inline onclick in HTML

    btnPrint.addEventListener('click', () => {
      window.print();
    });

    btnSavePdf.addEventListener('click', () => {
      alert("Receipt saved as TXN-2026-8841.pdf in your downloads folder.");
    });
  }

  // ============================
  // MOCK LOGIC FOR OTP 
  // ============================
  function simulateOTP() {
    // Check if URL has params (e.g. from trade.html order)
    const urlParams = new URLSearchParams(window.location.search);
    const txn = urlParams.get('txn');
    if (txn) {
      // Show dynamic data if desired, for now we just show static html structure
      const title = document.getElementById('otpCropName');
      // In a real app we would decode crop and update UI
    }
  }

  // ============================
  // INIT
  // ============================
  async function init() {
    // Load languages
    const savedLang = Lang.getSaved();
    if(window.Lang && typeof Lang.load === 'function'){
      await Lang.load(savedLang);
    }
    
    if(window.Lang && typeof Lang.applyTranslations === 'function'){
      Lang.applyTranslations();
    }

    initStarRating();
    initReceiptActions();
    simulateOTP();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', TrustPage.init);
