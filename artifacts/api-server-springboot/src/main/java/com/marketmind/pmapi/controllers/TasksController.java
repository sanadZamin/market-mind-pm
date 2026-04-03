package com.marketmind.pmapi.controllers;

import com.marketmind.pmapi.models.Task;
import com.marketmind.pmapi.models.TaskDependency;
import com.marketmind.pmapi.repositories.TaskRepository;
import com.marketmind.pmapi.security.BearerAuthInterceptor;
import com.marketmind.pmapi.services.TaskEnrichmentService;
import com.marketmind.pmapi.services.TeamUpdateEmailService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
public class TasksController {
  private final TaskRepository taskRepository;
  private final TaskEnrichmentService taskEnrichmentService;
  private final TeamUpdateEmailService teamUpdateEmailService;

  @org.springframework.beans.factory.annotation.Value("${PM_TOOL_BASE_URL:http://localhost:5173}")
  private String pmToolBaseUrl;

  public TasksController(
      TaskRepository taskRepository,
      TaskEnrichmentService taskEnrichmentService,
      TeamUpdateEmailService teamUpdateEmailService
  ) {
    this.taskRepository = taskRepository;
    this.taskEnrichmentService = taskEnrichmentService;
    this.teamUpdateEmailService = teamUpdateEmailService;
  }

  private int requireUserId(HttpServletRequest request) {
    Object userIdObj = request.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
    if (!(userIdObj instanceof Integer)) {
      throw new IllegalStateException("Unauthorized");
    }
    return (Integer) userIdObj;
  }

  private static Integer asNullableInteger(Object v) {
    if (v == null) return null;
    if (v instanceof Integer) return (Integer) v;
    if (v instanceof Number) return ((Number) v).intValue();
    return null;
  }

  private static Double asNullableDouble(Object v) {
    if (v == null) return null;
    if (v instanceof Double) return (Double) v;
    if (v instanceof Number) return ((Number) v).doubleValue();
    return null;
  }

  @GetMapping("/projects/{projectId}/tasks")
  public ResponseEntity<?> listTasks(
      @PathVariable int projectId,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String priority
  ) {
    List<Task> tasks = taskRepository.listTopLevelTasks(projectId, status, priority);
    return ResponseEntity.ok(taskEnrichmentService.enrichTasks(tasks));
  }

  @PostMapping("/projects/{projectId}/tasks")
  public ResponseEntity<?> createTask(
      @PathVariable int projectId,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    int userId = requireUserId(request);

    Map<String, Object> fields = new java.util.HashMap<>();
    fields.put("title", body.get("title"));
    fields.put("description", body.get("description"));
    fields.put("status", body.getOrDefault("status", "todo"));
    fields.put("priority", body.getOrDefault("priority", "medium"));
    fields.put("assigneeId", asNullableInteger(body.get("assigneeId")));
    fields.put("startDate", body.get("startDate"));
    fields.put("dueDate", body.get("dueDate"));
    fields.put("estimatedHours", asNullableDouble(body.get("estimatedHours")));
    fields.put("tags", body.getOrDefault("tags", List.of()));

    Task created = taskRepository.createTask(projectId, fields, userId);
    List<Task> enriched = taskEnrichmentService.enrichTasks(List.of(created));

    teamUpdateEmailService.sendTeamUpdateEmail(
        userId,
        "Task created: " + enriched.get(0).title,
        "A task was created.",
        List.of("Task: " + enriched.get(0).title, "Project ID: " + projectId),
        pmToolBaseUrl + "/projects/" + projectId + "?taskId=" + enriched.get(0).id,
        "Open task"
    );

    return ResponseEntity.status(HttpStatus.CREATED).body(enriched.get(0));
  }

  @GetMapping("/tasks/{taskId}")
  public ResponseEntity<?> getTask(@PathVariable int taskId) {
    Optional<Task> taskOpt = taskRepository.getTask(taskId);
    if (taskOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found"));
    }
    List<Task> enriched = taskEnrichmentService.enrichTasks(List.of(taskOpt.get()));
    return ResponseEntity.ok(enriched.get(0));
  }

  @PutMapping("/tasks/{taskId}")
  public ResponseEntity<?> updateTask(
      @PathVariable int taskId,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    Optional<Task> existingOpt = taskRepository.getTask(taskId);
    if (existingOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found"));
    }
    Task existing = existingOpt.get();

    Map<String, Object> fields = new java.util.HashMap<>();
    fields.put("title", body.containsKey("title") ? body.get("title") : existing.title);
    fields.put("description", body.containsKey("description") ? body.get("description") : existing.description);
    fields.put("status", body.containsKey("status") ? body.get("status") : existing.status);
    fields.put("priority", body.containsKey("priority") ? body.get("priority") : existing.priority);
    fields.put("assigneeId", body.containsKey("assigneeId") ? asNullableInteger(body.get("assigneeId")) : existing.assigneeId);
    fields.put("startDate", body.containsKey("startDate") ? body.get("startDate") : existing.startDate);
    fields.put("dueDate", body.containsKey("dueDate") ? body.get("dueDate") : existing.dueDate);
    fields.put("estimatedHours", body.containsKey("estimatedHours") ? asNullableDouble(body.get("estimatedHours")) : existing.estimatedHours);
    fields.put("tags", body.containsKey("tags") ? body.get("tags") : existing.tags);
    fields.put("position", body.containsKey("position") ? asNullableInteger(body.get("position")) : existing.position);

    Optional<Task> updatedOpt = taskRepository.updateTask(taskId, fields);
    if (updatedOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found"));
    }
    List<Task> enriched = taskEnrichmentService.enrichTasks(List.of(updatedOpt.get()));

    Integer userId = (Integer) request.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
    if (userId != null) {
      teamUpdateEmailService.sendTeamUpdateEmail(
          userId,
          "Task updated: " + enriched.get(0).title,
          "A task was updated.",
          List.of("Task: " + enriched.get(0).title, "Status: " + enriched.get(0).status),
          pmToolBaseUrl + "/projects/" + enriched.get(0).projectId + "?taskId=" + enriched.get(0).id,
          "Open task"
      );
    }
    return ResponseEntity.ok(enriched.get(0));
  }

