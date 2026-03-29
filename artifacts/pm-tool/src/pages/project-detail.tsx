import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { ExcelImportDialog } from "@/components/excel-import-dialog";
import { useRoute } from "wouter";
import {
  useGetProject,
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useListUsers,
  useGetTask,
  useListComments,
  useCreateComment,
  useListSubtasks,
  useCreateSubtask,
  useListTaskDependencies,
  useAddTaskDependency,
  useRemoveTaskDependency,
  useDeleteTask,
  updateTask,
  addTaskDependency,
  createTask,
  createSubtask,
  createComment,
  removeTaskDependency,
  deleteTask,
  listSubtasks,
  Task,
  User,
  TaskStatus,
  TaskDependency,
} from "@workspace/api-client-react";
import { getAuthRequest } from "@/lib/api-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, differenceInDays, addDays, startOfDay, isPast, isToday } from "date-fns";
import {
  Plus, List, Trello, CalendarDays, MoreHorizontal, MessageSquare,
  Clock, AlignLeft, Calendar as CalendarIcon, GitBranch, User as UserIcon,
  ChevronRight, ChevronDown, Link2, X, CheckSquare, AlertTriangle, Layers, FileSpreadsheet, Trash2
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { motion } from "framer-motion";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  todo:        { label: "To Do",       color: "text-slate-400",  bg: "bg-slate-400/10 border-slate-400/20",   dot: "bg-slate-400" },
  in_progress: { label: "In Progress", color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20",     dot: "bg-blue-400" },
  in_review:   { label: "In Review",   color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/20",   dot: "bg-amber-400" },
  done:        { label: "Done",        color: "text-emerald-400",bg: "bg-emerald-400/10 border-emerald-400/20",dot: "bg-emerald-400" },
};

const PRIORITY_CONFIG: Record<string, string> = {
  low:    "bg-slate-500/20 text-slate-300",
  medium: "bg-blue-500/20 text-blue-300",
  high:   "bg-amber-500/20 text-amber-300",
  urgent: "bg-red-500/20 text-red-300 font-bold",
};

const taskSchema = z.object({
  title:       z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status:      z.enum(["todo", "in_progress", "in_review", "done"]),
  priority:    z.enum(["low", "medium", "high", "urgent"]),
  assigneeId:  z.coerce.number().optional().nullable(),
  startDate:   z.string().optional(),
  dueDate:     z.string().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId  = Number(params?.id);
  const { data: project } = useGetProject(projectId, { request: getAuthRequest() });
  const { data: tasks }   = useListTasks(projectId, undefined, { request: getAuthRequest() });
  const { data: users }   = useListUsers({ request: getAuthRequest() });

  const [view, setView]                 = useState("board");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  if (!project || !tasks) return (
    <Layout><div className="flex h-full items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div></Layout>
  );

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Project Header */}
        <div className="px-8 py-6 border-b border-border/50 bg-background/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: project.color }}>
                <Trello className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(true)} className="rounded-xl h-10 px-4 gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Import Excel
              </Button>
              <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl shadow-lg shadow-primary/20 h-10 px-5 gap-2">
                <Plus className="w-4 h-4" /> Add Task
              </Button>
            </div>
          </div>

          <Tabs value={view} onValueChange={setView} className="w-full">
            <TabsList className="bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="board" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Trello className="w-4 h-4 mr-2"/> Board</TabsTrigger>
              <TabsTrigger value="list"  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><List className="w-4 h-4 mr-2"/> List</TabsTrigger>
              <TabsTrigger value="gantt" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><CalendarDays className="w-4 h-4 mr-2"/> Timeline</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-hidden relative bg-gradient-to-br from-background to-secondary/10">
          <div className="absolute inset-0 overflow-auto p-8">
            {view === "board" && <TaskBoard tasks={tasks} projectId={projectId} onTaskClick={setSelectedTaskId} users={users || []} />}
            {view === "list"  && <TaskList  tasks={tasks} onTaskClick={setSelectedTaskId} projectId={projectId} />}
            {view === "gantt" && <TaskGantt tasks={tasks} onTaskClick={setSelectedTaskId} projectId={projectId} />}
          </div>
        </div>
      </div>

      <CreateTaskDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} projectId={projectId} users={users || []} />
      <ExcelImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} projectId={projectId} />
      <TaskDetailSheet  taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} users={users || []} projectId={projectId} allTasks={tasks} />
    </Layout>
  );
}

