from pydantic import BaseModel, Field


class Milestone(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=500)
    done: bool = False


class Project(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=500)
    tag: str = Field(default="General", max_length=120)
    due: str = Field(default="", max_length=80)
    dueISO: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{4}-\d{2}-\d{2}$")
    nextStep: str = Field(default="", max_length=2000)
    notes: int = Field(default=0, ge=0, le=1_000_000)
    milestones: list[Milestone] = Field(default_factory=list)
    assignedByTeacher: bool | None = None
    classId: str | None = Field(default=None, max_length=128)


class ProjectsPayload(BaseModel):
    projects: list[Project]
