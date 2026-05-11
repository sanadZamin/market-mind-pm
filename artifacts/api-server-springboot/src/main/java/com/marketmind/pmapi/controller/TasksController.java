package com.marketmind.pmapi.controller;

import com.marketmind.pmapi.model.Task;
import com.marketmind.pmapi.model.TaskDependency;
import com.marketmind.pmapi.repository.TaskRepository;
import com.marketmind.pmapi.config.BearerAuthInterceptor;
import com.marketmind.pmapi.config.PmToolProperties;
import com.marketmind.pmapi.service.TaskChangeDetector;
import com.marketmind.pmapi.service.TaskEnrichmentService;
import com.marketmind.pmapi.service.TaskUpdateChangeDescription;
import com.marketmind.pmapi.service.OllamaClient;
import com.marketmind.pmapi.service.TeamUpdateEmailDedupeService;
import com.marketmind.pmapi.service.TeamUpdateEmailService;
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
  private final TeamUpdateEmailDedupeService teamUpdateEmailDedupeService;
  private final PmToolProperties pmToolProperties;
  private final OllamaClient ollamaClient;

  public TasksController(
      TaskRepository taskRepository,
      TaskEnrichmentService taskEnrichmentService,
      TeamUpdateEmailService teamUpdateEmailService,
      TeamUpdateEmailDedupeService teamUpdateEmailDedupeService,
      PmToolProperties pmToolProperties,
      OllamaClient ollamaClient
  ) {
    this.taskRepository = taskRepository;
    this.taskEnrichmentService = taskEnrichmentService;
    this.teamUpdateEmailService = teamUpdateEmailService;
    this.teamUpdateEmailDedupeService = teamUpdateEmailDedupeService;
    this.pmToolProperties = pmToolProperties;
    this.ollamaClient = ollamaClient;
  }

  /** SPA opens the task sheet when the URL contains {@code ?taskId=}. */
  private String taskDeepLinkOrProjects(int taskId) {
    return taskRepository
        .getTask(taskId)
        .map(t -> pmToolProperties.getBaseUrl() + "/projects/" + t.projectId + "?taskId=" + taskId)
        .orElse(pmToolProperties.getBaseUrl() + "/projects");
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
        pmToolProperties.getBaseUrl() + "/projects/" + projectId + "?taskId=" + enriched.get(0).id,
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
    if (userId != null
        && TaskChangeDetector.mergedFieldsChangeTask(existing, fields)
        && teamUpdateEmailDedupeService.allowSamePayloadWithinWindow(taskId, userId, fields)) {
      List<Task> enrichedBefore = taskEnrichmentService.enrichTasks(List.of(existing));
      List<String> detailLines =
          TaskUpdateChangeDescription.describeChanges(enrichedBefore.get(0), enriched.get(0));
      teamUpdateEmailService.sendTeamUpdateEmail(
          userId,
          "Task updated: " + enriched.get(0).title,
          "A task was updated.",
          detailLines,
          pmToolProperties.getBaseUrl() + "/projects/" + enriched.get(0).projectId + "?taskId=" + enriched.get(0).id,
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
            pmToolProperties.getBaseUrl() + "/projects/" + t.projectId,
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
        pmToolProperties.getBaseUrl() + "/projects/" + enriched.get(0).projectId + "?taskId=" + enriched.get(0).id,
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
          taskDeepLinkOrProjects(taskId),
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
          taskDeepLinkOrProjects(taskId),
          "Open task"
      );
    }
    return ResponseEntity.ok(Map.of("success", true, "message", "Dependency removed"));
  }

  /** Rephrase task body text using Ollama (same stack as project description rephrase). */
  @PostMapping("/tasks/{taskId}/rephrase-description")
  public ResponseEntity<?> rephraseTaskDescriptionForExisting(
      @PathVariable int taskId,
      @RequestBody Map<String, Object> body
  ) {
    Optional<Task> taskOpt = taskRepository.getTask(taskId);
    if (taskOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found"));
    }
    Task task = taskOpt.get();
    Object dObj = body.get("description");
    String description = (dObj instanceof String) ? ((String) dObj).trim() : "";
    if (description.isBlank()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "description is required"));
    }
    try {
      String rewritten = ollamaClient.rephraseTaskDescription(task.title, description);
      return ResponseEntity.ok(Map.of("description", rewritten));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
          .body(Map.of("error", "Failed to rephrase description", "message", e.getMessage()));
    }
  }

  /** Rephrase description for the create-task dialog (no task id yet); uses working title from the body. */
  @PostMapping("/projects/{projectId}/tasks/rephrase-description")
  public ResponseEntity<?> rephraseTaskDescriptionDraft(
      @SuppressWarnings("unused") @PathVariable int projectId,
      @RequestBody Map<String, Object> body
  ) {
    Object titleObj = body.get("title");
    String title =
        titleObj instanceof String && !((String) titleObj).isBlank()
            ? ((String) titleObj).trim()
            : "Untitled task";
    Object dObj = body.get("description");
    String description = (dObj instanceof String) ? ((String) dObj).trim() : "";
    if (description.isBlank()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "description is required"));
    }
    try {
      String rewritten = ollamaClient.rephraseTaskDescription(title, description);
      return ResponseEntity.ok(Map.of("description", rewritten));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
          .body(Map.of("error", "Failed to rephrase description", "message", e.getMessage()));
    }
  }
}

