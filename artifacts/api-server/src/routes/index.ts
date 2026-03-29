import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import projectsRouter from "./projects.js";
import tasksRouter from "./tasks.js";
import commentsRouter from "./comments.js";
import usersRouter from "./users.js";
import importExcelRouter from "./import-excel.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/projects", projectsRouter);
router.use(tasksRouter);
router.use(importExcelRouter);
router.use(commentsRouter);
router.use("/users", usersRouter);

export default router;
