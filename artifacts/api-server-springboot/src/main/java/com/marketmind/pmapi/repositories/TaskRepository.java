package com.marketmind.pmapi.repositories;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketmind.pmapi.models.DependsOnTask;
import com.marketmind.pmapi.models.Task;
import com.marketmind.pmapi.models.TaskDependency;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

@Repository
public class TaskRepository {
  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public TaskRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  private final RowMapper<Task> TASK_MAPPER = new RowMapper<Task>() {
    @Override
    public Task mapRow(ResultSet rs, int rowNum) throws SQLException {
      Task t = new Task();
      t.id = rs.getInt("id");
      t.title = rs.getString("title");
      t.description = rs.getString("description");
      t.status = rs.getString("status");
      t.priority = rs.getString("priority");
      t.projectId = rs.getInt("project_id");

      t.parentTaskId = (Integer) rs.getObject("parent_task_id");
      t.assigneeId = (Integer) rs.getObject("assignee_id");
      t.reporterId = rs.getInt("reporter_id");

      t.startDate = rs.getString("start_date");
      t.dueDate = rs.getString("due_date");
      t.estimatedHours = rs.getObject("estimated_hours") != null ? rs.getDouble("estimated_hours") : null;

      String tagsRaw = rs.getString("tags");
      if (tagsRaw == null || tagsRaw.isBlank()) {
        t.tags = List.of();
      } else {
        try {
          t.tags = objectMapper.readValue(tagsRaw, new TypeReference<List<String>>() {});
        } catch (Exception e) {
          t.tags = List.of();
        }
      }

      t.position = rs.getInt("position");
      // enriched later
      t.assignee = null;
      t.reporter = null;
      t.subtaskCount = 0;
      t.blockedByIds = new ArrayList<>();
      t.blockingIds = new ArrayList<>();

      t.createdAt = rs.getTimestamp("created_at").toInstant().toString();
      t.updatedAt = rs.getTimestamp("updated_at").toInstant().toString();
      return t;
    }
  };

  public List<Task> listTopLevelTasks(int projectId, String status, String priority) {
    StringBuilder sql = new StringBuilder(
        "select id,title,description,status,priority,project_id,parent_task_id,assignee_id,reporter_id,start_date,due_date,estimated_hours,tags,position,created_at,updated_at " +
            "from tasks where project_id = ? and parent_task_id is null"
    );
    List<Object> params = new ArrayList<>();
    params.add(projectId);

    if (status != null && !status.isBlank()) {
      // tasks.status is a PostgreSQL enum (task_status). Cast bound strings to the enum.
      sql.append(" and status = CAST(? AS task_status)");
      params.add(status);
    }
    if (priority != null && !priority.isBlank()) {
      // tasks.priority is a PostgreSQL enum (task_priority). Cast bound strings to the enum.
      sql.append(" and priority = CAST(? AS task_priority)");
      params.add(priority);
    }

    sql.append(" order by position, created_at");
    return jdbcTemplate.query(sql.toString(), TASK_MAPPER, params.toArray());
  }

  public List<Task> listSubtasks(int parentTaskId) {
    return jdbcTemplate.query(
        "select id,title,description,status,priority,project_id,parent_task_id,assignee_id,reporter_id,start_date,due_date,estimated_hours,tags,position,created_at,updated_at " +
            "from tasks where parent_task_id = ? order by position, created_at",
        TASK_MAPPER,
        parentTaskId
    );
  }

  public Optional<Task> getTask(int taskId) {
    List<Task> res = jdbcTemplate.query(
        "select id,title,description,status,priority,project_id,parent_task_id,assignee_id,reporter_id,start_date,due_date,estimated_hours,tags,position,created_at,updated_at " +
            "from tasks where id = ?",
        TASK_MAPPER,
        taskId
    );
    return res.isEmpty() ? Optional.empty() : Optional.of(res.get(0));
  }

