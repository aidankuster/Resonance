package com.resonance.server.web.endpoints.session;

import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import org.jetbrains.annotations.NotNull;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * @author John 3/18/2026
 */
public class LogoutEndpoint implements EndpointGroup {
	
	@Override
	public void addEndpoints() {
		path("/api/logout", () -> {
			get(this::handle);
		});
	}
	
	private void handle(@NotNull Context ctx) {
		ctx.removeCookie("jwt");
		ctx.status(200);
	}
	
}
