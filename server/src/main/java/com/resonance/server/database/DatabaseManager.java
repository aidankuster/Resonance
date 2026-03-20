package com.resonance.server.database;

import com.resonance.server.Server;
import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.Project;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.tags.Genre;
import com.resonance.server.data.tags.Instrument;
import com.resonance.server.data.tags.Tag;
import com.resonance.server.exception.AlreadyExistsException;
import com.resonance.server.data.Project;
import com.resonance.server.data.ProjectRole;
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
import java.sql.Date;
import java.sql.DriverManager;
import java.util.*;
import java.util.stream.Collectors;

import static org.jooq.impl.DSL.*;

/**
 * @author John 1/21/2026
 */
public class DatabaseManager implements AutoCloseable {

	private static final Logger LOGGER = LoggerFactory.getLogger(DatabaseManager.class);

	/**
	 * Config
	 */
	private final DatabaseConfig config;

	/**
	 * Database connection
	 */
	private final Connection connection;
	private final DSLContext dsl;

	public DatabaseManager(Server server) {

		final ConfigHolder<DatabaseConfig> configHolder = new ConfigHolder<>("database", DatabaseConfig.class);

		try {
			this.config = configHolder.loadConfig();
		} catch (Exception ex) {
			LOGGER.error("Failed to load database config", ex);
			throw new RuntimeException("Failed to load database config", ex);
		}

		// First, connect WITHOUT specifying the database to check/create it
		final String baseUrl = String.format(
				"jdbc:%s://%s:%s/",
				this.config.dialect.getName().toLowerCase(),
				this.config.host,
				this.config.port);

		try {
			// Load the MariaDB driver
			Class.forName("org.mariadb.jdbc.Driver");

			// Connect to MySQL server (without database)
			try (Connection baseConnection = DriverManager.getConnection(
					baseUrl,
					this.config.username,
					this.config.password)) {

				// Check if database exists, create if it doesn't
				var stmt = baseConnection.createStatement();
				stmt.executeUpdate("CREATE DATABASE IF NOT EXISTS " + this.config.database);
				LOGGER.info("Ensured database '{}' exists", this.config.database);
			}

			// Now connect to the specific database
			final String url = String.format(
					"jdbc:%s://%s:%s/%s",
					this.config.dialect.getName().toLowerCase(),
					this.config.host,
					this.config.port,
					this.config.database);

			this.connection = DriverManager.getConnection(url, this.config.username, this.config.password);
			LOGGER.info("Connected to database: {}", this.config.database);

		} catch (Exception e) {
			LOGGER.error("Failed to connect to database", e);
			throw new RuntimeException("Failed to connect to database", e);
		}

		this.dsl = DSL.using(this.connection, this.config.dialect);

		if (this.initializeDefaultTables(this.dsl)) {
			LOGGER.info("Created initial database tables");
		}
	}

	/**
	 * Attempts to register a new account
	 *
	 * @param emailAddress
	 * @param hashedPassword
	 * @param enabled
	 * @param admin
	 * @return a Mono of the {@link UserAccount} if it was created.
	 */
	public Mono<UserAccount> createAccount(String emailAddress, String hashedPassword, boolean enabled, boolean admin) {
		return Mono.from(this.dsl.insertInto(
				table("user_account")).columns(
						field("email_address"),
						field("password"),
						field("enabled"),
						field("admin"))
				.values(
						DSL.inline(emailAddress, String.class),
						DSL.inline(hashedPassword, String.class),
						DSL.inline(enabled, Boolean.class),
						DSL.inline(admin, Boolean.class)))
				.flatMap((i) -> {
					if (i <= 0) {
						return Mono.error(new AlreadyExistsException());
					}

					// if row was actually created
					return findAccount(emailAddress).flatMap(account -> {

						// create a row in user_account_info table as well
						final Mono<Integer> accountInfo = Mono.from(
								this.dsl.insertInto(
										table("user_account_info")).columns(
												field("account_id"),
												field("display_name"),
												field("bio"),
												field("availability"),
												field("experience_level"))
										.values(
												inline(account.id(), Integer.class),
												inline(account.info().displayName(), String.class),
												inline(account.info().bio(), String.class),
												inline(account.info().availability(), String.class),
												inline(
														account.info().experienceLevel(),
														UserAccount.UserInfo.ExperienceLevel.class)));
						return accountInfo.then(Mono.just(account));
					});
				}).onErrorMap(err -> {
					if (err instanceof IntegrityConstraintViolationException) {
						return new AlreadyExistsException();
					}
					return err;
				});
	}

