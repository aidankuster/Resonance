package com.resonance.server.database;

import com.resonance.server.config.ConfigProvider;
import com.resonance.server.data.AudioFile;
import com.resonance.server.data.Project;
import com.resonance.server.data.Report;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.Application;
import com.resonance.server.data.tags.Genre;
import com.resonance.server.data.tags.Instrument;
import com.resonance.server.data.tags.Tag;
import com.resonance.server.exception.AlreadyExistsException;
import org.jooq.*;
import org.jooq.Record;
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
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

import static org.jooq.impl.DSL.*;

public class DatabaseManager implements AutoCloseable {

	private static final Logger LOGGER = LoggerFactory.getLogger(DatabaseManager.class);

	private final DatabaseConfig config;
	private final Connection connection;
	private final DSLContext dsl;

	public DatabaseManager(ConfigProvider configProvider) {
		this.config = configProvider.getDatabaseConfig();

		final String baseUrl = switch (this.config.dialect) {
			case SQLITE -> // sqlite is file based rather than network based
				String.format(
						"jdbc:%s:%s",
						this.config.dialect.getName().toLowerCase(),
						this.config.database + ".db");
			default -> String.format(
					"jdbc:%s://%s:%s",
					this.config.dialect.getName().toLowerCase(),
					this.config.host,
					this.config.port);
		};

		try {
			// load db driver classes so they can be used
			Class.forName("org.mariadb.jdbc.Driver");
			Class.forName("com.mysql.cj.jdbc.Driver");
			Class.forName("org.sqlite.JDBC");

			// SQLite is file-based and doesn't need CREATE DATABASE
			final boolean isSqlLite = this.config.dialect.equals(SQLDialect.SQLITE);
			if (!isSqlLite) {
				try (Connection baseConnection = DriverManager.getConnection(
						baseUrl,
						this.config.username,
						this.config.password)) {
					var stmt = baseConnection.createStatement();
					stmt.executeUpdate("CREATE DATABASE IF NOT EXISTS " + this.config.database);
					LOGGER.info("Ensured database '{}' exists", this.config.database);
				}
			}

			final String url = !isSqlLite ? baseUrl + "/" + this.config.database : baseUrl;

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

	// ==================== GETTERS ====================

	public Connection getConnection() {
		return this.connection;
	}

	public DSLContext getDSLContext() {
		return this.dsl;
	}

	// ==================== USER ACCOUNT METHODS ====================

	public Mono<UserAccount> createAccount(String emailAddress, String hashedPassword, boolean enabled, boolean admin) {
		return Mono.from(
				this.dsl.insertInto(table("user_account"))
						.columns(field("email_address"), field("password"), field("enabled"), field("admin"))
						.values(
								DSL.inline(emailAddress, String.class), DSL.inline(hashedPassword, String.class),
								DSL.inline(enabled, Boolean.class), DSL.inline(admin, Boolean.class)))
				.flatMap(i -> {
					if (i <= 0) {
						return Mono.error(new AlreadyExistsException());
					}
					return findAccount(emailAddress).flatMap(account -> {
						final Mono<Integer> accountInfo = Mono.from(
								this.dsl.insertInto(table("user_account_info"))
										.columns(
												field("account_id"), field("display_name"), field("bio"),
												field("availability"), field("experience_level"))
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
							.set(
									field("experience_level"),
									inline(
											account.info().experienceLevel(),
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
		final Condition condition = field("account_id").eq(DSL.inline(id, SQLDataType.INTEGER));
		return this.getAccounts(condition).next()
				.doOnError(e -> LOGGER.warn("Unable to find account with ID {} ", id, e));
	}

	public Mono<UserAccount> findAccount(String emailAddress) {
		final Condition condition = field("email_address").eq(DSL.inline(emailAddress));
		return this.getAccounts(condition).next()
				.doOnError(e -> LOGGER.warn("Unable to find account with email {}", emailAddress, e));
	}

	public Flux<UserAccount> getAccounts() {
		final Condition condition = field("account_id").isNotNull();
		return this.getAccounts(condition);
	}

	public Flux<UserAccount> getAccounts(Condition condition) {
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
				.groupBy(record -> record.get(field("account_id", Integer.class)))
				.flatMap(group -> group.collectList().mapNotNull(records -> {
					if (records.isEmpty()) {
						return null;
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
							LOGGER.warn(
									"Invalid experience level '{}' for user {}, defaulting to BEGINNER",
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

					return new UserAccount(
							id,
							email,
							hashedPassword,
							enabled,
							admin,
							new UserAccount.UserInfo(displayName, bio, availability, experienceLevel),
							tags.toArray(Tag[]::new));
				}))
				.filter(Objects::nonNull);
	}

	// ==================== ADMIN USER MANAGEMENT ====================

	/**
	 * Delete a user and all associated data (admin only)
	 */
	public Mono<Void> deleteUser(int userId) {
		return Mono.from(
				this.dsl.transactionPublisher(conf -> {
					final DSLContext tx = using(conf);

					// Delete user_account_tags
					var deleteTags = tx.deleteFrom(table("user_account_tags"))
							.where(field("account_id", Integer.class).eq(inline(userId, Integer.class)));

					// Delete user_account_info
					var deleteInfo = tx.deleteFrom(table("user_account_info"))
							.where(field("account_id", Integer.class).eq(inline(userId, Integer.class)));

					// Delete user_account
					var deleteAccount = tx.deleteFrom(table("user_account"))
							.where(field("account_id", Integer.class).eq(inline(userId, Integer.class)));

					return Flux.concat(
							Mono.from(deleteTags).then(),
							Mono.from(deleteInfo).then(),
							Mono.from(deleteAccount).then());
				})).then();
	}

	/**
	 * Remove a user from all projects they've joined (sets account_id to null)
	 */
	public Mono<Void> removeUserFromAllProjects(int userId) {
		return Mono.from(
				this.dsl.update(table("project_roles"))
						.set(field("account_id", Integer.class), (Integer) null)
						.where(field("account_id", Integer.class).eq(inline(userId, Integer.class))))
				.then();
	}

	// ==================== PROJECT METHODS ====================

	public Mono<Project> createProject(int founderID, String name, String description, String status) {
		return Mono.from(this.dsl.insertInto(
				table("projects")).columns(
						field("name"),
						field("founder_id"),
						field("description"),
						field("status"),
						field("creation_date"))
				.values(
						DSL.inline(name, String.class),
						DSL.inline(founderID, int.class),
						DSL.inline(description, String.class),
						DSL.inline(status, String.class),
						DSL.inline(new Date(System.currentTimeMillis()), Date.class)))
				.flatMap((i) -> {
					if (i <= 0) {
						return Mono.error(new Exception("Failed to create project"));
					}

					return this.findAccount(founderID)
							.flatMap(founderAccount -> this.findProject(founderID, name).flatMap(project -> {

								// add founder to the project members list
								final Project.Mutable mutable = project.mutable();
								mutable.getMemberRoles()
										.add(new Project.MemberRole(project.id(), founderAccount, "Founder",
												"Founder of the project"));

								return this.updateProject(mutable.build());
							}));
				}).onErrorMap(err -> {
					if (err instanceof IntegrityConstraintViolationException) {
						return new AlreadyExistsException("A project with this name already exists for this user.");
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
					final var deleteMembers = tx.deleteFrom(table("project_roles"))
							.where(field("project_id", Integer.class).eq(inline(project.id(), Integer.class)));

					final List<Row4<Integer, Integer, String, String>> memberRows = Arrays.stream(project.memberRoles())
							.filter(Objects::nonNull)
							.map(m -> row(
									inline(project.id(), Integer.class),
									inline(
											m.account() == null ? null
													: m.account()
															.id(),
											Integer.class),
									inline(m.roleName(), String.class),
									inline(m.description(), String.class)))
							.toList();

					final var insertMembers = tx.insertInto(table("project_roles"))
							.columns(
									field("project_id", Integer.class),
									field("account_id", Integer.class),
									field("role", String.class),
									field("description", String.class))
							.valuesOfRows(memberRows);

					return Flux.concat(
							Mono.from(upsertProject).then(),
							Mono.from(deleteMembers).then(),
							memberRows.isEmpty() ? Mono.empty() : Mono.from(insertMembers).then());
				})).then(Mono.just(project));
	}

	/**
	 * Delete a project and all associated data (admin only)
	 */
	public Mono<Void> deleteProject(int projectId) {
		return Mono.from(
				this.dsl.transactionPublisher(conf -> {
					final DSLContext tx = using(conf);

					// Delete project_roles first (due to foreign key constraint)
					var deleteRoles = tx.deleteFrom(table("project_roles"))
							.where(field("project_id", Integer.class).eq(inline(projectId, Integer.class)));

					// Delete project
					var deleteProject = tx.deleteFrom(table("projects"))
							.where(field("project_id", Integer.class).eq(inline(projectId, Integer.class)));

					return Flux.concat(
							Mono.from(deleteRoles).then(),
							Mono.from(deleteProject).then());
				})).then();
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
		final Condition condition = field("founder_id", Integer.class).eq(inline(founderID, Integer.class));
		return this.getProjects(condition);
	}

	public Mono<Project> getProject(int projectID) {
		final Condition condition = field("project_id", Integer.class).eq(inline(projectID, Integer.class));
		return this.getProjects(condition).next();
	}

	public Flux<Project> getProjects() {
		return this.getProjects(DSL.trueCondition());
	}

	public Flux<Project> getProjects(Condition... conditions) {
		return Flux.from(this.dsl.selectFrom(table("projects")).where(conditions))
				.flatMap(record -> {
					final int projectID = record.get(field("project_id", Integer.class));
					final String name = record.get(field("name", SQLDataType.VARCHAR));
					final int founderID = record.get(field("founder_id", Integer.class));
					final String description = record.get(field("description", SQLDataType.VARCHAR));
					final String status = record.get(field("status", SQLDataType.VARCHAR));
					final Date creationDate = record.get(field("creation_date", SQLDataType.DATE));

					return getProjectMemberRoles(projectID)
							.collectList()
							.map(members -> new Project(
									projectID,
									name,
									founderID,
									description,
									status,
									creationDate,
									members.toArray(Project.MemberRole[]::new)));
				});
	}

	public Flux<Project.MemberRole> getProjectMemberRoles(int projectID) {
		return Flux.from(
				this.dsl.selectFrom(
						table("project_roles")
								.leftJoin(table("user_account"))
								.using(field("account_id", Integer.class))
								.leftJoin(table("user_account_info"))
								.using(field("account_id", Integer.class)))
						.where(field("project_id", Integer.class).eq(inline(projectID, Integer.class))))
				.map(record -> {
					final String role = record.get("role", String.class);
					final String description = record.get("description", String.class);

					final Integer accountID = record.get(field("account_id", Integer.class));

					if (accountID == null) {
						return new Project.MemberRole(projectID, null, role, description);
					}

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
							new Tag[0]);

					return new Project.MemberRole(projectID, userAccount, role, description);
				});
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

	public Mono<Report> createReport(int reporterId, int reportedId, String reason) {
		final Timestamp timestamp = Timestamp.from(Instant.now());
		return Mono.from(this.dsl.insertInto(
				table("reports")).columns(
						field("reporter_id"),
						field("reported_id"),
						field("reason"),
						field("status"),
						field("datetime"))
				.values(
						DSL.inline(reporterId, Integer.class),
						DSL.inline(reportedId, Integer.class),
						DSL.inline(reason, String.class),
						DSL.inline(Report.ReportStatus.PENDING, Report.ReportStatus.class),
						DSL.inline(timestamp, Timestamp.class)))
				.flatMap(i -> {
					if (i <= 0) {
						return Mono.error(new Exception("Failed to create report"));
					}

					// Get the last inserted ID
					return Mono.from(this.dsl.select(field("LAST_INSERT_ID()", Integer.class)))
							.flatMap(record -> {
								final int reportId = record.get(0, Integer.class);
								return getReport(reportId);
							});
				});
	}

	public Flux<Report> getReports(Condition... conditions) {
		return Flux.from(this.dsl.selectFrom(table("reports")).where(conditions))
				.map(record -> {
					final int id = record.get(field("report_id", Integer.class));
					final int reporterId = record.get(field("reporter_id", Integer.class));
					final int reportedId = record.get(field("reported_id", Integer.class));
					final String reason = record.get(field("reason", String.class));
					final String statusStr = record.get(field("status", String.class));
					final Timestamp datetime = record.get(field("datetime", Timestamp.class));

					Report.ReportStatus status = Report.ReportStatus.PENDING;
					if (statusStr != null) {
						try {
							status = Report.ReportStatus.valueOf(statusStr);
						} catch (IllegalArgumentException e) {
							LOGGER.warn("Invalid report status '{}' for report {}, defaulting to PENDING", statusStr,
									id);
						}
					}

					return new Report(id, reporterId, reportedId, reason, status, datetime);
				});
	}

	public Mono<Report> getReport(int id) {
		final Condition condition = field("report_id", Integer.class).eq(inline(id, Integer.class));
		return this.getReports(condition).next();
	}

	public Flux<Report> getReports() {
		return this.getReports(DSL.trueCondition());
	}

	// ==================== AUDIO FILE METHODS ====================

	public Mono<AudioFile> createAudioFile(int uploaderId, String fileName) {
		final AudioFile audioFile = AudioFile.create(uploaderId, fileName);
		return Mono.from(
				this.dsl.insertInto(table("audio_files"))
						.columns(
								field("uuid"),
								field("uploader_id"),
								field("file_name"),
								field("upload_date"))
						.values(
								inline(audioFile.uuid(), String.class),
								inline(audioFile.uploaderId(), Integer.class),
								inline(audioFile.fileName(), String.class),
								inline(audioFile.uploadDate(), Timestamp.class)))
				.flatMap(i -> {
					if (i <= 0) {
						return Mono.error(new Exception("Failed to create audio file record"));
					}
					return Mono.just(audioFile);
				});
	}

	public Mono<AudioFile> getAudioFile(String uuid) {
		return Flux.from(
				this.dsl.selectFrom(table("audio_files"))
						.where(field("uuid").eq(inline(uuid, String.class))))
				.map(record -> {
					final String id = record.get(field("uuid", String.class));
					final int uploaderId = record.get(field("uploader_id", Integer.class));
					final String fileName = record.get(field("file_name", String.class));
					final Timestamp uploadDate = record.get(field("upload_date", Timestamp.class));
					return new AudioFile(id, uploaderId, fileName, uploadDate);
				}).next();
	}

	public Flux<AudioFile> getAudioFilesByUploader(int uploaderId) {
		return Flux.from(
				this.dsl.selectFrom(table("audio_files"))
						.where(field("uploader_id").eq(inline(uploaderId, Integer.class))))
				.map(record -> {
					final String uuid = record.get(field("uuid", String.class));
					final int uploaderIdFromDB = record.get(field("uploader_id", Integer.class));
					final String fileName = record.get(field("file_name", String.class));
					final Timestamp uploadDate = record.get(field("upload_date", Timestamp.class));
					return new AudioFile(uuid, uploaderIdFromDB, fileName, uploadDate);
				});
	}

	public Mono<Void> deleteAudioFile(String uuid) {
		return Mono.from(
				this.dsl.deleteFrom(table("audio_files"))
						.where(field("uuid").eq(inline(uuid, String.class))))
				.then();
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
					.column(
							"experience_level",
							SQLDataType.VARCHAR.asEnumDataType(UserAccount.UserInfo.ExperienceLevel.class))
					.constraints(
							primaryKey("account_id"),
							constraint("fk_account_id")
									.foreignKey("account_id")
									.references("user_account", "account_id")
									.onDeleteCascade())
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
							constraint("fk_account_tags_account_id")
									.foreignKey("account_id")
									.references("user_account", "account_id")
									.onDeleteCascade(),
							constraint("fk_account_tags_tag_id")
									.foreignKey("tag_id")
									.references("tags", "tag_id")
									.onDeleteCascade())
					.execute();
			created = true;
		}

		if (!existingTables.contains("projects")) {
			dsl.createTable("projects")
					.column("project_id", SQLDataType.INTEGER.identity(true))
					.column("name", SQLDataType.VARCHAR(255).nullable(false))
					.column("founder_id", SQLDataType.INTEGER)
					.column("description", SQLDataType.VARCHAR(255))
					.column("status", SQLDataType.VARCHAR(20))
					.column("creation_date", SQLDataType.DATE)
					.constraints(
							primaryKey("project_id"),
							constraint("fk_founder_account_id")
									.foreignKey("founder_id")
									.references("user_account", "account_id")
									.onDeleteCascade(),
							unique("name", "founder_id") // unique project name per founder
					)
					.execute();
			created = true;
		}

		if (!existingTables.contains("project_roles")) {
			dsl.createTable("project_roles")
					.column("project_id", SQLDataType.INTEGER.notNull())
					.column("account_id", SQLDataType.INTEGER.nullable(true)) // null when role is not yet filled
					.column("role", SQLDataType.VARCHAR(64))
					.column("description", SQLDataType.VARCHAR(255))
					.constraints(
							constraint("fk_project_roles_project_id")
									.foreignKey("project_id")
									.references("projects", "project_id")
									.onDeleteCascade(),
							constraint("fk_project_roles_account_id")
									.foreignKey("account_id")
									.references("user_account", "account_id"))
					.execute();
			created = true;
		}

		if (!existingTables.contains("reports")) {
			dsl.createTable("reports")
					.column("report_id", SQLDataType.INTEGER.identity(true))
					.column("reporter_id", SQLDataType.INTEGER)
					.column("reported_id", SQLDataType.INTEGER)
					.column("reason", SQLDataType.VARCHAR(255))
					.column("status", SQLDataType.VARCHAR(20).asEnumDataType(Report.ReportStatus.class))
					.column("datetime", SQLDataType.TIMESTAMP)
					.constraints(
							primaryKey("report_id"),
							constraint("fk_reports_reporter_account_id")
									.foreignKey("reporter_id")
									.references("user_account", "account_id"),
							constraint("fk_reports_reported_account_id")
									.foreignKey("reported_id")
									.references("user_account", "account_id"))
					.execute();
			created = true;
		}

		if (!existingTables.contains("audio_files")) {
			dsl.createTable("audio_files")
					.column("uuid", SQLDataType.VARCHAR(36))
					.column("uploader_id", SQLDataType.INTEGER)
					.column("file_name", SQLDataType.VARCHAR(255))
					.column("upload_date", SQLDataType.TIMESTAMP.defaultValue(currentTimestamp()))
					.constraints(
							primaryKey("uuid"),
							constraint("fk_audio_files_uploader_id")
									.foreignKey("uploader_id")
									.references("user_account", "account_id")
									.onDeleteCascade())
					.execute();
			created = true;
		}

		if (!existingTables.contains("project_applications")) {
			dsl.createTable("project_applications")
					.column("application_id", SQLDataType.INTEGER.identity(true))
					.column("project_id", SQLDataType.INTEGER.notNull())
					.column("role_name", SQLDataType.VARCHAR(64).notNull())
					.column("applicant_id", SQLDataType.INTEGER.notNull())
					.column("status", SQLDataType.VARCHAR(20).defaultValue("PENDING"))
					.column("message", SQLDataType.CLOB)
					.column("application_date", SQLDataType.TIMESTAMP.defaultValue(currentTimestamp()))
					.column("response_date", SQLDataType.TIMESTAMP.nullable(true))
					.constraints(
							primaryKey("application_id"),
							constraint("fk_application_project_id")
									.foreignKey("project_id")
									.references("projects", "project_id")
									.onDeleteCascade(),
							constraint("fk_application_applicant_id")
									.foreignKey("applicant_id")
									.references("user_account", "account_id")
									.onDeleteCascade(),
							constraint("unique_application")
									.unique("project_id", "role_name", "applicant_id"))
					.execute();
			created = true;
			LOGGER.info("Created project_applications table");
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
		if (this.connection != null) {
			this.connection.close();
		}
	}

	public Mono<Application> createApplication(int projectId, String roleName, int applicantId, String message) {
		return Mono.from(
				this.dsl.insertInto(table("project_applications"))
						.columns(
								field("project_id"),
								field("role_name"),
								field("applicant_id"),
								field("message"),
								field("status"))
						.values(
								inline(projectId, Integer.class),
								inline(roleName, String.class),
								inline(applicantId, Integer.class),
								inline(message, String.class),
								inline("PENDING", String.class)))
				.flatMap(i -> {
					if (i <= 0) {
						return Mono.error(new Exception("Failed to create application"));
					}
					return getApplicationByDetails(projectId, roleName, applicantId);
				});
	}

	// Get applications for a project (founder only)
	public Flux<Application> getProjectApplications(int projectId) {
		return Flux.from(
				this.dsl.selectFrom(table("project_applications"))
						.where(field("project_id", Integer.class).eq(inline(projectId, Integer.class)))
						.orderBy(field("application_date").desc()))
				.map(this::mapToApplication);
	}

	// Get applications by applicant
	public Flux<Application> getUserApplications(int userId) {
		return Flux.from(
				this.dsl.selectFrom(table("project_applications"))
						.where(field("applicant_id", Integer.class).eq(inline(userId, Integer.class)))
						.orderBy(field("application_date").desc()))
				.map(this::mapToApplication);
	}

	// Update application status
	public Mono<Application> updateApplicationStatus(int applicationId, String status) {
		return Mono.from(
				this.dsl.update(table("project_applications"))
						.set(field("status"), inline(status, String.class))
						.set(field("response_date"), inline(new Timestamp(System.currentTimeMillis()), Timestamp.class))
						.where(field("application_id", Integer.class).eq(inline(applicationId, Integer.class))))
				.flatMap(i -> {
					if (i <= 0) {
						return Mono.error(new Exception("Failed to update application"));
					}
					return getApplication(applicationId);
				});
	}

	// Accept application and fill role
	public Mono<Project> acceptApplication(int applicationId) {
		return getApplication(applicationId).flatMap(app -> getProject(app.projectId()).flatMap(project -> {
			// Verify role is still open
			boolean roleOpen = Arrays.stream(project.memberRoles())
					.anyMatch(r -> r.roleName().equals(app.roleName()) && r.account() == null);

			if (!roleOpen) {
				return Mono.error(new Exception("Role is no longer available"));
			}

			// Update application status
			return updateApplicationStatus(applicationId, "ACCEPTED").flatMap(updatedApp -> {
				// Fill the role
				Project.Mutable mutable = project.mutable();
				mutable.getMemberRoles().removeIf(r -> r.roleName().equals(app.roleName()));

				return findAccount(app.applicantId()).flatMap(applicant -> {
					mutable.getMemberRoles().add(new Project.MemberRole(
							project.id(),
							applicant,
							app.roleName(),
							"Filled by " + applicant.info().displayName()));

					return updateProject(mutable.build());
				});
			});
		}));
	}

	private Mono<Application> getApplication(int applicationId) {
		return Mono.from(
				this.dsl.selectFrom(table("project_applications"))
						.where(field("application_id", Integer.class).eq(inline(applicationId, Integer.class))))
				.map(this::mapToApplication);
	}

	private Mono<Application> getApplicationByDetails(int projectId, String roleName, int applicantId) {
		return Mono.from(
				this.dsl.selectFrom(table("project_applications"))
						.where(field("project_id", Integer.class).eq(inline(projectId, Integer.class)))
						.and(field("role_name", String.class).eq(inline(roleName, String.class)))
						.and(field("applicant_id", Integer.class).eq(inline(applicantId, Integer.class))))
				.map(this::mapToApplication);
	}

	private Application mapToApplication(Record record) {
		return new Application(
				record.get(field("application_id", Integer.class)),
				record.get(field("project_id", Integer.class)),
				record.get(field("role_name", String.class)),
				record.get(field("applicant_id", Integer.class)),
				Application.ApplicationStatus.valueOf(record.get(field("status", String.class))),
				record.get(field("message", String.class)),
				record.get(field("application_date", Timestamp.class)),
				record.get(field("response_date", Timestamp.class)));
	}

	public DatabaseConfig getConfig() {
		return this.config;
	}
}
