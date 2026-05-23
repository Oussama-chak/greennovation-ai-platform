from __future__ import annotations
from typing import Dict, List, Any, Optional
from langchain_groq import ChatGroq
import json
from json import JSONDecodeError
from ai.state.agent_context import AgentContext
from ai.agents.energy.metrics import learning_cache_hit_deltas, merge_metric_deltas


# ---------------------------------------------------------------------------
# LLM (ENERGY-AWARE)
# ---------------------------------------------------------------------------

def get_llm(energy: dict) -> ChatGroq:
    return ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=energy.get("temperature", 0.3),
        max_tokens=energy.get("max_tokens", 500),
    )


# ---------------------------------------------------------------------------
# CONTEXT BUILDER
# ---------------------------------------------------------------------------

MAX_CHARS = 600


def build_context(chunks: List[Dict], max_chars: int) -> str:
    context = ""
    for i, c in enumerate(chunks):
        source  = c.get("source_id", "unknown")
        page    = c.get("metadata", {}).get("page", "?")
        content = c.get("content", "")[:max_chars]
        context += f"[{i+1}] ({source}, p.{page})\n{content}\n\n"
    return context


# ---------------------------------------------------------------------------
# HISTORY BUILDER
# ---------------------------------------------------------------------------

def build_history(session_history: List[Dict], max_turns: int = 5) -> str:
    history = ""
    for turn in session_history[-max_turns:]:
        role    = turn.get("role", "user")
        content = turn.get("content", "")
        prefix  = "User" if role == "user" else "Assistant"
        history += f"{prefix}: {content}\n"
    return history


# ---------------------------------------------------------------------------
# PROMPT HINT
# ---------------------------------------------------------------------------

def apply_prompt_hint(
    task_instruction: str,
    answer_type: str,
    hint: Optional[str],
) -> str:
    """
    Workspace chat chips send prompt_hint so answers differ from free-typed
    questions (plain language vs example-first vs tight summary).
    """
    if not hint or not str(hint).strip():
        return task_instruction

    h = str(hint).strip()
    extras: Dict[str, str] = {
        "explain_simple": (
            "\n\nChip style — explain simply: plain language and short sentences; "
            "define jargon in one line; structure as intuition, then optional analogy, "
            "then one takeaway; avoid generic lecture-style headings."
        ),
        "give_example": (
            "\n\nChip style — example first: open with ONE concrete example grounded "
            "in the context (code, scenario, or steps), then briefly explain why it "
            "illustrates the idea."
        ),
        "summarize_page": (
            "\n\nChip style — summarize: tight bullets or a short numbered list "
            "(at most 5 points); no long narrative opener; end with one sentence "
            "linking to the broader lesson."
        ),
    }
    extra = extras.get(h)
    if not extra:
        return task_instruction

    applicable_types = (
        "explanation",
        "explanation_with_questions",
        "supportive_guidance",
        "summary_with_questions",
        "plan",
    )
    if answer_type in applicable_types:
        return task_instruction + extra
    return task_instruction


# ---------------------------------------------------------------------------
# PROFILE / READINESS ADAPTATION BLOCKS
# ---------------------------------------------------------------------------

def _profile_adaptation_block(profile: dict) -> str:
    if not profile:
        return ""
    tags   = profile.get("adaptation_tags") or []
    tags_s = ", ".join(tags) if tags else "none"
    reason = (profile.get("reasoning_summary") or "").strip()
    if len(reason) > 400:
        reason = reason[:400] + "…"
    return f"""
TEACHING STYLE (adapt tone/format only):
- Explanation style: {profile.get("preferred_explanation_style", "balanced")}
- Format: {profile.get("preferred_format", "clear")}
- Examples domain: {profile.get("preferred_examples_domain", "general")}
- Pace: {profile.get("pace", "medium")}
- Tags: {tags_s}
{f"- Notes: {reason}" if reason else ""}
"""


