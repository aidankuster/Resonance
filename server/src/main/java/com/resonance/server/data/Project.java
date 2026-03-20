package com.resonance.server.data;

import java.util.List;

public class Project {
    public int id;
    public String projectName;
    public String description;
    public String status;
    public int founderId;
    public String founderName;
    public int memberCount;
    public List<ProjectRole> roles;
    public String createdAt;
}