package com.resonance.server.web.endpoints;

import com.resonance.server.Server;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.tags.Tag;
import com.resonance.server.data.tags.Instrument;
import com.resonance.server.data.tags.Genre;
import io.javalin.apibuilder.EndpointGroup;
import io.javalin.http.Context;
import org.jetbrains.annotations.NotNull;

import java.util.*;
import java.util.stream.Collectors;

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
        String instrument = ctx.queryParam("instrument");
        String genre = ctx.queryParam("genre");
        String experienceLevel = ctx.queryParam("experienceLevel");

        System.out.println("\n🔍 ========== SEARCH REQUEST ==========");
        System.out.println("📝 Query: '" + query + "'");
        System.out.println("🎸 Instrument: " + instrument);
        System.out.println("🎵 Genre: " + genre);
        System.out.println("📊 Experience Level: " + experienceLevel);
        System.out.println("=====================================\n");

        // Get all users from database
        System.out.println("Fetching all users from database...");
        List<UserAccount> allUsers = Server.INSTANCE.getDatabaseManager()
                .getAllUsers().collectList().block();

        if (allUsers == null || allUsers.isEmpty()) {
            System.out.println("❌ No users found in database");
            ctx.json(Collections.emptyList());
            return;
        }

        System.out.println("📊 Total users in database: " + allUsers.size());

        // Print all users for debugging
        System.out.println("\n📋 All users in database:");
        for (UserAccount user : allUsers) {
            System.out.println("   👤 ID=" + user.id() +
                    ", Name='" + user.info().displayName() + "'" +
                    ", Bio='" + (user.info().bio() != null ? user.info().bio() : "null") + "'");

            // Print user's tags
            Tag[] tags = user.tags();
            if (tags != null && tags.length > 0) {
                System.out.print("      Tags: ");
                for (Tag tag : tags) {
                    System.out.print(tag.getName() + " (" + tag.getClass().getSimpleName() + ") ");
                }
                System.out.println();
            } else {
                System.out.println("      No tags for this user");
            }
        }
        System.out.println();

        List<Map<String, Object>> results = new ArrayList<>();
        int matchCount = 0;

        for (UserAccount user : allUsers) {
            System.out.println("\n🔍 Checking user: " + user.info().displayName() + " (ID: " + user.id() + ")");
            int matchScore = calculateMatchScore(user, query, instrument, genre, experienceLevel);

            if (matchScore > 0) {
                matchCount++;
                System.out.println("   ✅ MATCH FOUND! Score: " + matchScore + "%");

                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.id());
                userMap.put("displayName", user.info().displayName());
                userMap.put("bio", user.info().bio() != null ? user.info().bio() : "");
                userMap.put("experienceLevel", user.info().experienceLevel().name());
                userMap.put("profileViews", 0);
                userMap.put("matchPercentage", matchScore);

                // Add instruments and genres
                List<String> instrumentsList = new ArrayList<>();
                List<String> genresList = new ArrayList<>();

                for (Tag tag : user.tags()) {
                    if (tag instanceof Instrument) {
                        instrumentsList.add(tag.getName());
                    } else if (tag instanceof Genre) {
                        genresList.add(tag.getName());
                    }
                }

                userMap.put("instruments", instrumentsList);
                userMap.put("genres", genresList);

                results.add(userMap);
            } else {
                System.out.println("   ❌ No match for this user");
            }
        }

        System.out
                .println("\n📊 Search complete. Found " + matchCount + " matches out of " + allUsers.size() + " users");
        System.out.println("=====================================\n");

        ctx.json(results);
    }

    private int calculateMatchScore(UserAccount user, String query,
            String instrument, String genre, String experienceLevel) {
        int score = 0;

        // Text search in name and bio
        if (query != null && !query.isEmpty()) {
            String lowerQuery = query.toLowerCase();
            String displayName = user.info().displayName();
            String bio = user.info().bio() != null ? user.info().bio() : "";

            boolean nameMatch = displayName != null &&
                    displayName.toLowerCase().contains(lowerQuery);
            boolean bioMatch = bio.toLowerCase().contains(lowerQuery);

            System.out.println("      Text search - nameMatch: " + nameMatch + ", bioMatch: " + bioMatch);

            if (nameMatch) {
                score += 40;
                System.out.println("         +40 for name match");
            }
            if (bioMatch) {
                score += 20;
                System.out.println("         +20 for bio match");
            }

            // Check instruments and genres for text match
            for (Tag tag : user.tags()) {
                if (tag.getName().toLowerCase().contains(lowerQuery)) {
                    System.out.println("         Tag match: " + tag.getName());
                    score += 30;
                    break;
                }
            }
        }

        // If there's a query but no matches at all, return 0
        if (query != null && !query.isEmpty() && score == 0) {
            System.out.println("      ❌ No text matches for query");
            return 0;
        }

        // Instrument filter
        if (instrument != null && !instrument.isEmpty()) {
            System.out.println("      Checking instrument filter: " + instrument);
            boolean hasInstrument = false;
            for (Tag tag : user.tags()) {
                if (tag instanceof Instrument &&
                        tag.getName().equalsIgnoreCase(instrument)) {
                    hasInstrument = true;
                    score += 30;
                    System.out.println("         ✓ Has instrument: " + tag.getName() + " (+30)");
                    break;
                }
            }
            if (!hasInstrument) {
                System.out.println("      ❌ Missing required instrument: " + instrument);
                return 0;
            }
        }

        // Genre filter
        if (genre != null && !genre.isEmpty()) {
            System.out.println("      Checking genre filter: " + genre);
            boolean hasGenre = false;
            for (Tag tag : user.tags()) {
                if (tag instanceof Genre &&
                        tag.getName().equalsIgnoreCase(genre)) {
                    hasGenre = true;
                    score += 30;
                    System.out.println("         ✓ Has genre: " + tag.getName() + " (+30)");
                    break;
                }
            }
            if (!hasGenre) {
                System.out.println("      ❌ Missing required genre: " + genre);
                return 0;
            }
        }

        // Experience level filter
        if (experienceLevel != null && !experienceLevel.isEmpty()) {
            System.out.println("      Checking experience level: " + experienceLevel +
                    " vs user level: " + user.info().experienceLevel().name());
            if (user.info().experienceLevel().name().equalsIgnoreCase(experienceLevel)) {
                score += 20;
                System.out.println("         ✓ Experience level matches (+20)");
            } else {
                System.out.println("      ❌ Experience level mismatch");
                return 0;
            }
        }

        // If no filters at all, return all users with base score
        if ((query == null || query.isEmpty()) &&
                instrument == null && genre == null && experienceLevel == null) {
            System.out.println("      No filters applied, returning base score 100");
            return 100;
        }

        int finalScore = Math.min(score, 100);
        System.out.println("      Final score for user: " + finalScore + "%");
        return finalScore;
    }
}