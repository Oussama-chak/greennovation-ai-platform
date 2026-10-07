/**
 * Shared school catalog (courses, classes, students).
 * Seeded from teacher.ts, then hydrated from GET /api/catalog so teacher + student share one system.
 */

import type { TeacherClass, TeacherCourse, TeacherStudent } from "@/data/teacher";
import {
  classes as SEED_CLASSES,
  courses as SEED_COURSES,
  students as SEED_STUDENTS,
} from "@/data/teacherSeed";

export type CatalogState = {
  courses: TeacherCourse[];
  classes: TeacherClass[];
  students: TeacherStudent[];
};

let state: CatalogState = {
  courses: SEED_COURSES,
  classes: SEED_CLASSES,
  students: SEED_STUDENTS,
};

const listeners = new Set<() => void>();

export function getCatalogState(): CatalogState {
  return state;
}

export function subscribeCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hydrateCatalog(next: CatalogState): void {
  state = {
    courses: next.courses,
    classes: next.classes,
    students: next.students,
  };
  listeners.forEach((listener) => listener());
}

export function getCourses(): TeacherCourse[] {
  return state.courses;
}

export function getClasses(): TeacherClass[] {
  return state.classes;
}

export function getStudents(): TeacherStudent[] {
  return state.students;
}
