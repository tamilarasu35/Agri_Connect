# 🌾 AgriConnect (FarmPriceSystem) — Frontend Requirements & Architecture Document

---

## 🛠️ 1. System Architecture & Tech Stack Overview

- **Core Technologies**: Native HTML5, Modern Vanilla CSS3 (Custom Properties & Design Tokens), Vanilla JavaScript (ES6+ Modules & Async/Await).
- **Backend Integration**: Single-binary Java HTTP Server (`http://localhost:8080/api/*`) with flat-file CSV data stores.
- **Client State & Persistence**: `localStorage` (`fps_session`, `fps_lang`, `fps_draft_listing`).
- **Translation Engine (`js/lang.js`)**: Real-time multi-language switcher supporting **Tamil (தமிழ்)**, **Hindi (हिंदी)**, and **English**, driving dynamic DOM text replacements via `data-lang` attributes.
- **Design Tokens (`css/styles.css`)**: Glassmorphism aesthetic, dark/light theme tokens, custom typography (`Inter`, `Noto Sans Tamil`, `Noto Sans Devanagari`, `Yatra One`), and smooth CSS micro-animations.

---

## 📄 2. Page-by-Page & Sub-Section Detailed Breakdown

---

### 1️⃣ Landing, Registration & Login Page (`index.html`)

**Primary Purpose**: Language selection, new farmer onboarding with GPS detection, returning farmer PIN-based authentication, and offline IVR help banner.

#### Sub-sections & Components:
1. **Hero Background & Particle Canvas** (`#heroBg`, `#particles`)
   - High-definition background image with smooth parallax scrolling effect based on mouse/scroll position.
   - Dynamic JavaScript floating green leaf particle animation.
2. **Language Selector Header** (`#langSection`)
   - Dynamic title: `🌾 AgriConnect` with animated gradient text.
   - 3-Button Language Switcher: **தமிழ்**, **हिंदी**, **English**.
   - Auto-collapsing transition upon language selection to reveal the login card.
3. **Authentication Card Container & Tab Switcher** (`#loginCard`, `#tabSwitcher`)
   - Dual-tab toggle: **New Farmer** (Registration) vs. **Returning Farmer** (Login).
4. **Registration Form** (`#registerForm`)
   - **Full Name Input** (`#regName`).
   - **10-Digit Mobile Number Input** (`#regPhone`).
   - **Land Location Field with GPS Auto-Detect Button** (`#regLocation`, `#gpsBtn`) — Invokes browser Geolocation API to auto-fill village/district.
   - **Multi-Select Crop Chips Grid** (`#cropChips`) — Interactive crop selection chips with emojis (Tomato 🍅, Onion 🧅, Rice 🌾, Sugarcane 🎋, etc.).
   - **Submit Button** (`#registerBtn`) — Saves profile and auto-generates a unique 4-digit PIN.
5. **Returning Farmer Login Form** (`#loginForm`)
   - **Phone Number Field** (`#loginPhone`).
   - **4-Digit Secret PIN Field** (`#loginPin`) with hidden password input.
   - **Login Button** (`#loginBtn`).
   - **Forgot PIN Link** (`form.forgot_pin`).
6. **IVR Voice-Based Service Banner** (`.ivr-section`)
   - Toll-free hotline prompt (`1800-XXX-XXXX`) for village farmers without smartphones.
7. **Security PIN Modal Overlay** (`#pinModal`)
   - Prominently displays the newly generated 4-digit security PIN upon registration.
   - Disclaimer note encouraging secure storage like an ATM PIN.
   - "Continue to Dashboard →" button redirecting to `dashboard.html`.
8. **Toast Notification System** (`#toastContainer`)
   - Animated toast popups for validation errors, successful registration, and GPS status.

---

### 2️⃣ Main Farmer Dashboard & Navigation (`dashboard.html`)

**Primary Purpose**: Primary control center for logged-in farmers to monitor live market metrics, view/edit personal & land details, track sales history, and launch quick actions.

#### Sub-sections & Components:
1. **Hero Greeting Header** (`#dashboardHero`)
   - Personalized greeting banner with hands-together emoji (🙏) and farmer's name.
   - Current location badge (e.g., `📍 Palladam, Coimbatore`) and today's live date.
