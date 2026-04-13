package com.resonance.server.config;

import com.resonance.server.database.DatabaseConfig;
import com.resonance.server.web.WebServerConfig;

/**
 * Class for providing configurations to the server
 *
 * @author John 4/12/2026
 */
public class ConfigProvider {
	
	public ConfigProvider() {}
	
	public DatabaseConfig getDatabaseConfig() {
		final JsonConfigHolder<DatabaseConfig> configHolder = new JsonConfigHolder<>("database", DatabaseConfig.class);
		
		try {
			return configHolder.loadConfig();
		} catch(Exception ex) {
			throw new RuntimeException("Failed to load database config", ex);
		}
	}
	
	public WebServerConfig getWebServerConfig() {
		final JsonConfigHolder<WebServerConfig> configHolder = new JsonConfigHolder<>("webserver", WebServerConfig.class);
		
		try {
			return configHolder.loadConfig();
		} catch (Exception ex) {
			throw new RuntimeException("Failed to load web server config", ex);
		}
	}
	
}
