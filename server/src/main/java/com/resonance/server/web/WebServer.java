package com.resonance.server.web;

import com.resonance.server.Server;
import com.resonance.server.config.ConfigProvider;
import com.resonance.server.web.endpoints.*;
import com.resonance.server.web.endpoints.session.LoginEndpoint;
import com.resonance.server.web.endpoints.session.LogoutEndpoint;
import com.resonance.server.web.endpoints.session.SessionEndpoint;
import com.resonance.server.web.endpoints.AdminEndpoint;
import com.resonance.server.web.endpoints.ApplicationEndpoint;
import io.javalin.Javalin;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.staticfiles.Location;

import java.util.ArrayList;
import java.util.List;

/**
 * @author John 1/26/2026
 */
public class WebServer implements AutoCloseable {

	/**
	 * Config
	 */
	private final WebServerConfig config;

	/**
	 * Javalin instance
	 */
	private final Javalin javalin;

	/**
	 * Session handler
	 */
	private final SessionHandler sessionHandler;

	/**
	 * List of endpoints
	 */
	private final List<EndpointGroup> endpoints = new ArrayList<>();

	public WebServer(ConfigProvider configProvider) {
		// load config
		this.config = configProvider.getWebServerConfig();
		this.sessionHandler = new SessionHandler(this.config.jwt.hashSecret, this.config.jwt.expirationDuration);

		this.javalin = Javalin.create(config -> {
			// Enable CORS for development
			config.bundledPlugins.enableCors(cors -> {
				cors.addRule(corsConfig -> {
					corsConfig.anyHost(); // Allow any origin in development
				});
			});

			config.router.apiBuilder(() -> {
				this.initializeEndpoints();
				this.endpoints.forEach(EndpointGroup::addEndpoints);
			});

			config.staticFiles.add(staticFiles -> {
				staticFiles.hostedPath = "/";
				staticFiles.directory = "/public";
				staticFiles.location = Location.CLASSPATH;
			});

			config.spaRoot.addFile("/", "/public/index.html");

			// setup logging
			config.requestLogger.http((ctx, ms) -> {
				Server.LOGGER.info("{} {} {} {} {}ms ",
						ctx.ip(),
						ctx.method(),
						ctx.statusCode(),
						ctx.host() + ctx.path(),
						ms.longValue());
			});
		});

		this.javalin.start(this.config.port);
		Server.LOGGER.info("Web server started on port {}", this.config.port);
	}

	private void initializeEndpoints() {
		// Authentication endpoints
		this.endpoints.add(new RegisterEndpoint());
		this.endpoints.add(new LoginEndpoint());
		this.endpoints.add(new LogoutEndpoint());
		this.endpoints.add(new SessionEndpoint());
		this.endpoints.add(new PasswordChangeEndpoint());

		// Data endpoints
		this.endpoints.add(new GenresEndpoint());
		this.endpoints.add(new InstrumentsEndpoint());
		this.endpoints.add(new ProfileEndpoint());
		this.endpoints.add(new ProjectEndpoint());
		this.endpoints.add(new SearchEndpoint());
		this.endpoints.add(new ReportsEndpoint());
		this.endpoints.add(new AudioEndpoint());
		this.endpoints.add(new AnnouncementEndpoint());

		// Admin endpoints
		this.endpoints.add(new AdminEndpoint());

		// Application endpoints
		this.endpoints.add(new ApplicationEndpoint());

		Server.LOGGER.info("Registered {} endpoints", this.endpoints.size());
	}

	public SessionHandler getSessionHandler() {
		return this.sessionHandler;
	}

	public void stop() {
		if (this.javalin != null) {
			this.javalin.stop();
			Server.LOGGER.info("Web server stopped");
		}
	}

	@Override
	public void close() throws Exception {
		this.javalin.stop();
	}

	public Javalin getJavalin() {
		return this.javalin;
	}

	public WebServerConfig getConfig() {
		return this.config;
	}
}