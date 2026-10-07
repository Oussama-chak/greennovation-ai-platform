from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Standing = Literal["Excellent", "On track", "Needs support"]
MaterialKind = Literal["pdf", "slides", "exercise", "notes"]
MaterialStatus = Literal["Published", "Draft"]
CourseStatus = Literal["Published", "Draft", "Updating"]


class TeacherStudent(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=1, max_length=320)


class ClassEnrollment(BaseModel):
    studentId: str = Field(..., min_length=1, max_length=128)
    progress: int = Field(default=0, ge=0, le=100)
    averageScore: int = Field(default=0, ge=0, le=100)
    lastActive: str = Field(default="", max_length=80)
    standing: Standing = "On track"


class TeacherClass(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=200)
    courseId: str = Field(..., min_length=1, max_length=128)
    term: str = Field(default="", max_length=120)
    schedule: str = Field(default="", max_length=200)
    enrollments: list[ClassEnrollment] = Field(default_factory=list)


class CourseMaterial(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    title: str = Field(..., min_length=1, max_length=500)
    kind: MaterialKind = "notes"
    size: str = Field(default="", max_length=80)
    uploadedAt: str = Field(default="", max_length=80)
    status: MaterialStatus = "Draft"


class CourseChapter(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    title: str = Field(..., min_length=1, max_length=300)
    order: int = Field(default=1, ge=1, le=10_000)
    summary: str = Field(default="", max_length=4000)
    materials: list[CourseMaterial] = Field(default_factory=list)


class TeacherCourse(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    title: str = Field(..., min_length=1, max_length=300)
    description: str = Field(default="", max_length=4000)
    status: CourseStatus = "Draft"
    chapters: list[CourseChapter] = Field(default_factory=list)


class CatalogPayload(BaseModel):
    courses: list[TeacherCourse] = Field(default_factory=list)
    classes: list[TeacherClass] = Field(default_factory=list)
    students: list[TeacherStudent] = Field(default_factory=list)
