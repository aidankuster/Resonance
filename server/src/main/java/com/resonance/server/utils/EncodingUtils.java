package com.resonance.server.utils;

import com.resonance.server.Server;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * @author John 3/18/2026
 */
public class EncodingUtils {
	
	public static final Mac SHA256_HMAC;
	
	static {
		
		try {
			SHA256_HMAC = Mac.getInstance("HmacSHA256");
		} catch (NoSuchAlgorithmException e) {
			Server.LOGGER.error("Failed to initialize HmacSHA256", e);
			throw new RuntimeException(e);
		}
	}
	
	public static byte[] hmacSha256Raw(String data, String secret) throws InvalidKeyException {
		byte[] hash = secret.getBytes(StandardCharsets.UTF_8);
		SecretKeySpec secretKey = new SecretKeySpec(hash, "HmacSHA256");
		SHA256_HMAC.init(secretKey);
		
		return SHA256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
	}
	
	public static String hmacSha256(String data, String secret) throws InvalidKeyException {
		byte[] bytes = hmacSha256Raw(data, secret);
		return Base64.getEncoder().encodeToString(bytes);
	}
	
	public static String base64(String data) {
		return base64(data.getBytes(StandardCharsets.UTF_8));
	}
	
	public static String base64(byte[] data) {
		return Base64.getEncoder().encodeToString(data);
	}
	
	public static String base64Decode(String data) {
		return new String(Base64.getDecoder().decode(data), StandardCharsets.UTF_8);
	}
}