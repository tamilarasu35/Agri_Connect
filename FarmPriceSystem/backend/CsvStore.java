import java.io.*;
import java.util.*;

/**
 * CsvStore.java — Thread-safe flat-file CSV database utility.
 *
 * Provides CRUD operations on CSV files. Each CsvStore instance
 * represents one CSV file (one "table"). All writes are synchronized
 * at the instance level to prevent data corruption from concurrent requests.
 *
 * Column structure is inferred from the header row. All records are
 * returned as LinkedHashMap<String, String> to preserve column order.
 *
 * Usage:
 *   CsvStore farmers = new CsvStore("data/farmers.csv");
 *   Map<String,String> farmer = farmers.findOne("phone", "9876543210");
 *   farmers.updateWhere("id", "F1001", Map.of("trustScore", "90"));
 */
public class CsvStore {

    private final File   file;
    private final Object lock = new Object(); // per-instance write lock

    public CsvStore(String path) {
        this.file = new File(path);
        // Ensure parent directory exists
        if (file.getParentFile() != null) file.getParentFile().mkdirs();
    }

    /** True if the file exists and is non-empty. */
    public boolean exists() {
        return file.exists() && file.length() > 0;
    }

    // ── READ operations ─────────────────────────────────────────────────────

    /**
     * Read all records from the CSV as a List of LinkedHashMaps.
     * The first row is treated as the header.
     * Returns an empty list if the file does not exist.
     */
    public List<Map<String, String>> readAll() throws IOException {
        List<Map<String, String>> records = new ArrayList<>();
        if (!file.exists()) return records;

        synchronized (lock) {
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(new FileInputStream(file), "UTF-8"))) {

                String headerLine = br.readLine();
                if (headerLine == null) return records;

                String[] headers = parseLine(headerLine);
                for (int i = 0; i < headers.length; i++)
                    headers[i] = headers[i].trim();

                String line;
                while ((line = br.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    String[] vals = parseLine(line);
                    Map<String, String> row = new LinkedHashMap<>();
                    for (int i = 0; i < headers.length; i++)
                        row.put(headers[i], i < vals.length ? vals[i] : "");
                    records.add(row);
                }
            }
        }
        return records;
    }

    /**
     * Read a paginated subset of records.
     * @param page  1-based page number
     * @param limit records per page
     */
    public List<Map<String, String>> readPage(int page, int limit) throws IOException {
        List<Map<String, String>> all = readAll();
        int from = (page - 1) * limit;
        int to   = Math.min(from + limit, all.size());
        if (from >= all.size()) return new ArrayList<>();
        return all.subList(from, to);
    }

    /**
     * Find the first record where column {@code key} equals {@code value}.
     * Returns null if not found.
     */
    public Map<String, String> findOne(String key, String value) throws IOException {
        if (value == null) return null;
        for (Map<String, String> row : readAll())
            if (value.equals(row.get(key))) return row;
        return null;
    }

    /**
     * Find all records where column {@code key} equals {@code value}.
     */
    public List<Map<String, String>> findAll(String key, String value) throws IOException {
        List<Map<String, String>> result = new ArrayList<>();
        if (value == null) return result;
        for (Map<String, String> row : readAll())
            if (value.equals(row.get(key))) result.add(row);
        return result;
    }

    /** Count total records (excluding header). */
    public int count() throws IOException { return readAll().size(); }

    /** Count records matching a condition. */
    public int countWhere(String key, String value) throws IOException {
        return findAll(key, value).size();
    }

    // ── WRITE operations ────────────────────────────────────────────────────

    /**
     * Append a single record to the file.
     * If the file does not exist, the header is written first using the map's keys.
     */
    public void append(Map<String, String> record) throws IOException {
        synchronized (lock) {
            boolean needsHeader = !file.exists() || file.length() == 0;
            try (PrintWriter pw = new PrintWriter(
                    new OutputStreamWriter(new FileOutputStream(file, true), "UTF-8"))) {
                if (needsHeader)
                    pw.println(String.join(",", record.keySet()));
                pw.println(rowToCSV(record));
            }
        }
    }

    /**
     * Rewrite the entire file with the given records.
     * The header string must include all column names joined by commas.
     */
    public void writeAll(String header, List<Map<String, String>> records) throws IOException {
        synchronized (lock) {
            try (PrintWriter pw = new PrintWriter(
                    new OutputStreamWriter(new FileOutputStream(file, false), "UTF-8"))) {
                pw.println(header);
                for (Map<String, String> row : records)
                    pw.println(rowToCSV(row));
            }
        }
    }

    /**
     * Update all records where {@code matchKey} equals {@code matchVal}.
     * Applies all key-value pairs in {@code updates} to matching rows.
     * @return true if at least one record was updated.
     */
    public boolean updateWhere(String matchKey, String matchVal,
                               Map<String, String> updates) throws IOException {
        synchronized (lock) {
            List<Map<String, String>> records = readAll();
            if (records.isEmpty()) return false;

            String header = String.join(",", records.get(0).keySet());
            boolean found = false;
            for (Map<String, String> row : records) {
                if (matchVal.equals(row.get(matchKey))) {
                    row.putAll(updates);
                    found = true;
                }
            }
            if (found) writeAll(header, records);
            return found;
        }
    }

    /**
     * Delete all records where {@code matchKey} equals {@code matchVal}.
     * @return true if at least one record was deleted.
     */
    public boolean deleteWhere(String matchKey, String matchVal) throws IOException {
        synchronized (lock) {
            List<Map<String, String>> records = readAll();
            if (records.isEmpty()) return false;

            String header = String.join(",", records.get(0).keySet());
            int before = records.size();
            records.removeIf(r -> matchVal.equals(r.get(matchKey)));
            if (records.size() < before) {
                writeAll(header, records);
                return true;
            }
            return false;
        }
    }

    // ── JSON serialization ──────────────────────────────────────────────────

    /**
     * Convert a single record map to a JSON object string.
     */
    public static String mapToJSON(Map<String, String> map) {
        if (map == null) return "null";
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> e : map.entrySet()) {
            if (!first) sb.append(",");
            sb.append(ApiResponse.str(e.getKey()))
              .append(":")
              .append(ApiResponse.str(e.getValue()));
            first = false;
        }
        sb.append("}");
        return sb.toString();
    }

    /**
     * Convert a list of record maps to a JSON array string.
     */
    public static String listToJSON(List<Map<String, String>> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(mapToJSON(list.get(i)));
        }
        sb.append("]");
        return sb.toString();
    }

    // ── Internal helpers ────────────────────────────────────────────────────

    /**
     * Serialize a record map to a properly escaped CSV line.
     * Fields containing commas, quotes, or newlines are double-quoted.
     */
    private String rowToCSV(Map<String, String> row) {
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (String val : row.values()) {
            if (!first) sb.append(",");
            if (val == null) {
                sb.append("");
            } else if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
                sb.append("\"").append(val.replace("\"", "\"\"")).append("\"");
            } else {
                sb.append(val);
            }
            first = false;
        }
        return sb.toString();
    }

    /**
     * Parse a single CSV line into a String array, handling:
     *  - Double-quoted fields (may contain commas)
     *  - Escaped double-quotes inside quoted fields ("")
     */
    public static String[] parseLine(String line) {
        List<String> fields = new ArrayList<>();
        boolean inQuote = false;
        StringBuilder field = new StringBuilder();
        char[] chars = line.toCharArray();

        for (int i = 0; i < chars.length; i++) {
            char c = chars[i];
            if (c == '"') {
                if (inQuote && i + 1 < chars.length && chars[i + 1] == '"') {
                    // Escaped quote inside a quoted field
                    field.append('"');
                    i++; // skip next char
                } else {
                    inQuote = !inQuote;
                }
            } else if (c == ',' && !inQuote) {
                fields.add(field.toString());
                field = new StringBuilder();
            } else {
                field.append(c);
            }
        }
        fields.add(field.toString()); // last field
        return fields.toArray(new String[0]);
    }
}
