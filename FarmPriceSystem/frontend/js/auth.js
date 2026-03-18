/**
 * FarmPriceSystem — Auth Module (auth.js)
 * Handles registration, login, GPS detection, and session management.
 * Uses localStorage + CSV backend (via API or direct file for static mode).
 */

const Auth = (() => {
    const SESSION_KEY = 'fps_session';
    const FARMERS_KEY = 'fps_farmers';

    /**
     * Get stored farmers from localStorage (static fallback when no backend)
     */
    function getFarmers() {
        try {
            return JSON.parse(localStorage.getItem(FARMERS_KEY) || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Save farmers array to localStorage
     */
    function saveFarmers(farmers) {
        localStorage.setItem(FARMERS_KEY, JSON.stringify(farmers));
    }

    /**
     * Register a new farmer
     */
    function register({ name, phone, location, crops }) {
        // Validate
        if (!name || !phone || !location || !crops.length) {
            return { success: false, message: 'toast.error_fields' };
        }
        if (!/^\d{10}$/.test(phone)) {
            return { success: false, message: 'toast.error_phone' };
        }

        const farmers = getFarmers();

        // Check if already exists
        const existing = farmers.find(f => f.phone === phone);
        if (existing) {
            // Update profile
            existing.name = name;
            existing.location = location;
            existing.crops = crops;
            saveFarmers(farmers);
            setSession(existing);
            return { success: true, message: 'toast.register_success', farmer: existing };
        }

        // Generate 4-digit PIN
        const pin = String(Math.floor(1000 + Math.random() * 9000));

        const farmer = {
            id: 'F' + Date.now(),
            name,
            phone,
            location,
            crops,
            pin,
            registeredAt: new Date().toISOString(),
            trustScore: 0,
            language: Lang.getCurrent()
        };

        farmers.push(farmer);
        saveFarmers(farmers);
        setSession(farmer);

        return { success: true, message: 'toast.register_success', farmer, pin };
    }

    /**
     * Login with phone + PIN
     */
    function login(phone, pin) {
        if (!/^\d{10}$/.test(phone)) {
            return { success: false, message: 'toast.error_phone' };
        }
        if (!/^\d{4}$/.test(pin)) {
            return { success: false, message: 'toast.error_pin' };
        }

        const farmers = getFarmers();
        const farmer = farmers.find(f => f.phone === phone && f.pin === pin);

        if (!farmer) {
            return { success: false, message: 'toast.error_login' };
        }

        setSession(farmer);
        return { success: true, message: 'toast.login_success', farmer };
    }

    /**
     * Set user session
     */
    function setSession(farmer) {
        const session = {
            id: farmer.id,
            name: farmer.name,
            phone: farmer.phone,
            role: 'farmer',
            loggedInAt: new Date().toISOString()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    /**
     * Get current session
     */
    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY));
        } catch {
            return null;
        }
    }

    /**
     * Clear session
     */
    function logout() {
        localStorage.removeItem(SESSION_KEY);
    }

    /**
     * Check if user is logged in
     */
    function isLoggedIn() {
        return !!getSession();
    }

    /**
     * Detect GPS location and reverse-geocode to a human-readable address
     */
    function detectGPS() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        // Try reverse geocoding via free API
                        const resp = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12&addressdetails=1`,
                            { headers: { 'Accept-Language': 'en' } }
                        );
                        if (resp.ok) {
                            const data = await resp.json();
                            const addr = data.address || {};
                            const village = addr.village || addr.town || addr.city || '';
                            const district = addr.state_district || addr.county || addr.state || '';
                            const location = [village, district].filter(Boolean).join(', ');
                            resolve(location || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                        } else {
                            resolve(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                        }
                    } catch {
                        resolve(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    }
                },
                (error) => {
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    return { register, login, getSession, logout, isLoggedIn, detectGPS };
})();
