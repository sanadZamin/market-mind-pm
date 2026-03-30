import { Router, type IRouter, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, tasksTable, usersTable } from "@workspace/db";
import { eq, or, ilike, inArray, isNull, and } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { sendTeamUpdateEmail } from "../lib/notifications.js";

const router: IRouter = Router({ mergeParams: true });
const PM_TOOL_BASE_URL = process.env.PM_TOOL_BASE_URL ?? "http://localhost:5173";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://149.102.140.178:7869";
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    ?? "qwen3.5:0.8b";

router.use(requireAuth as any);

/** Normalise any date value to "YYYY-MM-DD" or null */
function toDateStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (val === "") return null;

  // Helpers
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const asYMD = (d: Date) =>
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

  // Convert Excel "serial date" to a UTC date.
  // Excel's day 1 is 1899-12-31, but serials are typically offset by 1 due to leap year bug.
  const excelSerialToDate = (serial: number): Date | null => {
    if (!Number.isFinite(serial)) return null;
    // Common approach for Excel serials: 1899-12-30 as the epoch for "serial 0".
    const epoch = Date.UTC(1899, 11, 30);
    const ms = Math.floor(serial) * 86400000;
    const d = new Date(epoch + ms);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  // 1) Date objects
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return null;
    return asYMD(val);
  }

  // 2) Numbers (Excel serial dates)
  if (typeof val === "number") {
    const d = excelSerialToDate(val);
    if (!d) return null;
    return asYMD(d);
  }

  // 3) Strings
  const s = String(val).trim();
  if (!s) return null;

  // Already correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Excel serial stored as text
  if (/^\d+(\.\d+)?$/.test(s)) {
    const maybeSerial = Number(s);
    const d = excelSerialToDate(maybeSerial);
    if (d) return asYMD(d);
  }

  // dd/mm/yyyy (or dd-mm-yyyy / dd.mm.yyyy)
  // Also supports 2-digit years.
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
  if (dmy) {
    const a = Number(dmy[1]); // day OR month
    const b = Number(dmy[2]); // month OR day
    const yearRaw = dmy[3];
    const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);

    // Prefer dd/mm (since your Excel is dd/mm), but use a heuristic for safety.
    const day =
      a > 12 && b <= 12 ? a : b > 12 && a <= 12 ? b : a;
    const month =
      a > 12 && b <= 12 ? b : b > 12 && a <= 12 ? a : b;

    const d = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(d.getTime())) return asYMD(d);
  }

  // 4) Last resort: let JS parse (works for ISO strings with/without time)
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return asYMD(parsed);
}

type MappedTask = {
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  parentTask?: string | null;
};

