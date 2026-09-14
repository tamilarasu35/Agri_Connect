import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.security.*;
import java.util.*;
import java.util.concurrent.*;

/**
 * Auth.java — Authentication and authorization for AgriConnect API.
 *
 * Provides:
 *  1. SHA-256 PIN hashing  (phone-salted, no plain-text storage)
 *  2. Secure session tokens (64-char hex, SecureRandom)
 *  3. Session lifecycle    (create, validate, invalidate, cleanup)
 *  4. IP-based rate limiting for login endpoint
 *  5. Bearer token extraction from HTTP headers
 *
 * Sessions are stored in data/sessions.csv and cached in memory
 * for fast lookups. Expired sessions are cleaned periodically.
 *
 * Security note: PINs are hashed as SHA-256(phone + ":" + pin).
 * Using the phone as a salt ensures the same PIN produces a
 * different hash for every farmer (no rainbow-table precomputation).
 */
public class Auth {

    // ── Configuration ───────────────────────────────────────────────────────
    static final long   SESSION_TTL_MS      = 24L * 60 * 60 * 1000; // 24 hours
    static final String SESSIONS_FILE       = "data/sessions.csv";
    static final int    RATE_MAX_ATTEMPTS   = 10;                    // per window
    static final long   RATE_WINDOW_MS      = 15L * 60 * 1000;       // 15 minutes

    // ── In-memory stores ────────────────────────────────────────────────────

    // token → [expiresAtMs] (fast validity check without CSV hit)
    private static final ConcurrentHashMap<String, Long> TOKEN_EXPIRY = new ConcurrentHashMap<>();

    // token → {user_id, role} cached from CSV
    private static final ConcurrentHashMap<String, Map<String, String>> TOKEN_DATA = new ConcurrentHashMap<>();

    // IP → list of attempt timestamps (rate limiting)
    private static final ConcurrentHashMap<String, List<Long>> RATE_MAP = new ConcurrentHashMap<>();

    // ── PIN Hashing ─────────────────────────────────────────────────────────

