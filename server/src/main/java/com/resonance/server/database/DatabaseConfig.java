package com.resonance.server.database;

import org.jooq.SQLDialect;

/**
 * Configuration for the SQL database
 *
 * @author John 1/21/2026
 */
public class DatabaseConfig {
	
	public SQLDialect dialect = SQLDialect.MYSQL;
	public String host = "localhost";
	public int port = 3306;
	public String username = "root";
	public String password = "";
	public String database = "resonance";
	
}
