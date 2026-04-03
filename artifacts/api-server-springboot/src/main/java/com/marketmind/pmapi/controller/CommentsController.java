package com.marketmind.pmapi.controller;

import com.marketmind.pmapi.model.Comment;
import com.marketmind.pmapi.repository.CommentRepository;
import com.marketmind.pmapi.config.BearerAuthInterceptor;
import com.marketmind.pmapi.service.TeamUpdateEmailService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
public class CommentsController {
  private final CommentRepository commentRepository;
  private final TeamUpdateEmailService teamUpdateEmailService;

  @org.springframework.beans.factory.annotation.Value("${PM_TOOL_BASE_URL:http://localhost:5173}")
  private String pmToolBaseUrl;

  public CommentsController(CommentRepository commentRepository, TeamUpdateEmailService teamUpdateEmailService) {
    this.commentRepository = commentRepository;
    this.teamUpdateEmailService = teamUpdateEmailService;
  }

  private int requireUserId(HttpServletRequest request) {
    Object userIdObj = request.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
    if (!(userIdObj instanceof Integer)) {
      throw new IllegalStateException("Unauthorized");
    }
    return (Integer) userIdObj;
  }

  @GetMapping("/tasks/{taskId}/comments")
  public List<Comment> listComments(@PathVariable int taskId) {
    return commentRepository.listCommentsForTask(taskId);
  }

  @PostMapping("/tasks/{taskId}/comments")
  public ResponseEntity<?> createComment(
      @PathVariable int taskId,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    int userId = requireUserId(request);
    Object contentObj = body.get("content");
    String content = (contentObj instanceof String) ? (String) contentObj : null;
    if (content == null || content.isBlank()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Bad request", "message", "content is required"));
    }

    Optional<Comment> created = commentRepository.createComment(taskId, userId, content.trim());
    if (created.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found"));
    }

    teamUpdateEmailService.sendTeamUpdateEmail(
        userId,
        "New comment on task #" + taskId,
        "A comment was added to a task.",
        List.of("Task ID: " + taskId),
        pmToolBaseUrl + "/projects",
        "Open project"
    );

    return ResponseEntity.status(HttpStatus.CREATED).body(created.get());
  }
}