	public Mono<Void> updateAccount(UserAccount account) {
		return Mono.from(
				this.dsl.transactionPublisher(conf -> {
					final DSLContext tx = using(conf);

					// update accounts row
					final var upsertAccount = tx.insertInto(table("user_account"))
							.columns(
									field("account_id"),
									field("email_address"),
									field("password"),
									field("enabled"),
									field("admin"))
							.values(
									inline(account.id(), Integer.class),
									inline(account.emailAddress(), String.class),
									inline(account.hashedPassword(), String.class),
									inline(account.enabled(), Boolean.class),
									inline(account.admin(), Boolean.class))
							.onDuplicateKeyUpdate()
							.set(field("email_address"), inline(account.emailAddress(), String.class))
							.set(field("password"), inline(account.hashedPassword(), String.class))
							.set(field("enabled"), inline(account.enabled(), Boolean.class))
							.set(field("admin"), inline(account.admin(), Boolean.class));

					// update account info row
					final UserAccount.UserInfo info = account.info();
					final var upsertInfo = tx.insertInto(table("user_account_info"))
							.columns(
									field("account_id"),
									field("display_name"),
									field("bio"),
									field("availability"),
									field("experience_level"))
							.values(
									inline(account.id(), Integer.class),
									inline(info.displayName(), String.class),
									inline(info.bio(), String.class),
									inline(info.availability(), String.class),
									inline(info.experienceLevel(), UserAccount.UserInfo.ExperienceLevel.class))
							.onDuplicateKeyUpdate()
							.set(field("display_name"), inline(info.displayName(), String.class))
							.set(field("bio"), inline(info.bio(), String.class))
							.set(field("availability"), inline(info.availability(), String.class))
							.set(
									field("experience_level"),
									inline(info.experienceLevel(), UserAccount.UserInfo.ExperienceLevel.class));

					// replace tags
					final var deleteTags = tx.deleteFrom(table("user_account_tags"))
							.where(field("account_id", Integer.class).eq(inline(account.id(), Integer.class)));

					final List<Row2<Integer, Integer>> tagRows = Arrays.stream(account.tags())
							.filter(Objects::nonNull)
							.map(t -> row(
									inline(account.id(), Integer.class),
									inline(t.getTagID(), Integer.class)))
							.toList();

					final var insertTags = tx.insertInto(table("user_account_tags"))
							.columns(
									field("account_id", Integer.class),
									field("tag_id", Integer.class))
							.valuesOfRows(tagRows);

					return Flux.concat(
							Mono.from(upsertAccount).then(),
							Mono.from(upsertInfo).then(),
							Mono.from(deleteTags).then(),
							tagRows.isEmpty() ? Mono.empty() : Mono.from(insertTags).then());
				})).then();
	}

	public Mono<UserAccount> findAccount(int id) {
		return this.findAccount(field("account_id").eq(DSL.inline(id, SQLDataType.INTEGER))).next();
	}

	public Mono<UserAccount> findAccount(String emailAddress) {
		return this.findAccount(field("email_address").eq(DSL.inline(emailAddress))).next();
	}

