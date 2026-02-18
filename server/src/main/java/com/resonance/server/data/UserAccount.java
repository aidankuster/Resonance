package com.resonance.server.data;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.tags.Tag;

import java.util.Arrays;
import java.util.HashSet;

/**
 * @author John 2/4/2026
 */
public record UserAccount(int id, String emailAddress, String hashedPassword, boolean enabled, boolean admin, UserAccountInfo info, Tag[] tags) {
	
	public Mutable mutable() {
		return new Mutable(this);
	}
	
	public JsonObject toJson(boolean sensitiveInfo) {
		final JsonObject obj = new JsonObject();
		obj.addProperty("id", this.id);
		
		if(sensitiveInfo) {
			obj.addProperty("email_address", this.emailAddress);
		}
		
		obj.add("info", this.info.toJson());
		
		final JsonArray tagsArray = new JsonArray();
		for(Tag tag : this.tags) {
			tagsArray.add(tag.getName());
		}
		obj.add("tags", tagsArray);
		
		return obj;
	}
	
	public static class Mutable {
		
		private final int id;
		private String emailAddress;
		private String hashedPassword;
		private boolean enabled;
		private boolean admin;
		private final UserAccountInfo.Mutable info;
		private final HashSet<Tag> tags = new HashSet<>();
		
		public Mutable(UserAccount user) {
			this.id = user.id();
			this.emailAddress = user.emailAddress();
			this.hashedPassword = user.hashedPassword();
			this.enabled = user.enabled();
			this.admin = user.admin();
			
			this.info = user.info().mutable();
			
			this.tags.addAll(Arrays.asList(user.tags()));
		}
		
		public int getID() {
			return this.id;
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
		
		public HashSet<Tag> getTags() {
			return this.tags;
		}
	}
	
}
