package com.resonance.server.web.endpoints;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.resonance.server.Server;
import com.resonance.server.config.JsonConfigHolder;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.tags.Tag;
import com.resonance.server.web.resource.FileResourceCollection;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.*;
import org.jetbrains.annotations.NotNull;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.List;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * Profile management endpoints
 * 
 * @author John 3/20/2026
 */
public class ProfileEndpoint implements EndpointGroup {

	private static final int MAX_PROFILE_PICTURE_SIZE = 1024 * 1024 * 5;

	private final FileResourceCollection profilePictures=new FileResourceCollection("profile_pictures",uploadedFile->{if(uploadedFile.size()>MAX_PROFILE_PICTURE_SIZE){throw new BadRequestResponse("Profile picture size is too large");}

	// Validate content type
	String contentType=uploadedFile.contentType();if(contentType==null||!contentType.startsWith("image/")){throw new BadRequestResponse("File must be an image");}

	try(final InputStream content=uploadedFile.content()){BufferedImage image=ImageIO.read(content);

	if(image==null){throw new BadRequestResponse("Invalid image file");}

	// Create a new BufferedImage with RGB color model (JPEG doesn't support alpha
	// channel)
	BufferedImage rgbImage=new BufferedImage(image.getWidth(),image.getHeight(),BufferedImage.TYPE_INT_RGB);

	// Draw the original image onto the RGB image (removes alpha channel if present)
	rgbImage.createGraphics().drawImage(image,0,0,null);

	// Write the image to a byte array as JPEG
	ByteArrayOutputStream baos=new ByteArrayOutputStream();ImageIO.write(rgbImage,"jpg",baos);

	// Return the JPEG as an InputStream
	return new ByteArrayInputStream(baos.toByteArray());

	}catch(
	HttpResponseException e)
	{
		throw e;
	}catch(
	Exception e)
	{
					throw new BadRequestResponse("Invalid image file: " + e.getMessage());
				}
	});

	@Override
	public void addEndpoints() {
		post("/api/profile/picture", this::handleProfilePictureUpload);

		path("/api/profile/{id}/picture", () -> {
			get(this::handleProfilePictureDownload);
		});

		path("/api/profile/{id}", () -> {
			post(this::handle);
			get(this::handle);
		});
	}

	private void handle(@NotNull Context ctx) {
		
		final int id = ctx.pathParamAsClass("id", int.class).get();

		try {
			final UserAccount user = Server.INSTANCE.getDatabaseManager()
					.findAccount(userId)
					.block();

		if (account == null) {
			throw new NotFoundResponse("Profile not found");
		}

		if (!ctx.method().equals(HandlerType.POST)) {
			// GET request - return profile data
			ctx.result(JsonConfigHolder.GSON.toJson(account.toJson(false)));
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
		}

		// tags
		mutableAccount.getTags().clear();
		final List<Tag> availableTags = Server.INSTANCE.getDatabaseManager().getTags().collectList().block();
		if (availableTags != null) {
			for (Tag availableTag : availableTags) {
				if (tags.contains(availableTag.getName())) {
					mutableAccount.getTags().add(availableTag);
				}
			}
		}

		account = mutableAccount.build();
		Server.INSTANCE.getDatabaseManager().updateAccount(account).block();

		// After update, return the updated profile
		ctx.result(JsonConfigHolder.GSON.toJson(account.toJson(false)));
		ctx.contentType(ContentType.APPLICATION_JSON);
	}

	private void handleProfilePictureUpload(@NotNull Context ctx) {
		final UserAccount sessionAccount = Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx);
		final int id = sessionAccount.id();

		final UploadedFile uploadedFile = ctx.uploadedFile("profile_picture");

		if (uploadedFile == null) {
			throw new BadRequestResponse("No file uploaded");
		}

		// save the pfp (validator will convert to JPG)
		this.profilePictures.putResource(id + ".jpg", uploadedFile);

		ctx.status(200).result("Profile picture uploaded successfully");
	}

	private void handleProfilePictureDownload(@NotNull Context ctx) {
		final int id = ctx.pathParamAsClass("id", int.class).get();
		final String resourceName = id + ".jpg";

		try {
			// cache pfp in browser for 1 hour (3600 seconds)
			// removed for now because i believe react handles the caching for us
			// ctx.header("Cache-Control", "public, max-age=3600");

			ctx.result(this.profilePictures.getResource(resourceName));
			ctx.contentType("image/jpeg");
		} catch (HttpResponseException e) {
			throw e;
		}
	}
}