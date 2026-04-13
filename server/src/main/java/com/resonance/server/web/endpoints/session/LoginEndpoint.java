package com.resonance.server.web.endpoints.session;

import com.password4j.Password;
import com.resonance.server.Server;
import com.resonance.server.config.JsonConfigHolder;
import com.resonance.server.data.UserAccount;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;

import static io.javalin.apibuilder.ApiBuilder.*;

public class LoginEndpoint implements EndpointGroup {

	@Override
	public void addEndpoints() {
		path("/api/login", () -> {
			post(this::handle);
		});
	}

	private void handle(@NotNull Context ctx) {
		final String email = ctx.formParam("email");
		final String password = ctx.formParam("password");
		
		if (email == null || email.isBlank()) {
			throw new BadRequestResponse("Missing email address");
		}

		if (password == null || password.isBlank()) {
			throw new BadRequestResponse("Missing password");
		}
		
		final UserAccount account = Server.INSTANCE.getDatabaseManager().findAccount(email).block();

		if (account == null) {
			throw new UnauthorizedResponse("Invalid credentials.");
		}
		
		if (!Password.check(password, account.hashedPassword()).withBcrypt()) {
			throw new UnauthorizedResponse("Invalid credentials.");
		}
		
		Server.INSTANCE.getWebServer().getSessionHandler().storeSession(account, ctx);
		
		ctx.result(JsonConfigHolder.GSON.toJson(account.toJson(false)));
		ctx.contentType(ContentType.APPLICATION_JSON);
		ctx.status(200);
	}
}