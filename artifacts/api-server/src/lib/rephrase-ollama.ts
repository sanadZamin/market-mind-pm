import { logger } from "./logger.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://149.102.140.178:7869";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5:0.8b";
const OLLAMA_THINK =
  process.env.OLLAMA_THINK === "true" || process.env.OLLAMA_THINK === "1";

const OLLAMA_TIMEOUT_MS = (() => {
  const raw = process.env.OLLAMA_TIMEOUT_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const requested =
    Number.isFinite(parsed) && parsed > 0 ? parsed : 300_000;
  const withFloor = Math.max(requested, 180_000);
  const capped = Math.min(withFloor, 900_000);
  if (requested < 180_000) {
    logger.warn(
      { requestedMs: requested, effectiveMs: capped },
      "OLLAMA_TIMEOUT_MS was below 180s; rephrase uses a 180s minimum for remote Ollama cold start",
    );
  }
  return capped;
})();

export function buildProjectRephrasePrompt(projectName: string, description: string): string {
  return `Rewrite the following project description in a concise, professional tone (stakeholder-facing, no fluff).

Requirements:
- Be noticeably shorter than the original: tighten wording, drop repetition and filler, keep one or two crisp paragraphs at most (or a few short sentences if the source is brief).
- Stay formal and clear; do not pad with extra clauses or long introductions.
- Do not add deliverables, scope, dates, or stakeholders that are not in the original.

Output only the rewritten description as plain prose (no title line, no markdown, no bullet lists, no quotation marks wrapping the whole text).

Project name: ${projectName}
Original description:
${description}`;
}

export function buildTaskRephrasePrompt(taskTitle: string, description: string): string {
  const safeTitle = taskTitle?.trim() || "Untitled task";
  return `Rewrite the following task description in a concise, professional tone (clear for engineers and PMs, no fluff).

Requirements:
- Be noticeably shorter than the original when possible: tighten wording, drop repetition, keep one or two short paragraphs or a tight bullet-style flow as plain sentences (no markdown bullets unless the source already used them).
- Stay factual; do not invent scope, dates, owners, or acceptance criteria not implied by the original.
- Prefer imperative or direct phrasing suitable for a ticket body.

Output only the rewritten description as plain prose (no title line, no markdown headings, no quotation marks wrapping the whole text).

Task title: ${safeTitle}
Original description:
${description}`;
}

export async function callOllamaForRephrase(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        keep_alive: "30m",
        think: OLLAMA_THINK,
        options: { temperature: 0.25, num_predict: 380 },
      }),
      signal: controller.signal,
    });

    const rawBody = await ollamaResponse.text();
    if (!ollamaResponse.ok) {
      let detail = rawBody.trim().slice(0, 800);
      try {
        const errJson = JSON.parse(rawBody) as { error?: string };
        if (typeof errJson.error === "string" && errJson.error) detail = errJson.error;
      } catch {
        /* keep raw slice */
      }
      console.error("[rephrase-ollama] Ollama HTTP error", ollamaResponse.status, detail);
      const hint =
        ollamaResponse.status === 500 && detail.length < 2
          ? " If this always happens near 60s, raise timeouts on any reverse proxy in front of Ollama (e.g. nginx proxy_read_timeout) and check Ollama stderr logs."
          : "";
      throw new Error(`Ollama ${ollamaResponse.status}: ${detail || "(no body)"}${hint}`);
    }

    let payload: { message?: { content?: string } };
    try {
      payload = JSON.parse(rawBody) as { message?: { content?: string } };
    } catch {
      console.error("[rephrase-ollama] Invalid JSON from Ollama", rawBody.slice(0, 500));
      throw new Error("LLM returned invalid JSON");
    }

    const rewritten = String(payload.message?.content ?? "").trim();
    if (!rewritten) {
      throw new Error("LLM returned empty response");
    }
    return rewritten;
  } finally {
    clearTimeout(timeout);
  }
}

export function rephraseOllamaTimeoutMs(): number {
  return OLLAMA_TIMEOUT_MS;
}
