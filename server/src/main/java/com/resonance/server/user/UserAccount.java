package com.resonance.server.user;

/**
 * @author John 2/4/2026
 */
public record UserAccount(int id, String username, String emailAddress, String hashedPassword, boolean enabled, boolean admin, UserAccountInfo info) {
	
	public Mutable mutable() {
		return new Mutable(this);
	}
	
	public static class Mutable {
		
		private final int id;
		private String username;
		private String emailAddress;
		private String hashedPassword;
		private boolean enabled;
		private boolean admin;
		private final UserAccountInfo.Mutable info;
		
		public Mutable(UserAccount user) {
			this.id = user.id();
			this.username = user.username();
			this.emailAddress = user.emailAddress();
			this.hashedPassword = user.hashedPassword();
			this.enabled = user.enabled();
			this.admin = user.admin();
			
			this.info = user.info().mutable();
		}
		
		public int getID() {
			return this.id;
		}
		
		public String getUsername() {
			return this.username;
		}
		
		public void setUsername(String username) {
			this.username = username;
		}
		
		public String getEmailAddress() {
			return this.emailAddress;
		}
		
		public void setEmailAddress(String emailAddress) {
			this.emailAddress = emailAddress;
		}
		
		public String getHashedPassword() {
			return this.hashedPassword;
		}
		
		public void setHashedPassword(String hashedPassword) {
			this.hashedPassword = hashedPassword;
		}
		
		public boolean isEnabled() {
			return this.enabled;
		}
		
		public void setEnabled(boolean enabled) {
			this.enabled = enabled;
		}
		
		public boolean isAdmin() {
			return this.admin;
		}
		
		public void setAdmin(boolean admin) {
			this.admin = admin;
		}
		
		public UserAccountInfo.Mutable getInfo() {
			return this.info;
		}
	}
	
}
