import { createFileRoute, redirect } from "@tanstack/react-router";
import { continueStudyTarget } from "@/data/studentLearning";

export const Route = createFileRoute("/workspace")({
  beforeLoad: () => {
    const target = continueStudyTarget();
    if (target) {
      throw redirect({
        to: "/learning/$courseId/study",
        params: { courseId: target.courseId },
        search: { chapter: target.chapterId },
      });
    }
    throw redirect({ to: "/learning" });
  },
});
