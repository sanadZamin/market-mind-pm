import { Router, type IRouter } from "express";
import { db, commentsTable, usersTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { CreateCommentBody } from "@workspace/api-zod";
import { sendTeamUpdateEmail } from "../lib/notifications.js";

const router: IRouter = Router();
const PM_TOOL_BASE_URL = process.env.PM_TOOL_BASE_URL ?? "http://localhost:5173";
const getTaskLink = (projectId: number, taskId: number) =>
  `${PM_TOOL_BASE_URL}/projects/${projectId}?taskId=${taskId}`;

router.use(requireAuth as any);

router.get("/tasks/:taskId/comments", async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId);
  const comments = await db.select().from(commentsTable).where(eq(commentsTable.taskId, taskId)).orderBy(commentsTable.createdAt);
  
  const result = await Promise.all(comments.map(async (comment) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, comment.userId));
    return {
      ...comment,
      user: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role, createdAt: user.createdAt.toISOString() } : null,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }));
  
  res.json(result);
});

router.post("/tasks/:taskId/comments", async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }
  const [comment] = await db
    .insert(commentsTable)
    .values({ content: parsed.data.content, taskId, userId: req.userId! })
    .returning();
  
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, comment.userId));
  res.status(201).json({
    ...comment,
    user: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role, createdAt: user.createdAt.toISOString() } : null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  });
  await sendTeamUpdateEmail({
    actorUserId: req.userId!,
    subject: `New comment on task #${taskId}`,
    intro: `A comment was added to a task.`,
    details: [`Task ID: ${taskId}`],
    actionUrl: task ? getTaskLink(task.projectId, taskId) : `${PM_TOOL_BASE_URL}/projects`,
    actionLabel: "Open task",
  });
});

export default router;
