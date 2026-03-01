package com.resonance.server.web.endpoints;

import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.tags.Tag;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import io.javalin.http.HandlerType;
import io.javalin.http.NotFoundResponse;
import org.jetbrains.annotations.NotNull;

import java.util.List;

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
		
		UserAccount account = Server.INSTANCE.getDatabaseManager().findAccount(id).block();
		
		if(account == null) {
			throw new NotFoundResponse("Profile not found");
		}
		
		if(!ctx.method().equals(HandlerType.POST)) {
			//TODO: if authenticated, then show sensitive info
			ctx.result(ConfigHolder.GSON.toJson(account.toJson(false)));
			return;
		}
		
		//TODO: REQUIRE AUTHENTICATION TO EDIT PROFIILE
		final String displayName = ctx.formParam("display_name");
		final String bio = ctx.formParam("bio");
		final String availability = ctx.formParam("availability");
		final List<String> tags = ctx.formParams("tag");
		
		final UserAccount.Mutable mutableAccount = account.mutable();
		final UserAccount.UserInfo.Mutable mutableInfo = mutableAccount.getInfo();
		
		if(displayName != null) {
			mutableInfo.setDisplayName(displayName);
		}
		if(bio != null) {
			mutableInfo.setBio(bio);
		}
		if(availability != null) {
			mutableInfo.setAvailability(availability);
		}
		if(ctx.formParam("experience_level") != null) {
			mutableInfo.setExperienceLevel(ctx.formParamAsClass("experience_level", UserAccount.UserInfo.ExperienceLevel.class).get());
		}
		
		//tags
		mutableAccount.getTags().clear();
		final List<Tag> availableTags = Server.INSTANCE.getDatabaseManager().getTags().collectList().block();
		for(Tag availableTag : availableTags) {
			if(tags.contains(availableTag.getName())) {
				mutableAccount.getTags().add(availableTag);
			}
		}
		
		account = mutableAccount.build();
		Server.INSTANCE.getDatabaseManager().updateAccount(account).block();
		ctx.result(ConfigHolder.GSON.toJson(account.toJson(false)));
	}
}