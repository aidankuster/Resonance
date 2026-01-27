package com.resonance.server.database;

import com.resonance.server.config.ConfigHolder;

import java.sql.Connection;
import java.sql.DriverManager;

/**
 * @author John 1/21/2026
 */
public class DatabaseManager implements AutoCloseable {
	
	/**
	 * Config
	 */
	private final DatabaseConfig config;
	
	/**
	 * Database connection
	 */
	private final Connection connection;
	
	public DatabaseManager() {
		
		final ConfigHolder<DatabaseConfig> configHolder = new ConfigHolder<>("database", DatabaseConfig.class);
		
		try {
			this.config = configHolder.loadConfig();
		} catch(Exception ex) {
			throw new RuntimeException("Failed to load database config", ex);
		}
		
		final String url = String.format(
				"jdbc:%s://%s:%s/%s",
				this.config.driver,
				this.config.host,
				this.config.port,
				this.config.database
		);
		
		try {
			this.connection = DriverManager.getConnection(url, this.config.username, this.config.password);
		} catch (Exception e) {
			throw new RuntimeException("Failed to connect to database", e);
		}
		
	}
	
	@Override
	public void close() throws Exception {
		this.connection.close();
	}
}
