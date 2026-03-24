package com.resonance.server.utils;

import com.google.gson.JsonObject;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.utils.EncodingUtils;
import org.jetbrains.annotations.Nullable;

import javax.crypto.Mac;
import java.security.InvalidKeyException;
import java.time.Instant;
import java.util.Base64;

public class JwtUtils {

    private static final String SECRET = "your-secret-key-here-change-this-in-production"; // Should come from config
    private static final long EXPIRATION_SECONDS = 86400; // 24 hours

    public static String generateToken(int userId, String email) {
        try {
            // Create header
            JsonObject header = new JsonObject();
            header.addProperty("alg", "HS256");
            header.addProperty("typ", "JWT");
            String headerJson = header.toString();
            String headerBase64 = EncodingUtils.base64(headerJson);

            // Create payload
            JsonObject payload = new JsonObject();
            payload.addProperty("sub", userId);
            payload.addProperty("email", email);
            payload.addProperty("iat", Instant.now().getEpochSecond());
            payload.addProperty("exp", Instant.now().getEpochSecond() + EXPIRATION_SECONDS);
            String payloadJson = payload.toString();
            String payloadBase64 = EncodingUtils.base64(payloadJson);

            // Create signature
            String signatureInput = headerBase64 + "." + payloadBase64;
            String signature = EncodingUtils.hmacSha256(signatureInput, SECRET);

            // Return complete token
            return headerBase64 + "." + payloadBase64 + "." + signature;

        } catch (InvalidKeyException e) {
            throw new RuntimeException("Failed to generate token", e);
        }
    }

    @Nullable
    public static JsonObject verifyToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3)
                return null;

            String headerBase64 = parts[0];
            String payloadBase64 = parts[1];
            String signature = parts[2];

            // Verify signature
            String expectedSignature = EncodingUtils.hmacSha256(headerBase64 + "." + payloadBase64, SECRET);
            if (!signature.equals(expectedSignature))
                return null;

            // Decode and parse payload
            String payloadJson = EncodingUtils.base64Decode(payloadBase64);
            JsonObject payload = ConfigHolder.GSON.fromJson(payloadJson, JsonObject.class);

            // Check expiration
            long exp = payload.get("exp").getAsLong();
            if (exp < Instant.now().getEpochSecond())
                return null;

            return payload;

        } catch (Exception e) {
            return null;
        }
    }

    public static int getUserIdFromToken(String token) {
        JsonObject payload = verifyToken(token);
        if (payload != null && payload.has("sub")) {
            return payload.get("sub").getAsInt();
        }
        return -1;
    }

    public static String getEmailFromToken(String token) {
        JsonObject payload = verifyToken(token);
        if (payload != null && payload.has("email")) {
            return payload.get("email").getAsString();
        }
        return null;
    }

    public static boolean isTokenValid(String token) {
        return verifyToken(token) != null;
    }
}