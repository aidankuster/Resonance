package com.resonance.server.user;

/**
 * @author John 2/4/2026
 */
public record User(int id, String username, String emailAddress, String password, boolean enabled) {
	
	public static class Mutable {
	
	}
	
}
