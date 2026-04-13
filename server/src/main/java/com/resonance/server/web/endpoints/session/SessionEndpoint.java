package com.resonance.server.web.endpoints.session;

import com.resonance.server.Server;
import com.resonance.server.config.JsonConfigHolder;
import com.resonance.server.data.UserAccount;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.ContentType;
import io.javalin.http.Context;
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
		final UserAccount account = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
		
		// Return profile info
		ctx.result(JsonConfigHolder.GSON.toJson(account.toJson(false)));
		ctx.contentType(ContentType.APPLICATION_JSON);
	}
}