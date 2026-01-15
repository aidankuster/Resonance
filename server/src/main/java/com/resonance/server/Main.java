package com.resonance.server;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

/**
 * @author john@chav.is 1/14/2026
 */
public class Main {
	public static void main(String[] args) {
		try {
			Files.createFile(new File("test").toPath());
		} catch(IOException e) {
			throw new RuntimeException(e);
		}
	}
}