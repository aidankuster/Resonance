package com.resonance.server.database;

import com.resonance.server.config.ConfigHolder;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;

import java.sql.Connection;
import java.sql.DriverManager;

import static org.jooq.impl.DSL.constraint;
import static org.jooq.impl.DSL.primaryKey;

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
				this.config.dialect.getName().toLowerCase(),
				this.config.host,
				this.config.port,
				this.config.database
		);
		
		try {
			this.connection = DriverManager.getConnection(url, this.config.username, this.config.password);
		} catch (Exception e) {
			throw new RuntimeException("Failed to connect to database", e);
		}
		
		if(this.initializeDefaultTables()) {
			System.out.println("Created initial database");
		}
		
	}
	
	@Override
	public void close() throws Exception {
		this.connection.close();
	}
	
	private boolean initializeDefaultTables() {
		final DSLContext dsl = DSL.using(this.connection, this.config.dialect);
		
		//accounts table, this will hold the main data of the account
		final int userAccountTable = dsl.createTableIfNotExists("user_account")
				.column("id", SQLDataType.INTEGER.identity(true))
				.column("username", SQLDataType.VARCHAR(32))
				.column("email_address", SQLDataType.VARCHAR(255))
				.column("password", SQLDataType.VARCHAR(255))
				.column("enabled", SQLDataType.BOOLEAN.defaultValue(true))
				.column("admin", SQLDataType.BOOLEAN.defaultValue(false))
				.primaryKey("id")
				.execute();
		
		//account info table, this will hold extra data of the account
		final int userAccountInfoTable = dsl.createTableIfNotExists("user_account_info")
				.column("id", SQLDataType.INTEGER.identity(true))
				.column("first_name", SQLDataType.VARCHAR(64))
				.column("middle_name", SQLDataType.VARCHAR(64))
				.column("last_name", SQLDataType.VARCHAR(64))
				.column("bio", SQLDataType.VARCHAR(255))
				.constraints(
						primaryKey("id"),
						constraint("fk_account_id")
								.foreignKey("id")
								.references("user_account", "id"))
				.execute();
		
		//tags table, this will store the set of possible account tags
		final int tagsTable = dsl.createTableIfNotExists("tags")
				.column("id", SQLDataType.INTEGER.identity(true))
				.column("name", SQLDataType.VARCHAR(64))
				.primaryKey("id")
				.execute();
		
		//account tags table, this will store the tags associated with each account
		final int userAccountTagsTable = dsl.createTableIfNotExists("user_account_tags")
				.column("account_id", SQLDataType.INTEGER.notNull())
				.column("tag_id", SQLDataType.INTEGER.notNull())
				.constraints(
						constraint("fk_account_tags_account_id")
								.foreignKey("account_id")
								.references("user_account", "id"),
						constraint("fk_account_tags_tag_id")
								.foreignKey("tag_id")
								.references("tags", "id"))
				.execute();
		
		final int genresTable = dsl.createTableIfNotExists("genres")
				.column("id", SQLDataType.INTEGER.identity(true))
				.column("name", SQLDataType.VARCHAR(128))
				.primaryKey("id")
				.execute();
		
		final int instrumentsTable = dsl.createTableIfNotExists("instruments")
				.column("id", SQLDataType.INTEGER.identity(true))
				.column("name", SQLDataType.VARCHAR(128))
				.primaryKey("id")
				.execute();
		
		return userAccountTable
				+ userAccountInfoTable
				+ tagsTable
				+ userAccountTagsTable
				+ genresTable
				+ instrumentsTable > 0;
	}
}
