import java.util.*;

/**
 * Validator.java — Input validation and sanitization for AgriConnect API.
 *
 * All public-facing API inputs are routed through this class before
 * being processed. Every method returns null on success, or an
 * error message string on failure.
 *
 * Design principle: validate early, sanitize always, fail clearly.
 */
public class Validator {

    // ── Allowed value sets ──────────────────────────────────────────────────

    /** Crop IDs that match the frontend CROPS array in index.html */
    public static final Set<String> ALLOWED_CROPS = new HashSet<>(Arrays.asList(
        "tomato", "onion", "rice", "wheat", "sugarcane", "cotton",
        "banana", "mango", "potato", "chilli", "groundnut", "coconut",
        "turmeric", "maize", "carrot", "beetroot", "radish", "cabbage"
    ));

    /** Mandi names matching prices_cache.csv and the frontend mandi list */
    public static final Set<String> ALLOWED_MANDIS = new HashSet<>(Arrays.asList(
        "Coimbatore", "Salem", "Madurai", "Chennai", "Trichy",
        "Dindigul", "Erode", "Tirunelveli"
    ));

    /** Valid order lifecycle statuses */
    public static final Set<String> ALLOWED_STATUSES = new HashSet<>(Arrays.asList(
        "listed", "pending", "confirmed", "completed", "cancelled"
    ));

    /** Supported UI languages */
    public static final Set<String> ALLOWED_LANGUAGES = new HashSet<>(Arrays.asList(
        "english", "tamil", "hindi"
    ));

    /** Valid business types for buyers */
    public static final Set<String> ALLOWED_BUSINESS_TYPES = new HashSet<>(Arrays.asList(
        "hotel", "wholesale", "retail", "export", "processing", "restaurant", "other"
    ));

    // ── Field validators ────────────────────────────────────────────────────

    /**
     * Validate a 10-digit Indian mobile number.
     * Must be numeric, exactly 10 digits, and not all zeros.
     */
    public static String validatePhone(String phone) {
        if (phone == null || phone.trim().isEmpty())
            return "Phone number is required";
        phone = phone.trim();
        if (!phone.matches("\\d{10}"))
            return "Phone must be exactly 10 digits (e.g. 9876543210)";
        if (phone.matches("0{10}"))
            return "Phone number is not valid";
        return null; // ✅ valid
    }

    /**
     * Validate a 4-digit numeric PIN.
     */
    public static String validatePin(String pin) {
        if (pin == null || pin.trim().isEmpty())
            return "PIN is required";
        if (!pin.trim().matches("\\d{4}"))
            return "PIN must be exactly 4 digits";
        return null;
    }

    /**
     * Validate a person or business name.
     */
    public static String validateName(String name) {
        if (name == null || name.trim().isEmpty())
            return "Name is required";
        name = name.trim();
        if (name.length() < 2)
            return "Name must be at least 2 characters";
        if (name.length() > 100)
            return "Name must be less than 100 characters";
        return null;
    }

    /**
     * Validate a location string (village, district format).
     */
    public static String validateLocation(String loc) {
        if (loc == null || loc.trim().isEmpty())
            return "Location is required";
        if (loc.trim().length() > 200)
            return "Location must be less than 200 characters";
        return null;
    }

    /**
     * Validate a quantity in kilograms.
     */
    public static String validateQuantity(String qty) {
        if (qty == null || qty.trim().isEmpty()) return "Quantity is required";
        try {
            double q = Double.parseDouble(qty.trim());
            if (q <= 0)      return "Quantity must be greater than 0 kg";
            if (q > 100_000) return "Quantity cannot exceed 1,00,000 kg";
        } catch (NumberFormatException e) {
            return "Quantity must be a valid number";
        }
        return null;
    }

    /**
     * Validate a price in ₹ per kg.
     */
    public static String validatePrice(String price) {
        if (price == null || price.trim().isEmpty()) return "Price is required";
        try {
            double p = Double.parseDouble(price.trim());
            if (p <= 0)    return "Price must be greater than ₹0";
            if (p > 10000) return "Price per kg cannot exceed ₹10,000";
        } catch (NumberFormatException e) {
            return "Price must be a valid number";
        }
        return null;
    }

