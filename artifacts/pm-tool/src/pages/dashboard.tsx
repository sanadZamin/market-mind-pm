import { Layout } from "@/components/layout";
import { useMemo } from "react";
import {
  useListProjects,
  listTasks,
  Task,
  TaskPriority,
  TaskStatus,
} from "@workspace/api-client-react";
import { getAuthRequest } from "@/lib/api-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  FolderOpen,
  Layers,
  Link2,
  ListTodo,
  Sparkles,
  Target,
  UserCircle,
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQueries } from "@tanstack/react-query";

type TaskWithProject = Task & { projectName: string; projectColor: string };

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfNextDays(days: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDay(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? null : t;
}

function formatShortDate(iso: string | null | undefined): string {
  const d = parseDay(iso);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(s: TaskStatus): string {
  switch (s) {
    case "todo":
      return "To do";
    case "in_progress":
      return "In progress";
    case "in_review":
      return "In review";
    case "done":
      return "Done";
    default:
      return s;
  }
}

function priorityLabel(p: TaskPriority): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

const STATUS_BAR_CLASS: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-sky-500",
  in_review: "bg-violet-500",
  done: "bg-emerald-500",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: projects, isLoading: projectsLoading } = useListProjects({ request: getAuthRequest() });
  const projectTasksQueries = useQueries({
    queries: (projects ?? []).map((project) => ({
      queryKey: [`/api/projects/${project.id}/tasks`, "dashboard-aggregate"],
      queryFn: () => listTasks(project.id, undefined, getAuthRequest()),
      enabled: !!projects?.length,
    })),
  });

  const tasksLoading = projectTasksQueries.some((q) => q.isLoading);
  const tasksReady = !!projects?.length && projectTasksQueries.every((q) => !q.isLoading || q.data !== undefined);

  const allTasks: TaskWithProject[] = useMemo(() => {
    const out: TaskWithProject[] = [];
    (projects ?? []).forEach((project, idx) => {
      const tasks = (projectTasksQueries[idx]?.data ?? []) as Task[];
      for (const t of tasks) {
        out.push({
          ...t,
          projectName: project.name,
          projectColor: project.color,
        });
      }
    });
    return out;
  }, [projects, projectTasksQueries]);

  const now = new Date();
  const todayStart = startOfToday();
  const weekEnd = endOfNextDays(7);

  const stats = useMemo(() => {
    const totalProjects = projects?.length ?? 0;
    const activeProjects = projects?.filter((p) => p.status === "active").length ?? 0;
    const archivedProjects = projects?.filter((p) => p.status === "archived").length ?? 0;
    const completedProjects = projects?.filter((p) => p.status === "completed").length ?? 0;

    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter((t) => t.status === "done").length;
    const openTasks = totalTasks - doneTasks;
    const inMotionTasks = allTasks.filter((t) => t.status === "in_progress" || t.status === "in_review").length;

    const overdueTasks = allTasks.filter(
      (t) => !!t.dueDate && parseDay(t.dueDate)! < todayStart && t.status !== "done",
    );
    const dueThisWeekTasks = allTasks.filter((t) => {
      if (!t.dueDate || t.status === "done") return false;
      const due = parseDay(t.dueDate);
      if (!due) return false;
      return due >= todayStart && due <= weekEnd;
    });

    const blockedOpen = allTasks.filter(
      (t) => t.status !== "done" && Array.isArray(t.blockedByIds) && t.blockedByIds.length > 0,
    );

    const myId = user?.id;
    const myOpenTasks = myId
      ? allTasks.filter((t) => t.assigneeId === myId && t.status !== "done")
      : [];

    const statusCounts: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    };
    for (const t of allTasks) statusCounts[t.status]++;

    const priorityOpen: Record<TaskPriority, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    for (const t of allTasks) {
      if (t.status !== "done") priorityOpen[t.priority]++;
    }

    const totalTopLevel = allTasks.filter((t) => t.parentTaskId == null).length;
    const subtasks = allTasks.length - totalTopLevel;

    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return {
      totalProjects,
      activeProjects,
      archivedProjects,
      completedProjects,
      totalTasks,
      doneTasks,
      openTasks,
      inMotionTasks,
      overdueCount: overdueTasks.length,
      dueThisWeekCount: dueThisWeekTasks.length,
      blockedOpenCount: blockedOpen.length,
      myOpenCount: myOpenTasks.length,
      statusCounts,
      priorityOpen,
      totalTopLevel,
      subtasks,
      progress,
      overdueTasks,
      dueThisWeekTasks,
      myOpenTasks,
    };
  }, [allTasks, projects, todayStart, weekEnd, user?.id]);

  const upcomingSorted = useMemo(() => {
    return [...stats.dueThisWeekTasks].sort((a, b) => {
      const da = parseDay(a.dueDate)?.getTime() ?? 0;
      const db = parseDay(b.dueDate)?.getTime() ?? 0;
      return da - db;
    });
  }, [stats.dueThisWeekTasks]);

  const overdueSorted = useMemo(() => {
    return [...stats.overdueTasks].sort((a, b) => {
      const da = parseDay(a.dueDate)?.getTime() ?? 0;
      const db = parseDay(b.dueDate)?.getTime() ?? 0;
      return da - db;
    });
  }, [stats.overdueTasks]);

  const myAssignmentsSorted = useMemo(() => {
    return [...stats.myOpenTasks].sort((a, b) => {
      const da = parseDay(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const db = parseDay(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [stats.myOpenTasks]);

  const recentlyUpdated = useMemo(() => {
    return [...allTasks]
      .filter((t) => t.parentTaskId == null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);
  }, [allTasks]);

  const overdueByProject = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of stats.overdueTasks) {
      map.set(t.projectId, (map.get(t.projectId) ?? 0) + 1);
    }
    return map;
  }, [stats.overdueTasks]);

  const atRiskProjects = useMemo(() => {
    return [...(projects ?? [])]
      .map((p) => {
        const overdue = overdueByProject.get(p.id) ?? 0;
        const pct =
          p.taskCount > 0 ? Math.round((p.completedTaskCount / p.taskCount) * 100) : 0;
        const endPassed =
          !!p.endDate && new Date(p.endDate) < now && p.status !== "completed";
        return { project: p, overdue, completionPct: pct, endPassed };
      })
      .filter((row) => row.overdue > 0 || row.endPassed || row.completionPct < 35)
      .sort((a, b) => {
        if (b.overdue !== a.overdue) return b.overdue - a.overdue;
        return a.completionPct - b.completionPct;
      })
      .slice(0, 8);
  }, [projects, overdueByProject, now]);

  const statusTotalForBar = STATUS_ORDER.reduce((acc, s) => acc + stats.statusCounts[s], 0) || 1;

  const firstName = user?.name?.split(/\s+/)[0] ?? "there";
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });

  const kpiCards = [
    {
      label: "Active projects",
      value: stats.activeProjects,
      sub: `${stats.totalProjects} total`,
      icon: Briefcase,
      color: "text-sky-400",
      bg: "bg-sky-400/10",
    },
    {
      label: "Open tasks",
      value: stats.openTasks,
      sub: `${stats.inMotionTasks} in motion`,
      icon: ListTodo,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Due this week",
      value: stats.dueThisWeekCount,
      sub: "next 7 days",
      icon: CalendarClock,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      label: "Overdue",
      value: stats.overdueCount,
      sub: stats.overdueCount ? "needs attention" : "all clear",
      icon: AlertTriangle,
      color: stats.overdueCount ? "text-red-300" : "text-muted-foreground",
      bg: stats.overdueCount ? "bg-red-500/10" : "bg-secondary/60",
    },
    {
      label: "Assigned to you",
      value: stats.myOpenCount,
      sub: user ? "open items" : "sign in to track",
      icon: UserCircle,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
    },
    {
      label: "Blocked (open)",
      value: stats.blockedOpenCount,
      sub: "waiting on deps",
      icon: Link2,
      color: "text-orange-300",
      bg: "bg-orange-500/10",
    },
    {
      label: "Completed",
      value: stats.doneTasks,
      sub: `${stats.progress}% of all tasks`,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Workspace depth",
      value: stats.subtasks,
      sub: `${stats.totalTopLevel} top-level tasks`,
      icon: Layers,
      color: "text-teal-400",
      bg: "bg-teal-400/10",
    },
  ];

  return (
    <Layout>
      <div className="p-6 sm:p-8 max-w-7xl mx-auto pb-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>
                {weekday}, {formatShortDate(now.toISOString())}
              </span>
            </div>
            <h1 className="text-3xl font-bold font-display text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Hi {firstName} — here is a snapshot of workload, deadlines, and where to focus next.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/projects">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors">
                <FolderOpen className="w-4 h-4 text-primary" />
                All projects
              </span>
            </Link>
            <Link href="/projects">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15 transition-colors">
                <Target className="w-4 h-4" />
                Plan work
              </span>
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg shadow-black/5 hover:border-border/80 transition-all h-full">
                <CardContent className="p-5 flex items-start gap-3">
                  <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0", stat.bg)}>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold font-display text-foreground tabular-nums mt-0.5">
                      {tasksLoading && !tasksReady ? "—" : stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {stats.overdueCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">
                {stats.overdueCount} task{stats.overdueCount !== 1 ? "s are" : " is"} past due — reprioritize or move dates.
              </span>
            </div>
            {overdueSorted[0] && (
              <Link
                href={`/projects/${overdueSorted[0].projectId}?taskId=${overdueSorted[0].id}`}
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Open oldest overdue
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Recent projects
                </h2>
                <Link href="/projects" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
                  View all
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-44 rounded-2xl bg-card/50 animate-pulse border border-border/50" />
                  ))
                ) : (
                  (projects ?? []).slice(0, 6).map((project, i) => {
                    const overdueTasks = overdueByProject.get(project.id) ?? 0;
                    const projectBehindSchedule =
                      !!project.endDate && new Date(project.endDate) < now && project.status !== "completed";
                    const pct =
                      project.taskCount > 0
                        ? Math.round((project.completedTaskCount / project.taskCount) * 100)
                        : 0;
                    return (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + i * 0.04 }}
                      >
                        <Link href={`/projects/${project.id}`}>
                          <Card className="h-full border-border/50 bg-card hover:bg-secondary/35 transition-all cursor-pointer group shadow-md hover:shadow-lg hover:-translate-y-0.5 duration-300">
                            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                                <CardTitle className="text-base font-bold font-display truncate group-hover:text-primary transition-colors">
                                  {project.name}
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                {overdueTasks > 0 && (
                                  <Badge variant="destructive" className="text-[10px] gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {overdueTasks} late
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                                  {project.status}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
                                {project.description || "No description yet."}
                              </p>
                              {projectBehindSchedule && (
                                <div className="mb-3 text-xs text-red-300 bg-red-500/10 border border-red-400/25 rounded-lg px-2 py-1 inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  End date passed
                                </div>
                              )}
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Progress</span>
                                  <span className="font-semibold text-foreground tabular-nums">{pct}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: project.color,
                                    }}
                                  />
                                </div>
                                <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                                  <span>
                                    {project.completedTaskCount} / {project.taskCount} tasks
                                  </span>
                                  <span className="tabular-nums">{project.taskCount - project.completedTaskCount} open</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </section>

            {atRiskProjects.length > 0 && (
              <section>
                <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  Projects needing attention
                </h2>
                <Card className="border-border/50 bg-card/60 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-muted-foreground text-xs uppercase tracking-wide">
                          <th className="px-4 py-3 font-semibold">Project</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold text-right">Overdue</th>
                          <th className="px-4 py-3 font-semibold text-right">Done %</th>
                          <th className="px-4 py-3 font-semibold text-right">Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atRiskProjects.map(({ project, overdue, completionPct, endPassed }) => (
                          <tr key={project.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30">
                            <td className="px-4 py-3">
                              <Link href={`/projects/${project.id}`} className="font-medium text-foreground hover:text-primary inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                                <span className="truncate max-w-[200px] sm:max-w-xs">{project.name}</span>
                                {endPassed && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-[10px]">
                                {project.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {overdue > 0 ? <span className="text-red-300 font-semibold">{overdue}</span> : "—"}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{completionPct}%</td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {Math.max(0, project.taskCount - project.completedTaskCount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            )}
          </div>

          <div className="xl:col-span-4 space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-lg shadow-black/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <CircleDot className="w-4 h-4 text-primary" />
                  Task status mix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex h-3 w-full rounded-full overflow-hidden ring-1 ring-border/50">
                  {STATUS_ORDER.map((s) => {
                    const n = stats.statusCounts[s];
                    const w = (n / statusTotalForBar) * 100;
                    if (w <= 0) return null;
                    return (
                      <div
                        key={s}
                        className={cn(STATUS_BAR_CLASS[s], "min-w-[4px] transition-all")}
                        style={{ width: `${w}%` }}
                        title={`${statusLabel(s)}: ${n}`}
                      />
                    );
                  })}
                </div>
                <ul className="grid grid-cols-2 gap-2 text-xs">
                  {STATUS_ORDER.map((s) => (
                    <li key={s} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-2 py-1.5">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className={cn("w-2 h-2 rounded-full", STATUS_BAR_CLASS[s])} />
                        {statusLabel(s)}
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">{stats.statusCounts[s]}</span>
                    </li>
                  ))}
                </ul>
                <Separator className="bg-border/60" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Open by priority</p>
                  <div className="flex flex-wrap gap-2">
                    {(["urgent", "high", "medium", "low"] as TaskPriority[]).map((p) => (
                      <Badge key={p} variant="outline" className="text-[11px] font-normal">
                        {priorityLabel(p)}:{" "}
                        <span className="font-semibold ml-0.5">{stats.priorityOpen[p]}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-lg shadow-black/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-amber-400" />
                  Due in the next 7 days
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {tasksLoading && !tasksReady ? (
                  <p className="text-sm text-muted-foreground py-4">Loading tasks…</p>
                ) : upcomingSorted.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No deadlines in this window.</p>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {upcomingSorted.slice(0, 7).map((t) => (
                      <li key={t.id} className="py-2.5 first:pt-0">
                        <Link
                          href={`/projects/${t.projectId}?taskId=${t.id}`}
                          className="group block hover:bg-secondary/30 -mx-1 px-1 rounded-lg transition-colors"
                        >
                          <p className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-1">{t.title}</p>
                          <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span className="truncate">{t.projectName}</span>
                            <span className="shrink-0 tabular-nums text-amber-200/90">{formatShortDate(t.dueDate)}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-lg shadow-black/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-violet-400" />
                  Assigned to you
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <p className="text-sm text-muted-foreground">Sign in to see personal assignments.</p>
                ) : tasksLoading && !tasksReady ? (
                  <p className="text-sm text-muted-foreground py-2">Loading…</p>
                ) : myAssignmentsSorted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open tasks assigned to you. Nice.</p>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {myAssignmentsSorted.slice(0, 6).map((t) => (
                      <li key={t.id} className="py-2.5 first:pt-0">
                        <Link
                          href={`/projects/${t.projectId}?taskId=${t.id}`}
                          className="group block hover:bg-secondary/30 -mx-1 px-1 rounded-lg transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-2 flex-1">{t.title}</p>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {priorityLabel(t.priority)}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 truncate">{t.projectName}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-lg shadow-black/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  Recently updated
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasksLoading && !tasksReady ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : recentlyUpdated.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {recentlyUpdated.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/projects/${t.projectId}?taskId=${t.id}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm hover:border-primary/30 hover:bg-secondary/20 transition-colors"
                        >
                          <span className="truncate font-medium">{t.title}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                            {formatShortDate(t.updatedAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
