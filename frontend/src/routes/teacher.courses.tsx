import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/teacher/courses")({
  component: CoursesLayout,
});

function CoursesLayout() {
  return <Outlet />;
}
