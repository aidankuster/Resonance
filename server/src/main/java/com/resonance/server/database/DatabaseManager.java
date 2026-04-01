package com.resonance.server.database;

import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.Project;
import com.resonance.server.data.ProjectRole;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.tags.Genre;
import com.resonance.server.data.tags.Instrument;
import com.resonance.server.data.tags.Tag;
import com.resonance.server.exception.AlreadyExistsException;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.Row2;
import org.jooq.exception.IntegrityConstraintViolationException;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.*;
import java.util.stream.Collectors;

import static org.jooq.impl.DSL.*;

public class DatabaseManager implements AutoCloseable {

	private static final Logger LOGGER = LoggerFactory.getLogger(DatabaseManager.class);

	private final DatabaseConfig config;
	private final Connection connection;
	private final DSLContext dsl;

	public DatabaseManager() {
		final ConfigHolder<DatabaseConfig> configHolder = new ConfigHolder<>("database", DatabaseConfig.class);

		try {
			this.config = configHolder.loadConfig();
		} catch (Exception ex) {
			throw new RuntimeException("Failed to load database config", ex);
		}

		final String baseUrl = String.format(
				"jdbc:%s://%s:%s/",
				this.config.dialect.getName().toLowerCase(),
				this.config.host,
				this.config.port);

		try {
			Class.forName("org.mariadb.jdbc.Driver");

			try (Connection baseConnection = DriverManager.getConnection(
					baseUrl,
					this.config.username,
					this.config.password)) {

				var stmt = baseConnection.createStatement();
				stmt.executeUpdate("CREATE DATABASE IF NOT EXISTS " + this.config.database);
				LOGGER.info("Ensured database '{}' exists", this.config.database);
			}

			final String url = String.format(
					"jdbc:%s://%s:%s/%s",
					this.config.dialect.getName().toLowerCase(),
					this.config.host,
					this.config.port,
					this.config.database);

			this.connection = DriverManager.getConnection(url, this.config.username, this.config.password);
			LOGGER.info("Connected to database: {}", this.config.database);

		} catch (Exception e) {
			throw new RuntimeException("Failed to connect to database", e);
		}

		this.dsl = DSL.using(this.connection, this.config.dialect);

		if (this.initializeDefaultTables(this.dsl)) {
			LOGGER.info("Created initial database tables");
		}
	}

	// ==================== USER ACCOUNT METHODS ====================

	public Mono<UserAccount> createAccount(String emailAddress, String hashedPassword, boolean enabled, boolean admin) {
		return Mono.from(
				this.dsl.insertInto(table("user_account"))
						.columns(field("email_address"), field("password"), field("enabled"), field("admin"))
						.values(DSL.inline(emailAddress, String.class), DSL.inline(hashedPassword, String.class),
								DSL.inline(enabled, Boolean.class), DSL.inline(admin, Boolean.class)))
				.flatMap(i -> {
					if (i <= 0)
						return Mono.error(new AlreadyExistsException());
					return findAccount(emailAddress).flatMap(account -> {
						final Mono<Integer> accountInfo = Mono.from(
								this.dsl.insertInto(table("user_account_info"))
										.columns(field("account_id"), field("display_name"), field("bio"),
												field("availability"), field("experience_level"))
										.values(inline(account.id(), Integer.class),
												inline(account.info().displayName(), String.class),
												inline(account.info().bio(), String.class),
												inline(account.info().availability(), String.class),
												inline(account.info().experienceLevel(),
														UserAccount.UserInfo.ExperienceLevel.class)));
						return accountInfo.then(Mono.just(account));
					});
				}).onErrorMap(err -> {
					if (err instanceof IntegrityConstraintViolationException)
						return new AlreadyExistsException();
					return err;
				});
	}

