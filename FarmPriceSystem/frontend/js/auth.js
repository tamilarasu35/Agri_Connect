/**
 * FarmPriceSystem — Auth Module (auth.js) v2.0
 *
 * Dual-mode authentication:
 *  1. Backend API mode (primary): Calls /api/register and /api/login on the
 *     Java server. Server returns a session token that is stored in
 *     localStorage as 'fps_token'. All subsequent API calls send this token
 *     as "Authorization: Bearer <token>".
 *
 *  2. localStorage fallback mode: If the backend is unreachable, falls back
 *     to client-side authentication (original behavior) so the app remains
 *     usable in offline/static mode.
 *
 * Session data is stored in 'fps_session' for UI use (name, id, phone).
 * The secure token is stored separately in 'fps_token'.
 */

const Auth = (() => {
    const SESSION_KEY = 'fps_session';
    const TOKEN_KEY   = 'fps_token';
    const FARMERS_KEY = 'fps_farmers';
    const API_BASE    = ''; // empty = same origin (http://localhost:8080)

    // ── Token management ─────────────────────────────────────────────────

    /** Store the server-issued session token */
    function setToken(token) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
    }

    /** Get the stored session token */
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    /** Build Authorization header for API requests */
    function authHeaders() {
        const token = getToken();
        return token
            ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
            : { 'Content-Type': 'application/json' };
    }

    /**
     * Make an authenticated API call.
     * Returns the parsed JSON response data, or throws on network/API error.
     */
    async function apiCall(method, path, body = null) {
        const opts = {
            method,
            headers: authHeaders(),
        };
        if (body) opts.body = JSON.stringify(body);
        const resp = await fetch(API_BASE + path, opts);
        const json = await resp.json();
        return { ok: resp.ok, status: resp.status, data: json };
    }

    // ── localStorage helpers (fallback) ──────────────────────────────────

    function getFarmers() {
        try { return JSON.parse(localStorage.getItem(FARMERS_KEY) || '[]'); }
        catch { return []; }
    }

    function saveFarmers(farmers) {
        localStorage.setItem(FARMERS_KEY, JSON.stringify(farmers));
    }

    // ── Session management ────────────────────────────────────────────────

    /** Persist session data from a backend response or a local farmer object */
    function setSession(data) {
        const session = {
            id:          data.id          || data.farmer?.id  || '',
            name:        data.name        || data.farmer?.name || '',
            phone:       data.phone       || data.farmer?.phone || '',
            role:        data.role        || 'farmer',
            language:    data.language    || Lang.getCurrent(),
            loggedInAt:  new Date().toISOString()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        if (data.token) setToken(data.token);
    }

    /** Get current session from localStorage */
    function getSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
        catch { return null; }
    }

    /** True if a session exists (does not validate token with server) */
    function isLoggedIn() {
        return !!getSession();
    }

    // ── Registration ──────────────────────────────────────────────────────

    /**
     * Register a new farmer.
     * Tries the backend API first; falls back to localStorage if unreachable.
     * Returns { success, message, pin (if new), farmer }
     */
    function register({ name, phone, location, crops }) {
        // Client-side validation (mirrors server-side for fast feedback)
        if (!name || !phone || !location || !crops.length)
            return { success: false, message: 'toast.error_fields' };
        if (!/^\d{10}$/.test(phone))
            return { success: false, message: 'toast.error_phone' };

        // Try backend API asynchronously — return sync result for UI compat,
        // then update session once the backend responds
        const cropsStr = Array.isArray(crops) ? crops.join(',') : crops;
        fetch(API_BASE + '/api/register', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name, phone, location, crops: cropsStr, language: Lang.getCurrent() })
        }).then(r => r.json()).then(json => {
            if (json.success && json.data) {
                // Update session with server-issued token
                setSession(json.data);
                // Sync PIN to localStorage farmers for fallback
                if (json.data.pin) {
                    const farmers = getFarmers();
                    const existing = farmers.find(f => f.phone === phone);
                    if (existing) existing.pin = json.data.pin;
                    else farmers.push({ id: json.data.id, name, phone, location, crops, pin: json.data.pin, trustScore: 0, language: Lang.getCurrent() });
                    saveFarmers(farmers);
                }
            }
        }).catch(() => {}); // silent — we already have the fallback result

        // ── Synchronous localStorage path (for immediate UI feedback)
        const farmers = getFarmers();
        const existing = farmers.find(f => f.phone === phone);
        if (existing) {
            existing.name = name; existing.location = location; existing.crops = crops;
            saveFarmers(farmers);
            setSession(existing);
            return { success: true, message: 'toast.register_success', farmer: existing };
        }
        const pin    = String(Math.floor(1000 + Math.random() * 9000));
        const farmer = { id: 'F' + Date.now(), name, phone, location, crops, pin,
                         registeredAt: new Date().toISOString(), trustScore: 0, language: Lang.getCurrent() };
        farmers.push(farmer);
        saveFarmers(farmers);
        setSession(farmer);
        return { success: true, message: 'toast.register_success', farmer, pin };
    }

    // ── Login ─────────────────────────────────────────────────────────────

    /**
     * Login with phone + PIN.
     * Tries backend API for token; falls back to localStorage.
     */
    function login(phone, pin) {
        if (!/^\d{10}$/.test(phone)) return { success: false, message: 'toast.error_phone' };
        if (!/^\d{4}$/.test(pin))   return { success: false, message: 'toast.error_pin' };

        // Async backend call to get session token
        fetch(API_BASE + '/api/login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ phone, pin, role: 'farmer' })
        }).then(r => r.json()).then(json => {
            if (json.success && json.data && json.data.token) {
                setToken(json.data.token);
                // Update local session with server data
                setSession(json.data);
            }
        }).catch(() => {}); // silent

        // Synchronous localStorage check for immediate UI response
        const farmers = getFarmers();
        const farmer  = farmers.find(f => f.phone === phone && (String(f.pin) === String(pin) || String(f.password) === String(pin)));
        if (!farmer) return { success: false, message: 'toast.error_login' };
        setSession(farmer);
        return { success: true, message: 'toast.login_success', farmer };
    }

    // ── Logout ────────────────────────────────────────────────────────────

    function logout() {
        // Tell backend to invalidate the token
        const token = getToken();
        if (token) {
            fetch(API_BASE + '/api/auth/logout', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
            }).catch(() => {});
        }
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
    }

    // ── GPS detection ─────────────────────────────────────────────────────

    function detectGPS() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude: lat, longitude: lon } = pos.coords;
                    try {
                        const r = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`,
                            { headers: { 'Accept-Language': 'en' } }
                        );
                        if (r.ok) {
                            const d = await r.json();
                            const a = d.address || {};
                            const village  = a.village  || a.town  || a.city  || '';
                            const district = a.state_district || a.county || a.state || '';
                            resolve([village, district].filter(Boolean).join(', ') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
                        } else resolve(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
                    } catch { resolve(`${lat.toFixed(4)}, ${lon.toFixed(4)}`); }
                },
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    return { register, login, logout, getSession, getToken, setToken, isLoggedIn, detectGPS, apiCall };
})();
