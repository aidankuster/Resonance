package com.resonance.server.database;

import com.resonance.server.config.ConfigHolder;
import com.resonance.server.data.UserAccount;
import com.resonance.server.data.UserAccountInfo;
import com.resonance.server.data.tags.Genre;
import com.resonance.server.data.tags.Instrument;
import com.resonance.server.data.tags.Tag;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.HashSet;

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
			this.connection = DriverManager.getConnection(url, this.config.username, this.config.password);
		} catch(Exception e) {
			throw new RuntimeException("Failed to connect to database", e);
		}
		
		this.dsl = DSL.using(this.connection, this.config.dialect);
		
		if(this.initializeDefaultTables(this.dsl)) {
			System.out.println("Created initial database");
		}
		
	}
	
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
			if(i > 0) {
				return findAccount(emailAddress);
			}
			return null;
		});
	}
	
	public Flux<Integer> updateAccount(UserAccount account) {
		return Flux.from(
				this.dsl.insertInto(
							table("user_account")
					).columns(
							field("account_id"),
							field("email_address"),
							field("password"),
							field("enabled"),
							field("admin")
					).values(
							DSL.inline(account.id(), Integer.class),
							DSL.inline(account.emailAddress(), String.class),
							DSL.inline(account.hashedPassword(), String.class),
							DSL.inline(account.enabled(), Boolean.class),
							DSL.inline(account.admin(), Boolean.class)
					).onDuplicateKeyUpdate()
						.set(field("email_address"), DSL.inline(account.emailAddress(), String.class))
						.set(field("password"), DSL.inline(account.hashedPassword(), String.class))
						.set(field("enabled"), DSL.inline(account.enabled(), Boolean.class))
						.set(field("admin"), DSL.inline(account.admin(), Boolean.class))
		);
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
					new UserAccountInfo(displayName, bio),
					tags.toArray(Tag[]::new)
			));
		});
	}
	
	

	public Flux<Genre> getGenreList() {
		return Flux.from(this.dsl.selectFrom("genres")).map(record -> {
					final int genreID = record.get(field("genre_id", Integer.class));
					final int tagID = record.get(field("tag_id", Integer.class));
					final String name = record.get(field("name", SQLDataType.VARCHAR));
					return new Genre(genreID, tagID, name);
				}
		);
	}
	
	public Flux<Instrument> getInstrumentsList() {
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
