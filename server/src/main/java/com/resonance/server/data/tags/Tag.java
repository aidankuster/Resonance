package com.resonance.server.data.tags;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.jooq.EnumType;

import java.util.Objects;

/**
 * @author John 2/16/2026
 */
public abstract class Tag {
	
	private final int tagID;
	private final String name;
	private final Type type;
	
	public Tag(int tagID, String name, Type type) {
		this.tagID = tagID;
		this.name = name;
		this.type = type;
	}
	
	public enum Type implements EnumType {
		INSTRUMENT,
		GENRE;
		
		@NotNull
		@Override
		public String getLiteral() {
			return this.name();
		}
		
		@Nullable
		@Override
		public String getName() {
			return "tag_type";
		}
	}
	
	public int getTagID() {
		return this.tagID;
	}
	
	public String getName() {
		return this.name;
	}
	
	public Type getType() {
		return this.type;
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