	public Flux<UserAccount> findAccount(Condition condition) {

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
				.collectList().flatMapMany(records -> {
					if (records.isEmpty()) {
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

					// FIX: Handle experience level conversion safely
					final String expLevelStr = first.get(field("experience_level", SQLDataType.VARCHAR));
					UserAccount.UserInfo.ExperienceLevel experienceLevel = UserAccount.UserInfo.ExperienceLevel.BEGINNER; // default

					if (expLevelStr != null) {
						try {
							experienceLevel = UserAccount.UserInfo.ExperienceLevel.valueOf(expLevelStr);
						} catch (IllegalArgumentException e) {
							LOGGER.warn(
									"Invalid experience level '{}' for user {}, defaulting to BEGINNER",
									expLevelStr, id);
							// already defaulted to BEGINNER
						}
					} else {
						LOGGER.warn("Experience level is null for user {}, defaulting to BEGINNER", id);
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

	public Mono<Project> createProject(int founderID, String name, String description) {
		return Mono.from(this.dsl.insertInto(
				table("projects")).columns(
						field("name"),
						field("founder_id"),
						field("description"),
						field("status"))
				.values(
						DSL.inline(name, String.class),
						DSL.inline(founderID, int.class),
						DSL.inline(description, String.class),
						DSL.inline("Planning", String.class)))
				.flatMap((i) -> {
					if (i <= 0) {
						return Mono.error(new Exception("Failed to create project"));
					}

					return findAccount(founderID)
							.flatMap(founderAccount -> findProject(founderID, name).flatMap(project -> {

								// add founder to the project members list
								final Project.Mutable mutable = project.mutable();
								mutable.getMembers().add(new Project.Member(project.id(), founderAccount, "Founder"));

								return this.updateProject(mutable.build());
							}));
				}).onErrorMap(err -> {
					if (err instanceof IntegrityConstraintViolationException) {
						return new AlreadyExistsException();
					}
					return err;
				});
	}

	public Mono<Project> updateProject(Project project) {
		return Mono.from(
				this.dsl.transactionPublisher(conf -> {
					final DSLContext tx = using(conf);

					// update projects row
					final var upsertProject = tx.insertInto(table("projects"))
							.columns(
									field("project_id"),
									field("name"),
									field("founder_id"),
									field("description"),
									field("status"),
									field("creation_date"))
							.values(
									inline(project.id(), Integer.class),
									inline(project.name(), String.class),
									inline(project.founderID(), Integer.class),
									inline(project.description(), String.class),
									inline(project.status(), String.class),
									inline(project.creationDate(), java.sql.Date.class))
							.onDuplicateKeyUpdate()
							.set(field("name"), inline(project.name(), String.class))
							.set(field("founder_id"), inline(project.founderID(), Integer.class))
							.set(field("description"), inline(project.description(), String.class))
							.set(field("status"), inline(project.status(), String.class))
							.set(field("creation_date"), inline(project.creationDate(), java.sql.Date.class));

					// update project members
					final var deleteMembers = tx.deleteFrom(table("project_members"))
							.where(field("project_id", Integer.class).eq(inline(project.id(), Integer.class)));

					final List<Row2<Integer, Integer>> memberRows = Arrays.stream(project.members())
							.filter(Objects::nonNull)
							.map(m -> row(
									inline(project.id(), Integer.class),
									inline(m.account().id(), Integer.class)))
							.toList();

					final var insertMembers = tx.insertInto(table("project_members"))
							.columns(
									field("project_id", Integer.class),
									field("account_id", Integer.class),
									field("role", String.class))
							.valuesOfRows(
									Arrays.stream(project.members())
											.filter(Objects::nonNull)
											.map(m -> row(
													inline(project.id(), Integer.class),
													inline(m.account().id(), Integer.class),
													inline(m.role(), String.class)))
											.toList());

					return Flux.concat(
							Mono.from(upsertProject).then(),
							Mono.from(deleteMembers).then(),
							memberRows.isEmpty() ? Mono.empty() : Mono.from(insertMembers).then());
				})).then(Mono.just(project));
	}

	/**
	 * Finds a specific project by a user
	 *
	 * @param founderID
	 * @param name
	 * @return
	 */
	public Mono<Project> findProject(int founderID, String name) {
		return this.findProjects(founderID)
				.filter(project -> project.name().equals(name))
				.next();
	}

	/**
	 * Find all projects created by a user
	 * 
	 * @param founderID
	 * @return
	 */
	public Flux<Project> findProjects(int founderID) {
		return getProjects(DSL.field("founder_id", Integer.class).eq(DSL.inline(founderID, Integer.class)));
	}

	public Mono<Project> findProject(int projectID) {
		return getProjects(DSL.field("project_id", Integer.class).eq(DSL.inline(projectID, Integer.class)))
				.next();
	}

	public Flux<Project> getProjects(Condition... conditions) {
		return Flux.from(
				this.dsl.selectFrom(
						table("projects")
								.leftJoin(table("project_members"))
								.using(field("project_id", Integer.class))
								.leftJoin(table("user_account"))
								.on(field("project_members.account_id", Integer.class)
										.eq(field("user_account.account_id", Integer.class)))
								.leftJoin(table("user_account_info"))
								.on(field("project_members.account_id", Integer.class)
										.eq(field("user_account_info.account_id", Integer.class))))
						.where(conditions))
				.groupBy(record -> record.get(field("project_id", Integer.class)))
				.flatMap(group -> group.collectList().mapNotNull(records -> {
					if (records.isEmpty()) {
						return null;
					}

					final Record first = records.getFirst();

					final int projectID = first.get(field("project_id", Integer.class));
					final String name = first.get(field("name", SQLDataType.VARCHAR));
					final int founderID = first.get(field("founder_id", Integer.class));
					final String description = first.get(field("description", SQLDataType.VARCHAR));
					final String status = first.get(field("status", SQLDataType.VARCHAR));
					final Date creationDate = first.get(field("creation_date", SQLDataType.DATE));

					final Project.Member[] members = records.stream()
							.filter(record -> record.get("email_address") != null)
							.map(record -> {
								final int accountID = record.get(8, Integer.class); // user_account.account_id is at
																					// index 8
								final String email = record.get("email_address", String.class);
								final String hashedPassword = record.get("password", String.class);
								final boolean enabled = record.get("enabled", Boolean.class);
								final boolean admin = record.get("admin", Boolean.class);

								final String displayName = record.get("display_name", String.class);
								final String bio = record.get("bio", String.class);
								final String availability = record.get("availability", String.class);
								final String expLevelStr = record.get("experience_level", String.class);

								UserAccount.UserInfo.ExperienceLevel experienceLevel = UserAccount.UserInfo.ExperienceLevel.BEGINNER;
								if (expLevelStr != null) {
									try {
										experienceLevel = UserAccount.UserInfo.ExperienceLevel.valueOf(expLevelStr);
									} catch (IllegalArgumentException e) {
										LOGGER.warn("Invalid experience level '{}' for user {}, defaulting to BEGINNER",
												expLevelStr, accountID);
									}
								}

								final UserAccount userAccount = new UserAccount(
										accountID,
										email,
										hashedPassword,
										enabled,
										admin,
										new UserAccount.UserInfo(displayName, bio, availability, experienceLevel),
										new Tag[0] // Tags are not needed for project members
								);

								final String role = record.get("role", String.class);
								return new Project.Member(projectID, userAccount, role);
							})
							.toArray(Project.Member[]::new);

					return new Project(projectID, name, founderID, description, status, creationDate, members);
				}))
				.filter(Objects::nonNull);
	}

	public Flux<Tag> getTags(Condition... conditions) {
		return Flux.from(this.dsl.selectFrom("tags").where(conditions)).handle((record, sink) -> {
			final int tagID = record.get(field("tag_id", Integer.class));
			final String name = record.get(field("name", SQLDataType.VARCHAR));
			final Tag.Type type = Tag.Type.valueOf(record.get(field("type", SQLDataType.VARCHAR)));
			if (type.equals(Tag.Type.INSTRUMENT)) {
				sink.next(new Instrument(tagID, name));
			} else if (type.equals(Tag.Type.GENRE)) {
				sink.next(new Genre(tagID, name));
			} else {
				sink.error(new RuntimeException("Unknown tag type: " + type));
			}
		});
	}

	public Flux<Genre> getGenres() {
		return this.getTags(DSL.field("type", SQLDataType.VARCHAR.asEnumDataType(Tag.Type.class)).eq(Tag.Type.GENRE))
				.cast(Genre.class);
	}

	public Flux<Instrument> getInstruments() {
		return this
				.getTags(DSL.field("type", SQLDataType.VARCHAR.asEnumDataType(Tag.Type.class)).eq(Tag.Type.INSTRUMENT))
				.cast(Instrument.class);
	}

	@Override
	public void close() throws Exception {
		this.connection.close();
	}

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

		// accounts table, this will hold the main data of the account
		if (!existingTables.contains("user_account")) {
			dsl.createTable("user_account")
					.column("account_id", SQLDataType.INTEGER.identity(true))
					.column("email_address", SQLDataType.VARCHAR(255))
					.column("password", SQLDataType.VARCHAR(255))
					.column("enabled", SQLDataType.BOOLEAN.defaultValue(true))
					.column("admin", SQLDataType.BOOLEAN.defaultValue(false))
					.constraints(
							primaryKey("account_id"),
							constraint("uk_email").unique("email_address"))
					.execute();
			created = true;
		}

		// account info table, this will hold extra data of the account
		if (!existingTables.contains("user_account_info")) {
			dsl.createTable("user_account_info")
					.column("account_id", SQLDataType.INTEGER.identity(true))
					.column("display_name", SQLDataType.VARCHAR(128))
					.column("bio", SQLDataType.VARCHAR(255))
					.column("availability", SQLDataType.VARCHAR(255))
					.column(
							"experience_level",
							SQLDataType.VARCHAR.asEnumDataType(UserAccount.UserInfo.ExperienceLevel.class))
					.constraints(
							primaryKey("account_id"),
							constraint("fk_account_id")
									.foreignKey("account_id")
									.references("user_account", "account_id"))
					.execute();
			created = true;
		}

		// tags table, this will store the set of possible account tags
		if (!existingTables.contains("tags")) {
			dsl.createTable("tags")
					.column("tag_id", SQLDataType.INTEGER.identity(true))
					.column("name", SQLDataType.VARCHAR(64))
					.column("type", SQLDataType.VARCHAR.asEnumDataType(Tag.Type.class))
					.primaryKey("tag_id")
					.execute();

			// create default tags
			this.initializeDefaultTags(dsl);
			created = true;
		}

		// account tags table, this will store the tags associated with each account
		if (!existingTables.contains("user_account_tags")) {
			dsl.createTable("user_account_tags")
					.column("account_id", SQLDataType.INTEGER.notNull())
					.column("tag_id", SQLDataType.INTEGER.notNull())
					.constraints(
							constraint("fk_account_tags_account_id")
									.foreignKey("account_id")
									.references("user_account", "account_id"),
							constraint("fk_account_tags_tag_id")
									.foreignKey("tag_id")
									.references("tags", "tag_id"))
					.execute();
			created = true;
		}

		if (!existingTables.contains("projects")) {
			dsl.createTable("projects")
					.column("project_id", SQLDataType.INTEGER.identity(true))
					.column("name", SQLDataType.VARCHAR(255))
					.column("founder_id", SQLDataType.INTEGER)
					.column("description", SQLDataType.VARCHAR(255))
					.column("status", SQLDataType.VARCHAR(32))
					.column("creation_date", SQLDataType.DATE.defaultValue(currentDate()))
					.constraints(
							primaryKey("project_id"),
							constraint("fk_founder_account_id")
									.foreignKey("founder_id")
									.references("user_account", "account_id"),
							unique("name", "founder_id") // unique project name per founder
					)
					.execute();
			created = true;
		}

		// Projects table
		if (!existingTables.contains("projects")) {
			dsl.createTable("projects")
					.column("project_id", SQLDataType.INTEGER.identity(true))
					.column("project_name", SQLDataType.VARCHAR(200).nullable(false))
					.column("description", SQLDataType.CLOB)
					.column("status", SQLDataType.VARCHAR(20).defaultValue("recruiting"))
					.column("founder_id", SQLDataType.INTEGER.nullable(false))
					.column("member_count", SQLDataType.INTEGER.defaultValue(1))
					.column("created_at", SQLDataType.VARCHAR(50))
					.constraints(
							primaryKey("project_id"),
							constraint("fk_project_founder")
									.foreignKey("founder_id")
									.references("user_account", "account_id"))
					.execute();
			created = true;
		}

		// Project roles table
		if (!existingTables.contains("project_roles")) {
			dsl.createTable("project_roles")
					.column("role_id", SQLDataType.INTEGER.identity(true))
					.column("project_id", SQLDataType.INTEGER.nullable(false))
					.column("instrument", SQLDataType.VARCHAR(50).nullable(false))
					.column("description", SQLDataType.VARCHAR(255))
					.column("is_filled", SQLDataType.BOOLEAN.defaultValue(false))
					.column("filled_by_user_id", SQLDataType.INTEGER)
					.constraints(
							primaryKey("role_id"),
							constraint("fk_project_roles_project")
									.foreignKey("project_id")
									.references("projects", "project_id")
									.onDeleteCascade(),
							constraint("fk_project_roles_user")
									.foreignKey("filled_by_user_id")
									.references("user_account", "account_id"))
					.execute();
			created = true;
		}

		// Project members table
		if (!existingTables.contains("project_members")) {
			dsl.createTable("project_members")
					.column("project_id", SQLDataType.INTEGER.nullable(false))
					.column("user_id", SQLDataType.INTEGER.nullable(false))
					.column("role_id", SQLDataType.INTEGER)
					.column("joined_at", SQLDataType.VARCHAR(50))
					.constraints(
							primaryKey("project_id", "user_id"),
							constraint("fk_project_members_project")
									.foreignKey("project_id")
									.references("projects", "project_id")
									.onDeleteCascade(),
							constraint("fk_project_members_user")
									.foreignKey("user_id")
									.references("user_account", "account_id"),
							constraint("fk_project_members_role")
									.foreignKey("role_id")
									.references("project_roles", "role_id"))
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

		var insert = dsl.insertInto(table("tags"))
				.columns(field("name"), field("type"));

		for (String instrument : instruments) {
			insert = insert.values(inline(instrument, String.class), inline(Tag.Type.INSTRUMENT, Tag.Type.class));
		}

		for (String genre : genres) {
			insert = insert.values(inline(genre, String.class), inline(Tag.Type.GENRE, Tag.Type.class));
		}

		insert.execute();
	}

	public Mono<Project> createProject(String projectName, String description,
			String status, int founderId) {

		System.out.println("\n=== DATABASE: Attempting to create project ===");
		System.out.println("projectName: " + projectName);
		System.out.println("description: " + description);
		System.out.println("status: " + status);
		System.out.println("founderId: " + founderId);

		try {
			// First, verify the founder exists
			System.out.println("Verifying founder exists...");
			UserAccount founder = findAccount(founderId).block();
			if (founder == null) {
				System.err.println("ERROR: Founder with ID " + founderId + " does not exist!");
				return Mono.empty();
			}

			// Try a simple insert and catch any exception
			try {
				System.out.println("Attempting insert...");

				// Build the insert statement
				var insert = dsl.insertInto(table("projects"))
						.columns(
								field("project_name"),
								field("description"),
								field("status"),
								field("founder_id"),
								field("member_count"),
								field("created_at"))
						.values(
								projectName,
								description,
								status,
								founderId,
								1,
								java.time.Instant.now().toString());

				// Log the SQL
				System.out.println("SQL: " + insert.getSQL());

				// Execute and get number of rows affected
				int rowsAffected = insert.execute();
				System.out.println("Rows affected: " + rowsAffected);

				if (rowsAffected > 0) {
					// Get the last inserted ID
					var idResult = dsl.select(DSL.field("LAST_INSERT_ID()")).fetchOne();
					if (idResult != null) {
						int projectId = idResult.get(0, Integer.class);
						System.out.println("✅ Project created with ID: " + projectId);
						return getProject(projectId);
					} else {
						System.err.println("ERROR: Could not retrieve last insert ID");
						return Mono.empty();
					}
				} else {
					System.err.println("ERROR: No rows affected by insert");
					return Mono.empty();
				}

			} catch (Exception e) {
				System.err.println("❌ SQL Exception during insert: " + e.getMessage());
				System.err.println("Exception type: " + e.getClass().getName());
				e.printStackTrace();
				return Mono.empty();
			}

		} catch (Exception e) {
			System.err.println("EXCEPTION in createProject: " + e.getMessage());
			e.printStackTrace();
			return Mono.empty();
		}
	}

	public Mono<Project> getProject(int projectId) {
		System.out.println("=== DATABASE: Getting project " + projectId + " ===");
		return Mono.from(
				this.dsl.select(
						field("p.project_id").as("project_id"),
						field("p.project_name").as("project_name"),
						field("p.description").as("description"),
						field("p.status").as("status"),
						field("p.founder_id").as("founder_id"),
						field("p.member_count").as("member_count"),
						field("p.created_at").as("created_at"),
						field("u.display_name").as("founder_name"))
						.from(table("projects").as("p"))
						.leftJoin(table("user_account_info").as("u"))
						.on(field("p.founder_id").eq(field("u.account_id")))
						.where(field("p.project_id").eq(projectId)))
				.map(record -> {
					Project project = new Project();
					// Use the aliased field names (without the "p." prefix)
					project.id = record.get("project_id", Integer.class);
					project.projectName = record.get("project_name", String.class);
					project.description = record.get("description", String.class);
					project.status = record.get("status", String.class);
					project.founderId = record.get("founder_id", Integer.class);
					project.founderName = record.get("founder_name", String.class);
					project.memberCount = record.get("member_count", Integer.class);
					project.createdAt = record.get("created_at", String.class);

					System.out.println("Found project in DB: " + project.projectName + " with ID: " + project.id);

					// Load roles
					try {
						List<ProjectRole> rolesList = getProjectRoles(projectId).collectList().block();
						project.roles = rolesList != null ? rolesList : new ArrayList<>();
						System.out.println("Loaded " + project.roles.size() + " roles for project");
					} catch (Exception e) {
						System.err.println("Error loading roles for project " + projectId + ": " + e.getMessage());
						project.roles = new ArrayList<>();
					}

					return project;
				});
	}

	public Flux<ProjectRole> getProjectRoles(int projectId) {
		return Flux.from(
				this.dsl.select(
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
					role.id = record.get(field("role_id", Integer.class));
					role.projectId = record.get(field("project_id", Integer.class));
					role.instrument = record.get(field("instrument", String.class));
					role.description = record.get(field("description", String.class));
					role.isFilled = record.get(field("is_filled", Boolean.class));
					role.filledByUserId = record.get(field("filled_by_user_id", Integer.class));
					return role;
				});
	}

	public Flux<Project> getAllProjects() {
		return Flux.from(
				this.dsl.select(
						field("p.project_id").as("project_id"),
						field("p.project_name").as("project_name"),
						field("p.description").as("description"),
						field("p.status").as("status"),
						field("p.founder_id").as("founder_id"),
						field("p.member_count").as("member_count"),
						field("p.created_at").as("created_at"),
						field("u.display_name").as("founder_name"))
						.from(table("projects").as("p"))
						.leftJoin(table("user_account_info").as("u"))
						.on(field("p.founder_id").eq(field("u.account_id")))
						.orderBy(field("p.created_at").desc()))
				.map(record -> {
					Project project = new Project();
					// Use the aliased field names (without the "p." prefix)
					project.id = record.get(field("project_id", Integer.class));
					project.projectName = record.get(field("project_name", String.class));
					project.description = record.get(field("description", String.class));
					project.status = record.get(field("status", String.class));
					project.founderId = record.get(field("founder_id", Integer.class));
					project.memberCount = record.get(field("member_count", Integer.class));
					project.createdAt = record.get(field("created_at", String.class));
					project.founderName = record.get(field("founder_name", String.class));

					// Load roles for each project
					try {
						List<ProjectRole> rolesList = getProjectRoles(project.id).collectList().block();
						project.roles = rolesList != null ? rolesList : new ArrayList<>();
					} catch (Exception e) {
						System.err.println("Error loading roles for project " + project.id + ": " + e.getMessage());
						project.roles = new ArrayList<>();
					}

					return project;
				});
	}

	public Mono<ProjectRole> addProjectRole(int projectId, String instrument, String description) {
		System.out.println("\n=== DATABASE: Adding role ===");
		System.out.println("projectId: " + projectId);
		System.out.println("instrument: " + instrument);
		System.out.println("description: " + description);

		try {
			var insertStep = dsl.insertInto(table("project_roles"))
					.columns(
							field("project_id"),
							field("instrument"),
							field("description"),
							field("is_filled"))
					.values(
							projectId,
							instrument,
							description,
							false)
					.returning(field("role_id"));

			System.out.println("SQL: " + insertStep.getSQL());

			var result = insertStep.fetchOne();
			if (result != null) {
				ProjectRole role = new ProjectRole();
				role.id = result.get(field("role_id"), Integer.class);
				role.projectId = projectId;
				role.instrument = instrument;
				role.description = description;
				role.isFilled = false;
				System.out.println("✅ Role added with ID: " + role.id);
				return Mono.just(role);
			} else {
				System.err.println("❌ Failed to insert role - no result returned");
				return Mono.empty();
			}
		} catch (Exception e) {
			System.err.println("❌ ERROR adding role: " + e.getMessage());
			e.printStackTrace();
			return Mono.empty();
		}
	}

	public Flux<UserAccount> getAllUsers() {
		return Flux.from(
				this.dsl.selectFrom(
						table("user_account")
								.leftJoin(table("user_account_info"))
								.using(field("account_id", Integer.class))
								.leftJoin(table("user_account_tags"))
								.using(field("account_id", Integer.class))
								.leftJoin(table("tags"))
								.using(field("tag_id", Integer.class))))
				.collectList().flatMapMany(records -> {
					if (records.isEmpty()) {
						return Flux.empty();
					}

					// Group records by user ID
					Map<Integer, List<Record>> userRecords = records.stream()
							.collect(Collectors.groupingBy(r -> r.get(field("account_id", SQLDataType.INTEGER))));

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
								// Use default
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
								id, email, hashedPassword, enabled, admin,
								new UserAccount.UserInfo(displayName, bio, availability, experienceLevel),
								tags.toArray(Tag[]::new)));
					}

					return Flux.fromIterable(users);
				});
	}
}