package com.resonance.server.web.endpoints.session;

import com.google.gson.JsonArray;
import com.resonance.server.Server;
import com.resonance.server.config.JsonConfigHolder;
import com.resonance.server.data.Application;
import com.resonance.server.data.Project;
import com.resonance.server.data.UserAccount;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;

import static io.javalin.apibuilder.ApiBuilder.*;

public class ApplicationEndpoint implements EndpointGroup {

    @Override
    public void addEndpoints() {
        path("/api/applications", () -> {
            post(this::createApplication);
            get(this::getMyApplications);
        });

        path("/api/projects/{projectId}/applications", () -> {
            get(this::getProjectApplications);
        });

        path("/api/applications/{applicationId}", () -> {
            post("/accept", this::acceptApplication);
            post("/reject", this::rejectApplication);
            post("/withdraw", this::withdrawApplication);
        });
    }

    private void createApplication(@NotNull Context ctx) {
        final UserAccount currentUser = Server.INSTANCE.getWebServer()
                .getSessionHandler().validateSession(ctx);

        final int projectId = Integer.parseInt(ctx.formParam("projectId"));
        final String roleName = ctx.formParam("roleName");
        final String message = ctx.formParam("message");

        if (roleName == null || roleName.isBlank()) {
            throw new BadRequestResponse("Role name is required");
        }

        // Check if user already applied
        Application application = Server.INSTANCE.getDatabaseManager()
                .createApplication(projectId, roleName, currentUser.id(), message)
                .block();

        ctx.status(201).result(JsonConfigHolder.GSON.toJson(application.toJson()));
        ctx.contentType(ContentType.APPLICATION_JSON);
    }

    private void getProjectApplications(@NotNull Context ctx) {
        final int projectId = ctx.pathParamAsClass("projectId", int.class).get();
        final UserAccount currentUser = Server.INSTANCE.getWebServer()
                .getSessionHandler().validateSession(ctx);

        // Verify user is project founder
        Project project = Server.INSTANCE.getDatabaseManager()
                .getProject(projectId)
                .block();

        if (project == null) {
            throw new NotFoundResponse("Project not found");
        }

        if (project.founderID() != currentUser.id()) {
            throw new ForbiddenResponse("Only the founder can view applications");
        }

        var applications = Server.INSTANCE.getDatabaseManager()
                .getProjectApplications(projectId)
                .collectList()
                .block();

        JsonArray array = new JsonArray();
        applications.forEach(app -> array.add(app.toJson()));

        ctx.result(JsonConfigHolder.GSON.toJson(array));
        ctx.contentType(ContentType.APPLICATION_JSON);
    }

    private void getMyApplications(@NotNull Context ctx) {
        final UserAccount currentUser = Server.INSTANCE.getWebServer()
                .getSessionHandler().validateSession(ctx);

        var applications = Server.INSTANCE.getDatabaseManager()
                .getUserApplications(currentUser.id())
                .collectList()
                .block();

        JsonArray array = new JsonArray();
        applications.forEach(app -> array.add(app.toJson()));

        ctx.result(JsonConfigHolder.GSON.toJson(array));
        ctx.contentType(ContentType.APPLICATION_JSON);
    }

    private void acceptApplication(@NotNull Context ctx) {
        final int applicationId = ctx.pathParamAsClass("applicationId", int.class).get();
        final UserAccount currentUser = Server.INSTANCE.getWebServer()
                .getSessionHandler().validateSession(ctx);

        Project updatedProject = Server.INSTANCE.getDatabaseManager()
                .acceptApplication(applicationId)
                .block();

        ctx.result(JsonConfigHolder.GSON.toJson(updatedProject.toJson()));
        ctx.contentType(ContentType.APPLICATION_JSON);
    }

    private void rejectApplication(@NotNull Context ctx) {
        final int applicationId = ctx.pathParamAsClass("applicationId", int.class).get();

        Application application = Server.INSTANCE.getDatabaseManager()
                .updateApplicationStatus(applicationId, "REJECTED")
                .block();

        ctx.result(JsonConfigHolder.GSON.toJson(application.toJson()));
        ctx.contentType(ContentType.APPLICATION_JSON);
    }

    private void withdrawApplication(@NotNull Context ctx) {
        final int applicationId = ctx.pathParamAsClass("applicationId", int.class).get();
        final UserAccount currentUser = Server.INSTANCE.getWebServer()
                .getSessionHandler().validateSession(ctx);

        Application application = Server.INSTANCE.getDatabaseManager()
                .updateApplicationStatus(applicationId, "WITHDRAWN")
                .block();

        ctx.result(JsonConfigHolder.GSON.toJson(application.toJson()));
        ctx.contentType(ContentType.APPLICATION_JSON);
    }
}