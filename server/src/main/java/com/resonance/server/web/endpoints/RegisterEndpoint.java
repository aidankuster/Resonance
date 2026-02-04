package com.resonance.server.web.endpoints;

import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import org.jetbrains.annotations.NotNull;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * @author John 2/4/2026
 */
public class RegisterEndpoint implements EndpointGroup {
	
	@Override
	public void addEndpoints() {
		path("/register", () -> {
			post(this::handle);
		});
	}
	
	private void handle(@NotNull Context ctx) {
	
	}
}
