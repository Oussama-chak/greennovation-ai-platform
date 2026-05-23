import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/learning")({
  component: LearningLayout,
});

function LearningLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