def _readiness_adaptation_block(readiness: dict) -> str:
    if not readiness:
        return ""
    reason = (readiness.get("reasoning_summary") or "").strip()
    if len(reason) > 400:
        reason = reason[:400] + "..."
    return f"""
READINESS SIGNAL (adapt teaching load and tone):
- Recommended intensity: {readiness.get("recommended_intensity", "normal")}
- Suggested session minutes: {readiness.get("suggested_session_minutes", 30)}
- Difficulty adjustment: {readiness.get("difficulty_adjustment", "keep")}
- Break recommendation: {readiness.get("break_recommendation", False)}
- Support tone: {readiness.get("support_tone", "neutral")}
{f"- Notes: {reason}" if reason else ""}
"""


# ---------------------------------------------------------------------------
# BEHAVIOUR SETTINGS  (energy + readiness → runtime knobs)
# ---------------------------------------------------------------------------

def _derive_behavior_settings(energy: dict, readiness: dict) -> Dict[str, Any]:
    energy_mode = energy.get("mode", "balanced")

    # Base difficulty from energy mode
    difficulty = "medium"
    if energy_mode == "light":
        difficulty = "easy"
    elif energy_mode == "deep":
        difficulty = "hard"

    # Readiness can override difficulty
    difficulty_adj = readiness.get("difficulty_adjustment")
    if difficulty_adj == "decrease":
        difficulty = "easy"
    elif difficulty_adj == "increase":
        difficulty = "hard"

    support_tone = readiness.get("support_tone", "neutral")
    style_hint = {
        "supportive":  "Use empathetic and encouraging language.",
        "challenging": "Use direct coaching language with stretch prompts.",
    }.get(support_tone, "Use neutral, clear, and concise language.")

    suggested_minutes = readiness.get("suggested_session_minutes", 30)
    break_needed      = readiness.get("break_recommendation", False)

    # Readiness intensity can force a depth override
    intensity    = readiness.get("recommended_intensity", "normal")
    forced_depth: Optional[str] = None
    if intensity == "low":
        forced_depth = "short"   # tired/struggling → keep it brief
    elif intensity == "high":
        forced_depth = "long"    # in flow → go deeper

    return {
        "difficulty":       difficulty,
        "support_tone":     support_tone,
        "style_hint":       style_hint,
        "suggested_minutes": suggested_minutes,
        "break_needed":     break_needed,
        "forced_depth":     forced_depth,
    }


# ---------------------------------------------------------------------------
# LENGTH INSTRUCTION  (depth × answer_type matrix)
# ---------------------------------------------------------------------------

_LENGTH_MAP: Dict[tuple, str] = {
    # short
    ("short", "exercise"):               "Questions: concise and direct. Answers: 1 sentence max per question.",
    ("short", "explanation"):            "2-3 sentences only. No headers or sub-sections.",
    ("short", "summary_with_questions"): "3-bullet summary. Questions: 1 line each, 1-sentence answers.",
    ("short", "explanation_with_questions"): "Brief explanation (2-3 sentences) then 2 short questions.",
    ("short", "plan"):                   "Bullet-point plan, max 5 items, each one line.",
    # medium
    ("medium", "exercise"):              "Mix short recall answers (1 sentence) with medium application answers (2-3 sentences).",
    ("medium", "explanation"):           "Balanced: intuition first, then 1 example, then 1 takeaway.",
    ("medium", "summary_with_questions"): "Short paragraph summary then 3 questions with 2-sentence answers.",
    ("medium", "explanation_with_questions"): "Clear explanation then 2 practice questions with 2-3 sentence answers.",
    ("medium", "plan"):                  "Structured plan with sections and brief rationale per step.",
    # long
    ("long", "exercise"):                "Rich answers with full reasoning. Analysis questions should be dominant.",
    ("long", "explanation"):             "Full explanation: concept → example → edge case → summary.",
    ("long", "summary_with_questions"):  "Detailed summary then 3 in-depth questions with thorough answers.",
    ("long", "explanation_with_questions"): "Detailed explanation with examples then 2 deep questions with full reasoning.",
    ("long", "plan"):                    "Comprehensive plan with rationale, milestones, and tips per phase.",
}

_FALLBACK_LENGTH = "Provide a balanced explanation."


def _build_length_instruction(depth: str, answer_type: str) -> str:
    return _LENGTH_MAP.get((depth, answer_type), _FALLBACK_LENGTH)


# ---------------------------------------------------------------------------
# QUESTION TAXONOMY  (difficulty → type + answer length hint)
# ---------------------------------------------------------------------------

