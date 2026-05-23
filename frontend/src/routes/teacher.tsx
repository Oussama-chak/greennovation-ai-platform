import { Outlet, createFileRoute } from "@tanstack/react-router";
import { TeacherProjectsProvider } from "@/context/TeacherProjectsContext";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Office - EcoLearn AI" },
      {
        name: "description",
        content:
          "Back-office for educators: manage classes, courses, chapters, materials, and student progress.",
      },
    ],
  }),
  component: TeacherLayout,
});

function TeacherLayout() {
  return (
    <TeacherProjectsProvider>
      <Outlet />
    </TeacherProjectsProvider>
  );
}
