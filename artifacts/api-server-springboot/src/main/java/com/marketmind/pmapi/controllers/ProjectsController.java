package com.marketmind.pmapi.controllers;

import com.marketmind.pmapi.models.Project;
import com.marketmind.pmapi.repositories.ProjectRepository;
import com.marketmind.pmapi.security.BearerAuthInterceptor;
import com.marketmind.pmapi.services.OllamaClient;
import com.marketmind.pmapi.services.TeamUpdateEmailService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/projects")
public class ProjectsController {
  private final ProjectRepository projectRepository;
  private final OllamaClient ollamaClient;
  private final TeamUpdateEmailService teamUpdateEmailService;

  @org.springframework.beans.factory.annotation.Value("${PM_TOOL_BASE_URL:http://localhost:5173}")
  private String pmToolBaseUrl;

  public ProjectsController(
      ProjectRepository projectRepository,
      OllamaClient ollamaClient,
      TeamUpdateEmailService teamUpdateEmailService
  ) {
    this.projectRepository = projectRepository;
    this.ollamaClient = ollamaClient;
    this.teamUpdateEmailService = teamUpdateEmailService;
  }

  @GetMapping
  public List<Project> listProjects() {
    return projectRepository.listProjectsWithTaskCounts();
  }

  @PostMapping
  public ResponseEntity<?> createProject(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    Integer userId = (Integer) request.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
    }

    Project p = new Project();
    p.name = (String) body.get("name");
    p.description = (String) body.getOrDefault("description", null);
    p.color = (String) body.get("color");
    p.status = (String) body.getOrDefault("status", "active");
    p.startDate = (String) body.getOrDefault("startDate", null);
    p.endDate = (String) body.getOrDefault("endDate", null);

    Project created = projectRepository.createProject(p, userId);
    // Node returns taskCount/completedTaskCount = 0 for new projects
    created.taskCount = 0;
    created.completedTaskCount = 0;

    teamUpdateEmailService.sendTeamUpdateEmail(
        userId,
        "Project created: " + created.name,
        "A new project was created.",
        List.of("Project: " + created.name, "Status: " + created.status),
        pmToolBaseUrl + "/projects/" + created.id,
        "Open project"
    );

    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  /**
   * Rephrase a description before the project exists (create flow). Uses the same Ollama prompt as
   * {@link #rephraseDescription} but takes the working title from the request body.
   */
  @PostMapping("/rephrase-description")
  public ResponseEntity<?> rephraseDescriptionDraft(@RequestBody Map<String, Object> body) {
    Object nameObj = body.get("name");
    String name =
        nameObj instanceof String && !((String) nameObj).isBlank()
            ? ((String) nameObj).trim()
            : "Untitled project";

    Object dObj = body.get("description");
    String description = (dObj instanceof String) ? ((String) dObj).trim() : "";
    if (description.isBlank()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "description is required"));
    }

    try {
      String rewritten = ollamaClient.rephraseProjectDescription(name, description);
      return ResponseEntity.ok(Map.of("description", rewritten));
    } catch (Exception e) {
      String msg = e.getMessage();
      if (msg == null || msg.isBlank()) {
        msg = e.getClass().getSimpleName();
      }
      Map<String, String> err = new LinkedHashMap<>();
      err.put("error", "Failed to rephrase description");
      err.put("message", msg);
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(err);
    }
  }

  @GetMapping("/{projectId}")
  public ResponseEntity<?> getProject(@PathVariable int projectId) {
    Optional<Project> project = projectRepository.getProjectWithTaskCounts(projectId);
    return project.<ResponseEntity<?>>map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found")));
  }

  @PutMapping("/{projectId}")
  public ResponseEntity<?> updateProject(
      @PathVariable int projectId,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    Optional<Project> existingOpt = projectRepository.getProjectWithTaskCounts(projectId);
    if (existingOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found"));
    }
    Project existing = existingOpt.get();

    Project patch = new Project();
    patch.id = existing.id;
    patch.ownerId = existing.ownerId;
    patch.name = (String) (body.containsKey("name") ? body.get("name") : existing.name);
    patch.description = body.containsKey("description") ? (String) body.get("description") : existing.description;
    patch.color = (String) (body.containsKey("color") ? body.get("color") : existing.color);
    patch.status = (String) (body.containsKey("status") ? body.get("status") : existing.status);
    patch.startDate = body.containsKey("startDate") ? (String) body.get("startDate") : existing.startDate;
    patch.endDate = body.containsKey("endDate") ? (String) body.get("endDate") : existing.endDate;

    return projectRepository.updateProject(projectId, patch)
        .<ResponseEntity<?>>map(updated -> {
          teamUpdateEmailService.sendTeamUpdateEmail(
              userIdOrNull(request),
              "Project updated: " + updated.name,
              "A project was updated.",
              List.of("Project: " + updated.name, "Status: " + updated.status),
              pmToolBaseUrl + "/projects/" + updated.id,
              "Open project"
          );
          return ResponseEntity.ok(updated);
        })
        .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found")));
  }

  @DeleteMapping("/{projectId}")
  public ResponseEntity<?> deleteProject(@PathVariable int projectId, HttpServletRequest request) {
    // Node returns success first, then sends email async. We'll just return the success payload.
    projectRepository.deleteProject(projectId);

    Integer userId = (Integer) request.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
    if (userId != null) {
      teamUpdateEmailService.sendTeamUpdateEmail(
          userId,
          "Project deleted: #" + projectId,
          "A project was deleted.",
          List.of("Project ID: " + projectId),
          pmToolBaseUrl + "/projects",
          "View projects"
      );
    }
    return ResponseEntity.ok(Map.of("success", true, "message", "Project deleted"));
  }

  private Integer userIdOrNull(HttpServletRequest request) {
    Object o = request.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
    return (o instanceof Integer) ? (Integer) o : null;
  }

  @PostMapping("/{projectId}/rephrase-description")
  public ResponseEntity<?> rephraseDescription(
      @PathVariable int projectId,
      @RequestBody Map<String, Object> body
  ) {
    Optional<Project> projectOpt = projectRepository.getProjectWithTaskCounts(projectId);
    if (projectOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found"));
    }
    Project project = projectOpt.get();

    Object dObj = body.get("description");
    String description = (dObj instanceof String) ? ((String) dObj).trim() : "";
    if (description.isBlank()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "description is required"));
    }

    try {
      String rewritten = ollamaClient.rephraseProjectDescription(project.name, description);
      return ResponseEntity.ok(Map.of("description", rewritten));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
          .body(Map.of("error", "Failed to rephrase description", "message", e.getMessage()));
    }
  }
}

