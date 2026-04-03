package com.marketmind.pmapi.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class DataSourceConfig {
  @Bean
  public HikariDataSource dataSource(Environment env) {
    HikariConfig cfg = new HikariConfig();

    String databaseUrl = env.getProperty("DATABASE_URL");
    if (databaseUrl != null && !databaseUrl.isBlank()) {
      // Same as Node: postgresql://user:pass@host:5432/db → JDBC URL for Hikari
      cfg.setJdbcUrl(toJdbcUrl(databaseUrl.trim()));
      return new HikariDataSource(cfg);
    }

    // Local / split env: use spring.datasource.* from application.yml (PGHOST, PGDATABASE, etc.)
    String url = env.getProperty("spring.datasource.url");
    if (url == null || url.isBlank()) {
      throw new IllegalStateException(
          "Configure the database: set DATABASE_URL (e.g. postgresql://user:pass@host:5432/dbname) "
              + "or spring.datasource.url (+ username/password) in application.yml / env.");
    }
    cfg.setJdbcUrl(url);
    String username = env.getProperty("spring.datasource.username");
    if (username != null && !username.isBlank()) {
      cfg.setUsername(username);
    }
    String password = env.getProperty("spring.datasource.password");
    if (password != null) {
      cfg.setPassword(password);
    }
    String driver = env.getProperty("spring.datasource.driver-class-name");
    if (driver != null && !driver.isBlank()) {
      cfg.setDriverClassName(driver);
    }
    return new HikariDataSource(cfg);
  }

  private static String toJdbcUrl(String databaseUrl) {
    if (databaseUrl.startsWith("jdbc:")) {
      return databaseUrl;
    }
    if (databaseUrl.startsWith("postgresql:")) {
      return "jdbc:" + databaseUrl;
    }
    return databaseUrl;
  }
}

