package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.Project;
import com.resonance.server.data.ProjectRole;
import com.resonance.server.data.UserAccount;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import io.javalin.http.NotFoundResponse;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.UnauthorizedResponse;
import org.jetbrains.annotations.NotNull;
import io.javalin.http.InternalServerErrorResponse;

import java.util.List;

import static io.javalin.apibuilder.ApiBuilder.*;

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
        System.out.println("\n=== PROJECT CREATION START ===");
        System.out.println("Timestamp: " + java.time.Instant.now().toString());

        try {
            // Print all form parameters
            System.out.println("All form parameters: " + ctx.formParamMap().keySet());

            // Get founder ID
            String founderId = ctx.formParam("founderId");
            System.out.println("1. founderId from form: '" + founderId + "'");

            if (founderId == null || founderId.trim().isEmpty()) {
                System.err.println("ERROR: founderId is null or empty");
                throw new UnauthorizedResponse("User not authenticated - missing founderId");
            }

            // Parse founder ID
            int founderIdInt;
            try {
                founderIdInt = Integer.parseInt(founderId);
                System.out.println("2. Parsed founderId: " + founderIdInt);
            } catch (NumberFormatException e) {
                System.err.println("ERROR: Invalid founderId format: " + founderId);
                throw new BadRequestResponse("Invalid founderId format: " + founderId);
            }

            // Find user account
            System.out.println("3. Looking up user account for ID: " + founderIdInt);
            UserAccount founder = Server.INSTANCE.getDatabaseManager()
                    .findAccount(founderIdInt).block();

            System.out.println("4. Founder found: " + (founder != null));
            if (founder == null) {
                System.err.println("ERROR: No user found with ID: " + founderIdInt);
                throw new NotFoundResponse("User not found with ID: " + founderIdInt);
            }

            // Get project details
            String projectName = ctx.formParam("projectName");
            String description = ctx.formParam("description");
            String status = ctx.formParam("status");
            String rolesJson = ctx.formParam("roles");

            System.out.println("5. Project details:");
            System.out.println("   - projectName: '" + projectName + "'");
            System.out.println("   - description: '" + description + "'");
            System.out.println("   - status: '" + status + "'");
            System.out.println("   - rolesJson: '" + rolesJson + "'");

            // Validate project name
            if (projectName == null || projectName.trim().isEmpty()) {
                System.err.println("ERROR: Project name is empty");
                throw new BadRequestResponse("Project name is required");
            }

            // Create project in database
            System.out.println("6. Calling DatabaseManager.createProject() with:");
            System.out.println("   - projectName: " + projectName);
            System.out.println("   - description: " + description);
            System.out.println("   - status: " + status);
            System.out.println("   - founderId: " + founder.id());

            Project project = null;
            try {
                project = Server.INSTANCE.getDatabaseManager()
                        .createProject(projectName, description, status, founder.id()).block();
            } catch (Exception e) {
                System.err.println("ERROR: Exception in createProject: " + e.getMessage());
                e.printStackTrace();
                throw new InternalServerErrorResponse("Database error creating project: " + e.getMessage());
            }

            System.out.println("7. Project created: " + (project != null ? "ID=" + project.id : "null"));

            if (project == null) {
                System.err.println("ERROR: createProject returned null");
                throw new InternalServerErrorResponse("Failed to create project - database returned null");
            }

            // Add roles if provided and status is not planning
            System.out.println("8. Checking if we should add roles:");
            System.out.println("   - status: '" + status + "'");
            System.out.println("   - status equals planning? " + "planning".equals(status));
            System.out.println("   - rolesJson present? " + (rolesJson != null));
            System.out.println("   - rolesJson empty? " + (rolesJson != null && rolesJson.isEmpty()));

            if (!"planning".equals(status) && rolesJson != null && !rolesJson.isEmpty()) {
                System.out.println("✅ CONDITION MET - Adding roles for project ID: " + project.id);
                System.out.println("Processing roles JSON: " + rolesJson);

                try {
                    JsonArray rolesArray = ConfigHolder.GSON.fromJson(rolesJson, JsonArray.class);
                    System.out.println("   - Found " + rolesArray.size() + " roles in JSON");

                    for (int i = 0; i < rolesArray.size(); i++) {
                        JsonObject roleObj = rolesArray.get(i).getAsJsonObject();
                        String instrument = roleObj.get("instrument").getAsString();
                        String roleDesc = roleObj.has("description") && !roleObj.get("description").isJsonNull()
                                ? roleObj.get("description").getAsString()
                                : "Looking for a " + instrument + " player";

                        System.out.println("   - Adding role " + i + ": " + instrument + " - " + roleDesc);

                        try {
                            ProjectRole addedRole = Server.INSTANCE.getDatabaseManager()
                                    .addProjectRole(project.id, instrument, roleDesc)
                                    .block();

                            System.out.println("     ✅ Role added with ID: " +
                                    (addedRole != null ? addedRole.id : "null"));
                        } catch (Exception e) {
                            System.err.println("     ❌ ERROR adding role: " + e.getMessage());
                            e.printStackTrace();
                        }
                    }
                } catch (JsonParseException e) {
                    System.err.println("ERROR parsing roles JSON: " + e.getMessage());
                    e.printStackTrace();
                }
            } else {
                System.out.println("❌ CONDITION NOT MET - skipping roles");
                if ("planning".equals(status)) {
                    System.out.println("  Reason: status is planning");
                } else if (rolesJson == null) {
                    System.out.println("  Reason: rolesJson is null");
                } else if (rolesJson.isEmpty()) {
                    System.out.println("  Reason: rolesJson is empty");
                }
            }

            // Fetch the updated project with roles
            System.out.println("9. Fetching updated project with ID: " + project.id);
            Project updatedProject = null;
            try {
                updatedProject = Server.INSTANCE.getDatabaseManager()
                        .getProject(project.id).block();
            } catch (Exception e) {
                System.err.println("ERROR fetching updated project: " + e.getMessage());
                e.printStackTrace();
            }

            System.out.println("10. Updated project: " + (updatedProject != null ? "success" : "null"));

            if (updatedProject == null) {
                // Return at least the basic project
                ctx.json(ConfigHolder.GSON.toJson(project));
            } else {
                ctx.json(ConfigHolder.GSON.toJson(updatedProject));
            }

            ctx.status(201);
            System.out.println("=== PROJECT CREATION SUCCESS ===");

        } catch (Exception e) {
            System.err.println("!!! ERROR in createProject: " + e.getMessage());
            e.printStackTrace();
            throw new InternalServerErrorResponse("Failed to create project: " + e.getMessage());
        }
    }

    private void getAllProjects(@NotNull Context ctx) {
        System.out.println("\n=== GET ALL PROJECTS ===");
        try {
            List<Project> projects = Server.INSTANCE.getDatabaseManager()
                    .getAllProjects().collectList().block();

            System.out.println("Found " + (projects != null ? projects.size() : 0) + " projects");
            ctx.json(ConfigHolder.GSON.toJson(projects));
        } catch (Exception e) {
            System.err.println("ERROR in getAllProjects: " + e.getMessage());
            e.printStackTrace();
            throw new InternalServerErrorResponse("Failed to get projects");
        }
    }

    private void getProject(@NotNull Context ctx) {
        System.out.println("\n=== GET PROJECT ===");
        try {
            int projectId = ctx.pathParamAsClass("projectId", int.class).get();
            System.out.println("Looking up project ID: " + projectId);

            Project project = Server.INSTANCE.getDatabaseManager()
                    .getProject(projectId).block();

            if (project == null) {
                System.out.println("Project not found: " + projectId);
                throw new NotFoundResponse("Project not found");
            }

            System.out.println("Found project: " + project.projectName);
            ctx.json(ConfigHolder.GSON.toJson(project));
        } catch (Exception e) {
            System.err.println("ERROR in getProject: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    private void updateProject(@NotNull Context ctx) {
        int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        System.out.println("Update project called for ID: " + projectId + " (not implemented)");
        ctx.status(501).result("Not implemented yet");
    }

    private void deleteProject(@NotNull Context ctx) {
        int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        System.out.println("Delete project called for ID: " + projectId + " (not implemented)");
        ctx.status(501).result("Not implemented yet");
    }

    private void addRole(@NotNull Context ctx) {
        int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        System.out.println("Add role to project " + projectId + " (not implemented)");
        ctx.status(501).result("Not implemented yet");
    }

    private void removeRole(@NotNull Context ctx) {
        int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        int roleId = ctx.pathParamAsClass("roleId", int.class).get();
        System.out.println("Remove role " + roleId + " from project " + projectId + " (not implemented)");
        ctx.status(501).result("Not implemented yet");
    }

    private void joinProject(@NotNull Context ctx) {
        int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        String userId = ctx.formParam("userId");
        String roleId = ctx.formParam("roleId");
        System.out.println("Join project " + projectId + " user " + userId + " role " + roleId + " (not implemented)");
        ctx.status(501).result("Not implemented yet");
    }
}