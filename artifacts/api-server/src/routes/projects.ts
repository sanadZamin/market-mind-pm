import { Router, type IRouter } from "express";
import { db, projectsTable, tasksTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";
import { sendTeamUpdateEmail } from "../lib/notifications.js";

const router: IRouter = Router();
const PM_TOOL_BASE_URL = process.env.PM_TOOL_BASE_URL ?? "http://localhost:5173";

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

router.get("/:projectId", async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
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
