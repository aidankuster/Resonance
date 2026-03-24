package com.resonance.server.web.endpoints.session;

import com.password4j.Password;
import com.resonance.server.Server;
import com.resonance.server.utils.JwtUtils;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.UserAccount;
import com.google.gson.JsonObject;
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
		System.out.println("\n🔐 ========== LOGIN ATTEMPT ==========");

		final String email = ctx.formParam("email");
		final String password = ctx.formParam("password");

		System.out.println("📧 Email received: '" + email + "'");
		System.out.println(
				"🔑 Password received: " + (password != null ? "present (length: " + password.length() + ")" : "null"));

		if (email == null || email.isBlank()) {
			System.out.println("❌ Email is missing or blank");
			throw new BadRequestResponse("Missing email address");
		}

		if (password == null || password.isBlank()) {
			System.out.println("❌ Password is missing or blank");
			throw new BadRequestResponse("Missing password");
		}

		System.out.println("🔍 Looking up user in database for email: " + email);
		final UserAccount account = Server.INSTANCE.getDatabaseManager().findAccount(email).block();

		if (account == null) {
			System.out.println("❌ No account found with email: " + email);
			throw new UnauthorizedResponse("Invalid credentials.");
		}

		System.out.println("✅ Account found! ID: " + account.id() + ", Email: " + account.emailAddress());
		System.out.println("🔐 Verifying password...");

		boolean passwordValid = Password.check(password, account.hashedPassword()).withBcrypt();
		System.out.println("🔑 Password verification result: " + passwordValid);

		if (!passwordValid) {
			System.out.println("❌ Invalid password for user: " + email);
			throw new UnauthorizedResponse("Invalid credentials.");
		}

		System.out.println("✅ Password verified successfully!");

		// Generate JWT token
		String token = JwtUtils.generateToken(account.id(), account.emailAddress());
		System.out.println("🎫 JWT token generated: "
				+ (token != null ? token.substring(0, Math.min(20, token.length())) + "..." : "null"));

		// Create response
		JsonObject response = new JsonObject();
		response.addProperty("token", token);
		response.addProperty("userId", account.id());
		response.addProperty("email", account.emailAddress());
		response.add("user", account.toJson(false));

		System.out.println("📤 Response prepared - userId: " + account.id() + ", email: " + account.emailAddress());
		System.out.println("=====================================\n");

		ctx.result(ConfigHolder.GSON.toJson(response));
		ctx.contentType(ContentType.APPLICATION_JSON);
		ctx.status(200);
	}
}