// ── POST /api/projects/:projectId/import-excel ────────────────────────────────
router.post(
  "/projects/:projectId/import-excel",
  upload.single("file") as any,
  async (req: AuthenticatedRequest & { file?: Express.Multer.File }, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ error: "Excel file has no sheets" });
      return;
    }
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      res.status(400).json({ error: "Excel sheet is empty" });
      return;
    }

    const headers = Object.keys(rows[0]);
    const sampleRows = rows.slice(0, 5);

    const prompt = `You are a task management assistant. I have a spreadsheet with the following columns: ${headers.join(", ")}.

Here are the first few rows as JSON:
${JSON.stringify(sampleRows, null, 2)}

Map each row in the full dataset to a task with these fields:
- title (string, required): the task name/title
- description (string, optional): task description or notes
- status (string): one of "todo", "in_progress", "in_review", "done" — infer from any status/state column, default to "todo"
- priority (string): one of "low", "medium", "high", "urgent" — infer from any priority column, default to "medium"
- assignee (string, optional): the name or email of the person assigned to this task, if present in the data, otherwise null
- startDate (string, optional): ISO date string YYYY-MM-DD if a start date is present, otherwise null
- dueDate (string, optional): ISO date string YYYY-MM-DD if a due/deadline date is present, otherwise null

Here is the FULL dataset:
${JSON.stringify(rows, null, 2)}

Return ONLY a valid JSON array of task objects with these exact fields: title, description, status, priority, assignee, startDate, dueDate. No explanation, no markdown, just the JSON array.`;

    const normHeader = (s: string) => s.toLowerCase().trim();
    const findHeader = (aliases: string[]) => {
      const headersNorm = headers.map((h) => ({ h, n: normHeader(h) }));
      for (const a of aliases) {
        const an = normHeader(a);
        const exact = headersNorm.find((x) => x.n === an);
        if (exact) return exact.h;
      }
      for (const { h, n } of headersNorm) {
        for (const a of aliases) {
          const an = normHeader(a);
          if (n.includes(an)) return h;
        }
      }
      return undefined;
    };

    const mapStatus = (raw: unknown): string => {
      const s = String(raw ?? "").toLowerCase().trim();
      if (!s) return "todo";
      if (s.includes("in progress") || s.includes("in-progress")) return "in_progress";
      if (s.includes("review")) return "in_review";
      if (s === "done" || s.includes("complete")) return "done";
      if (s === "todo" || s.includes("to do") || s.includes("backlog")) return "todo";
      return "todo";
    };

    const mapPriority = (raw: unknown): string => {
      const s = String(raw ?? "").toLowerCase().trim();
      if (!s) return "medium";
      if (s.includes("urgent")) return "urgent";
      if (s.includes("high")) return "high";
      if (s.includes("low")) return "low";
      if (s.includes("medium")) return "medium";
      return "medium";
    };

    // If the Excel sheet has explicit hierarchy columns, skip the LLM and map deterministically.
    // Example from your upload: Parent Task + Task Name.
    const parentHeader = findHeader(["parent task", "parent"]);
    const subHeader = findHeader(["sub task", "subtask", "task name", "task"]);
    const hasParentSubColumns = Boolean(parentHeader && subHeader);

    const descriptionHeader = findHeader(["description", "desc", "notes", "note", "detail", "body"]);
    const statusHeader = findHeader(["status", "state", "stage"]);
    const priorityHeader = findHeader(["priority", "urgency", "severity"]);
    const startHeader = findHeader(["start date", "start_date", "start"]);
    const dueHeader = findHeader(["due date", "due_date", "deadline", "due", "end", "finish"]);
    const assigneeHeader = findHeader(["assignee", "assigned", "owner", "responsible", "person"]);

    let mappedTasks: MappedTask[] = [];
    let llmError: string | null = null;

    if (hasParentSubColumns && parentHeader && subHeader) {
      mappedTasks = rows.map((row) => {
        const parentTitle = row[parentHeader] ? String(row[parentHeader]).trim() : "";
        const subTitle = row[subHeader] ? String(row[subHeader]).trim() : "";

        const description = descriptionHeader
          ? row[descriptionHeader]
            ? String(row[descriptionHeader]).trim()
            : undefined
          : undefined;
        const status = statusHeader ? mapStatus(row[statusHeader]) : "todo";
        const priority = priorityHeader ? mapPriority(row[priorityHeader]) : "medium";
        const assignee = assigneeHeader ? (row[assigneeHeader] ? String(row[assigneeHeader]).trim() : null) : null;

        const startDate = startHeader ? toDateStr(row[startHeader]) : null;
        const dueDate = dueHeader ? toDateStr(row[dueHeader]) : null;

        // If the subtask column is empty, treat this row as a top-level task.
        if (!subTitle) {
          return {
            title: parentTitle || "Untitled",
            description,
            status,
            priority,
            assignee,
            startDate,
            dueDate,
            parentTask: null,
          };
        }

        return {
          title: subTitle,
          description,
          status,
          priority,
          assignee,
          startDate,
          dueDate,
          parentTask: parentTitle || null,
        };
      });

      // Your sheet format often provides explicit children but not explicit parent rows
      // (i.e. Parent Task is filled for each row, while Sub Task is never empty).
      // The bulk importer will auto-create missing parents, so we also inject them
      // into the preview to make the dialog match what will be imported.
      const explicitParents = new Set(
        mappedTasks.filter((t) => !t.parentTask).map((t) => t.title),
      );

      const childrenByParent = new Map<string, MappedTask[]>();
      for (const t of mappedTasks) {
        if (!t.parentTask) continue;
        const p = String(t.parentTask).trim();
        if (!p) continue;
        const list = childrenByParent.get(p) ?? [];
        list.push(t);
        childrenByParent.set(p, list);
      }

      for (const [parentTitle, siblings] of childrenByParent.entries()) {
        if (explicitParents.has(parentTitle)) continue;

        const childStarts = siblings
          .map((c) => (c.startDate ? String(c.startDate) : null))
          .filter((d): d is string => Boolean(d))
          .sort();
        const childDues = siblings
          .map((c) => (c.dueDate ? String(c.dueDate) : null))
          .filter((d): d is string => Boolean(d))
          .sort();

        const derivedStartDate = childStarts.length ? childStarts[0] : null;
        const derivedDueDate = childDues.length ? childDues[childDues.length - 1] : null;

        mappedTasks.push({
          title: parentTitle,
          description: undefined,
          status: "todo",
          priority: "medium",
          assignee: null,
          startDate: derivedStartDate,
          dueDate: derivedDueDate,
          parentTask: null,
        });
      }
    } else {
      try {
        const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt,
            stream: false,
            options: { temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (!ollamaResponse.ok) {
          throw new Error(`Ollama responded with status ${ollamaResponse.status}`);
        }

        const ollamaData = (await ollamaResponse.json()) as { response: string };
        const raw = ollamaData.response.trim();

        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("LLM response did not contain a JSON array");

        mappedTasks = JSON.parse(jsonMatch[0]);
      } catch (err: unknown) {
        llmError = err instanceof Error ? err.message : String(err);

        // Fallback: expose raw parsed rows so users can see the spreadsheet data
        mappedTasks = rows.map((row) => {
          const entries = Object.entries(row);
          // Try to find likely column names heuristically
          const findVal = (...keys: string[]) => {
            for (const [k, v] of entries) {
              if (keys.some(key => k.toLowerCase().includes(key)) && v !== "") return String(v);
            }
            return undefined;
          };

          const title = findVal("title", "name", "task", "subject", "summary") ?? String(entries[0]?.[1] ?? "Untitled");
          const description = findVal("description", "desc", "notes", "note", "detail", "body") ?? (entries[1] ? String(entries[1][1]) : undefined);
          const status = findVal("status", "state", "stage") ?? "todo";
          const priority = findVal("priority", "urgency", "severity") ?? "medium";
          const assignee = findVal("assignee", "assigned", "owner", "responsible", "person") ?? null;
          // Find raw date values (may be Date objects from cellDates:true)
          const findRaw = (...keys: string[]) => {
            for (const [k, v] of entries) {
              if (keys.some(key => k.toLowerCase().includes(key)) && v !== "") return v;
            }
            return undefined;
          };
          const startDate = toDateStr(findRaw("start", "begin", "from", "start_date", "startdate"));
          const dueDate = toDateStr(findRaw("due", "deadline", "end", "finish", "due_date", "duedate"));

          return { title, description, status, priority, assignee, startDate, dueDate };
        });
      }
    }

    const cleanedTasks = mappedTasks.map((t) => ({
      title:       String(t.title || "Untitled").trim() || "Untitled",
      description: t.description ? String(t.description).trim() : undefined,
      status:      ["todo", "in_progress", "in_review", "done"].includes(t.status) ? t.status : "todo",
      priority:    ["low", "medium", "high", "urgent"].includes(t.priority) ? t.priority : "medium",
      assignee:    t.assignee ? String(t.assignee).trim() : null,
      parentTask:  t.parentTask ? String(t.parentTask).trim() : null,
      startDate:   toDateStr(t.startDate),
      dueDate:     toDateStr(t.dueDate),
    }));

    res.json({ tasks: cleanedTasks, llmError, rawRows: llmError ? rows : undefined });
  },
);

