import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/api-helpers";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X, Loader2, User as UserIcon } from "lucide-react";
import clsx from "clsx";

type PreviewTask = {
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  todo:        "bg-slate-400/10 text-slate-300 border-slate-400/20",
  in_progress: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  in_review:   "bg-amber-400/10 text-amber-300 border-amber-400/20",
  done:        "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
};

const PRIORITY_BADGE: Record<string, string> = {
  low:    "bg-slate-500/20 text-slate-300",
  medium: "bg-blue-500/20 text-blue-300",
  high:   "bg-amber-500/20 text-amber-300",
  urgent: "bg-red-500/20 text-red-300 font-bold",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do", in_progress: "In Progress", in_review: "In Review", done: "Done",
};

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
}

type Stage = "upload" | "parsing" | "preview" | "confirming";

export function ExcelImportDialog({ open, onOpenChange, projectId }: ExcelImportDialogProps) {
  const [stage, setStage]         = useState<Stage>("upload");
  const [dragOver, setDragOver]   = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [tasks, setTasks]         = useState<PreviewTask[]>([]);
  const [llmError, setLlmError]   = useState<string | null>(null);
  const [rawRows, setRawRows]     = useState<Record<string, unknown>[] | null>(null);
  const [showRaw, setShowRaw]     = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const { toast }                 = useToast();
  const queryClient               = useQueryClient();

  const reset = () => {
    setStage("upload");
    setFile(null);
    setTasks([]);
    setLlmError(null);
    setRawRows(null);
    setShowRaw(false);
    setDragOver(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const processFile = useCallback(async (f: File) => {
    if (!f.name.endsWith(".xlsx")) {
      toast({ variant: "destructive", title: "Only .xlsx files are supported" });
      return;
    }
    setFile(f);
    setStage("parsing");

    const formData = new FormData();
    formData.append("file", f);

    try {
      const res = await fetch(`/api/projects/${projectId}/import-excel`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? `Server error ${res.status}`);
      }

      const data = await res.json() as { tasks: PreviewTask[]; llmError: string | null; rawRows?: Record<string, unknown>[] };
      setTasks(data.tasks);
      setLlmError(data.llmError);
      setRawRows(data.rawRows ?? null);
      setStage("preview");
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Import failed", description: err instanceof Error ? err.message : String(err) });
      setStage("upload");
    }
  }, [projectId, toast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = "";
  };

  const handleConfirm = async () => {
    setStage("confirming");
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ tasks }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? `Server error ${res.status}`);
      }

      const data = await res.json() as { created: number };
      toast({ title: `${data.created} task${data.created !== 1 ? "s" : ""} imported successfully` });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      handleClose();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Bulk create failed", description: err instanceof Error ? err.message : String(err) });
      setStage("preview");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            Import Tasks from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0">
          {/* Upload stage */}
          {(stage === "upload") && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "m-1 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all p-12",
                dragOver
                  ? "border-primary bg-primary/10"
                  : "border-border/60 bg-secondary/20 hover:border-primary/50 hover:bg-secondary/40"
              )}
            >
              <Upload className={clsx("w-12 h-12 transition-colors", dragOver ? "text-primary" : "text-muted-foreground")} />
              <div className="text-center">
                <p className="font-semibold text-foreground">Drop your .xlsx file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </div>
              <Badge variant="outline" className="text-xs text-muted-foreground">.xlsx only · max 10 MB</Badge>
              <p className="text-xs text-muted-foreground/70 text-center max-w-sm">
                The AI will map your columns to task fields (title, description, status, priority, assignee, due date)
              </p>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          {/* Parsing stage */}
          {stage === "parsing" && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Analysing your file…</p>
                <p className="text-sm text-muted-foreground mt-1">The AI is mapping your columns to task fields</p>
              </div>
            </div>
          )}

          {/* Preview stage */}
          {(stage === "preview" || stage === "confirming") && (
            <div className="flex flex-col gap-4">
              {/* File info */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/40 border border-border/50">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1 truncate">{file?.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">{tasks.length} task{tasks.length !== 1 ? "s" : ""} found</Badge>
              </div>

              {/* LLM error banner */}
              {llmError && (
                <div className="flex gap-3 items-start px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">AI mapping unavailable — showing auto-extracted task data</p>
                    <p className="text-xs opacity-80 mt-0.5">{llmError}</p>
                    <p className="text-xs opacity-70 mt-1">
                      Review the extracted rows below. You can still confirm to create the tasks as-is, or cancel to adjust the file and retry.
                    </p>
                    {rawRows && rawRows.length > 0 && (
                      <button
                        className="text-xs underline opacity-70 hover:opacity-100 mt-2 transition-opacity"
                        onClick={() => setShowRaw(r => !r)}
                      >
                        {showRaw ? "Hide" : "Show"} raw spreadsheet data ({rawRows.length} rows)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Raw rows table */}
              {llmError && showRaw && rawRows && rawRows.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 overflow-hidden bg-amber-500/5">
                  <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
                    <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">Raw Spreadsheet Data</p>
                  </div>
                  <div className="overflow-auto max-h-[180px]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-amber-500/10 sticky top-0">
                        <tr>
                          {Object.keys(rawRows[0]).map(col => (
                            <th key={col} className="px-3 py-2 text-amber-300/70 font-semibold whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-500/10">
                        {rawRows.slice(0, 20).map((row, i) => (
                          <tr key={i} className="hover:bg-amber-500/5">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[180px] truncate" title={String(val ?? "")}>
                                {String(val ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!llmError && (
                <div className="flex gap-2 items-center px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>AI successfully mapped your columns to task fields — review before confirming</span>
                </div>
              )}

              {/* Preview table */}
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-auto max-h-[340px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-secondary/40 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-semibold">Title</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-semibold">Description</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-semibold">Status</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-semibold">Priority</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-semibold">Assignee</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-semibold">Start Date</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-semibold">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {tasks.map((task, i) => (
                        <tr key={i} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground max-w-[160px]">
                            <span className="truncate block" title={task.title}>{task.title}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[160px]">
                            <span className="truncate block text-xs" title={task.description ?? ""}>{task.description || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx("px-2 py-0.5 rounded-full text-xs border", STATUS_BADGE[task.status] ?? STATUS_BADGE.todo)}>
                              {STATUS_LABEL[task.status] ?? task.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={clsx("text-[10px] uppercase border-none", PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.medium)}>
                              {task.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {task.assignee ? (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <UserIcon className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[100px]" title={task.assignee}>{task.assignee}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {task.startDate ? task.startDate : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {task.dueDate ? task.dueDate : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-border/50 shrink-0">
          {stage === "upload" && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}

          {stage === "parsing" && (
            <Button variant="outline" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing…
            </Button>
          )}

          {(stage === "preview" || stage === "confirming") && (
            <>
              <Button variant="outline" onClick={reset} disabled={stage === "confirming"}>
                <X className="w-4 h-4 mr-1" /> Start Over
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={stage === "confirming"}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={stage === "confirming" || tasks.length === 0}
                className="shadow-lg shadow-primary/20"
              >
                {stage === "confirming" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Import {tasks.length} Task{tasks.length !== 1 ? "s" : ""}</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
