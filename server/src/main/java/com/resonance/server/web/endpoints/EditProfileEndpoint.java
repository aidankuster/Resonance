package com.resonance.server.web.endpoints;

import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import org.jetbrains.annotations.NotNull;

import static io.javalin.apibuilder.ApiBuilder.path;
import static io.javalin.apibuilder.ApiBuilder.post;

/**
 * @author John 2/9/2026
 */
public class EditProfileEndpoint implements EndpointGroup {
	
	@Override
	public void addEndpoints() {
		path("/api/profile", () -> {
			post(this::handle);
		});
	}
	
	private void handle(@NotNull Context ctx) {
		
		final String displayName = ctx.formParam("display_name");
		final String primaryInstrument = ctx.formParam("primary_instrument");
		
		//imo it should just be a list of instruments with checkboxes for the ones that the user can play
		final String secondaryInstruments = ctx.formParam("secondary_instruments");
		
		final String favoriteGenres = ctx.formParam("favorite_genres");
		
		final String experienceLevel = ctx.formParam("experience_level");
		
		final String bio = ctx.formParam("bio");
		
	}
}