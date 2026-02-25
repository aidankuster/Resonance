package com.resonance.server.data.tags;

/**
 * @author John 2/16/2026
 */
public class Genre extends Tag {
	
	private final int genreID;
	
	public Genre(int genreID, int tagID, String name) {
		super(tagID, name);
		this.genreID = genreID;
	}
	
	public int getGenreID() {
		return this.genreID;
	}
	
}
