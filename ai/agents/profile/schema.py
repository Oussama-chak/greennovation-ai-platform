from typing import List

from pydantic import BaseModel, Field

from ai.agents.student_modeling.schemas import StudentTwinSnapshot


class ProfileInference(BaseModel):
    preferred_explanation_style: str = Field(...)
    preferred_format: str = Field(...)
    preferred_examples_domain: str = Field(...)
    pace: str = Field(...)
    adaptation_tags: List[str] = Field(default_factory=list)
    confidence: float = Field(...)
    reasoning_summary: str = Field(...)
    evidence: List[str] = Field(default_factory=list)


class ProfileAndTwinInference(BaseModel):
    """
    Output of the profile/student-modeling LLM.

    The profile vector is the short-term teaching preference.
    The student twin is the long-term evolving learner model.
    """

    profile_vector: ProfileInference
    student_twin: StudentTwinSnapshot