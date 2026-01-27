package com.resonance.server;

import com.resonance.server.database.DatabaseManager;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

/**
 * TODO: logging
 *
 * @author John 1/14/2026
 */
public class Server {
	
	/**
	 * Singleton instance
	 */
	public static Server INSTANCE;
	
	public static void main(String[] args) {
		INSTANCE = new Server();
	}
	
	/**
	 * Database manager
	 */
	private final DatabaseManager databaseManager;
	
	public Server() {
		this.databaseManager = new DatabaseManager();
	}
	

}