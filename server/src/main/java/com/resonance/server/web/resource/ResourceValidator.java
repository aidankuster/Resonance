package com.resonance.server.web.resource;

import io.javalin.http.HttpResponseException;
import io.javalin.http.UploadedFile;

import java.io.InputStream;

/**
 * @author John 4/12/2026
 */
@FunctionalInterface
public interface ResourceValidator {
	
	InputStream validate(UploadedFile file) throws HttpResponseException;
	
}