	public Mono<Void> updateAccount(UserAccount account) {
		System.out.println("🔄 Updating account ID: " + account.id());
		System.out.println("   displayName: " + account.info().displayName());
		System.out.println("   bio: " + account.info().bio());
		System.out.println("   experienceLevel: " + account.info().experienceLevel());
		System.out.println("   tags count: " + account.tags().length);

		return Mono.from(
				this.dsl.transactionPublisher(conf -> {
					final DSLContext tx = using(conf);

					// Update user_account table
					var updateUserAccount = tx.update(table("user_account"))
							.set(field("email_address"), inline(account.emailAddress(), String.class))
							.set(field("password"), inline(account.hashedPassword(), String.class))
							.set(field("enabled"), inline(account.enabled(), Boolean.class))
							.set(field("admin"), inline(account.admin(), Boolean.class))
							.where(field("account_id").eq(inline(account.id(), Integer.class)));

					// Update user_account_info table
					var updateUserInfo = tx.update(table("user_account_info"))
							.set(field("display_name"), inline(account.info().displayName(), String.class))
							.set(field("bio"), inline(account.info().bio(), String.class))
							.set(field("availability"), inline(account.info().availability(), String.class))
							.set(field("experience_level"),
									inline(account.info().experienceLevel(),
											UserAccount.UserInfo.ExperienceLevel.class))
							.where(field("account_id").eq(inline(account.id(), Integer.class)));

					// Delete existing tags
					var deleteTags = tx.deleteFrom(table("user_account_tags"))
							.where(field("account_id").eq(inline(account.id(), Integer.class)));

					// Insert new tags
					List<Row2<Integer, Integer>> tagRows = Arrays.stream(account.tags())
							.filter(Objects::nonNull)
							.map(t -> row(
									inline(account.id(), Integer.class),
									inline(t.getTagID(), Integer.class)))
							.toList();

					var insertTags = tx.insertInto(table("user_account_tags"))
							.columns(field("account_id", Integer.class), field("tag_id", Integer.class))
							.valuesOfRows(tagRows);

					// Execute all updates in sequence
					return Flux.concat(
							Mono.from(updateUserAccount).then(),
							Mono.from(updateUserInfo).then(),
							Mono.from(deleteTags).then(),
							tagRows.isEmpty() ? Mono.empty() : Mono.from(insertTags).then());
				})).then();
	}

	public Mono<UserAccount> findAccount(int id) {
		System.out.println("🔍 DatabaseManager.findAccount(int) called with ID: " + id);
		return this.findAccount(field("account_id").eq(DSL.inline(id, SQLDataType.INTEGER))).next()
				.doOnNext(account -> System.out.println("✅ Found account by ID: " + account.id()))
				.doOnError(e -> System.err.println("❌ Error finding account by ID: " + e.getMessage()))
				.switchIfEmpty(Mono.fromRunnable(() -> System.out.println("❌ No account found for ID: " + id)));
	}

	public Mono<UserAccount> findAccount(String emailAddress) {
		System.out.println("🔍 DatabaseManager.findAccount(String) called with email: '" + emailAddress + "'");
		System.out.println("🔍 Email length: " + (emailAddress != null ? emailAddress.length() : 0));

		Condition condition = field("email_address").eq(DSL.inline(emailAddress));
		System.out.println("🔍 Condition created");

		return this.findAccount(condition).next()
				.doOnNext(account -> System.out
						.println("✅ Found account by email: " + account.id() + " (" + account.emailAddress() + ")"))
				.doOnError(e -> System.err.println("❌ Error finding account by email: " + e.getMessage()))
				.switchIfEmpty(
						Mono.fromRunnable(() -> System.out.println("❌ No account found for email: " + emailAddress)));
	}

