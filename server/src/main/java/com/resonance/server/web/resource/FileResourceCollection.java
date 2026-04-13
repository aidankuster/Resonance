package com.resonance.server.web.resource;

import io.javalin.http.*;

import java.io.*;
import java.util.function.Predicate;

/**
 *
 *
 * @author John 4/12/2026
 */
public class FileResourceCollection {
	
	private final File directory;
	private final ResourceValidator validator;
	
	public FileResourceCollection(String name, ResourceValidator validator) {
		this.directory = new File("resources", name);
		this.validator = validator;
		this.directory.mkdirs();
		
		if (!this.directory.exists()) {
			throw new IllegalArgumentException("Resource directory does not exist: " + this.directory.getAbsolutePath());
		}
		
		
	}
	
	public void putResource(String name, UploadedFile file) throws HttpResponseException {
		final File resourceFile = new File(this.directory, name);
		
		try(final InputStream is = this.validator.validate(file);
			final FileOutputStream fos = new FileOutputStream(resourceFile)
		) {
			fos.write(is.readAllBytes());
		} catch(IOException e) {
			throw new InternalServerErrorResponse("Failed to save file: " + e.getMessage());
			
		}
	}
	
	public InputStream getResource(String resource) throws HttpResponseException {
		final File file = new File(this.directory, resource);
		
		try {
			return new FileInputStream(file);
		} catch (FileNotFoundException e) {
			throw new NotFoundResponse("Resource not found: " + resource);
		} catch (Exception e) {
			throw new InternalServerErrorResponse("Failed to read resource: " + e.getMessage());
		}
	}
	
}
