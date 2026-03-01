package com.resonance.server.exception;

public class AlreadyExistsException extends Exception {
	public AlreadyExistsException() {
		this("An account with this email address already exists.");
	}
	
	public AlreadyExistsException(String message) {
		super(message);
	}
}
