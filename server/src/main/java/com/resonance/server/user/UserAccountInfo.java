package com.resonance.server.user;

/**
 * @author John 2/4/2026
 */
public record UserAccountInfo(String firstName, String middleName, String lastName, String bio) {
	
	public Mutable mutable() {
		return new Mutable(this);
	}
	
	public static class Mutable {
		
		private String firstName;
		private String middleName;
		private String lastName;
		private String bio;
		
		public Mutable(UserAccountInfo accountInfo) {
			this.firstName = accountInfo.firstName();
			this.middleName = accountInfo.middleName();
			this.lastName = accountInfo.lastName();
			this.bio = accountInfo.bio();
		}
		
		public String getFirstName() {
			return this.firstName;
		}
		
		public void setFirstName(String firstName) {
			this.firstName = firstName;
		}
		
		public String getMiddleName() {
			return this.middleName;
		}
		
		public void setMiddleName(String middleName) {
			this.middleName = middleName;
		}
		
		public String getLastName() {
			return this.lastName;
		}
		
		public void setLastName(String lastName) {
			this.lastName = lastName;
		}
		
		public String getBio() {
			return this.bio;
		}
		
		public void setBio(String bio) {
			this.bio = bio;
		}
	}
	
}
