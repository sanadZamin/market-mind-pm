/**
 * Suppress duplicate team emails when the same task update is sent twice in quick succession (Express parity with Spring).
 */

const WINDOW_MS = 5000;
const lastSentAt = new Map<string, number>();

export function allowTeamUpdateEmailDedupe(taskId: number, actorUserId: number, mergedSnapshot: Record<string, unknown>): boolean {
  const key = `${taskId}|${actorUserId}|${JSON.stringify(mergedSnapshot)}`;
  const now = Date.now();
  const prev = lastSentAt.get(key);
  if (prev != null && now - prev < WINDOW_MS) {
    return false;
  }
  lastSentAt.set(key, now);
  if (lastSentAt.size > 3000) {
    lastSentAt.clear();
  }
  return true;
}

export function stableTaskSnapshotForDedupe(t: {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: number | null;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  tags: string[];
  position: number;
}): Record<string, unknown> {
  return {
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId,
    startDate: t.startDate,
    dueDate: t.dueDate,
    estimatedHours: t.estimatedHours,
    tags: t.tags,
    position: t.position,
  };
}
