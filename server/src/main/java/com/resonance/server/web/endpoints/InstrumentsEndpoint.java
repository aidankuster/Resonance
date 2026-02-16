package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.resonance.server.Server;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import org.jetbrains.annotations.NotNull;

import java.util.List;

import static io.javalin.apibuilder.ApiBuilder.get;
import static io.javalin.apibuilder.ApiBuilder.path;

/**
 * @author John 2/16/2026
 */
public class InstrumentsEndpoint implements EndpointGroup {
	
	@Override
	public void addEndpoints() {
		path("/api/instruments", () -> {
			get(this::handle);
		});
	}
	
	private void handle(@NotNull Context ctx) {
		final List<String> instruments = Server.INSTANCE.getDatabaseManager().getInstrumentsList().collectList().block();
		
		final JsonArray array = new JsonArray();
		for (String genre : instruments) {
			array.add(genre);
		}
		
		ctx.result(array.toString());
	}
}
