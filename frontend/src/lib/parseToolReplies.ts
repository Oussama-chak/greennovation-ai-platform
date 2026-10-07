/**
 * Parse AI replies for Summary / Quiz / Explain tool flows.
 */

export type QuizItem = {
  question: string;
  answer: string;
  difficulty?: string;
  options?: string[];
};

/** Prefer structured list from API (exercise JSON). */
export function extractQuizItems(reply: string, replyRaw: unknown): QuizItem[] | null {
  if (Array.isArray(replyRaw)) {
    const out: QuizItem[] = [];
    for (const x of replyRaw) {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const q = o.question != null ? String(o.question).trim() : "";
        const a = o.answer != null ? String(o.answer).trim() : "";
        const options = Array.isArray(o.options)
          ? o.options.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
          : undefined;
        if (q || a) {
          out.push({
            question: q,
            answer: a,
            difficulty: o.difficulty != null ? String(o.difficulty) : undefined,
            options: options && options.length > 0 ? options : undefined,
          });
        }
      }
    }
    if (out.length) return out;
  }
  return parseQuizMarkdown(reply);
}

/** Matches **Q1** question line then *Answer:* (markdown fallback). */
export function parseQuizMarkdown(text: string): QuizItem[] | null {
  const t = text.replace(/\r\n/g, "\n");
  const blocks = t.split(/\*\*Q\s*\d+\*\*/i);
  if (blocks.length < 2) return null;
  const items: QuizItem[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const chunk = blocks[i].trim();
    const m = chunk.match(/^([^\n]+)\s*\n\s*\*Answer:?\*?\s*([\s\S]+)$/i);
    if (m) {
      items.push({ question: m[1].trim(), answer: m[2].trim() });
    } else {
      const idx = chunk.search(/\*Answer:?\*?\s*/i);
      if (idx > 0) {
        items.push({
          question: chunk.slice(0, idx).replace(/\n/g, " ").trim(),
          answer: chunk.slice(idx).replace(/^\*Answer:?\*?\s*/i, "").trim(),
        });
      }
    }
  }
  return items.length ? items : null;
}

/** Text before first quiz question (if any). */
export function quizIntroText(reply: string): string {
  const t = reply.replace(/\r\n/g, "\n");
  const idx = t.search(/\*\*Q\s*1\s*\*\*/i);
  if (idx <= 0) return "";
  return t.slice(0, idx).trim();
}

export type SummarySections = { lead: string; rest: string };

export type ComposerToolKind = "summary" | "quiz" | "mcq" | "explain";

/**
 * Infer Summarize / Explain / Quiz / MCQ from natural wording so the student
 * does not have to tap a mode chip first.
 */
export function detectComposerMode(text: string): ComposerToolKind | null {
  const q = text.trim().toLowerCase();
  if (!q) return null;

  if (
    /\b(multiple\s*choice|mcq|choose\s+the\s+correct|pick\s+the\s+correct)\b/.test(q) ||
    /\b(a\s*\/\s*b\s*\/\s*c|options?\s+a\b)/.test(q)
  ) {
    return "mcq";
  }
  if (
    /\b(quiz\s*me|quiz|practice\s+questions?|test\s+me|give\s+me\s+(a\s+)?quiz|exercises?)\b/.test(q)
  ) {
    return "quiz";
  }
  if (
    /\b(summarize|summarise|summary|revise|revision|review\s+(this|the|it))\b/.test(q)
  ) {
    return "summary";
  }
  if (
    /\b(explain|what\s+is|what'?s|whats\s+|teach\s+me|help\s+me\s+understand|define|describe|walk\s+me\s+through)\b/.test(
      q,
    )
  ) {
    return "explain";
  }
  return null;
}

type ExplainConcept = { name?: string; definition?: string; example?: string };

