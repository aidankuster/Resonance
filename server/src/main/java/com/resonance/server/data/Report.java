package com.resonance.server.data;

import com.google.gson.JsonObject;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.jooq.EnumType;

import java.sql.Timestamp;

/**
 * @author John 4/6/2026
 */
public record Report(int id, int reporterId, int reportedId, String reason, ReportStatus status, Timestamp timestamp) {
	
	public JsonObject toJson() {
		final JsonObject obj = new JsonObject();
		obj.addProperty("id", this.id);
		obj.addProperty("reporterId", this.reporterId);
		obj.addProperty("reportedId", this.reportedId);
		obj.addProperty("reason", this.reason);
		obj.addProperty("status", this.status.getLiteral());
		obj.addProperty("timestamp", this.timestamp.toString());
		return obj;
	}
	
	public enum ReportStatus implements EnumType {
			PENDING,
			RESOLVED,
			DISMISSED;
		
		@NotNull
		@Override
		public String getLiteral() {
			return this.name();
		}
		
		@Nullable
		@Override
		public String getName() {
			return "report_status";
		}
	}
	
}
