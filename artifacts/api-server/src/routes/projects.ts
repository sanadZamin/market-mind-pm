import { Router, type IRouter } from "express";
import { db, projectsTable, tasksTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";
import { sendTeamUpdateEmail } from "../lib/notifications.js";
import { resolvePmToolBaseUrl } from "../lib/pm-tool-base-url.js";
import {
  buildProjectRephrasePrompt,
  callOllamaForRephrase,
  rephraseOllamaTimeoutMs,
} from "../lib/rephrase-ollama.js";

const router: IRouter = Router();

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
    actionUrl: `${resolvePmToolBaseUrl()}/projects/${project.id}`,
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
  const prompt = buildProjectRephrasePrompt(projectName, description);
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
        ? `LLM request timed out after ${rephraseOllamaTimeoutMs() / 1000}s. Increase OLLAMA_TIMEOUT_MS (e.g. 600000), warm the model on the Ollama host, or fix any proxy_read_timeout in front of Ollama.`
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

  const prompt = buildProjectRephrasePrompt(project.name, description);
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
        ? `LLM request timed out after ${rephraseOllamaTimeoutMs() / 1000}s. Increase OLLAMA_TIMEOUT_MS (e.g. 600000), warm the model on the Ollama host, or fix any proxy_read_timeout in front of Ollama.`
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
    actionUrl: `${resolvePmToolBaseUrl()}/projects/${project.id}`,
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
      actionUrl: `${resolvePmToolBaseUrl()}/projects`,
      actionLabel: "View projects",
    });
  }
});

export default router;
