from __future__ import annotations

from typing import Any, Dict, List, Literal
from typing_extensions import TypedDict



# Core literals


IntentType = Literal[
    "learn_concept",
    "practice",
    "revise",
    "plan_study",
    "wellbeing_check",
    "mixed",
    "unknown",
]

EnergyMode = Literal["light", "balanced", "deep"]

AgentName = Literal[
    "orchestrator",
    "profile_agent",
    "rag_agent",
    "readiness_agent",
    "energy_agent",
    "learning_agent",
    "planning_agent",
]


# Shared sub-objects


class MessageTurn(TypedDict, total=False):
    role: Literal["system", "user", "assistant"]
    content: str
    timestamp: str


class UserProfile(TypedDict, total=False):
    user_id: str
    full_name: str
    preferred_language: str
    academic_level: str
    department: str
    learning_style: str
    pace_preference: str
    accessibility_needs: List[str]
    strengths: List[str]
    weak_topics: List[str]


class SessionSnapshot(TypedDict, total=False):
    session_id: str
    current_course_id: str
    current_lesson_id: str
    active_topic: str
    current_goal: str
    last_user_action: str
    platform: str


class CourseContext(TypedDict, total=False):
    course_id: str
    course_name: str
    lesson_id: str
    lesson_title: str
    syllabus_topics: List[str]
    allowed_sources: List[str]


class RoutingDecision(TypedDict, total=False):
    intent: IntentType
    requested_agents: List[AgentName]
    route_reason: str
    priority: Literal["low", "normal", "high"]
    token_budget: int


# Retrieval


class RetrievalQuery(TypedDict, total=False):
    rewritten_query: str
    filters: Dict[str, Any]
    top_k: int
    search_type: Literal["semantic", "keyword", "hybrid"]
    max_chars_per_chunk: int  # 🔥 energy-aware truncation


class RetrievedChunk(TypedDict, total=False):
    chunk_id: str
    source_id: str
    document_id: str
    title: str
    content: str
    score: float
    metadata: Dict[str, Any]



# Profile & Readiness


class ProfileVector(TypedDict, total=False):
    preferred_explanation_style: str
    preferred_format: str
    preferred_examples_domain: str
    pace: str
    adaptation_tags: List[str]
    confidence: float
    reasoning_summary: str
    evidence: List[str]


# =========================
# Readiness agent
# =========================

class PassiveBehaviorSignals(TypedDict, total=False):
    # workload pressure
    tasks_due_3d: int
    overdue_tasks: int
    project_risk_level: Literal["low", "medium", "high"]

    # study stability
    study_sessions_last_7d: int
    avg_session_completion_rate: float

    # performance trend
    avg_quiz_score_trend: float

    # behavioral fatigue
    late_night_activity_ratio: float
    long_sessions_without_breaks: int


class ReadinessSignal(TypedDict, total=False):
    workload_pressure_score: float
    study_stability_score: float
    performance_trend_score: float
    behavioral_fatigue_score: float

    workload_pressure_band: Literal["low", "medium", "high"]
    study_stability_band: Literal["low", "medium", "high"]
    performance_trend_band: Literal["low", "medium", "high"]
    behavioral_fatigue_band: Literal["low", "medium", "high"]

    recommended_intensity: Literal["light", "normal", "full", "recovery_light"]
    suggested_session_minutes: int

    # MVP adaptation controls for the Learning Plan agent
    difficulty_adjustment: Literal["decrease", "keep", "increase"]
    break_recommendation: bool
    support_tone: Literal["supportive", "neutral", "challenging"]

    risk_flags: List[str]
    top_risk_flags: List[str]
    reasoning_summary: str



# Energy Decision 


class EnergyDecision(TypedDict, total=False):
    # mode
    mode: EnergyMode

    # LLM control
    max_tokens: int
    temperature: float

    # RAG control
    use_rag: bool
    top_k: int
    chunk_truncation_chars: int

    # agent execution control
    allow_learning_agent: bool
    allow_planning_agent: bool
    allow_profile_agent: bool

    # feature toggles
    generate_quiz: bool
    include_sources: bool

    # response shaping
    response_depth: Literal["short", "medium", "long"]

    # energy / cost tracking
    token_budget_remaining: int
    estimated_cost: float

    # reasoning
    reason: str
    cache_key: str
    reuse_cached_answer: bool
    reuse_cached_rag: bool
    reuse_readiness_signal: bool
    readiness_inputs_unchanged: bool
    profile_ttl_ok: bool


# Learning / Planning


class LearningPlanSignal(TypedDict, total=False):
    recommended_action: str
    next_topic: str
    difficulty_adjustment: str
    review_needed: bool


class MergedSignalBundle(TypedDict, total=False):
    intent: IntentType
    energy_mode: EnergyMode
    token_budget: int

    workload_pressure_score: float
    study_stability_score: float
    performance_trend_score: float
    behavioral_fatigue_score: float

    learning_vector: Dict[str, Any]
    retrieved_chunks: List[RetrievedChunk]
    response_strategy: str
    planning_signal: LearningPlanSignal


class ResponseDraft(TypedDict, total=False):
    answer_type: Literal[
        "explanation",
        "exercise",
        "summary",
        "plan",
        "supportive_guidance"
    ]
    structure: str
    tone: str
    key_points: List[str]


class PlannerState(TypedDict, total=False):
    """Daily planner cadence; single key used by graph + `planning_agent`."""
    last_generated_date: str  # ISO date (UTC), e.g. "2026-04-19"
    turns_since_last_plan: int


class AgentRunMeta(TypedDict, total=False):
    status: Literal["pending", "success", "failed", "skipped"]
    started_at: str
    finished_at: str
    duration_ms: int
    error: str


# =========================
# Main Shared State
# =========================

class AgentContext(TypedDict, total=False):

    # ---- request/session input ----
    query: str
    user_profile: UserProfile
    session_history: List[MessageTurn]
    conversation_summary: str  

    session_snapshot: SessionSnapshot
    course_context: CourseContext
    concept_graph: Dict[str, Any]

    # ---- orchestrator-owned ----
    routing: RoutingDecision

    # ---- passive readiness inputs ----
    passive_behavior_signals: PassiveBehaviorSignals

    # ---- agent namespaces ----
    retrieval_query: RetrievalQuery
    retrieved_chunks: List[RetrievedChunk]

    profile_vector: ProfileVector
    readiness_signal: ReadinessSignal
    student_twin: Dict[str, Any]
    energy_decision: EnergyDecision
    cached_answer: Any
    cached_rag_chunks: List[RetrievedChunk]
    energy_cache: Dict[str, Any]

    # ---- merged output ----
    merged_signal_bundle: MergedSignalBundle
    response_draft: ResponseDraft

    # ---- downstream/final ----
    final_response: Any  # can be str OR JSON (quiz)
    planning_task: Dict[str, Any]
    planner_state: PlannerState
    force_planner: bool

    # ---- energy tracking (NEW) ----
    total_tokens_used: int
    total_estimated_cost: float
    request_count: int

    # ---- observability ----
    warnings: List[str]
    errors: List[str]
    traces: List[Dict[str, Any]]
    metrics: Dict[str, Any]
    agent_runs: Dict[str, AgentRunMeta]