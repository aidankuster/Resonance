package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.resonance.server.Server;
import com.resonance.server.config.JsonConfigHolder;
import com.resonance.server.data.Report;
import com.resonance.server.data.UserAccount;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;

import java.util.List;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * @author John 4/6/2026
 */
public class ReportsEndpoint implements EndpointGroup {
	
	@Override
	public void addEndpoints() {
		path("/api/reports", () -> {
			post(this::createReport);
			get(this::getReports);
		});
		path("/api/reports/{reportId}", () -> {
			get(this::getReport);
			post(this::updateReport);
		});
	}
	
	private void getReports(@NotNull Context ctx) {
		final UserAccount account = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
		
		if(!account.admin()) {
			throw new UnauthorizedResponse();
		}
		
		final List<Report> reports = Server.INSTANCE.getDatabaseManager().getReports().collectList().block();
		
		final JsonArray reportsArray = new JsonArray();
		for(Report report : reports) {
			reportsArray.add(report.toJson());
		}
		
		ctx.contentType(ContentType.APPLICATION_JSON);
		ctx.result(JsonConfigHolder.GSON.toJson(reportsArray));
	}
	
	private void updateReport(@NotNull Context ctx) {
		//TODO: implement once admin dashboard is created
	}
	
	private void getReport(@NotNull Context ctx) {
		final UserAccount account = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
		
		if(!account.admin()) {
			throw new UnauthorizedResponse();
		}
		
		final int reportId = ctx.pathParamAsClass("reportId", Integer.class)
								.getOrThrow(f -> new BadRequestResponse("Invalid report id"));
		
		final Report report = Server.INSTANCE.getDatabaseManager().getReport(reportId).block();
		
		if(report == null) {
			throw new BadRequestResponse("Report not found");
		}
		
		ctx.contentType(ContentType.APPLICATION_JSON);
		ctx.result(JsonConfigHolder.GSON.toJson(report.toJson()));
	}
	
	private void createReport(@NotNull Context ctx) {
		final UserAccount account = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
		
		final int reportedAccountId = ctx.formParamAsClass("account_id", Integer.class)
								.getOrThrow(f -> new BadRequestResponse("Invalid account id"));
		
		final String reason = ctx.formParam("reason");
		
		if(reason == null || reason.isBlank()) {
			throw new BadRequestResponse("Reason is required");
		}
		
		final Report report = Server.INSTANCE.getDatabaseManager().createReport(account.id(), reportedAccountId, reason).block();
		
		if(report == null) {
			throw new InternalServerErrorResponse("Failed to create report");
		}
		
		ctx.contentType(ContentType.APPLICATION_JSON);
		ctx.result(JsonConfigHolder.GSON.toJson(report.toJson()));
	}
	
}
