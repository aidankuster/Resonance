package com.resonance.server.web;

import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.web.endpoints.*;
import com.resonance.server.web.endpoints.session.LoginEndpoint;
import com.resonance.server.web.endpoints.session.LogoutEndpoint;
import com.resonance.server.web.endpoints.session.SessionEndpoint;
import io.javalin.Javalin;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.staticfiles.Location;
import org.eclipse.jetty.http.HttpCookie;
import org.eclipse.jetty.server.session.DefaultSessionCache;

import java.util.ArrayList;
import java.util.List;

/**
 * @author John 1/26/2026
 */
public class WebServer {
	
	/**
	 * Config
	 */
	private final WebServerConfig config;
	
	/**
	 * Javalin instance
	 */
	private final Javalin javalin;
	
	/**
	 * List of endpoints
	 */
	private final List<EndpointGroup> endpoints = new ArrayList<>();
	
	/**
	 * Session handler
	 */
	private final SessionHandler sessionHandler;
	
	public WebServer(Server server) {
		
		// load config
		final ConfigHolder<WebServerConfig> configHolder = new ConfigHolder<>("webserver", WebServerConfig.class);
		
		try {
			this.config = configHolder.loadConfig();
		} catch(Exception ex) {
			throw new RuntimeException("Failed to load web server config", ex);
		}
		
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
				staticFiles.hostedPath = "/"; // change to host files on a subpath, like '/assets'
				staticFiles.directory = "/public"; // the directory where your files are located
				staticFiles.location = Location.CLASSPATH; // Location.CLASSPATH (jar) or Location.EXTERNAL (file
				// system)
			});
			
			config.spaRoot.addFile("/", "/public/index.html");
			
			// setup logging
			config.requestLogger.http((ctx, ms) -> {
				Server.LOGGER.info("{} {} {} {} {}ms ", ctx.ip(), ctx.method(), ctx.statusCode(), ctx.host() + ctx.path(), ms.longValue());
			});
		});
		
		this.javalin.start(this.config.port);
	}
	
	private void initializeEndpoints() {
		this.endpoints.add(new RegisterEndpoint());
		this.endpoints.add(new LoginEndpoint());
		this.endpoints.add(new LogoutEndpoint());
		this.endpoints.add(new SessionEndpoint());
		
		this.endpoints.add(new GenresEndpoint());
		this.endpoints.add(new InstrumentsEndpoint());
		this.endpoints.add(new ProfileEndpoint());
		this.endpoints.add(new ProjectEndpoint());
	}
	
	public SessionHandler getSessionHandler() {
		return this.sessionHandler;
	}
	
}