	public Flux<UserAccount> findAccount(Condition condition) {
		System.out.println("🔍 DatabaseManager.findAccount(Condition) called");
		System.out.println("🔍 Condition: " + condition);

		return Flux.from(
				this.dsl.selectFrom(
						table("user_account")
								.leftJoin(table("user_account_info"))
								.using(field("account_id", Integer.class))
								.leftJoin(table("user_account_tags"))
								.using(field("account_id", Integer.class))
								.leftJoin(table("tags"))
								.using(field("tag_id", Integer.class)))
						.where(condition))
				.collectList()
				.doOnNext(records -> System.out.println("📊 Query returned " + records.size() + " records"))
				.flatMapMany(records -> {
					if (records.isEmpty()) {
						System.out.println("📊 No records found for condition");
						return Flux.empty();
					}

					final Record first = records.getFirst();

					final int id = first.get(field("account_id", SQLDataType.INTEGER));
					final String email = first.get(field("email_address", SQLDataType.VARCHAR));
					final String hashedPassword = first.get(field("password", SQLDataType.VARCHAR));
					final boolean enabled = first.get(field("enabled", SQLDataType.BOOLEAN));
					final boolean admin = first.get(field("admin", SQLDataType.BOOLEAN));

					final String displayName = first.get(field("display_name", SQLDataType.VARCHAR));
					final String bio = first.get(field("bio", SQLDataType.VARCHAR));
					final String availability = first.get(field("availability", SQLDataType.VARCHAR));

					final String expLevelStr = first.get(field("experience_level", SQLDataType.VARCHAR));
					UserAccount.UserInfo.ExperienceLevel experienceLevel = UserAccount.UserInfo.ExperienceLevel.BEGINNER;

					if (expLevelStr != null) {
						try {
							experienceLevel = UserAccount.UserInfo.ExperienceLevel.valueOf(expLevelStr);
						} catch (IllegalArgumentException e) {
							LOGGER.warn("Invalid experience level '{}' for user {}, defaulting to BEGINNER",
									expLevelStr, id);
						}
					}

					final HashSet<Tag> tags = new HashSet<>();
					for (Record record : records) {
						final Integer tagID = record.get(field("tag_id", Integer.class));
						final String tagName = record.get(field("name", SQLDataType.VARCHAR));

						if (tagID == null || tagName == null) {
							continue;
						}

						final Tag.Type type = Tag.Type.valueOf(record.get(field("type", SQLDataType.VARCHAR)));

						if (type.equals(Tag.Type.INSTRUMENT)) {
							tags.add(new Instrument(tagID, tagName));
						} else if (type.equals(Tag.Type.GENRE)) {
							tags.add(new Genre(tagID, tagName));
						}
					}

					System.out.println("📊 Building UserAccount for ID: " + id + " with " + tags.size() + " tags");

					return Flux.just(new UserAccount(
							id,
							email,
							hashedPassword,
							enabled,
							admin,
							new UserAccount.UserInfo(displayName, bio, availability, experienceLevel),
							tags.toArray(Tag[]::new)));
				});
	}

	// ==================== PROJECT METHODS ====================

	public Mono<Project> createProject(String projectName, String description, String status, int founderId) {
		System.out.println("\n=== DATABASE: Creating project ===");
		try {
			var insert = dsl.insertInto(table("projects"))
					.columns(field("project_name"), field("description"), field("status"),
							field("founder_id"), field("member_count"), field("created_at"))
					.values(projectName, description, status, founderId, 1, java.time.Instant.now().toString());

			int rowsAffected = insert.execute();
			if (rowsAffected > 0) {
				var idResult = dsl.select(DSL.field("LAST_INSERT_ID()")).fetchOne();
				if (idResult != null) {
					int projectId = idResult.get(0, Integer.class);
					System.out.println("✅ Project created with ID: " + projectId);
					return getProject(projectId);
				}
			}
			return Mono.empty();
		} catch (Exception e) {
			e.printStackTrace();
			return Mono.empty();
		}
	}

	public Mono<Project> getProject(int projectId) {
		return Mono.from(
				dsl.select(
						field("p.project_id").as("project_id"),
						field("p.project_name").as("project_name"),
						field("p.description").as("description"),
						field("p.status").as("status"),
						field("p.founder_id").as("founder_id"),
						field("p.member_count").as("member_count"),
						field("p.created_at").as("created_at"),
						field("u.display_name").as("founder_name"),
						field("ua.email_address").as("founder_email")) // Add founder email
						.from(table("projects").as("p"))
						.leftJoin(table("user_account_info").as("u"))
						.on(field("p.founder_id").eq(field("u.account_id")))
						.leftJoin(table("user_account").as("ua")) // Join with user_account for email
						.on(field("p.founder_id").eq(field("ua.account_id")))
						.where(field("p.project_id").eq(projectId)))
				.map(record -> {
					Project project = new Project();
					project.id = record.get("project_id", Integer.class);
					project.projectName = record.get("project_name", String.class);
					project.description = record.get("description", String.class);
					project.status = record.get("status", String.class);
					project.founderId = record.get("founder_id", Integer.class);
					project.founderName = record.get("founder_name", String.class);
					project.founderEmail = record.get("founder_email", String.class);
					project.memberCount = record.get("member_count", Integer.class);
					project.createdAt = record.get("created_at", String.class);

					List<ProjectRole> roles = getProjectRoles(projectId).collectList().block();
					project.roles = roles != null ? roles : new ArrayList<>();
					return project;
				});
	}

