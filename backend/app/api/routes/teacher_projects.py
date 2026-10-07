from fastapi import APIRouter

from backend.app.schemas.project import ProjectsPayload
from backend.app.services import teacher_projects_service

router = APIRouter(tags=["teacher-projects"])


@router.get("/api/teacher/projects")
def get_teacher_projects():
    return ProjectsPayload(projects=teacher_projects_service.load_teacher_projects())


@router.put("/api/teacher/projects")
def put_teacher_projects(body: ProjectsPayload):
    saved = teacher_projects_service.save_teacher_projects(list(body.projects))
    return ProjectsPayload(projects=saved)
