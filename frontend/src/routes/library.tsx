import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Alias — Knowledge Library (Wall of Stories) lives at /forest */
export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [{ title: "Knowledge Library — Routiny" }],
  }),
  component: () => <Navigate to="/forest" search={{ reward: undefined }} replace />,
});

