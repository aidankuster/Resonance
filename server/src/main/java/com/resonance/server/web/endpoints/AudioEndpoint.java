package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.resonance.server.Server;
import com.resonance.server.config.JsonConfigHolder;
import com.resonance.server.data.AudioFile;
import com.resonance.server.data.UserAccount;
import com.resonance.server.web.resource.FileResourceCollection;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;

import java.io.File;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * @author John 4/13/2026
 */
public class AudioEndpoint implements EndpointGroup {

	private static final int MAX_AUDIO_FILE_SIZE = 1024 * 1024 * 50; // 50MB

	private final FileResourceCollection audioFiles = new FileResourceCollection(
			"audio_files",
			uploadedFile -> {
				if (uploadedFile.size() > MAX_AUDIO_FILE_SIZE) {
					throw new BadRequestResponse("Audio file size is too large (max 50MB)");
				}

				// Validate content type
				String contentType = uploadedFile.contentType();
				if (contentType == null || !contentType.startsWith("audio/")) {
					throw new BadRequestResponse("File must be an audio file");
				}

				// Return as-is (no conversion needed)
				return uploadedFile.content();
			}
	);

	@Override
	public void addEndpoints() {
		// Upload audio file
		post("/api/audio", this::handleAudioUpload);

		// Download/listen to audio file
		path("/api/audio/{uuid}", () -> {
			get(this::handleAudioDownload);
			delete(this::handleAudioDelete);
		});

		// Get all audio files for current user
		get("/api/audio", this::handleGetUserAudioFiles);
	}

	private void handleAudioUpload(@NotNull Context ctx) {
		final UserAccount sessionAccount = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
		final int uploaderId = sessionAccount.id();

		final UploadedFile uploadedFile = ctx.uploadedFile("audio_file");

		if (uploadedFile == null) {
			throw new BadRequestResponse("No file uploaded");
		}

		// Get original filename
		String originalFilename = uploadedFile.filename();
		if (originalFilename == null || originalFilename.isEmpty()) {
			originalFilename = "audio_file";
		}

		// Create database record and get UUID
		final AudioFile audioFile = Server.INSTANCE.getDatabaseManager()
				.createAudioFile(uploaderId, originalFilename)
				.block();

		if (audioFile == null) {
			throw new InternalServerErrorResponse("Failed to create audio file record");
		}

		// Save the file with UUID as filename
		this.audioFiles.putResource(audioFile.uuid(), uploadedFile);

		// Return the audio file info
		ctx.status(200);
		ctx.contentType(ContentType.APPLICATION_JSON);
		ctx.result(JsonConfigHolder.GSON.toJson(audioFile.toJson()));
	}

	private void handleAudioDownload(@NotNull Context ctx) {
		final String uuid = ctx.pathParam("uuid");

		// Verify the audio file exists in database
		final AudioFile audioFile = Server.INSTANCE.getDatabaseManager()
				.getAudioFile(uuid)
				.block();

		if (audioFile == null) {
			throw new NotFoundResponse("Audio file not found");
		}

		try {
			// Check if file exists on disk
			ctx.result(this.audioFiles.getResource(uuid));
			ctx.contentType(ContentType.AUDIO_MPEG); // Default to mpeg, could be made dynamic based on file extension
		} catch (HttpResponseException e) {
			throw e;
		}
	}

	private void handleAudioDelete(@NotNull Context ctx) {
		final UserAccount sessionAccount = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
		final String uuid = ctx.pathParam("uuid");

		// Get audio file from database
		final AudioFile audioFile = Server.INSTANCE.getDatabaseManager()
				.getAudioFile(uuid)
				.block();

		if (audioFile == null) {
			throw new NotFoundResponse("Audio file not found");
		}

		// Verify user owns this file
		if (audioFile.uploaderId() != sessionAccount.id()) {
			throw new UnauthorizedResponse("You can only delete your own audio files");
		}

		// Delete from database
		Server.INSTANCE.getDatabaseManager()
				.deleteAudioFile(uuid)
				.block();

		// Delete file from disk
		try {
			File file = new File("resources/audio_files", uuid);
			if (file.exists()) {
				file.delete();
			}
		} catch (Exception e) {
			// Log but don't fail - database record is already deleted
			Server.LOGGER.error("Failed to delete audio file from disk", e);
		}

		ctx.status(200);
		ctx.result("Audio file deleted successfully");
	}

	private void handleGetUserAudioFiles(@NotNull Context ctx) {
		final UserAccount sessionAccount = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);

		// Get all audio files for this user
		final var audioFiles = Server.INSTANCE.getDatabaseManager()
				.getAudioFilesByUploader(sessionAccount.id())
				.collectList()
				.block();

		if (audioFiles == null) {
			throw new InternalServerErrorResponse("Failed to retrieve audio files");
		}
		
		final JsonArray array = new JsonArray();
		for(AudioFile audioFile : audioFiles) {
			array.add(audioFile.toJson());
		}
		
		ctx.result(JsonConfigHolder.GSON.toJson(array));
	}
}
