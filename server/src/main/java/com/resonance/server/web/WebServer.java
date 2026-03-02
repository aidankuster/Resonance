package com.resonance.server.web;

import com.resonance.server.config.ConfigHolder;
import com.resonance.server.web.endpoints.*;
import io.javalin.Javalin;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.staticfiles.Location;

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
	
	public WebServer() {
		
		//load config
		final ConfigHolder<WebServerConfig> configHolder = new ConfigHolder<>("webserver", WebServerConfig.class);
		
		try {
			this.config = configHolder.loadConfig();
		} catch(Exception ex) {
			throw new RuntimeException("Failed to load web server config", ex);
		}
		
		this.javalin = Javalin.create(config -> {
			config.router.apiBuilder(() -> {
				this.initializeEndpoints();
				this.endpoints.forEach(EndpointGroup::addEndpoints);
			});
			
			config.staticFiles.add(staticFiles -> {
				staticFiles.hostedPath = "/";                   // change to host files on a subpath, like '/assets'
				staticFiles.directory = "/public";              // the directory where your files are located
				staticFiles.location = Location.CLASSPATH;      // Location.CLASSPATH (jar) or Location.EXTERNAL (file system)
			});
			
			config.spaRoot.addFile("/", "/public/index.html");
		});
		
		this.javalin.start(this.config.port);
	}
	
	private void initializeEndpoints() {
		this.endpoints.add(new RegisterEndpoint());
		this.endpoints.add(new LoginEndpoint());
		this.endpoints.add(new GenresEndpoint());
		this.endpoints.add(new InstrumentsEndpoint());
		this.endpoints.add(new ProfileEndpoint());
	}
	
}
