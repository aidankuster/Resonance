package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.tags.Tag;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;
import reactor.core.Exceptions;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.*;
import java.util.stream.Collectors;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * Profile management endpoints
 * 
 * @author John 3/20/2026
 */
public class ProfileEndpoint implements EndpointGroup {

	@Override
	public void addEndpoints() {
		path("/api/profile", () -> {
			get("/me", this::getCurrentUserProfile);
		});

		path("/api/profile/{userId}", () -> {
			get(this::getUserProfile);
			post(this::updateProfile);
		});
	}

	private void getCurrentUserProfile(@NotNull Context ctx) {
		final UserAccount currentUser = Server.INSTANCE.getWebServer()
				.getSessionHandler().validateSession(ctx);

		if (currentUser == null) {
			throw new UnauthorizedResponse("Not authenticated");
		}

		// Get full profile with audio samples data
		JsonObject profileJson = currentUser.toJson(false);

		// Add audio samples data if it exists
		String audioData = getAudioSamplesData(currentUser.id());
		if (audioData != null && !audioData.isEmpty()) {
			profileJson.addProperty("audioSamplesData", audioData);
		}

		ctx.result(ConfigHolder.GSON.toJson(profileJson));
		ctx.contentType(ContentType.APPLICATION_JSON);
	}

	private void getUserProfile(@NotNull Context ctx) {
		final int userId = ctx.pathParamAsClass("userId", int.class).get();

		try {
			final UserAccount user = Server.INSTANCE.getDatabaseManager()
					.findAccount(userId)
					.block();

			if (user == null) {
				throw new NotFoundResponse("User not found");
			}

			// Don't include sensitive info for public profiles
			JsonObject profileJson = user.toJson(false);

			// Add audio samples data if it exists
			String audioData = getAudioSamplesData(userId);
			if (audioData != null && !audioData.isEmpty()) {
				profileJson.addProperty("audioSamplesData", audioData);
			}

			ctx.result(ConfigHolder.GSON.toJson(profileJson));
			ctx.contentType(ContentType.APPLICATION_JSON);

		} catch (HttpResponseException e) {
			throw e;
		} catch (Throwable t) {
			final Throwable error = Exceptions.unwrap(t);
			Server.LOGGER.error("Failed to fetch user profile for {}", userId, error);
			throw new InternalServerErrorResponse("Failed to fetch user profile: " + error.getMessage());
		}
	}

