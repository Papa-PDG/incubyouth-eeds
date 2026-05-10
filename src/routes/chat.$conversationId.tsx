import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/chat/chat-view";

export const Route = createFileRoute("/chat/$conversationId")({
  head: () => ({ meta: [{ title: "Discussion — Incub'Youth" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { conversationId } = Route.useParams();
  return <ChatView conversationId={conversationId} />;
}
