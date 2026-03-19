package com.resonance.server.data;

import com.google.gson.JsonObject;

import java.sql.Date;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * @author John 3/18/2026
 */
public record Project(
		int id,
		String name,
		int founderID,
		String description,
		String status,
		Date creationDate,
		Member[] members
) {
	
	//TODO: implement
	public JsonObject toJson() {
		return new JsonObject();
	}
	
	public Mutable mutable() {
		return new Mutable(this);
	}
	
	public record Member(int projectID, int accountID, String role) {
	
	}
	
	public static class Mutable {
		
		private final int id;
		private String name;
		private int founderID;
		private String description;
		private String status;
		private Date creationDate;
		private LinkedHashSet<Member> members;
		
		Mutable(Project project) {
			this.id = project.id;
			this.name = project.name;
			this.founderID = project.founderID;
			this.description = project.description;
			this.status = project.status;
			this.creationDate = project.creationDate;
			this.members = new LinkedHashSet<>(List.of(project.members));
		}
		
		public Project build() {
			return new Project(
						this.id,
						this.name,
						this.founderID,
						this.description,
						this.status,
						this.creationDate,
						this.members.toArray(new Member[0])
				);
		}
		
		public int getId() {
			return id;
		}
		
		public String getName() {
			return name;
		}
		
		public void setName(String name) {
			this.name = name;
		}
		
		public int getFounderID() {
			return founderID;
		}
		
		public void setFounderID(int founderID) {
			this.founderID = founderID;
		}
		
		public String getDescription() {
			return description;
		}
		
		public void setDescription(String description) {
			this.description = description;
		}
		
		public String getStatus() {
			return status;
		}
		
		public void setStatus(String status) {
			this.status = status;
		}
		
		public Date getCreationDate() {
			return creationDate;
		}
		
		public void setCreationDate(Date creationDate) {
			this.creationDate = creationDate;
		}
		
		public LinkedHashSet<Member> getMembers() {
			return members;
		}
		
	}
	
}