_QUESTION_TAXONOMY: Dict[str, tuple] = {
    #  difficulty  →  (dominant_type,  answer_length_hint)
    "easy":   ("recall",      "1 sentence — state the fact directly"),
    "medium": ("application", "2-3 sentences — apply the concept to a concrete scenario"),
    "hard":   ("analysis",    "4-6 sentences — reason through trade-offs or explain why"),
}


def _build_exercise_instruction(difficulty: str, generate_quiz: bool) -> str:
    if not generate_quiz:
        return (
            "Explain the concept instead of generating questions "
            "(energy-saving mode)."
        )

    q_type, ans_length = _QUESTION_TAXONOMY.get(
        difficulty, ("application", "2-3 sentences")
    )

    return f"""
Generate EXACTLY 3 questions that progress in cognitive depth:
  1. A RECALL question   — tests memory of a key fact
  2. An APPLICATION question — applies the concept to a scenario
  3. An ANALYSIS question  — requires reasoning, comparison, or evaluation

Overall difficulty calibration: "{difficulty}" (dominant type: {q_type}).

Return ONLY valid JSON — no preamble, no markdown fences:
[
  {{
    "question": "...",
    "answer": "...",
    "difficulty": "easy",
    "question_type": "recall",
    "answer_length_hint": "1 sentence — state the fact directly"
  }},
  {{
    "question": "...",
    "answer": "...",
    "difficulty": "medium",
    "question_type": "application",
    "answer_length_hint": "2-3 sentences — apply the concept to a concrete scenario"
  }},
  {{
    "question": "...",
    "answer": "...",
    "difficulty": "{difficulty}",
    "question_type": "{q_type}",
    "answer_length_hint": "{ans_length}"
  }}
]

Per-question answer rules:
- recall      → {_QUESTION_TAXONOMY['easy'][1]}
- application → {_QUESTION_TAXONOMY['medium'][1]}
- analysis    → {_QUESTION_TAXONOMY['hard'][1]}
Use ONLY the provided context. No text outside the JSON array.
"""


# ---------------------------------------------------------------------------
# PROMPT BUILDER
# ---------------------------------------------------------------------------

def build_prompt(state: AgentContext) -> str:
    query   = state.get("query", "")
    summary = state.get("conversation_summary", "")
    history = build_history(state.get("session_history", []))

    merged   = state.get("merged_signal_bundle", {}) or {}
    draft    = state.get("response_draft", {}) or {}
    intent   = merged.get("intent", "learn_concept")
    chunks   = merged.get("retrieved_chunks", [])
    profile  = merged.get("profile_vector", {}) or {}
    readiness = merged.get("readiness_signal", {}) or {}
    energy   = merged.get("energy_decision", {}) or {}

    context       = build_context(chunks, energy.get("chunk_truncation_chars", MAX_CHARS))
    profile_block  = _profile_adaptation_block(profile)
    readiness_block = _readiness_adaptation_block(readiness)
    student_twin_block = state.get("learning_twin_context", "")
    behavior      = _derive_behavior_settings(energy, readiness)

    difficulty       = behavior["difficulty"]
    style_hint       = behavior["style_hint"]
    suggested_minutes = behavior["suggested_minutes"]
    break_needed     = behavior["break_needed"]

    # Readiness intensity can override energy depth
    depth = behavior.get("forced_depth") or energy.get("response_depth", "medium")

    mode          = energy.get("mode", "balanced")
    generate_quiz = energy.get("generate_quiz", True)

    answer_type = draft.get("answer_type", "explanation")
    structure   = draft.get("structure", "guided_explanation")
    tone        = draft.get("tone", "adaptive")

    # ---- length instruction (depth × answer_type matrix) ----
    length_instruction = _build_length_instruction(depth, answer_type)

    # ---- task instruction ----
    if answer_type == "exercise":
        task_instruction = _build_exercise_instruction(difficulty, generate_quiz)

    elif answer_type == "summary_with_questions":
        task_instruction = """
Provide:
1. A short summary of the key ideas
2. 3 revision questions with answers
   - Question 1: recall (1-sentence answer)
   - Question 2: application (2-3 sentence answer)
   - Question 3: analysis (4-6 sentence answer with reasoning)
"""

    elif answer_type == "explanation_with_questions":
        task_instruction = """
Provide:
1. A clear explanation of the concept
2. 2 practice questions with answers:
   - Question 1: application-level (2-3 sentence answer)
   - Question 2: analysis-level (4-6 sentence answer with reasoning)
"""

    elif answer_type == "plan":
        task_instruction = "Provide a structured study plan."

    else:
        task_instruction = "Provide a clear explanation with examples."

    # ---- apply chip hint ----
    ph     = state.get("prompt_hint")
    hint_s = ph.strip() if isinstance(ph, str) else None
    task_instruction = apply_prompt_hint(task_instruction, answer_type, hint_s)

    return f"""
You are an academic assistant. Use only the provided course context.
If the answer is not supported by the context, say:
"I don't know based on the course material."

TASK:
  intent={intent}
  answer_type={answer_type}
  structure={structure}
  tone={tone}
  energy_mode={mode}
  depth={depth}

{profile_block}
{readiness_block}
{student_twin_block}


BEHAVIOR:
  {style_hint}
  session_minutes={suggested_minutes}
  break_needed={break_needed}

LENGTH GUIDANCE:
  {length_instruction}

INSTRUCTION:
{task_instruction.strip()}

SUMMARY:
{summary[:300]}

HISTORY:
{history}

QUESTION:
{query}

CONTEXT:
{context}

ANSWER:
"""


