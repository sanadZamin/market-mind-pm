/**
 * Human-readable email detail lines for task updates (parity with Spring {@code TaskUpdateChangeDescription}).
 */

export type TaskEmailSnapshot = {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: number | null;
  assignee: { name: string } | null;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  tags: string[];
  position: number;
};

function trimText(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function shorten(s: string | null | undefined, max: number): string {
  const t = trimText(s).replace(/\s+/g, " ");
  if (!t) return "(empty)";
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function fmtDate(iso: string | null | undefined): string {
  if (iso == null || trimText(iso) === "") return "none";
  const s = trimText(iso);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function fmtHours(h: number | null | undefined): string {
  if (h == null) return "none";
  return Number.isInteger(h) ? String(h) : String(h);
}

function hoursEqual(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 1e-6;
}

function fmtTags(tags: string[] | null | undefined): string {
  if (!tags || tags.length === 0) return "none";
  return [...tags].join(", ");
}

function tagsEqual(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  const x = [...(a ?? [])].sort();
  const y = [...(b ?? [])].sort();
  if (x.length !== y.length) return false;
  return x.every((v, i) => v === y[i]);
}

function humanEnum(raw: string | null | undefined): string {
  if (raw == null || trimText(raw) === "") return "none";
  return raw
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function changeLine(label: string, beforeDisp: string, afterDisp: string): string {
  const b = beforeDisp.trim() === "" ? "none" : beforeDisp;
  const a = afterDisp.trim() === "" ? "none" : afterDisp;
  return `${label}: ${a} (was ${b})`;
}

function formatAssignee(t: TaskEmailSnapshot): string {
  if (t.assignee?.name?.trim()) return t.assignee.name.trim();
  if (t.assigneeId != null) return `User #${t.assigneeId}`;
  return "Unassigned";
}

/** Lines for {@link sendTeamUpdateEmail} `details` (includes leading "Task: …"). */
export function describeTaskChanges(before: TaskEmailSnapshot, after: TaskEmailSnapshot): string[] {
  const lines: string[] = [];
  lines.push(`Task: ${after.title || "(untitled)"}`);

  if (before.title !== after.title) {
    lines.push(changeLine("Title", before.title ?? "", after.title ?? ""));
  }
  if (trimText(before.description) !== trimText(after.description)) {
    lines.push(changeLine("Description", shorten(before.description, 48), shorten(after.description, 48)));
  }
  if (before.status !== after.status) {
    lines.push(changeLine("Status", humanEnum(before.status), humanEnum(after.status)));
  }
  if (before.priority !== after.priority) {
    lines.push(changeLine("Priority", humanEnum(before.priority), humanEnum(after.priority)));
  }
  if (before.assigneeId !== after.assigneeId) {
    lines.push(changeLine("Owner", formatAssignee(before), formatAssignee(after)));
  }
  if (before.startDate !== after.startDate) {
    lines.push(changeLine("Start date", fmtDate(before.startDate), fmtDate(after.startDate)));
  }
  if (before.dueDate !== after.dueDate) {
    lines.push(changeLine("Due date", fmtDate(before.dueDate), fmtDate(after.dueDate)));
  }
  if (!hoursEqual(before.estimatedHours, after.estimatedHours)) {
    lines.push(changeLine("Estimated hours", fmtHours(before.estimatedHours), fmtHours(after.estimatedHours)));
  }
  if (!tagsEqual(before.tags, after.tags)) {
    lines.push(changeLine("Tags", fmtTags(before.tags), fmtTags(after.tags)));
  }
  if (before.position !== after.position) {
    lines.push(changeLine("Position", String(before.position), String(after.position)));
  }

  if (lines.length === 1) {
    lines.push("Updates applied — open the task in the app for full details.");
  }
  return lines;
}

export function taskMeaningfulFieldsChanged(before: TaskEmailSnapshot, after: TaskEmailSnapshot): boolean {
  return (
    before.title !== after.title ||
    trimText(before.description) !== trimText(after.description) ||
    before.status !== after.status ||
    before.priority !== after.priority ||
    before.assigneeId !== after.assigneeId ||
    before.startDate !== after.startDate ||
    before.dueDate !== after.dueDate ||
    !hoursEqual(before.estimatedHours, after.estimatedHours) ||
    !tagsEqual(before.tags, after.tags) ||
    before.position !== after.position
  );
}

export function toTaskEmailSnapshot(enriched: {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: number | null;
  assignee: { name: string } | null;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  tags: string[];
  position: number;
}): TaskEmailSnapshot {
  return {
    title: enriched.title,
    description: enriched.description,
    status: enriched.status,
    priority: enriched.priority,
    assigneeId: enriched.assigneeId,
    assignee: enriched.assignee,
    startDate: enriched.startDate,
    dueDate: enriched.dueDate,
    estimatedHours: enriched.estimatedHours,
    tags: Array.isArray(enriched.tags) ? enriched.tags : [],
    position: enriched.position,
  };
}
