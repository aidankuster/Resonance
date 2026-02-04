package com.resonance.server.user;

/**
 * @author John 2/4/2026
 */
public record User(int id, String username, String emailAddress, String hashedPassword, boolean enabled, boolean admin) {
	
	public static class Mutable {
		
		private final int id;
		private String username;
		private String emailAddress;
		private String hashedPassword;
		private boolean enabled;
		
		public Mutable(User user) {
			this.id = user.id();
			this.username = user.username();
		}
		
	}
	
}
