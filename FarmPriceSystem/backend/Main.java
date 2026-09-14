import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.security.SecureRandom;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.*;

/**
 * Main.java — AgriConnect FarmPriceSystem HTTP Server (Complete Backend)
 *
 * Architecture: Single-binary Java HTTP server using com.sun.net.httpserver
 * Database:     CSV flat-files (data/*.csv) — thread-safe via CsvStore
 * Auth:         Session tokens (64-char hex, 24h TTL) stored in data/sessions.csv
 * Security:     SHA-256 PIN hashing, CORS headers, rate limiting, input sanitization
 * Logging:      Request/error logs written to logs/server.log + logs/error.log
 *
 * API Endpoints (20+):
 *   GET  /api/health
 *   POST /api/register
 *   POST /api/login
 *   POST /api/auth/logout
 *   GET  /api/farmers/me          [AUTH]
 *   PUT  /api/farmers/me          [AUTH]
 *   GET  /api/prices
 *   GET  /api/prices/summary
 *   POST /api/prices/predict
 *   GET  /api/orders              [AUTH optional]
 *   POST /api/orders              [AUTH]
 *   POST /api/orders/update       [AUTH]
 *   DELETE /api/orders            [AUTH]
 *   POST /api/buyers/register
 *   GET  /api/buyers/me           [AUTH]
 *   GET  /api/buyers
 *   GET  /api/trust/score         [AUTH]
 *   POST /api/trust/rate          [AUTH]
 *   POST /api/trust/otp/generate  [AUTH]
 *   POST /api/trust/otp/confirm
 *   GET  /api/reports/transactions [AUTH]
 *   GET  /api/reports/savings      [AUTH]
 *   GET  /api/advisory/top-crops
 *   GET  /api/advisory/festivals
 *   POST /api/advisory/crowd-report [AUTH]
 *
 * Compile:  javac -d out Main.java ApiResponse.java CsvStore.java Auth.java Validator.java
 * Run:      java -cp out Main
 * Access:   http://localhost:8080
 */
public class Main {

    // ── Server configuration ────────────────────────────────────────────────
    static final int    PORT          = 8080;
    static final String FRONTEND_DIR  = "../frontend";
    static final String LANGUAGES_DIR = "../languages";
    static final String DATA_DIR      = "data";
    static final String LOGS_DIR      = "logs";
    static final long   SERVER_START  = System.currentTimeMillis();

    // ── Price cache (refreshed every 60s from prices_cache.csv) ────────────
    static volatile List<Map<String, String>> PRICE_CACHE     = new ArrayList<>();
    static volatile long                      PRICE_CACHE_TIME = 0;
    static final long                         PRICE_CACHE_TTL  = 60_000L;

    // ── In-memory OTP store: orderId → {otpString, expiresAtMs} ───────────
    static final Map<String, String> OTP_VALUES  = new ConcurrentHashMap<>();
    static final Map<String, Long>   OTP_EXPIRY  = new ConcurrentHashMap<>();
    static final long                OTP_TTL_MS  = 5L * 60 * 1000; // 5 minutes

    // ───────────────────────────────────────────────────────────────────────
    // MAIN — Server startup and context registration
    // ───────────────────────────────────────────────────────────────────────
    public static void main(String[] args) throws Exception {
        // Create required directories
        new File(DATA_DIR).mkdirs();
        new File(LOGS_DIR).mkdirs();

        // Load price cache on startup
        refreshPriceCache();

        // Create HTTP server with a 10-thread pool
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 50);
        server.setExecutor(Executors.newFixedThreadPool(10));

        // ── Health ────────────────────────────────────────────────────────
        server.createContext("/api/health",                  new HealthHandler());

        // ── Authentication ────────────────────────────────────────────────
        server.createContext("/api/register",                new RegisterHandler());
        server.createContext("/api/login",                   new LoginHandler());
        server.createContext("/api/auth/logout",             new LogoutHandler());

        // ── Farmers (note: more-specific paths first) ─────────────────────
        server.createContext("/api/farmers/me",              new FarmerMeHandler());

        // ── Prices ────────────────────────────────────────────────────────
        server.createContext("/api/prices/summary",          new PricesSummaryHandler());
        server.createContext("/api/prices/predict",          new PricesPredictHandler());
        server.createContext("/api/prices",                  new PricesHandler());

        // ── Orders ────────────────────────────────────────────────────────
        server.createContext("/api/orders/update",           new UpdateOrderHandler());
        server.createContext("/api/orders",                  new OrdersHandler());

        // ── Buyers ────────────────────────────────────────────────────────
        server.createContext("/api/buyers/register",         new RegisterBuyerHandler());
        server.createContext("/api/buyers/me",               new BuyerMeHandler());
        server.createContext("/api/buyers",                  new BuyersListHandler());

        // ── Trust & OTP ───────────────────────────────────────────────────
        server.createContext("/api/trust/otp/generate",      new OtpGenerateHandler());
        server.createContext("/api/trust/otp/confirm",       new OtpConfirmHandler());
        server.createContext("/api/trust/rate",              new TrustRateHandler());
        server.createContext("/api/trust/score",             new TrustScoreHandler());

        // ── Reports ───────────────────────────────────────────────────────
        server.createContext("/api/reports/transactions",    new ReportsTransactionsHandler());
        server.createContext("/api/reports/savings",         new ReportsSavingsHandler());

        // ── Advisory ─────────────────────────────────────────────────────
        server.createContext("/api/advisory/top-crops",      new AdvisoryTopCropsHandler());
        server.createContext("/api/advisory/festivals",       new AdvisoryFestivalsHandler());
        server.createContext("/api/advisory/crowd-report",   new AdvisoryCrowdReportHandler());

        // ── Static assets ─────────────────────────────────────────────────
        server.createContext("/languages/",                  new LanguageFileHandler());
        server.createContext("/",                            new StaticFileHandler());

        // ── Background maintenance ────────────────────────────────────────
        // Runs every 60s: clean expired sessions, refresh price cache
        new Timer("maintenance", true).scheduleAtFixedRate(new TimerTask() {
            @Override public void run() {
                Auth.cleanExpiredSessions();
                // Clean expired OTPs
                long now = System.currentTimeMillis();
                OTP_EXPIRY.entrySet().removeIf(e -> now > e.getValue());
                OTP_VALUES.keySet().removeIf(k -> !OTP_EXPIRY.containsKey(k));
                // Refresh price cache
                try { refreshPriceCache(); } catch (Exception ignored) {}
            }
        }, 60_000L, 60_000L);

