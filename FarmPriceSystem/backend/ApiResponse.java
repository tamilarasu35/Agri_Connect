/**
 * ApiResponse.java — Standard API response envelope for AgriConnect.
 *
 * Every API endpoint returns JSON through this class to ensure
 * response consistency across all 20+ endpoints.
 *
 * Success format:
 *   {"success":true,  "data":{...},  "message":"...", "code":"OK"}
 * Error format:
 *   {"success":false, "error":"...", "message":"...", "code":"ERR_CODE"}
 * Paginated format:
 *   {"success":true,  "data":[...],  "pagination":{...}, "message":"OK", "code":"OK"}
 */
public class ApiResponse {

    // ── Success codes ───────────────────────────────────────────────────────
    public static final String CODE_OK      = "OK";
    public static final String CODE_CREATED = "CREATED";

    // ── Error codes ─────────────────────────────────────────────────────────
    public static final String CODE_VALIDATION   = "VALIDATION_ERROR";
    public static final String CODE_NOT_FOUND    = "NOT_FOUND";
    public static final String CODE_UNAUTHORIZED = "UNAUTHORIZED";
    public static final String CODE_FORBIDDEN    = "FORBIDDEN";
    public static final String CODE_CONFLICT     = "CONFLICT";
    public static final String CODE_SERVER_ERR   = "SERVER_ERROR";
    public static final String CODE_RATE_LIMIT   = "RATE_LIMIT_EXCEEDED";
    public static final String CODE_METHOD_NOT   = "METHOD_NOT_ALLOWED";

    // ── Success builders ────────────────────────────────────────────────────

    /** Success with a raw JSON data blob. */
    public static String ok(String dataJson) {
        return ok(dataJson, "Success", CODE_OK);
    }

    public static String ok(String dataJson, String message) {
        return ok(dataJson, message, CODE_OK);
    }

    public static String ok(String dataJson, String message, String code) {
        return "{\"success\":true,\"data\":" + dataJson
             + ",\"message\":" + str(message)
             + ",\"code\":"    + str(code) + "}";
    }

    /** Success with a paginated array. */
    public static String okPaged(String jsonArray, int total, int page, int limit) {
        int pages = (limit > 0) ? (int) Math.ceil((double) total / limit) : 1;
        return "{\"success\":true,\"data\":" + jsonArray
             + ",\"pagination\":{\"total\":" + total
             + ",\"page\":"  + page
             + ",\"limit\":" + limit
             + ",\"pages\":" + pages + "}"
             + ",\"message\":\"OK\",\"code\":\"OK\"}";
    }

    /** Success with null data (e.g., logout). */
    public static String okNull(String message) {
        return "{\"success\":true,\"data\":null,\"message\":" + str(message) + ",\"code\":\"OK\"}";
    }

    // ── Error builders ──────────────────────────────────────────────────────

    public static String error(String message, String code) {
        return "{\"success\":false,\"error\":" + str(message)
             + ",\"message\":"                 + str(message)
             + ",\"code\":"                    + str(code) + "}";
    }

    public static String validationError(String msg)  { return error(msg, CODE_VALIDATION);   }
    public static String notFound(String resource)    { return error(resource + " not found", CODE_NOT_FOUND); }
    public static String unauthorized(String reason)  { return error(reason, CODE_UNAUTHORIZED); }
    public static String forbidden(String reason)     { return error(reason, CODE_FORBIDDEN);    }
    public static String conflict(String msg)         { return error(msg, CODE_CONFLICT);         }
    public static String serverError(String msg)      { return error(msg, CODE_SERVER_ERR);        }
    public static String rateLimitError()             { return error("Too many attempts. Wait 15 minutes.", CODE_RATE_LIMIT); }
    public static String methodNotAllowed()           { return error("Method not allowed", CODE_METHOD_NOT); }

    // ── JSON string helper ──────────────────────────────────────────────────

    /**
     * Safely escape and double-quote a string value for JSON output.
     * Handles null, backslashes, quotes, and control characters.
     */
    public static String str(String val) {
        if (val == null) return "null";
        return "\""
            + val.replace("\\", "\\\\")
                 .replace("\"", "\\\"")
                 .replace("\n", "\\n")
                 .replace("\r", "")
                 .replace("\t", "\\t")
            + "\"";
    }

    /**
     * Build a simple JSON object from alternating key-value strings.
     * Example: obj("id","F1","name","Rajan") → {"id":"F1","name":"Rajan"}
     */
    public static String obj(String... keyValues) {
        if (keyValues.length % 2 != 0)
            throw new IllegalArgumentException("obj() requires even number of arguments");
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < keyValues.length; i += 2) {
            if (i > 0) sb.append(",");
            sb.append(str(keyValues[i])).append(":").append(str(keyValues[i + 1]));
        }
        sb.append("}");
        return sb.toString();
    }
}