	private void updateProfile(@NotNull Context ctx) {
		final int userId = ctx.pathParamAsClass("userId", int.class).get();

		// Validate session
		final UserAccount currentUser = Server.INSTANCE.getWebServer()
				.getSessionHandler().validateSession(ctx);

		if (currentUser == null) {
			throw new UnauthorizedResponse("Not authenticated");
		}

		// Users can only update their own profile (unless admin)
		if (currentUser.id() != userId && !currentUser.admin()) {
			throw new ForbiddenResponse("Cannot update another user's profile");
		}

		try {
			// Fetch existing user
			final UserAccount existingUser = Server.INSTANCE.getDatabaseManager()
					.findAccount(userId)
					.block();

			if (existingUser == null) {
				throw new NotFoundResponse("User not found");
			}

			// Get form parameters
			final String displayName = ctx.formParam("display_name");
			final String bio = ctx.formParam("bio");
			final String availability = ctx.formParam("availability");
			final String experienceLevelStr = ctx.formParam("experience_level");
			final List<String> tags = ctx.formParams("tag");

			// Create mutable copy
			final UserAccount.Mutable mutableUser = existingUser.mutable();

			// Update info
			if (displayName != null && !displayName.isBlank()) {
				mutableUser.getInfo().setDisplayName(displayName);
			}

			if (bio != null) {
				mutableUser.getInfo().setBio(bio);
			}

			if (availability != null) {
				mutableUser.getInfo().setAvailability(availability);
			}

			if (experienceLevelStr != null && !experienceLevelStr.isBlank()) {
				try {
					UserAccount.UserInfo.ExperienceLevel level = UserAccount.UserInfo.ExperienceLevel
							.valueOf(experienceLevelStr.toUpperCase());
					mutableUser.getInfo().setExperienceLevel(level);
				} catch (IllegalArgumentException e) {
					Server.LOGGER.warn("Invalid experience level: {}", experienceLevelStr);
				}
			}

			// Update tags if provided
			if (tags != null && !tags.isEmpty()) {
				// Fetch all available tags to match by name
				final List<Tag> allTags = Server.INSTANCE.getDatabaseManager()
						.getTags()
						.collectList()
						.block();

				final Set<Tag> selectedTags = new HashSet<>();
				for (String tagName : tags) {
					allTags.stream()
							.filter(t -> t.getName().equalsIgnoreCase(tagName))
							.findFirst()
							.ifPresent(selectedTags::add);
				}

				mutableUser.getTags().clear();
				mutableUser.getTags().addAll(selectedTags);
			}

			// Save updated user account info first
			Server.INSTANCE.getDatabaseManager()
					.updateAccount(mutableUser.build())
					.block();

			// Handle profile picture upload (optional, won't fail the request if it fails)
			final var uploadedFile = ctx.uploadedFile("profilePicture");
			if (uploadedFile != null) {
				try {
					String profilePicPath = saveProfilePicture(userId, uploadedFile);
					Server.LOGGER.info("Saved profile picture for user {}: {}", userId, profilePicPath);
				} catch (Exception e) {
					Server.LOGGER.warn("Failed to save profile picture for user {}: {}", userId, e.getMessage());
				}
			}

			// Handle audio samples data (Base64 JSON)
			final String audioSamplesData = ctx.formParam("audioSamplesData");
			if (audioSamplesData != null && !audioSamplesData.isBlank()) {
				try {
					storeAudioSamplesData(userId, audioSamplesData);
					Server.LOGGER.info("Stored audio samples data for user {}", userId);
				} catch (Exception e) {
					Server.LOGGER.warn("Failed to store audio samples data for user {}: {}", userId, e.getMessage());
				}
			}

			// Fetch updated user to return
			final UserAccount updatedUser = Server.INSTANCE.getDatabaseManager()
					.findAccount(userId)
					.block();

			if (updatedUser == null) {
				throw new InternalServerErrorResponse("Failed to retrieve updated profile");
			}

			JsonObject responseJson = updatedUser.toJson(false);

			// Include audio samples data in response if it was provided
			if (audioSamplesData != null && !audioSamplesData.isBlank()) {
				responseJson.addProperty("audioSamplesData", audioSamplesData);
			} else {
				// Otherwise fetch existing data
				String existingAudioData = getAudioSamplesData(userId);
				if (existingAudioData != null && !existingAudioData.isEmpty()) {
					responseJson.addProperty("audioSamplesData", existingAudioData);
				}
			}

			ctx.result(ConfigHolder.GSON.toJson(responseJson));
			ctx.contentType(ContentType.APPLICATION_JSON);

			Server.LOGGER.info("Profile updated for user {}", userId);

		} catch (HttpResponseException e) {
			throw e;
		} catch (Throwable t) {
			final Throwable error = Exceptions.unwrap(t);
			Server.LOGGER.error("Failed to update profile for {}", userId, error);
			throw new InternalServerErrorResponse("Failed to update profile: " + error.getMessage());
		}
	}

	/**
	 * Save profile picture to filesystem using UploadedFile
	 */
	private String saveProfilePicture(int userId, UploadedFile uploadedFile) throws IOException {
		Path userDir = Paths.get("uploads", "profiles", String.valueOf(userId));
		Files.createDirectories(userDir);

		// Determine file extension
		String originalName = uploadedFile.filename();
		String extension = ".jpg";
		if (originalName != null && originalName.contains(".")) {
			extension = originalName.substring(originalName.lastIndexOf("."));
		}

		// Validate file type
		String contentType = uploadedFile.contentType();
		if (contentType == null || !contentType.startsWith("image/")) {
			throw new IOException("Invalid file type: " + contentType);
		}

		String fileName = "profile" + extension;
		Path targetPath = userDir.resolve(fileName);

		// Copy using InputStream from UploadedFile
		try (InputStream inputStream = uploadedFile.content()) {
			Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
		}

		return targetPath.toString();
	}