	public Flux<ProjectRole> getProjectRoles(int projectId) {
		return Flux.from(
				dsl.select(
						field("role_id").as("role_id"),
						field("project_id").as("project_id"),
						field("instrument").as("instrument"),
						field("description").as("description"),
						field("is_filled").as("is_filled"),
						field("filled_by_user_id").as("filled_by_user_id"))
						.from(table("project_roles"))
						.where(field("project_id").eq(inline(projectId, Integer.class))))
				.map(record -> {
					ProjectRole role = new ProjectRole();
					role.id = record.get("role_id", Integer.class);
					role.projectId = record.get("project_id", Integer.class);
					role.instrument = record.get("instrument", String.class);
					role.description = record.get("description", String.class);
					role.isFilled = record.get("is_filled", Boolean.class);
					role.filledByUserId = record.get("filled_by_user_id", Integer.class);
					return role;
				});
	}

	public Flux<Project> getAllProjects() {
		return Flux.from(
				dsl.select(
						field("p.project_id").as("project_id"),
						field("p.project_name").as("project_name"),
						field("p.description").as("description"),
						field("p.status").as("status"),
						field("p.founder_id").as("founder_id"),
						field("p.member_count").as("member_count"),
						field("p.created_at").as("created_at"),
						field("u.display_name").as("founder_name"),
						field("ua.email_address").as("founder_email")) // Add founder email
						.from(table("projects").as("p"))
						.leftJoin(table("user_account_info").as("u"))
						.on(field("p.founder_id").eq(field("u.account_id")))
						.leftJoin(table("user_account").as("ua")) // Join with user_account for email
						.on(field("p.founder_id").eq(field("ua.account_id")))
						.orderBy(field("p.created_at").desc()))
				.map(record -> {
					Project project = new Project();
					project.id = record.get("project_id", Integer.class);
					project.projectName = record.get("project_name", String.class);
					project.description = record.get("description", String.class);
					project.status = record.get("status", String.class);
					project.founderId = record.get("founder_id", Integer.class);
					project.founderName = record.get("founder_name", String.class);
					project.founderEmail = record.get("founder_email", String.class); // Add this line
					project.memberCount = record.get("member_count", Integer.class);
					project.createdAt = record.get("created_at", String.class);

					// Load roles for each project
					List<ProjectRole> rolesList = getProjectRoles(project.id).collectList().block();
					project.roles = rolesList != null ? rolesList : new ArrayList<>();

					return project;
				});
	}

	public Mono<ProjectRole> addProjectRole(int projectId, String instrument, String description) {
		try {
			var insert = dsl.insertInto(table("project_roles"))
					.columns(field("project_id"), field("instrument"), field("description"), field("is_filled"))
					.values(projectId, instrument, description, false)
					.returning(field("role_id"));

			var result = insert.fetchOne();
			if (result != null) {
				ProjectRole role = new ProjectRole();
				role.id = result.get(field("role_id"), Integer.class);
				role.projectId = projectId;
				role.instrument = instrument;
				role.description = description;
				role.isFilled = false;
				return Mono.just(role);
			}
			return Mono.empty();
		} catch (Exception e) {
			e.printStackTrace();
			return Mono.empty();
		}
	}

	// ==================== TAG METHODS ====================

	public Flux<Tag> getTags(Condition... conditions) {
		return Flux.from(this.dsl.selectFrom("tags").where(conditions)).map(record -> {
			int tagID = record.get(field("tag_id", Integer.class));
			String name = record.get(field("name", SQLDataType.VARCHAR));
			Tag.Type type = Tag.Type.valueOf(record.get(field("type", SQLDataType.VARCHAR)));
			if (type.equals(Tag.Type.INSTRUMENT)) {
				return new Instrument(tagID, name);
			} else {
				return new Genre(tagID, name);
			}
		});
	}

	public Flux<Genre> getGenres() {
		return this.getTags(DSL.field("type").eq(Tag.Type.GENRE)).cast(Genre.class);
	}

	public Flux<Instrument> getInstruments() {
		return this.getTags(DSL.field("type").eq(Tag.Type.INSTRUMENT)).cast(Instrument.class);
	}

