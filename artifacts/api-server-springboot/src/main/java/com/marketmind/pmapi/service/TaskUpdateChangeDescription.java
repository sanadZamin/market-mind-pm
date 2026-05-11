package com.marketmind.pmapi.service;

import com.marketmind.pmapi.model.Task;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Builds human-readable bullet lines for team emails by diffing task state before vs after an update.
 * Expects {@link Task} instances from {@link TaskEnrichmentService} so assignee names are available.
 */
public final class TaskUpdateChangeDescription {

  private TaskUpdateChangeDescription() {}

  public static List<String> describeChanges(Task before, Task after) {
    List<String> lines = new ArrayList<>();
    lines.add("Task: " + (after.title != null ? after.title : "(untitled)"));

    if (!Objects.equals(before.title, after.title)) {
      lines.add(changeLine("Title", before.title, after.title));
    }
    if (!sameText(before.description, after.description)) {
      lines.add(
          changeLine(
              "Description",
              shorten(before.description, 48),
              shorten(after.description, 48)));
    }
    if (!Objects.equals(before.status, after.status)) {
      lines.add(changeLine("Status", humanEnum(before.status), humanEnum(after.status)));
    }
    if (!Objects.equals(before.priority, after.priority)) {
      lines.add(changeLine("Priority", humanEnum(before.priority), humanEnum(after.priority)));
    }
    if (!Objects.equals(before.assigneeId, after.assigneeId)) {
      lines.add(changeLine("Owner", formatAssignee(before), formatAssignee(after)));
    }
    if (!Objects.equals(before.startDate, after.startDate)) {
      lines.add(changeLine("Start date", fmtDate(before.startDate), fmtDate(after.startDate)));
    }
    if (!Objects.equals(before.dueDate, after.dueDate)) {
      lines.add(changeLine("Due date", fmtDate(before.dueDate), fmtDate(after.dueDate)));
    }
    if (!hoursEqual(before.estimatedHours, after.estimatedHours)) {
      lines.add(changeLine("Estimated hours", fmtHours(before.estimatedHours), fmtHours(after.estimatedHours)));
    }
    if (!tagsEqual(before.tags, after.tags)) {
      lines.add(changeLine("Tags", fmtTags(before.tags), fmtTags(after.tags)));
    }
    if (before.position != after.position) {
      lines.add(changeLine("Position", String.valueOf(before.position), String.valueOf(after.position)));
    }

    if (lines.size() == 1) {
      lines.add("Updates applied — open the task in the app for full details.");
    }
    return lines;
  }

  private static boolean sameText(String a, String b) {
    return Objects.equals(trim(a), trim(b));
  }

  private static String trim(String s) {
    return s == null ? "" : s.trim();
  }

  private static String shorten(String s, int max) {
    if (s == null) return "";
    String t = s.trim().replaceAll("\\s+", " ");
    if (t.length() <= max) return t.isEmpty() ? "(empty)" : t;
    return t.substring(0, max) + "…";
  }

  private static String changeLine(String label, String beforeDisp, String afterDisp) {
    String b = displayOrNone(beforeDisp);
    String a = displayOrNone(afterDisp);
    return label + ": " + a + " (was " + b + ")";
  }

  private static String displayOrNone(String v) {
    if (v == null || v.isBlank()) return "none";
    return v;
  }

  private static String fmtDate(String iso) {
    if (iso == null || iso.isBlank()) return "none";
    String s = iso.trim();
    return s.length() >= 10 ? s.substring(0, 10) : s;
  }

  private static String fmtHours(Double h) {
    if (h == null) return "none";
    double x = h;
    if (x == Math.rint(x)) return String.valueOf((long) x);
    return String.valueOf(h);
  }

  private static boolean hoursEqual(Double a, Double b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return Double.compare(a, b) == 0;
  }

  private static String fmtTags(List<String> tags) {
    if (tags == null || tags.isEmpty()) return "none";
    return String.join(", ", tags);
  }

  private static boolean tagsEqual(List<String> a, List<String> b) {
    if (a == null || a.isEmpty()) return b == null || b.isEmpty();
    if (b == null || b.isEmpty()) return false;
    ArrayList<String> x = new ArrayList<>(a);
    ArrayList<String> y = new ArrayList<>(b);
    Collections.sort(x);
    Collections.sort(y);
    return x.equals(y);
  }

  private static String formatAssignee(Task t) {
    if (t.assignee != null && t.assignee.name != null && !t.assignee.name.isBlank()) {
      return t.assignee.name;
    }
    if (t.assigneeId != null) {
      return "User #" + t.assigneeId;
    }
    return "Unassigned";
  }

  private static String humanEnum(String raw) {
    if (raw == null || raw.isBlank()) return "none";
    String[] parts = raw.replace('_', ' ').split(" ");
    StringBuilder sb = new StringBuilder();
    for (String p : parts) {
      if (p.isEmpty()) continue;
      sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1)).append(' ');
    }
    return sb.toString().trim();
  }
}
