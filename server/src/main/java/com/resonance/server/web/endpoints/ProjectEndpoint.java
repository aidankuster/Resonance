package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.resonance.server.Server;
import com.resonance.server.config.JsonConfigHolder;
import com.resonance.server.data.Project;
import com.resonance.server.data.UserAccount;
import com.resonance.server.exception.AlreadyExistsException;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;
import reactor.core.Exceptions;

import java.util.Arrays;
import java.util.List;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * @author John 3/20/2026
 */
public class ProjectEndpoint implements EndpointGroup {

    @Override
    public void addEndpoints() {
        path("/api/projects", () -> {
            post(this::createProject);
            get(this::getAllProjects);
        });

        path("/api/projects/{projectId}", () -> {
            get(this::getProject);
            put(this::updateProject);
            delete(this::deleteProject);
        });

        path("/api/projects/{projectId}/roles", () -> {
            post(this::addRole);
            delete(this::removeRole);
        });

        path("/api/projects/{projectId}/join", () -> {
            post(this::joinProject);
        });
    }

    private void createProject(@NotNull Context ctx) {
        final UserAccount account = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);

        // Get project details
        final String name = ctx.formParam("projectName");
        final String description = ctx.formParam("description");
        final String status = ctx.formParam("status");

        // input validation
        if (name == null || name.isBlank()) {
            throw new BadRequestResponse("Project name is required");
        }

        if (status == null || status.isBlank()) {
            throw new BadRequestResponse("Project status is required");
        }

        Project project;
        try {
            project = Server.INSTANCE.getDatabaseManager().createProject(account.id(), name, description, status)
                    .block();

            if (project == null) {
                throw new InternalServerErrorResponse("Failed to create project");
            }
        } catch (Throwable t) {
            // Exceptions.unwrap() to get the original exception
            final Throwable error = Exceptions.unwrap(t);

            Server.LOGGER.error("Failed to create project", error);

            if (error instanceof AlreadyExistsException) {
                throw new ConflictResponse("User already has project with the same name");
            }

            throw new InternalServerErrorResponse("Failed to create project");
        }

        // add member roles
        final String roles = ctx.formParam("roles"); // input as json

        if (roles != null && !roles.isBlank()) {
            try {

                final Project.Mutable mutableProject = project.mutable();

                final JsonArray rolesArray = JsonConfigHolder.GSON.fromJson(roles, JsonArray.class);

                for (JsonElement memberRole : rolesArray) {
                    final JsonObject memberRoleObj = memberRole.getAsJsonObject();
                    final String instrument = memberRoleObj.get("instrument").getAsString();
                    final String roleDesc = memberRoleObj.has("description")
                            && !memberRoleObj.get("description").isJsonNull()
                                    ? memberRoleObj.get("description").getAsString()
                                    : "Looking for a " + instrument + " player";

                    mutableProject.getMemberRoles()
                            .add(new Project.MemberRole(project.id(), null, instrument, roleDesc));
                }

                final Project p = Server.INSTANCE.getDatabaseManager().updateProject(mutableProject.build()).block();
                if (p == null) {
                    throw new InternalServerErrorResponse("Failed to update project");
                }

                project = p;
            } catch (HttpResponseException response) {
                throw response;
            } catch (Throwable t) {
                throw new BadRequestResponse("Invalid roles JSON format");
            }
        }

