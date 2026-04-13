package com.resonance.server.data;

import com.google.gson.JsonObject;
import org.jetbrains.annotations.NotNull;

import java.sql.Timestamp;
import java.util.UUID;

/**
 * @author John 4/13/2026
 */
public record AudioFile(
		@NotNull String uuid,
		int uploaderId,
		@NotNull String fileName,
		@NotNull Timestamp uploadDate) {

	public AudioFile(@NotNull String uuid, int uploaderId, @NotNull String fileName, @NotNull Timestamp uploadDate) {
		this.uuid = uuid;
		this.uploaderId = uploaderId;
		this.fileName = fileName;
		this.uploadDate = uploadDate;
	}

	public static AudioFile create(int uploaderId, String fileName) {
		return new AudioFile(
				UUID.randomUUID().toString(),
				uploaderId,
				fileName,
				new Timestamp(System.currentTimeMillis())
		);
	}

	public JsonObject toJson() {
		final JsonObject obj = new JsonObject();
		obj.addProperty("uuid", this.uuid);
		obj.addProperty("uploaderId", this.uploaderId);
		obj.addProperty("fileName", this.fileName);
		obj.addProperty("uploadDate", this.uploadDate.toString());
		return obj;
	}
}
