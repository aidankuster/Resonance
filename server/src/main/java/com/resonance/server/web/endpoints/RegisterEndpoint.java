package com.resonance.server.web.endpoints;

import com.password4j.Password;
import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.UserAccount;
import com.resonance.server.exception.AlreadyExistsException;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.ConflictResponse;
import io.javalin.http.Context;
import io.javalin.http.InternalServerErrorResponse;
import org.jetbrains.annotations.NotNull;
import reactor.core.Exceptions;

import java.util.regex.Pattern;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * @author John 2/4/2026
 */
public class RegisterEndpoint implements EndpointGroup {
	
	/**
	 * Form validation regular expressions
	 */
	private static final Pattern EMAIL_REGEX = Pattern.compile("^[^\\s@]+@bravemail\\.uncp\\.edu$");
	private static final Pattern PASSWORD_REGEX = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$");
	
	@Override
	public void addEndpoints() {
		path("/api/register", () -> {
			post(this::handle);
		});
	}
	
	private void handle(@NotNull Context ctx) {
		final String email = ctx.formParam("email");
		final String password = ctx.formParam("password");
		final String confirmPassword = ctx.formParam("password2");
		
		if(email == null || email.isBlank() || !EMAIL_REGEX.matcher(email).matches()) {
			throw new BadRequestResponse("Email address is invalid");
		}
		
		if(password == null || password.isBlank() || !PASSWORD_REGEX.matcher(password).matches()) {
			throw new BadRequestResponse("Password is invalid");
		}
		
		if(confirmPassword == null || confirmPassword.isBlank() || !confirmPassword.equals(password)) {
			throw new BadRequestResponse("Passwords do not match");
		}
		
		final String hashedPassword = Password.hash(password)
											  .withBcrypt()
											  .getResult();
		
		final UserAccount account;
		
		try {
			account = Server.INSTANCE.getDatabaseManager().createAccount(email, hashedPassword, true, false).block();
			
			if(account == null) {
				throw new InternalServerErrorResponse("Failed to create account");
			}
		} catch(Throwable t) {
			// Exceptions.unwrap() to get the original exception
			final Throwable error = Exceptions.unwrap(t);
			
			if(error instanceof AlreadyExistsException) {
				throw new ConflictResponse("Email address already in use");
			}
			
			throw new InternalServerErrorResponse("Failed to create account");
		}
		
		ctx.json(ConfigHolder.GSON.toJson(account.toJson(false)));
		ctx.status(200);
	}
}
