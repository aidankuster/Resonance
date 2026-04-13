import com.resonance.server.Server;
import com.resonance.server.config.ConfigProvider;
import com.resonance.server.database.DatabaseConfig;
import com.resonance.server.database.DatabaseManager;
import com.resonance.server.web.WebServer;
import com.resonance.server.web.WebServerConfig;
import config.TestDatabaseConfig;
import org.junit.jupiter.api.*;

import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * @author John 4/12/2026
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class WebServerTests {
	
	private Server server = null;
	
	@Test
	@BeforeAll
	@DisplayName("Set up server")
	void setupServer() throws Exception {
		Server.LOGGER.info("Starting test server");
		
		//find an available port
		final int port;
		try (ServerSocket socket = new ServerSocket(0)) {
			port = socket.getLocalPort();
		} catch (Exception e) {
			throw new RuntimeException("Failed to find an available port", e);
		}
		
		this.server = new Server(new ConfigProvider() {
			@Override
			public DatabaseConfig getDatabaseConfig() {
				return new TestDatabaseConfig();
			}
			
			@Override
			public WebServerConfig getWebServerConfig() {
				final WebServerConfig config = new WebServerConfig();
				config.port = port;
				return config;
			}
		});
		
		Server.LOGGER.info("Test server started");
	}
	
	@AfterAll
	void shutdownServer() throws Exception {
		if(this.server != null) {
			this.server.close();
		}
	}
	
	@Test
	@DisplayName("Verify web server is running")
	void verifyServerRunning() {
		Assertions.assertNotNull(this.server, "Server should not be null after setup");
		Assertions.assertTrue(this.server.getWebServer().getJavalin().jettyServer().started(), "Server should be running after setup");
	}
	
	@Test
	@DisplayName("Verify web server port")
	void verifyServerPort() {
		Assertions.assertNotNull(this.server, "Server should not be null after setup");
		final WebServer webServer = this.server.getWebServer();
		Assertions.assertEquals(webServer.getJavalin().jettyServer().port(), webServer.getConfig().port, "Server running on incorrect port");
	}
	
}
