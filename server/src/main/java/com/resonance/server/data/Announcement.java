package com.resonance.server.data;

import com.google.gson.JsonObject;

import java.sql.Date;
import java.sql.Timestamp;

/**
 * @author John 4/23/2026
 */
public record Announcement(
		int id,
		int posterId,
		String subject,
		String content,
		String link,
		Date eventDate,
		Timestamp date) {

	public JsonObject toJson() {
		final JsonObject obj = new JsonObject();
		obj.addProperty("id", this.id);
		obj.addProperty("posterId", this.posterId);
		obj.addProperty("subject", this.subject);
		obj.addProperty("content", this.content);
		obj.addProperty("link", this.link);
		obj.addProperty("eventDate", this.eventDate != null ? this.eventDate.toString() : null);
		obj.addProperty("date", this.date.toString());
		return obj;
	}

}
