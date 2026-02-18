package com.resonance.server.web.endpoints;

import com.resonance.server.Server;
import com.resonance.server.data.UserAccount;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import io.javalin.http.HandlerType;
import io.javalin.http.NotFoundResponse;
import io.javalin.validation.ValidationError;
import org.jetbrains.annotations.NotNull;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * @author John 2/9/2026
 */
public class ProfileEndpoint implements EndpointGroup {
	
	@Override
	public void addEndpoints() {
		path("/api/profile/{id}", () -> {
			post(this::handle);
			get(this::handle);
		});
	}
	
	private void handle(@NotNull Context ctx) {
		
		final int id = ctx.pathParamAsClass("id", int.class).get();
		
		final UserAccount account = Server.INSTANCE.getDatabaseManager().findAccount(id).block();
		
		if(account == null) {
			throw new NotFoundResponse("Profile not found");
		}
		
		if(!ctx.method().equals(HandlerType.POST)) {
			//TODO: if authenticated, then show sensitive info
			ctx.result(account.toJson(false).toString());
			return;
		}
		
		//TODO: POST request for editing profile (ONLY IF AUTHENTICATED)
		/*
		final String displayName = ctx.formParam("display_name");
		final String primaryInstrument = ctx.formParam("instruments");
		
		final String favoriteGenres = ctx.formParam("favorite_genres");
		
		final String experienceLevel = ctx.formParam("experience_level");
		
		final String bio = ctx.formParam("bio");
		
		 */
		
	}
}