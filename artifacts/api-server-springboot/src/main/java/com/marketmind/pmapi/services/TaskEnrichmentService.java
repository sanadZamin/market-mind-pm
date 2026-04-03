package com.marketmind.pmapi.services;

import com.marketmind.pmapi.models.Task;
import com.marketmind.pmapi.models.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class TaskEnrichmentService {
  private final JdbcTemplate jdbcTemplate;

  public TaskEnrichmentService(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  private static final RowMapper<User> USER_MAPPER = (rs, rowNum) -> {
    User u = new User();
    u.id = rs.getInt("id");
    u.name = rs.getString("name");
    u.email = rs.getString("email");
    u.avatarUrl = rs.getString("avatar_url");
    u.role = rs.getString("role");
    u.createdAt = rs.getTimestamp("created_at").toInstant().toString();
    return u;
  };

  /** JDBC cannot bind a Java array as PostgreSQL {@code = ANY(?)}; use {@code IN (?,?,...)} instead. */
  private static String inClausePlaceholders(int n) {
    return String.join(",", Collections.nCopies(n, "?"));
  }

  public List<Task> enrichTasks(List<Task> tasks) {
    if (tasks.isEmpty()) return tasks;

    List<Integer> ids = tasks.stream().map(t -> t.id).toList();
    Set<Integer> userIds = new HashSet<>();
    for (Task t : tasks) {
      if (t.assigneeId != null) userIds.add(t.assigneeId);
      if (t.reporterId != 0) userIds.add(t.reporterId);
    }

    Map<Integer, User> userMap = new HashMap<>();
    if (!userIds.isEmpty()) {
      List<Integer> userIdList = new ArrayList<>(userIds);
      String inUsers = inClausePlaceholders(userIdList.size());
      List<User> users =
          jdbcTemplate.query(
              "select id, name, email, avatar_url, role, created_at from users where id in (" + inUsers + ")",
              USER_MAPPER,
              userIdList.toArray());
      for (User u : users) userMap.put(u.id, u);
    }

    // Subtask counts
    Map<Integer, Integer> subtaskCounts = new HashMap<>();
    for (Integer id : ids) subtaskCounts.put(id, 0);
    String inIds = inClausePlaceholders(ids.size());
    List<Map<String, Object>> subtaskAgg =
        jdbcTemplate.queryForList(
            "select parent_task_id, count(*) as cnt from tasks where parent_task_id in ("
                + inIds
                + ") group by parent_task_id",
            ids.toArray());
    for (Map<String, Object> row : subtaskAgg) {
      Integer pid = (Integer) row.get("parent_task_id");
      Integer cnt = ((Number) row.get("cnt")).intValue();
      subtaskCounts.put(pid, cnt);
    }

    // Dependencies (both directions) for blockedByIds/blockingIds
    List<Object> depParams = new ArrayList<>();
    depParams.addAll(ids);
    depParams.addAll(ids);
    List<Map<String, Object>> deps =
        jdbcTemplate.queryForList(
            "select id, task_id, depends_on_task_id, created_at "
                + "from task_dependencies "
                + "where task_id in ("
                + inIds
                + ") or depends_on_task_id in ("
                + inIds
                + ")",
            depParams.toArray());

    // Populate enriched fields
    for (Task t : tasks) {
      if (t.tags == null) t.tags = List.of();
      t.assignee = t.assigneeId != null ? userMap.getOrDefault(t.assigneeId, null) : null;
      t.reporter = userMap.getOrDefault(t.reporterId, null);
      t.subtaskCount = subtaskCounts.getOrDefault(t.id, 0);

      List<Integer> blockedBy = new ArrayList<>();
      List<Integer> blocking = new ArrayList<>();
      for (Map<String, Object> dep : deps) {
        Integer depTaskId = (Integer) dep.get("task_id");
        Integer depDependsOnId = (Integer) dep.get("depends_on_task_id");
        if (depTaskId.equals(t.id)) blockedBy.add(depDependsOnId);
        if (depDependsOnId.equals(t.id)) blocking.add(depTaskId);
      }
      t.blockedByIds = blockedBy;
      t.blockingIds = blocking;
    }

    return tasks;
  }
}

