import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/route-guards";
import { ChatView } from "@/components/chat/chat-view";

export const Route = createFileRoute("/chat/$conversationId")({
  head: () => ({ meta: [{ title: "Discussion — Incub'Youth" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { conversationId } = Route.useParams();
  return (
    <ProtectedRoute>
      <ChatView conversationId={conversationId} />
    </ProtectedRoute>
  );
}
