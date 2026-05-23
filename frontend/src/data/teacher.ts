/**
 * Static teacher mock data.
 *
 * Model:
 *   Course → Chapters → Materials   (the curriculum / content)
 *   Class  → Enrollments → Students (a cohort taking one course)
 *   A teacher owns multiple Courses and teaches multiple Classes.
 *   Students are linked to Classes (not directly to Courses).
 */

export type TeacherStudent = {
  id: string;
  name: string;
  email: string;
};

export type StudentStanding = "Excellent" | "On track" | "Needs support";

export type ClassEnrollment = {
  studentId: string;
  progress: number;
  averageScore: number;
  lastActive: string;
  standing: StudentStanding;
};

export type TeacherClass = {
  id: string;
  name: string;
  courseId: string;
  term: string;
  schedule: string;
  enrollments: ClassEnrollment[];
};

export type MaterialKind = "pdf" | "slides" | "exercise" | "notes";

export type CourseMaterial = {
  id: string;
  title: string;
  kind: MaterialKind;
  size: string;
  uploadedAt: string;
  status: "Published" | "Draft";
};

export type CourseChapter = {
  id: string;
  title: string;
  order: number;
  summary: string;
  materials: CourseMaterial[];
};

export type TeacherCourse = {
  id: string;
  title: string;
  description: string;
  status: "Published" | "Draft" | "Updating";
  chapters: CourseChapter[];
};

export type TeacherConceptInsight = {
  concept: string;
  course: string;
  struggleRate: number;
  signal: string;
};

export type TeacherQuestionInsight = {
  question: string;
  count: number;
  course: string;
};

export type TeacherSuggestion = {
  title: string;
  detail: string;
  impact: "High" | "Medium" | "Low";
};

export const teacherProfile = {
  name: "Prof. Lina Haddad",
  department: "Computer Science Department",
  initials: "LH",
};

export const students: TeacherStudent[] = [
  { id: "stu-sara", name: "Sara Benali", email: "sara.benali@example.edu" },
  { id: "stu-yassine", name: "Yassine Karim", email: "yassine.karim@example.edu" },
  { id: "stu-nour", name: "Nour Haddad", email: "nour.haddad@example.edu" },
  { id: "stu-amine", name: "Amine Bouchra", email: "amine.bouchra@example.edu" },
  { id: "stu-lina", name: "Lina Ait", email: "lina.ait@example.edu" },
  { id: "stu-omar", name: "Omar Idrissi", email: "omar.idrissi@example.edu" },
  { id: "stu-meryem", name: "Meryem Saidi", email: "meryem.saidi@example.edu" },
  { id: "stu-ilyas", name: "Ilyas Naji", email: "ilyas.naji@example.edu" },
  { id: "stu-rim", name: "Rim Othmani", email: "rim.othmani@example.edu" },
  { id: "stu-karim", name: "Karim Faraj", email: "karim.faraj@example.edu" },
];

export const courses: TeacherCourse[] = [
  {
    id: "python-foundations",
    title: "Python Foundations",
    description: "Core programming concepts, OOP basics, exercises, and exam prep.",
    status: "Published",
    chapters: [
      {
        id: "py-ch-1",
        title: "Control Flow",
        order: 1,
        summary: "Conditionals, loops, and function basics with practice sets.",
        materials: [
          {
            id: "py-loops-exercises",
            title: "Loops and Functions - Practice Set.docx",
            kind: "exercise",
            size: "940 KB",
            uploadedAt: "Yesterday",
            status: "Published",
          },
        ],
      },
      {
        id: "py-ch-2",
        title: "Object-Oriented Programming",
        order: 2,
        summary: "Classes, instances, inheritance, and composition.",
        materials: [
          {
            id: "py-oop-pdf",
            title: "Chapter 4 - Object-Oriented Programming.pdf",
            kind: "pdf",
            size: "2.8 MB",
            uploadedAt: "Today",
            status: "Published",
          },
        ],
      },
      {
        id: "py-ch-3",
        title: "Revision",
        order: 3,
        summary: "Midterm review notes and worked examples.",
        materials: [
          {
            id: "py-exam-notes",
            title: "Midterm Revision Notes.md",
            kind: "notes",
            size: "48 KB",
            uploadedAt: "2 days ago",
            status: "Draft",
          },
        ],
      },
    ],
  },
  {
    id: "machine-learning",
    title: "Machine Learning Essentials",
    description: "Regression, classification, model evaluation, and practical labs.",
    status: "Updating",
    chapters: [
      {
        id: "ml-ch-1",
        title: "Regression",
        order: 1,
        summary: "Linear and polynomial regression, intuition and math.",
        materials: [
          {
            id: "ml-regression-slides",
            title: "Linear Regression Lecture Deck.pptx",
            kind: "slides",
            size: "5.4 MB",
            uploadedAt: "Today",
            status: "Draft",
          },
        ],
      },
      {
        id: "ml-ch-2",
        title: "Evaluation",
        order: 2,
        summary: "Precision, recall, ROC, and choosing the right metric.",
        materials: [
          {
            id: "ml-eval-pdf",
            title: "Model Evaluation Guide.pdf",
            kind: "pdf",
            size: "1.7 MB",
            uploadedAt: "3 days ago",
            status: "Published",
          },
        ],
      },
    ],
  },
  {
    id: "data-structures",
    title: "Data Structures",
    description: "Arrays, linked lists, trees, graphs, and algorithmic reasoning.",
    status: "Draft",
    chapters: [
      {
        id: "ds-ch-1",
        title: "Graphs",
        order: 1,
        summary: "Traversal algorithms with worked examples.",
        materials: [
          {
            id: "ds-graphs",
            title: "Graph Traversal Worked Examples.pdf",
            kind: "pdf",
            size: "1.2 MB",
            uploadedAt: "Last week",
            status: "Published",
          },
        ],
      },
    ],
  },
];

