import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/teacher/classes")({
  component: ClassesLayout,
});

function ClassesLayout() {
  return <Outlet />;
}