2. **Summary Metrics Cards Grid** (`.summary-cards-grid`)
   - **Today's Best Price Card** (`#topPriceCard`) — Highlights top market price (e.g., `Tomato ₹18/kg`).
   - **Nearest Mandi Card** (`#nearestMandiCard`) — Displays nearest active market location.
   - **Smart Market Alert Card** (`#smartAlertCard`) — AI market signal (e.g., `⚡ Demand high for Turmeric`).
3. **Personal Details Card** (`#personalDetailsGrid`)
   - Farmer Avatar icon (`#profileAvatar`).
   - Verified Farmer Badge (`🌾 Verified Farmer`).
   - Edit Profile Button (`#btnEditProfile`).
   - Grid displaying Phone Number, Registration Date, Member ID, and CSC Verification status.
4. **Land Details & Interactive Map Section** (`#landDetailsGrid`, `#landMapFrame`)
   - Land size, survey number, soil type, and irrigation source.
   - **GPS Update Button** (`#btnUpdateLocation`).
   - **Embedded Interactive OpenStreetMap iFrame** displaying exact farm GPS boundary coordinates.
5. **My Crops Carousel** (`#cropsScrollRow`)
   - Horizontal scrolling cards showing currently cultivated crops.
   - **"Add Crop" Button** redirecting to `prices.html`.
6. **Sales History Table & Monthly Earnings** (`#salesTableWrap`)
   - Interactive HTML Table with columns: *Date, Crop, Quantity, Price/kg, Total Amount, Status (Done / Pending / Active)*.
   - Empty state view (`#salesEmptyState`) with "Start Selling" prompt when no transactions exist.
   - **Monthly Total Earnings Footer** (`#salesTotalValue`).
7. **Floating Quick Actions Bar** (`.quick-actions-bar`)
   - Fixed bottom action bar with 4 shortcuts:
     - 💰 **Check Price** (`prices.html`)
     - 🛒 **Sell Now** (Toggles Direct Trade View)
     - 📋 **Reports** (`reports.html`)
     - 💡 **Advisory** (`advisory.html`)

---

### 3️⃣ Direct Trade Marketplace Hub (`dashboard.html` / `#tradeSystem`)

**Primary Purpose**: Direct peer-to-peer trading between farmers and buyers with zero middleman commissions, locked-in prices, crop photos, and OTP delivery validation.

#### Sub-sections & Components:
1. **Top Navigation Bar** (`.trade-nav`)
   - Back button to Dashboard, Saffron Logo (`FarmPrice Hub`), Language Switcher, and User Profile Avatar.
2. **Trade Page Header & Live Stats Bar** (`.trade-header`)
   - "Zero Middleman" Badge (`⚡ No Middleman`).
   - Stats row displaying: *Active Listings Count, Total Traded Volume (e.g., ₹8.4L), Average Trust Score (e.g., 4.8★)*.
3. **Role Panel Switcher Tabs** (`.tabs-container`)
   - **Tab 1: Farmer — Sell** (`#farmerPanel`).
   - **Tab 2: Buyer — Browse** (`#buyerPanel`).
   - **Tab 3: My Orders** (`#ordersPanel`).
4. **Farmer Sell Listing Form** (`#farmerPanel`)
   - **Price Lock Warning Banner**: Explicit notice that approved listing prices cannot be altered.
   - **Crop & Variety Selection**: Dropdown featuring 14+ local crops with Tamil & English names.
   - **Live Mandi Price Auto-Fetch Banner** (`#mandiPriceDisplayContainer`): Fetches live Agmarknet benchmark price for the selected crop to assist fair pricing.
   - **Quantity (kg) & Negotiated Selling Price Fields** (`#farmerQty`, `#farmerPrice`).
   - **Minimum Acceptable Price Field** (`#farmerMinNegPrice`): Floor price limit for buyer negotiations.
   - **Available Date Picker** (`#farmerDate`).
   - **Crop Photo Upload Zone** (`#photoUploadZone`): Drag & drop or file picker for high-res crop images with live preview and remove option.
   - **Crop Grade Selector**: 3 Grade buttons (🏆 Grade A — Premium, ✅ Grade B — Standard, 📦 Grade C — Economy).
   - **Location & Logistics Switchers**: Village name, District dropdown, and toggle switches for *Own Transport Vehicle* and *Farm Pickup Allowed*.
   - **Payment Options & UPI ID**: Options for Cash at Delivery, UPI/Bank Transfer, or Both.
   - **Additional Crop Notes Textarea**: Field for organic certifications, harvest timing, etc.
   - **Post Listing & Save Draft Buttons** (`#btnPostListing`, `#btnSaveDraft`).
