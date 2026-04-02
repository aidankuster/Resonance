package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.Project;
import com.resonance.server.data.UserAccount;
import com.resonance.server.exception.AlreadyExistsException;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;
import reactor.core.Exceptions;

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
        if(name == null || name.isBlank()) {
            throw new BadRequestResponse("Project name is required");
        }
        
        if(status == null || status.isBlank()) {
            throw new BadRequestResponse("Project status is required");
        }
        
        Project project;
        try {
            project = Server.INSTANCE.getDatabaseManager().createProject(account.id(), name, description, status).block();
            
            if(project == null) {
                throw new InternalServerErrorResponse("Failed to create project");
            }
        } catch(Throwable t) {
            // Exceptions.unwrap() to get the original exception
            final Throwable error = Exceptions.unwrap(t);
            
            Server.LOGGER.error("Failed to create project", error);
            
            if(error instanceof AlreadyExistsException) {
                throw new ConflictResponse("User already has project with the same name");
            }
            
            throw new InternalServerErrorResponse("Failed to create project");
        }
        
        // add member roles
        final String roles = ctx.formParam("roles"); //input as json
        
        if(roles != null && !roles.isBlank()) {
            try {
                
                final Project.Mutable mutableProject = project.mutable();
                
                final JsonArray rolesArray = ConfigHolder.GSON.fromJson(roles, JsonArray.class);
                
                for(JsonElement memberRole : rolesArray) {
                    final JsonObject memberRoleObj = memberRole.getAsJsonObject();
                    final String instrument = memberRoleObj.get("instrument").getAsString();
                    final String roleDesc = memberRoleObj.has("description") && !memberRoleObj.get("description").isJsonNull()
                            ? memberRoleObj.get("description").getAsString()
                            : "Looking for a " + instrument + " player";
                    
                    mutableProject.getMemberRoles().add(new Project.MemberRole(project.id(), null, instrument, roleDesc));
                }
                
                final Project p = Server.INSTANCE.getDatabaseManager().updateProject(mutableProject.build()).block();
                if(p == null) {
                    throw new InternalServerErrorResponse("Failed to update project");
                }
                
                project = p;
            } catch(HttpResponseException response) {
                throw response;
            } catch(Throwable t) {
                throw new BadRequestResponse("Invalid roles JSON format");
            }
        }
        
        ctx.result(ConfigHolder.GSON.toJson(project.toJson()));
        ctx.contentType(ContentType.APPLICATION_JSON);
        ctx.status(201);
    }

    private void getAllProjects(@NotNull Context ctx) {
        final List<Project> projects = Server.INSTANCE.getDatabaseManager().getProjects().collectList().block();
        final JsonArray array = new JsonArray();
        
        if(projects != null) {
            for(Project project : projects) {
                array.add(project.toJson());
            }
        }
        
        ctx.result(ConfigHolder.GSON.toJson(array));
        ctx.contentType(ContentType.APPLICATION_JSON);
    }

    private void getProject(@NotNull Context ctx) {
        final int id = ctx.pathParamAsClass("projectId", int.class).get();
        final Project project = Server.INSTANCE.getDatabaseManager().getProject(id).block();
        
        if(project == null) {
            throw new NotFoundResponse("Project not found");
        }
        
        //return data about the project
        ctx.result(ConfigHolder.GSON.toJson(project.toJson()));
        ctx.contentType(ContentType.APPLICATION_JSON);
    }

    private void updateProject(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        ctx.status(501).result("Not implemented yet");
    }

    private void deleteProject(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        ctx.status(501).result("Not implemented yet");
    }

    private void addRole(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        ctx.status(501).result("Not implemented yet");
    }

    private void removeRole(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        ctx.status(501).result("Not implemented yet");
    }

    private void joinProject(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        ctx.status(501).result("Not implemented yet");
    }
}