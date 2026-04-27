// Updated SearchEndpoint.java

package com.resonance.server.web.endpoints;

import com.resonance.server.Server;
import com.resonance.server.data.Project;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.tags.Tag;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import org.jetbrains.annotations.NotNull;

import java.util.*;

import static io.javalin.apibuilder.ApiBuilder.*;

public class SearchEndpoint implements EndpointGroup {

    @Override
    public void addEndpoints() {
        path("/api/search", () -> {
            get(this::handleSearch);
        });
    }

    private void handleSearch(@NotNull Context ctx) {
        String query = ctx.queryParam("q");
        String type = ctx.queryParam("type"); // "users", "projects", or "all"
        String instrument = ctx.queryParam("instrument");
        String genre = ctx.queryParam("genre");
        String experienceLevel = ctx.queryParam("experienceLevel");
        
        Map<String, Object> results = new HashMap<>();

        // Search users
        if (type == null || type.equals("users") || type.equals("all")) {
            List<Map<String, Object>> users = searchUsers(query, instrument, genre, experienceLevel);
            results.put("users", users);
        }

        // Search projects
        if (type == null || type.equals("projects") || type.equals("all")) {
            List<Map<String, Object>> projects = searchProjects(query, instrument, genre);
            results.put("projects", projects);
        }

        ctx.json(results);
    }

    private List<Map<String, Object>> searchUsers(String query, String instrument,
            String genre, String experienceLevel) {
        List<UserAccount> allUsers = Server.INSTANCE.getDatabaseManager()
													.getAccounts().collectList().block();

        if (allUsers == null || allUsers.isEmpty()) {
            return new ArrayList<>();
        }

        List<Map<String, Object>> results = new ArrayList<>();

        for (UserAccount user : allUsers) {
            int matchScore = calculateUserMatchScore(user, query, instrument, genre, experienceLevel);

            if (matchScore > 0) {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.id());
                userMap.put("type", "user");
                userMap.put("displayName", user.info().displayName());
                userMap.put("bio", user.info().bio());
                userMap.put("experienceLevel", user.info().experienceLevel().name());
                userMap.put("matchPercentage", matchScore);

                List<String> instrumentsList = new ArrayList<>();
                List<String> genresList = new ArrayList<>();

                for (Tag tag : user.tags()) {
                    if (tag instanceof com.resonance.server.data.tags.Instrument) {
                        instrumentsList.add(tag.getName());
                    } else if (tag instanceof com.resonance.server.data.tags.Genre) {
                        genresList.add(tag.getName());
                    }
                }

                userMap.put("instruments", instrumentsList);
                userMap.put("genres", genresList);
                results.add(userMap);
            }
        }

        return results;
    }

    private List<Map<String, Object>> searchProjects(String query, String instrument, String genre) {
        final List<Project> allProjects = Server.INSTANCE.getDatabaseManager().getProjects().collectList().block();

        if (allProjects == null || allProjects.isEmpty()) {
            return new ArrayList<>();
        }

        List<Map<String, Object>> results = new ArrayList<>();

        for (Project project : allProjects) {
            int matchScore = calculateProjectMatchScore(project, query, instrument, genre);

            if (matchScore > 0) {
                Map<String, Object> projectMap = new HashMap<>();
                projectMap.put("id", project.id());
                projectMap.put("type", "project");
                projectMap.put("title", project.name());
                projectMap.put("description", project.description());
                projectMap.put("status", project.status());
                projectMap.put("founderName", project.getFounder().account() == null ? "unknown" : project.getFounder().account().info().displayName());
                projectMap.put("memberCount", project.getMemberCount());
                projectMap.put("matchPercentage", matchScore);
                projectMap.put("createdAt", project.creationDate());

                // Extract unique instruments from roles
                List<String> neededInstruments = Arrays.stream(project.memberRoles())
                        .filter(role -> role.account() != null) // filter out roles that are already filled
                        .map(Project.MemberRole::roleName)
                        .distinct()
                        .toList();
                projectMap.put("neededInstruments", neededInstruments);

                // Get project genres
                // You'll need to add genres to the Project class
                projectMap.put("genres", new ArrayList<>()); // Add if you have genres

                results.add(projectMap);
            }
        }

        return results;
    }

    private int calculateUserMatchScore(UserAccount user, String query,
            String instrument, String genre, String experienceLevel) {
        int score = 0;

        // Text search in name and bio
        if (query != null && !query.isEmpty()) {
            String lowerQuery = query.toLowerCase();
            String displayName = user.info().displayName();
            String bio = user.info().bio() != null ? user.info().bio() : "";

            if (displayName != null && displayName.toLowerCase().contains(lowerQuery)) {
                score += 40;
            }
            if (bio.toLowerCase().contains(lowerQuery)) {
                score += 20;
            }

            for (Tag tag : user.tags()) {
                if (tag.getName().toLowerCase().contains(lowerQuery)) {
                    score += 30;
                    break;
                }
            }
        }

        if (query != null && !query.isEmpty() && score == 0) {
            return 0;
        }

        // Instrument filter
        if (instrument != null && !instrument.isEmpty()) {
            boolean hasInstrument = false;
            for (Tag tag : user.tags()) {
                if (tag instanceof com.resonance.server.data.tags.Instrument &&
                        tag.getName().equalsIgnoreCase(instrument)) {
                    hasInstrument = true;
                    score += 30;
                    break;
                }
            }
            if (!hasInstrument)
                return 0;
        }

        // Genre filter
        if (genre != null && !genre.isEmpty()) {
            boolean hasGenre = false;
            for (Tag tag : user.tags()) {
                if (tag instanceof com.resonance.server.data.tags.Genre &&
                        tag.getName().equalsIgnoreCase(genre)) {
                    hasGenre = true;
                    score += 30;
                    break;
                }
            }
            if (!hasGenre)
                return 0;
        }

        // Experience level filter
        if (experienceLevel != null && !experienceLevel.isEmpty()) {
            if (user.info().experienceLevel().name().equalsIgnoreCase(experienceLevel)) {
                score += 20;
            } else {
                return 0;
            }
        }

        if ((query == null || query.isEmpty()) &&
                instrument == null && genre == null && experienceLevel == null) {
            return 100;
        }

        return Math.min(score, 100);
    }

    private int calculateProjectMatchScore(Project project, String query,
            String instrument, String genre) {
        int score = 0;

        // Text search in title and description
        if (query != null && !query.isEmpty()) {
            String lowerQuery = query.toLowerCase();

            if (project.name() != null &&
                    project.name().toLowerCase().contains(lowerQuery)) {
                score += 50;
            }
            if (project.description() != null &&
                    project.description().toLowerCase().contains(lowerQuery)) {
                score += 30;
            }
        }

        if (query != null && !query.isEmpty() && score == 0) {
            return 0;
        }

        // Instrument filter - check if project needs this instrument
        if (instrument != null && !instrument.isEmpty()) {
            boolean needsInstrument = Arrays.stream(project.memberRoles())
                    .anyMatch(role -> role.roleName().equalsIgnoreCase(instrument));
            if (needsInstrument) {
                score += 50;
            } else {
                return 0;
            }
        }

        // No filters applied, return all with base score
        if ((query == null || query.isEmpty()) && instrument == null && genre == null) {
            return 100;
        }

        return Math.min(score, 100);
    }
}