	public Flux<UserAccount> getAllUsers() {
		System.out.println("🔍 DatabaseManager.getAllUsers() called");

		return Flux.from(
				this.dsl.selectFrom(
						table("user_account")
								.leftJoin(table("user_account_info"))
								.using(field("account_id", Integer.class))
								.leftJoin(table("user_account_tags"))
								.using(field("account_id", Integer.class))
								.leftJoin(table("tags"))
								.using(field("tag_id", Integer.class))))
				.collectList()
				.doOnNext(records -> System.out.println("📊 getAllUsers: Found " + records.size() + " raw records"))
				.flatMapMany(records -> {
					if (records.isEmpty()) {
						System.out.println("📊 getAllUsers: No records found");
						return Flux.empty();
					}

					// Group records by user ID
					Map<Integer, List<Record>> userRecords = new HashMap<>();
					for (Record record : records) {
						Integer accountId = record.get(field("account_id", SQLDataType.INTEGER));
						if (accountId != null) {
							userRecords.computeIfAbsent(accountId, k -> new ArrayList<>()).add(record);
						}
					}

					System.out.println("📊 getAllUsers: Found " + userRecords.size() + " unique users");

					List<UserAccount> users = new ArrayList<>();

					for (Map.Entry<Integer, List<Record>> entry : userRecords.entrySet()) {
						List<Record> userRecs = entry.getValue();
						Record first = userRecs.get(0);

						int id = first.get(field("account_id", SQLDataType.INTEGER));
						String email = first.get(field("email_address", SQLDataType.VARCHAR));
						String hashedPassword = first.get(field("password", SQLDataType.VARCHAR));
						boolean enabled = first.get(field("enabled", SQLDataType.BOOLEAN));
						boolean admin = first.get(field("admin", SQLDataType.BOOLEAN));

						String displayName = first.get(field("display_name", SQLDataType.VARCHAR));
						String bio = first.get(field("bio", SQLDataType.VARCHAR));
						String availability = first.get(field("availability", SQLDataType.VARCHAR));

						String expLevelStr = first.get(field("experience_level", SQLDataType.VARCHAR));
						UserAccount.UserInfo.ExperienceLevel experienceLevel = UserAccount.UserInfo.ExperienceLevel.BEGINNER;

						if (expLevelStr != null) {
							try {
								experienceLevel = UserAccount.UserInfo.ExperienceLevel.valueOf(expLevelStr);
							} catch (IllegalArgumentException e) {
								LOGGER.warn("Invalid experience level '{}' for user {}", expLevelStr, id);
							}
						}

						HashSet<Tag> tags = new HashSet<>();
						for (Record record : userRecs) {
							Integer tagID = record.get(field("tag_id", Integer.class));
							String tagName = record.get(field("name", SQLDataType.VARCHAR));

							if (tagID == null || tagName == null)
								continue;

							Tag.Type type = Tag.Type.valueOf(record.get(field("type", SQLDataType.VARCHAR)));

							if (type.equals(Tag.Type.INSTRUMENT)) {
								tags.add(new Instrument(tagID, tagName));
							} else if (type.equals(Tag.Type.GENRE)) {
								tags.add(new Genre(tagID, tagName));
							}
						}

						users.add(new UserAccount(
								id,
								email,
								hashedPassword,
								enabled,
								admin,
								new UserAccount.UserInfo(displayName, bio, availability, experienceLevel),
								tags.toArray(Tag[]::new)));
					}

					System.out.println("✅ getAllUsers: Returning " + users.size() + " users");
					return Flux.fromIterable(users);
				});
	}

	// ==================== TABLE INITIALIZATION ====================

