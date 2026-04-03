import { Router, type IRouter } from "express";
import { db, projectsTable, tasksTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";
import { sendTeamUpdateEmail } from "../lib/notifications.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();
const PM_TOOL_BASE_URL = process.env.PM_TOOL_BASE_URL ?? "http://localhost:5173";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://149.102.140.178:7869";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5:0.8b";
/** Qwen3-style models: thinking mode adds latency; `/api/chat` + `think: false` follows Ollama docs. */
const OLLAMA_THINK =
  process.env.OLLAMA_THINK === "true" || process.env.OLLAMA_THINK === "1";
/** Remote Ollama + model load often exceeds 60s; too-low values cause `This operation was aborted` at ~OLLAMA_TIMEOUT_MS. */
const OLLAMA_TIMEOUT_MS = (() => {
  const raw = process.env.OLLAMA_TIMEOUT_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const requested =
    Number.isFinite(parsed) && parsed > 0 ? parsed : 300_000;
  const withFloor = Math.max(requested, 180_000);
  const capped = Math.min(withFloor, 900_000);
  if (requested < 180_000) {
    logger.warn(
      { requestedMs: requested, effectiveMs: capped },
      "OLLAMA_TIMEOUT_MS was below 180s; rephrase uses a 180s minimum for remote Ollama cold start",
    );
  }
  return capped;
})();

router.use(requireAuth as any);

async function withTaskCounts(projects: typeof projectsTable.$inferSelect[]) {
  return Promise.all(
    projects.map(async (project) => {
      const [totalResult] = await db
        .select({ count: count() })
        .from(tasksTable)
        .where(eq(tasksTable.projectId, project.id));
      const [doneResult] = await db
        .select({ count: count() })
        .from(tasksTable)
        .where(and(eq(tasksTable.projectId, project.id), eq(tasksTable.status, "done")));
      return {
        ...project,
        taskCount: totalResult?.count ?? 0,
        completedTaskCount: doneResult?.count ?? 0,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      };
    })
  );
}

function buildRephrasePrompt(projectName: string, description: string): string {
  return `Rewrite the following project description in a concise, professional tone (stakeholder-facing, no fluff).

Requirements:
- Be noticeably shorter than the original: tighten wording, drop repetition and filler, keep one or two crisp paragraphs at most (or a few short sentences if the source is brief).
- Stay formal and clear; do not pad with extra clauses or long introductions.
- Do not add deliverables, scope, dates, or stakeholders that are not in the original.

Output only the rewritten description as plain prose (no title line, no markdown, no bullet lists, no quotation marks wrapping the whole text).

Project name: ${projectName}
Original description:
${description}`;
}

async function callOllamaForRephrase(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        keep_alive: "30m",
        think: OLLAMA_THINK,
        options: { temperature: 0.25, num_predict: 380 },
      }),
      signal: controller.signal,
    });

    const rawBody = await ollamaResponse.text();
    if (!ollamaResponse.ok) {
      let detail = rawBody.trim().slice(0, 800);
      try {
        const errJson = JSON.parse(rawBody) as { error?: string };
        if (typeof errJson.error === "string" && errJson.error) detail = errJson.error;
      } catch {
        /* keep raw slice */
      }
      console.error("[rephrase-description] Ollama HTTP error", ollamaResponse.status, detail);
      const hint =
        ollamaResponse.status === 500 && detail.length < 2
          ? " If this always happens near 60s, raise timeouts on any reverse proxy in front of Ollama (e.g. nginx proxy_read_timeout) and check Ollama stderr logs."
          : "";
      throw new Error(`Ollama ${ollamaResponse.status}: ${detail || "(no body)"}${hint}`);
    }

    let payload: { message?: { content?: string } };
    try {
      payload = JSON.parse(rawBody) as { message?: { content?: string } };
    } catch {
      console.error("[rephrase-description] Invalid JSON from Ollama", rawBody.slice(0, 500));
      throw new Error("LLM returned invalid JSON");
    }

    const rewritten = String(payload.message?.content ?? "").trim();
    if (!rewritten) {
      throw new Error("LLM returned empty response");
    }
    return rewritten;
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/", async (req: AuthenticatedRequest, res) => {
  const projects = await db.select().from(projectsTable);
  const result = await withTaskCounts(projects);
  res.json(result);
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }
  const [project] = await db
    .insert(projectsTable)
    .values({
      ...parsed.data,
      ownerId: req.userId!,
    })
    .returning();
  res.status(201).json({
    ...project,
    taskCount: 0,
    completedTaskCount: 0,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
  await sendTeamUpdateEmail({
    actorUserId: req.userId!,
    subject: `Project created: ${project.name}`,
    intro: `A new project was created.`,
    details: [`Project: ${project.name}`, `Status: ${project.status}`],
    actionUrl: `${PM_TOOL_BASE_URL}/projects/${project.id}`,
    actionLabel: "Open project",
  });
});

