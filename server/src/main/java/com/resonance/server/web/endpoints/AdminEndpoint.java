package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.resonance.server.Server;
import com.resonance.server.config.JsonConfigHolder;
import com.resonance.server.data.Project;
import com.resonance.server.data.UserAccount;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;
import reactor.core.Exceptions;

import java.util.List;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * Admin-only endpoints for platform management
 * 
 * @author Aidan 4/13/2026
 */
public class AdminEndpoint implements EndpointGroup {

    @Override
    public void addEndpoints() {
        path("/api/admin", () -> {
            // Verify admin access for all endpoints in this group
            before(ctx -> {
                final UserAccount currentUser = Server.INSTANCE.getWebServer()
                        .getSessionHandler().validateSession(ctx);

                if (currentUser == null) {
                    throw new UnauthorizedResponse("Not authenticated");
                }

                if (!currentUser.admin()) {
                    throw new ForbiddenResponse("Admin access required");
                }
            });

            // User management
            path("/users", () -> {
                get(this::getAllUsers);
            });

            path("/users/{userId}", () -> {
                get(this::getUser);
                delete(this::deleteUser);
                post("/toggle", this::toggleUserStatus);
                post("/admin", this::toggleAdminStatus);
            });

            // Project management
            path("/projects", () -> {
                get(this::getAllProjectsAdmin);
            });

            path("/projects/{projectId}", () -> {
                delete(this::deleteProjectAdmin);
            });

            // Platform stats
            path("/stats", () -> {
                get(this::getPlatformStats);
            });
        });
    }

    /**
     * Get all users with full details (admin only)
     */
    private void getAllUsers(@NotNull Context ctx) {
        try {
            final List<UserAccount> users = Server.INSTANCE.getDatabaseManager()
                    .getAccounts()
                    .collectList()
                    .block();

            final JsonArray array = new JsonArray();

            if (users != null) {
                for (UserAccount user : users) {
                    // Include sensitive info for admin view
                    array.add(user.toJson(true));
                }
            }

            ctx.result(JsonConfigHolder.GSON.toJson(array));
            ctx.contentType(ContentType.APPLICATION_JSON);

            Server.LOGGER.info("Admin fetched all users ({} total)", users != null ? users.size() : 0);

        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to fetch users for admin", error);
            throw new InternalServerErrorResponse("Failed to fetch users: " + error.getMessage());
        }
    }

    /**
     * Get a single user with full details (admin only)
     */
    private void getUser(@NotNull Context ctx) {
        final int userId = ctx.pathParamAsClass("userId", int.class).get();

        try {
            final UserAccount user = Server.INSTANCE.getDatabaseManager()
                    .findAccount(userId)
                    .block();

            if (user == null) {
                throw new NotFoundResponse("User not found");
            }

            // Include sensitive info for admin view
            ctx.result(JsonConfigHolder.GSON.toJson(user.toJson(true)));
            ctx.contentType(ContentType.APPLICATION_JSON);

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to fetch user {} for admin", userId, error);
            throw new InternalServerErrorResponse("Failed to fetch user: " + error.getMessage());
        }
    }

    /**
     * Delete a user and all associated data (admin only)
     */
    private void deleteUser(@NotNull Context ctx) {
        final int userId = ctx.pathParamAsClass("userId", int.class).get();
        final UserAccount currentUser = Server.INSTANCE.getWebServer()
                .getSessionHandler().validateSession(ctx);

        // Prevent self-deletion
        if (currentUser != null && userId == currentUser.id()) {
            throw new BadRequestResponse("Cannot delete your own admin account");
        }

        try {
            // Fetch the user to be deleted
            final UserAccount targetUser = Server.INSTANCE.getDatabaseManager()
                    .findAccount(userId)
                    .block();

            if (targetUser == null) {
                throw new NotFoundResponse("User not found");
            }

            // Delete all projects created by this user
            final List<Project> userProjects = Server.INSTANCE.getDatabaseManager()
                    .findProjects(userId)
                    .collectList()
                    .block();

            if (userProjects != null) {
                for (Project project : userProjects) {
                    Server.INSTANCE.getDatabaseManager()
                            .deleteProject(project.id())
                            .block();
                }
                Server.LOGGER.info("Deleted {} projects for user {}", userProjects.size(), userId);
            }

            // Remove user from any projects they joined
            Server.INSTANCE.getDatabaseManager()
                    .removeUserFromAllProjects(userId)
                    .block();

            // Delete the user account
            Server.INSTANCE.getDatabaseManager()
                    .deleteUser(userId)
                    .block();

            Server.LOGGER.info("Admin {} deleted user {} ({})",
                    currentUser != null ? currentUser.id() : "unknown",
                    userId,
                    targetUser.emailAddress());

            ctx.status(204).result("User and all associated data deleted successfully");

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to delete user {}", userId, error);
            throw new InternalServerErrorResponse("Failed to delete user: " + error.getMessage());
        }
    }

