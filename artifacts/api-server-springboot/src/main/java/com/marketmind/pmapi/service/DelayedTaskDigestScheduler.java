package com.marketmind.pmapi.service;

import com.marketmind.pmapi.config.PmToolProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DelayedTaskDigestScheduler {
  private static final Logger log = LoggerFactory.getLogger(DelayedTaskDigestScheduler.class);

  private final JdbcTemplate jdbcTemplate;
  private final TeamUpdateEmailService teamUpdateEmailService;
  private final PmToolProperties pmToolProperties;

  @Value("${pm.delayed-task-digest.enabled:true}")
  private boolean enabled;

  public DelayedTaskDigestScheduler(
      JdbcTemplate jdbcTemplate,
      TeamUpdateEmailService teamUpdateEmailService,
      PmToolProperties pmToolProperties
  ) {
    this.jdbcTemplate = jdbcTemplate;
    this.teamUpdateEmailService = teamUpdateEmailService;
    this.pmToolProperties = pmToolProperties;
  }

  /**
   * Runs once daily at midnight by default.
   * Override via:
   * - pm.delayed-task-digest.cron
   * - pm.delayed-task-digest.zone
   */
  @Scheduled(
      cron = "${pm.delayed-task-digest.cron:0 0 0 * * *}",
      zone = "${pm.delayed-task-digest.zone:UTC}"
  )
  public void sendDelayedTasksDigest() {
    if (!enabled) return;

    List<DelayedTaskRow> rows = jdbcTemplate.query(
        "select t.id, t.title, t.project_id, t.due_date, t.status, p.name as project_name " +
            "from tasks t " +
            "left join projects p on p.id = t.project_id " +
            "where t.status <> CAST('done' AS task_status) " +
            "and t.due_date is not null and t.due_date <> '' " +
            "order by t.due_date asc, t.id asc",
        (rs, rowNum) -> new DelayedTaskRow(
            rs.getInt("id"),
            rs.getString("title"),
            rs.getInt("project_id"),
            rs.getString("project_name"),
            rs.getString("due_date"),
            rs.getString("status")
        )
    );

    LocalDate today = LocalDate.now();
    List<DelayedTaskRow> delayed = new ArrayList<>();
    for (DelayedTaskRow r : rows) {
      LocalDate due = parseTaskDueDate(r.dueDate());
      if (due != null && due.isBefore(today)) {
        delayed.add(r);
      }
    }

    if (delayed.isEmpty()) {
      // Nothing delayed now; clear state so future delays can notify again.
      jdbcTemplate.update("delete from delayed_task_digest_state");
      log.info("Delayed-task digest: no delayed tasks found");
      return;
    }

    // Drop rows for tasks no longer delayed so they can notify again if they become delayed later.
    String idCsv = delayed.stream()
        .map(r -> String.valueOf(r.id()))
        .collect(Collectors.joining(","));
    jdbcTemplate.update("delete from delayed_task_digest_state where task_id not in (" + idCsv + ")");

    Map<Integer, String> previousSignatures = jdbcTemplate.query(
        "select task_id, signature from delayed_task_digest_state where task_id in (" + idCsv + ")",
        rs -> {
          java.util.HashMap<Integer, String> m = new java.util.HashMap<>();
          while (rs.next()) {
            m.put(rs.getInt("task_id"), rs.getString("signature"));
          }
          return m;
        }
    );

    List<DelayedTaskRow> toNotify = new ArrayList<>();
    for (DelayedTaskRow row : delayed) {
      String sig = signatureFor(row);
      String prev = previousSignatures.get(row.id());
      if (!sig.equals(prev)) {
        toNotify.add(row);
      }
    }

    if (toNotify.isEmpty()) {
      log.info("Delayed-task digest: all delayed tasks already notified for current due/status signature");
      return;
    }

    Integer actorUserId = pickActorUserId();
    if (actorUserId == null) {
      log.warn("Delayed-task digest skipped: no users available to attribute email actor");
      return;
    }

    List<String> details = new ArrayList<>();
    for (DelayedTaskRow r : toNotify) {
      String taskTitle = (r.title() == null || r.title().isBlank()) ? "(untitled)" : r.title().trim();
      String projectName = (r.projectName() == null || r.projectName().isBlank()) ? ("Project #" + r.projectId()) : r.projectName().trim();
      details.add(
          String.format(
              "%s — %s (due %s): %s",
              projectName,
              taskTitle,
              fmtDate(r.dueDate()),
              pmToolProperties.getBaseUrl() + "/projects/" + r.projectId() + "?taskId=" + r.id()
          )
      );
    }

    teamUpdateEmailService.sendTeamUpdateEmail(
        actorUserId,
        "Daily delayed tasks digest: " + toNotify.size() + " delayed",
        "Daily scan found delayed tasks that need attention.",
        details,
        pmToolProperties.getBaseUrl() + "/dashboard",
        "Open dashboard"
    );

    for (DelayedTaskRow row : toNotify) {
      jdbcTemplate.update(
          "insert into delayed_task_digest_state (task_id, signature, notified_at) values (?, ?, now()) " +
              "on conflict (task_id) do update set signature = excluded.signature, notified_at = now()",
          row.id(),
          signatureFor(row)
      );
    }

    log.info("Delayed-task digest sent: newCount={} delayedNow={}", toNotify.size(), delayed.size());
  }

  private Integer pickActorUserId() {
    List<Integer> ids = jdbcTemplate.queryForList(
        "select id from users order by case when role = CAST('admin' AS user_role) then 0 else 1 end, id asc limit 1",
        Integer.class
    );
    return ids.isEmpty() ? null : ids.get(0);
  }

  private static LocalDate parseTaskDueDate(String raw) {
    if (raw == null || raw.isBlank()) return null;
    String value = raw.trim();
    try {
      if (value.length() >= 10) {
        return LocalDate.parse(value.substring(0, 10));
      }
    } catch (Exception ignored) {
      // fallback below
    }
    try {
      return OffsetDateTime.parse(value).toLocalDate();
    } catch (Exception ignored) {
      return null;
    }
  }

  private static String fmtDate(String raw) {
    LocalDate d = parseTaskDueDate(raw);
    return d == null ? "unknown" : d.toString();
  }

  private static String signatureFor(DelayedTaskRow row) {
    // Re-notify only when this changes (or when state row is removed because task is no longer delayed).
    return fmtDate(row.dueDate()) + "|" + row.status();
  }

  private record DelayedTaskRow(
      int id,
      String title,
      int projectId,
      String projectName,
      String dueDate,
      String status
  ) {}
}