/** Create-project flow: rephrase using the working title from the body (no project id yet). */
router.post("/rephrase-description", async (req: AuthenticatedRequest, res) => {
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  if (!description) {
    res.status(400).json({ error: "description is required" });
    return;
  }
  const nameRaw = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const projectName = nameRaw.length > 0 ? nameRaw : "Untitled project";
  const prompt = buildRephrasePrompt(projectName, description);
  try {
    const rewritten = await callOllamaForRephrase(prompt);
    res.json({ description: rewritten });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted =
      (err as { name?: string })?.name === "AbortError" || /abort/i.test(message);
    console.error("[rephrase-description]", message);
    if (message.startsWith("Ollama ") || message === "LLM returned invalid JSON" || message === "LLM returned empty response") {
      const isOllamaHttp = message.startsWith("Ollama ");
      res.status(502).json(
        isOllamaHttp
          ? { error: "LLM request failed", message }
          : { error: message },
      );
      return;
    }
    res.status(502).json({
      error: "Failed to rephrase description",
      message: aborted
        ? `LLM request timed out after ${OLLAMA_TIMEOUT_MS / 1000}s. Increase OLLAMA_TIMEOUT_MS (e.g. 600000), warm the model on the Ollama host, or fix any proxy_read_timeout in front of Ollama.`
        : message,
    });
  }
});

router.post("/:projectId/rephrase-description", async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId);
  if (Number.isNaN(projectId)) {
    res.status(400).json({ error: "Invalid projectId" });
    return;
  }
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  if (!description) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const prompt = buildRephrasePrompt(project.name, description);
  try {
    const rewritten = await callOllamaForRephrase(prompt);
    res.json({ description: rewritten });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted =
      (err as { name?: string })?.name === "AbortError" || /abort/i.test(message);
    console.error("[rephrase-description]", message);
    if (message.startsWith("Ollama ") || message === "LLM returned invalid JSON" || message === "LLM returned empty response") {
      const isOllamaHttp = message.startsWith("Ollama ");
      res.status(502).json(
        isOllamaHttp
          ? { error: "LLM request failed", message }
          : { error: message },
      );
      return;
    }
    res.status(502).json({
      error: "Failed to rephrase description",
      message: aborted
        ? `LLM request timed out after ${OLLAMA_TIMEOUT_MS / 1000}s. Increase OLLAMA_TIMEOUT_MS (e.g. 600000), warm the model on the Ollama host, or fix any proxy_read_timeout in front of Ollama.`
        : message,
    });
  }
});

router.get("/:projectId", async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [result] = await withTaskCounts([project]);
  res.json(result);
});

router.put("/:projectId", async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId);
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(projectsTable.id, projectId))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [result] = await withTaskCounts([project]);
  res.json(result);
  await sendTeamUpdateEmail({
    actorUserId: req.userId!,
    subject: `Project updated: ${project.name}`,
    intro: `A project was updated.`,
    details: [`Project: ${project.name}`, `Status: ${project.status}`],
    actionUrl: `${PM_TOOL_BASE_URL}/projects/${project.id}`,
    actionLabel: "Open project",
  });
});

router.delete("/:projectId", async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
  res.json({ success: true, message: "Project deleted" });
  if (project) {
    await sendTeamUpdateEmail({
      actorUserId: req.userId!,
      subject: `Project deleted: ${project.name}`,
      intro: `A project was deleted.`,
      details: [`Project: ${project.name}`],
      actionUrl: `${PM_TOOL_BASE_URL}/projects`,
      actionLabel: "View projects",
    });
  }
});

export default router;