# ---------------------------------------------------------------------------
# SOURCE FORMATTER
# ---------------------------------------------------------------------------

def format_sources(chunks: List[Dict]) -> List[str]:
    seen, sources = set(), []
    for i, c in enumerate(chunks):
        src = f"[{i+1}] {c.get('source_id')} (p.{c.get('metadata', {}).get('page', '?')})"
        if src not in seen:
            sources.append(src)
            seen.add(src)
    return sources


# ---------------------------------------------------------------------------
# OUTPUT PARSER
# ---------------------------------------------------------------------------

def _try_parse_json_array(text: str):
    """
    Attempt to extract a JSON array from text that may contain markdown
    fences or leading/trailing prose.
    """
    try:
        return json.loads(text)
    except JSONDecodeError:
        pass
    # Salvage: find the outermost [ ... ]
    try:
        start = text.index("[")
        end   = text.rindex("]") + 1
        return json.loads(text[start:end])
    except (ValueError, JSONDecodeError):
        return None


_QUESTION_DEFAULTS = {
    "question_type":     "application",
    "answer_length_hint": "2-3 sentences",
    "difficulty":        "medium",
}


def _normalize_questions(questions: list) -> list:
    """Guarantee every question dict has all expected fields."""
    for q in questions:
        for key, default in _QUESTION_DEFAULTS.items():
            q.setdefault(key, default)
    return questions


def parse_output(answer: str, answer_type: str) -> Dict[str, Any]:
    if answer_type == "exercise":
        parsed = _try_parse_json_array(answer)
        if parsed and isinstance(parsed, list):
            return {
                "answer_type": "exercise",
                "content": _normalize_questions(parsed),
            }
        # Fell through — return raw string so caller can still render something
        return {"answer_type": "exercise", "content": answer}

    if answer_type == "summary_with_questions":
        return {"answer_type": "summary_with_questions", "content": answer}

    if answer_type == "explanation_with_questions":
        return {"answer_type": "explanation_with_questions", "content": answer}

    if answer_type == "plan":
        return {"answer_type": "plan", "content": answer}

    return {"answer_type": "explanation", "content": answer}


# ---------------------------------------------------------------------------
# SUMMARY UPDATE  (energy-aware)
# ---------------------------------------------------------------------------

def update_conversation_summary(llm, previous_summary: str, new_turn: str) -> str:
    prompt = f"""
Update the conversation summary.

Previous summary:
{previous_summary}

New interaction:
{new_turn}

Updated summary (short, focused on learning progress):
"""
    response = llm.invoke(prompt)
    return response.content.strip()


# ---------------------------------------------------------------------------
# LEARNING AGENT NODE
# ---------------------------------------------------------------------------

