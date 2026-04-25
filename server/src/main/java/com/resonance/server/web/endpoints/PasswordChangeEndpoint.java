package com.resonance.server.web.endpoints;

import com.password4j.Password;
import com.resonance.server.Server;
import com.resonance.server.data.UserAccount;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;
import reactor.core.Exceptions;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * Endpoint for changing user password
 *
 * @author John 4/25/2026
 */
public class PasswordChangeEndpoint implements EndpointGroup {
    
    @Override
    public void addEndpoints() {
        path("/api/password", () -> {
            post("/change", this::changePassword);
        });
    }
    
    private void changePassword(@NotNull Context ctx) {
        final UserAccount account = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
        
        final String currentPassword = ctx.formParam("currentPassword");
        final String newPassword = ctx.formParam("newPassword");
        final String confirmPassword = ctx.formParam("confirmPassword");
        
        // Validation
        if (currentPassword == null || currentPassword.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new BadRequestResponse("Password is required");
        }
        
        if (!RegisterEndpoint.PASSWORD_REGEX.matcher(newPassword).matches()) {
            throw new BadRequestResponse("New password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number");
        }
        
        // Verify current password is correct
        if (!Password.check(currentPassword, account.hashedPassword()).withBcrypt()) {
            throw new UnauthorizedResponse("Current password is incorrect");
        }
        
        // Check if passwords match
        if (!newPassword.equals(confirmPassword)) {
            throw new BadRequestResponse("Passwords do not match");
        }
        
        final String newHashedPassword = Password.hash(newPassword)
                                                 .withBcrypt()
                                                 .getResult();
        
        Server.INSTANCE.getDatabaseManager()
                       .changeAccountPassword(account.id(), newHashedPassword)
                       .block();
        
        ctx.status(200).result("Password changed successfully");
        
        Server.LOGGER.info("User {} changed their password", account.id());
    }
}
