package com.resonance.server.web;

import java.util.concurrent.TimeUnit;

/**
 * @author John 2/3/2026
 */
public class WebServerConfig {
	
	public int port = 80;
	public boolean secureCookies = false;
	
	public JwtConfig jwt = new JwtConfig();
	
	public static class JwtConfig {
		public String hashSecret = "replace-me";
		public long expirationDuration = TimeUnit.DAYS.toMillis(1); //tokens expire after 1 day by default
	}
	
}