5. **Buyer Marketplace Browse Grid** (`#buyerPanel`)
   - Search bar and filters by Crop, District, and Quality Grade.
   - Crop cards showing photo, price/kg, quantity available, farmer distance, seller trust score, and "Make Offer" / "Buy Now" buttons.
6. **My Orders & Offer Management Panel** (`#ordersPanel`)
   - List of outgoing farmer orders and incoming buyer trade requests.
   - Status indicators (*Pending Approval, Price Locked, Out for Delivery, Delivered*).
   - **OTP Verification Button**: Triggers OTP input box to finalize delivery.

---

### 4️⃣ Live Mandi Prices & Exploitation Detector (`prices.html`)

**Primary Purpose**: Real-time mandi price discovery across Tamil Nadu, AI price prediction trend analysis, and middleman price exploitation verification.

#### Sub-sections & Components:
1. **Header Bar & Morning Alert Banner** (`#morningBanner`)
   - Back button and page title.
   - Morning alert banner informing farmers when fresh daily market rates are updated.
2. **3-Column Interactive Filter Grid** (`.filter-grid`)
   - **Column 1: Crop Selection** (`#cropList`) — Scrollable vertical list of crops with live price indicators.
   - **Column 2: Quantity Selection** (`#qtyGrid`) — Quick select buttons (1kg, 5kg, 10kg, 50kg, 100kg, 500kg) and custom kg numeric input (`#qtyCustom`).
   - **Column 3: Mandi Location Detector** (`#mandiGrid`) — "Detect Nearest Mandi" GPS button and Tamil Nadu district search box (`#mandiSearchInput`).
3. **Price Result & ML Trend Prediction Strip** (`#priceResultCard`, `#mlPredictionStrip`)
   - Large display of current market modal price, minimum price, maximum price, and profit margin calculation.
   - **Machine Learning Forecast Box**:
     - Tomorrow's predicted price per kg (`#mlPredictedPrice`).
     - Market trend arrow indicator (⬆️ Rising, ⬇️ Falling, ➡️ Stable).
     - R2 Confidence Percentage Ring SVG (`#mlConfidenceRing`).
     - AI Recommendation Text (e.g., *"Hold stock for 2 days — price expected to rise"*).
     - Festival Price Spike Alert (`#mlFestivalAlert`).
4. **Middleman Exploitation Detector Calculator** (`#detectorCard`)
   - Interactive tool answering: *"Are you being cheated by the middleman?"*
   - Input field: **Price offered by middleman (₹/kg)** (`#middlemanPrice`).
   - **"Calculate Loss" Button** (`#btnCalculateLoss`).
   - **ASCII/Visual Result Breakdown**: Displays Fair Mandi Price vs. Vendor Offer, exact loss in Rupees, percentage margin stolen by middleman, and action advice.
5. **All-Crops Today's Price Summary Table** (`.summary-table-section`)
   - Complete tabular list of all commodities, min/max rates, modal rates, and trend arrows.

---

### 5️⃣ Trust, Ratings & Fraud Prevention (`trust.html`)

**Primary Purpose**: Safeguard direct transactions through OTP delivery validation, transparent buyer/seller star ratings, trust score metrics, and automated anti-fraud blacklisting.

#### Sub-sections & Components:
1. **Order Delivery OTP Confirmation Card** (`.otp-card`)
   - Summarizes active order details: Crop name, total weight, buyer name, total payout (`#otpAmount`).
   - **4-Digit OTP Display Boxes** (`.otp-digits`).
   - **Warning Banner**: *"Give OTP to buyer ONLY after verifying physical goods and receiving payment!"*
2. **Star Rating Submission Form** (`.rating-card`)
   - Interactive 5-Star Rating component (`#starRating`).
   - Optional feedback comment box (`#ratingComment`).
   - Submit Rating button (`#btnSubmitRating`).
3. **Farmer Trust Score Dashboard** (`.score-card`)
   - Large rating average display (e.g., `4.9 / 5.0 ★★★★★`).
   - Key metrics list: *Completed Orders (47), On-time Delivery Rate (100%), OTP Success Rate (100%), Fraud Reports (0), Member Since Date, CSC Verified Status*.