  @DeleteMapping("/tasks/{taskId}")
  public ResponseEntity<?> deleteTask(@PathVariable int taskId, HttpServletRequest request) {
    Optional<Task> before = taskRepository.getTask(taskId);
    taskRepository.deleteTask(taskId);
    if (before.isPresent()) {
      Object userIdObj = request.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
      if (userIdObj instanceof Integer) {
        int userId = (Integer) userIdObj;
        Task t = before.get();
        teamUpdateEmailService.sendTeamUpdateEmail(
            userId,
            "Task deleted: " + t.title,
            "A task was deleted.",
            List.of("Task ID: " + taskId, "Project ID: " + t.projectId),
            pmToolBaseUrl + "/projects/" + t.projectId,
            "Open project"
        );
      }
    }
    return ResponseEntity.ok(Map.of("success", true, "message", "Task deleted"));
  }

  @GetMapping("/tasks/{taskId}/subtasks")
  public ResponseEntity<?> listSubtasks(@PathVariable int taskId) {
    List<Task> subtasks = taskRepository.listSubtasks(taskId);
    return ResponseEntity.ok(taskEnrichmentService.enrichTasks(subtasks));
  }

  @PostMapping("/tasks/{taskId}/subtasks")
  public ResponseEntity<?> createSubtask(
      @PathVariable int taskId,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    int userId = requireUserId(request);
    Map<String, Object> fields = new java.util.HashMap<>();
    fields.put("title", body.get("title"));
    fields.put("status", body.getOrDefault("status", "todo"));
    fields.put("priority", body.getOrDefault("priority", "medium"));
    fields.put("assigneeId", asNullableInteger(body.get("assigneeId")));
    fields.put("dueDate", body.get("dueDate"));

    Task created = taskRepository.createSubtask(taskId, fields, userId);
    List<Task> enriched = taskEnrichmentService.enrichTasks(List.of(created));

    teamUpdateEmailService.sendTeamUpdateEmail(
        userId,
        "Subtask created: " + enriched.get(0).title,
        "A subtask was created.",
        List.of("Subtask: " + enriched.get(0).title, "Parent task ID: " + taskId),
        pmToolBaseUrl + "/projects/" + enriched.get(0).projectId + "?taskId=" + enriched.get(0).id,
        "Open subtask"
    );

    return ResponseEntity.status(HttpStatus.CREATED).body(enriched.get(0));
  }

  @GetMapping("/tasks/{taskId}/dependencies")
  public ResponseEntity<?> listDependencies(@PathVariable int taskId) {
    return ResponseEntity.ok(taskRepository.listDependencies(taskId));
  }

  @PostMapping("/tasks/{taskId}/dependencies")
  public ResponseEntity<?> addDependency(
      @PathVariable int taskId,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    Integer dependsOnTaskId = asNullableInteger(body.get("dependsOnTaskId"));
    if (dependsOnTaskId == null || dependsOnTaskId == taskId) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid dependsOnTaskId"));
    }

    if (taskRepository.dependencyExists(taskId, dependsOnTaskId)) {
      return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Dependency already exists"));
    }

    TaskDependency created = taskRepository.addDependency(taskId, dependsOnTaskId);

    Integer userId = (Integer) request.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
    if (userId != null) {
      teamUpdateEmailService.sendTeamUpdateEmail(
          userId,
          "Dependency added to task #" + taskId,
          "A task dependency was added.",
          List.of("Task ID: " + taskId, "Blocked by task ID: " + dependsOnTaskId),
          pmToolBaseUrl + "/projects",
          "Open task"
      );
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  @DeleteMapping("/tasks/{taskId}/dependencies/{dependsOnId}")
  public ResponseEntity<?> removeDependency(
      @PathVariable int taskId,
      @PathVariable int dependsOnId,
      HttpServletRequest request
  ) {
    taskRepository.removeDependency(taskId, dependsOnId);
    Object userIdObj = request.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
    if (userIdObj instanceof Integer) {
      int userId = (Integer) userIdObj;
      teamUpdateEmailService.sendTeamUpdateEmail(
          userId,
          "Dependency removed from task #" + taskId,
          "A task dependency was removed.",
          List.of("Task ID: " + taskId, "Removed blocker task ID: " + dependsOnId),
          pmToolBaseUrl + "/projects",
          "Open project"
      );
    }
    return ResponseEntity.ok(Map.of("success", true, "message", "Dependency removed"));
  }
}