	/**
	 * Store audio samples data (Base64 JSON) in database using raw SQL
	 */
	private void storeAudioSamplesData(int userId, String audioData) {
		var connection = Server.INSTANCE.getDatabaseManager().getConnection();

		try {
			// Try to add the column if it doesn't exist
			try (Statement stmt = connection.createStatement()) {
				stmt.execute("ALTER TABLE user_account_info ADD COLUMN audio_samples_data LONGTEXT");
				Server.LOGGER.info("Added audio_samples_data column to user_account_info table");
			} catch (Exception e) {
				// Column likely already exists, which is fine
				Server.LOGGER.debug("audio_samples_data column already exists: {}", e.getMessage());
			}

			// Update the audio samples data
			String sql = "UPDATE user_account_info SET audio_samples_data = ? WHERE account_id = ?";
			try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
				pstmt.setString(1, audioData);
				pstmt.setInt(2, userId);
				int rowsUpdated = pstmt.executeUpdate();

				// If no rows updated, the user_info record might not exist yet
				if (rowsUpdated == 0) {
					// Insert a new record with just the audio data
					String insertSql = "INSERT INTO user_account_info (account_id, audio_samples_data, display_name, bio, availability, experience_level) "
							+
							"VALUES (?, ?, '', '', '', 'BEGINNER') " +
							"ON DUPLICATE KEY UPDATE audio_samples_data = ?";
					try (PreparedStatement insertStmt = connection.prepareStatement(insertSql)) {
						insertStmt.setInt(1, userId);
						insertStmt.setString(2, audioData);
						insertStmt.setString(3, audioData);
						insertStmt.executeUpdate();
					}
				}
			}

			Server.LOGGER.info("Stored audio samples data for user {}", userId);
		} catch (Exception e) {
			Server.LOGGER.error("Failed to store audio samples data for user {}", userId, e);
			throw new RuntimeException("Failed to store audio samples data", e);
		}
	}

	/**
	 * Get audio samples data for a user using raw SQL
	 */
	private String getAudioSamplesData(int userId) {
		var connection = Server.INSTANCE.getDatabaseManager().getConnection();

		try {
			String sql = "SELECT audio_samples_data FROM user_account_info WHERE account_id = ?";
			try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
				pstmt.setInt(1, userId);
				try (ResultSet rs = pstmt.executeQuery()) {
					if (rs.next()) {
						return rs.getString("audio_samples_data");
					}
				}
			}
		} catch (Exception e) {
			// Column might not exist yet
			Server.LOGGER.debug("Failed to get audio samples data for user {}: {}", userId, e.getMessage());
		}

		return null;
	}

	/**
	 * Get audio samples for a user (public static method for other endpoints)
	 */
	public static JsonArray getUserAudioSamples(int userId) {
		JsonArray samples = new JsonArray();
		var connection = Server.INSTANCE.getDatabaseManager().getConnection();

		try {
			String sql = "SELECT audio_samples_data FROM user_account_info WHERE account_id = ?";
			try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
				pstmt.setInt(1, userId);
				try (ResultSet rs = pstmt.executeQuery()) {
					if (rs.next()) {
						String audioData = rs.getString("audio_samples_data");
						if (audioData != null && !audioData.isEmpty()) {
							// Parse the JSON array
							var parsed = ConfigHolder.GSON.fromJson(audioData, JsonArray.class);
							if (parsed != null) {
								return parsed;
							}
						}
					}
				}
			}
		} catch (Exception e) {
			Server.LOGGER.error("Failed to get audio samples for user {}", userId, e);
		}

		return samples;
	}
}