        server.start();
        Logger.info("SERVER", "AgriConnect started on http://localhost:" + PORT);
        System.out.println("===========================================");
        System.out.println("  \uD83C\uDF3E AgriConnect Server started!");
        System.out.println("  \uD83D\uDCE1 http://localhost:" + PORT);
        System.out.println("  \uD83D\uDDC2  Data directory : " + new File(DATA_DIR).getAbsolutePath());
        System.out.println("  \uD83D\uDCC4 Log directory  : " + new File(LOGS_DIR).getAbsolutePath());
        System.out.println("===========================================");
    }

    // ───────────────────────────────────────────────────────────────────────
    // STATIC FILE HANDLER — serves frontend HTML/CSS/JS/images
    // ───────────────────────────────────────────────────────────────────────
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            String path = ex.getRequestURI().getPath();
            if (path.equals("/")) path = "/index.html";
            // Prevent path traversal attacks
            File file = new File(FRONTEND_DIR + path).getCanonicalFile();
            File base = new File(FRONTEND_DIR).getCanonicalFile();
            if (!file.getPath().startsWith(base.getPath())) { send404(ex); return; }
            if (!file.exists() || file.isDirectory()) { send404(ex); return; }

            byte[] bytes = Files.readAllBytes(file.toPath());
            Headers h = ex.getResponseHeaders();
            h.set("Content-Type",              getContentType(file.getName()));
            h.set("Access-Control-Allow-Origin","*");
            h.set("X-Content-Type-Options",    "nosniff");
            h.set("X-Frame-Options",           "SAMEORIGIN");
            // Cache static assets for 1 hour; never cache HTML
            if (file.getName().endsWith(".html"))
                h.set("Cache-Control", "no-cache, no-store, must-revalidate");
            else
                h.set("Cache-Control", "public, max-age=3600");
            ex.sendResponseHeaders(200, bytes.length);
            ex.getResponseBody().write(bytes);
            ex.getResponseBody().close();
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // LANGUAGE FILE HANDLER — serves .properties i18n files
    // ───────────────────────────────────────────────────────────────────────
    static class LanguageFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            String path     = ex.getRequestURI().getPath();
            String filename = path.substring("/languages/".length());
            // Validate: only allow *.properties, no path traversal
            if (!filename.matches("[a-z]+\\.properties")) { send404(ex); return; }
            File file = new File(LANGUAGES_DIR + "/" + filename).getCanonicalFile();
            if (!file.exists()) { send404(ex); return; }

            byte[] bytes = Files.readAllBytes(file.toPath());
            Headers h = ex.getResponseHeaders();
            h.set("Content-Type",               "text/plain; charset=UTF-8");
            h.set("Access-Control-Allow-Origin", "*");
            h.set("Cache-Control",               "public, max-age=300"); // 5-min cache
            ex.sendResponseHeaders(200, bytes.length);
            ex.getResponseBody().write(bytes);
            ex.getResponseBody().close();
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/health — Server health check
    // ───────────────────────────────────────────────────────────────────────
    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            long uptimeSec = (System.currentTimeMillis() - SERVER_START) / 1000;
            try {
                int farmers = new CsvStore(DATA_DIR + "/farmers.csv").count();
                int orders  = new CsvStore(DATA_DIR + "/orders.csv").count();
                String data = "{\"status\":\"ok\",\"uptime_sec\":" + uptimeSec
                            + ",\"farmers\":" + farmers
                            + ",\"orders\":"  + orders
                            + ",\"version\":\"2.0.0\""
                            + ",\"timestamp\":" + ApiResponse.str(now()) + "}";
                sendJSON(ex, 200, ApiResponse.ok(data, "Server is healthy"));
            } catch (Exception e) {
                sendJSON(ex, 200, ApiResponse.ok(
                    "{\"status\":\"ok\",\"uptime_sec\":" + uptimeSec + "}", "Server is running"));
            }
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/register — Farmer registration
    // ───────────────────────────────────────────────────────────────────────
    static class RegisterHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "POST")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            long t0 = System.currentTimeMillis();
            Map<String, String> p = readBody(ex);

            // ── Input validation
            String name     = Validator.sanitizeName(p.getOrDefault("name", ""));
            String phone    = p.getOrDefault("phone", "").trim();
            String location = Validator.sanitize(p.getOrDefault("location", ""));
            String crops    = Validator.sanitize(p.getOrDefault("crops", ""));
            String language = p.getOrDefault("language", "english").toLowerCase().trim();

            String err;
            if ((err = Validator.validateName(name))     != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }
            if ((err = Validator.validatePhone(phone))   != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }
            if ((err = Validator.validateLocation(location)) != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }
            if (crops.isEmpty()) { sendJSON(ex, 400, ApiResponse.validationError("Select at least one crop")); return; }
            if (!Validator.ALLOWED_LANGUAGES.contains(language)) language = "english";

            // ── Check for existing farmer (update profile if returning)
            CsvStore farmers = new CsvStore(DATA_DIR + "/farmers.csv");
            Map<String, String> existing = farmers.findOne("phone", phone);

            String id, pin, hashedPin, token;
            boolean isNew;

            if (existing != null) {
                // Returning farmer — update profile (name, location, crops, language)
                id        = existing.get("id");
                hashedPin = existing.get("pin");
                isNew     = false;
                Map<String, String> updates = new LinkedHashMap<>();
                updates.put("name",     name);
                updates.put("location", location);
                updates.put("crops",    crops);
                updates.put("language", language);
                farmers.updateWhere("id", id, updates);
                pin = null; // don't reveal existing PIN
            } else {
                // New farmer — generate PIN and hash it
                pin = String.format("%04d", new Random().nextInt(10000));
                hashedPin = Auth.hashPin(phone, pin);
                id  = "F" + System.currentTimeMillis();
                isNew = true;

                Map<String, String> row = new LinkedHashMap<>();
                row.put("id",           id);
                row.put("name",         name);
                row.put("phone",        phone);
                row.put("location",     location);
                row.put("crops",        crops);
                row.put("pin",          hashedPin);
                row.put("registeredAt", now());
                row.put("language",     language);
                row.put("trustScore",   "0");
                farmers.append(row);
            }

            // ── Create session token
            token = Auth.createSession(id, "farmer");

            // ── Log registration (no PIN in log)
            Logger.info("REGISTER", "farmer=" + id + " phone=" + phone + " new=" + isNew);

            // ── Build response
            String data = "{\"id\":"     + ApiResponse.str(id)
                        + ",\"name\":"   + ApiResponse.str(name)
                        + ",\"phone\":"  + ApiResponse.str(phone)
                        + ",\"token\":"  + ApiResponse.str(token)
                        + ",\"isNew\":"  + isNew
                        + (isNew && pin != null ? ",\"pin\":" + ApiResponse.str(pin) : "")
                        + "}";
            sendJSON(ex, isNew ? 201 : 200,
                ApiResponse.ok(data, isNew ? "Registration successful" : "Profile updated"));
            Logger.logRequest("POST", "/api/register", isNew ? 201 : 200, t0);
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/login — Farmer/Buyer login with rate limiting
    // ───────────────────────────────────────────────────────────────────────
    static class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "POST")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            long   t0  = System.currentTimeMillis();
            String ip  = Auth.getClientIP(ex);

            // ── Rate limit check
            if (Auth.isRateLimited(ip)) {
                Logger.warn("RATE_LIMIT", "ip=" + ip + " blocked login");
                sendJSON(ex, 429, ApiResponse.rateLimitError());
                return;
            }

            Map<String, String> p    = readBody(ex);
            String phone = p.getOrDefault("phone", "").trim();
            String pin   = p.getOrDefault("pin",   "").trim();
            String role  = p.getOrDefault("role",  "farmer").toLowerCase().trim();

            // ── Validate inputs
            String err;
            if ((err = Validator.validatePhone(phone)) != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }
            if ((err = Validator.validatePin(pin))     != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }

            Auth.recordAttempt(ip);

            // ── Look up in the appropriate CSV
            String csvPath = "buyer".equals(role) ? DATA_DIR + "/buyers.csv" : DATA_DIR + "/farmers.csv";
            CsvStore store = new CsvStore(csvPath);
            Map<String, String> user = store.findOne("phone", phone);

            if (user == null) {
                Logger.warn("LOGIN_FAIL", "phone=" + phone + " reason=not_found ip=" + ip);
                sendJSON(ex, 401, ApiResponse.unauthorized("Invalid phone number or PIN"));
                return;
            }

            // ── PIN verification (with legacy plain-text migration)
            String storedPin = user.get("pin");
            boolean pinMatch;
            if (Auth.isHashed(storedPin)) {
                // Modern path: compare hashes
                pinMatch = Auth.hashPin(phone, pin).equals(storedPin);
            } else {
                // Legacy path: plain-text PIN (migrate to hash on success)
                pinMatch = pin.equals(storedPin);
                if (pinMatch) {
                    // Migrate to hashed PIN transparently
                    store.updateWhere("phone", phone,
                        Map.of("pin", Auth.hashPin(phone, pin)));
                    Logger.info("PIN_MIGRATE", "phone=" + phone + " migrated to hashed PIN");
                }
            }

            if (!pinMatch) {
                Logger.warn("LOGIN_FAIL", "phone=" + phone + " reason=wrong_pin ip=" + ip);
                sendJSON(ex, 401, ApiResponse.unauthorized("Invalid phone number or PIN"));
                return;
            }

            // ── Successful login
            Auth.clearRateLimit(ip);
            String id    = user.get("id");
            String token = Auth.createSession(id, "buyer".equals(role) ? "buyer" : "farmer");
            Logger.info("LOGIN_OK", "id=" + id + " role=" + role + " ip=" + ip);

            String data = "{\"id\":"       + ApiResponse.str(id)
                        + ",\"name\":"     + ApiResponse.str(user.getOrDefault("name", ""))
                        + ",\"phone\":"    + ApiResponse.str(phone)
                        + ",\"location\":" + ApiResponse.str(user.getOrDefault("location", ""))
                        + ",\"role\":"     + ApiResponse.str("buyer".equals(role) ? "buyer" : "farmer")
                        + ",\"token\":"    + ApiResponse.str(token)
                        + ",\"language\":" + ApiResponse.str(user.getOrDefault("language", "english"))
                        + "}";
            sendJSON(ex, 200, ApiResponse.ok(data, "Login successful"));
            Logger.logRequest("POST", "/api/login", 200, t0);
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/auth/logout — Invalidate session token
    // ───────────────────────────────────────────────────────────────────────
    static class LogoutHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "POST")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }
            String token = Auth.extractToken(ex);
            if (token != null) Auth.invalidateSession(token);
            sendJSON(ex, 200, ApiResponse.okNull("Logged out successfully"));
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/farmers/me   — Get farmer profile  [AUTH]
    // PUT /api/farmers/me   — Update farmer profile [AUTH]
    // ───────────────────────────────────────────────────────────────────────
    static class FarmerMeHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            long t0 = System.currentTimeMillis();

            Map<String, String> session = Auth.requireAuth(ex);
            if (session == null) { sendJSON(ex, 401, ApiResponse.unauthorized("Login required")); return; }

            String userId = session.get("user_id");
            CsvStore farmers = new CsvStore(DATA_DIR + "/farmers.csv");

            if (isMethod(ex, "GET")) {
                Map<String, String> farmer = farmers.findOne("id", userId);
                if (farmer == null) { sendJSON(ex, 404, ApiResponse.notFound("Farmer")); return; }
                // Never expose the hashed PIN in the response
                farmer.remove("pin");
                sendJSON(ex, 200, ApiResponse.ok(CsvStore.mapToJSON(farmer), "Profile loaded"));
                Logger.logRequest("GET", "/api/farmers/me", 200, t0);

            } else if (isMethod(ex, "PUT")) {
                Map<String, String> p = readBody(ex);
                Map<String, String> updates = new LinkedHashMap<>();
                // Only update fields that were provided
                if (!p.getOrDefault("name",     "").isEmpty()) updates.put("name",     Validator.sanitizeName(p.get("name")));
                if (!p.getOrDefault("location", "").isEmpty()) updates.put("location", Validator.sanitize(p.get("location")));
                if (!p.getOrDefault("crops",    "").isEmpty()) updates.put("crops",    Validator.sanitize(p.get("crops")));
                if (!p.getOrDefault("language", "").isEmpty()) updates.put("language", Validator.sanitize(p.get("language")));

                if (updates.isEmpty()) { sendJSON(ex, 400, ApiResponse.validationError("No fields to update")); return; }

                boolean updated = farmers.updateWhere("id", userId, updates);
                if (!updated) { sendJSON(ex, 404, ApiResponse.notFound("Farmer")); return; }

                Map<String, String> farmer = farmers.findOne("id", userId);
                if (farmer != null) farmer.remove("pin");
                sendJSON(ex, 200, ApiResponse.ok(farmer != null ? CsvStore.mapToJSON(farmer) : "{}", "Profile updated"));
                Logger.logRequest("PUT", "/api/farmers/me", 200, t0);
            } else {
                sendJSON(ex, 405, ApiResponse.methodNotAllowed());
            }
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/prices — Query price for a specific crop + mandi + quantity
    // ───────────────────────────────────────────────────────────────────────
    static class PricesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "GET")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            long t0 = System.currentTimeMillis();
            Map<String, String> q = Validator.parseQuery(ex.getRequestURI().getQuery());
            String crop  = q.getOrDefault("crop",  "").trim();
            String mandi = q.getOrDefault("mandi", "").trim();
            String qtyStr= q.getOrDefault("qty",   "1").trim();

            if (crop.isEmpty() || mandi.isEmpty()) {
                sendJSON(ex, 400, ApiResponse.validationError("Both 'crop' and 'mandi' query params are required"));
                return;
            }

            // Find matching price record from cache
            Map<String, String> found = null;
            for (Map<String, String> row : getOrRefreshPriceCache()) {
                if (crop.equalsIgnoreCase(row.getOrDefault("crop", ""))
                 && mandi.equalsIgnoreCase(row.getOrDefault("mandi", ""))) {
                    found = row;
                    break;
                }
            }

            if (found == null) {
                sendJSON(ex, 404, ApiResponse.notFound("Price data for " + crop + " at " + mandi));
                return;
            }

            // Calculate total for given quantity
            double qty      = parseDouble(qtyStr, 1.0);
            double modal    = parseDouble(found.getOrDefault("modal_price","0"), 0);
            double total    = modal * qty;
            double min      = parseDouble(found.getOrDefault("min_price","0"), 0);
            double max      = parseDouble(found.getOrDefault("max_price","0"), 0);

            String data = "{"
                + "\"crop\":"        + ApiResponse.str(found.get("crop"))
                + ",\"mandi\":"      + ApiResponse.str(found.get("mandi"))
                + ",\"min_price\":"  + min
                + ",\"max_price\":"  + max
                + ",\"modal_price\":" + modal
                + ",\"quantity\":"   + qty
                + ",\"total\":"      + String.format("%.2f", total)
                + ",\"date\":"       + ApiResponse.str(found.getOrDefault("date", today()))
                + "}";
            sendJSON(ex, 200, ApiResponse.ok(data, "Price fetched successfully"));
            Logger.logRequest("GET", "/api/prices", 200, t0);
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/prices/summary — All crops at a selected mandi
    // ───────────────────────────────────────────────────────────────────────
    static class PricesSummaryHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "GET")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            long t0 = System.currentTimeMillis();
            Map<String, String> q = Validator.parseQuery(ex.getRequestURI().getQuery());
            String mandi = q.getOrDefault("mandi", "Coimbatore").trim();

            List<Map<String, String>> prices = getOrRefreshPriceCache();
            // Group by crop, pick the requested mandi or first available
            Map<String, Map<String, String>> byCrop = new LinkedHashMap<>();
            for (Map<String, String> row : prices) {
                String c = row.getOrDefault("crop", "");
                String m = row.getOrDefault("mandi", "");
                if (!byCrop.containsKey(c) || mandi.equalsIgnoreCase(m))
                    byCrop.put(c, row);
            }

            StringBuilder arr = new StringBuilder("[");
            boolean first = true;
            for (Map<String, String> row : byCrop.values()) {
                if (!first) arr.append(",");
                double min   = parseDouble(row.getOrDefault("min_price",   "0"), 0);
                double max   = parseDouble(row.getOrDefault("max_price",   "0"), 0);
                double modal = parseDouble(row.getOrDefault("modal_price", "0"), 0);
                // Compute trend vs simulated yesterday (modal ± 5%)
                double yesterday = modal * (0.92 + Math.random() * 0.16);
                String trend = modal > yesterday ? "up" : modal < yesterday ? "down" : "stable";
                arr.append("{\"crop\":"   + ApiResponse.str(row.get("crop"))
                         + ",\"mandi\":"  + ApiResponse.str(row.get("mandi"))
                         + ",\"min\":"    + min
                         + ",\"max\":"    + max
                         + ",\"modal\":"  + modal
                         + ",\"trend\":"  + ApiResponse.str(trend) + "}");
                first = false;
            }
            arr.append("]");
            sendJSON(ex, 200, ApiResponse.ok(arr.toString(), "Price summary loaded"));
            Logger.logRequest("GET", "/api/prices/summary", 200, t0);
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/prices/predict — Simple linear price prediction for tomorrow
    // ───────────────────────────────────────────────────────────────────────
    static class PricesPredictHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "POST")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            long t0 = System.currentTimeMillis();
            Map<String, String> p = readBody(ex);
            String crop  = Validator.sanitize(p.getOrDefault("crop",  "")).trim();
            String mandi = Validator.sanitize(p.getOrDefault("mandi", "")).trim();
            if (crop.isEmpty() || mandi.isEmpty()) {
                sendJSON(ex, 400, ApiResponse.validationError("crop and mandi are required"));
                return;
            }

            // Fetch price history from CSV for linear regression
            CsvStore history = new CsvStore(DATA_DIR + "/price_history.csv");
            List<Map<String, String>> rows = history.findAll("crop", crop);

            double currentModal = 0;
            for (Map<String, String> row : getOrRefreshPriceCache()) {
                if (crop.equalsIgnoreCase(row.get("crop")) && mandi.equalsIgnoreCase(row.get("mandi")))
                    currentModal = parseDouble(row.get("modal_price"), 0);
            }

            // Simple prediction: moving average of last 7 days ± festival boost
            double predicted;
            double confidence;
            String trend;
            if (rows.size() >= 3) {
                double sum = 0;
                int cnt = Math.min(rows.size(), 7);
                List<Map<String, String>> recent = rows.subList(Math.max(0, rows.size()-cnt), rows.size());
                for (Map<String, String> r : recent)
                    sum += parseDouble(r.getOrDefault("modal_price", "0"), 0);
                double avg = sum / recent.size();
                // Trend: compare last 3 vs first 3 of the window
                double early = parseDouble(recent.get(0).getOrDefault("modal_price","0"), 0);
                double late  = parseDouble(recent.get(recent.size()-1).getOrDefault("modal_price","0"), 0);
                double slope = (late - early) / recent.size();
                predicted  = Math.max(0, avg + slope);
                confidence = Math.min(92, 60 + rows.size() * 4);
                trend      = slope > 0.5 ? "up" : slope < -0.5 ? "down" : "stable";
            } else {
                // Insufficient history — simulate a slight rise
                predicted  = currentModal > 0 ? currentModal * 1.03 : 20;
                confidence = 55;
                trend      = "stable";
            }

            String data = "{"
                + "\"crop\":"        + ApiResponse.str(crop)
                + ",\"mandi\":"      + ApiResponse.str(mandi)
                + ",\"current\":"    + String.format("%.2f", currentModal)
                + ",\"predicted\":"  + String.format("%.2f", predicted)
                + ",\"trend\":"      + ApiResponse.str(trend)
                + ",\"confidence\":" + String.format("%.0f", confidence)
                + ",\"advice\":"     + ApiResponse.str(generateAdvice(trend, predicted, currentModal))
                + "}";
            sendJSON(ex, 200, ApiResponse.ok(data, "Prediction generated"));
            Logger.logRequest("POST", "/api/prices/predict", 200, t0);
        }

        private String generateAdvice(String trend, double pred, double current) {
            if ("up".equals(trend))
                return "Prices are rising. Consider waiting 1-2 days before selling.";
            if ("down".equals(trend))
                return "Prices may fall. Consider selling today at the current rate.";
            return "Prices are stable. Sell when convenient.";
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET  /api/orders — List orders (paginated, filterable) [AUTH optional]
    // POST /api/orders — Create a new trade listing          [AUTH]
    // DELETE /api/orders — Cancel/delete an order           [AUTH]
    // ───────────────────────────────────────────────────────────────────────
    static class OrdersHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            long t0 = System.currentTimeMillis();
            CsvStore orders = new CsvStore(DATA_DIR + "/orders.csv");

            // ── GET — List orders ─────────────────────────────────────────
            if (isMethod(ex, "GET")) {
                Map<String, String> q      = Validator.parseQuery(ex.getRequestURI().getQuery());
                int[]  pg          = Validator.parsePagination(q.get("page"), q.get("limit"));
                String filterFarmer = q.getOrDefault("farmer_id", "");
                String filterBuyer  = q.getOrDefault("buyer_id",  "");
                String filterStatus = q.getOrDefault("status",    "");
                String filterCrop   = q.getOrDefault("crop",      "");

                List<Map<String, String>> all = orders.readAll();
                // Apply filters
                List<Map<String, String>> filtered = new ArrayList<>();
                for (Map<String, String> row : all) {
                    if (!filterFarmer.isEmpty() && !filterFarmer.equals(row.get("farmer_id"))) continue;
                    if (!filterBuyer.isEmpty()  && !filterBuyer.equals(row.get("buyer_id")))   continue;
                    if (!filterStatus.isEmpty() && !filterStatus.equalsIgnoreCase(row.get("status"))) continue;
                    if (!filterCrop.isEmpty()   && !filterCrop.equalsIgnoreCase(row.get("crop")))     continue;
                    filtered.add(row);
                }
                int total = filtered.size();
                int from  = (pg[0] - 1) * pg[1];
                int to    = Math.min(from + pg[1], total);
                List<Map<String, String>> page = from < total ? filtered.subList(from, to) : new ArrayList<>();

                sendJSON(ex, 200, ApiResponse.okPaged(CsvStore.listToJSON(page), total, pg[0], pg[1]));
                Logger.logRequest("GET", "/api/orders", 200, t0);

            // ── POST — Create order ───────────────────────────────────────
            } else if (isMethod(ex, "POST")) {
                Map<String, String> session = Auth.requireAuth(ex);
                if (session == null) { sendJSON(ex, 401, ApiResponse.unauthorized("Login required to post listings")); return; }

                Map<String, String> p = readBody(ex);
                String farmerId   = session.get("user_id");
                String crop       = Validator.sanitize(p.getOrDefault("crop",       "")).trim();
                String variety    = Validator.sanitize(p.getOrDefault("variety",    "")).trim();
                String qtyStr     = p.getOrDefault("quantity_kg",  "").trim();
                String priceStr   = p.getOrDefault("price_per_kg", "").trim();
                String mandi      = Validator.sanitize(p.getOrDefault("mandi",      "")).trim();
                String grade      = Validator.sanitize(p.getOrDefault("grade",      "Grade A"));
                String payment    = Validator.sanitize(p.getOrDefault("payment",    "Cash"));
                String transport  = Validator.sanitize(p.getOrDefault("transport",  "Farmer delivers"));

                String err;
                if ((err = Validator.validateQuantity(qtyStr)) != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }
                if ((err = Validator.validatePrice(priceStr))  != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }
                if (crop.isEmpty()) { sendJSON(ex, 400, ApiResponse.validationError("Crop is required")); return; }
                if (mandi.isEmpty()) { sendJSON(ex, 400, ApiResponse.validationError("Mandi is required")); return; }

                double qty   = parseDouble(qtyStr,   0);
                double price = parseDouble(priceStr, 0);
                double total = qty * price;

                String orderId = "ORD" + (100000 + new Random().nextInt(900000));
                Map<String, String> row = new LinkedHashMap<>();
                row.put("order_id",    orderId);
                row.put("farmer_id",   farmerId);
                row.put("crop",        crop);
                row.put("variety",     variety);
                row.put("quantity_kg", qtyStr);
                row.put("price_per_kg",priceStr);
                row.put("total",       String.format("%.2f", total));
                row.put("mandi",       mandi);
                row.put("status",      "listed");
                row.put("date",        today());
                row.put("grade",       grade);
                row.put("payment",     payment);
                row.put("transport",   transport);
                row.put("buyer_id",    "");
                orders.append(row);

                String data = "{\"order_id\":" + ApiResponse.str(orderId)
                            + ",\"total\":"    + String.format("%.2f", total) + "}";
                sendJSON(ex, 201, ApiResponse.ok(data, "Order created successfully"));
                Logger.logRequest("POST", "/api/orders", 201, t0);

            // ── DELETE — Cancel an order ──────────────────────────────────
            } else if (isMethod(ex, "DELETE")) {
                Map<String, String> session = Auth.requireAuth(ex);
                if (session == null) { sendJSON(ex, 401, ApiResponse.unauthorized("Login required")); return; }

                Map<String, String> q = Validator.parseQuery(ex.getRequestURI().getQuery());
                String orderId  = q.getOrDefault("order_id", "").trim();
                if (orderId.isEmpty()) { sendJSON(ex, 400, ApiResponse.validationError("order_id is required")); return; }

                Map<String, String> order = orders.findOne("order_id", orderId);
                if (order == null) { sendJSON(ex, 404, ApiResponse.notFound("Order " + orderId)); return; }

                // Farmers may only cancel their own orders
                String userId = session.get("user_id");
                if (!userId.equals(order.get("farmer_id")) && !userId.equals(order.get("buyer_id"))) {
                    sendJSON(ex, 403, ApiResponse.forbidden("You can only cancel your own orders")); return;
                }
                orders.updateWhere("order_id", orderId, Map.of("status", "cancelled"));
                sendJSON(ex, 200, ApiResponse.okNull("Order cancelled"));
                Logger.logRequest("DELETE", "/api/orders?order_id=" + orderId, 200, t0);
            } else {
                sendJSON(ex, 405, ApiResponse.methodNotAllowed());
            }
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/orders/update — Update order status + buyer assignment [AUTH]
    // ───────────────────────────────────────────────────────────────────────
    static class UpdateOrderHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "POST")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            long t0 = System.currentTimeMillis();
            Map<String, String> session = Auth.requireAuth(ex);
            if (session == null) { sendJSON(ex, 401, ApiResponse.unauthorized("Login required")); return; }

            Map<String, String> p     = readBody(ex);
            String orderId  = Validator.sanitize(p.getOrDefault("order_id", "")).trim();
            String status   = Validator.sanitize(p.getOrDefault("status",   "")).trim();
            String buyerId  = Validator.sanitize(p.getOrDefault("buyer_id", "")).trim();

            if (orderId.isEmpty() || status.isEmpty()) {
                sendJSON(ex, 400, ApiResponse.validationError("order_id and status are required")); return;
            }
            String err = Validator.validateStatus(status);
            if (err != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }

            CsvStore orders = new CsvStore(DATA_DIR + "/orders.csv");
            Map<String, String> order = orders.findOne("order_id", orderId);
            if (order == null) { sendJSON(ex, 404, ApiResponse.notFound("Order " + orderId)); return; }

            Map<String, String> updates = new LinkedHashMap<>();
            updates.put("status", status);
            if (!buyerId.isEmpty()) updates.put("buyer_id", buyerId);
            orders.updateWhere("order_id", orderId, updates);

            sendJSON(ex, 200, ApiResponse.okNull("Order updated to " + status));
            Logger.logRequest("POST", "/api/orders/update", 200, t0);
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/buyers/register — Register a buyer account
    // ───────────────────────────────────────────────────────────────────────
    static class RegisterBuyerHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "POST")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            long t0 = System.currentTimeMillis();
            Map<String, String> p = readBody(ex);

            String name         = Validator.sanitizeName(p.getOrDefault("name",         ""));
            String phone        = p.getOrDefault("phone",        "").trim();
            String location     = Validator.sanitize(p.getOrDefault("location",     ""));
            String businessType = Validator.sanitize(p.getOrDefault("businessType", "")).toLowerCase().trim();
            String address      = Validator.sanitize(p.getOrDefault("address",      ""));
            String language     = p.getOrDefault("language", "english").toLowerCase().trim();

            String err;
            if ((err = Validator.validateName(name))     != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }
            if ((err = Validator.validatePhone(phone))   != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }
            if ((err = Validator.validateLocation(location)) != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }
            if (address.isEmpty()) { sendJSON(ex, 400, ApiResponse.validationError("Business address is required")); return; }
            if (businessType.isEmpty()) { sendJSON(ex, 400, ApiResponse.validationError("Business type is required")); return; }

            CsvStore buyers = new CsvStore(DATA_DIR + "/buyers.csv");
            Map<String, String> existing = buyers.findOne("phone", phone);

            String id, pin, hashedPin, token;
            boolean isNew;

            if (existing != null) {
                id        = existing.get("id");
                hashedPin = existing.get("pin");
                isNew     = false;
                buyers.updateWhere("phone", phone,
                    Map.of("name", name, "location", location, "businessType", businessType, "address", address));
                pin = null;
            } else {
                pin = String.format("%04d", new Random().nextInt(10000));
                hashedPin = Auth.hashPin(phone, pin);
                id = "B" + System.currentTimeMillis();
                isNew = true;

                Map<String, String> row = new LinkedHashMap<>();
                row.put("id",           id);
                row.put("name",         name);
                row.put("phone",        phone);
                row.put("location",     location);
                row.put("businessType", businessType);
                row.put("pin",          hashedPin);
                row.put("registeredAt", now());
                row.put("language",     language);
                row.put("trustScore",   "80");
                row.put("address",      address);
                buyers.append(row);
            }

            token = Auth.createSession(id, "buyer");
            Logger.info("BUYER_REGISTER", "id=" + id + " phone=" + phone + " new=" + isNew);

            String data = "{\"id\":"           + ApiResponse.str(id)
                        + ",\"name\":"         + ApiResponse.str(name)
                        + ",\"phone\":"        + ApiResponse.str(phone)
                        + ",\"businessType\":" + ApiResponse.str(businessType)
                        + ",\"token\":"        + ApiResponse.str(token)
                        + ",\"isNew\":"        + isNew
                        + (isNew && pin != null ? ",\"pin\":" + ApiResponse.str(pin) : "")
                        + "}";
            sendJSON(ex, isNew ? 201 : 200,
                ApiResponse.ok(data, isNew ? "Buyer registered" : "Profile updated"));
            Logger.logRequest("POST", "/api/buyers/register", isNew ? 201 : 200, t0);
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/buyers/me — Get current buyer's profile [AUTH]
    // ───────────────────────────────────────────────────────────────────────
    static class BuyerMeHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "GET")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }
            Map<String, String> session = Auth.requireAuth(ex);
            if (session == null) { sendJSON(ex, 401, ApiResponse.unauthorized("Login required")); return; }
            Map<String, String> buyer = new CsvStore(DATA_DIR + "/buyers.csv").findOne("id", session.get("user_id"));
            if (buyer == null) { sendJSON(ex, 404, ApiResponse.notFound("Buyer")); return; }
            buyer.remove("pin");
            sendJSON(ex, 200, ApiResponse.ok(CsvStore.mapToJSON(buyer), "Buyer profile loaded"));
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/buyers — List all registered buyers (for trade page browse)
    // ───────────────────────────────────────────────────────────────────────
    static class BuyersListHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "GET")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            Map<String, String> q = Validator.parseQuery(ex.getRequestURI().getQuery());
            int[] pg = Validator.parsePagination(q.get("page"), q.get("limit"));

            List<Map<String, String>> buyers = new CsvStore(DATA_DIR + "/buyers.csv").readAll();
            // Strip sensitive PIN field from all records
            buyers.forEach(b -> b.remove("pin"));

            int total = buyers.size();
            int from  = (pg[0]-1)*pg[1], to = Math.min(from+pg[1], total);
            List<Map<String, String>> page = from < total ? buyers.subList(from, to) : new ArrayList<>();
            sendJSON(ex, 200, ApiResponse.okPaged(CsvStore.listToJSON(page), total, pg[0], pg[1]));
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/trust/score — Get farmer's trust score [AUTH]
    // ───────────────────────────────────────────────────────────────────────
    static class TrustScoreHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "GET")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            Map<String, String> session = Auth.requireAuth(ex);
            // Allow unauthenticated with explicit farmer_id param
            Map<String, String> q = Validator.parseQuery(ex.getRequestURI().getQuery());
            String userId = q.getOrDefault("farmer_id", session != null ? session.get("user_id") : "");
            if (userId.isEmpty()) { sendJSON(ex, 401, ApiResponse.unauthorized("Login or farmer_id required")); return; }

            CsvStore farmers = new CsvStore(DATA_DIR + "/farmers.csv");
            Map<String, String> farmer = farmers.findOne("id", userId);

            if (farmer == null) {
                // Try buyers
                farmer = new CsvStore(DATA_DIR + "/buyers.csv").findOne("id", userId);
            }
            if (farmer == null) { sendJSON(ex, 404, ApiResponse.notFound("User")); return; }

            // Count completed orders for this farmer
            int completed  = new CsvStore(DATA_DIR + "/orders.csv").findAll("farmer_id", userId)
                .stream().filter(o -> "completed".equals(o.get("status"))).mapToInt(o -> 1).sum();
            int pending    = new CsvStore(DATA_DIR + "/orders.csv").countWhere("farmer_id", userId);
            double score   = parseDouble(farmer.getOrDefault("trustScore", "0"), 0);

            String data = "{"
                + "\"user_id\":"      + ApiResponse.str(userId)
                + ",\"name\":"        + ApiResponse.str(farmer.getOrDefault("name",""))
                + ",\"score\":"       + score
                + ",\"completed\":"   + completed
                + ",\"total_orders\":" + pending
                + ",\"level\":"       + ApiResponse.str(score>=90?"Gold":score>=70?"Silver":"Bronze")
                + "}";
            sendJSON(ex, 200, ApiResponse.ok(data, "Trust score loaded"));
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/trust/rate — Submit a rating for a farmer [AUTH]
    // ───────────────────────────────────────────────────────────────────────
    static class TrustRateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "POST")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            Map<String, String> session = Auth.requireAuth(ex);
            if (session == null) { sendJSON(ex, 401, ApiResponse.unauthorized("Login required")); return; }

            Map<String, String> p = readBody(ex);
            String farmerId = Validator.sanitize(p.getOrDefault("farmer_id", "")).trim();
            String ratingStr= p.getOrDefault("rating", "").trim();
            String comment  = Validator.sanitize(p.getOrDefault("comment",  ""));

            if (farmerId.isEmpty()) { sendJSON(ex, 400, ApiResponse.validationError("farmer_id is required")); return; }
            int rating;
            try {
                rating = Integer.parseInt(ratingStr);
                if (rating < 1 || rating > 5) throw new NumberFormatException();
            } catch (NumberFormatException e) {
                sendJSON(ex, 400, ApiResponse.validationError("Rating must be 1-5")); return;
            }

            // Update farmer's trustScore (simple weighted average: new = 0.8*old + 0.2*new*20)
            CsvStore farmers = new CsvStore(DATA_DIR + "/farmers.csv");
            Map<String, String> farmer = farmers.findOne("id", farmerId);
            if (farmer == null) { sendJSON(ex, 404, ApiResponse.notFound("Farmer")); return; }

            double oldScore = parseDouble(farmer.getOrDefault("trustScore", "50"), 50);
            double newScore = (oldScore * 0.8) + (rating * 20 * 0.2);
            newScore = Math.min(100, Math.max(0, newScore));
            farmers.updateWhere("id", farmerId, Map.of("trustScore", String.format("%.0f", newScore)));

            // Log the rating (not to log file — to a ratings CSV)
            CsvStore ratings = new CsvStore(DATA_DIR + "/ratings.csv");
            Map<String, String> rRow = new LinkedHashMap<>();
            rRow.put("farmer_id",  farmerId);
            rRow.put("rater_id",   session.get("user_id"));
            rRow.put("rating",     String.valueOf(rating));
            rRow.put("comment",    comment);
            rRow.put("created_at", now());
            ratings.append(rRow);

            sendJSON(ex, 200, ApiResponse.ok(
                "{\"new_score\":" + String.format("%.0f", newScore) + "}",
                "Rating submitted"));
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/trust/otp/generate — Generate delivery OTP for an order [AUTH]
    // ───────────────────────────────────────────────────────────────────────
    static class OtpGenerateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "POST")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            Map<String, String> session = Auth.requireAuth(ex);
            if (session == null) { sendJSON(ex, 401, ApiResponse.unauthorized("Login required")); return; }

            Map<String, String> p = readBody(ex);
            String orderId = Validator.sanitize(p.getOrDefault("order_id", "")).trim();
            if (orderId.isEmpty()) { sendJSON(ex, 400, ApiResponse.validationError("order_id is required")); return; }

            // Verify the order belongs to this farmer
            Map<String, String> order = new CsvStore(DATA_DIR + "/orders.csv").findOne("order_id", orderId);
            if (order == null) { sendJSON(ex, 404, ApiResponse.notFound("Order")); return; }
            if (!session.get("user_id").equals(order.get("farmer_id"))) {
                sendJSON(ex, 403, ApiResponse.forbidden("Only the farmer can generate an OTP")); return;
            }

            // Generate and store a 4-digit OTP
            String otp = String.format("%04d", new SecureRandom().nextInt(10000));
            OTP_VALUES.put(orderId, otp);
            OTP_EXPIRY.put(orderId, System.currentTimeMillis() + OTP_TTL_MS);

            sendJSON(ex, 200, ApiResponse.ok(
                "{\"order_id\":" + ApiResponse.str(orderId) + ",\"otp\":" + ApiResponse.str(otp) + "}",
                "OTP generated (valid for 5 minutes)"));
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/trust/otp/confirm — Buyer confirms delivery with OTP
    // ───────────────────────────────────────────────────────────────────────
    static class OtpConfirmHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "POST")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            Map<String, String> p = readBody(ex);
            String orderId = Validator.sanitize(p.getOrDefault("order_id", "")).trim();
            String otp     = Validator.sanitize(p.getOrDefault("otp",      "")).trim();

            if (orderId.isEmpty() || otp.isEmpty()) {
                sendJSON(ex, 400, ApiResponse.validationError("order_id and otp are required")); return;
            }

            // Check OTP expiry
            Long expiry = OTP_EXPIRY.get(orderId);
            if (expiry == null || System.currentTimeMillis() > expiry) {
                OTP_VALUES.remove(orderId);
                OTP_EXPIRY.remove(orderId);
                sendJSON(ex, 400, ApiResponse.error("OTP has expired. Generate a new one.", "OTP_EXPIRED")); return;
            }

            String expected = OTP_VALUES.get(orderId);
            if (!otp.equals(expected)) {
                sendJSON(ex, 400, ApiResponse.error("Incorrect OTP", "OTP_INVALID")); return;
            }

            // Mark order as completed
            new CsvStore(DATA_DIR + "/orders.csv")
                .updateWhere("order_id", orderId, Map.of("status", "completed"));
            OTP_VALUES.remove(orderId);
            OTP_EXPIRY.remove(orderId);

            sendJSON(ex, 200, ApiResponse.okNull("Delivery confirmed. Order marked as completed."));
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/reports/transactions — Transaction history [AUTH]
    // ───────────────────────────────────────────────────────────────────────
    static class ReportsTransactionsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "GET")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            Map<String, String> session = Auth.requireAuth(ex);
            if (session == null) { sendJSON(ex, 401, ApiResponse.unauthorized("Login required")); return; }

            Map<String, String> q  = Validator.parseQuery(ex.getRequestURI().getQuery());
            int[] pg = Validator.parsePagination(q.get("page"), q.get("limit"));

            String userId = session.get("user_id");
            String role   = session.get("role");
            String filterKey = "buyer".equals(role) ? "buyer_id" : "farmer_id";

            List<Map<String, String>> txns = new CsvStore(DATA_DIR + "/orders.csv").findAll(filterKey, userId);
            // Sort by date descending (most recent first)
            txns.sort((a, b) -> b.getOrDefault("date","").compareTo(a.getOrDefault("date","")));

            // Calculate summary stats
            double totalEarned  = 0;
            int    completedCnt = 0;
            for (Map<String, String> t : txns) {
                if ("completed".equals(t.get("status"))) {
                    totalEarned += parseDouble(t.getOrDefault("total", "0"), 0);
                    completedCnt++;
                }
            }

            int total = txns.size();
            int from  = (pg[0]-1)*pg[1], to = Math.min(from+pg[1], total);
            List<Map<String, String>> page = from < total ? txns.subList(from, to) : new ArrayList<>();

            String summary = "{\"total_orders\":" + total
                           + ",\"completed\":"    + completedCnt
                           + ",\"total_earned\":"  + String.format("%.2f", totalEarned) + "}";

            String body = "{\"transactions\":" + CsvStore.listToJSON(page)
                        + ",\"summary\":"      + summary
                        + ",\"pagination\":{\"total\":" + total + ",\"page\":" + pg[0] + ",\"limit\":" + pg[1] + "}"
                        + "}";
            sendJSON(ex, 200, ApiResponse.ok(body, "Transactions loaded"));
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/reports/savings — Savings vs middleman calculation [AUTH]
    // ───────────────────────────────────────────────────────────────────────
    static class ReportsSavingsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "GET")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            Map<String, String> session = Auth.requireAuth(ex);
            if (session == null) { sendJSON(ex, 401, ApiResponse.unauthorized("Login required")); return; }

            String userId = session.get("user_id");
            List<Map<String, String>> txns = new CsvStore(DATA_DIR + "/orders.csv")
                .findAll("farmer_id", userId);

            // Savings = what farmer earned vs what they'd have earned through a middleman (30% lower)
            double directEarned     = 0;
            double middlemanWouldGive = 0;
            for (Map<String, String> t : txns) {
                if ("completed".equals(t.get("status"))) {
                    double total = parseDouble(t.getOrDefault("total", "0"), 0);
                    directEarned     += total;
                    middlemanWouldGive += total * 0.70; // middlemen typically pay 30% less
                }
            }
            double saved = directEarned - middlemanWouldGive;

            String data = "{"
                + "\"direct_earned\":"        + String.format("%.2f", directEarned)
                + ",\"middleman_equivalent\":" + String.format("%.2f", middlemanWouldGive)
                + ",\"total_saved\":"          + String.format("%.2f", saved)
                + ",\"savings_percent\":"      + (directEarned > 0 ? String.format("%.1f", (saved/directEarned)*100) : "0")
                + "}";
            sendJSON(ex, 200, ApiResponse.ok(data, "Savings report generated"));
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/advisory/top-crops — Top performing crops this week
    // ───────────────────────────────────────────────────────────────────────
    static class AdvisoryTopCropsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "GET")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            // Aggregate price data: crop → average modal price across all mandis
            Map<String, List<Double>> cropPrices = new LinkedHashMap<>();
            for (Map<String, String> row : getOrRefreshPriceCache()) {
                String c = row.get("crop");
                double m = parseDouble(row.getOrDefault("modal_price","0"), 0);
                cropPrices.computeIfAbsent(c, k -> new ArrayList<>()).add(m);
            }

            // Sort by average modal price descending
            List<Map.Entry<String, List<Double>>> sorted = new ArrayList<>(cropPrices.entrySet());
            sorted.sort((a, b) -> {
                double avgA = a.getValue().stream().mapToDouble(v->v).average().orElse(0);
                double avgB = b.getValue().stream().mapToDouble(v->v).average().orElse(0);
                return Double.compare(avgB, avgA);
            });

            StringBuilder arr = new StringBuilder("[");
            int rank = 1;
            for (Map.Entry<String, List<Double>> e : sorted.subList(0, Math.min(5, sorted.size()))) {
                double avg = e.getValue().stream().mapToDouble(v->v).average().orElse(0);
                if (rank > 1) arr.append(",");
                arr.append("{\"rank\":"  + rank
                         + ",\"crop\":"  + ApiResponse.str(e.getKey())
                         + ",\"price\":" + String.format("%.2f", avg) + "}");
                rank++;
            }
            arr.append("]");
            sendJSON(ex, 200, ApiResponse.ok(arr.toString(), "Top crops loaded"));
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // GET /api/advisory/festivals — Upcoming festival price alerts
    // ───────────────────────────────────────────────────────────────────────
    static class AdvisoryFestivalsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "GET")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            List<Map<String, String>> festivals = new CsvStore(DATA_DIR + "/festivals.csv").readAll();
            if (festivals.isEmpty()) {
                // Seed with default festival data if CSV is empty
                festivals = getDefaultFestivals();
            }
            sendJSON(ex, 200, ApiResponse.ok(CsvStore.listToJSON(festivals), "Festival alerts loaded"));
        }

        private List<Map<String, String>> getDefaultFestivals() {
            List<Map<String, String>> list = new ArrayList<>();
            // Default festival data (matches festivals.csv seed data)
            String[][] data = {
                {"Pongal",       "2026-01-14", "sugarcane,turmeric,coconut", "+40%,+35%,+25%",  "8",  "Do not sell before Pongal"},
                {"Diwali",       "2026-10-20", "sugarcane,coconut,banana",   "+30%,+20%,+15%",  "30", "Hold stock for 2 more weeks"},
                {"Onam",         "2026-09-07", "banana,coconut,rice",        "+25%,+20%,+10%",  "45", "Good time to negotiate prices"},
                {"Tamil New Year","2026-04-14","mango,banana",               "+20%,+15%",        "14", "Sell mangoes now for best price"}
            };
            for (String[] row : data) {
                Map<String, String> m = new LinkedHashMap<>();
                m.put("name",       row[0]);
                m.put("date",       row[1]);
                m.put("crops",      row[2]);
                m.put("price_rise", row[3]);
                m.put("days_away",  row[4]);
                m.put("advice",     row[5]);
                list.add(m);
            }
            return list;
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // POST /api/advisory/crowd-report — Submit a local price report [AUTH]
    // ───────────────────────────────────────────────────────────────────────
    static class AdvisoryCrowdReportHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            applyCORS(ex);
            if (isOptions(ex)) { ex.sendResponseHeaders(204, -1); return; }
            if (!isMethod(ex, "POST")) { sendJSON(ex, 405, ApiResponse.methodNotAllowed()); return; }

            Map<String, String> session = Auth.requireAuth(ex);
            if (session == null) { sendJSON(ex, 401, ApiResponse.unauthorized("Login required")); return; }

            Map<String, String> p = readBody(ex);
            String crop     = Validator.sanitize(p.getOrDefault("crop",     "")).trim();
            String priceStr = p.getOrDefault("price",    "").trim();
            String location = Validator.sanitize(p.getOrDefault("location", "")).trim();

            if (crop.isEmpty())     { sendJSON(ex, 400, ApiResponse.validationError("Crop is required")); return; }
            if (location.isEmpty()) { sendJSON(ex, 400, ApiResponse.validationError("Location is required")); return; }
            String err = Validator.validatePrice(priceStr);
            if (err != null) { sendJSON(ex, 400, ApiResponse.validationError(err)); return; }

            CsvStore reports = new CsvStore(DATA_DIR + "/crowd_reports.csv");
            Map<String, String> row = new LinkedHashMap<>();
            row.put("farmer_id",  session.get("user_id"));
            row.put("crop",       crop);
            row.put("price",      priceStr);
            row.put("location",   location);
            row.put("created_at", now());
            reports.append(row);

            sendJSON(ex, 201, ApiResponse.okNull("Price report submitted. Thank you!"));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /** Send a JSON response with the given HTTP status code. */
    static void sendJSON(HttpExchange ex, int code, String json) throws IOException {
        byte[] bytes = json.getBytes("UTF-8");
        Headers h = ex.getResponseHeaders();
        h.set("Content-Type",               "application/json; charset=UTF-8");
        h.set("Access-Control-Allow-Origin", "*");
        h.set("X-Content-Type-Options",     "nosniff");
        h.set("X-Frame-Options",            "DENY");
        h.set("Cache-Control",              "no-store");
        ex.sendResponseHeaders(code, bytes.length);
        try (OutputStream out = ex.getResponseBody()) { out.write(bytes); }
    }

    /** Send a 404 plain-text response. */
    static void send404(HttpExchange ex) throws IOException {
        String msg = "404 Not Found";
        ex.sendResponseHeaders(404, msg.length());
        ex.getResponseBody().write(msg.getBytes());
        ex.getResponseBody().close();
    }

    /** Set CORS headers for preflight and regular requests. */
    static void applyCORS(HttpExchange ex) {
        Headers h = ex.getResponseHeaders();
        h.set("Access-Control-Allow-Origin",  "*");
        h.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        h.set("Access-Control-Max-Age",       "86400");
    }

    /** True if this is an OPTIONS preflight request. */
    static boolean isOptions(HttpExchange ex) {
        return "OPTIONS".equalsIgnoreCase(ex.getRequestMethod());
    }

    /** True if the request method matches (case-insensitive). */
    static boolean isMethod(HttpExchange ex, String method) {
        return method.equalsIgnoreCase(ex.getRequestMethod());
    }

    /** Read and JSON-parse the request body into a String→String map. */
    static Map<String, String> readBody(HttpExchange ex) throws IOException {
        byte[] raw = ex.getRequestBody().readAllBytes();
        String body = new String(raw, "UTF-8").trim();
        return parseJSON(body);
    }

    /**
     * Simple JSON parser for flat {"key":"value",...} objects.
     * Also handles boolean/number values by converting to strings.
     * Arrays are returned as comma-joined strings (for crops field).
     */
    static Map<String, String> parseJSON(String json) {
        Map<String, String> map = new LinkedHashMap<>();
        if (json == null || json.isEmpty()) return map;
        json = json.trim();
        if (json.startsWith("{")) json = json.substring(1);
        if (json.endsWith("}"))   json = json.substring(0, json.length()-1);

        int i = 0;
        while (i < json.length()) {
            // Skip whitespace and commas
            while (i < json.length() && (json.charAt(i) == ',' || Character.isWhitespace(json.charAt(i)))) i++;
            if (i >= json.length()) break;

            // Parse key
            if (json.charAt(i) != '"') { i++; continue; }
            i++; // skip opening quote
            StringBuilder key = new StringBuilder();
            while (i < json.length() && json.charAt(i) != '"') key.append(json.charAt(i++));
            i++; // skip closing quote

            // Skip colon
            while (i < json.length() && json.charAt(i) != ':') i++;
            i++; // skip colon
            while (i < json.length() && Character.isWhitespace(json.charAt(i))) i++;

            // Parse value
            if (i >= json.length()) break;
            char start = json.charAt(i);
            String value;
            if (start == '"') {
                // String value
                i++; // skip opening quote
                StringBuilder sb = new StringBuilder();
                while (i < json.length()) {
                    char c = json.charAt(i++);
                    if (c == '\\' && i < json.length()) {
                        char esc = json.charAt(i++);
                        if (esc == '"') sb.append('"');
                        else if (esc == 'n') sb.append('\n');
                        else if (esc == 't') sb.append('\t');
                        else if (esc == '\\') sb.append('\\');
                        else sb.append(esc);
                    } else if (c == '"') {
                        break; // end of string
                    } else {
                        sb.append(c);
                    }
                }
                value = sb.toString();
            } else if (start == '[') {
                // Array value — collect items as comma-separated string
                int depth = 1; i++;
                StringBuilder sb = new StringBuilder();
                while (i < json.length() && depth > 0) {
                    char c = json.charAt(i++);
                    if (c == '[') depth++;
                    else if (c == ']') { depth--; if (depth == 0) break; }
                    else sb.append(c);
                }
                // Clean up: remove quotes from array items
                value = sb.toString().replaceAll("\"", "").trim();
            } else {
                // Boolean / number
                StringBuilder sb = new StringBuilder();
                while (i < json.length() && json.charAt(i) != ',' && json.charAt(i) != '}') sb.append(json.charAt(i++));
                value = sb.toString().trim();
            }
            if (key.length() > 0) map.put(key.toString(), value);
        }
        return map;
    }

    /** Get or refresh the in-memory price cache from prices_cache.csv. */
    static List<Map<String, String>> getOrRefreshPriceCache() {
        if (System.currentTimeMillis() - PRICE_CACHE_TIME > PRICE_CACHE_TTL) {
            try { refreshPriceCache(); } catch (Exception e) { Logger.error("PRICE_CACHE", e.getMessage()); }
        }
        return PRICE_CACHE;
    }

    static void refreshPriceCache() throws IOException {
        List<Map<String, String>> fresh = new CsvStore(DATA_DIR + "/prices_cache.csv").readAll();
        if (!fresh.isEmpty()) {
            PRICE_CACHE      = fresh;
            PRICE_CACHE_TIME = System.currentTimeMillis();
        }
    }

    static double parseDouble(String s, double def) {
        try { return Double.parseDouble(s == null ? "" : s.trim()); } catch (Exception e) { return def; }
    }

    static String now() {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
    }

    static String today() {
        return new SimpleDateFormat("yyyy-MM-dd").format(new Date());
    }

    static String getContentType(String name) {
        if (name.endsWith(".html"))  return "text/html; charset=UTF-8";
        if (name.endsWith(".css"))   return "text/css; charset=UTF-8";
        if (name.endsWith(".js"))    return "application/javascript; charset=UTF-8";
        if (name.endsWith(".json"))  return "application/json; charset=UTF-8";
        if (name.endsWith(".png"))   return "image/png";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        if (name.endsWith(".webp"))  return "image/webp";
        if (name.endsWith(".svg"))   return "image/svg+xml";
        if (name.endsWith(".ico"))   return "image/x-icon";
        if (name.endsWith(".properties")) return "text/plain; charset=UTF-8";
        return "application/octet-stream";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOGGER — Request logging + error logging to log files
    // ═══════════════════════════════════════════════════════════════════════
    static class Logger {
        static final String LOG_FILE   = LOGS_DIR + "/server.log";
        static final String ERROR_FILE = LOGS_DIR + "/error.log";
        static final Object LOG_LOCK   = new Object();

        static void logRequest(String method, String path, int status, long startMs) {
            long ms = System.currentTimeMillis() - startMs;
            log(LOG_FILE, String.format("[REQUEST] %s %s → %d (%dms)", method, path, status, ms));
        }

        static void info(String tag, String msg) {
            log(LOG_FILE, String.format("[INFO]  [%s] %s", tag, msg));
        }

        static void warn(String tag, String msg) {
            log(LOG_FILE, String.format("[WARN]  [%s] %s", tag, msg));
        }

        static void error(String tag, String msg) {
            log(ERROR_FILE, String.format("[ERROR] [%s] %s", tag, msg));
        }

        private static void log(String file, String message) {
            String line = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()) + " " + message;
            System.out.println(line); // Also print to console
            synchronized (LOG_LOCK) {
                try (PrintWriter pw = new PrintWriter(new FileWriter(file, true))) {
                    pw.println(line);
                } catch (IOException ignored) {}
            }
        }
    }
}
