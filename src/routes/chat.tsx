import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/route-guards";
import { ChatView } from "@/components/chat/chat-view";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [{ title: "Discussion — Incub'Youth" }],
  }),
  component: () => (
    <ProtectedRoute>
      <ChatView />
    </ProtectedRoute>
  ),
});