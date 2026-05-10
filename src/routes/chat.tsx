import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/route-guards";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [{ title: "Discussion — Incub'Youth" }],
  }),
  component: () => (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  ),
});