// ─── KANBAN BOARD ──────────────────────────────────────────────────────────────
function TaskBoard({ tasks, projectId, onTaskClick, users }: { tasks: Task[]; projectId: number; onTaskClick: (id: number) => void; users: User[] }) {
  const updateMutation = useUpdateTask();
  const queryClient    = useQueryClient();
  const columns = ["todo", "in_progress", "in_review", "done"];

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const taskId   = Number(draggableId);
    const newStatus = destination.droppableId as TaskStatus;
    await updateTask(taskId, { status: newStatus }, getAuthRequest());
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-6 items-start min-w-max pb-8">
        {columns.map((colId) => {
          const colTasks = tasks.filter(t => t.status === colId).sort((a, b) => a.position - b.position);
          const config   = STATUS_CONFIG[colId];
          return (
            <div key={colId} className="flex flex-col w-80 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                  <h3 className="font-semibold text-foreground">{config.label}</h3>
                  <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
              </div>

              <Droppable droppableId={colId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={clsx(
                      "p-2 -m-2 rounded-2xl transition-colors min-h-[150px]",
                      snapshot.isDraggingOver && "bg-secondary/40 border-2 border-dashed border-primary/30"
                    )}
                  >
                    {colTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="mb-3"
                            style={{ ...provided.draggableProps.style }}
                            onClick={() => !snapshot.isDragging && onTaskClick(task.id)}
                          >
                            <KanbanCard task={task} isDragging={snapshot.isDragging} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

function KanbanCard({ task, isDragging }: { task: Task; isDragging: boolean }) {
  const isBlocked   = (task.blockedByIds?.length ?? 0) > 0;
  const subtaskCount = task.subtaskCount ?? 0;
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "done";
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  return (
    <Card className={clsx(
      "border border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer bg-card/95 backdrop-blur",
      isDragging && "shadow-xl border-primary scale-105 rotate-2 z-50 opacity-90"
    )}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className={`text-[10px] uppercase border-none ${PRIORITY_CONFIG[task.priority]}`}>
            {task.priority}
          </Badge>
          <div className="flex items-center gap-1">
            {isBlocked && (
              <span className="flex items-center gap-0.5 text-[10px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full border border-orange-400/20">
                <AlertTriangle className="w-2.5 h-2.5" /> Blocked
              </span>
            )}
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <h4 className="font-semibold text-sm mb-3 leading-snug">{task.title}</h4>

        {subtaskCount > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
            <CheckSquare className="w-3 h-3" />
            <span>{subtaskCount} subtask{subtaskCount !== 1 ? "s" : ""}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center text-xs">
            {task.dueDate && (
              <span className={clsx(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]",
                isOverdue ? "text-red-400 bg-red-400/10" : isDueToday ? "text-amber-400 bg-amber-400/10" : "text-muted-foreground"
              )}>
                <Clock className="w-3 h-3" />
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
          </div>
          <Avatar className="w-7 h-7 border border-border">
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
              {task.assignee?.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── LIST VIEW ─────────────────────────────────────────────────────────────────
type SortKey = "title" | "status" | "priority" | "dueDate" | "assignee";
type SortDir = "asc" | "desc";
const PRIORITY_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
const STATUS_ORDER:   Record<string, number> = { todo: 1, in_progress: 2, in_review: 3, done: 4 };

function TaskList({ tasks, onTaskClick, projectId }: { tasks: Task[]; onTaskClick: (id: number) => void; projectId: number }) {
  const [sort, setSort]         = useState<{ key: SortKey; dir: SortDir }>({ key: "title", dir: "asc" });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [subtaskCache, setSubtaskCache] = useState<Map<number, Task[]>>(new Map());
  const [loadingExpand, setLoadingExpand] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const toggleExpand = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    if (expanded.has(taskId)) {
      setExpanded(prev => { const n = new Set(prev); n.delete(taskId); return n; });
      return;
    }
    if (!subtaskCache.has(taskId)) {
      setLoadingExpand(prev => new Set(prev).add(taskId));
      try {
        const subs = await listSubtasks(taskId, getAuthRequest());
        setSubtaskCache(prev => new Map(prev).set(taskId, subs));
      } finally {
        setLoadingExpand(prev => { const n = new Set(prev); n.delete(taskId); return n; });
      }
    }
    setExpanded(prev => new Set(prev).add(taskId));
  };

  const toggleSort = (key: SortKey) =>
    setSort(prev => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  const sortedTasks = [...tasks].sort((a, b) => {
    let cmp = 0;
    if      (sort.key === "title")    cmp = a.title.localeCompare(b.title);
    else if (sort.key === "status")   cmp = (STATUS_ORDER[a.status] ?? 0)   - (STATUS_ORDER[b.status] ?? 0);
    else if (sort.key === "priority") cmp = (PRIORITY_ORDER[a.priority ?? "medium"] ?? 0) - (PRIORITY_ORDER[b.priority ?? "medium"] ?? 0);
    else if (sort.key === "dueDate")  cmp = (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
    else if (sort.key === "assignee") cmp = (a.assignee?.name ?? "").localeCompare(b.assignee?.name ?? "");
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const allSelected  = sortedTasks.length > 0 && selected.size === sortedTasks.length;
  const someSelected = selected.size > 0 && selected.size < sortedTasks.length;
  const toggleAll    = () => setSelected(allSelected ? new Set() : new Set(sortedTasks.map(t => t.id)));
  const toggleOne    = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulkSetStatus = async (status: TaskStatus) => {
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map(id => updateTask(id, { status }, getAuthRequest())));
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      toast({ title: `${selected.size} task${selected.size !== 1 ? "s" : ""} updated` });
      setSelected(new Set());
    } catch { toast({ variant: "destructive", title: "Bulk update failed" }); }
    finally { setBulkBusy(false); }
  };

  // Column header with sort indicator
  const SortTh = ({ label, sk, className }: { label: string; sk: SortKey; className?: string }) => {
    const active = sort.key === sk;
    return (
      <th className={clsx("px-6 py-4", className)}>
        <button
          className={clsx("flex items-center gap-1 font-semibold uppercase tracking-wide text-xs transition-colors hover:text-foreground", active ? "text-foreground" : "text-muted-foreground")}
          onClick={() => toggleSort(sk)}
        >
          {label}
          <span className="text-[10px] opacity-60 ml-0.5">
            {active ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-2">
      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/30 rounded-xl">
          <span className="text-sm font-semibold text-primary shrink-0">
            {selected.size} selected
          </span>
          <span className="text-xs text-muted-foreground shrink-0">Set status:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[string]][]).map(([key, cfg]) => (
              <button
                key={key}
                disabled={bulkBusy}
                onClick={() => bulkSetStatus(key)}
                className={clsx(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95",
                  cfg.bg, cfg.color,
                  bulkBusy && "opacity-50 cursor-not-allowed"
                )}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          <button
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl shadow-black/5">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase font-semibold">
            <tr>
              {/* Checkbox column */}
              <th className="pl-4 pr-2 py-4 rounded-tl-2xl w-10">
                <Checkbox
                  checked={someSelected ? "indeterminate" : allSelected}
                  onCheckedChange={toggleAll}
                  className="border-muted-foreground/40"
                />
              </th>
              <SortTh label="Title"    sk="title" />
              <SortTh label="Status"   sk="status" />
              <SortTh label="Priority" sk="priority" />
              <SortTh label="Deadline" sk="dueDate" />
              <SortTh label="Owner"    sk="assignee" />
              <th className="px-6 py-4 rounded-tr-2xl text-muted-foreground text-xs uppercase font-semibold">Subtasks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sortedTasks.flatMap(task => {
              const isBlocked   = (task.blockedByIds?.length ?? 0) > 0;
              const isOverdue   = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "done";
              const isSelected  = selected.has(task.id);
              const hasSubtasks = (task.subtaskCount ?? 0) > 0;
              const isExpanded  = expanded.has(task.id);
              const isLoading   = loadingExpand.has(task.id);
              const subtasks    = subtaskCache.get(task.id) ?? [];

              const parentRow = (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className={clsx(
                    "hover:bg-secondary/30 transition-colors cursor-pointer group",
                    isSelected && "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  {/* Checkbox cell */}
                  <td className="pl-4 pr-2 py-4 w-10" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(task.id)}
                      className="border-muted-foreground/40"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Expand/collapse chevron */}
                      {hasSubtasks ? (
                        <button
                          onClick={e => toggleExpand(e, task.id)}
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                        >
                          {isLoading
                            ? <span className="w-3.5 h-3.5 inline-block animate-spin border border-t-primary rounded-full" />
                            : isExpanded
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronRight className="w-3.5 h-3.5" />
                          }
                        </button>
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      {isBlocked && <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">{task.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("px-2.5 py-1 rounded-full text-xs font-medium border", STATUS_CONFIG[task.status].bg, STATUS_CONFIG[task.status].color)}>
                      {STATUS_CONFIG[task.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`text-[10px] uppercase border-none ${PRIORITY_CONFIG[task.priority]}`}>{task.priority}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    {task.dueDate ? (
                      <span className={clsx("flex items-center gap-1 text-xs", isOverdue ? "text-red-400" : "text-muted-foreground")}>
                        {isOverdue && <AlertTriangle className="w-3 h-3" />}
                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </span>
                    ) : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{task.assignee?.name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{task.assignee?.name || "Unassigned"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {hasSubtasks ? (
                      <button
                        onClick={e => toggleExpand(e, task.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> {task.subtaskCount}
                      </button>
                    ) : <span className="text-muted-foreground/40">—</span>}
                  </td>
                </tr>
              );

              const subtaskRows = (isExpanded ? subtasks : []).map((sub, idx) => {
                const subOverdue = sub.dueDate && isPast(new Date(sub.dueDate)) && sub.status !== "done";
                const isLast     = idx === subtasks.length - 1;
                return (
                  <tr
                    key={`sub-${sub.id}`}
                    onClick={() => onTaskClick(sub.id)}
                    className={clsx(
                      "hover:bg-secondary/20 transition-colors cursor-pointer group",
                      selected.has(sub.id) ? "bg-primary/5 hover:bg-primary/10" : "bg-secondary/10"
                    )}
                  >
                    <td className="pl-4 pr-2 py-3 w-10" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(sub.id)}
                        onCheckedChange={() => toggleOne(sub.id)}
                        className="border-muted-foreground/40"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 pl-6 relative">
                        {/* Tree connector line */}
                        <span
                          className="absolute left-0 top-0 bottom-0 flex flex-col items-center"
                          style={{ width: 16 }}
                        >
                          <span className="w-px flex-1 bg-border/60" style={{ marginLeft: 7, marginTop: isLast ? 0 : undefined }} />
                          <span className="w-2.5 h-px bg-border/60 self-end mb-auto" style={{ marginLeft: 7 }} />
                        </span>
                        <span className="w-3.5 shrink-0" />
                        <span className="text-sm text-foreground/80 group-hover:text-primary transition-colors">{sub.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium border", STATUS_CONFIG[sub.status].bg, STATUS_CONFIG[sub.status].color)}>
                        {STATUS_CONFIG[sub.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className={`text-[10px] uppercase border-none ${PRIORITY_CONFIG[sub.priority]}`}>{sub.priority}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      {sub.dueDate ? (
                        <span className={clsx("flex items-center gap-1 text-xs", subOverdue ? "text-red-400" : "text-muted-foreground")}>
                          {subOverdue && <AlertTriangle className="w-3 h-3" />}
                          {format(new Date(sub.dueDate), "MMM d, yyyy")}
                        </span>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[9px] bg-accent/20 text-accent">{sub.assignee?.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{sub.assignee?.name || "Unassigned"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-muted-foreground/40">—</span>
                    </td>
                  </tr>
                );
              });

              return [parentRow, ...subtaskRows];
            })}
          </tbody>
        </table>
        {sortedTasks.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">No tasks yet.</div>
        )}
      </div>
    </div>
  );
}

// ─── GANTT (interactive) ────────────────────────────────────────────────────────
const ROW_H    = 48;
const ROW_GAP  = 4;
const ROW_STEP = ROW_H + ROW_GAP; // 52 px  (unchanged — keeps arrow math identical)
const BAR_TOP  = 10;
const BAR_H    = 28;
const SUB_BAR_H   = 18;
const SUB_BAR_TOP = 15; // (48 - 18) / 2
const LABEL_W  = 260;
const DAY_W    = 40;

type GDragState =
  | { mode: "move" | "resize-left" | "resize-right"; taskId: number; origStart: string; origEnd: string; startX: number }
  | { mode: "connect"; fromTaskId: number; fromX: number; fromY: number }
  | null;

type GanttRow =
  | { isSubtask: false; task: Task }
  | { isSubtask: true;  task: Task; parentId: number };

function TaskGantt({ tasks, onTaskClick, projectId }: { tasks: Task[]; onTaskClick: (id: number) => void; projectId: number }) {
  // ── hooks ──────────────────────────────────────────────────────────────────
  const [dragMode, setDragMode]       = useState<string | null>(null);
  const [preview, setPreview]         = useState<Map<number, { start: string; end: string }>>(new Map());
  const [connectCur, setConnectCur]   = useState<{ x: number; y: number; targetId: number | null } | null>(null);
  const [connectFrom, setConnectFrom] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);

  // subtask expand / collapse
  const [expandedSet,    setExpandedSet]    = useState<Set<number>>(new Set());
  const [subtasksByTask, setSubtasksByTask] = useState<Map<number, Task[]>>(new Map());

  // mutable refs – safe to read inside the persistent effect
  const dragRef        = useRef<GDragState>(null);
  const previewRef     = useRef<Map<number, { start: string; end: string }>>(new Map());
  const connectCurRef  = useRef<{ x: number; y: number; targetId: number | null } | null>(null);
  const rowsRef        = useRef<HTMLDivElement>(null);
  const allRowsRef     = useRef<GanttRow[]>([]);       // full flat list (parents + open subtasks)
  const subParentRef   = useRef<Map<number, number>>(new Map()); // subtaskId → parentId

  const queryClient    = useQueryClient();
  const { toast }      = useToast();

  // keep refs to latest mutable values (avoids stale closures in the effect)
  const queryClientRef = useRef(queryClient);
  const projectIdRef   = useRef(projectId);
  const toastRef       = useRef(toast);
  queryClientRef.current = queryClient;
  projectIdRef.current   = projectId;
  toastRef.current       = toast;

  // callback ref: refresh one parent's subtask list (returns Promise so callers can await)
  const refreshSubsRef = useRef<(parentId: number) => Promise<void>>(() => Promise.resolve());
  refreshSubsRef.current = (parentId: number): Promise<void> =>
    listSubtasks(parentId, getAuthRequest())
      .then(subs => { setSubtasksByTask(prev => new Map(prev).set(parentId, subs)); })
      .catch(() => {});

  // single persistent effect – no stale-closure issues because everything is via refs
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.mode === "move") {
        const dd = Math.round((e.clientX - drag.startX) / DAY_W);
        const s  = format(addDays(new Date(drag.origStart), dd), "yyyy-MM-dd");
        const en = format(addDays(new Date(drag.origEnd),   dd), "yyyy-MM-dd");
        const m  = new Map([[drag.taskId, { start: s, end: en }]]);
        previewRef.current = m; setPreview(new Map(m));

      } else if (drag.mode === "resize-right") {
        const dd     = Math.round((e.clientX - drag.startX) / DAY_W);
        const newEnd = addDays(new Date(drag.origEnd), dd);
        const minEnd = addDays(new Date(drag.origStart), 1);
        const final  = newEnd < minEnd ? minEnd : newEnd;
        const m = new Map([[drag.taskId, { start: drag.origStart, end: format(final, "yyyy-MM-dd") }]]);
        previewRef.current = m; setPreview(new Map(m));

      } else if (drag.mode === "resize-left") {
        const dd       = Math.round((e.clientX - drag.startX) / DAY_W);
        const newStart = addDays(new Date(drag.origStart), dd);
        const maxStart = addDays(new Date(drag.origEnd), -1);
        const final    = newStart > maxStart ? maxStart : newStart;
        const m = new Map([[drag.taskId, { start: format(final, "yyyy-MM-dd"), end: drag.origEnd }]]);
        previewRef.current = m; setPreview(new Map(m));

      } else if (drag.mode === "connect") {
        const rect = rowsRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x  = e.clientX - rect.left - LABEL_W;
        const y  = e.clientY - rect.top;
        const ri = Math.floor(y / ROW_STEP);
        const ar = allRowsRef.current;
        const row = ri >= 0 && ri < ar.length ? ar[ri] : null;
        // Only target parent-task rows for dependency arrows
        const tgt = row && !row.isSubtask && row.task.id !== drag.fromTaskId ? row.task : null;
        const tid = tgt ? tgt.id : null;
        connectCurRef.current = { x, y, targetId: tid };
        setConnectCur({ x, y, targetId: tid });
      }
    };

    const onUp = async (_e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      try {
        if (drag.mode === "move" || drag.mode === "resize-right" || drag.mode === "resize-left") {
          const p = previewRef.current.get(drag.taskId);
          if (p && (p.start !== drag.origStart || p.end !== drag.origEnd)) {
            await updateTask(drag.taskId, { startDate: p.start, dueDate: p.end }, getAuthRequest());
            // Await refetch so date labels snap to confirmed server values before preview clears
            await queryClientRef.current.refetchQueries({ queryKey: [`/api/projects/${projectIdRef.current}/tasks`] });
            // If it was a subtask, also refresh its parent's subtask list
            const parentId = subParentRef.current.get(drag.taskId);
            if (parentId !== undefined) await refreshSubsRef.current(parentId);
          }
        } else if (drag.mode === "connect") {
          const cur = connectCurRef.current;
          if (cur?.targetId) {
            await addTaskDependency(cur.targetId, { dependsOnTaskId: drag.fromTaskId }, getAuthRequest());
            await queryClientRef.current.refetchQueries({ queryKey: [`/api/projects/${projectIdRef.current}/tasks`] });
            toastRef.current({ title: "Dependency added" });
          }
        }
      } catch { toastRef.current({ variant: "destructive", title: "Action failed" }); }

      dragRef.current       = null;
      previewRef.current    = new Map();
      connectCurRef.current = null;
      setDragMode(null); setPreview(new Map()); setConnectCur(null); setConnectFrom(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── chart data (computed after all hooks) ──────────────────────────────────
  const validTasks = tasks.filter(t => t.startDate && t.dueDate);

  // Build flat rows array (parent tasks + their expanded subtasks)
  const allRows: GanttRow[] = [];
  for (const task of validTasks) {
    allRows.push({ isSubtask: false, task });
    if (expandedSet.has(task.id)) {
      for (const sub of subtasksByTask.get(task.id) ?? []) {
        allRows.push({ isSubtask: true, task: sub, parentId: task.id });
      }
    }
  }
  allRowsRef.current = allRows;

  // keep subParentRef in sync
  const newSubParent = new Map<number, number>();
  for (const [pid, subs] of subtasksByTask.entries())
    for (const s of subs) newSubParent.set(s.id, pid);
  subParentRef.current = newSubParent;

  if (validTasks.length === 0) return (
    <div className="text-center py-20 text-muted-foreground">
      No tasks with start + due dates yet. Set dates on any task to see it here.
    </div>
  );

  // Chart date range — include dated subtask bars too
  const allDates = allRows.flatMap(r => {
    const d: Date[] = [];
    if (r.task.startDate) d.push(new Date(r.task.startDate));
    if (r.task.dueDate)   d.push(new Date(r.task.dueDate));
    return d;
  });
  const minDate    = startOfDay(new Date(Math.min(...allDates.map(d => d.getTime()))));
  const maxDate    = startOfDay(new Date(Math.max(...allDates.map(d => d.getTime()))));
  const chartStart = addDays(minDate, -2);
  const chartEnd   = addDays(maxDate, 6);
  const totalDays  = differenceInDays(chartEnd, chartStart) + 1;
  const dayHeaders = Array.from({ length: totalDays }, (_, i) => addDays(chartStart, i));

  // rowMap: task/subtask id → flat index in allRows
  const rowMap = new Map<number, number>(allRows.map((r, i) => [r.task.id, i]));

  const getDisplay = (task: Task) => {
    const p = preview.get(task.id);
    const start = p?.start ?? task.startDate ?? task.dueDate!;
    const end   = p?.end   ?? task.dueDate!;
    return { start, end };
  };

  // Dependency arrows (parent tasks only)
  type Arrow = { x1: number; y1: number; x2: number; y2: number; done: boolean };
  const arrows: Arrow[] = [];
  for (const task of validTasks) {
    for (const bid of task.blockedByIds ?? []) {
      const blocker = validTasks.find(t => t.id === bid);
      if (!blocker) continue;
      const bd   = getDisplay(blocker);
      const td   = getDisplay(task);
      const bRow = rowMap.get(blocker.id) ?? 0;
      const tRow = rowMap.get(task.id)    ?? 0;
      const bOff = differenceInDays(new Date(bd.start), chartStart);
      const bDur = differenceInDays(new Date(bd.end),   new Date(bd.start)) + 1;
      const tOff = differenceInDays(new Date(td.start), chartStart);
      arrows.push({
        x1: bOff * DAY_W + bDur * DAY_W,
        y1: bRow * ROW_STEP + BAR_TOP + BAR_H / 2,
        x2: tOff * DAY_W,
        y2: tRow * ROW_STEP + BAR_TOP + BAR_H / 2,
        done: blocker.status === "done",
      });
    }
  }

  const svgW = totalDays * DAY_W;
  const svgH = allRows.length * ROW_STEP;
  const isConnecting = dragMode === "connect";

  const startDrag = (e: React.MouseEvent, task: Task, mode: "move" | "resize-left" | "resize-right") => {
    e.preventDefault(); e.stopPropagation();
    const origStart = task.startDate ?? task.dueDate!;
    const origEnd   = task.dueDate!;
    dragRef.current = { mode, taskId: task.id, origStart, origEnd, startX: e.clientX };
    setDragMode(mode);
  };

  const startConnect = (e: React.MouseEvent, task: Task, rowIdx: number) => {
    e.preventDefault(); e.stopPropagation();
    const d    = getDisplay(task);
    const sOff = differenceInDays(new Date(d.start), chartStart);
    const dur  = Math.max(differenceInDays(new Date(d.end), new Date(d.start)) + 1, 1);
    const fx   = sOff * DAY_W + dur * DAY_W;
    const fy   = rowIdx * ROW_STEP + BAR_TOP + BAR_H / 2;
    dragRef.current = { mode: "connect", fromTaskId: task.id, fromX: fx, fromY: fy };
    connectCurRef.current = { x: fx, y: fy, targetId: null };
    setDragMode("connect");
    setConnectFrom({ x: fx, y: fy });
    setConnectCur({ x: fx, y: fy, targetId: null });
  };

  const handleExpand = async (taskId: number) => {
    if (expandedSet.has(taskId)) {
      setExpandedSet(prev => { const n = new Set(prev); n.delete(taskId); return n; });
    } else {
      if (!subtasksByTask.has(taskId)) {
        try {
          const subs = await listSubtasks(taskId, getAuthRequest());
          setSubtasksByTask(prev => new Map(prev).set(taskId, subs));
        } catch { /* keep going even if fetch fails */ }
      }
      setExpandedSet(prev => new Set(prev).add(taskId));
    }
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-x-auto shadow-xl shadow-black/5 p-6" style={{ userSelect: "none" }}>
      <div className="min-w-max" style={{ width: `${svgW + LABEL_W}px` }}>

        {/* Date header */}
        <div className="flex border-b border-border/50 pb-2 mb-3">
          <div className="shrink-0 font-semibold text-muted-foreground text-sm pl-2" style={{ width: LABEL_W }}>Task</div>
          <div className="flex">
            {dayHeaders.map((d, i) => {
              const isWknd = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} className={clsx("shrink-0 flex flex-col items-center justify-center border-l border-border/20", isWknd && "bg-secondary/20")} style={{ width: DAY_W }}>
                  <span className="text-[9px] text-muted-foreground/60 uppercase">{format(d, "MMM")}</span>
                  <span className={clsx("text-xs font-semibold", isWknd ? "text-primary/70" : "text-foreground/80")}>{format(d, "dd")}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows + SVG */}
        <div className="relative" ref={rowsRef}>
          <div className="space-y-1">
            {allRows.map((row, rowIdx) => {
              const { task, isSubtask } = row;
              const { start, end } = getDisplay(task);
              const hasDates    = !!(task.startDate && task.dueDate);
              const hasEndOnly  = !task.startDate && !!task.dueDate;
              const sOff        = differenceInDays(new Date(start), chartStart);
              const dur         = Math.max(differenceInDays(new Date(end), new Date(start)) + 1, 1);
              const barL        = sOff * DAY_W;
              const barW        = dur  * DAY_W;
              const isBlocked   = !isSubtask && (task.blockedByIds?.length ?? 0) > 0;
              const isOverdue   = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "done";
              const _drag = dragRef.current;
              const isDraggingThis = dragMode && _drag?.mode !== "connect" && _drag?.taskId === task.id;
              const isTargeted  = !isSubtask && connectCur?.targetId === task.id;
              const isHovered   = hoveredTask === task.id;
              const isExpanded  = !isSubtask && expandedSet.has(task.id);
              const hasSubtasks = !isSubtask && (task.subtaskCount ?? 0) > 0;

              return (
                <div
                  key={`${isSubtask ? "sub" : "task"}-${task.id}`}
                  className={clsx(
                    "flex items-center relative rounded-lg transition-colors",
                    isSubtask ? "h-[48px] pl-6" : "h-[48px]",
                    isTargeted && "bg-primary/10 outline outline-1 outline-primary/40",
                    isSubtask && "opacity-90"
                  )}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                >
                  {/* Label column */}
                  <div
                    className="shrink-0 px-2 flex items-center gap-1 overflow-hidden"
                    style={{ width: isSubtask ? LABEL_W - 24 : LABEL_W }}
                  >
                    {/* Expand chevron (parent tasks only) */}
                    {!isSubtask && (
                      <button
                        className={clsx(
                          "w-5 h-5 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors",
                          !hasSubtasks && "opacity-0 pointer-events-none"
                        )}
                        onClick={() => handleExpand(task.id)}
                      >
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5" />
                          : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* Title + date subtitle */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center leading-none">
                      <div className="flex items-center gap-1 min-w-0">
                        {isBlocked && <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />}
                        <span
                          className={clsx(
                            "truncate font-medium cursor-pointer hover:text-primary",
                            isSubtask ? "text-[11px] text-muted-foreground" : "text-sm"
                          )}
                          onClick={() => !isDraggingThis && !isSubtask && onTaskClick(task.id)}
                        >
                          {task.title}
                        </span>
                      </div>
                      {/* Live date label – updates in real-time during drag */}
                      {(hasDates || hasEndOnly) && (
                        <span className="text-[10px] text-muted-foreground/50 truncate mt-0.5">
                          {hasDates
                            ? `${format(new Date(start), "MMM d")} → ${format(new Date(end), "MMM d")}`
                            : format(new Date(end), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chart lane */}
                  <div className="flex-1 relative h-full">
                    {/* Column grid */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {dayHeaders.map((d, i) => (
                        <div key={i} className={clsx("shrink-0 h-full border-l border-border/20", (d.getDay() === 0 || d.getDay() === 6) && "bg-secondary/10")} style={{ width: DAY_W }} />
                      ))}
                    </div>

                    {/* ── Parent task bar ── */}
                    {!isSubtask && hasDates && (
                      <div
                        className={clsx(
                          "absolute rounded-lg shadow-md flex items-center",
                          isOverdue
                            ? "bg-red-500/25 border border-red-400/50"
                            : isDraggingThis
                              ? "bg-primary/40 border border-primary/70"
                              : "bg-primary/20 border border-primary/40 hover:bg-primary/30 hover:border-primary/60",
                          isDraggingThis ? "cursor-grabbing ring-2 ring-primary z-20 shadow-primary/30 shadow-lg" : "cursor-grab"
                        )}
                        style={{ left: barL, width: barW, top: BAR_TOP, height: BAR_H, zIndex: isDraggingThis ? 20 : 10, transition: isDraggingThis ? "none" : undefined }}
                        onMouseDown={(e) => startDrag(e, task, "move")}
                      >
                        <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-10 flex items-center justify-center rounded-l-lg hover:bg-white/20 group/lh" onMouseDown={(e) => startDrag(e, task, "resize-left")}>
                          <div className="w-0.5 h-3 bg-primary/50 rounded-full group-hover/lh:bg-primary" />
                        </div>
                        <span className={clsx("absolute inset-y-0 left-3 right-10 flex items-center text-[10px] font-bold truncate pointer-events-none", isOverdue ? "text-red-300" : "text-primary")}>
                          {task.title}
                        </span>
                        {isDraggingThis && preview.has(task.id) && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border/60 text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap z-30 shadow-xl pointer-events-none font-medium">
                            {format(new Date(preview.get(task.id)!.start), "MMM d")} → {format(new Date(preview.get(task.id)!.end), "MMM d")}
                          </div>
                        )}
                        <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-10 flex items-center justify-center rounded-r-lg hover:bg-white/20 group/rh" onMouseDown={(e) => startDrag(e, task, "resize-right")}>
                          <div className="w-0.5 h-3 bg-primary/50 rounded-full group-hover/rh:bg-primary" />
                        </div>
                      </div>
                    )}

                    {/* ── Subtask bar (start + end) ── */}
                    {isSubtask && hasDates && (
                      <div
                        className={clsx(
                          "absolute rounded-md flex items-center",
                          isOverdue
                            ? "bg-red-400/20 border border-red-400/40"
                            : isDraggingThis
                              ? "border-2 border-[#23a7e5] bg-[#23a7e5]/40 z-20"
                              : "bg-[#23a7e5]/15 border border-[#23a7e5]/40 hover:bg-[#23a7e5]/25 hover:border-[#23a7e5]/60",
                          isDraggingThis ? "cursor-grabbing" : "cursor-grab"
                        )}
                        style={{ left: barL, width: barW, top: SUB_BAR_TOP, height: SUB_BAR_H, zIndex: isDraggingThis ? 20 : 10, transition: isDraggingThis ? "none" : undefined }}
                        onMouseDown={(e) => startDrag(e, task, "move")}
                      >
                        <div className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize z-10 rounded-l-md hover:bg-white/20" onMouseDown={(e) => startDrag(e, task, "resize-left")} />
                        <span className="absolute inset-y-0 left-2 right-2 flex items-center text-[9px] font-semibold truncate pointer-events-none text-[#23a7e5]">
                          {task.title}
                        </span>
                        {isDraggingThis && preview.has(task.id) && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-popover border border-border/60 text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-30 shadow-xl pointer-events-none font-medium">
                            {format(new Date(preview.get(task.id)!.start), "MMM d")} → {format(new Date(preview.get(task.id)!.end), "MMM d")}
                          </div>
                        )}
                        <div className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize z-10 rounded-r-md hover:bg-white/20" onMouseDown={(e) => startDrag(e, task, "resize-right")} />
                      </div>
                    )}

                    {/* ── Subtask milestone diamond (due date only) ── */}
                    {isSubtask && hasEndOnly && (
                      <div
                        className="absolute flex items-center justify-center"
                        style={{ left: barL - 7, top: SUB_BAR_TOP + (SUB_BAR_H - 14) / 2, width: 14, height: 14, zIndex: 10 }}
                        title={format(new Date(end), "MMM d")}
                      >
                        <div className={clsx(
                          "w-3 h-3 rotate-45 border",
                          isOverdue ? "bg-red-400/50 border-red-400" : "bg-[#23a7e5]/40 border-[#23a7e5]"
                        )} />
                      </div>
                    )}

                    {/* ── Subtask no-date placeholder ── */}
                    {isSubtask && !hasDates && !hasEndOnly && (
                      <div
                        className="absolute flex items-center"
                        style={{ top: SUB_BAR_TOP, height: SUB_BAR_H, left: 8 }}
                      >
                        <span className="text-[10px] text-muted-foreground/40 italic">No date</span>
                      </div>
                    )}

                    {/* ⊕ connect handle (parent tasks only, visible on hover) */}
                    {!isSubtask && hasDates && (
                      <div
                        className={clsx(
                          "absolute w-6 flex items-center justify-center cursor-crosshair z-30 transition-opacity duration-150",
                          isHovered && !isConnecting ? "opacity-100" : "opacity-0"
                        )}
                        style={{ left: barL + barW + 4, top: BAR_TOP, height: BAR_H }}
                        onMouseDown={(e) => startConnect(e, task, rowIdx)}
                      >
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 hover:scale-125 transition-transform">
                          <Plus className="w-2.5 h-2.5 text-background" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SVG: dependency arrows + connect-drag preview */}
          <svg
            className="absolute top-0 pointer-events-none"
            style={{ left: LABEL_W, width: svgW, height: Math.max(svgH, 1), zIndex: 15, overflow: "visible" }}
            overflow="visible"
          >
            <defs>
              <marker id="ga-orange"  markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#f97316"/></marker>
              <marker id="ga-green"   markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#34d399"/></marker>
              <marker id="ga-primary" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#13eac1"/></marker>
            </defs>

            {arrows.map((a, i) => {
              const col = a.done ? "#34d399" : "#f97316";
              const mid = a.x1 + 18;
              return (
                <path key={i}
                  d={`M ${a.x1} ${a.y1} H ${mid} V ${a.y2} H ${a.x2}`}
                  fill="none" stroke={col} strokeWidth={2}
                  strokeDasharray={a.done ? "none" : "5 3"}
                  markerEnd={`url(#${a.done ? "ga-green" : "ga-orange"})`}
                  opacity={0.85}
                />
              );
            })}

            {/* live connect-drag line */}
            {isConnecting && connectFrom && connectCur && (
              <line
                x1={connectFrom.x} y1={connectFrom.y}
                x2={connectCur.x}  y2={connectCur.y}
                stroke="#13eac1" strokeWidth={2} strokeDasharray="5 3"
                markerEnd="url(#ga-primary)" opacity={0.9}
              />
            )}
          </svg>
        </div>

        {/* Legend + hint */}
        <div className="mt-4 pt-4 border-t border-border/30 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg width="36" height="12"><line x1="0" y1="6" x2="28" y2="6" stroke="#f97316" strokeWidth="2" strokeDasharray="5 3"/><polygon points="28,3 36,6 28,9" fill="#f97316"/></svg>
            Blocked
          </div>
          <div className="flex items-center gap-2">
            <svg width="36" height="12"><line x1="0" y1="6" x2="28" y2="6" stroke="#34d399" strokeWidth="2"/><polygon points="28,3 36,6 28,9" fill="#34d399"/></svg>
            Resolved
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2.5 rounded-sm bg-[#23a7e5]/30 border border-[#23a7e5]/60" />
            Subtask
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rotate-45 bg-[#23a7e5]/40 border border-[#23a7e5]" />
            Milestone
          </div>
          <span className="ml-auto text-[11px] text-muted-foreground/50">
            Click <span className="text-foreground/70">▶</span> to expand · Drag bar to move · Drag edges to resize · Hover → drag <span className="text-primary font-bold">⊕</span> to link
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── CREATE TASK DIALOG ────────────────────────────────────────────────────────
function CreateTaskDialog({ open, onOpenChange, projectId, users }: any) {
  const mutation   = useCreateTask();
  const queryClient = useQueryClient();
  const { toast }  = useToast();

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { status: "todo", priority: "medium" },
  });

  const onSubmit = async (data: TaskForm) => {
    try {
      const payload: Record<string, unknown> = { ...data };
      if (!payload.startDate)   delete payload.startDate;
      if (!payload.dueDate)     delete payload.dueDate;
      if (payload.assigneeId == null) delete payload.assigneeId;
      await createTask(projectId, payload as any, getAuthRequest());
      toast({ title: "Task created" });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      onOpenChange(false);
      form.reset();
    } catch {
      toast({ variant: "destructive", title: "Failed to create task" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input {...form.register("title")} className="bg-background" placeholder="Task title..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller control={form.control} name="status" render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller control={form.control} name="priority" render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <Controller control={form.control} name="assigneeId" render={({ field }) => (
              <Select onValueChange={field.onChange}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                <SelectContent>
                  {users.map((u: User) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...form.register("startDate")} className="bg-background block w-full" />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" {...form.register("dueDate")} className="bg-background block w-full" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="rounded-xl">
              {mutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── TASK DETAIL SHEET ─────────────────────────────────────────────────────────
function TaskDetailSheet({ taskId, onClose, users, projectId, allTasks }: { taskId: number | null; onClose: () => void; users: User[]; projectId: number; allTasks: Task[] }) {
  const { data: task }         = useGetTask(taskId!, { request: getAuthRequest(), query: { enabled: !!taskId } });
  const { data: comments }     = useListComments(taskId!, { request: getAuthRequest(), query: { enabled: !!taskId } });
  const { data: subtasks, refetch: refetchSubtasks }     = useListSubtasks(taskId!, { request: getAuthRequest(), query: { enabled: !!taskId } });
  const { data: dependencies, refetch: refetchDeps }    = useListTaskDependencies(taskId!, { request: getAuthRequest(), query: { enabled: !!taskId } });

  const commentMutation   = useCreateComment();
  const updateMutation    = useUpdateTask();
  const subtaskMutation   = useCreateSubtask();
  const addDepMutation    = useAddTaskDependency();
  const removeDepMutation = useRemoveTaskDependency();
  const deleteMutation    = useDeleteTask();
  const queryClient       = useQueryClient();
  const { toast }         = useToast();

  const [commentText, setCommentText]             = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle]       = useState("");
  const [newSubtaskDueDate, setNewSubtaskDueDate]   = useState("");
  const [showSubtaskInput, setShowSubtaskInput]     = useState(false);
  const [selectedBlockerId, setSelectedBlockerId]   = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);

  const handleDelete = async () => {
    try {
      await deleteTask(taskId!, getAuthRequest());
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      toast({ title: "Task deleted" });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Failed to delete task" });
    }
  };

  if (!taskId) return null;

  // Tasks that can be added as blockers (same project, not self, not already a blocker)
  const existingBlockerIds = new Set(dependencies?.map((d: TaskDependency) => d.dependsOnTaskId) ?? []);
  const blockerCandidates  = allTasks.filter(t => t.id !== taskId && !existingBlockerIds.has(t.id));

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    await createComment(taskId!, { content: commentText }, getAuthRequest());
    setCommentText("");
    queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "comments"] });
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    try {
      const subtaskData: { title: string; dueDate?: string } = { title: newSubtaskTitle };
      if (newSubtaskDueDate) subtaskData.dueDate = newSubtaskDueDate;
      await createSubtask(taskId!, subtaskData as any, getAuthRequest());
      setNewSubtaskTitle("");
      setNewSubtaskDueDate("");
      setShowSubtaskInput(false);
      refetchSubtasks();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      toast({ title: "Subtask added" });
    } catch {
      toast({ variant: "destructive", title: "Failed to add subtask" });
    }
  };

  const handleToggleSubtask = async (subtaskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    await updateTask(subtaskId, { status: newStatus as any }, getAuthRequest());
    refetchSubtasks();
  };

  const handleAddBlocker = async () => {
    if (!selectedBlockerId) return;
    try {
      await addTaskDependency(taskId!, { dependsOnTaskId: parseInt(selectedBlockerId) }, getAuthRequest());
      setSelectedBlockerId("");
      refetchDeps();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      toast({ title: "Blocker added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: e?.message || "Failed to add blocker" });
    }
  };

  const handleRemoveBlocker = async (dependsOnId: number) => {
    await removeTaskDependency(taskId!, dependsOnId, getAuthRequest());
    refetchDeps();
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
  };

  const handleFieldUpdate = async (field: string, value: string | number | null) => {
    try {
      await updateTask(taskId!, { [field]: value } as any, getAuthRequest());
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      toast({ title: "Task updated" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update task" });
    }
  };

  const completedSubtasks = subtasks?.filter((s: Task) => s.status === "done").length ?? 0;
  const totalSubtasks     = subtasks?.length ?? 0;
  const isOverdue = task?.dueDate && isPast(new Date(task.dueDate)) && task?.status !== "done";

  return (
    <Sheet open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] bg-background border-l-border p-0 flex flex-col">
        {task ? (
          <>
            {/* ── Header ── */}
            <div className="p-6 border-b border-border/50 bg-card/30 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${PRIORITY_CONFIG[task.priority]} uppercase border-none text-[10px]`}>{task.priority}</Badge>
                  <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold border", STATUS_CONFIG[task.status].bg, STATUS_CONFIG[task.status].color)}>
                    {STATUS_CONFIG[task.status].label}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <SheetTitle className="text-xl font-bold leading-tight mb-4">{task.title}</SheetTitle>

              {/* Key metadata grid — all fields editable */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Owner — editable */}
                <div className="bg-secondary/30 rounded-xl p-3 border border-border/40">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><UserIcon className="w-3 h-3"/> Owner</p>
                  <select
                    className="w-full bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-foreground"
                    value={task.assigneeId ?? ""}
                    onChange={e => handleFieldUpdate("assigneeId", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                {/* Deadline — editable */}
                <div className={clsx("rounded-xl p-3 border", isOverdue ? "bg-red-500/10 border-red-400/30" : "bg-secondary/30 border-border/40")}>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Deadline</p>
                  <input
                    type="date"
                    className="w-full bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-foreground"
                    value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                    onChange={e => handleFieldUpdate("dueDate", e.target.value || null)}
                  />
                </div>

                {/* Priority — editable */}
                <div className="bg-secondary/30 rounded-xl p-3 border border-border/40">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">Priority</p>
                  <select
                    className="w-full bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-foreground"
                    value={task.priority}
                    onChange={e => handleFieldUpdate("priority", e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Start Date — editable */}
                <div className="bg-secondary/30 rounded-xl p-3 border border-border/40">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">Start Date</p>
                  <input
                    type="date"
                    className="w-full bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-foreground"
                    value={task.startDate ? task.startDate.slice(0, 10) : ""}
                    onChange={e => handleFieldUpdate("startDate", e.target.value || null)}
                  />
                </div>

                {/* Status — editable, full width */}
                <div className="col-span-2 bg-secondary/30 rounded-xl p-3 border border-border/40">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">Status</p>
                  <select
                    className="w-full bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-foreground"
                    value={task.status}
                    onChange={e => handleFieldUpdate("status", e.target.value)}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* ── SUBTASKS ── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="flex items-center gap-2 font-semibold text-foreground text-sm">
                    <CheckSquare className="w-4 h-4 text-primary"/>
                    Subtasks
                    {totalSubtasks > 0 && (
                      <span className="text-xs text-muted-foreground font-normal">({completedSubtasks}/{totalSubtasks})</span>
                    )}
                  </h4>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setShowSubtaskInput(true)}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>

                {totalSubtasks > 0 && (
                  <div className="w-full bg-secondary/30 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: totalSubtasks > 0 ? `${(completedSubtasks / totalSubtasks) * 100}%` : "0%" }}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  {subtasks?.map((sub: Task) => {
                    const subOverdue = sub.dueDate && isPast(new Date(sub.dueDate)) && sub.status !== "done";
                    const subDueToday = sub.dueDate && isToday(new Date(sub.dueDate));
                    return (
                      <div key={sub.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/20 group border border-transparent hover:border-border/40 transition-all">
                        <Checkbox
                          checked={sub.status === "done"}
                          onCheckedChange={() => handleToggleSubtask(sub.id, sub.status)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className={clsx("text-sm flex-1", sub.status === "done" && "line-through text-muted-foreground")}>{sub.title}</span>
                        {sub.dueDate && (
                          <span className={clsx(
                            "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
                            sub.status === "done"   ? "text-muted-foreground"
                            : subOverdue            ? "bg-red-500/15 text-red-400"
                            : subDueToday           ? "bg-amber-500/15 text-amber-400"
                            :                         "text-muted-foreground"
                          )}>
                            <CalendarIcon className="w-2.5 h-2.5" />
                            {format(new Date(sub.dueDate), "MMM d")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {totalSubtasks === 0 && !showSubtaskInput && (
                    <p className="text-xs text-muted-foreground italic px-1">No subtasks yet.</p>
                  )}
                </div>

                {showSubtaskInput && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        autoFocus
                        placeholder="Subtask title..."
                        value={newSubtaskTitle}
                        onChange={e => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAddSubtask(); if (e.key === "Escape") { setShowSubtaskInput(false); setNewSubtaskTitle(""); setNewSubtaskDueDate(""); }}}
                        className="h-8 text-sm bg-background flex-1"
                      />
                      <Input
                        type="date"
                        value={newSubtaskDueDate}
                        onChange={e => setNewSubtaskDueDate(e.target.value)}
                        className="h-8 text-sm bg-background w-36"
                        title="Deadline (optional)"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setShowSubtaskInput(false); setNewSubtaskTitle(""); setNewSubtaskDueDate(""); }}><X className="w-3.5 h-3.5"/></Button>
                      <Button size="sm" className="h-8 px-3" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()}>Add</Button>
                    </div>
                  </div>
                )}
              </section>

              {/* ── BLOCKED BY ── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="flex items-center gap-2 font-semibold text-foreground text-sm">
                    <Link2 className="w-4 h-4 text-orange-400"/>
                    Blocked By
                    {(dependencies?.length ?? 0) > 0 && (
                      <span className="text-xs text-muted-foreground font-normal">({dependencies?.length})</span>
                    )}
                  </h4>
                </div>

                {dependencies && dependencies.length > 0 ? (
                  <div className="space-y-1.5 mb-3">
                    {dependencies.map((dep: TaskDependency & { dependsOnTask?: any }) => (
                      <div key={dep.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-orange-400/5 border border-orange-400/20 group">
                        <ChevronRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{dep.dependsOnTask?.title || `Task #${dep.dependsOnTaskId}`}</p>
                        </div>
                        <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-full border shrink-0",
                          dep.dependsOnTask?.status === "done"
                            ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                            : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                        )}>
                          {STATUS_CONFIG[dep.dependsOnTask?.status || "todo"]?.label || dep.dependsOnTask?.status}
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveBlocker(dep.dependsOnTaskId)}>
                          <X className="w-3 h-3"/>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mb-3">No blockers — this task is free to proceed.</p>
                )}

                {/* Add blocker */}
                {blockerCandidates.length > 0 && (
                  <div className="flex gap-2">
                    <Select value={selectedBlockerId} onValueChange={setSelectedBlockerId}>
                      <SelectTrigger className="bg-background h-8 text-xs flex-1">
                        <SelectValue placeholder="Add a blocker task..." />
                      </SelectTrigger>
                      <SelectContent>
                        {blockerCandidates.map(t => (
                          <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                            <span className="flex items-center gap-2">
                              <span className={clsx("w-2 h-2 rounded-full shrink-0", STATUS_CONFIG[t.status]?.dot)} />
                              {t.title}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 px-3 gap-1" onClick={handleAddBlocker} disabled={!selectedBlockerId || addDepMutation.isPending}>
                      <Plus className="w-3 h-3"/> Block
                    </Button>
                  </div>
                )}
              </section>

              {/* ── DESCRIPTION ── */}
              <section>
                <h4 className="flex items-center gap-2 font-semibold mb-3 text-foreground text-sm"><AlignLeft className="w-4 h-4 text-primary"/> Description</h4>
                <div className="text-sm text-muted-foreground bg-secondary/10 p-4 rounded-xl border border-border/30 min-h-[80px]">
                  {task.description || "No description provided."}
                </div>
              </section>

              {/* ── COMMENTS ── */}
              <section>
                <h4 className="flex items-center gap-2 font-semibold mb-4 text-foreground text-sm"><MessageSquare className="w-4 h-4 text-primary"/> Comments</h4>
                <div className="space-y-4 mb-4">
                  {comments?.map((c: any) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 mt-1 border border-border/50 shrink-0">
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px]">{c.user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-secondary/30 rounded-2xl rounded-tl-sm p-4 border border-border/50">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-sm">{c.user?.name}</span>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(c.createdAt), "MMM d, h:mm a")}</span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4 italic">No comments yet.</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Textarea
                    placeholder="Write a comment..."
                    className="bg-card resize-none rounded-xl focus-visible:ring-primary/50 min-h-[80px]"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="rounded-lg"
                      onClick={handlePostComment}
                      disabled={commentMutation.isPending || !commentText.trim()}
                    >Post</Button>
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
          </div>
        )}
      </SheetContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold text-foreground">"{task?.title}"</span> and all its subtasks, comments, and dependencies. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
