package com.resonance.server.data;

import com.google.gson.JsonObject;
import java.sql.Timestamp;

public record Application(
        int id,
        int projectId,
        String roleName,
        int applicantId,
        ApplicationStatus status,
        String message,
        Timestamp applicationDate,
        Timestamp responseDate) {
    public enum ApplicationStatus {
        PENDING, ACCEPTED, REJECTED, WITHDRAWN
    }

    public JsonObject toJson() {
        JsonObject obj = new JsonObject();
        obj.addProperty("id", id);
        obj.addProperty("projectId", projectId);
        obj.addProperty("roleName", roleName);
        obj.addProperty("applicantId", applicantId);
        obj.addProperty("status", status.name());
        obj.addProperty("message", message);
        obj.addProperty("applicationDate", applicationDate.toString());
        if (responseDate != null) {
            obj.addProperty("responseDate", responseDate.toString());
        }
        return obj;
    }
}