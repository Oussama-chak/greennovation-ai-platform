/**
 * Teacher / school catalog accessors.
 * Data is hydrated from GET /api/catalog into catalogStore (seed fallback offline).
 */

import { getClasses, getCourses, getStudents } from "@/lib/catalogStore";
import type {
  ClassEnrollment,
  CourseChapter,
  CourseMaterial,
  MaterialKind,
  StudentStanding,
  TeacherClass,
  TeacherConceptInsight,
  TeacherCourse,
  TeacherQuestionInsight,
  TeacherStudent,
  TeacherSuggestion,
} from "@/data/teacherSeed";
import {
  commonQuestions,
  conceptInsights,
  contentSuggestions,
  teacherProfile,
} from "@/data/teacherSeed";

export type {
  ClassEnrollment,
  CourseChapter,
  CourseMaterial,
  MaterialKind,
  StudentStanding,
  TeacherClass,
  TeacherConceptInsight,
  TeacherCourse,
  TeacherQuestionInsight,
  TeacherStudent,
  TeacherSuggestion,
};

export {
  commonQuestions,
  conceptInsights,
  contentSuggestions,
  teacherProfile,
};

function liveArrayProxy<T extends object>(read: () => T[]): T[] {
  return new Proxy([] as T[], {
    get(_target, prop, receiver) {
      const list = read();
      const value = Reflect.get(list, prop, receiver);
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(list) : value;
    },
    ownKeys() {
      return Reflect.ownKeys(read());
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Object.getOwnPropertyDescriptor(read(), prop);
    },
    has(_target, prop) {
      return prop in read();
    },
  });
}

/** Live catalog arrays backed by the shared store (API-hydrated). */
export const courses = liveArrayProxy(getCourses);
export const classes = liveArrayProxy(getClasses);
export const students = liveArrayProxy(getStudents);

export function getCourse(courseId: string): TeacherCourse | undefined {
  return getCourses().find((course) => course.id === courseId);
}

export function getClass(classId: string): TeacherClass | undefined {
  return getClasses().find((cls) => cls.id === classId);
}

export function getStudent(studentId: string): TeacherStudent | undefined {
  return getStudents().find((student) => student.id === studentId);
}

export function classesForCourse(courseId: string): TeacherClass[] {
  return getClasses().filter((cls) => cls.courseId === courseId);
}

export type ClassSummary = {
  id: string;
  name: string;
  courseId: string;
  courseTitle: string;
  term: string;
  schedule: string;
  studentCount: number;
  needsSupport: number;
  averageProgress: number;
};

export function summarizeClass(cls: TeacherClass): ClassSummary {
  const course = getCourse(cls.courseId);
  const studentCount = cls.enrollments.length;
  const needsSupport = cls.enrollments.filter((e) => e.standing === "Needs support").length;
  const averageProgress =
    studentCount === 0
      ? 0
      : Math.round(cls.enrollments.reduce((sum, e) => sum + e.progress, 0) / studentCount);
  return {
    id: cls.id,
    name: cls.name,
    courseId: cls.courseId,
    courseTitle: course?.title ?? "Unknown course",
    term: cls.term,
    schedule: cls.schedule,
    studentCount,
    needsSupport,
    averageProgress,
  };
}

export type SupportAlert = {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  courseTitle: string;
  progress: number;
  lastActive: string;
};

export function studentsNeedingSupport(limit?: number): SupportAlert[] {
  const alerts: SupportAlert[] = [];
  for (const cls of getClasses()) {
    const course = getCourse(cls.courseId);
    for (const enrollment of cls.enrollments) {
      if (enrollment.standing !== "Needs support") continue;
      const student = getStudent(enrollment.studentId);
      if (!student) continue;
      alerts.push({
        studentId: student.id,
        studentName: student.name,
        classId: cls.id,
        className: cls.name,
        courseTitle: course?.title ?? "Unknown course",
        progress: enrollment.progress,
        lastActive: enrollment.lastActive,
      });
    }
  }
  alerts.sort((a, b) => a.progress - b.progress);
  return typeof limit === "number" ? alerts.slice(0, limit) : alerts;
}

export type DraftMaterialAlert = {
  courseId: string;
  courseTitle: string;
  chapterTitle: string;
  materialTitle: string;
};

export function draftMaterials(): DraftMaterialAlert[] {
  const out: DraftMaterialAlert[] = [];
  for (const course of getCourses()) {
    for (const chapter of course.chapters) {
      for (const material of chapter.materials) {
        if (material.status !== "Draft") continue;
        out.push({
          courseId: course.id,
          courseTitle: course.title,
          chapterTitle: chapter.title,
          materialTitle: material.title,
        });
      }
    }
  }
  return out;
}

/** Live stats object — properties recompute from the shared catalog. */
export const teacherStats = {
  get courses() {
    return getCourses().length;
  },
  get classes() {
    return getClasses().length;
  },
  get students() {
    return getStudents().length;
  },
  get needsSupport() {
    return studentsNeedingSupport().length;
  },
  get drafts() {
    return draftMaterials().length;
  },
};
