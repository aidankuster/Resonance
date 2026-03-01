package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.tags.Instrument;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import io.javalin.http.InternalServerErrorResponse;
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
		final List<Instrument> instruments = Server.INSTANCE.getDatabaseManager().getInstruments().collectList().block();
		
		if(instruments == null) {
			throw new InternalServerErrorResponse();
		}
		
		final JsonArray array = new JsonArray();
		for (Instrument instrument : instruments) {
			array.add(instrument.getName());
		}
		
		ctx.result(ConfigHolder.GSON.toJson(array));
	}
}
