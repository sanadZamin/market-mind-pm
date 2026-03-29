import { Router, type IRouter } from "express";
import { db, tasksTable, usersTable, taskDependenciesTable } from "@workspace/db";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { CreateTaskBody, UpdateTaskBody, ListTasksQueryParams } from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

router.use(requireAuth as any);

type RawTask = typeof tasksTable.$inferSelect;

async function enrichTasks(tasks: RawTask[]) {
  if (tasks.length === 0) return [];

  const ids = tasks.map(t => t.id);

  // Batch: assignee + reporter user IDs
  const allUserIds = [...new Set(tasks.flatMap(t => [t.assigneeId, t.reporterId].filter(Boolean) as number[]))];
  const users = allUserIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, allUserIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, role: u.role, createdAt: u.createdAt.toISOString() }]));

  // Batch: subtask counts
  const subtaskCounts = new Map<number, number>();
  for (const t of tasks) subtaskCounts.set(t.id, 0);
  const allSubtasks = ids.length > 0
    ? await db.select({ parentTaskId: tasksTable.parentTaskId }).from(tasksTable).where(inArray(tasksTable.parentTaskId, ids))
    : [];
  for (const s of allSubtasks) {
    if (s.parentTaskId) subtaskCounts.set(s.parentTaskId, (subtaskCounts.get(s.parentTaskId) || 0) + 1);
  }

  // Batch: dependencies
  const deps = ids.length > 0
    ? await db.select().from(taskDependenciesTable)
        .where(or(inArray(taskDependenciesTable.taskId, ids), inArray(taskDependenciesTable.dependsOnTaskId, ids)))
    : [];

  return tasks.map(task => {
    const blockedByIds = deps.filter(d => d.taskId === task.id).map(d => d.dependsOnTaskId);
    const blockingIds  = deps.filter(d => d.dependsOnTaskId === task.id).map(d => d.taskId);
    return {
      ...task,
      tags: Array.isArray(task.tags) ? task.tags : [],
      assignee: task.assigneeId ? (userMap.get(task.assigneeId) || null) : null,
      reporter: userMap.get(task.reporterId) || null,
      subtaskCount: subtaskCounts.get(task.id) || 0,
      blockedByIds,
      blockingIds,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  });
}

// ── LIST tasks for a project (top-level only unless parentTaskId specified) ──
router.get("/projects/:projectId/tasks", async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId);
  const queryParsed = ListTasksQueryParams.safeParse(req.query);

  const conditions: any[] = [eq(tasksTable.projectId, projectId)];
  if (queryParsed.success) {
    if (queryParsed.data.status) conditions.push(eq(tasksTable.status, queryParsed.data.status as any));
    if (queryParsed.data.priority) conditions.push(eq(tasksTable.priority, queryParsed.data.priority as any));
  }

  // Only return top-level tasks (no parent) by default
  conditions.push(isNull(tasksTable.parentTaskId));

  const tasks = await db.select().from(tasksTable).where(and(...conditions)).orderBy(tasksTable.position, tasksTable.createdAt);
  res.json(await enrichTasks(tasks));
});

// ── CREATE task in a project ──
router.post("/projects/:projectId/tasks", async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId);
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const existingTasks = await db.select({ position: tasksTable.position }).from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const maxPosition = existingTasks.reduce((max, t) => Math.max(max, t.position), -1);

  const [task] = await db.insert(tasksTable).values({
    ...parsed.data,
    tags: parsed.data.tags ?? [],
    projectId,
    reporterId: req.userId!,
    status: (parsed.data.status as any) ?? "todo",
    priority: (parsed.data.priority as any) ?? "medium",
    position: maxPosition + 1,
  }).returning();
  const [result] = await enrichTasks([task]);
  res.status(201).json(result);
});

// ── GET single task ──
router.get("/tasks/:taskId", async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  const [result] = await enrichTasks([task]);
  res.json(result);
});

// ── UPDATE task ──
router.put("/tasks/:taskId", async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId);
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }
  const [task] = await db.update(tasksTable).set({ ...parsed.data, updatedAt: new Date() } as any).where(eq(tasksTable.id, taskId)).returning();
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  const [result] = await enrichTasks([task]);
  res.json(result);
});

// ── DELETE task ──
router.delete("/tasks/:taskId", async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId);
  await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
  res.json({ success: true, message: "Task deleted" });
});

// ── LIST subtasks ──
router.get("/tasks/:taskId/subtasks", async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId);
  const subtasks = await db.select().from(tasksTable).where(eq(tasksTable.parentTaskId, taskId)).orderBy(tasksTable.position, tasksTable.createdAt);
  res.json(await enrichTasks(subtasks));
});

// ── CREATE subtask ──
router.post("/tasks/:taskId/subtasks", async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId);
  const parent = await db.select({ projectId: tasksTable.projectId }).from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!parent[0]) { res.status(404).json({ error: "Parent task not found" }); return; }

  const { title, status, priority, assigneeId, dueDate } = req.body;
  if (!title) { res.status(400).json({ error: "Title is required" }); return; }

  const [subtask] = await db.insert(tasksTable).values({
    title,
    status: status ?? "todo",
    priority: priority ?? "medium",
    assigneeId: assigneeId || null,
    dueDate: dueDate || null,
    projectId: parent[0].projectId,
    reporterId: req.userId!,
    parentTaskId: taskId,
    tags: [],
    position: 0,
  }).returning();
  const [result] = await enrichTasks([subtask]);
  res.status(201).json(result);
});

// ── GET dependencies for a task ──
router.get("/tasks/:taskId/dependencies", async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId);
  const deps = await db.select().from(taskDependenciesTable).where(eq(taskDependenciesTable.taskId, taskId));

  // Enrich with task info
  const enriched = await Promise.all(deps.map(async (dep) => {
    const [t] = await db.select().from(tasksTable).where(eq(tasksTable.id, dep.dependsOnTaskId));
    return { ...dep, dependsOnTask: t ? { id: t.id, title: t.title, status: t.status } : null, createdAt: dep.createdAt.toISOString() };
  }));

  res.json(enriched);
});

// ── ADD a dependency (this task is blocked by dependsOnTaskId) ──
router.post("/tasks/:taskId/dependencies", async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId);
  const { dependsOnTaskId } = req.body;

  if (!dependsOnTaskId || dependsOnTaskId === taskId) {
    res.status(400).json({ error: "Invalid dependsOnTaskId" });
    return;
  }

  // Prevent duplicate
  const existing = await db.select().from(taskDependenciesTable)
    .where(and(eq(taskDependenciesTable.taskId, taskId), eq(taskDependenciesTable.dependsOnTaskId, dependsOnTaskId)));
  if (existing.length > 0) {
    res.status(409).json({ error: "Dependency already exists" });
    return;
  }

  const [dep] = await db.insert(taskDependenciesTable).values({ taskId, dependsOnTaskId }).returning();
  const [blocker] = await db.select().from(tasksTable).where(eq(tasksTable.id, dependsOnTaskId));
  res.status(201).json({
    ...dep,
    dependsOnTask: blocker ? { id: blocker.id, title: blocker.title, status: blocker.status } : null,
    createdAt: dep.createdAt.toISOString(),
  });
});

// ── REMOVE a dependency ──
router.delete("/tasks/:taskId/dependencies/:dependsOnId", async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId);
  const dependsOnId = parseInt(req.params.dependsOnId);
  await db.delete(taskDependenciesTable)
    .where(and(eq(taskDependenciesTable.taskId, taskId), eq(taskDependenciesTable.dependsOnTaskId, dependsOnId)));
  res.json({ success: true, message: "Dependency removed" });
});

export default router;
