import { Router, type IRouter } from "express";
import { db, projectsTable, tasksTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";
import { sendTeamUpdateEmail } from "../lib/notifications.js";

const router: IRouter = Router();
const PM_TOOL_BASE_URL = process.env.PM_TOOL_BASE_URL ?? "http://localhost:5173";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://149.102.140.178:7869";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5:0.8b";

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
    actionUrl: `${PM_TOOL_BASE_URL}/projects/${project.id}`,
    actionLabel: "Open project",
  });
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

  const prompt = `Rephrase the following project description to be concise, professional, and clear.
Keep the same meaning and do not invent new scope.
Return only the rewritten description text, with no markdown, no bullet points, no quotes.

Project name: ${project.name}
Description:
${description}`;

  try {
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!ollamaResponse.ok) {
      res.status(502).json({ error: "LLM request failed" });
      return;
    }

    const payload = (await ollamaResponse.json()) as { response?: string };
    const rewritten = String(payload.response ?? "").trim();
    if (!rewritten) {
      res.status(502).json({ error: "LLM returned empty response" });
      return;
    }
    res.json({ description: rewritten });
  } catch {
    res.status(502).json({ error: "Failed to rephrase description" });
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
