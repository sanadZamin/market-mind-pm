package com.marketmind.pmapi.repository;

import com.marketmind.pmapi.model.User;
import com.marketmind.pmapi.util.IsoTimestamps;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class UserRepository {
  private final JdbcTemplate jdbcTemplate;

  public UserRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  private static final RowMapper<User> USER_MAPPER = new RowMapper<>() {
    @Override
    public User mapRow(ResultSet rs, int rowNum) throws SQLException {
      User u = new User();
      u.id = rs.getInt("id");
      u.name = rs.getString("name");
      u.email = rs.getString("email");
      u.avatarUrl = rs.getString("avatar_url");
      u.role = rs.getString("role");
      u.createdAt = IsoTimestamps.fromSqlTimestamp(rs.getTimestamp("created_at"));
      return u;
    }
  };

  public Optional<User> findByEmail(String email) {
    try {
      List<User> results = jdbcTemplate.query(
          "select id, name, email, avatar_url, role, created_at from users where email = ?",
          USER_MAPPER,
          email
      );
      return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    } catch (DataAccessException e) {
      return Optional.empty();
    }
  }

  public Optional<UserWithPasswordHash> findByEmailWithPasswordHash(String email) {
    try {
      List<UserWithPasswordHash> results = jdbcTemplate.query(
          "select id, name, email, avatar_url, role, created_at, password_hash from users where email = ?",
          (rs, rowNum) -> {
            UserWithPasswordHash uwph = new UserWithPasswordHash();
            uwph.user = USER_MAPPER.mapRow(rs, rowNum);
            uwph.passwordHash = rs.getString("password_hash");
            return uwph;
          },
          email
      );
      return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    } catch (DataAccessException e) {
      return Optional.empty();
    }
  }

  public Optional<User> findById(int id) {
    try {
      List<User> results = jdbcTemplate.query(
          "select id, name, email, avatar_url, role, created_at from users where id = ?",
          USER_MAPPER,
          id
      );
      return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    } catch (DataAccessException e) {
      return Optional.empty();
    }
  }

  public List<User> listUsers() {
    return jdbcTemplate.query(
        "select id, name, email, avatar_url, role, created_at from users",
        USER_MAPPER
    );
  }

  public User insertUser(String name, String email, String passwordHash, String role) {
    // Drizzle defines role as pg enum user_role; JDBC sends varchar unless cast.
    // updated_at is NOT NULL in schema — set explicitly in case the DB has no default.
    String sql =
        "insert into users (name, email, password_hash, avatar_url, role, updated_at) "
            + "values (?, ?, ?, null, CAST(? AS user_role), now())";
    KeyHolder keyHolder = new GeneratedKeyHolder();
    int rows =
        jdbcTemplate.update(
            connection -> {
              PreparedStatement ps =
                  connection.prepareStatement(sql, new String[] {"id"});
              ps.setString(1, name);
              ps.setString(2, email);
              ps.setString(3, passwordHash);
              ps.setString(4, role);
              return ps;
            },
            keyHolder);
    if (rows != 1) {
      throw new IllegalStateException("Expected 1 row inserted into users, got " + rows);
    }
    Number id = keyHolder.getKey();
    if (id == null) {
      throw new IllegalStateException("Insert into users did not return generated id");
    }
    return findById(id.intValue())
        .orElseThrow(() -> new IllegalStateException("User missing after insert id=" + id));
  }

  public static class UserWithPasswordHash {
    public User user;
    public String passwordHash;
  }
}