    /**
     * Toggle user enabled/disabled status (admin only)
     */
    private void toggleUserStatus(@NotNull Context ctx) {
        final int userId = ctx.pathParamAsClass("userId", int.class).get();
        final UserAccount currentUser = Server.INSTANCE.getWebServer()
                .getSessionHandler().validateSession(ctx);

        // Prevent self-disable
        if (currentUser != null && userId == currentUser.id()) {
            throw new BadRequestResponse("Cannot disable your own account");
        }

        try {
            final UserAccount targetUser = Server.INSTANCE.getDatabaseManager()
                    .findAccount(userId)
                    .block();

            if (targetUser == null) {
                throw new NotFoundResponse("User not found");
            }

            // Toggle enabled status
            final UserAccount.Mutable mutable = targetUser.mutable();
            mutable.setEnabled(!targetUser.enabled());

            // Update the account - this returns Mono<Void>
            Server.INSTANCE.getDatabaseManager()
                    .updateAccount(mutable.build())
                    .block();

            // Fetch the updated user
            final UserAccount updated = Server.INSTANCE.getDatabaseManager()
                    .findAccount(userId)
                    .block();

            if (updated == null) {
                throw new InternalServerErrorResponse("Failed to fetch updated user");
            }

            ctx.result(JsonConfigHolder.GSON.toJson(updated.toJson(true)));
            ctx.contentType(ContentType.APPLICATION_JSON);

            Server.LOGGER.info("Admin {} {} user {} ({})",
                    currentUser != null ? currentUser.id() : "unknown",
                    updated.enabled() ? "enabled" : "disabled",
                    userId,
                    targetUser.emailAddress());

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to toggle user status for {}", userId, error);
            throw new InternalServerErrorResponse("Failed to toggle user status: " + error.getMessage());
        }
    }

    /**
     * Toggle user admin status (admin only)
     */
    private void toggleAdminStatus(@NotNull Context ctx) {
        final int userId = ctx.pathParamAsClass("userId", int.class).get();
        final UserAccount currentUser = Server.INSTANCE.getWebServer()
                .getSessionHandler().validateSession(ctx);

        // Prevent self-demotion
        if (currentUser != null && userId == currentUser.id()) {
            throw new BadRequestResponse("Cannot change your own admin status");
        }

        try {
            final UserAccount targetUser = Server.INSTANCE.getDatabaseManager()
                    .findAccount(userId)
                    .block();

            if (targetUser == null) {
                throw new NotFoundResponse("User not found");
            }

            // Toggle admin status
            final UserAccount.Mutable mutable = targetUser.mutable();
            mutable.setAdmin(!targetUser.admin());

            // Update the account - this returns Mono<Void>
            Server.INSTANCE.getDatabaseManager()
                    .updateAccount(mutable.build())
                    .block();

            // Fetch the updated user
            final UserAccount updated = Server.INSTANCE.getDatabaseManager()
                    .findAccount(userId)
                    .block();

            if (updated == null) {
                throw new InternalServerErrorResponse("Failed to fetch updated user");
            }

            ctx.result(JsonConfigHolder.GSON.toJson(updated.toJson(true)));
            ctx.contentType(ContentType.APPLICATION_JSON);

            Server.LOGGER.info("Admin {} {} admin privileges for user {} ({})",
                    currentUser != null ? currentUser.id() : "unknown",
                    updated.admin() ? "granted" : "revoked",
                    userId,
                    targetUser.emailAddress());

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to toggle admin status for {}", userId, error);
            throw new InternalServerErrorResponse("Failed to toggle admin status: " + error.getMessage());
        }
    }