	private boolean initializeDefaultTables(DSLContext dsl) {
		Set<String> existingTables = new HashSet<>();
		try {
			var metaData = connection.getMetaData();
			try (var rs = metaData.getTables(null, null, "%", new String[] { "TABLE" })) {
				while (rs.next()) {
					existingTables.add(rs.getString("TABLE_NAME").toLowerCase());
				}
			}
		} catch (Exception e) {
			throw new RuntimeException("Failed to read database metadata", e);
		}

		boolean created = false;

		if (!existingTables.contains("user_account")) {
			dsl.createTable("user_account")
					.column("account_id", SQLDataType.INTEGER.identity(true))
					.column("email_address", SQLDataType.VARCHAR(255))
					.column("password", SQLDataType.VARCHAR(255))
					.column("enabled", SQLDataType.BOOLEAN.defaultValue(true))
					.column("admin", SQLDataType.BOOLEAN.defaultValue(false))
					.constraints(primaryKey("account_id"), constraint("uk_email").unique("email_address"))
					.execute();
			created = true;
		}

		if (!existingTables.contains("user_account_info")) {
			dsl.createTable("user_account_info")
					.column("account_id", SQLDataType.INTEGER.identity(true))
					.column("display_name", SQLDataType.VARCHAR(128))
					.column("bio", SQLDataType.VARCHAR(255))
					.column("availability", SQLDataType.VARCHAR(255))
					.column("experience_level",
							SQLDataType.VARCHAR.asEnumDataType(UserAccount.UserInfo.ExperienceLevel.class))
					.constraints(primaryKey("account_id"),
							constraint("fk_account_id").foreignKey("account_id").references("user_account",
									"account_id"))
					.execute();
			created = true;
		}

		if (!existingTables.contains("tags")) {
			dsl.createTable("tags")
					.column("tag_id", SQLDataType.INTEGER.identity(true))
					.column("name", SQLDataType.VARCHAR(64))
					.column("type", SQLDataType.VARCHAR.asEnumDataType(Tag.Type.class))
					.primaryKey("tag_id")
					.execute();
			initializeDefaultTags(dsl);
			created = true;
		}

		if (!existingTables.contains("user_account_tags")) {
			dsl.createTable("user_account_tags")
					.column("account_id", SQLDataType.INTEGER.notNull())
					.column("tag_id", SQLDataType.INTEGER.notNull())
					.constraints(
							constraint("fk_account_tags_account_id").foreignKey("account_id").references("user_account",
									"account_id"),
							constraint("fk_account_tags_tag_id").foreignKey("tag_id").references("tags", "tag_id"))
					.execute();
			created = true;
		}

		if (!existingTables.contains("projects")) {
			dsl.createTable("projects")
					.column("project_id", SQLDataType.INTEGER.identity(true))
					.column("project_name", SQLDataType.VARCHAR(200).nullable(false))
					.column("description", SQLDataType.CLOB)
					.column("status", SQLDataType.VARCHAR(20).defaultValue("recruiting"))
					.column("founder_id", SQLDataType.INTEGER.nullable(false))
					.column("member_count", SQLDataType.INTEGER.defaultValue(1))
					.column("created_at", SQLDataType.VARCHAR(50))
					.constraints(primaryKey("project_id"),
							constraint("fk_project_founder").foreignKey("founder_id").references("user_account",
									"account_id"))
					.execute();
			created = true;
		}

		if (!existingTables.contains("project_roles")) {
			dsl.createTable("project_roles")
					.column("role_id", SQLDataType.INTEGER.identity(true))
					.column("project_id", SQLDataType.INTEGER.nullable(false))
					.column("instrument", SQLDataType.VARCHAR(50).nullable(false))
					.column("description", SQLDataType.VARCHAR(255))
					.column("is_filled", SQLDataType.BOOLEAN.defaultValue(false))
					.column("filled_by_user_id", SQLDataType.INTEGER)
					.constraints(primaryKey("role_id"),
							constraint("fk_project_roles_project").foreignKey("project_id")
									.references("projects", "project_id").onDeleteCascade(),
							constraint("fk_project_roles_user").foreignKey("filled_by_user_id")
									.references("user_account", "account_id"))
					.execute();
			created = true;
		}

		return created;
	}

	private void initializeDefaultTags(DSLContext dsl) {
		final String[] instruments = {
				"Piano", "Guitar", "Violin", "Drums", "Saxophone",
				"Voice", "Bass", "Cello", "Trumpet", "Flute",
				"Clarinet", "Viola", "Harp", "Synthesizer", "Ukulele"
		};

		final String[] genres = {
				"Classical", "Jazz", "Rock", "Pop", "Hip Hop",
				"R&B", "Electronic", "Folk", "Metal", "Blues",
				"Country", "Funk", "Soul", "Latin", "World",
				"Musical Theatre", "Film Score"
		};

		var insert = dsl.insertInto(table("tags")).columns(field("name"), field("type"));

		for (String instrument : instruments) {
			insert = insert.values(inline(instrument, String.class), inline(Tag.Type.INSTRUMENT, Tag.Type.class));
		}

		for (String genre : genres) {
			insert = insert.values(inline(genre, String.class), inline(Tag.Type.GENRE, Tag.Type.class));
		}

		insert.execute();
	}

	@Override
	public void close() throws Exception {
		if (this.connection != null)
			this.connection.close();
	}
}