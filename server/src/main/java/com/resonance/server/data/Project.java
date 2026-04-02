package com.resonance.server.data;

import com.google.gson.JsonObject;
import org.jetbrains.annotations.Nullable;

import java.sql.Date;
import java.util.Arrays;
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
		MemberRole[] memberRoles
) {
	
	public int getMemberCount() {
		return Math.toIntExact(Arrays.stream(this.memberRoles)
									 .filter(memberRole -> memberRole.account != null)
									 .count());
	}
	
	public MemberRole getFounder() {
		return Arrays.stream(this.memberRoles)
					  .filter(memberRole -> memberRole.account != null && memberRole.account.id() == this.founderID)
					  .findFirst()
					  .orElseThrow();
	}
	
	public JsonObject toJson() {
		final JsonObject obj = new JsonObject();
		
		obj.addProperty("id", this.id);
		obj.addProperty("name", this.name);
		obj.addProperty("founderID", this.founderID);
		obj.addProperty("description", this.description);
		obj.addProperty("status", this.status);
		obj.addProperty("creationDate", this.creationDate.toString());
		
		final JsonObject rolesObj = new JsonObject();
		
		for(MemberRole memberRole : this.memberRoles) {
			final UserAccount account = memberRole.account;
			rolesObj.add(memberRole.roleName, account == null ? null : account.toJson(false));
		}
		
		obj.add("memberRoles", rolesObj);
		
		return obj;
	}
	
	public Mutable mutable() {
		return new Mutable(this);
	}
	
	public record MemberRole(
			int projectID,
			@Nullable UserAccount account, //if null, then the role has not been filled by a member
			String roleName,
			String description
	) {}
	
	public static class Mutable {
		
		private final int id;
		private String name;
		private int founderID;
		private String description;
		private String status;
		private Date creationDate;
		private LinkedHashSet<MemberRole> memberRoles;
		
		Mutable(Project project) {
			this.id = project.id;
			this.name = project.name;
			this.founderID = project.founderID;
			this.description = project.description;
			this.status = project.status;
			this.creationDate = project.creationDate;
			this.memberRoles = new LinkedHashSet<>(List.of(project.memberRoles));
		}
		
		public Project build() {
			return new Project(
						this.id,
						this.name,
						this.founderID,
						this.description,
						this.status,
						this.creationDate,
						this.memberRoles.toArray(new MemberRole[0])
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
		
		public LinkedHashSet<MemberRole> getMemberRoles() {
			return memberRoles;
		}
		
	}
	
}