4. **ASCII Digital Transaction Receipt** (`#receiptContent`)
   - Full monospaced digital invoice containing Transaction ID, Date, Farmer/Buyer details, Crop Grade, Total Payout, and OTP confirmation seal.
   - Action buttons: **Print Receipt**, **Save as PDF**, and **View Reports**.
5. **Anti-Fraud & Blacklist System Rules** (`.blacklist-card`)
   - Transparency panel outlining rules:
     - *Rule 1*: 3 failed OTP attempts flags account.
     - *Rule 2*: 2 fraud reports lead to instant blacklist.
     - *Rule 3*: Rating below 2.0 triggers mandatory review.

---

### 6️⃣ Crop Advisory & Market Intelligence (`advisory.html`)

**Primary Purpose**: Empower farmers with seasonal planting intelligence, festival demand alerts, crowdsourced local prices, and expert advice.

#### Sub-sections & Components:
1. **Festival Demand Alert Banner** (`#festivalAlertBanner`)
   - Prominent notification for upcoming cultural festivals (e.g., *Pongal in 8 days*).
   - Expected percentage price surges (Sugarcane +40%, Turmeric +35%, Coconut +25%).
   - Farmer action advice (*"Hold your stock — sell during festival peak!"*).
2. **Top 5 Crops of the Week** (`#topCropsContainer`)
   - Ranked cards of crops with highest demand and profitability indices.
3. **Seasonal Crop Calendar Carousel** (`.calendar-card`)
   - Month-by-month recommendations (January through December) guiding optimal planting and harvesting schedules.
4. **Crop vs. Market Demand Comparison Bars** (`.compare-card`)
   - Visual progress bars comparing farmer's current crops against real-time market demand (High Demand ✅, Medium Demand ➡️, Low Demand ⚠️).
5. **Crowdsourced Local Price Reporting Form** (`.crowd-card`)
   - Form allowing farmers to report actual prices received in local markets to aid neighbors.
   - Feed showing recent crowd reports from nearby villages.
6. **CSC Operator Market Survey Form** (`.csc-card`)
   - Specialized input portal for Common Service Center (CSC) operators to upload verified local mandi rates.
7. **Tamil Agricultural Wisdom Card** (`.wisdom-card`)
   - Easy-to-understand advice card in plain Tamil & English offering weekly farming strategies.

---

### 7️⃣ Reports & Data Export (`reports.html`)

**Primary Purpose**: Financial summary, transaction history tracking, middleman savings calculator, and database export.

#### Sub-sections & Components:
1. **Report Category Selector Cards** (`.rep-grid`)
   - 4 Interactive filter tabs:
     - 📊 **Daily Price Report**
     - 📋 **My Transactions**
     - 💰 **Savings Report** (Calculates total money saved by bypassing middlemen)
     - 📁 **Export All Data**
2. **Interactive ASCII Report Viewer** (`#reportViewer`)
   - Dynamic report container displaying formatted text-based tables and summaries.
3. **Export Actions Bar** (`.rep-actions`)
   - Buttons to **Print Report**, **Download .txt**, and **Download .csv**.
4. **CSV Database Download Hub** (`#exportView`)
   - Quick export portal to download raw flat-file CSV datasets (`farmers.csv`, `orders.csv`, `prices_cache.csv`, `price_history.csv`) for submission to Gram Panchayats or NGOs.

---

## 🎨 3. Roadmap for Frontend Enhancement

| Area | Current State | Target Enhancement Strategy |
| :--- | :--- | :--- |
| **Styling & System** | Monolithic CSS variables across stylesheets | Standardize into modular theme files, responsive container queries, & dark/light mode toggle. |
| **Data Visualization** | ASCII/text tables | Integrate Chart.js/Recharts for dynamic price trend lines, profit analytics, & demand gauge meters. |
| **Camera & Media** | Basic file input preview | Native WebRTC/Camera API scanner for instant crop photo capture & AI quality grading preview. |
| **Accessibility** | Static multi-language strings | Web Speech API (Voice Input/Output) so farmers can interact verbally in Tamil/Hindi. |
| **Maps & Location** | Static OpenStreetMap iFrame | Interactive Leaflet.js map with custom farm pins, distance radii, and route calculation. |
