package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.resonance.server.Server;
import com.resonance.server.config.JsonConfigHolder;
import com.resonance.server.data.Announcement;
import com.resonance.server.data.UserAccount;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;
import reactor.core.Exceptions;

import java.util.List;
import java.sql.Date;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * Endpoints for managing announcements
 *
 * @author John 4/24/2026
 */
public class AnnouncementEndpoint implements EndpointGroup {

    @Override
    public void addEndpoints() {
        path("/api/announcements", () -> {
            // Get all announcements (public endpoint)
            get(this::getAnnouncements);

            // Create announcement (admin only)
            post(this::createAnnouncement);

            // Delete announcement (admin only)
            delete("/{announcementId}", this::deleteAnnouncement);
        });
    }

    private void getAnnouncements(@NotNull Context ctx) {
        try {
            final List<Announcement> announcements = Server.INSTANCE.getDatabaseManager()
                    .getAnnouncements()
                    .collectList()
                    .block();

            final JsonArray array = new JsonArray();

            if (announcements != null) {
                for (Announcement announcement : announcements) {
                    array.add(announcement.toJson());
                }
            }

            ctx.result(JsonConfigHolder.GSON.toJson(array));
            ctx.contentType(ContentType.APPLICATION_JSON);

            Server.LOGGER.info("Fetched {} announcements", announcements != null ? announcements.size() : 0);

        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to fetch announcements", error);
            throw new InternalServerErrorResponse("Failed to fetch announcements: " + error.getMessage());
        }
    }

    /**
     * Create a new announcement (admin only)
     */
    private void createAnnouncement(@NotNull Context ctx) {
        final UserAccount account = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);

        if (!account.admin()) {
            throw new ForbiddenResponse("Admin access required");
        }

        try {
            final String subject = ctx.formParam("subject");
            final String content = ctx.formParam("content");
            final String link = ctx.formParam("link");
            final String eventDateStr = ctx.formParam("eventDate");

            if (subject == null || subject.trim().isEmpty()) {
                throw new BadRequestResponse("Subject cannot be empty");
            }

            if (content == null || content.trim().isEmpty()) {
                throw new BadRequestResponse("Content cannot be empty");
            }

            Date eventDate = null;
            if (eventDateStr != null && !eventDateStr.isBlank()) {
                eventDate = Date.valueOf(eventDateStr); // Expects "YYYY-MM-DD" format
            }

            // Create announcement
            final Announcement announcement = Server.INSTANCE.getDatabaseManager()
                    .createAnnouncement(account.id(), subject.trim(), content.trim(), link, eventDate)
                    .block();

            if (announcement == null) {
                throw new InternalServerErrorResponse("Failed to create announcement");
            }

            ctx.status(201);
            ctx.result(JsonConfigHolder.GSON.toJson(announcement.toJson()));
            ctx.contentType(ContentType.APPLICATION_JSON);

            Server.LOGGER.info("Admin {} created announcement: {}", account.id(), subject);

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to create announcement", error);
            throw new InternalServerErrorResponse("Failed to create announcement: " + error.getMessage());
        }
    }

    /**
     * Delete an announcement (admin only)
     */
    private void deleteAnnouncement(@NotNull Context ctx) {
        final UserAccount account = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);

        if (!account.admin()) {
            throw new ForbiddenResponse("Admin access required");
        }

        final int announcementId = ctx.pathParamAsClass("announcementId", int.class).get();

        try {
            // Verify announcement exists
            final Announcement announcement = Server.INSTANCE.getDatabaseManager()
                    .getAnnouncement(announcementId)
                    .block();

            if (announcement == null) {
                throw new NotFoundResponse("Announcement not found");
            }

            // Delete announcement
            Server.INSTANCE.getDatabaseManager()
                    .deleteAnnouncement(announcementId)
                    .block();

            ctx.status(204).result("Announcement deleted successfully");

            Server.LOGGER.info("Admin {} deleted announcement {}: {}",
                    account.id(), announcementId, announcement.subject());

        } catch (HttpResponseException e) {
            throw e;
        } catch (Throwable t) {
            final Throwable error = Exceptions.unwrap(t);
            Server.LOGGER.error("Failed to delete announcement {}", announcementId, error);
            throw new InternalServerErrorResponse("Failed to delete announcement: " + error.getMessage());
        }
    }
}
