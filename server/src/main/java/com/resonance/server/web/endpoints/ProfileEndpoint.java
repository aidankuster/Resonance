package com.resonance.server.web.endpoints;

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
 * @author John 2/9/2026
 */
public class ProfileEndpoint implements EndpointGroup {
	
	private static final int MAX_PROFILE_PICTURE_SIZE = 1024 * 1024 * 5;
	
	private final FileResourceCollection profilePictures = new FileResourceCollection(
			"profile_pictures",
			uploadedFile -> {
				if(uploadedFile.size() > MAX_PROFILE_PICTURE_SIZE) {
					throw new BadRequestResponse("Profile picture size is too large");
				}

				// Validate content type
				String contentType = uploadedFile.contentType();
				if (contentType == null || !contentType.startsWith("image/")) {
					throw new BadRequestResponse("File must be an image");
				}

				try (final InputStream content = uploadedFile.content()) {
					BufferedImage image = ImageIO.read(content);

					if (image == null) {
						throw new BadRequestResponse("Invalid image file");
					}

					// Create a new BufferedImage with RGB color model (JPEG doesn't support alpha channel)
					BufferedImage rgbImage = new BufferedImage(
							image.getWidth(),
							image.getHeight(),
							BufferedImage.TYPE_INT_RGB
					);

					// Draw the original image onto the RGB image (removes alpha channel if present)
					rgbImage.createGraphics().drawImage(image, 0, 0, null);

					// Write the image to a byte array as JPEG
					ByteArrayOutputStream baos = new ByteArrayOutputStream();
					ImageIO.write(rgbImage, "jpg", baos);

					// Return the JPEG as an InputStream
					return new ByteArrayInputStream(baos.toByteArray());

				} catch(HttpResponseException e) {
					throw e;
				} catch(Exception e) {
					throw new BadRequestResponse("Invalid image file: " + e.getMessage());
				}
			}
	);
	
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

		UserAccount account = Server.INSTANCE.getDatabaseManager().findAccount(id).block();

		if (account == null) {
			throw new NotFoundResponse("Profile not found");
		}

		if (!ctx.method().equals(HandlerType.POST)) {
			// GET request - return profile data
			ctx.result(JsonConfigHolder.GSON.toJson(account.toJson(false)));
			ctx.contentType(ContentType.APPLICATION_JSON);
			return;
		}

		// POST request - handle profile updates
		// validate the session to make sure the user can only edit their own profile
		if(Server.INSTANCE.getWebServer().getSessionHandler().validateSession(ctx).id() != account.id()) {
			throw new UnauthorizedResponse("You cannot modify another user's profile");
		}

		// TODO: input validation

		final String displayName = ctx.formParam("display_name");
		final String bio = ctx.formParam("bio");
		final String availability = ctx.formParam("availability");
		final List<String> tags = ctx.formParams("tag");

		final UserAccount.Mutable mutableAccount = account.mutable();
		final UserAccount.UserInfo.Mutable mutableInfo = mutableAccount.getInfo();

		if (displayName != null) {
			mutableInfo.setDisplayName(displayName);
		}
		if (bio != null) {
			mutableInfo.setBio(bio);
		}
		if (availability != null) {
			mutableInfo.setAvailability(availability);
		}
		if (ctx.formParam("experience_level") != null) {
			String levelStr = ctx.formParam("experience_level");
			try {
				UserAccount.UserInfo.ExperienceLevel level = UserAccount.UserInfo.ExperienceLevel.valueOf(levelStr);
				mutableInfo.setExperienceLevel(level);
			} catch (IllegalArgumentException e) {
				ctx.status(400).result("Invalid experience level: " + levelStr);
				return;
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

		//save the pfp (validator will convert to JPG)
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