package com.resonance.server.database;

import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.tags.Genre;
import com.resonance.server.data.tags.Instrument;
import com.resonance.server.data.tags.Tag;
import com.resonance.server.exception.AlreadyExistsException;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Row2;
import org.jooq.exception.IntegrityConstraintViolationException;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.*;

import static org.jooq.impl.DSL.*;

/**
 * @author John 1/21/2026
 */
public class DatabaseManager implements AutoCloseable {
	
	/**
	 * Config
	 */
	private final DatabaseConfig config;
	
	/**
	 * Database connection
	 */
	private final Connection connection;
	private final DSLContext dsl;
	
	public DatabaseManager() {
		
		final ConfigHolder<DatabaseConfig> configHolder = new ConfigHolder<>("database", DatabaseConfig.class);
		
		try {
			this.config = configHolder.loadConfig();
		} catch(Exception ex) {
			throw new RuntimeException("Failed to load database config", ex);
		}
		
		final String url = String.format(
				"jdbc:%s://%s:%s/%s",
				this.config.dialect.getName().toLowerCase(),
				this.config.host,
				this.config.port,
				this.config.database
		);
		
		try {
			
			// i have no fucking idea why this is necessary but it is,
			// because without loading the class beforehand jdbc cannot find the mariadb driver
			Class.forName("org.mariadb.jdbc.Driver");
			
			this.connection = DriverManager.getConnection(url, this.config.username, this.config.password);
		} catch(Exception e) {
			throw new RuntimeException("Failed to connect to database", e);
		}
		
		this.dsl = DSL.using(this.connection, this.config.dialect);
		
		if(this.initializeDefaultTables(this.dsl)) {
			System.out.println("Created initial database");
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
		return Mono.from(
				this.dsl.insertInto(
						table("user_account")
				).columns(
						field("email_address"),
						field("password"),
						field("enabled"),
						field("admin")
				).values(
						DSL.inline(emailAddress, String.class),
						DSL.inline(hashedPassword, String.class),
						DSL.inline(enabled, Boolean.class),
						DSL.inline(admin, Boolean.class)
				)
		).flatMap((i) -> {
			if(i > 0) { //if row was actually created
				
				return findAccount(emailAddress).flatMap(account -> {
					
					//create a row in user_account_info table as well
					final Mono<Integer> accountInfo = Mono.from(
							this.dsl.insertInto(
									table("user_account_info")
							).columns(
									field("account_id"),
									field("display_name"),
									field("bio"),
									field("availability"),
									field("experience_level")
							).values(
									inline(account.id(), Integer.class),
									inline(account.info().displayName(), String.class),
									inline(account.info().bio(), String.class),
									inline(account.info().availability(), String.class),
									inline(account.info().experienceLevel(), UserAccount.UserInfo.ExperienceLevel.class)
							));
					
					
					return accountInfo.then(Mono.just(account));
				});
			}
			return Mono.error(new AlreadyExistsException());
		}).onErrorMap(err -> {
			if(err instanceof IntegrityConstraintViolationException) {
				return new AlreadyExistsException();
			}
			return err;
		});
	}
	
	public Mono<Void> updateAccount(UserAccount account) {
		return Mono.from(
				this.dsl.transactionPublisher(conf -> {
					final DSLContext tx = using(conf);
					
					//update accounts row
					final var upsertAccount = tx.insertInto(table("user_account"))
												.columns(
														field("account_id"),
														field("email_address"),
														field("password"),
														field("enabled"),
														field("admin")
												)
												.values(
														inline(account.id(), Integer.class),
														inline(account.emailAddress(), String.class),
														inline(account.hashedPassword(), String.class),
														inline(account.enabled(), Boolean.class),
														inline(account.admin(), Boolean.class)
												)
												.onDuplicateKeyUpdate()
												.set(field("email_address"), inline(account.emailAddress(), String.class))
												.set(field("password"), inline(account.hashedPassword(), String.class))
												.set(field("enabled"), inline(account.enabled(), Boolean.class))
												.set(field("admin"), inline(account.admin(), Boolean.class));
					
					//update account info row
					final UserAccount.UserInfo info = account.info();
					final var upsertInfo = tx.insertInto(table("user_account_info"))
											 .columns(
													 field("account_id"),
													 field("display_name"),
													 field("bio"),
													 field("availability"),
													 field("experience_level")
											 )
											 .values(
													 inline(account.id(), Integer.class),
													 inline(info.displayName(), String.class),
													 inline(info.bio(), String.class),
													 inline(info.availability(), String.class),
													 inline(info.experienceLevel(), UserAccount.UserInfo.ExperienceLevel.class)
											 ).onDuplicateKeyUpdate()
											 .set(field("display_name"), inline(info.displayName(), String.class))
											 .set(field("bio"), inline(info.bio(), String.class))
											 .set(field("availability"), inline(info.availability(), String.class))
											 .set(field("experience_level"), inline(info.experienceLevel(), UserAccount.UserInfo.ExperienceLevel.class));
					
					//replace tags
					final var deleteTags = tx.deleteFrom(table("user_account_tags"))
											 .where(field("account_id", Integer.class).eq(inline(account.id(), Integer.class)));
					
					final List<Row2<Integer, Integer>> tagRows = Arrays.stream(account.tags())
																				.filter(Objects::nonNull)
																				.map(t -> row(
																					 inline(account.id(), Integer.class),
																					 inline(t.getTagID(), Integer.class)
																				)).toList();

					final var insertTags = tx.insertInto(table("user_account_tags"))
											 .columns(
													 field("account_id", Integer.class),
													 field("tag_id", Integer.class)
											 )
											 .valuesOfRows(tagRows);
					
					return Flux.concat(
							Mono.from(upsertAccount).then(),
							Mono.from(upsertInfo).then(),
							Mono.from(deleteTags).then(),
							tagRows.isEmpty() ? Mono.empty() : Mono.from(insertTags).then()
					);
				})
		).then();
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
								.using(field("tag_id", Integer.class))
				).where(condition)
		).collectList().flatMapMany(records -> {
			if(records.isEmpty()) {
				return Flux.empty();
			}

			final var first = records.getFirst();

			final int id = first.get(field("account_id", SQLDataType.INTEGER));
			final String email = first.get(field("email_address", SQLDataType.VARCHAR));
			final String hashedPassword = first.get(field("password", SQLDataType.VARCHAR));
			final boolean enabled = first.get(field("enabled", SQLDataType.BOOLEAN));
			final boolean admin = first.get(field("admin", SQLDataType.BOOLEAN));

			final String displayName = first.get(field("display_name", SQLDataType.VARCHAR));
			final String bio = first.get(field("bio", SQLDataType.VARCHAR));
			final String availability = first.get(field("availability", SQLDataType.VARCHAR));
			final UserAccount.UserInfo.ExperienceLevel experienceLevel = first.get(
					field("experience_level", SQLDataType.VARCHAR.asEnumDataType(UserAccount.UserInfo.ExperienceLevel.class))
			);

			final HashSet<Tag> tags = new HashSet<>();
			for(var record : records) {
				final Integer tagID = record.get(field("tag_id", Integer.class));
				final String tagName = record.get(field("name", SQLDataType.VARCHAR));
				if(tagID != null && tagName != null) {
					tags.add(new Tag(tagID, tagName));
				}
			}

			return Flux.just(new UserAccount(
					id,
					email,
					hashedPassword,
					enabled,
					admin,
					new UserAccount.UserInfo(displayName, bio, availability, experienceLevel),
					tags.toArray(Tag[]::new)
			));
		});
	}
	
	public Flux<Tag> getTags() {
		return Flux.from(this.dsl.selectFrom("tags")).map(record -> {
			final int tagID = record.get(field("tag_id", Integer.class));
			final String name = record.get(field("name", SQLDataType.VARCHAR));
			return new Tag(tagID, name);
		});
	}
	
	public Flux<Genre> getGenres() {
		return Flux.from(this.dsl.selectFrom("genres")).map(record -> {
			final int genreID = record.get(field("genre_id", Integer.class));
			final int tagID = record.get(field("tag_id", Integer.class));
			final String name = record.get(field("name", SQLDataType.VARCHAR));
			return new Genre(genreID, tagID, name);
		});
	}
	
	public Flux<Instrument> getInstruments() {
		return Flux.from(this.dsl.selectFrom("instruments")).map(record -> {
			final int instrumentID = record.get(field("instrument_id", Integer.class));
			final int tagID = record.get(field("tag_id", Integer.class));
			final String name = record.get(field("name", SQLDataType.VARCHAR));
			return new Instrument(instrumentID, tagID, name);
		});
	}
	
	@Override
	public void close() throws Exception {
		this.connection.close();
	}
	
	private boolean initializeDefaultTables(DSLContext dsl) {
		//accounts table, this will hold the main data of the account
		final int userAccountTable = dsl.createTableIfNotExists("user_account")
										.column("account_id", SQLDataType.INTEGER.identity(true))
										.column("email_address", SQLDataType.VARCHAR(255))
										.column("password", SQLDataType.VARCHAR(255))
										.column("enabled", SQLDataType.BOOLEAN.defaultValue(true))
										.column("admin", SQLDataType.BOOLEAN.defaultValue(false))
										.constraints(
												primaryKey("account_id"),
												constraint("uk_email").unique("email_address")
										)
										.execute();
		
		//account info table, this will hold extra data of the account
		final int userAccountInfoTable = dsl.createTableIfNotExists("user_account_info")
											.column("account_id", SQLDataType.INTEGER.identity(true))
											.column("display_name", SQLDataType.VARCHAR(128))
											.column("bio", SQLDataType.VARCHAR(255))
											.column("availability", SQLDataType.VARCHAR(255))
											.column("experience_level", SQLDataType.VARCHAR.asEnumDataType(UserAccount.UserInfo.ExperienceLevel.class))
											.constraints(
													primaryKey("account_id"),
													constraint("fk_account_id")
															.foreignKey("account_id")
															.references("user_account", "account_id")
											)
											.execute();
		
		//tags table, this will store the set of possible account tags
		final int tagsTable = dsl.createTableIfNotExists("tags")
								 .column("tag_id", SQLDataType.INTEGER.identity(true))
								 .column("name", SQLDataType.VARCHAR(64))
								 .primaryKey("tag_id")
								 .execute();
		
		//account tags table, this will store the tags associated with each account
		final int userAccountTagsTable = dsl.createTableIfNotExists("user_account_tags")
											.column("account_id", SQLDataType.INTEGER.notNull())
											.column("tag_id", SQLDataType.INTEGER.notNull())
											.constraints(
													constraint("fk_account_tags_account_id")
															.foreignKey("account_id")
															.references("user_account", "account_id"),
													constraint("fk_account_tags_tag_id")
															.foreignKey("tag_id")
															.references("tags", "tag_id")
											)
											.execute();
		
		final int genresTable = dsl.createTableIfNotExists("genres")
								   .column("genre_id", SQLDataType.INTEGER.identity(true))
								   .column("tag_id", SQLDataType.INTEGER.notNull())
								   .column("name", SQLDataType.VARCHAR(128))
								   .constraints(
										   primaryKey("genre_id"),
										   constraint("fk_genre_tag_id")
												   .foreignKey("tag_id")
												   .references("tags", "tag_id")
								   )
								   .execute();
		
		final int instrumentsTable = dsl.createTableIfNotExists("instruments")
										.column("instrument_id", SQLDataType.INTEGER.identity(true))
										.column("tag_id", SQLDataType.INTEGER.notNull())
										.column("name", SQLDataType.VARCHAR(128))
										.constraints(
												primaryKey("instrument_id"),
												constraint("fk_instrument_tag_id")
														.foreignKey("tag_id")
														.references("tags", "tag_id")
										)
										.execute();
		
		return userAccountTable
				+ userAccountInfoTable
				+ tagsTable
				+ userAccountTagsTable
				+ genresTable
				+ instrumentsTable > 0;
	}
}