  public Task createTask(int projectId, Map<String, Object> fields, int reporterId) {
    Integer maxPos = jdbcTemplate.queryForObject(
        "select coalesce(max(position), -1) from tasks where project_id = ?",
        Integer.class,
        projectId
    );
    int position = (maxPos != null ? maxPos : -1) + 1;

    String status = fields.getOrDefault("status", "todo").toString();
    String priority = fields.getOrDefault("priority", "medium").toString();

    String title = (String) fields.get("title");
    String description = (String) fields.get("description");

    Integer assigneeId = fields.get("assigneeId") instanceof Number ? ((Number) fields.get("assigneeId")).intValue() : null;
    String startDate = (String) fields.get("startDate");
    String dueDate = (String) fields.get("dueDate");
    Double estimatedHours = fields.get("estimatedHours") instanceof Number ? ((Number) fields.get("estimatedHours")).doubleValue() : null;

    @SuppressWarnings("unchecked")
    List<String> tags = fields.get("tags") instanceof List ? (List<String>) fields.get("tags") : List.of();
    String tagsJson;
    try {
      tagsJson = objectMapper.writeValueAsString(tags);
    } catch (Exception e) {
      tagsJson = "[]";
    }

    return jdbcTemplate.queryForObject(
        "insert into tasks (title, description, status, priority, project_id, assignee_id, reporter_id, parent_task_id, start_date, due_date, estimated_hours, tags, position) " +
            "values (?, ?, CAST(? AS task_status), CAST(? AS task_priority), ?, ?, ?, null, ?, ?, ?, ?::jsonb, ?) returning " +
            "id,title,description,status,priority,project_id,parent_task_id,assignee_id,reporter_id,start_date,due_date,estimated_hours,tags,position,created_at,updated_at",
        TASK_MAPPER,
        title,
        description,
        // tasks.status / tasks.priority are enums; cast string params to the enums.
        status,
        priority,
        projectId,
        assigneeId,
        reporterId,
        startDate,
        dueDate,
        estimatedHours,
        tagsJson,
        position
    );
  }

  public Optional<Task> updateTask(int taskId, Map<String, Object> fields) {
    // Minimal overwrite update; dynamic/partial update can be improved later.
    String sql =
        "update tasks set title = ?, description = ?, status = CAST(? AS task_status), priority = CAST(? AS task_priority), assignee_id = ?, start_date = ?, due_date = ?, estimated_hours = ?, tags = ?::jsonb, position = ?, updated_at = now() where id = ?";

    @SuppressWarnings("unchecked")
    List<String> tags = fields.get("tags") instanceof List ? (List<String>) fields.get("tags") : List.of();
    String tagsJson;
    try {
      tagsJson = objectMapper.writeValueAsString(tags);
    } catch (Exception e) {
      tagsJson = "[]";
    }

    String title = (String) fields.getOrDefault("title", null);
    String description = (String) fields.getOrDefault("description", null);
    String status = (String) fields.getOrDefault("status", null);
    String priority = (String) fields.getOrDefault("priority", null);
    Integer assigneeId = fields.get("assigneeId") instanceof Number ? ((Number) fields.get("assigneeId")).intValue() : null;
    String startDate = (String) fields.getOrDefault("startDate", null);
    String dueDate = (String) fields.getOrDefault("dueDate", null);
    Double estimatedHours = fields.get("estimatedHours") instanceof Number ? ((Number) fields.get("estimatedHours")).doubleValue() : null;
    Integer position = fields.get("position") instanceof Number ? ((Number) fields.get("position")).intValue() : 0;

    int updated = jdbcTemplate.update(
        sql,
        title,
        description,
        status,
        priority,
        assigneeId,
        startDate,
        dueDate,
        estimatedHours,
        tagsJson,
        position,
        taskId
    );

    if (updated == 0) return Optional.empty();
    return getTask(taskId);
  }

  public boolean deleteTask(int taskId) {
    return jdbcTemplate.update("delete from tasks where id = ?", taskId) > 0;
  }