    /**
     * Hash a PIN using SHA-256 with the farmer's phone number as salt.
     * Formula: SHA256(phone + ":" + pin)
     *
     * This prevents rainbow-table attacks and ensures that two farmers
     * with the same PIN have different stored hashes.
     *
     * @return  64-character lowercase hex string (or throws RuntimeException on error)
     */
    public static String hashPin(String phone, String pin) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest((phone + ":" + pin).getBytes("UTF-8"));
            StringBuilder hex = new StringBuilder(64);
            for (byte b : digest) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("PIN hashing failed: " + e.getMessage(), e);
        }
    }

    /**
     * Detect whether a stored PIN value is already hashed (64-char hex)
     * or is a legacy plain-text 4-digit PIN. Used for migration on first login.
     */
    public static boolean isHashed(String pinValue) {
        return pinValue != null
            && pinValue.length() == 64
            && pinValue.matches("[0-9a-f]+");
    }

    // ── Session Tokens ──────────────────────────────────────────────────────

    /**
     * Generate a cryptographically secure 64-character hex token
     * using SecureRandom (not Math.random or UUID).
     */
    public static String generateToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        StringBuilder sb = new StringBuilder(64);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    /**
     * Create a new session for a user. Persists to CSV and caches in memory.
     *
     * @param userId  The farmer or buyer ID (e.g. "F1001", "B1234")
     * @param role    "farmer" | "buyer"
     * @return        The new session token (to be returned to the client)
     */
    public static String createSession(String userId, String role) throws IOException {
        String token     = generateToken();
        long   createdAt = System.currentTimeMillis();
        long   expiresAt = createdAt + SESSION_TTL_MS;

        // Persist to sessions.csv
        CsvStore sessions = new CsvStore(SESSIONS_FILE);
        Map<String, String> row = new LinkedHashMap<>();
        row.put("token",      token);
        row.put("user_id",    userId);
        row.put("role",       role);
        row.put("created_at", String.valueOf(createdAt));
        row.put("expires_at", String.valueOf(expiresAt));
        sessions.append(row);

        // Cache in memory for fast lookups
        TOKEN_EXPIRY.put(token, expiresAt);
        TOKEN_DATA.put(token, Map.of("user_id", userId, "role", role));

        return token;
    }

    /**
     * Validate a session token. Returns the session data map or null if invalid/expired.
     *
     * Fast path: token found in memory cache → no CSV read.
     * Slow path: cache miss → reads sessions.csv.
     */
    public static Map<String, String> validateSession(String token) throws IOException {
        if (token == null || token.isEmpty() || !token.matches("[0-9a-f]{64}")) return null;

        long now = System.currentTimeMillis();

        // Check memory cache first
        Long expiry = TOKEN_EXPIRY.get(token);
        if (expiry != null) {
            if (now > expiry) {
                TOKEN_EXPIRY.remove(token);
                TOKEN_DATA.remove(token);
                return null; // expired
            }
            return TOKEN_DATA.get(token);
        }

        // Cache miss — read from CSV
        CsvStore sessions = new CsvStore(SESSIONS_FILE);
        Map<String, String> session = sessions.findOne("token", token);
        if (session == null) return null;

        long expiresAt = parseLong(session.getOrDefault("expires_at", "0"));
        if (now > expiresAt) {
            sessions.deleteWhere("token", token);
            return null; // expired
        }

        // Re-populate cache
        TOKEN_EXPIRY.put(token, expiresAt);
        Map<String, String> data = new LinkedHashMap<>();
        data.put("user_id", session.getOrDefault("user_id", ""));
        data.put("role",    session.getOrDefault("role",    "farmer"));
        TOKEN_DATA.put(token, data);
        return data;
    }

    /**
     * Invalidate (logout) a session token immediately.
     * Removes from both memory cache and CSV storage.
     */
    public static void invalidateSession(String token) throws IOException {
        TOKEN_EXPIRY.remove(token);
        TOKEN_DATA.remove(token);
        new CsvStore(SESSIONS_FILE).deleteWhere("token", token);
    }

    /**
     * Extract a Bearer token from the HTTP Authorization header.
     * Returns null if the header is absent or not in "Bearer <token>" format.
     */
    public static String extractToken(HttpExchange exchange) {
        String header = exchange.getRequestHeaders().getFirst("Authorization");
        if (header != null && header.startsWith("Bearer "))
            return header.substring(7).trim();
        return null;
    }

    /**
     * Require authentication. Returns the session data map if valid,
     * or null if the request is not authenticated.
     * Callers should return 401 if this returns null.
     */
    public static Map<String, String> requireAuth(HttpExchange exchange) throws IOException {
        String token = extractToken(exchange);
        return validateSession(token);
    }

    /**
     * Clean up expired sessions from both memory cache and CSV file.
     * Should be called periodically (e.g. every 5 minutes via a Timer).
     */
    public static void cleanExpiredSessions() {
        long now = System.currentTimeMillis();

        // Clean memory caches
        TOKEN_EXPIRY.entrySet().removeIf(e -> now > e.getValue());
        TOKEN_DATA.keySet().removeIf(k -> !TOKEN_EXPIRY.containsKey(k));

        // Clean CSV file
        try {
            CsvStore sessions = new CsvStore(SESSIONS_FILE);
            if (!sessions.exists()) return;
            List<Map<String, String>> all = sessions.readAll();
            if (all.isEmpty()) return;
            String header = "token,user_id,role,created_at,expires_at";
            all.removeIf(r -> {
                try { return now > Long.parseLong(r.getOrDefault("expires_at", "0")); }
                catch (Exception ex) { return true; }
            });
            sessions.writeAll(header, all);
        } catch (IOException e) {
            // Non-fatal — will retry next cycle
        }
    }

    // ── Rate Limiting ───────────────────────────────────────────────────────

    /**
     * Get the client's IP address. Prefers X-Forwarded-For for reverse-proxy setups.
     */
    public static String getClientIP(HttpExchange exchange) {
        String forwarded = exchange.getRequestHeaders().getFirst("X-Forwarded-For");
        if (forwarded != null && !forwarded.isEmpty())
            return forwarded.split(",")[0].trim();
        return exchange.getRemoteAddress().getAddress().getHostAddress();
    }

    /**
     * Check whether an IP address has exceeded the login rate limit.
     * Automatically prunes timestamps older than the rate window.
     * @return true if the IP should be blocked
     */
    public static boolean isRateLimited(String ip) {
        long now = System.currentTimeMillis();
        List<Long> attempts = RATE_MAP.computeIfAbsent(ip, k -> new ArrayList<>());
        synchronized (attempts) {
            attempts.removeIf(t -> now - t > RATE_WINDOW_MS);
            return attempts.size() >= RATE_MAX_ATTEMPTS;
        }
    }

    /**
     * Record a login attempt for the given IP address.
     * Call this on every login attempt (success or failure).
     */
    public static void recordAttempt(String ip) {
        List<Long> attempts = RATE_MAP.computeIfAbsent(ip, k -> new ArrayList<>());
        synchronized (attempts) {
            attempts.add(System.currentTimeMillis());
        }
    }

    /**
     * Clear the rate limit for an IP address after a successful login.
     */
    public static void clearRateLimit(String ip) {
        RATE_MAP.remove(ip);
    }

    // ── Internal helpers ────────────────────────────────────────────────────

    private static long parseLong(String s) {
        try { return Long.parseLong(s); } catch (Exception e) { return 0L; }
    }
}
