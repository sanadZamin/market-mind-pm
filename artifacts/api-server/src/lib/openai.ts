const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const OPENAI_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(process.env.OPENAI_TIMEOUT_MS?.trim() ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000;
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

// Reasoning models (o-series, gpt-5) reject any temperature other than the default.
function supportsTemperature(model: string): boolean {
  return !/^(o1|o3|o4|gpt-5)/i.test(model);
}

/** Single-turn chat completion. Omit `maxTokens` to let the model decide the length. */
export async function callOpenAi(
  prompt: string,
  { temperature, maxTokens, timeoutMs = OPENAI_TIMEOUT_MS }: {
    temperature: number;
    maxTokens?: number;
    timeoutMs?: number;
  },
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OpenAI: OPENAI_API_KEY is not set on the API server");

  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages: [{ role: "user", content: prompt }],
  };
  if (supportsTemperature(OPENAI_MODEL)) body.temperature = temperature;
  if (maxTokens) body.max_completion_tokens = maxTokens;

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    let detail = rawBody.trim().slice(0, 500);
    try {
      const errJson = JSON.parse(rawBody) as { error?: { message?: string } };
      if (errJson.error?.message) detail = errJson.error.message;
    } catch {
      /* keep raw slice */
    }
    throw new Error(`OpenAI ${response.status}: ${detail || "(no body)"}`);
  }

  let payload: { choices?: { message?: { content?: string | null } }[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new Error("LLM returned invalid JSON");
  }

  const content = String(payload.choices?.[0]?.message?.content ?? "").trim();
  if (!content) throw new Error("LLM returned empty response");
  return content;
}

export function callOpenAiForRephrase(prompt: string): Promise<string> {
  return callOpenAi(prompt, { temperature: 0.25, maxTokens: 500 });
}

export function openAiTimeoutMs(): number {
  return OPENAI_TIMEOUT_MS;
}
