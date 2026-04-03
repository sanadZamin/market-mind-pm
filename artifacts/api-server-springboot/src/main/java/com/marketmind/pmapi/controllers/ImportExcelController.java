package com.marketmind.pmapi.controllers;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.DateUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.io.InputStream;
import java.time.ZoneOffset;
import java.util.*;

import com.marketmind.pmapi.security.BearerAuthInterceptor;
import com.marketmind.pmapi.services.TeamUpdateEmailService;

@RestController
public class ImportExcelController {
  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;
  private final RestTemplate restTemplate;
  private final TeamUpdateEmailService teamUpdateEmailService;

  @Value("${PM_TOOL_BASE_URL:http://localhost:5173}")
  private String pmToolBaseUrl;

  @Value("${ollama.baseUrl}")
  private String ollamaBaseUrl;

  @Value("${ollama.model}")
  private String ollamaModel;

  @Value("${ollama.think:false}")
  private boolean ollamaThink;

  public ImportExcelController(
      JdbcTemplate jdbcTemplate,
      ObjectMapper objectMapper,
      TeamUpdateEmailService teamUpdateEmailService
  ) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
    this.restTemplate = new RestTemplate();
    this.teamUpdateEmailService = teamUpdateEmailService;
  }

  @PostMapping("/projects/{projectId}/import-excel")
  public ResponseEntity<?> importExcel(
      @PathVariable int projectId,
      @RequestPart("file") MultipartFile file,
      HttpServletRequest request
  ) {
    if (file == null || file.isEmpty()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "No file uploaded"));
    }

    try (InputStream in = file.getInputStream()) {
      Workbook workbook = WorkbookFactory.create(in);
      Sheet sheet = workbook.getSheetAt(0);
      if (sheet == null) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Excel file has no sheets"));
      }

      Iterator<Row> rowIt = sheet.rowIterator();
      if (!rowIt.hasNext()) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Excel sheet is empty"));
      }

      // Header row
      Row headerRow = rowIt.next();
      List<String> headers = new ArrayList<>();
      for (Cell cell : headerRow) {
        String h = readCellAsString(cell);
        headers.add(StringUtils.hasText(h) ? h : "");
      }
      // Filter out empty header columns by keeping position-based names
      for (int i = 0; i < headers.size(); i++) {
        if (!StringUtils.hasText(headers.get(i))) headers.set(i, "Column" + (i + 1));
      }

      List<Map<String, Object>> rows = new ArrayList<>();
      while (rowIt.hasNext()) {
        Row r = rowIt.next();
        Map<String, Object> row = new LinkedHashMap<>();
        boolean any = false;
        for (int ci = 0; ci < headers.size(); ci++) {
          Cell c = r.getCell(ci, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
          Object val = c == null ? "" : readCellValue(c);
          row.put(headers.get(ci), val);
          boolean isBlankString = (val instanceof String) && ((String) val).isBlank();
          boolean isZeroNumber = (val instanceof Number) && ((Number) val).doubleValue() == 0.0;
          if (val != null && !isBlankString && !isZeroNumber) {
            any = true;
          }
        }
        if (any) rows.add(row);
      }

      if (rows.isEmpty()) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Excel sheet is empty"));
      }

      // Heuristic header detection (same aliases as Node)
      List<Map<String, Object>> sampleRows = rows.subList(0, Math.min(5, rows.size()));
      String llmError = null;
      List<Map<String, Object>> mappedTasks;
      String parentHeader = findHeader(headers, List.of("parent task", "parent"));
      String subHeader = findHeader(headers, List.of("sub task", "subtask", "task name", "task"));
      boolean hasParentSubColumns = parentHeader != null && subHeader != null;

      if (hasParentSubColumns) {
        mappedTasks = deterministicOrLlm(headers, sampleRows, rows);
      } else {
        try {
          mappedTasks = llmMapTasks(headers, sampleRows, rows);
        } catch (Exception e) {
          llmError = e.getMessage();
          mappedTasks = deterministicOrLlm(headers, sampleRows, rows);
        }
      }

      // cleanedTasks: normalize output shape for the frontend preview dialog
      List<Map<String, Object>> cleanedTasks = new ArrayList<>();
      Set<String> VALID_STATUS = Set.of("todo", "in_progress", "in_review", "done");
      Set<String> VALID_PRIORITY = Set.of("low", "medium", "high", "urgent");

      for (Map<String, Object> t : mappedTasks) {
        String title = t.get("title") != null ? String.valueOf(t.get("title")).trim() : "";
        if (title.isBlank()) title = "Untitled";

        Object descObj = t.get("description");
        String description = descObj != null && !String.valueOf(descObj).trim().isBlank()
            ? String.valueOf(descObj).trim()
            : null;

        String status = t.get("status") != null ? String.valueOf(t.get("status")) : "todo";
        if (!VALID_STATUS.contains(status)) status = "todo";

        String priority = t.get("priority") != null ? String.valueOf(t.get("priority")) : "medium";
        if (!VALID_PRIORITY.contains(priority)) priority = "medium";

        String assignee = t.get("assignee") != null ? String.valueOf(t.get("assignee")).trim() : null;
        if (assignee != null && assignee.isBlank()) assignee = null;

        String startDate = toDateStr(t.get("startDate"));
        String dueDate = toDateStr(t.get("dueDate"));

        Object parentTaskObj = t.get("parentTask");
        String parentTask = parentTaskObj != null ? String.valueOf(parentTaskObj).trim() : null;
        if (parentTask != null && parentTask.isBlank()) parentTask = null;

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("title", title);
        out.put("description", description);
        out.put("status", status);
        out.put("priority", priority);
        out.put("assignee", assignee);
        out.put("startDate", startDate);
        out.put("dueDate", dueDate);
        out.put("parentTask", parentTask);
        cleanedTasks.add(out);
      }

      Map<String, Object> resp = new LinkedHashMap<>();
      resp.put("tasks", cleanedTasks);
      resp.put("llmError", llmError);
      if (llmError != null) resp.put("rawRows", rows);
      return ResponseEntity.ok(resp);
    } catch (Exception e) {
      String msg = e.getMessage();
      if (msg == null || msg.isBlank()) {
        msg = e.getClass().getSimpleName();
      }
      Map<String, String> err = new LinkedHashMap<>();
      err.put("error", "Failed to parse Excel file");
      err.put("message", msg);
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }
  }

  @PostMapping("/projects/{projectId}/tasks/bulk")
  public ResponseEntity<?> bulkCreateTasks(
      @PathVariable int projectId,
      @RequestBody Map<String, Object> body,
      HttpServletRequest request
  ) {
    int userId = requireUserId(request);
    Object tasksObj = body.get("tasks");
    if (!(tasksObj instanceof List) || ((List<?>) tasksObj).isEmpty()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "tasks array is required and must not be empty"));
    }

    @SuppressWarnings("unchecked")
    List<Map<String, Object>> tasks = (List<Map<String, Object>>) tasksObj;

    // Resolve assignee -> userId (simple exact match fallback)
    Map<String, Integer> userMap = new HashMap<>();
    Set<String> assigneeStrings = new HashSet<>();
    for (Map<String, Object> t : tasks) {
      Object a = t.get("assignee");
      if (a instanceof String) {
        String s = ((String) a).trim();
        if (!s.isBlank()) assigneeStrings.add(s);
      }
    }
    for (String a : assigneeStrings) {
      List<Map<String, Object>> found = jdbcTemplate.queryForList(
          "select id, name, email from users where lower(name) = lower(?) or lower(email) = lower(?)",
          a,
          a
      );
      if (!found.isEmpty()) {
        Object id = found.get(0).get("id");
        if (id instanceof Number) {
          userMap.put(a, ((Number) id).intValue());
        }
      }
    }

    // Create parent tasks first
    int createdTotal = 0;
    int nextParentPos = Optional.ofNullable(jdbcTemplate.queryForObject(
        "select coalesce(max(position), 0) from tasks where project_id = ? and parent_task_id is null",
        Integer.class,
        projectId
    )).orElse(0);

    Map<String, Integer> parentIdByTitle = new HashMap<>();
    List<Map<String, Object>> parents = new ArrayList<>();
    List<Map<String, Object>> children = new ArrayList<>();
    for (Map<String, Object> t : tasks) {
      Object pt = t.get("parentTask");
      if (pt == null || String.valueOf(pt).trim().isBlank()) parents.add(t);
      else children.add(t);
    }

    // Insert parents
    for (Map<String, Object> t : parents) {
      String title = String.valueOf(t.get("title"));
      String description = t.get("description") != null ? String.valueOf(t.get("description")) : null;
      String status = normalizeStatus(t.get("status"));
      String priority = normalizePriority(t.get("priority"));
      String startDate = toDateStr(t.get("startDate"));
      String dueDate = toDateStr(t.get("dueDate"));

      Integer assigneeId = null;
      Object assignee = t.get("assignee");
      if (assignee instanceof String) {
        assigneeId = userMap.get(((String) assignee).trim());
      }

      nextParentPos += 1;
      Integer insertedId = jdbcTemplate.queryForObject(
          "insert into tasks (title, description, status, priority, project_id, assignee_id, reporter_id, parent_task_id, start_date, due_date, estimated_hours, tags, position) " +
              "values (?, ?, CAST(? AS task_status), CAST(? AS task_priority), ?, ?, ?, null, ?, ?, null, '[]'::jsonb, ?) returning id",
          Integer.class,
          title,
          description,
          status,
          priority,
          projectId,
          assigneeId,
          userId,
          startDate,
          dueDate,
          nextParentPos
      );
      parentIdByTitle.put(title, insertedId);
      createdTotal++;
    }

    // Insert children as subtasks
    Map<Integer, Integer> nextChildPosByParentId = new HashMap<>();
    for (Map<String, Object> t : children) {
      String title = String.valueOf(t.get("title"));
      String parentTitle = String.valueOf(t.get("parentTask")).trim();
      Integer parentId = parentIdByTitle.get(parentTitle);
      if (parentId == null) continue;

      int nextPos = nextChildPosByParentId.getOrDefault(parentId, 0) + 1;
      nextChildPosByParentId.put(parentId, nextPos);

      String description = t.get("description") != null ? String.valueOf(t.get("description")) : null;
      String status = normalizeStatus(t.get("status"));
      String priority = normalizePriority(t.get("priority"));
      String startDate = toDateStr(t.get("startDate"));
      String dueDate = toDateStr(t.get("dueDate"));

      Integer assigneeId = null;
      Object assignee = t.get("assignee");
      if (assignee instanceof String) {
        assigneeId = userMap.get(((String) assignee).trim());
      }

      jdbcTemplate.update(
          "insert into tasks (title, description, status, priority, project_id, assignee_id, reporter_id, parent_task_id, start_date, due_date, estimated_hours, tags, position) " +
              "values (?, ?, CAST(? AS task_status), CAST(? AS task_priority), ?, ?, ?, ?, ?, ?, null, '[]'::jsonb, ?)",
          title,
          description,
          status,
          priority,
          projectId,
          assigneeId,
          userId,
          parentId,
          startDate,
          dueDate,
          nextPos
      );
      createdTotal++;
    }

    teamUpdateEmailService.sendTeamUpdateEmail(
        userId,
        "Bulk task import completed",
        "Tasks were imported from Excel.",
        List.of("Project ID: " + projectId, "Created tasks: " + createdTotal),
        pmToolBaseUrl + "/projects/" + projectId,
        "Open project"
    );

    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("created", createdTotal));
  }

  private int requireUserId(HttpServletRequest request) {
    Object userIdObj = request.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
    if (!(userIdObj instanceof Integer)) {
      throw new IllegalStateException("Unauthorized");
    }
    return (Integer) userIdObj;
  }

  private static String readCellAsString(Cell cell) {
    if (cell == null) return "";
    CellType type = cell.getCellType();
    if (type == CellType.STRING) return cell.getStringCellValue();
    if (type == CellType.NUMERIC) {
      return DateUtil.isCellDateFormatted(cell)
          ? cell.getDateCellValue().toString()
          : String.valueOf(cell.getNumericCellValue());
    }
    if (type == CellType.BOOLEAN) return String.valueOf(cell.getBooleanCellValue());
    return "";
  }

  private Object readCellValue(Cell cell) {
    if (cell == null) return "";
    if (cell.getCellType() == CellType.NUMERIC) {
      if (DateUtil.isCellDateFormatted(cell)) {
        return cell.getDateCellValue();
      }
      return cell.getNumericCellValue();
    }
    if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
    if (cell.getCellType() == CellType.BOOLEAN) return cell.getBooleanCellValue() ? "true" : "false";
    return "";
  }

  private static String normalizeStatus(Object raw) {
    String s = raw == null ? "" : String.valueOf(raw).toLowerCase().trim();
    if (s.contains("in progress") || s.contains("in-progress")) return "in_progress";
    if (s.contains("review")) return "in_review";
    if (s.equals("done") || s.contains("complete")) return "done";
    if (s.equals("todo") || s.contains("to do") || s.contains("backlog")) return "todo";
    return "todo";
  }

  private static String normalizePriority(Object raw) {
    String s = raw == null ? "" : String.valueOf(raw).toLowerCase().trim();
    if (s.contains("urgent")) return "urgent";
    if (s.contains("high")) return "high";
    if (s.contains("low")) return "low";
    if (s.contains("medium")) return "medium";
    return "medium";
  }

  private String toDateStr(Object val) {
    if (val == null) return null;
    if (val instanceof String) {
      String t = ((String) val).trim();
      if (t.isEmpty()) return null;
      if (t.matches("\\d{4}-\\d{2}-\\d{2}")) return t;
      // numeric excel serial stored as text
      if (t.matches("\\d+(\\.\\d+)?")) {
        try {
          double serial = Double.parseDouble(t);
          return excelSerialToDate(serial);
        } catch (Exception e) {
          return null;
        }
      }
      // dd/mm/yyyy or dd-mm-yyyy
      if (t.matches("\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}")) {
        String[] parts = t.split("[\\/-]");
        int d = Integer.parseInt(parts[0]);
        int m = Integer.parseInt(parts[1]);
        int y = parts[2].length() == 2 ? 2000 + Integer.parseInt(parts[2]) : Integer.parseInt(parts[2]);
        return String.format("%04d-%02d-%02d", y, m, d);
      }
      return t;
    }
    if (val instanceof Date) {
      Date d = (Date) val;
      return d.toInstant().atOffset(ZoneOffset.UTC).toLocalDate().toString();
    }
    if (val instanceof Number) {
      Number n = (Number) val;
      return excelSerialToDate(n.doubleValue());
    }
    return null;
  }

  private String excelSerialToDate(double serial) {
    // Excel serial “0” => 1899-12-30 (common approach)
    long days = (long) Math.floor(serial);
    long epochMillis = java.time.LocalDate.of(1899, 12, 30).toEpochDay() * 86_400_000L;
    long ms = epochMillis + days * 86_400_000L;
    java.time.Instant instant = java.time.Instant.ofEpochMilli(ms);
    return instant.atOffset(ZoneOffset.UTC).toLocalDate().toString();
  }

  private List<Map<String, Object>> llmMapTasks(
      List<String> headers,
      List<Map<String, Object>> sampleRows,
      List<Map<String, Object>> rows
  ) throws Exception {
    String prompt = "You are a task management assistant. I have a spreadsheet with the following columns: " +
        String.join(", ", headers) + ".\n\n" +
        "Here are the first few rows as JSON:\n" +
        objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(sampleRows) + "\n\n" +
        "Map each row in the full dataset to a task with these fields:\n" +
        "- title (string, required): the task name/title\n" +
        "- description (string, optional): task description or notes\n" +
        "- status (string): one of \"todo\", \"in_progress\", \"in_review\", \"done\" — infer from any status/state column, default to \"todo\"\n" +
        "- priority (string): one of \"low\", \"medium\", \"high\", \"urgent\" — infer from any priority column, default to \"medium\"\n" +
        "- assignee (string, optional): the name or email of the person assigned to this task, if present in the data, otherwise null\n" +
        "- startDate (string, optional): ISO date string YYYY-MM-DD if a start date is present, otherwise null\n" +
        "- dueDate (string, optional): ISO date string YYYY-MM-DD if a due/deadline date is present, otherwise null\n\n" +
        "Here is the FULL dataset:\n" +
        objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(rows) + "\n\n" +
        "Return ONLY a valid JSON array of task objects with these exact fields: title, description, status, priority, assignee, startDate, dueDate. " +
        "No explanation, no markdown, just the JSON array.";

    Map<String, Object> body = new HashMap<>();
    body.put("model", ollamaModel);
    body.put("prompt", prompt);
    body.put("stream", false);
    body.put("keep_alive", "30m");
    body.put("options", Map.of("temperature", 0.1));
    body.put("think", ollamaThink);

    JsonNode resp = restTemplate.postForObject(ollamaBaseUrl + "/api/generate", body, JsonNode.class);
    if (resp == null) throw new RuntimeException("Ollama returned empty response");

    JsonNode responseField = resp.get("response");
    if (responseField == null) throw new RuntimeException("Ollama response missing `response` field");
    String raw = responseField.asText().trim();

    java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\[[\\s\\S]*\\]").matcher(raw);
    if (!m.find()) throw new RuntimeException("LLM response did not contain a JSON array");

    String jsonArrayRaw = m.group(0);
    return objectMapper.readValue(jsonArrayRaw, new TypeReference<List<Map<String, Object>>>() {});
  }

  private List<Map<String, Object>> deterministicOrLlm(List<String> headers, List<Map<String, Object>> sampleRows, List<Map<String, Object>> rows) {
    // Determine explicit hierarchy columns first (Parent Task + Sub Task)
    String parentHeader = findHeader(headers, List.of("parent task", "parent"));
    String subHeader = findHeader(headers, List.of("sub task", "subtask", "task name", "task"));
    boolean hasParentSub = parentHeader != null && subHeader != null;

    String descriptionHeader = findHeader(headers, List.of("description", "desc", "notes", "note", "detail", "body"));
    String statusHeader = findHeader(headers, List.of("status", "state", "stage"));
    String priorityHeader = findHeader(headers, List.of("priority", "urgency", "severity"));
    String startHeader = findHeader(headers, List.of("start date", "start_date", "start"));
    String dueHeader = findHeader(headers, List.of("due date", "due_date", "deadline", "due", "end", "finish"));
    String assigneeHeader = findHeader(headers, List.of("assignee", "assigned", "owner", "responsible", "person"));

    if (hasParentSub) {
      List<Map<String, Object>> mapped = new ArrayList<>();
      for (Map<String, Object> row : rows) {
        String parentTitle = safeTrim(String.valueOf(row.get(parentHeader)));
        String subTitle = safeTrim(String.valueOf(row.get(subHeader)));
        Object description = descriptionHeader != null ? row.get(descriptionHeader) : null;

        String status = statusHeader != null ? normalizeStatus(row.get(statusHeader)) : "todo";
        String priority = priorityHeader != null ? normalizePriority(row.get(priorityHeader)) : "medium";
        String assignee = assigneeHeader != null ? safeNullTrim(String.valueOf(row.get(assigneeHeader))) : null;

        String startDate = startHeader != null ? toDateStr(row.get(startHeader)) : null;
        String dueDate = dueHeader != null ? toDateStr(row.get(dueHeader)) : null;

        if (subTitle == null || subTitle.isEmpty()) {
          mapped.add(
              mappedTaskRow(
                  parentTitle != null && !parentTitle.isBlank() ? parentTitle : "Untitled",
                  description != null ? String.valueOf(description).trim() : null,
                  status,
                  priority,
                  assignee,
                  startDate,
                  dueDate,
                  null));
        } else {
          mapped.add(
              mappedTaskRow(
                  subTitle,
                  description != null ? String.valueOf(description).trim() : null,
                  status,
                  priority,
                  assignee,
                  startDate,
                  dueDate,
                  (parentTitle == null || parentTitle.isBlank()) ? null : parentTitle));
        }
      }

      // derive missing parent rows if needed (same idea as Node)
      Set<String> explicitParents = new HashSet<>();
      for (Map<String, Object> t : mapped) {
        Object pt = t.get("parentTask");
        if (pt == null) {
          Object title = t.get("title");
          if (title != null) explicitParents.add(String.valueOf(title).trim());
        }
      }

      Map<String, List<Map<String, Object>>> childrenByParent = new HashMap<>();
      for (Map<String, Object> t : mapped) {
        Object pt = t.get("parentTask");
        if (pt == null) continue;
        String p = String.valueOf(pt).trim();
        if (p.isBlank()) continue;
        childrenByParent.computeIfAbsent(p, k -> new ArrayList<>()).add(t);
      }

      List<Map<String, Object>> result = new ArrayList<>(mapped);
      for (String parentTitle : childrenByParent.keySet()) {
        if (explicitParents.contains(parentTitle)) continue;
        List<Map<String, Object>> siblings = childrenByParent.get(parentTitle);
        List<String> childStarts = new ArrayList<>();
        List<String> childDues = new ArrayList<>();
        for (Map<String, Object> c : siblings) {
          String sd = c.get("startDate") != null ? String.valueOf(c.get("startDate")) : null;
          String dd = c.get("dueDate") != null ? String.valueOf(c.get("dueDate")) : null;
          if (sd != null) childStarts.add(sd);
          if (dd != null) childDues.add(dd);
        }
        Collections.sort(childStarts);
        Collections.sort(childDues);
        String derivedStart = childStarts.isEmpty() ? null : childStarts.get(0);
        String derivedDue = childDues.isEmpty() ? null : childDues.get(childDues.size() - 1);

        result.add(mappedTaskRow(parentTitle, null, "todo", "medium", null, derivedStart, derivedDue, null));
      }
      return result;
    }

    // Fallback deterministic mapping (same idea as Node's heuristic fallback when LLM fails)
    String titleHeader = findHeader(headers, List.of("title", "name", "task", "subject", "summary"));
    if (titleHeader == null) titleHeader = headers.isEmpty() ? null : headers.get(0);

    List<Map<String, Object>> mapped = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      Object titleVal = titleHeader != null ? row.get(titleHeader) : null;
      String title = titleVal != null ? String.valueOf(titleVal).trim() : "";
      if (title.isBlank()) title = "Untitled";

      Object descVal = descriptionHeader != null ? row.get(descriptionHeader) : null;
      String description = descVal != null ? String.valueOf(descVal).trim() : null;
      if (description != null && description.isBlank()) description = null;

      String status = statusHeader != null ? normalizeStatus(row.get(statusHeader)) : "todo";
      String priority = priorityHeader != null ? normalizePriority(row.get(priorityHeader)) : "medium";

      String assignee = assigneeHeader != null ? safeNullTrim(String.valueOf(row.get(assigneeHeader))) : null;
      String startDate = startHeader != null ? toDateStr(row.get(startHeader)) : null;
      String dueDate = dueHeader != null ? toDateStr(row.get(dueHeader)) : null;

      mapped.add(mappedTaskRow(title, description, status, priority, assignee, startDate, dueDate, null));
    }

    return mapped;
  }

  /** Like Node object shape for preview/bulk; values may be null (unlike {@link Map#of}). */
  private static Map<String, Object> mappedTaskRow(
      String title,
      String description,
      String status,
      String priority,
      String assignee,
      String startDate,
      String dueDate,
      String parentTask) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("title", title);
    m.put("description", description);
    m.put("status", status);
    m.put("priority", priority);
    m.put("assignee", assignee);
    m.put("startDate", startDate);
    m.put("dueDate", dueDate);
    m.put("parentTask", parentTask);
    return m;
  }

  private String safeTrim(String v) {
    if (v == null) return null;
    String t = v.trim();
    return t.isEmpty() ? null : t;
  }

  private String safeNullTrim(String v) {
    if (v == null) return null;
    String t = v.trim();
    return t.isEmpty() ? null : t;
  }

  private String findHeader(List<String> headers, List<String> aliases) {
    if (headers == null) return null;
    for (String alias : aliases) {
      String an = alias.toLowerCase(Locale.ROOT).trim();
      for (String h : headers) {
        String hn = h == null ? "" : h.toLowerCase(Locale.ROOT).trim();
        if (hn.equals(an)) return h;
      }
    }
    // contains match
    for (String alias : aliases) {
      String an = alias.toLowerCase(Locale.ROOT).trim();
      for (String h : headers) {
        String hn = h == null ? "" : h.toLowerCase(Locale.ROOT).trim();
        if (hn.contains(an)) return h;
      }
    }
    return null;
  }
}

