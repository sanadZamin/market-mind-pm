package com.marketmind.pmapi.service;

import com.marketmind.pmapi.model.Task;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Detects whether a merged task update actually changes persisted state and builds stable signatures
 * for deduplicating identical notifications (e.g. double PUT from the client).
 */
public final class TaskChangeDetector {

  private TaskChangeDetector() {}

  /** {@code true} if {@code fields} differs from {@code existing} in any compared column. */
  public static boolean mergedFieldsChangeTask(Task existing, Map<String, Object> fields) {
    if (!Objects.equals(fields.get("title"), existing.title)) return true;
    if (!Objects.equals(fields.get("description"), existing.description)) return true;
    if (!Objects.equals(fields.get("status"), existing.status)) return true;
    if (!Objects.equals(fields.get("priority"), existing.priority)) return true;

    Integer assigneeId = fields.get("assigneeId") instanceof Number ? ((Number) fields.get("assigneeId")).intValue() : null;
    if (!Objects.equals(assigneeId, existing.assigneeId)) return true;

    if (!Objects.equals(fields.get("startDate"), existing.startDate)) return true;
    if (!Objects.equals(fields.get("dueDate"), existing.dueDate)) return true;

    Double eh = fields.get("estimatedHours") instanceof Number ? ((Number) fields.get("estimatedHours")).doubleValue() : null;
    if (!Objects.equals(eh, existing.estimatedHours)) return true;

    int mergedPos =
        fields.get("position") instanceof Number
            ? ((Number) fields.get("position")).intValue()
            : existing.position;
    if (mergedPos != existing.position) return true;

    @SuppressWarnings("unchecked")
    List<String> tagFields =
        fields.get("tags") instanceof List ? (List<String>) fields.get("tags") : List.of();
    List<String> existingTags = existing.tags != null ? existing.tags : List.of();
    return !tagFields.equals(existingTags);
  }

  /** Stable string for dedupe keys (same logical update → same signature). */
  public static String stableSignature(Map<String, Object> fields) {
    return String.valueOf(fields.get("title"))
        + "|"
        + String.valueOf(fields.get("description"))
        + "|"
        + String.valueOf(fields.get("status"))
        + "|"
        + String.valueOf(fields.get("priority"))
        + "|"
        + String.valueOf(fields.get("assigneeId"))
        + "|"
        + String.valueOf(fields.get("startDate"))
        + "|"
        + String.valueOf(fields.get("dueDate"))
        + "|"
        + String.valueOf(fields.get("estimatedHours"))
        + "|"
        + String.valueOf(fields.get("position"))
        + "|"
        + String.valueOf(fields.get("tags"));
  }
}
