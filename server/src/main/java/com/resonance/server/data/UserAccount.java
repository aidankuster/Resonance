package com.resonance.server.data;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.resonance.server.utils.JwtUtils;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.tags.Genre;
import com.resonance.server.data.tags.Instrument;
import com.resonance.server.data.tags.Tag;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.jooq.EnumType;

import java.util.Arrays;
import java.util.HashSet;

/**
 * @author John 2/4/2026
 */
public record UserAccount(
		int id,
		@NotNull String emailAddress,
		@NotNull String hashedPassword,
		boolean enabled,
		boolean admin,
		@NotNull UserInfo info,
		@NotNull Tag[] tags) {

	public Mutable mutable() {
		return new Mutable(this);
	}

	public JsonObject toJson(boolean sensitiveInfo) {
		final JsonObject obj = new JsonObject();
		obj.addProperty("id", this.id);
		obj.addProperty("emailAddress", this.emailAddress);

		if (sensitiveInfo) {
			obj.addProperty("password", this.hashedPassword);
		}

		obj.addProperty("enabled", this.enabled);
		obj.addProperty("admin", this.admin);

		obj.add("info", this.info.toJson());

		// tags
		final JsonArray instrumentsArray = new JsonArray();
		final JsonArray genresArray = new JsonArray();

		for (Tag tag : this.tags()) {
			if (tag instanceof Instrument) {
				instrumentsArray.add(tag.getName());
			} else if (tag instanceof Genre) {
				genresArray.add(tag.getName());
			}
		}
		obj.add("instruments", instrumentsArray);
		obj.add("genres", genresArray);

		return obj;
	}

	/**
	 * Create a JWT token for this user
	 */
	public String createJWT() {
		return JwtUtils.generateToken(this.id, this.emailAddress);
	}

	public static class Mutable {

		private final int id;
		private String emailAddress;
		private String hashedPassword;
		private boolean enabled;
		private boolean admin;
		private final UserInfo.Mutable info;
		private final HashSet<Tag> tags = new HashSet<>();

		Mutable(UserAccount user) {
			this.id = user.id();
			this.emailAddress = user.emailAddress();
			this.hashedPassword = user.hashedPassword();
			this.enabled = user.enabled();
			this.admin = user.admin();

			this.info = user.info().mutable();

			this.tags.addAll(Arrays.asList(user.tags()));
		}

		public UserAccount build() {
			return new UserAccount(
					this.id,
					this.emailAddress,
					this.hashedPassword,
					this.enabled,
					this.admin,
					this.info.build(),
					this.tags.toArray(new Tag[0]));
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

		public UserInfo.Mutable getInfo() {
			return this.info;
		}

		public HashSet<Tag> getTags() {
			return this.tags;
		}
	}

	public record UserInfo(String displayName, String bio, String availability, ExperienceLevel experienceLevel) {

		public Mutable mutable() {
			return new Mutable(this);
		}

		public JsonObject toJson() {
			return ConfigHolder.GSON.toJsonTree(this, UserInfo.class).getAsJsonObject();
		}

		public enum ExperienceLevel implements EnumType {
			BEGINNER,
			INTERMEDIATE,
			ADVANCED,
			PROFESSIONAL;

			@NotNull
			@Override
			public String getLiteral() {
				return this.name();
			}

			@Nullable
			@Override
			public String getName() {
				return "experience_level";
			}
		}

		public static class Mutable {

			private String displayName;
			private String bio;
			private String availability;
			private ExperienceLevel experienceLevel;

			public Mutable(UserInfo accountInfo) {
				this.displayName = accountInfo.displayName();
				this.bio = accountInfo.bio();
				this.availability = accountInfo.availability();
				this.experienceLevel = accountInfo.experienceLevel();
			}

			public UserInfo build() {
				return new UserInfo(
						this.displayName,
						this.bio,
						this.availability,
						this.experienceLevel);
			}

			public String getDisplayName() {
				return this.displayName;
			}

			public void setDisplayName(String displayName) {
				this.displayName = displayName;
			}

			public String getBio() {
				return this.bio;
			}

			public void setBio(String bio) {
				this.bio = bio;
			}

			public String getAvailability() {
				return this.availability;
			}

			public void setAvailability(String availability) {
				this.availability = availability;
			}

			public ExperienceLevel getExperienceLevel() {
				return this.experienceLevel;
			}

			public void setExperienceLevel(ExperienceLevel level) {
				this.experienceLevel = level;
			}
		}

	}
}