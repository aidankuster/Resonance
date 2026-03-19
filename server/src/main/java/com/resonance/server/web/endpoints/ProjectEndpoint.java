package com.resonance.server.web.endpoints;

import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import org.jetbrains.annotations.NotNull;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * @author John 3/18/2026
 */
public class ProjectEndpoint implements EndpointGroup {
	
	@Override
	public void addEndpoints() {
		path("/api/projects", () -> {
			get(this::handleFetchProjects);
			post(this::handleNewProject); //creating new project
		});
		
		path("/api/project/{id}", () -> {
			post(this::handle);
			get(this::handle);
		});
	}
	
	private void handle(@NotNull Context ctx) {
		
		final int id = ctx.pathParamAsClass("id", int.class).get();
		
		if(!ctx.method().equals("POST")) {
			//return data about the project
			return;
		}
		
		//edit project (adding new members, etc)
		//TODO: require authentication, must be project founder
		
	}
	
	private void handleNewProject(@NotNull Context ctx) {
		//TODO: authentication
		
		
	}
	
	private void handleFetchProjects(@NotNull Context ctx) {
	
	}
	
}