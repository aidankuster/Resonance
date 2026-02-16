package com.resonance.server.web.endpoints;

import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import org.jetbrains.annotations.NotNull;

import static io.javalin.apibuilder.ApiBuilder.path;
import static io.javalin.apibuilder.ApiBuilder.post;

/**
 * @author John 2/16/2026
 */
public class GenresEndpoint implements EndpointGroup {
	
	@Override
	public void addEndpoints() {
		path("/api/genres", () -> {
			post(this::handle);
		});
	}
	
	private void handle(@NotNull Context ctx) {
	
	}
}
