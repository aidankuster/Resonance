package config;

import com.resonance.server.database.DatabaseConfig;
import org.jooq.SQLDialect;

/**
 * @author John 4/12/2026
 */
public class TestDatabaseConfig extends DatabaseConfig {
	
	public TestDatabaseConfig() {
		//use sqlite so that no connection is required
		this.dialect = SQLDialect.SQLITE;
		this.database = "resonance_test";
	}
	
}
