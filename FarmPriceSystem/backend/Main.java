import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.Headers;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.file.*;
import java.util.*;
import java.util.stream.*;

/**
 * FarmPriceSystem — Main HTTP Server
 * Serves the frontend static files and provides REST API endpoints.
 * 
 * Compile:  javac -d out Main.java
 * Run:      java -cp out Main
 * Access:   http://localhost:8080
 */
public class Main {

    static final int PORT = 8080;
    static final String FRONTEND_DIR = "../frontend";
    static final String LANGUAGES_DIR = "../languages";
    static final String DATA_DIR = "data";

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // API endpoints
        server.createContext("/api/register", new RegisterHandler());
        server.createContext("/api/login", new LoginHandler());

        // Language files
        server.createContext("/languages/", new LanguageFileHandler());

        // Static file server (frontend)
        server.createContext("/", new StaticFileHandler());

        server.setExecutor(null);
        System.out.println("===========================================");
        System.out.println("  🌾 AgriConnect Server started!");
        System.out.println("  📡 http://localhost:" + PORT);
        System.out.println("===========================================");
        server.start();
    }

    // ============================
    // STATIC FILE HANDLER
    // ============================
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();

            // Default to index.html
            if (path.equals("/")) path = "/index.html";

            File file = new File(FRONTEND_DIR + path).getCanonicalFile();

            if (!file.exists() || file.isDirectory()) {
                send404(exchange);
                return;
            }

            // Determine content type
            String contentType = getContentType(file.getName());
            byte[] bytes = Files.readAllBytes(file.toPath());

            Headers headers = exchange.getResponseHeaders();
            headers.set("Content-Type", contentType);
            headers.set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.getResponseBody().close();
        }
    }

    // ============================
    // LANGUAGE FILE HANDLER
    // ============================
    static class LanguageFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            String filename = path.substring("/languages/".length());

            File file = new File(LANGUAGES_DIR + "/" + filename).getCanonicalFile();

            if (!file.exists()) {
                send404(exchange);
                return;
            }

            byte[] bytes = Files.readAllBytes(file.toPath());
            Headers headers = exchange.getResponseHeaders();
            headers.set("Content-Type", "text/plain; charset=UTF-8");
            headers.set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.getResponseBody().close();
        }
    }

    // ============================
    // REGISTER HANDLER
    // ============================
    static class RegisterHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            enableCORS(exchange);
            if (exchange.getRequestMethod().equalsIgnoreCase("OPTIONS")) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                sendJSON(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            // Read body
            String body = new String(exchange.getRequestBody().readAllBytes(), "UTF-8");
            Map<String, String> params = parseJSON(body);

            String name     = params.getOrDefault("name", "");
            String phone    = params.getOrDefault("phone", "");
            String location = params.getOrDefault("location", "");
            String crops    = params.getOrDefault("crops", "");
            String language = params.getOrDefault("language", "english");

            if (name.isEmpty() || phone.isEmpty()) {
                sendJSON(exchange, 400, "{\"error\":\"Name and phone required\"}");
                return;
            }

            // Generate PIN
            String pin = String.format("%04d", new Random().nextInt(10000));
            String id = "F" + System.currentTimeMillis();
            String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());

            // Append to farmers.csv
            String csvLine = String.join(",", id, name, phone, location,
                    "\"" + crops + "\"", pin, timestamp, language, "0");

            File csvFile = new File(DATA_DIR + "/farmers.csv");
            try (FileWriter fw = new FileWriter(csvFile, true);
                 PrintWriter pw = new PrintWriter(fw)) {
                pw.println(csvLine);
            }

            String json = String.format(
                "{\"success\":true,\"id\":\"%s\",\"pin\":\"%s\",\"name\":\"%s\"}",
                id, pin, name
            );
            sendJSON(exchange, 200, json);
        }
    }

    // ============================
    // LOGIN HANDLER
    // ============================
    static class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            enableCORS(exchange);
            if (exchange.getRequestMethod().equalsIgnoreCase("OPTIONS")) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                sendJSON(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            String body = new String(exchange.getRequestBody().readAllBytes(), "UTF-8");
            Map<String, String> params = parseJSON(body);

            String phone = params.getOrDefault("phone", "");
            String pin   = params.getOrDefault("pin", "");

            // Search farmers.csv
            File csvFile = new File(DATA_DIR + "/farmers.csv");
            if (!csvFile.exists()) {
                sendJSON(exchange, 401, "{\"error\":\"No users registered\"}");
                return;
            }

            try (BufferedReader br = new BufferedReader(new FileReader(csvFile))) {
                String line;
                boolean headerSkipped = false;
                while ((line = br.readLine()) != null) {
                    if (!headerSkipped) { headerSkipped = true; continue; }
                    String[] parts = parseCSVLine(line);
                    if (parts.length >= 6 && parts[2].equals(phone) && parts[5].equals(pin)) {
                        String json = String.format(
                            "{\"success\":true,\"id\":\"%s\",\"name\":\"%s\",\"phone\":\"%s\"}",
                            parts[0], parts[1], parts[2]
                        );
                        sendJSON(exchange, 200, json);
                        return;
                    }
                }
            }

            sendJSON(exchange, 401, "{\"error\":\"Invalid credentials\"}");
        }
    }

    // ============================
    // UTILITY METHODS
    // ============================

    static void sendJSON(HttpExchange exchange, int code, String json) throws IOException {
        byte[] bytes = json.getBytes("UTF-8");
        Headers headers = exchange.getResponseHeaders();
        headers.set("Content-Type", "application/json; charset=UTF-8");
        headers.set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(code, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.getResponseBody().close();
    }

    static void send404(HttpExchange exchange) throws IOException {
        String msg = "404 Not Found";
        exchange.sendResponseHeaders(404, msg.length());
        exchange.getResponseBody().write(msg.getBytes());
        exchange.getResponseBody().close();
    }

    static void enableCORS(HttpExchange exchange) {
        Headers headers = exchange.getResponseHeaders();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");
    }

    static String getContentType(String filename) {
        if (filename.endsWith(".html")) return "text/html; charset=UTF-8";
        if (filename.endsWith(".css"))  return "text/css; charset=UTF-8";
        if (filename.endsWith(".js"))   return "application/javascript; charset=UTF-8";
        if (filename.endsWith(".json")) return "application/json; charset=UTF-8";
        if (filename.endsWith(".png"))  return "image/png";
        if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
        if (filename.endsWith(".svg"))  return "image/svg+xml";
        if (filename.endsWith(".ico"))  return "image/x-icon";
        if (filename.endsWith(".webp")) return "image/webp";
        if (filename.endsWith(".properties")) return "text/plain; charset=UTF-8";
        return "application/octet-stream";
    }

    /**
     * Simple JSON parser for flat key-value objects
     */
    static Map<String, String> parseJSON(String json) {
        Map<String, String> map = new HashMap<>();
        json = json.trim();
        if (json.startsWith("{")) json = json.substring(1);
        if (json.endsWith("}"))   json = json.substring(0, json.length() - 1);

        // Split by comma, but respect quoted strings
        boolean inQuote = false;
        StringBuilder token = new StringBuilder();
        List<String> tokens = new ArrayList<>();
        for (char c : json.toCharArray()) {
            if (c == '"') { inQuote = !inQuote; continue; }
            if (c == ',' && !inQuote) {
                tokens.add(token.toString().trim());
                token = new StringBuilder();
                continue;
            }
            token.append(c);
        }
        if (token.length() > 0) tokens.add(token.toString().trim());

        for (String t : tokens) {
            int colonIdx = t.indexOf(':');
            if (colonIdx == -1) continue;
            String key = t.substring(0, colonIdx).trim().replace("\"", "");
            String val = t.substring(colonIdx + 1).trim().replace("\"", "");
            map.put(key, val);
        }
        return map;
    }

    /**
     * Parse CSV line handling quoted fields
     */
    static String[] parseCSVLine(String line) {
        List<String> fields = new ArrayList<>();
        boolean inQuote = false;
        StringBuilder field = new StringBuilder();
        for (char c : line.toCharArray()) {
            if (c == '"') { inQuote = !inQuote; continue; }
            if (c == ',' && !inQuote) {
                fields.add(field.toString());
                field = new StringBuilder();
                continue;
            }
            field.append(c);
        }
        fields.add(field.toString());
        return fields.toArray(new String[0]);
    }
}
