package com.resonance.server;

import com.resonance.server.config.ConfigProvider;
import com.resonance.server.database.DatabaseManager;
import com.resonance.server.web.WebServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * TODO: logging
 *
 * @author John 1/14/2026
 */
public class Server implements AutoCloseable {

	/**
	 * Singleton instance
	 */
	public static Server INSTANCE;

	/**
	 * Logger
	 */
	public static final Logger LOGGER = LoggerFactory.getLogger("Resonance");

	/**
	 * Main entrypoint for the server app
	 */
	public static void main(String[] args) {
		final long startTime = System.currentTimeMillis();
		LOGGER.info("Starting Resonance...");

		try {
			INSTANCE = new Server(new ConfigProvider());

			final long completionTime = System.currentTimeMillis() - startTime;
			LOGGER.info("Resonance started in {}ms", completionTime);

		} catch (Throwable t) {
			LOGGER.error("Failed to start Resonance", t);
		}
	}

	/**
	 * Database manager
	 */
	private final DatabaseManager databaseManager;

	/**
	 * Javalin web server
	 */
	private final WebServer webServer;

	public Server(ConfigProvider configProvider) {
		this.databaseManager = new DatabaseManager(configProvider);
		this.webServer = new WebServer(configProvider);
	}

	public DatabaseManager getDatabaseManager() {
		return this.databaseManager;
	}

	public WebServer getWebServer() {
		return this.webServer;
	}
	
	@Override
	public void close() throws Exception {
		try {
			this.databaseManager.close();
		} finally {
			this.webServer.close();
		}
	}
}