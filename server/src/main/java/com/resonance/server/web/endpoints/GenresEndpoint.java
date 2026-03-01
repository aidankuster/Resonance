package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.tags.Genre;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import io.javalin.http.InternalServerErrorResponse;
import org.jetbrains.annotations.NotNull;

import java.util.List;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * @author John 2/16/2026
 */
public class GenresEndpoint implements EndpointGroup {
	
	@Override
	public void addEndpoints() {
		path("/api/genres", () -> {
			get(this::handle);
		});
	}
	
	private void handle(@NotNull Context ctx) {
		final List<Genre> genres = Server.INSTANCE.getDatabaseManager().getGenres().collectList().block();
		
		if(genres == null) {
			throw new InternalServerErrorResponse();
		}
		
		final JsonArray array = new JsonArray();
		for (Genre genre : genres) {
			array.add(genre.getName());
		}
		
		ctx.result(ConfigHolder.GSON.toJson(array));
	}
}
