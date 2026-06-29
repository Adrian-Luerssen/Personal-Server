package com.adrianluerssen.personalserver.payments;

import java.security.MessageDigest;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;

public final class PaymentNotificationParser {
    private static final Pattern SYMBOL_BEFORE = Pattern.compile("(?i)(€|£|\\$)\\s*([0-9]+(?:[.,][0-9]{2})?)");
    private static final Pattern SYMBOL_AFTER = Pattern.compile("(?i)([0-9]+(?:[.,][0-9]{2})?)\\s*(€|eur|£|gbp|\\$|usd)");
    private static final Pattern MERCHANT_AT = Pattern.compile("(?i)\\b(?:at|en|a)\\s+([^\\n.,]+)");

    private PaymentNotificationParser() {}

    public static JSONObject parse(
        String packageName,
        String appLabel,
        String title,
        String text,
        long occurredAt
    ) throws Exception {
        String combined = ((title == null ? "" : title) + " " + (text == null ? "" : text)).trim();
        if (combined.length() == 0 || !looksLikePayment(packageName, combined)) return null;

        Amount amount = findAmount(combined);
        if (amount == null || amount.value <= 0) return null;

        String merchant = findMerchant(combined);
        String eventHash = sha256(packageName + "|" + occurredAt + "|" + amount.value + "|" + combined);

        JSONObject suggestion = new JSONObject();
        suggestion.put("id", eventHash.substring(0, 18));
        suggestion.put("eventHash", eventHash);
        suggestion.put("sourcePackage", packageName);
        suggestion.put("sourceAppLabel", appLabel == null ? packageName : appLabel);
        suggestion.put("merchantRaw", merchant);
        suggestion.put("amount", amount.value);
        suggestion.put("currency", amount.currency);
        suggestion.put("occurredAt", java.time.Instant.ofEpochMilli(occurredAt).toString());
        suggestion.put("confidence", combined.toLowerCase(Locale.ROOT).contains("payment") ? 0.85 : 0.7);
        return suggestion;
    }

    private static boolean looksLikePayment(String packageName, String text) {
        String haystack = (packageName + " " + text).toLowerCase(Locale.ROOT);
        boolean paymentWord =
            haystack.contains("payment") ||
            haystack.contains("paid") ||
            haystack.contains("purchase") ||
            haystack.contains("spent") ||
            haystack.contains("charged") ||
            haystack.contains("transaction") ||
            haystack.contains("pago") ||
            haystack.contains("compra") ||
            haystack.contains("tarjeta") ||
            haystack.contains("card");
        boolean financePackage =
            haystack.contains("wallet") ||
            haystack.contains("bank") ||
            haystack.contains("revolut") ||
            haystack.contains("n26") ||
            haystack.contains("santander") ||
            haystack.contains("bbva") ||
            haystack.contains("caixa") ||
            haystack.contains("wise");
        return paymentWord || financePackage;
    }

    private static Amount findAmount(String text) {
        Matcher before = SYMBOL_BEFORE.matcher(text);
        if (before.find()) {
            return new Amount(parseNumber(before.group(2)), currencyFromToken(before.group(1)));
        }

        Matcher after = SYMBOL_AFTER.matcher(text);
        if (after.find()) {
            return new Amount(parseNumber(after.group(1)), currencyFromToken(after.group(2)));
        }

        return null;
    }

    private static String findMerchant(String text) {
        Matcher matcher = MERCHANT_AT.matcher(text);
        if (matcher.find()) {
            return cleanMerchant(matcher.group(1));
        }

        String cleaned = text.replaceAll("(?i)(payment|paid|purchase|spent|charged|transaction|pago|compra|tarjeta|card)", " ");
        cleaned = cleaned.replaceAll("(?i)(€|eur|£|gbp|\\$|usd)\\s*[0-9]+(?:[.,][0-9]{2})?", " ");
        cleaned = cleaned.replaceAll("(?i)[0-9]+(?:[.,][0-9]{2})?\\s*(€|eur|£|gbp|\\$|usd)", " ");
        return cleanMerchant(cleaned);
    }

    private static String cleanMerchant(String value) {
        String cleaned = value == null ? "" : value.replaceAll("\\s+", " ").trim();
        if (cleaned.length() == 0) return "Detected payment";
        return cleaned.length() > 80 ? cleaned.substring(0, 80).trim() : cleaned;
    }

    private static double parseNumber(String value) {
        try {
            return Double.parseDouble(value.replace(",", "."));
        } catch (Exception ignored) {
            return 0;
        }
    }

    private static String currencyFromToken(String token) {
        if (token == null) return "EUR";
        String normalized = token.toLowerCase(Locale.ROOT);
        if (normalized.contains("$") || normalized.contains("usd")) return "USD";
        if (normalized.contains("£") || normalized.contains("gbp")) return "GBP";
        return "EUR";
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes("UTF-8"));
            StringBuilder builder = new StringBuilder();
            for (byte b : bytes) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (Exception ignored) {
            return String.valueOf(value.hashCode());
        }
    }

    private static final class Amount {
        final double value;
        final String currency;

        Amount(double value, String currency) {
            this.value = value;
            this.currency = currency;
        }
    }
}