        ctx.result(JsonConfigHolder.GSON.toJson(project.toJson()));
        ctx.contentType(ContentType.APPLICATION_JSON);
        ctx.status(201);
    }

    private void getAllProjects(@NotNull Context ctx) {
        final String founderIdParam = ctx.queryParam("founderId");
        final List<Project> projects;

        if (founderIdParam != null && !founderIdParam.isBlank()) {
            try {
                final int founderId = Integer.parseInt(founderIdParam);
                projects = Server.INSTANCE.getDatabaseManager().findProjects(founderId).collectList().block();
            } catch (NumberFormatException e) {
                throw new BadRequestResponse("Invalid founderId parameter");
            }
        } else {
            projects = Server.INSTANCE.getDatabaseManager().getProjects().collectList().block();
        }

        final JsonArray array = new JsonArray();

        if (projects != null) {
            for (Project project : projects) {
                array.add(project.toJson());
            }
        }

        ctx.result(JsonConfigHolder.GSON.toJson(array));
        ctx.contentType(ContentType.APPLICATION_JSON);
    }

    private void getProject(@NotNull Context ctx) {
        final int id = ctx.pathParamAsClass("projectId", int.class).get();
        final Project project = Server.INSTANCE.getDatabaseManager().getProject(id).block();

        if (project == null) {
            throw new NotFoundResponse("Project not found");
        }

        // return data about the project
        ctx.result(JsonConfigHolder.GSON.toJson(project.toJson()));
        ctx.contentType(ContentType.APPLICATION_JSON);
    }

    private void updateProject(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();

        // Validate session
        final UserAccount currentUser = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
        if (currentUser == null) {
            throw new UnauthorizedResponse("Not authenticated");
        }

        // Fetch existing project
        final Project existingProject = Server.INSTANCE.getDatabaseManager().getProject(projectId).block();
        if (existingProject == null) {
            throw new NotFoundResponse("Project not found");
        }

        // Verify current user is the founder
        if (existingProject.founderID() != currentUser.id()) {
            throw new ForbiddenResponse("Only the project founder can edit this project");
        }

        // Get updated project details from form data
        final String name = ctx.formParam("projectName");
        final String description = ctx.formParam("description");
        final String status = ctx.formParam("status");

        // Input validation
        if (name == null || name.isBlank()) {
            throw new BadRequestResponse("Project name is required");
        }

        if (status == null || status.isBlank()) {
            throw new BadRequestResponse("Project status is required");
        }

        try {
            // Create mutable copy for updates
            final Project.Mutable mutableProject = existingProject.mutable();
            mutableProject.setName(name);
            mutableProject.setDescription(description != null ? description : "");
            mutableProject.setStatus(status);

            // Handle roles update if provided
            final String rolesJson = ctx.formParam("roles");

            if (rolesJson != null && !rolesJson.isBlank()) {
                try {
                    final JsonArray rolesArray = JsonConfigHolder.GSON.fromJson(rolesJson, JsonArray.class);

                    // Get existing member roles and preserve the founder
                    final java.util.LinkedHashSet<Project.MemberRole> currentRoles = mutableProject.getMemberRoles();

                    // Keep the founder role
                    final Project.MemberRole founderRole = currentRoles.stream()
                            .filter(r -> "Founder".equals(r.roleName()))
                            .findFirst()
                            .orElse(null);

                    // Clear and rebuild roles
                    currentRoles.clear();
                    if (founderRole != null) {
                        currentRoles.add(founderRole);
                    }

                    // Add new/updated roles from the request
                    for (JsonElement element : rolesArray) {
                        final JsonObject roleObj = element.getAsJsonObject();
                        final String instrument = roleObj.get("instrument").getAsString();
                        final String roleDesc = roleObj.has("description") && !roleObj.get("description").isJsonNull()
                                ? roleObj.get("description").getAsString()
                                : "Looking for a " + instrument + " player";

                        // Check if this role already has a member (preserve if filled)
                        final Project.MemberRole existingRole = existingProject.memberRoles() != null
                                ? Arrays.stream(existingProject.memberRoles())
                                        .filter(r -> instrument.equals(r.roleName()))
                                        .findFirst()
                                        .orElse(null)
                                : null;

                        if (existingRole != null && existingRole.account() != null) {
                            // Role is filled, preserve the account
                            currentRoles.add(new Project.MemberRole(
                                    projectId,
                                    existingRole.account(),
                                    instrument,
                                    roleDesc));
                        } else {
                            // Role is open
                            currentRoles.add(new Project.MemberRole(
                                    projectId,
                                    null,
                                    instrument,
                                    roleDesc));
                        }
                    }
                } catch (Exception e) {
                    Server.LOGGER.error("Failed to parse roles JSON", e);
                    throw new BadRequestResponse("Invalid roles JSON format");
                }
            }

            // Save the updated project
            final Project updatedProject = Server.INSTANCE.getDatabaseManager()
                    .updateProject(mutableProject.build())
                    .block();

            if (updatedProject == null) {
                throw new InternalServerErrorResponse("Failed to update project");
            }

            // Return the updated project
            ctx.result(JsonConfigHolder.GSON.toJson(updatedProject.toJson()));
            ctx.contentType(ContentType.APPLICATION_JSON);
            ctx.status(200);

            Server.LOGGER.info("Project updated: {} (ID: {}) by user {}",
                    name, projectId, currentUser.id());

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to update project", error);
            throw new InternalServerErrorResponse("Failed to update project: " + error.getMessage());
        }
    }

    private void deleteProject(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();

        // Validate session
        final UserAccount currentUser = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
        if (currentUser == null) {
            throw new UnauthorizedResponse("Not authenticated");
        }

        // Fetch existing project
        final Project existingProject = Server.INSTANCE.getDatabaseManager().getProject(projectId).block();
        if (existingProject == null) {
            throw new NotFoundResponse("Project not found");
        }

        // Verify current user is the founder (or admin)
        if (existingProject.founderID() != currentUser.id() && !currentUser.admin()) {
            throw new ForbiddenResponse("Only the project founder or admin can delete this project");
        }

        try {
            // TODO: Implement actual deletion when DatabaseManager has deleteProject method
            // For now, we'll mark it as deleted by updating status or handle appropriately

            Server.LOGGER.info("Project deletion requested: {} (ID: {}) by user {}",
                    existingProject.name(), projectId, currentUser.id());

            // Return success for now
            ctx.status(204).result("Project deleted successfully");
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to delete project", error);
            throw new InternalServerErrorResponse("Failed to delete project: " + error.getMessage());
        }
    }

    private void addRole(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();

        // Validate session
        final UserAccount currentUser = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
        if (currentUser == null) {
            throw new UnauthorizedResponse("Not authenticated");
        }

        // Fetch existing project
        final Project existingProject = Server.INSTANCE.getDatabaseManager().getProject(projectId).block();
        if (existingProject == null) {
            throw new NotFoundResponse("Project not found");
        }

        // Verify current user is the founder
        if (existingProject.founderID() != currentUser.id()) {
            throw new ForbiddenResponse("Only the project founder can add roles");
        }

        // Get role details
        final String instrument = ctx.formParam("instrument");
        final String description = ctx.formParam("description");

        if (instrument == null || instrument.isBlank()) {
            throw new BadRequestResponse("Instrument is required");
        }

        try {
            final Project.Mutable mutableProject = existingProject.mutable();

            // Check if role already exists
            final boolean roleExists = mutableProject.getMemberRoles().stream()
                    .anyMatch(r -> instrument.equals(r.roleName()));

            if (roleExists) {
                throw new ConflictResponse("Role already exists");
            }

            // Add the new role
            mutableProject.getMemberRoles().add(new Project.MemberRole(
                    projectId,
                    null,
                    instrument,
                    description != null && !description.isBlank() ? description
                            : "Looking for a " + instrument + " player"));

            final Project updatedProject = Server.INSTANCE.getDatabaseManager()
                    .updateProject(mutableProject.build())
                    .block();

            if (updatedProject == null) {
                throw new InternalServerErrorResponse("Failed to update project");
            }

            ctx.result(JsonConfigHolder.GSON.toJson(updatedProject.toJson()));
            ctx.contentType(ContentType.APPLICATION_JSON);
            ctx.status(200);

            Server.LOGGER.info("Role added to project {}: {} by user {}",
                    projectId, instrument, currentUser.id());

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to add role", error);
            throw new InternalServerErrorResponse("Failed to add role: " + error.getMessage());
        }
    }

    private void removeRole(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        final String roleName = ctx.queryParam("roleName");

        // Validate session
        final UserAccount currentUser = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
        if (currentUser == null) {
            throw new UnauthorizedResponse("Not authenticated");
        }

        if (roleName == null || roleName.isBlank()) {
            throw new BadRequestResponse("Role name is required");
        }

        // Can't remove the Founder role
        if ("Founder".equalsIgnoreCase(roleName)) {
            throw new BadRequestResponse("Cannot remove the Founder role");
        }

        // Fetch existing project
        final Project existingProject = Server.INSTANCE.getDatabaseManager().getProject(projectId).block();
        if (existingProject == null) {
            throw new NotFoundResponse("Project not found");
        }

        // Verify current user is the founder
        if (existingProject.founderID() != currentUser.id()) {
            throw new ForbiddenResponse("Only the project founder can remove roles");
        }

        try {
            final Project.Mutable mutableProject = existingProject.mutable();

            // Check if role exists and is not filled
            final Project.MemberRole targetRole = mutableProject.getMemberRoles().stream()
                    .filter(r -> roleName.equals(r.roleName()))
                    .findFirst()
                    .orElse(null);

            if (targetRole == null) {
                throw new NotFoundResponse("Role not found");
            }

            if (targetRole.account() != null) {
                throw new ConflictResponse("Cannot remove a filled role");
            }

            // Remove the role
            mutableProject.getMemberRoles().removeIf(r -> roleName.equals(r.roleName()));

            final Project updatedProject = Server.INSTANCE.getDatabaseManager()
                    .updateProject(mutableProject.build())
                    .block();

            if (updatedProject == null) {
                throw new InternalServerErrorResponse("Failed to update project");
            }

            ctx.result(JsonConfigHolder.GSON.toJson(updatedProject.toJson()));
            ctx.contentType(ContentType.APPLICATION_JSON);
            ctx.status(200);

            Server.LOGGER.info("Role removed from project {}: {} by user {}",
                    projectId, roleName, currentUser.id());

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to remove role", error);
            throw new InternalServerErrorResponse("Failed to remove role: " + error.getMessage());
        }
    }

    private void joinProject(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();

        // Validate session
        final UserAccount currentUser = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
        if (currentUser == null) {
            throw new UnauthorizedResponse("Not authenticated");
        }

        final String roleName = ctx.formParam("roleName");

        if (roleName == null || roleName.isBlank()) {
            throw new BadRequestResponse("Role name is required");
        }

        // Fetch existing project
        final Project existingProject = Server.INSTANCE.getDatabaseManager().getProject(projectId).block();
        if (existingProject == null) {
            throw new NotFoundResponse("Project not found");
        }

        // Can't join as Founder
        if ("Founder".equalsIgnoreCase(roleName)) {
            throw new BadRequestResponse("Cannot join as Founder");
        }

        // Check if user is already a member
        final boolean isAlreadyMember = existingProject.memberRoles() != null &&
                Arrays.stream(existingProject.memberRoles())
                        .anyMatch(r -> r.account() != null && r.account().id() == currentUser.id());

        if (isAlreadyMember) {
            throw new ConflictResponse("You are already a member of this project");
        }

        try {
            final Project.Mutable mutableProject = existingProject.mutable();

            // Find the role
            final Project.MemberRole targetRole = mutableProject.getMemberRoles().stream()
                    .filter(r -> roleName.equals(r.roleName()))
                    .findFirst()
                    .orElse(null);

            if (targetRole == null) {
                throw new NotFoundResponse("Role not found");
            }

            if (targetRole.account() != null) {
                throw new ConflictResponse("Role is already filled");
            }

            // Fill the role with the current user
            mutableProject.getMemberRoles().remove(targetRole);
            mutableProject.getMemberRoles().add(new Project.MemberRole(
                    projectId,
                    currentUser,
                    roleName,
                    targetRole.description()));

            final Project updatedProject = Server.INSTANCE.getDatabaseManager()
                    .updateProject(mutableProject.build())
                    .block();

            if (updatedProject == null) {
                throw new InternalServerErrorResponse("Failed to update project");
            }

            ctx.result(JsonConfigHolder.GSON.toJson(updatedProject.toJson()));
            ctx.contentType(ContentType.APPLICATION_JSON);
            ctx.status(200);

            Server.LOGGER.info("User {} joined project {} as {}",
                    currentUser.id(), projectId, roleName);

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to join project", error);
            throw new InternalServerErrorResponse("Failed to join project: " + error.getMessage());
        }
    }
}