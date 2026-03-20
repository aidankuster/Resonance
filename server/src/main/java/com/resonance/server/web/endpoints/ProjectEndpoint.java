package com.resonance.server.web.endpoints;

import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.Project;
import com.resonance.server.data.UserAccount;
import com.resonance.server.exception.AlreadyExistsException;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;
import reactor.core.Exceptions;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * @author John 3/18/2026
 */
public class ProjectEndpoint implements EndpointGroup {
	
	@Override
	public void addEndpoints() {
		path("/api/projects", () -> {
			get(this::handleSearchProjects);
			post(this::handleNewProject); //creating new project
		});
		
		path("/api/project/{id}", () -> {
			post(this::handle);
			get(this::handle);
		});
	}
	
	private void handle(@NotNull Context ctx) {
		
		final int id = ctx.pathParamAsClass("id", int.class).get();
		final Project project = Server.INSTANCE.getDatabaseManager().findProject(id).block();
		
		if(project == null) {
			throw new NotFoundResponse("Project not found");
		}
		
		if(!ctx.method().equals("POST")) {
			//return data about the project
			ctx.result(ConfigHolder.GSON.toJson(project.toJson()));
			ctx.contentType(ContentType.APPLICATION_JSON);
			return;
		}
		
		//edit project (adding new members, etc)
		//TODO: require authentication, must be project founder
		
	}
	
	private void handleNewProject(@NotNull Context ctx) {
		final UserAccount account = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
		
		//TODO: input validation
		
		final String name = ctx.formParam("name");
		
		if(name == null || name.isBlank()) {
			throw new ConflictResponse("Project name cannot be empty");
		}
		
		final String description = ctx.formParam("description");
		
		final Project project;
		try {
			project = Server.INSTANCE.getDatabaseManager().createProject(account.id(), name, description).block();
			
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
		
		ctx.result(ConfigHolder.GSON.toJson(project.toJson()));
		ctx.contentType(ContentType.APPLICATION_JSON);
	}
	
	private void handleSearchProjects(@NotNull Context ctx) {
	
	}
	
}