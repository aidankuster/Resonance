package com.resonance.server.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.stream.JsonReader;

import java.io.*;

/**
 * Class for creating JSON configurations
 *
 * @author John 1/21/2026
 */
public class ConfigHolder<T> {
	
	/**
	 * The GSON instance
	 */
	public static final Gson GSON = new GsonBuilder()
			.setPrettyPrinting()
			.serializeNulls()
			.create();
	
	/**
	 * The directory the configs will be stored in
	 */
	public static final File CONFIG_DIR = new File("config");
	
	static {
		//create config directory
		CONFIG_DIR.mkdirs();
	}
	
	/**
	 * The name of the config
	 */
	private final String name;
	
	/**
	 * The file of this config
	 */
	private final File file;
	
	/**
	 * A reference to the config's class, because GSON needs it and theres no way to get it from the type parameter
	 */
	private final Class<T> clazz;
	
	public ConfigHolder(String name, Class<T> clazz) {
		this.name = name;
		this.file = new File(CONFIG_DIR, name + ".json");
		this.clazz = clazz;
	}
	
	public T loadConfig() throws Exception {
		try(JsonReader jsonReader = new JsonReader(new FileReader(this.file))) {
			return GSON.fromJson(jsonReader, this.clazz);
		} catch(FileNotFoundException e) {
			this.file.createNewFile();
			
			//create default config file
			final T obj = this.clazz.getConstructor().newInstance();
			this.saveConfig(obj);
			
			return obj;
		}
	}
	
	public void saveConfig(T obj) throws Exception {
		try (Writer writer = new FileWriter(this.file)) {
			GSON.toJson(obj, writer);
		}
	}
	
}