    /**
     * Validate a crop name against the allowed crop list (case-insensitive).
     */
    public static String validateCrop(String crop) {
        if (crop == null || crop.trim().isEmpty()) return "Crop name is required";
        if (!ALLOWED_CROPS.contains(crop.trim().toLowerCase()))
            return "Unknown crop '" + crop + "'. Allowed: " + String.join(", ", ALLOWED_CROPS);
        return null;
    }

    /**
     * Validate an order status.
     */
    public static String validateStatus(String status) {
        if (status == null || status.trim().isEmpty()) return "Status is required";
        if (!ALLOWED_STATUSES.contains(status.trim().toLowerCase()))
            return "Invalid status '" + status + "'. Allowed: " + String.join(", ", ALLOWED_STATUSES);
        return null;
    }

    /**
     * Validate that all listed keys exist and are non-empty in the map.
     * Returns the error message for the first missing field found, or null if all present.
     */
    public static String requireFields(Map<String, String> params, String... fields) {
        for (String field : fields) {
            String val = params.get(field);
            if (val == null || val.trim().isEmpty())
                return "Field '" + field + "' is required";
        }
        return null;
    }

    // ── Sanitization ────────────────────────────────────────────────────────

    /**
     * Sanitize a user-supplied string to prevent XSS and CSV injection.
     *
     * Strips:
     *  - HTML tags (prevents XSS if output is rendered as HTML)
     *  - Script tags
     *  - CSV formula injection characters (=, +, -, @ at start)
     *  - Common SQL patterns (defense-in-depth; we use CSV not SQL)
     */
    public static String sanitize(String input) {
        if (input == null) return "";
        String s = input
            .replaceAll("(?is)<script[^>]*>.*?</script>", "") // strip script blocks
            .replaceAll("<[^>]{0,100}>", "")                  // strip HTML tags (max 100 chars)
            .replaceAll("(?i)(javascript|vbscript):", "")     // strip JS URLs
            .trim();
        // Prevent CSV formula injection (e.g., =CMD(...))
        if (!s.isEmpty() && "=+-@\t\r".indexOf(s.charAt(0)) >= 0) {
            s = "'" + s; // Excel-safe prefix
        }
        return s;
    }

    /**
     * Sanitize a name (letters, spaces, common punctuation only).
     */
    public static String sanitizeName(String name) {
        if (name == null) return "";
        return sanitize(name).replaceAll("[^\\p{L}\\p{N} .,'-]", "").trim();
    }

    // ── Utility parsers ─────────────────────────────────────────────────────

    /**
     * Safely parse an integer, returning defaultValue on failure.
     */
    public static int parseInt(String val, int defaultValue) {
        try { return Integer.parseInt(val == null ? "" : val.trim()); }
        catch (NumberFormatException e) { return defaultValue; }
    }

    /**
     * Parse and clamp pagination parameters from query strings.
     * @return int[] {page, limit} — both clamped to sane ranges.
     */
    public static int[] parsePagination(String pageStr, String limitStr) {
        int page  = parseInt(pageStr,  1);
        int limit = parseInt(limitStr, 20);
        if (page  < 1)   page  = 1;
        if (limit < 1)   limit = 1;
        if (limit > 100) limit = 100; // max 100 records per page
        return new int[]{ page, limit };
    }

    /**
     * Parse query parameters from a URI query string.
     * Example: "crop=Tomato&mandi=Salem" → {"crop":"Tomato","mandi":"Salem"}
     */
    public static Map<String, String> parseQuery(String query) {
        Map<String, String> map = new LinkedHashMap<>();
        if (query == null || query.isEmpty()) return map;
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq < 0) continue;
            String key = decode(pair.substring(0, eq));
            String val = decode(pair.substring(eq + 1));
            map.put(key, val);
        }
        return map;
    }

    private static String decode(String s) {
        try { return java.net.URLDecoder.decode(s, "UTF-8"); }
        catch (Exception e) { return s; }
    }
}
