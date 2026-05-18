package com.marketmind.pmapi.repository;

import com.marketmind.pmapi.model.Comment;
import com.marketmind.pmapi.model.User;
import com.marketmind.pmapi.util.IsoTimestamps;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class CommentRepository {
  private final JdbcTemplate jdbcTemplate;

  public CommentRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  private static final RowMapper<Comment> COMMENT_MAPPER = (rs, rowNum) -> {
    Comment c = new Comment();
    c.id = rs.getInt("id");
    c.content = rs.getString("content");
    c.taskId = rs.getInt("task_id");
    c.userId = rs.getInt("user_id");

    // user join columns are nullable
    Integer userIdJoin = rs.getObject("u_id") != null ? rs.getInt("u_id") : null;
    if (userIdJoin != null) {
      User u = new User();
      u.id = userIdJoin;
      u.name = rs.getString("u_name");
      u.email = rs.getString("u_email");
      u.avatarUrl = rs.getString("u_avatar_url");
      u.role = rs.getString("u_role");
      u.createdAt = IsoTimestamps.fromSqlTimestamp(rs.getTimestamp("u_created_at"));
      c.user = u;
    } else {
      c.user = null;
    }

    c.createdAt = IsoTimestamps.fromSqlTimestamp(rs.getTimestamp("created_at"));
    c.updatedAt = IsoTimestamps.fromSqlTimestamp(rs.getTimestamp("updated_at"));
    return c;
  };

  public List<Comment> listCommentsForTask(int taskId) {
    return jdbcTemplate.query(
        "select c.id, c.content, c.task_id, c.user_id, c.created_at, c.updated_at," +
            " u.id as u_id, u.name as u_name, u.email as u_email, u.avatar_url as u_avatar_url, u.role as u_role, u.created_at as u_created_at " +
            "from comments c left join users u on u.id = c.user_id where c.task_id = ? order by c.created_at",
        COMMENT_MAPPER,
        taskId
    );
  }

  public Optional<Comment> createComment(int taskId, int userId, String content) {
    // Insert and then select with join for consistent “user” payload
    jdbcTemplate.update(
        "insert into comments (content, task_id, user_id) values (?, ?, ?)",
        content,
        taskId,
        userId
    );

    // Fetch most recent comment for deterministic behavior
    List<Comment> res = jdbcTemplate.query(
        "select c.id, c.content, c.task_id, c.user_id, c.created_at, c.updated_at," +
            " u.id as u_id, u.name as u_name, u.email as u_email, u.avatar_url as u_avatar_url, u.role as u_role, u.created_at as u_created_at " +
            "from comments c left join users u on u.id = c.user_id " +
            "where c.task_id = ? and c.user_id = ? and c.content = ? " +
            "order by c.created_at desc limit 1",
        COMMENT_MAPPER,
        taskId,
        userId,
        content
    );
    return res.isEmpty() ? Optional.empty() : Optional.of(res.get(0));
  }
}

