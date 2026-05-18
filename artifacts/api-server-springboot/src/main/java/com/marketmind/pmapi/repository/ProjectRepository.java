package com.marketmind.pmapi.repository;

import com.marketmind.pmapi.model.Project;
import com.marketmind.pmapi.util.IsoTimestamps;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class ProjectRepository {
  private final JdbcTemplate jdbcTemplate;

  public ProjectRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  private static final RowMapper<Project> PROJECT_MAPPER = (rs, rowNum) -> {
    Project p = new Project();
    p.id = rs.getInt("id");
    p.name = rs.getString("name");
    p.description = rs.getString("description");
    p.color = rs.getString("color");
    p.status = rs.getString("status");
    p.ownerId = rs.getInt("owner_id");
    p.startDate = rs.getString("start_date");
    p.endDate = rs.getString("end_date");
    p.createdAt = IsoTimestamps.fromSqlTimestamp(rs.getTimestamp("created_at"));
    p.updatedAt = IsoTimestamps.fromSqlTimestamp(rs.getTimestamp("updated_at"));
    // counts are set by enrichment
    p.taskCount = 0;
    p.completedTaskCount = 0;
    return p;
  };

  public List<Project> listProjectsWithTaskCounts() {
    List<Project> projects = jdbcTemplate.query(
        "select id, name, description, color, status, owner_id, start_date, end_date, created_at, updated_at from projects",
        PROJECT_MAPPER
    );

    for (Project p : projects) {
      Integer taskCount = jdbcTemplate.queryForObject(
          "select count(*) from tasks where project_id = ?",
          Integer.class,
          p.id
      );
      Integer completedCount = jdbcTemplate.queryForObject(
          "select count(*) from tasks where project_id = ? and status = 'done'",
          Integer.class,
          p.id
      );
      p.taskCount = taskCount != null ? taskCount : 0;
      p.completedTaskCount = completedCount != null ? completedCount : 0;
    }
    return projects;
  }

  public Optional<Project> getProjectWithTaskCounts(int projectId) {
    List<Project> results = jdbcTemplate.query(
        "select id, name, description, color, status, owner_id, start_date, end_date, created_at, updated_at from projects where id = ?",
        PROJECT_MAPPER,
        projectId
    );
    if (results.isEmpty()) return Optional.empty();
    Project p = results.get(0);
    Integer taskCount = jdbcTemplate.queryForObject(
        "select count(*) from tasks where project_id = ?",
        Integer.class,
        p.id
    );
    Integer completedCount = jdbcTemplate.queryForObject(
        "select count(*) from tasks where project_id = ? and status = 'done'",
        Integer.class,
        p.id
    );
    p.taskCount = taskCount != null ? taskCount : 0;
    p.completedTaskCount = completedCount != null ? completedCount : 0;
    return Optional.of(p);
  }

  public Project createProject(Project toCreate, int ownerId) {
    return jdbcTemplate.queryForObject(
        "insert into projects (name, description, color, status, owner_id, start_date, end_date) values (?, ?, ?, CAST(? AS project_status), ?, ?, ?) returning " +
            "id, name, description, color, status, owner_id, start_date, end_date, created_at, updated_at",
        PROJECT_MAPPER,
        toCreate.name,
        toCreate.description,
        toCreate.color,
        // projects.status is a PostgreSQL enum (project_status). Cast the bound string to the enum.
        toCreate.status,
        ownerId,
        toCreate.startDate,
        toCreate.endDate
    );
  }

  public Optional<Project> updateProject(int projectId, Project patch) {
    // Minimal implementation: overwrite provided fields, keep the rest as-is if caller sets them explicitly.
    // Higher-fidelity “partial update” can be implemented later by building dynamic SQL.
    int updated = jdbcTemplate.update(
        "update projects set name = ?, description = ?, color = ?, status = CAST(? AS project_status), start_date = ?, end_date = ?, updated_at = now() where id = ?",
        patch.name,
        patch.description,
        patch.color,
        patch.status,
        patch.startDate,
        patch.endDate,
        projectId
    );
    if (updated == 0) return Optional.empty();
    return getProjectWithTaskCounts(projectId);
  }

  public boolean deleteProject(int projectId) {
    return jdbcTemplate.update("delete from projects where id = ?", projectId) > 0;
  }
}

