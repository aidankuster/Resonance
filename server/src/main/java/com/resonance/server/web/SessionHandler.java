package com.resonance.server.web;

import com.google.gson.JsonObject;
import com.resonance.server.Server;
import com.resonance.server.config.JsonConfigHolder;
import com.resonance.server.data.UserAccount;
import com.resonance.server.utils.EncodingUtils;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;

import java.security.InvalidKeyException;

/**
 * Class used to validate and generate JWT tokens
 *
 * @author John 3/18/2026
 */
public class SessionHandler {
	
	/**
	 * Constants
	 */
	private static final String JWT_HEADER = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
	
	/**
	 * Secret used to hash the JWT
	 */
	private final String hashSecret;
	
	/**
	 * Variables
	 */
	private final long defaultExpiryDuration;
	
	public SessionHandler(String hashSecret, long defaultExpiryDuration) {
		this.hashSecret = hashSecret;
		this.defaultExpiryDuration = defaultExpiryDuration;
	}
	
	/**
	 * Generates a JWT token with the default expiry duration
	 *
	 * @param payload
	 * @return
	 */
	public String generateJWT(JsonObject payload) {
		return generateJWT(payload, this.defaultExpiryDuration);
	}
	
	/**
	 * Generates a JWT token
	 *
	 * @param payload
	 * @param expiryDuration
	 * @return
	 */
	public String generateJWT(JsonObject payload, long expiryDuration) {
		payload.addProperty("expiry", System.currentTimeMillis() + expiryDuration);
		
		final String encodedHeader = EncodingUtils.base64(JWT_HEADER);
		final String encodedPayload = EncodingUtils.base64(payload.toString());
		
		final String signature;
		try {
			signature = EncodingUtils.hmacSha256(encodedHeader + "." + encodedPayload, this.hashSecret);
		} catch(InvalidKeyException e) {
			throw new RuntimeException(e);
		}
		
		return encodedHeader + "." + encodedPayload + "." + signature;
	}
	
	/**
	 * Verifies a JWT token
	 *
	 * @param jwt
	 * @param checkExpiration
	 * @return the payload of the JWT
	 * @throws Exception     if the JWT is expired or invalid
	 */
	public JsonObject verifyJwt(String jwt, boolean checkExpiration) throws Exception {
		final String[] jwtParts = jwt.split("\\.");
		if(jwtParts.length != 3) {
			throw new Exception("Invalid JWT");
		}
		
		final String encodedHeader = jwtParts[0];
		final String encodedPayload = jwtParts[1];
		final String signature = jwtParts[2];
		
		final String calculatedSignature;
		
		try {
			calculatedSignature = EncodingUtils.hmacSha256(
					encodedHeader + "." + encodedPayload,
					this.hashSecret
			);
		} catch(InvalidKeyException e) {
			throw new RuntimeException(e);
		}
		
		final boolean signatureCheck = signature.equals(calculatedSignature);
		
		if(!signatureCheck) {
			throw new Exception("Invalid JWT signature");
		}
		
		//decode payload
		final String payloadJson = EncodingUtils.base64Decode(encodedPayload);
		final JsonObject payload = JsonConfigHolder.GSON.fromJson(payloadJson, JsonObject.class);
		
		//check if expired
		if(checkExpiration && payload.get("expiry").getAsLong() < System.currentTimeMillis()) {
			throw new Exception("JWT expired");
		}
		
		return payload;
	}
	
	public void storeSession(UserAccount account, Context ctx) {
		final String token = this.generateJWT(account.toJson(false));
		
		final Cookie cookie = new Cookie(
				"jwt",
				token,
				"/",
				(int) this.defaultExpiryDuration / 1000, //convert to seconds
				true,
				0,
				true,
				null,
				null,
				SameSite.STRICT
		);
		
		ctx.cookie(cookie);
	}
	
	/**
	 * Validates a session and returns the account if valid
	 *
	 * @throws HttpResponseException
	 */
	@NotNull
	public UserAccount validateSession(@NotNull Context ctx) throws HttpResponseException {
		final String token = ctx.cookie("jwt");
		
		if(token == null) {
			throw new UnauthorizedResponse();
		}
		
		final JsonObject payload;
		
		try {
			payload = this.verifyJwt(token, true);
		} catch(Exception e) {
			ctx.removeCookie("jwt");
			throw new UnauthorizedResponse("Invalid session");
		}
		
		final int accountID = payload.get("id").getAsInt();
		final UserAccount account = Server.INSTANCE.getDatabaseManager().findAccount(accountID).block();
		
		if(account == null) {
			throw new UnauthorizedResponse("Invalid session");
		}
		
		return account;
	}
	
}