    /**
     * Get all projects with full details (admin only)
     */
    private void getAllProjectsAdmin(@NotNull Context ctx) {
        try {
            final List<Project> projects = Server.INSTANCE.getDatabaseManager()
                    .getProjects()
                    .collectList()
                    .block();

            final JsonArray array = new JsonArray();

            if (projects != null) {
                for (Project project : projects) {
                    array.add(project.toJson());
                }
            }

            ctx.result(JsonConfigHolder.GSON.toJson(array));
            ctx.contentType(ContentType.APPLICATION_JSON);

            Server.LOGGER.info("Admin fetched all projects ({} total)", projects != null ? projects.size() : 0);

        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to fetch projects for admin", error);
            throw new InternalServerErrorResponse("Failed to fetch projects: " + error.getMessage());
        }
    }

    /**
     * Delete a project (admin only)
     */
    private void deleteProjectAdmin(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        final UserAccount currentUser = Server.INSTANCE.getWebServer()
                .getSessionHandler().validateSession(ctx);

        try {
            final Project project = Server.INSTANCE.getDatabaseManager()
                    .getProject(projectId)
                    .block();

            if (project == null) {
                throw new NotFoundResponse("Project not found");
            }

            Server.INSTANCE.getDatabaseManager()
                    .deleteProject(projectId)
                    .block();

            Server.LOGGER.info("Admin {} deleted project {} ({})",
                    currentUser != null ? currentUser.id() : "unknown",
                    projectId,
                    project.name());

            ctx.status(204).result("Project deleted successfully");

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to delete project {}", projectId, error);
            throw new InternalServerErrorResponse("Failed to delete project: " + error.getMessage());
        }
    }

    /**
     * Get platform statistics (admin only)
     */
    private void getPlatformStats(@NotNull Context ctx) {
        try {
            final List<UserAccount> users = Server.INSTANCE.getDatabaseManager()
                    .getAccounts()
                    .collectList()
                    .block();

            final List<Project> projects = Server.INSTANCE.getDatabaseManager()
                    .getProjects()
                    .collectList()
                    .block();

            final long totalUsers = users != null ? users.size() : 0;
            final long activeUsers = users != null ? users.stream().filter(UserAccount::enabled).count() : 0;
            final long adminUsers = users != null ? users.stream().filter(UserAccount::admin).count() : 0;
            final long totalProjects = projects != null ? projects.size() : 0;
            final long recruitingProjects = projects != null
                    ? projects.stream().filter(p -> "recruiting".equalsIgnoreCase(p.status())).count()
                    : 0;
            final long activeProjects = projects != null
                    ? projects.stream().filter(p -> "active".equalsIgnoreCase(p.status())).count()
                    : 0;

            final JsonObject stats = new JsonObject();
            stats.addProperty("totalUsers", totalUsers);
            stats.addProperty("activeUsers", activeUsers);
            stats.addProperty("disabledUsers", totalUsers - activeUsers);
            stats.addProperty("adminUsers", adminUsers);
            stats.addProperty("totalProjects", totalProjects);
            stats.addProperty("recruitingProjects", recruitingProjects);
            stats.addProperty("activeProjects", activeProjects);
            stats.addProperty("planningProjects", totalProjects - recruitingProjects - activeProjects);

            ctx.result(JsonConfigHolder.GSON.toJson(stats));
            ctx.contentType(ContentType.APPLICATION_JSON);

        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to fetch platform stats", error);
            throw new InternalServerErrorResponse("Failed to fetch platform stats: " + error.getMessage());
        }
    }
}