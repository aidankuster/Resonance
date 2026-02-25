package com.resonance.server.data;

import com.google.gson.JsonObject;
import com.resonance.server.config.ConfigHolder;

/**
 * @author John 2/4/2026
 */
public record UserAccountInfo(String displayName, String bio) {
	
	public Mutable mutable() {
		return new Mutable(this);
	}
	
	public JsonObject toJson() {
		return ConfigHolder.GSON.toJsonTree(this, UserAccountInfo.class).getAsJsonObject();
	}
	
	public static class Mutable {
		
		private String displayName;
		private String bio;
		
		public Mutable(UserAccountInfo accountInfo) {
			this.displayName = accountInfo.displayName;
			this.bio = accountInfo.bio();
		}
		
		public String getDisplayName() {
			return this.displayName;
		}
		
		public void setDisplayName(String lastName) {
			this.displayName = lastName;
		}
		
		public String getBio() {
			return this.bio;
		}
		
		public void setBio(String bio) {
			this.bio = bio;
		}
	}
	
}