def learning_agent(state: AgentContext) -> AgentContext:
    try:
        merged    = state.get("merged_signal_bundle", {}) or {}
        draft     = state.get("response_draft", {}) or {}
        chunks    = merged.get("retrieved_chunks", [])
        intent    = merged.get("intent", "learn_concept")  # noqa: F841
        readiness = merged.get("readiness_signal", {}) or {}
        energy    = merged.get("energy_decision", {}) or state.get("energy_decision", {}) or {}
        behavior  = _derive_behavior_settings(energy, readiness)

        # ---- cache hit ----
        if energy.get("reuse_cached_answer") and state.get("cached_answer") is not None:
            cached = state.get("cached_answer")
            return {
                "final_response": cached,
                "metrics": merge_metric_deltas(
                    dict(state.get("metrics") or {}),
                    learning_cache_hit_deltas(),
                ),
                "agent_runs": {
                    **state.get("agent_runs", {}),
                    "learning_agent": {
                        "status": "cache_hit",
                        "mode": energy.get("mode", "balanced"),
                    },
                },
            }

        # ---- no context fallback ----
        if not chunks:
            return {
                "final_response": "I couldn't find this in your course material.",
                "agent_runs": {
                    **state.get("agent_runs", {}),
                    "learning_agent": {"status": "no_context"},
                },
            }

        # ---- generate ----
        llm    = get_llm(energy)
        prompt = build_prompt(state)

        response    = llm.invoke(prompt)
        answer      = response.content.strip()
        answer_type = draft.get("answer_type", "explanation")
        parsed      = parse_output(answer, answer_type)
        sources     = format_sources(chunks)
        include_sources = energy.get("include_sources", True)

        # ========================= FINAL RESPONSE =========================
        if answer_type == "exercise" and isinstance(parsed["content"], list):
            final_response = parsed["content"]           # list of question dicts
            assistant_text = json.dumps(final_response)
        else:
            if include_sources:
                final_response = (
                    parsed["content"] + "\n\nSources:\n" + "\n".join(sources)
                )
            else:
                final_response = parsed["content"]
            assistant_text = final_response

        # ========================= MEMORY UPDATE ==========================
        session_history = list(state.get("session_history", []))
        session_history.append({"role": "user",      "content": state.get("query", "")})
        session_history.append({"role": "assistant", "content": assistant_text})
        session_history = session_history[-10:]

        # ========================= SUMMARY UPDATE =========================
        previous_summary     = state.get("conversation_summary", "")
        should_update_summary = (
            energy.get("mode") != "light"
            and len(session_history) % 4 == 0
        )
        if should_update_summary:
            new_turn        = f"User: {state.get('query')} \nAssistant: {assistant_text}"
            updated_summary = update_conversation_summary(llm, previous_summary, new_turn)
        else:
            updated_summary = previous_summary

        # ========================= ENERGY CACHE ===========================
        existing_draft = state.get("response_draft", {}) or {}
        energy_cache   = dict(state.get("energy_cache") or {})
        answer_cache   = dict(energy_cache.get("answer_cache") or {})
        rag_cache      = dict(energy_cache.get("rag_cache") or {})

        cache_key = energy.get("cache_key")
        if cache_key:
            answer_cache[cache_key] = final_response
            rag_cache[cache_key]    = chunks

        energy_cache["answer_cache"]          = answer_cache
        energy_cache["rag_cache"]             = rag_cache
        energy_cache["last_readiness_input"]  = state.get("passive_behavior_signals") or {}

        return {
            "final_response":       final_response,
            "session_history":      session_history,
            "conversation_summary": updated_summary,
            "energy_cache":         energy_cache,
            "response_draft": {
                "answer_type": parsed["answer_type"],
                "structure":   existing_draft.get("structure", "contextual_rag"),
                "tone":        existing_draft.get("tone", behavior["support_tone"]),
            },
            "agent_runs": {
                **state.get("agent_runs", {}),
                "learning_agent": {
                    "status": "success",
                    "mode":   energy.get("mode", "balanced"),
                },
            },
        }

    except Exception as e:
        return {
            "final_response": "Something went wrong.",
            "errors": state.get("errors", []) + [str(e)],
            "agent_runs": {
                **state.get("agent_runs", {}),
                "learning_agent": {
                    "status": "failed",
                    "error":  str(e),
                },
            },
        }