type BulkTaskInput = {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  parentTask?: string | null;
};

const VALID_STATUS   = new Set(["todo", "in_progress", "in_review", "done"]);
const VALID_PRIORITY = new Set(["low", "medium", "high", "urgent"]);

// ── POST /api/projects/:projectId/tasks/bulk ──────────────────────────────────
router.post("/projects/:projectId/tasks/bulk", async (req: AuthenticatedRequest, res: Response) => {
  const projectId = parseInt(req.params.projectId);
  const body = req.body as { tasks?: unknown };

  if (!Array.isArray(body.tasks) || body.tasks.length === 0) {
    res.status(400).json({ error: "tasks array is required and must not be empty" });
    return;
  }

  const tasks = body.tasks as BulkTaskInput[];

  // Resolve assignee names/emails to user IDs where possible
  const assigneeStrings = [...new Set(tasks.map(t => t.assignee).filter((a): a is string => Boolean(a)))];
  const userMap = new Map<string, number>();
  if (assigneeStrings.length > 0) {
    const conditions = assigneeStrings.flatMap(a => [ilike(usersTable.name, a), ilike(usersTable.email, a)]);
    const found = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(or(...conditions));
    for (const user of found) {
      for (const a of assigneeStrings) {
        if (user.name.toLowerCase() === a.toLowerCase() || user.email.toLowerCase() === a.toLowerCase()) {
          userMap.set(a, user.id);
        }
      }
    }
  }

  const normalizeOptionalString = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s ? s : null;
  };

  const tasksWithParent = tasks.map((t) => ({
    ...t,
    parentTask: normalizeOptionalString(t.parentTask),
  }));

  // Top-level tasks are those without parentTask.
  const explicitTopLevel = tasksWithParent.filter((t) => !t.parentTask);
  // Subtasks reference parentTask (auto-create parents).
  const childTasks = tasksWithParent.filter((t) => Boolean(t.parentTask));

  // Insert explicit top-level tasks first (position is global for top-level tasks).
  const existingTopLevel = await db
    .select({ position: tasksTable.position })
    .from(tasksTable)
    .where(and(eq(tasksTable.projectId, projectId), isNull(tasksTable.parentTaskId)));
  let maxTopLevelPosition = existingTopLevel.reduce((max, t) => Math.max(max, t.position), -1);

  const explicitTopLevelRows = explicitTopLevel.map((t) => {
    const title = (String(t.title ?? "")).trim() || "Untitled";
    const status =
      VALID_STATUS.has(t.status ?? "") ? (t.status as "todo" | "in_progress" | "in_review" | "done") : "todo";
    const priority =
      VALID_PRIORITY.has(t.priority ?? "") ? (t.priority as "low" | "medium" | "high" | "urgent") : "medium";
    const assigneeId = t.assignee ? (userMap.get(t.assignee) ?? null) : null;

    return {
      title,
      description: t.description ? String(t.description).trim() || null : null,
      status,
      priority,
      assigneeId,
      startDate: toDateStr(t.startDate),
      dueDate: toDateStr(t.dueDate),
      tags: [] as string[],
      projectId,
      reporterId: req.userId!,
      position: ++maxTopLevelPosition,
      parentTaskId: null,
    };
  });

  const createdExplicitTopLevel = explicitTopLevelRows.length
    ? await db.insert(tasksTable).values(explicitTopLevelRows).returning()
    : [];

  const explicitParentIdByTitle = new Map<string, number>(
    (createdExplicitTopLevel as any[]).map((t) => [t.title, t.id]),
  );

  // Derive parent tasks from childTasks, but skip any that already exist from explicitTopLevel.
  const derivedParentTitlesInOrder: string[] = [];
  const derivedParentTitleSet = new Set<string>();
  for (const t of childTasks) {
    const p = t.parentTask!;
    if (!p) continue;
    if (explicitParentIdByTitle.has(p)) continue;
    if (!derivedParentTitleSet.has(p)) {
      derivedParentTitleSet.add(p);
      derivedParentTitlesInOrder.push(p);
    }
  }

  const childrenByParentTitle = new Map<string, BulkTaskInput[]>();
  for (const t of childTasks) {
    const p = t.parentTask!;
    const list = childrenByParentTitle.get(p) ?? [];
    list.push(t);
    childrenByParentTitle.set(p, list);
  }

  const derivedParentRows = derivedParentTitlesInOrder.map((parentTitle) => {
    const siblings = childrenByParentTitle.get(parentTitle) ?? [];

    const childStarts = siblings.map((c) => toDateStr(c.startDate)).filter((d): d is string => Boolean(d));
    const childDues = siblings.map((c) => toDateStr(c.dueDate)).filter((d): d is string => Boolean(d));

    const derivedStart = childStarts.length ? childStarts.slice().sort()[0] : null;
    const derivedDue = childDues.length ? childDues.slice().sort().reverse()[0] : null;

    return {
      title: parentTitle,
      description: null,
      status: "todo",
      priority: "medium",
      assigneeId: null,
      startDate: derivedStart,
      dueDate: derivedDue,
      tags: [] as string[],
      projectId,
      reporterId: req.userId!,
      position: ++maxTopLevelPosition,
      parentTaskId: null,
    };
  });

  const createdDerivedParents = derivedParentRows.length
    ? await db.insert(tasksTable).values(derivedParentRows as any).returning()
    : [];

  const derivedParentIdByTitle = new Map<string, number>(
    (createdDerivedParents as any[]).map((t) => [t.title, t.id]),
  );

  const parentIdByTitle = new Map<string, number>([
    ...Array.from(explicitParentIdByTitle.entries()),
    ...Array.from(derivedParentIdByTitle.entries()),
  ]);

  // Compute existing child position max per parent so we append in order.
  const parentIds = Array.from(parentIdByTitle.values());
  const existingChildPositions = parentIds.length
    ? await db
        .select({ parentTaskId: tasksTable.parentTaskId, position: tasksTable.position })
        .from(tasksTable)
        .where(and(eq(tasksTable.projectId, projectId), inArray(tasksTable.parentTaskId, parentIds)))
    : [];

  const maxChildPosByParentId = new Map<number, number>();
  for (const row of existingChildPositions as any[]) {
    const pid = row.parentTaskId as number;
    const pos = row.position as number;
    maxChildPosByParentId.set(pid, Math.max(maxChildPosByParentId.get(pid) ?? -1, pos));
  }

  const childRows = childTasks
    .filter((t) => t.parentTask && parentIdByTitle.has(t.parentTask))
    .map((t) => {
      const title = (String(t.title ?? "")).trim() || "Untitled";
      const status =
        VALID_STATUS.has(t.status ?? "") ? (t.status as "todo" | "in_progress" | "in_review" | "done") : "todo";
      const priority =
        VALID_PRIORITY.has(t.priority ?? "") ? (t.priority as "low" | "medium" | "high" | "urgent") : "medium";
      const assigneeId = t.assignee ? (userMap.get(t.assignee) ?? null) : null;

      const parentId = parentIdByTitle.get(t.parentTask!)!;
      const nextPos = (maxChildPosByParentId.get(parentId) ?? -1) + 1;
      maxChildPosByParentId.set(parentId, nextPos);

      return {
        title,
        description: t.description ? String(t.description).trim() || null : null,
        status,
        priority,
        assigneeId,
        startDate: toDateStr(t.startDate),
        dueDate: toDateStr(t.dueDate),
        tags: [] as string[],
        projectId,
        reporterId: req.userId!,
        position: nextPos,
        parentTaskId: parentId,
      };
    });

  const createdChildren = childRows.length ? await db.insert(tasksTable).values(childRows as any).returning() : [];

  const createdTotal =
    (createdExplicitTopLevel as any[]).length + (createdDerivedParents as any[]).length + (createdChildren as any[]).length;

  res.status(201).json({ created: createdTotal });
  await sendTeamUpdateEmail({
    actorUserId: req.userId!,
    subject: `Bulk task import completed`,
    intro: `Tasks were imported from Excel.`,
    details: [`Project ID: ${projectId}`, `Created tasks: ${createdTotal}`],
    actionUrl: `${PM_TOOL_BASE_URL}/projects/${projectId}`,
    actionLabel: "Open project",
  });
});

export default router;
