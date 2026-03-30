import { Router, type IRouter, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, tasksTable, usersTable } from "@workspace/db";
import { eq, or, ilike } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router({ mergeParams: true });
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

    let mappedTasks: MappedTask[] = [];
    let llmError: string | null = null;

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

        const title       = findVal("title", "name", "task", "subject", "summary") ?? String(entries[0]?.[1] ?? "Untitled");
        const description = findVal("description", "desc", "notes", "note", "detail", "body") ?? (entries[1] ? String(entries[1][1]) : undefined);
        const status      = findVal("status", "state", "stage") ?? "todo";
        const priority    = findVal("priority", "urgency", "severity") ?? "medium";
        const assignee    = findVal("assignee", "assigned", "owner", "responsible", "person") ?? null;
        // Find raw date values (may be Date objects from cellDates:true)
        const findRaw = (...keys: string[]) => {
          for (const [k, v] of entries) {
            if (keys.some(key => k.toLowerCase().includes(key)) && v !== "") return v;
          }
          return undefined;
        };
        const startDate = toDateStr(findRaw("start", "begin", "from", "start_date", "startdate"));
        const dueDate   = toDateStr(findRaw("due", "deadline", "end", "finish", "due_date", "duedate"));

        return { title, description, status, priority, assignee, startDate, dueDate };
      });
    }

    const cleanedTasks = mappedTasks.map((t) => ({
      title:       String(t.title || "Untitled").trim() || "Untitled",
      description: t.description ? String(t.description).trim() : undefined,
      status:      ["todo", "in_progress", "in_review", "done"].includes(t.status) ? t.status : "todo",
      priority:    ["low", "medium", "high", "urgent"].includes(t.priority) ? t.priority : "medium",
      assignee:    t.assignee ? String(t.assignee).trim() : null,
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

  const existingTasks = await db.select({ position: tasksTable.position }).from(tasksTable).where(eq(tasksTable.projectId, projectId));
  let maxPosition = existingTasks.reduce((max, t) => Math.max(max, t.position), -1);

  const rows = tasks.map((t) => {
    const title      = (String(t.title ?? "")).trim() || "Untitled";
    const status     = VALID_STATUS.has(t.status ?? "") ? t.status as "todo" | "in_progress" | "in_review" | "done" : "todo";
    const priority   = VALID_PRIORITY.has(t.priority ?? "") ? t.priority as "low" | "medium" | "high" | "urgent" : "medium";
    const assigneeId = t.assignee ? (userMap.get(t.assignee) ?? null) : null;
    return {
      title,
      description: t.description ? String(t.description).trim() || null : null,
      status,
      priority,
      assigneeId,
      startDate:   toDateStr(t.startDate),
      dueDate:     toDateStr(t.dueDate),
      tags:        [] as string[],
      projectId,
      reporterId:  req.userId!,
      position:    ++maxPosition,
    };
  });

  const created = await db.insert(tasksTable).values(rows).returning();
  res.status(201).json({ created: created.length, tasks: created });
});

export default router;
