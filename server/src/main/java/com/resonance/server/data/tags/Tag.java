package com.resonance.server.data.tags;

import java.util.Objects;

/**
 * @author John 2/16/2026
 */
public class Tag {
	
	private final int tagID;
	private final String name;
	
	public Tag(int tagID, String name) {
		this.tagID = tagID;
		this.name = name;
	}
	
	public int getTagID() {
		return this.tagID;
	}
	
	public String getName() {
		return this.name;
	}
	
	@Override
	public boolean equals(Object obj) {
		if(!(obj instanceof Tag tag)) {
			return false;
		}
		return tag.tagID == this.tagID && tag.name.equalsIgnoreCase(this.name);
	}
	
	@Override
	public int hashCode() {
		return Objects.hash(this.tagID, this.name);
	}
}