/** Turn accidental explain-JSON from the model into readable markdown. */
export function formatExplainStructuredReply(text: string): string | null {
  const raw = text.replace(/\r\n/g, "\n").trim();
  if (!raw.startsWith("{") && !raw.includes('"key_concepts"')) return null;

  let obj: Record<string, unknown> | null = null;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    obj = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  const concepts = obj.key_concepts;
  const introduction = obj.introduction != null ? String(obj.introduction).trim() : "";
  const takeaway = obj.takeaway != null ? String(obj.takeaway).trim() : "";
  if (!Array.isArray(concepts) || (!introduction && concepts.length === 0 && !takeaway)) {
    return null;
  }

  const parts: string[] = [];
  if (introduction) parts.push(introduction);

  for (const item of concepts) {
    if (!item || typeof item !== "object") continue;
    const c = item as ExplainConcept;
    const name = c.name != null ? String(c.name).trim() : "";
    const definition = c.definition != null ? String(c.definition).trim() : "";
    let example = c.example != null ? String(c.example).trim() : "";
    if (example) {
      example = example
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"');
    }
    if (name) parts.push(`### ${name}`);
    if (definition) parts.push(definition);
    if (example) {
      if (/^```/.test(example)) parts.push(example);
      else parts.push("```\n" + example + "\n```");
    }
  }

  if (takeaway) parts.push(`**Takeaway:** ${takeaway}`);
  const md = parts.join("\n\n").trim();
  return md.length > 0 ? md : null;
}

/**
 * Split summary + follow-up (questions / revision) when the model uses clear separators.
 */
export function parseSummarySections(text: string): SummarySections | null {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (t.length < 80) return null;

  const splitters: RegExp[] = [
    /\n\n(?:#{1,3}\s*)?(?:Revision questions|Practice questions|Questions)\b/i,
    /\n\n(?:#{1,3}\s*)?\d+[\.)]\s*(?:Revision|Practice|Check)[^\n]*/i,
    /\n\n\*{0,2}(?:Q\d+|Question\s*\d+)/i,
  ];

  for (const re of splitters) {
    const m = t.match(re);
    if (m?.index != null && m.index > 60) {
      return { lead: t.slice(0, m.index).trim(), rest: t.slice(m.index).trim() };
    }
  }

  const h2 = t.search(/\n##\s+/);
  if (h2 > 80) {
    return { lead: t.slice(0, h2).trim(), rest: t.slice(h2).trim() };
  }

  return null;
}

/** Lines like `[1] file.pdf (p.12)` after a `Sources:` heading (RAG citations). */
export function parseSourcesFromReply(text: string): string[] {
  const t = text.replace(/\r\n/g, "\n");
  const m = t.match(/(?:^|\n)(?:#{1,3}\s*)?(?:\*\*)?Sources?:?\s*(?:\*\*)?\s*\n([\s\S]*)$/i);
  if (!m?.[1]) return [];
  const block = m[1];
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    if (/^\[\d+\]/.test(line)) {
      const rest = line.replace(/^\[\d+\]\s*/, "").trim();
      out.push(rest || line);
    }
  }
  return out;
}

/** Remove the Sources block from assistant markdown when we show it in the sidebar. */
export function stripSourcesBlock(text: string): string {
  const t = text.replace(/\r\n/g, "\n");
  if (!/\bSources?:\s*/i.test(t)) return text.trim();
  const re = /\n(?:#{1,3}\s*)?(?:\*\*)?Sources?:?\s*(?:\*\*)?\s*\n[\s\S]*$/i;
  return t.replace(re, "").trim();
}

export type RoutingSummary = { intent: string; reason: string; agents: string };

/** Compact labels for orchestrator `routing` (intent, agents run, reason). */
export function formatRoutingSummary(routing: Record<string, unknown> | null | undefined): RoutingSummary | null {
  if (!routing || typeof routing !== "object") return null;
  const intent = String(routing.intent ?? "unknown");
  const reason = String(routing.route_reason ?? "").trim();
  const agents = routing.requested_agents;
  const agentsLabel = Array.isArray(agents) ? agents.map((a) => String(a)).join(" · ") : "";
  return {
    intent,
    reason: reason || "—",
    agents: agentsLabel || "—",
  };
}
