package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.tags.Genre;
import com.resonance.server.data.tags.Instrument;
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

		if (account == null) {
			throw new NotFoundResponse("Profile not found");
		}

		if (!ctx.method().equals(HandlerType.POST)) {
			// GET request - return profile with separated instruments and genres
			JsonObject jsonResponse = new JsonObject();

			// Add basic account info
			jsonResponse.addProperty("id", account.id());
			jsonResponse.addProperty("emailAddress", account.emailAddress());
			jsonResponse.addProperty("enabled", account.enabled());
			jsonResponse.addProperty("admin", account.admin());

			// Add user info
			JsonObject infoJson = new JsonObject();
			infoJson.addProperty("displayName", account.info().displayName());
			infoJson.addProperty("bio", account.info().bio());
			infoJson.addProperty("availability", account.info().availability());
			infoJson.addProperty("experienceLevel", account.info().experienceLevel().name());
			jsonResponse.add("info", infoJson);

			// Separate instruments and genres
			JsonArray instrumentsArray = new JsonArray();
			JsonArray genresArray = new JsonArray();

			for (Tag tag : account.tags()) {
				if (tag instanceof Instrument) {
					instrumentsArray.add(tag.getName());
				} else if (tag instanceof Genre) {
					genresArray.add(tag.getName());
				}
			}

			jsonResponse.add("instruments", instrumentsArray);
			jsonResponse.add("genres", genresArray);

			ctx.result(ConfigHolder.GSON.toJson(jsonResponse));
			return;
		}

		// POST request - handle profile updates
		// TODO: REQUIRE AUTHENTICATION TO EDIT PROFILE
		final String displayName = ctx.formParam("display_name");
		final String bio = ctx.formParam("bio");
		final String availability = ctx.formParam("availability");
		final List<String> tags = ctx.formParams("tag");

		final UserAccount.Mutable mutableAccount = account.mutable();
		final UserAccount.UserInfo.Mutable mutableInfo = mutableAccount.getInfo();

		if (displayName != null) {
			mutableInfo.setDisplayName(displayName);
		}
		if (bio != null) {
			mutableInfo.setBio(bio);
		}
		if (availability != null) {
			mutableInfo.setAvailability(availability);
		}
		if (ctx.formParam("experience_level") != null) {
			String levelStr = ctx.formParam("experience_level");
			try {
				UserAccount.UserInfo.ExperienceLevel level = UserAccount.UserInfo.ExperienceLevel.valueOf(levelStr);
				mutableInfo.setExperienceLevel(level);
			} catch (IllegalArgumentException e) {
				ctx.status(400).result("Invalid experience level: " + levelStr);
				return;
			}
		}

		// tags
		mutableAccount.getTags().clear();
		final List<Tag> availableTags = Server.INSTANCE.getDatabaseManager().getTags().collectList().block();
		for (Tag availableTag : availableTags) {
			if (tags.contains(availableTag.getName())) {
				mutableAccount.getTags().add(availableTag);
			}
		}

		account = mutableAccount.build();
		Server.INSTANCE.getDatabaseManager().updateAccount(account).block();

		// After update, return the updated profile with separated instruments and
		// genres
		JsonObject jsonResponse = new JsonObject();

		// Add basic account info
		jsonResponse.addProperty("id", account.id());
		jsonResponse.addProperty("emailAddress", account.emailAddress());
		jsonResponse.addProperty("enabled", account.enabled());
		jsonResponse.addProperty("admin", account.admin());

		// Add user info
		JsonObject infoJson = new JsonObject();
		infoJson.addProperty("displayName", account.info().displayName());
		infoJson.addProperty("bio", account.info().bio());
		infoJson.addProperty("availability", account.info().availability());
		infoJson.addProperty("experienceLevel", account.info().experienceLevel().name());
		jsonResponse.add("info", infoJson);

		// Separate instruments and genres
		JsonArray instrumentsArray = new JsonArray();
		JsonArray genresArray = new JsonArray();

		for (Tag tag : account.tags()) {
			if (tag instanceof Instrument) {
				instrumentsArray.add(tag.getName());
			} else if (tag instanceof Genre) {
				genresArray.add(tag.getName());
			}
		}

		jsonResponse.add("instruments", instrumentsArray);
		jsonResponse.add("genres", genresArray);

		ctx.result(ConfigHolder.GSON.toJson(jsonResponse));
	}
}