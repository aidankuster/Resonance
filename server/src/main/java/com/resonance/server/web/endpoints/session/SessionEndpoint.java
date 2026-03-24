package com.resonance.server.web.endpoints.session;

import com.resonance.server.Server;
import com.resonance.server.utils.JwtUtils;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.UserAccount;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.ContentType;
import io.javalin.http.Context;
import io.javalin.http.UnauthorizedResponse;
import org.jetbrains.annotations.NotNull;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * Returns information about the current session, so that the frontend knows if
 * a user is logged in.
 *
 * @author John 3/18/2026
 */
public class SessionEndpoint implements EndpointGroup {

	@Override
	public void addEndpoints() {
		path("/api/session", () -> {
			get(this::handle);
		});
	}

	private void handle(@NotNull Context ctx) {
		// Get JWT token from Authorization header
		String authHeader = ctx.header("Authorization");
		if (authHeader == null || !authHeader.startsWith("Bearer ")) {
			throw new UnauthorizedResponse("Missing or invalid authentication token");
		}

		String token = authHeader.substring(7);

		// Validate token and get user ID
		int userId = JwtUtils.getUserIdFromToken(token);

		if (userId == -1) {
			throw new UnauthorizedResponse("Invalid or expired token");
		}

		// Fetch user account
		final UserAccount account = Server.INSTANCE.getDatabaseManager().findAccount(userId).block();

		if (account == null) {
			throw new UnauthorizedResponse("User not found");
		}

		// Return profile info
		ctx.result(ConfigHolder.GSON.toJson(account.toJson(false)));
		ctx.contentType(ContentType.APPLICATION_JSON);
	}
}