  public Task createSubtask(int parentTaskId, Map<String, Object> fields, int reporterId) {
    Integer projectId = jdbcTemplate.queryForObject(
        "select project_id from tasks where id = ?",
        Integer.class,
        parentTaskId
    );
    if (projectId == null) throw new IllegalArgumentException("Parent task not found");

    String title = (String) fields.get("title");
    String status = fields.getOrDefault("status", "todo").toString();
    String priority = fields.getOrDefault("priority", "medium").toString();
    Integer assigneeId = fields.get("assigneeId") instanceof Number ? ((Number) fields.get("assigneeId")).intValue() : null;
    String dueDate = (String) fields.get("dueDate");

    return jdbcTemplate.queryForObject(
        "insert into tasks (title, description, status, priority, project_id, assignee_id, reporter_id, parent_task_id, due_date, tags, position, updated_at, created_at, start_date) " +
            "values (?, null, CAST(? AS task_status), CAST(? AS task_priority), ?, ?, ?, ?, ?, '[]'::jsonb, 0, now(), now(), null) returning " +
            "id,title,description,status,priority,project_id,parent_task_id,assignee_id,reporter_id,start_date,due_date,estimated_hours,tags,position,created_at,updated_at",
        TASK_MAPPER,
        title,
        status,
        priority,
        projectId,
        assigneeId,
        reporterId,
        parentTaskId,
        dueDate
    );
  }

  public List<TaskDependency> listDependencies(int taskId) {
    return jdbcTemplate.query(
        "select td.id, td.task_id, td.depends_on_task_id, td.created_at, t.id as dep_id, t.title as dep_title, t.status as dep_status " +
            "from task_dependencies td " +
            "left join tasks t on t.id = td.depends_on_task_id " +
            "where td.task_id = ? order by td.created_at",
        (rs, rowNum) -> {
          TaskDependency d = new TaskDependency();
          d.id = rs.getInt("id");
          d.taskId = rs.getInt("task_id");
          d.dependsOnTaskId = rs.getInt("depends_on_task_id");
          if (rs.getObject("dep_id") != null) {
            d.dependsOnTask = new DependsOnTask(rs.getInt("dep_id"), rs.getString("dep_title"), rs.getString("dep_status"));
          }
          d.createdAt = rs.getTimestamp("created_at").toInstant().toString();
          return d;
        },
        taskId
    );
  }

  public TaskDependency addDependency(int taskId, int dependsOnTaskId) {
    TaskDependency dep = jdbcTemplate.queryForObject(
        "insert into task_dependencies (task_id, depends_on_task_id) values (?, ?) returning id, task_id, depends_on_task_id, created_at",
        (rs, rowNum) -> {
          TaskDependency d = new TaskDependency();
          d.id = rs.getInt("id");
          d.taskId = rs.getInt("task_id");
          d.dependsOnTaskId = rs.getInt("depends_on_task_id");
          d.createdAt = rs.getTimestamp("created_at").toInstant().toString();
          return d;
        },
        taskId,
        dependsOnTaskId
    );

    // Fetch dependsOnTask details for client payload compatibility.
    List<Map<String, Object>> tasks = jdbcTemplate.queryForList(
        "select id, title, status from tasks where id = ?",
        dependsOnTaskId
    );
    if (!tasks.isEmpty()) {
      Map<String, Object> t = tasks.get(0);
      dep.dependsOnTask = new DependsOnTask(
          ((Number) t.get("id")).intValue(),
          (String) t.get("title"),
          (String) t.get("status")
      );
    }
    return dep;
  }

  public boolean dependencyExists(int taskId, int dependsOnTaskId) {
    Integer cnt = jdbcTemplate.queryForObject(
        "select count(*) from task_dependencies where task_id = ? and depends_on_task_id = ?",
        Integer.class,
        taskId,
        dependsOnTaskId
    );
    return cnt != null && cnt > 0;
  }

  public boolean removeDependency(int taskId, int dependsOnTaskId) {
    return jdbcTemplate.update(
        "delete from task_dependencies where task_id = ? and depends_on_task_id = ?",
        taskId,
        dependsOnTaskId
    ) > 0;
  }
}