export const classes: TeacherClass[] = [
  {
    id: "py-section-b",
    name: "Section B",
    courseId: "python-foundations",
    term: "Spring 2026",
    schedule: "Mon / Wed 10:00",
    enrollments: [
      {
        studentId: "stu-sara",
        progress: 82,
        averageScore: 88,
        lastActive: "12 min ago",
        standing: "Excellent",
      },
      {
        studentId: "stu-yassine",
        progress: 63,
        averageScore: 71,
        lastActive: "Today",
        standing: "On track",
      },
      {
        studentId: "stu-nour",
        progress: 39,
        averageScore: 56,
        lastActive: "3 days ago",
        standing: "Needs support",
      },
    ],
  },
  {
    id: "py-section-c",
    name: "Section C",
    courseId: "python-foundations",
    term: "Spring 2026",
    schedule: "Tue / Thu 14:00",
    enrollments: [
      {
        studentId: "stu-rim",
        progress: 71,
        averageScore: 80,
        lastActive: "Today",
        standing: "On track",
      },
      {
        studentId: "stu-karim",
        progress: 44,
        averageScore: 58,
        lastActive: "Yesterday",
        standing: "Needs support",
      },
    ],
  },
  {
    id: "ml-section-a",
    name: "Section A",
    courseId: "machine-learning",
    term: "Spring 2026",
    schedule: "Mon / Fri 13:00",
    enrollments: [
      {
        studentId: "stu-amine",
        progress: 71,
        averageScore: 78,
        lastActive: "1 hour ago",
        standing: "On track",
      },
      {
        studentId: "stu-lina",
        progress: 54,
        averageScore: 66,
        lastActive: "Yesterday",
        standing: "Needs support",
      },
      {
        studentId: "stu-omar",
        progress: 90,
        averageScore: 92,
        lastActive: "Today",
        standing: "Excellent",
      },
    ],
  },
  {
    id: "ds-section-a",
    name: "Section A",
    courseId: "data-structures",
    term: "Spring 2026",
    schedule: "Wed 09:00",
    enrollments: [
      {
        studentId: "stu-meryem",
        progress: 58,
        averageScore: 69,
        lastActive: "Today",
        standing: "On track",
      },
      {
        studentId: "stu-ilyas",
        progress: 36,
        averageScore: 51,
        lastActive: "5 days ago",
        standing: "Needs support",
      },
    ],
  },
];

export const conceptInsights: TeacherConceptInsight[] = [
  {
    concept: "Class vs instance variables",
    course: "Python Foundations",
    struggleRate: 68,
    signal: "Repeated follow-up questions after OOP explanations",
  },
  {
    concept: "Precision vs recall",
    course: "Machine Learning Essentials",
    struggleRate: 57,
    signal: "Quiz answers confuse false positives and false negatives",
  },
  {
    concept: "Breadth-first traversal",
    course: "Data Structures",
    struggleRate: 46,
    signal: "Students ask for visual examples after reading notes",
  },
];

export const commonQuestions: TeacherQuestionInsight[] = [
  {
    question: "When should I use inheritance instead of composition?",
    count: 19,
    course: "Python Foundations",
  },
  {
    question: "Why does accuracy fail on imbalanced datasets?",
    count: 14,
    course: "Machine Learning Essentials",
  },
  {
    question: "How do I choose between BFS and DFS?",
    count: 11,
    course: "Data Structures",
  },
];

export const contentSuggestions: TeacherSuggestion[] = [
  {
    title: "Add a comparison table to the OOP module",
    detail: "Students repeatedly ask how classes, objects, and instances differ.",
    impact: "High",
  },
  {
    title: "Publish the regression slide deck",
    detail: "The latest lecture is drafted but not visible to students yet.",
    impact: "Medium",
  },
  {
    title: "Add one graph traversal animation",
    detail: "Questions spike after the static graph examples in chapter 3.",
    impact: "Medium",
  },
];

export function getCourse(courseId: string): TeacherCourse | undefined {
  return courses.find((course) => course.id === courseId);
}

export function getClass(classId: string): TeacherClass | undefined {
  return classes.find((cls) => cls.id === classId);
}

export function getStudent(studentId: string): TeacherStudent | undefined {
  return students.find((student) => student.id === studentId);
}

export function classesForCourse(courseId: string): TeacherClass[] {
  return classes.filter((cls) => cls.courseId === courseId);
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
  for (const cls of classes) {
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
  for (const course of courses) {
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

export const teacherStats = {
  courses: courses.length,
  classes: classes.length,
  students: students.length,
  needsSupport: studentsNeedingSupport().length,
  drafts: draftMaterials().length,
};
